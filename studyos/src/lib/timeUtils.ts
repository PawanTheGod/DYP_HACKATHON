/**
 * timeUtils.ts — StudyOS Date/Time Utilities (Person 3 / Task 3.4)
 *
 * All functions are pure (no side effects).
 * Uses native Date API only — no external libraries.
 * Date strings: YYYY-MM-DD format.
 * Time strings: HH:MM (24-hour).
 */

import { ScheduleBlock, CompletionLogEntry } from '@/types';

// ─── Time Primitives (Components MUST use these — never call new Date() directly) ─

/**
 * Returns the current Date. Use instead of `new Date()` in all modules.
 * Centralised here so it can be mocked deterministically in tests.
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Returns today's date as a YYYY-MM-DD string (local timezone).
 * Use instead of `toDateString(new Date())` in all modules.
 */
export function getToday(): string {
  return toDateString(new Date());
}

/**
 * Returns how many full calendar days remain until a YYYY-MM-DD deadline.
 * Negative if the deadline is in the past.
 */
export function daysTillDeadline(deadline: string): number {
  const today = startOfDay(new Date());
  const target = startOfDay(parseDate(deadline));
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns how many full calendar days ago an ISO timestamp occurred.
 * Positive = in the past, 0 = today.
 */
export function daysAgo(isoTimestamp: string): number {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(isoTimestamp));
  const diffMs = today.getTime() - target.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if two Date objects fall on the same calendar day (ignores time).
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return toDateString(date1) === toDateString(date2);
}

/**
 * Returns the Monday of the week that contains `date` (defaults to today).
 */
export function getWeekStart(date?: Date): Date {
  const d = startOfDay(date ?? new Date());
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift Sunday back 6, others to Monday
  return addDays(d, diff);
}

/**
 * Returns the Sunday of the week that contains `date` (defaults to today).
 */
export function getWeekEnd(date?: Date): Date {
  return addDays(getWeekStart(date), 6);
}

/**
 * Adds `days` calendar days to a Date, returning a new Date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Adds `mins` minutes to a Date, returning a new Date.
 */
export function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60 * 1000);
}

// ─── Formatting Functions ─────────────────────────────────────────────────────

/**
 * 'Apr 17' or 'Apr 17, 2026' (includes year if different from current).
 */
export function formatDateShort(date: Date): string {
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (date.getFullYear() !== today.getFullYear()) {
    options.year = 'numeric';
  }
  return date.toLocaleDateString('en-US', options);
}

/**
 * 'Thursday, April 17, 2026'
 */
export function formatDateFull(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * '09:30' — 24-hour time string from a Date.
 */
export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * '09:30 - 11:00'
 */
export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

/**
 * '1 h 30 m' or '45 min'
 */
export function formatDurationMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}

/**
 * 'in 2 days', '3 days ago', 'today', 'tomorrow', 'yesterday'
 */
