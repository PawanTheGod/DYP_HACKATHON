/**
 * cascadeRescheduler.ts — Task 1.4: Cascade Rescheduler (Missed Session Handler)
 * 
 * Detects missed/skipped sessions and dynamically calls Groq (qrok model)
 * to redistribute the missed structural content across the remaining available slots,
 * while watching for burnout symptoms.
 */

import Groq from 'groq-sdk';
import { generateSagePrompt } from './sageSystemPrompt';
import type { UserProfile, ScheduleBlock } from '../types';
import { ENV } from '../config/env';

const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const GROQ_MODEL = 'llama3-70b-8192';

export interface RescheduleResult {
  updatedSchedule: ScheduleBlock[];
  burnoutMessage: string | null;
  logEntry: {
    blockId: string;
    action: string;
    timestamp: string;
    newBlocksCount: number;
  };
}

/**
 * Calculates duration in minutes securely between HH:MM strings.
 */
function getDurationMinutes(start: string, end: string): number {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
}

/**
 * Validates array of blocks from Groq and repairs potential formatting issues.
 */
function validateAndMergeBlocks(
  originalSchedule: ScheduleBlock[], 
  newGroqBlocks: any[],
  dateThreshold: Date
): ScheduleBlock[] {
  if (!Array.isArray(newGroqBlocks)) {
    throw new Error('Groq did not return a valid schedule array.');
  }

  const validNewBlocks: ScheduleBlock[] = newGroqBlocks.map(item => {
    if (!item.subjectId || !item.date || !item.startTime || !item.endTime) {
      throw new Error('Schedule block is missing required time or subject fields.');
    }
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return {
      id: item.id || `block_${item.date}_${item.subjectId}_${randomSuffix}`,
      subjectId: item.subjectId,
      subject: item.subject || 'Unknown Subject',
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      type: item.type || 'revision',
      topic: item.topic || 'Review',
      status: 'pending',
      proofVerified: false,
      quizScore: null,
      notes: item.notes || '',
      resourceLink: item.resourceLink || null,
    };
  });

  // Keep all original blocks that were not touched (e.g. past blocks, completed blocks)
  // Replaced future blocks by the new updated ones returned by Groq.
  
  // To keep it simple per requirements:
  // Step 5: Merge Results... "Remove the missed block... add all new blocks... sort by date"
  // If Groq ONLY returned the redistributed blocks, we merge them with future blocks.
  // Actually, the prompt says "Return ONLY corrected ScheduleBlock[] JSON" representing the full remaining future schedule.
  
  // Filter out any blocks before today, as we don't rewrite the past
  const pastBlocks = originalSchedule.filter(b => new Date(b.date) < dateThreshold || b.status === 'completed');

  const merged = [...pastBlocks, ...validNewBlocks].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  return merged;
}

/**
 * Core function to resolve a missed session and rebuild the schedule.
 */
export async function rescheduleAfterMiss(
  blockId: string,
  currentScheduleBlocks: ScheduleBlock[],
  userProfile: UserProfile
): Promise<RescheduleResult> {
  const today = new Date();
  
  // 1. Detect the Missed Block
  const missedBlock = currentScheduleBlocks.find(b => b.id === blockId);
  if (!missedBlock) {
    throw new Error('Block ID not found in current schedule.');
  }
  if (missedBlock.status !== 'missed') {
    throw new Error('Block not marked as missed. Cannot cascade reschedule.');
  }

  const durationMin = getDurationMinutes(missedBlock.startTime, missedBlock.endTime);
  const subjectObj = userProfile.subjects.find(s => s.id === missedBlock.subjectId);
  
  // 2. Analyze Impact
  // Count total missed blocks in last 3 days
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);

  const recentlyMissedCount = currentScheduleBlocks.filter(b => 
    b.status === 'missed' && 
    new Date(b.date) >= threeDaysAgo
  ).length;

  const recoveryMode = recentlyMissedCount >= 3;
  let burnoutMessage: string | null = null;
  if (recoveryMode) {
    burnoutMessage = "Burnout detected. Reducing load for 2 days. You're still on track. Rest up.";
  }

  // Calculate exam distance
  let daysTillExam = 14; 
  if (subjectObj && subjectObj.deadline) {
    const deadlineDate = new Date(subjectObj.deadline);
    daysTillExam = Math.max(1, Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 3600 * 24)));
  }

  // Extract only future pending blocks for context context (so LLM doesn't waste tokens processing the past)
  // Also remove the missed block from the list of things it needs to work around
  const futureSchedule = currentScheduleBlocks.filter(b => 
    b.status === 'pending' && 
    b.id !== missedBlock.id &&
    new Date(b.date) >= today
  );

  // 3. Build Redistribution Prompt
  const systemPrompt = generateSagePrompt(userProfile, 'cascade_reschedule');
  const userMessage = `
The student missed a [${missedBlock.topic}] session on [${missedBlock.date}] for [${missedBlock.subject}]. 
This topic needs [${durationMin}] minutes of study.
Their exam is [${daysTillExam}] days away.
Current remaining schedule: ${JSON.stringify(futureSchedule)}

Redistribute the missed [${missedBlock.topic}] across the next [${daysTillExam}] days without exceeding ${userProfile.availableHours.weekday} weekday hours or ${userProfile.availableHours.weekend} weekend hours.
If recoveryMode=true, reduce the next 2 days' total hours by 40% and switch blocks to 'revision' or 'break'.
Recovery Mode is currently: ${recoveryMode.toString().toUpperCase()}

Return ONLY the corrected and complete future ScheduleBlock[] JSON array. No explanations. Ensure all time constraints are respected and nothing overlaps.
`;

  // 4. API Call
  let rawResponse = '';
  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.5, // Deterministic to follow strict time constraints
      max_tokens: 3000,
    });
    rawResponse = response.choices[0]?.message?.content || '[]';
  } catch (error) {
    console.error('Groq rescheduling failed:', error);
    throw new Error('Failed to reach Groq for rescheduling.');
  }

  // Strip markdown formatting if any
  const cleanJsonString = rawResponse.replace(/^[\s\S]*?(?=\[)/, '').replace(/\][\s\S]*?$/, ']');
  let parsedNewBlocks: any[] = [];
  try {
    parsedNewBlocks = JSON.parse(cleanJsonString);
  } catch (err) {
    throw new Error('Groq returned malformed JSON during reschedule step.');
  }

  // 5. Merge Results
  // The LLM is returning the rewritten future schedule. We merge it with the past.
  const todayStart = new Date(today.setHours(0,0,0,0));
  const updatedSchedule = validateAndMergeBlocks(currentScheduleBlocks, parsedNewBlocks, todayStart);

  // 6. Side Effects
  // "Update Firebase: 'schedule_blocks_' + today" - handled downstream.
  
  return {
    updatedSchedule,
    burnoutMessage,
    logEntry: {
      blockId: missedBlock.id,
      action: 'missed_redistributed',
      timestamp: new Date().toISOString(),
      newBlocksCount: parsedNewBlocks.length
    }
  };
}
