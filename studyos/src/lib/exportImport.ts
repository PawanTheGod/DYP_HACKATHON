/**
 * exportImport.ts — StudyOS Data Portability Utilities (Person 3 / Task 3.3)
 *
 * Functions:
 *  - exportScheduleAsPDF()    — Schedule as PDF via jsPDF + html2canvas
 *  - exportScheduleAsiCal()   — Schedule as .ics for Google/Apple/Outlook Calendar
 *  - exportDataAsJSONFile()   — Triggers JSON file download of full backup
 *  - importDataFromJSON()     — Reads a File object and imports data to localStorage
 *  - exportWeeklyReportAsText() — Formats a markdown weekly summary string
 *  - copyToClipboard()        — Copies text to clipboard with fallback
 *
 * NOTE: jsPDF and html2canvas must be installed:
 *   npm install jspdf html2canvas
 * ical-generator is a Node-only library; we generate the RFC 5545 .ics format
 * manually here for browser compatibility.
 */

import { AppDataStore, MetricsData, ScheduleBlock, UserProfile } from '@/types';
import { exportDataAsJSON, importDataFromJSON as importFromStore, validateDataIntegrity, SCHEMA_VERSION } from './dataStore';
import { formatDateShort, toDateString } from './timeUtils';

const MAX_IMPORT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Backs up current data to a timestamped localStorage key before an overwrite. */
async function backupCurrentData(): Promise<void> {
  try {
    const json = await exportDataAsJSON();
    const key = `studyos_backup_${Date.now()}`;
    localStorage.setItem(key, json);
    console.log(`[exportImport] Auto-backup saved to key: ${key}`);
  } catch {
    // Non-fatal — backup is best-effort
    console.warn('[exportImport] Auto-backup failed (non-fatal).');
  }
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

/**
 * Generates a formatted PDF of the schedule and triggers a browser download.
 * Uses jsPDF + html2canvas.
 * Falls back gracefully with a warning if the libs aren't installed.
 */
export async function exportScheduleAsPDF(
  scheduleBlocks: ScheduleBlock[],
  userProfile: UserProfile,
  fileName?: string
): Promise<void> {
  // Dynamically import so the app loads even if jspdf/html2canvas are absent
  let jsPDF: typeof import('jspdf')['jsPDF'];
  let html2canvas: typeof import('html2canvas')['default'];
  try {
    const jsPDFMod = await import('jspdf');
    const h2cMod = await import('html2canvas');
    jsPDF = jsPDFMod.jsPDF;
    html2canvas = h2cMod.default;
  } catch {
    console.error('[exportImport] jspdf or html2canvas not installed. Run: npm install jspdf html2canvas');
    throw new Error('PDF export requires jspdf and html2canvas. Run: npm install jspdf html2canvas');
  }

  // Build an off-screen HTML element representing the schedule
  const container = document.createElement('div');
  container.style.cssText = `
    width: 900px;
    background: #ffffff;
    font-family: Arial, sans-serif;
    padding: 32px;
    color: #1a1a2e;
    position: fixed;
    left: -9999px;
    top: 0;
  `;

  // Header
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #6366f1;padding-bottom:16px;margin-bottom:24px;">
      <div>
        <h1 style="margin:0;font-size:24px;color:#6366f1;">StudyOS</h1>
        <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Schedule for ${userProfile.name}</p>
      </div>
      <div style="text-align:right;font-size:13px;color:#64748b;">
        <div>Generated: ${new Date().toLocaleDateString()}</div>
        <div>Total blocks: ${scheduleBlocks.length}</div>
      </div>
    </div>
  `;

  // Group blocks by week
  const byDate: Record<string, ScheduleBlock[]> = {};
  for (const block of scheduleBlocks) {
    if (!byDate[block.date]) byDate[block.date] = [];
    byDate[block.date].push(block);
  }

  const dates = Object.keys(byDate).sort();

  // Subject colour legend
  const subjectColors: Record<string, string> = {};
  for (const s of userProfile.subjects) {
    subjectColors[s.id] = s.color;
  }

  // Day sections
  let dayHTML = '';
  for (const date of dates) {
    const dayBlocks = byDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const dayLabel = new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    dayHTML += `<div style="margin-bottom:20px;">
      <h3 style="margin:0 0 8px;font-size:14px;color:#334155;border-left:4px solid #6366f1;padding-left:8px;">${dayLabel}</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
    `;
    for (const block of dayBlocks) {
      const color = subjectColors[block.subjectId] || '#6366f1';
      dayHTML += `
        <div style="background:${color}20;border-left:4px solid ${color};padding:8px 12px;border-radius:6px;min-width:160px;max-width:200px;">
          <div style="font-size:13px;font-weight:600;color:${color};">${block.subject}</div>
          <div style="font-size:11px;color:#475569;margin-top:2px;">${block.startTime}–${block.endTime}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${block.topic}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:4px;text-transform:uppercase;">${block.type.replace('_', ' ')}</div>
        </div>
      `;
    }
    dayHTML += '</div></div>';
  }
  container.innerHTML += dayHTML;

  // Legend
  let legend = '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;"><b style="font-size:13px;">Subjects:</b> ';
  for (const s of userProfile.subjects) {
    legend += `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;font-size:12px;">
      <span style="width:12px;height:12px;border-radius:3px;background:${s.color};display:inline-block;"></span>${s.name}
    </span>`;
  }
  legend += '</div>';
  container.innerHTML += legend;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    let posY = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();
    while (posY < pdfHeight) {
      if (posY > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -posY, pdfWidth, pdfHeight);
      posY += pageHeight;
    }

    const date = toDateString(new Date());
    pdf.save(fileName ?? `StudyOS_Schedule_${date}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

// ─── iCal Export ─────────────────────────────────────────────────────────────

/**
 * Generates an RFC 5545 .ics file from schedule blocks and triggers a download.
 * Browser-compatible — no Node dependencies.
 */
export async function exportScheduleAsiCal(
  scheduleBlocks: ScheduleBlock[],
  userProfile: UserProfile
): Promise<void> {
  const now = icsTimestamp(new Date());

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudyOS//StudyOS Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:StudyOS - ${userProfile.name}`,
    'X-WR-TIMEZONE:' + Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('\r\n');

  for (const block of scheduleBlocks) {
    const dtStart = icsDateTimeLocal(block.date, block.startTime);
    const dtEnd = icsDateTimeLocal(block.date, block.endTime);
    const uid = `${block.id}@studyos`;
    const summary = icsEscape(`${block.subject} — ${block.topic}`);
    const description = icsEscape(
      `Type: ${block.type.replace('_', ' ')} | Status: ${block.status}${block.notes ? ' | Notes: ' + block.notes : ''}`
    );

    icsContent += '\r\nBEGIN:VEVENT';
    icsContent += `\r\nUID:${uid}`;
    icsContent += `\r\nDTSTAMP:${now}`;
    icsContent += `\r\nDTSTART:${dtStart}`;
    icsContent += `\r\nDTEND:${dtEnd}`;
    icsContent += `\r\nSUMMARY:${summary}`;
    icsContent += `\r\nDESCRIPTION:${description}`;
    icsContent += '\r\nEND:VEVENT';
  }

  icsContent += '\r\nEND:VCALENDAR';

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const date = toDateString(new Date());
  triggerDownload(blob, `StudyOS_${userProfile.name}_${date}.ics`);
}

// ─── JSON Backup Export ───────────────────────────────────────────────────────

/**
 * Exports the full data store as a JSON file and triggers a browser download.
 * Wraps the async `exportDataAsJSON()` from dataStore.ts.
 */
export async function exportDataAsJSONFile(
  _allData?: AppDataStore, // kept for API compatibility; data is always read from storage
  fileName?: string
): Promise<void> {
  const jsonString = await exportDataAsJSON();
  const blob = new Blob([jsonString], { type: 'application/json' });
  const date = toDateString(new Date());
  triggerDownload(blob, fileName ?? `StudyOS_Backup_${date}.json`);
}

// ─── JSON Import ──────────────────────────────────────────────────────────────

/**
 * Accepts a File from <input type="file" accept=".json">, validates it,
 * creates an auto-backup, then imports the data (full overwrite for MVP).
 *
 * Returns { success, message, entriesImported }.
 * Never throws — returns { success: false } on error.
 */
export async function importDataFromJSON(
  file: File
): Promise<{ success: boolean; message: string; entriesImported: number }> {
  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    return {
      success: false,
      message: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed is 10 MB.`,
      entriesImported: 0,
    };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return {
      success: false,
      message: 'Could not read the file. Ensure it is UTF-8 encoded.',
      entriesImported: 0,
    };
  }

  // Validate JSON parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { success: false, message: 'Invalid JSON file — could not be parsed.', entriesImported: 0 };
  }

  // Structural check
  const data = parsed as Partial<AppDataStore>;
  if (!data || typeof data !== 'object') {
    return { success: false, message: 'Import failed: file root must be a JSON object.', entriesImported: 0 };
  }
  if (!data.scheduleBlocks) {
    return { success: false, message: 'Import failed: missing "scheduleBlocks" in file.', entriesImported: 0 };
  }

  // Schema version guard
  if (typeof data.version === 'number' && data.version > SCHEMA_VERSION) {
    return {
      success: false,
      message: `Import failed: file uses schema v${data.version} but app supports up to v${SCHEMA_VERSION}. Please update the app.`,
      entriesImported: 0,
    };
  }

  // Auto-backup existing data before overwriting
  await backupCurrentData();

  try {
    await importFromStore(text);
  } catch (err) {
    return {
      success: false,
      message: `Import failed during write: ${(err as Error).message}`,
      entriesImported: 0,
    };
  }

  // Post-import integrity check
  const { valid, errors } = await validateDataIntegrity();
  if (!valid) {
    console.warn('[exportImport] Post-import integrity warnings:', errors);
  }

  const entriesImported =
    (data.scheduleBlocks?.length ?? 0) +
    (data.completionLog?.length ?? 0) +
    (data.chatHistory?.length ?? 0);

  return {
    success: true,
    message: `Import successful. ${entriesImported} entries loaded.${!valid ? ' Some fields had warnings — check console.' : ''}`,
    entriesImported,
  };
}

// ─── Weekly Report Text ───────────────────────────────────────────────────────

/**
 * Formats a markdown-formatted weekly summary string from pre-calculated metrics.
 * The actual data is generated by Person 1's Sage/Claude functions;
 * this function is purely a formatting utility.
 */
export function exportWeeklyReportAsText(
  metrics: MetricsData,
  userProfile: UserProfile
): string {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const lines: string[] = [
    `# 📚 StudyOS Weekly Report — ${userProfile.name}`,
    `**${formatDateShort(weekStart)} – ${formatDateShort(today)}**`,
    '',
    '---',
    '',
    '## 📊 This Week at a Glance',
    '',
    `| Metric | Value |`,
    `|---|---|`,
    `| Total Hours Studied | ${metrics.totalHours} h |`,
    `| Sessions Completed | ${metrics.sessionsCompleted} |`,
    `| Current Streak | ${metrics.currentStreak} days 🔥 |`,
    `| Longest Streak | ${metrics.longestStreak} days |`,
    `| Consistency | ${metrics.consistencyScore}% |`,
    '',
    '---',
    '',
    '## 🎯 Subject Mastery',
    '',
  ];

  for (const subject of userProfile.subjects) {
    const mastery = metrics.masteryBySubject[subject.id] ?? 0;
    const readiness = metrics.readinessBySubject[subject.id] ?? 0;
    const bar = buildProgressBar(mastery);
    lines.push(`### ${subject.name}`);
    lines.push(`- Mastery: ${bar} **${mastery}%**`);
    lines.push(`- Exam Readiness: **${readiness}%**`);
    lines.push('');
  }

  lines.push('---', '', '## 💡 Recommendation', '');
  lines.push('> Keep your momentum going. Focus on revision for subjects closest to their exam dates.');
  lines.push('');
  lines.push('---');
  lines.push(`*Generated by StudyOS on ${today.toLocaleString()}*`);

  return lines.join('\n');
}

// ─── Clipboard ────────────────────────────────────────────────────────────────

/**
 * Copies text to clipboard. Falls back to execCommand for older browsers.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.focus();
  el.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(el);
  }
}

// ─── Private Utilities ────────────────────────────────────────────────────────

/** Triggers a browser file download for a Blob. */
function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Formats a Date as an iCal DTSTAMP (UTC): 20260417T093000Z */
function icsTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/**
 * Formats date + HH:MM as a local iCal datetime: 20260417T093000
 * (Floating time — not UTC — so calendar apps use device timezone)
 */
function icsDateTimeLocal(date: string, time: string): string {
  const [y, m, d] = date.split('-');
  const [h, mi] = time.split(':');
  return `${y}${m}${d}T${h}${mi}00`;
}

/** Escapes special characters for iCal text fields. */
function icsEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

/** Builds a simple ASCII progress bar (10 chars wide). */
function buildProgressBar(value: number): string {
  const filled = Math.round(value / 10);
  return `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}]`;
}
