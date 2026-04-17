/**
 * dailyCheckIn.ts — Task 1.6: Daily Check-In Engine
 * 
 * Generates personalized morning check-in messages and dynamically adjusts 
 * today's schedule based on the student's reported energy level and blockers.
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

export interface CheckInLogEntry {
  energyLevel: number;
  blockerMentioned: boolean;
  timestamp: string;
  scheduleModifiedCount: number;
}

export interface CheckInAdjustmentResult {
  sageResponse: string;
  adjustedSchedule: ScheduleBlock[];
  energyLevel: number;
  needsHelpTriggered: boolean;
  logEntry: CheckInLogEntry;
}

function calculateTotalScheduledMinutes(schedule: ScheduleBlock[]): number {
  return schedule.reduce((total, block) => {
    const [h1, m1] = block.startTime.split(':').map(Number);
    const [h2, m2] = block.endTime.split(':').map(Number);
    return total + ((h2 * 60 + m2) - (h1 * 60 + m1));
  }, 0);
}

function getNextExamDays(userProfile: UserProfile): number | null {
  if (!userProfile.subjects || userProfile.subjects.length === 0) return null;
  
  const today = new Date();
  let minDays = Infinity;

  userProfile.subjects.forEach(sub => {
    if (sub.deadline) {
      const dDate = new Date(sub.deadline);
      const diff = Math.floor((dDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (diff >= 0 && diff < minDays) minDays = diff;
    }
  });

  return minDays === Infinity ? null : minDays;
}

/**
 * PART 1: Generate Check-In Opening Message
 * Called when the student first opens the app for the day.
 */
export async function generateMorningGreeting(
  userProfile: UserProfile, 
  todaySchedule: ScheduleBlock[]
): Promise<string> {
  const systemPrompt = generateSagePrompt(userProfile, 'check_in');
  
  const totalMins = calculateTotalScheduledMinutes(todaySchedule);
  const hours = (totalMins / 60).toFixed(1);
  const examDays = getNextExamDays(userProfile);
  const examText = examDays !== null ? `Their next exam is ${examDays} days away.` : 'They have no immediate exams.';
  
  const userInstruction = `Generate a warm, natural morning greeting for ${userProfile.name}. Today they have ${hours} hours of study scheduled. ${examText} Motivation: "${userProfile.motivation}". Ask them two things: 1) Rate your energy 1-5. 2) Any blockers or things on your mind? Keep it to 3 sentences max.`;

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInstruction }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });
    return response.choices[0]?.message?.content || "Good morning! How's your energy today (1-5)?";
  } catch (error) {
    console.error('Failed to fetch morning greeting:', error);
    return "Good morning! Rate your energy today from 1 to 5, and let me know if anything is blocking you.";
  }
}

/**
 * PART 2 & 3: Listen for Energy Response and Return Adjusted Schedule
 * Called after the student replies to the morning greeting.
 */
export async function processEnergyAndAdjustSchedule(
  userProfile: UserProfile,
  todaySchedule: ScheduleBlock[],
  energyLevel: 1 | 2 | 3 | 4 | 5,
  blockersText: string | null
): Promise<CheckInAdjustmentResult> {
  
  let adjustmentInstruction = '';
  const needsHelpTriggered = energyLevel <= 2;

  // Energy scoring limits
  let targetMaxHours = 0;
  let isWeekend = [0, 6].includes(new Date().getDay());
  let baseHours = isWeekend ? userProfile.availableHours.weekend : userProfile.availableHours.weekday;

  if (energyLevel === 1) targetMaxHours = 1;
  else if (energyLevel === 2) targetMaxHours = 2;
  else if (energyLevel === 3) targetMaxHours = baseHours;
  else if (energyLevel === 4) targetMaxHours = baseHours + 1;
  else if (energyLevel === 5) targetMaxHours = baseHours + 2;

  if (energyLevel <= 2) {
    adjustmentInstruction = `Reduce today's schedule by 50% or down to max ${targetMaxHours} hours. Replace with light revision and breaks. Keep only the most urgent topic.`;
  } else if (energyLevel >= 4) {
    adjustmentInstruction = `Today is a high-energy day. Add one extra session (max ${targetMaxHours} hours total) for the hardest subject. Optimize for depth, not just coverage.`;
  } else {
    adjustmentInstruction = `Energy is normal. Ensure schedule fits within ${targetMaxHours} hours. Make minor tweaks if necessary.`;
  }

  if (blockersText && blockersText.trim() !== '') {
    adjustmentInstruction += `\n\nThe student mentioned: "${blockersText}". Adjust today's schedule to accommodate this.`;
  }

  const systemPrompt = generateSagePrompt(userProfile, 'schedule_gen');
  
  const instruction = `
You are adjusting TODAY's schedule based on the morning check-in.
Original today schedule: ${JSON.stringify(todaySchedule)}

ADJUSTMENT RULES:
1. ${adjustmentInstruction}
2. Ensure no time overlaps.
3. Keep the JSON schema strictly as ScheduleBlock[].
4. Return ONLY a valid JSON array.

Simultaneously, provide a supportive message acknowledging their energy and blockers (if any).
IMPORTANT CRITICAL INSTRUCTION: Since you must return ONLY JSON, include the supportive message inside a special wrapper object:
{
  "sageResponse": "Your supportive message here...",
  "blocks": [ { schedule blocks... } ]
}
`;

  let adjustedBlocks = todaySchedule;
  let sageResponse = `I've noted your energy is at a ${energyLevel}. Let's get to work!`;

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: instruction }
      ],
      temperature: 0.4,
      max_tokens: 3000,
    });
    
    const rawResult = response.choices[0]?.message?.content || '{}';
    const cleanJsonString = rawResult.replace(/^[\s\S]*?(?=\{)/, '').replace(/\}[\s\S]*?$/, '}');
    const parsed = JSON.parse(cleanJsonString);

    if (parsed.blocks && Array.isArray(parsed.blocks)) {
      adjustedBlocks = parsed.blocks;
      sageResponse = parsed.sageResponse || sageResponse;
    } else if (Array.isArray(parsed)) {
      // Fallback if LLM just returned the array natively
      adjustedBlocks = parsed;
    }

    // Auto-fix IDs and types
    adjustedBlocks = adjustedBlocks.map(b => ({
      ...b,
      id: b.id || `adj_${Math.random().toString(36).substr(2, 6)}`,
      status: b.status || 'pending',
      proofVerified: b.proofVerified || false
    }));

  } catch (error) {
    console.error("Failed to parse adjusted schedule via Groq. Returning original.", error);
    sageResponse = "I got your check-in, but I'm having trouble adjusting the schedule right now. Let's try to stick to the original plan as much as possible!";
  }

  // Calculate modifications (rough metric based on block quantity changes)
  const scheduleModifiedCount = Math.abs(adjustedBlocks.length - todaySchedule.length);

  // Side Effect Tracking
  const todayStr = new Date().toISOString().split('T')[0];
  console.info(`[Info] In production, save updated ${todayStr} schedule blocks back to Firebase relative to this tier.`);

  return {
    sageResponse,
    adjustedSchedule: adjustedBlocks,
    energyLevel,
    needsHelpTriggered,
    logEntry: {
      energyLevel,
      blockerMentioned: !!(blockersText && blockersText.trim() !== ''),
      timestamp: new Date().toISOString(),
      scheduleModifiedCount
    }
  };
}