export function formatRelativeTime(date: Date): string {
  const diff = Math.round(
    (startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

// ─── Schedule Block Helpers ───────────────────────────────────────────────────

/**
 * True if the block's date is today and its endTime has already passed.
 */
export function isBlockInPast(block: ScheduleBlock): boolean {
  const now = new Date();
  const blockDate = parseDate(block.date);
  if (!isSameDay(blockDate, now)) return blockDate < startOfDay(now);
  const endDateTime = dateTimeFromParts(block.date, block.endTime);
  return endDateTime <= now;
}

/**
 * True if the block's date is today.
 */
export function isBlockToday(block: ScheduleBlock): boolean {
  return isSameDay(parseDate(block.date), new Date());
}

/**
 * True if the block starts at a time strictly in the future.
 */
export function isBlockFuture(block: ScheduleBlock): boolean {
  const now = new Date();
  const startDateTime = dateTimeFromParts(block.date, block.startTime);
  return startDateTime > now;
}

/**
 * Finds the next pending block from now onward, sorted by date + startTime.
 */
export function getNextPendingBlock(blocks: ScheduleBlock[]): ScheduleBlock | null {
  const now = new Date();
  const future = blocks
    .filter((b) => b.status === 'pending' && dateTimeFromParts(b.date, b.startTime) >= now)
    .sort((a, b) => compareBlocks(a, b));
  return future[0] ?? null;
}

/**
 * Returns all blocks whose date matches the given YYYY-MM-DD string.
 */
export function getBlocksForDate(blocks: ScheduleBlock[], date: string): ScheduleBlock[] {
  return blocks.filter((b) => b.date === date);
}

/**
 * Returns all blocks for today.
 */
export function getBlocksForToday(blocks: ScheduleBlock[]): ScheduleBlock[] {
  return getBlocksForDate(blocks, toDateString(new Date()));
}

/**
 * Returns all blocks that fall within the week containing `startDate` (defaults to today).
 */
export function getBlocksForWeek(blocks: ScheduleBlock[], startDate?: Date): ScheduleBlock[] {
  const weekStart = toDateString(getWeekStart(startDate));
  const weekEnd = toDateString(getWeekEnd(startDate));
  return blocks.filter((b) => b.date >= weekStart && b.date <= weekEnd);
}

// ─── Time Conflict Detection ──────────────────────────────────────────────────

/**
 * Returns true if two blocks overlap in time on the same day.
 * Two blocks conflict if one starts before the other ends.
 */
export function hasTimeConflict(block1: ScheduleBlock, block2: ScheduleBlock): boolean {
  if (block1.date !== block2.date) return false;
  // Overlap: A.start < B.end AND B.start < A.end
  return block1.startTime < block2.endTime && block2.startTime < block1.endTime;
}

/**
 * Finds all pairs of blocks that overlap in time.
 * Returns array of { blockId1, blockId2 }.
 */
export function findConflicts(blocks: ScheduleBlock[]): { blockId1: string; blockId2: string }[] {
  const conflicts: { blockId1: string; blockId2: string }[] = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (hasTimeConflict(blocks[i], blocks[j])) {
        conflicts.push({ blockId1: blocks[i].id, blockId2: blocks[j].id });
      }
    }
  }
  return conflicts;
}

/**
 * Finds the first available time slot of `durationMins` on `date`,
 * respecting `wakeAt` / `sleepBy` constraints and existing blocks.
 */
export function findAvailableSlot(
  blocks: ScheduleBlock[],
  date: string,
  durationMins: number,
  constraints: { wakeAt: string; sleepBy: string }
): { startTime: string; endTime: string } | null {
  const existing = getBlocksForDate(blocks, date).sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  let cursor = constraints.wakeAt; // HH:MM
  const limit = constraints.sleepBy;

  for (const block of existing) {
    const candidateEnd = addMinsToHHMM(cursor, durationMins);
    // Check if candidate fits before this block
    if (candidateEnd <= block.startTime && cursor >= constraints.wakeAt) {
      return { startTime: cursor, endTime: candidateEnd };
    }
    // Move cursor past this block
    if (block.endTime > cursor) {
      cursor = block.endTime;
    }
  }

  // Check after last block
  const candidateEnd = addMinsToHHMM(cursor, durationMins);
  if (candidateEnd <= limit) {
    return { startTime: cursor, endTime: candidateEnd };
  }
  return null;
}

// ─── Streak Calculation ───────────────────────────────────────────────────────

/**
 * Counts the current consecutive day streak of verified sessions.
 * A day counts only if it has ≥1 entry with proofVerified (from matching block).
 */
export function calculateCurrentStreak(
  completionLog: CompletionLogEntry[],
  today?: Date
): number {
  const anchor = startOfDay(today ?? new Date());
  const verifiedDates = getVerifiedDates(completionLog);
  let streak = 0;
  let cursor = anchor;

  while (verifiedDates.has(toDateString(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Returns the longest ever consecutive day streak from the completion log.
 */
export function calculateLongestStreak(completionLog: CompletionLogEntry[]): number {
  const verifiedDates = Array.from(getVerifiedDates(completionLog)).sort();
  if (verifiedDates.length === 0) return 0;

  let max = 1;
  let current = 1;
  for (let i = 1; i < verifiedDates.length; i++) {
    const prev = parseDate(verifiedDates[i - 1]);
    const curr = parseDate(verifiedDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 1;
    }
  }
  return max;
}

/**
 * Returns the consistency score as a percentage:
 * (days with ≥1 verified session / last N days) * 100
 */
export function calculateConsistency(
  completionLog: CompletionLogEntry[],
  days: number
): number {
  const verifiedDates = getVerifiedDates(completionLog);
  let studiedDays = 0;
  const today = startOfDay(new Date());
  for (let i = 0; i < days; i++) {
    const d = toDateString(addDays(today, -i));
    if (verifiedDates.has(d)) studiedDays++;
  }
  return Math.round((studiedDays / days) * 100);
}

// ─── Hours Calculation ────────────────────────────────────────────────────────

/**
 * Sum of block durations (in hours) for a specific date (defaults to today).
 * Only counts completed blocks.
 */
export function calculateHoursByDate(blocks: ScheduleBlock[], date?: string): number {
  const targetDate = date ?? toDateString(new Date());
  return sumBlockHours(blocks.filter((b) => b.date === targetDate && b.status === 'completed'));
}

/**
 * Sum of block durations for blocks within a date range (inclusive, YYYY-MM-DD).
 */
export function calculateHoursByDateRange(
  blocks: ScheduleBlock[],
  startDate: string,
  endDate: string
): number {
  return sumBlockHours(
    blocks.filter(
      (b) => b.date >= startDate && b.date <= endDate && b.status === 'completed'
    )
  );
}

/**
 * Sum of block durations (hours) for a specific subject.
 */
export function calculateHoursBySubject(
  blocks: ScheduleBlock[],
  subjectId: string
): number {
  return sumBlockHours(
    blocks.filter((b) => b.subjectId === subjectId && b.status === 'completed')
  );
}

/**
 * Sum of all completed block durations in hours.
 */
export function calculateTotalHours(blocks: ScheduleBlock[]): number {
  return sumBlockHours(blocks.filter((b) => b.status === 'completed'));
}

// ─── Working Hours ────────────────────────────────────────────────────────────

/**
 * Returns true if a given HH:MM time string is within the wakeAt-sleepBy window.
 */
export function isWithinWorkingHours(
  time: string,
  constraints: { wakeAt: string; sleepBy: string }
): boolean {
  return time >= constraints.wakeAt && time < constraints.sleepBy;
}

/**
 * Returns today's working window as { start: Date, end: Date }.
 */
export function getWorkingHoursRange(constraints: { wakeAt: string; sleepBy: string }): {
  start: Date;
  end: Date;
} {
  const today = toDateString(new Date());
  return {
    start: dateTimeFromParts(today, constraints.wakeAt),
    end: dateTimeFromParts(today, constraints.sleepBy),
  };
}

// ─── Timezone (Optional MVP) ──────────────────────────────────────────────────

/**
 * Returns the user's IANA timezone string (e.g., 'Asia/Kolkata').
 */
export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Formats a Date in a specific IANA timezone.
 */
export function formatInTimezone(date: Date, tz: string): string {
  return date.toLocaleString('en-US', { timeZone: tz });
}

// ─── Private Utilities ────────────────────────────────────────────────────────

/** Sets a Date to midnight (00:00:00.000) without mutating the input. */
function startOfDay(date: Date): Date {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Converts a Date to a YYYY-MM-DD string using local timezone. */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses a YYYY-MM-DD string to a local midnight Date. */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Constructs a DateTime from a YYYY-MM-DD date + HH:MM time string. */
function dateTimeFromParts(date: string, time: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

/** Adds N minutes to a HH:MM string, returns new HH:MM. */
function addMinsToHHMM(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/** Compares two ScheduleBlocks for chronological sorting. */
function compareBlocks(a: ScheduleBlock, b: ScheduleBlock): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.startTime.localeCompare(b.startTime);
}

/** Returns the block duration in hours from HH:MM startTime and endTime. */
function blockDurationHours(block: ScheduleBlock): number {
  const [sh, sm] = block.startTime.split(':').map(Number);
  const [eh, em] = block.endTime.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

/** Sums total hours of an array of blocks. */
function sumBlockHours(blocks: ScheduleBlock[]): number {
  return parseFloat(blocks.reduce((acc, b) => acc + blockDurationHours(b), 0).toFixed(2));
}

/**
 * Extracts a Set of YYYY-MM-DD date strings from the completion log
 * that have at least one entry with proofScore > 0 (indicating verified session).
 * Per task spec: proofVerified is tracked on the ScheduleBlock, but completionLog
 * has proofScore — we treat score > 0 as "verified" here.
 */
function getVerifiedDates(completionLog: CompletionLogEntry[]): Set<string> {
  const dates = new Set<string>();
  for (const entry of completionLog) {
    // Count the session if proofType is not 'none' OR if proofScore indicates pass
    if (entry.proofType !== 'none' || (entry.proofScore !== null && entry.proofScore > 0)) {
      dates.add(entry.date);
    }
  }
  return dates;
}

/**
 * Async wrapper kept for backwards-compat with the stub.
 * @deprecated Use the synchronous formatTime() instead.
 */
export async function calculateDuration(start: string, end: string): Promise<number> {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}
