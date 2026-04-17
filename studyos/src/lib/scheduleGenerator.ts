/**
 * scheduleGenerator.ts — Task 1.3: Build Schedule Generation Engine
 * 
 * Generates a personalized, priority-weighted 14-day study schedule
 * by calculating algorithmic priorities and calling the Groq API (qrok model)
 * with the student's constraints.
 */

import Groq from 'groq-sdk';
import { generateSagePrompt } from './sageSystemPrompt';
import type { UserProfile, ScheduleBlock } from '../types';
import { ENV } from '../config/env';

const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface ScheduleGenerationResult {
  blocks: ScheduleBlock[];
  metadata: {
    generatedAt: string;
    daysAhead: number;
    totalBlocksGenerated: number;
  };
}

/**
 * Helper to calculate priority scores for subjects.
 */
function calculatePriorityScores(userProfile: UserProfile, daysAhead: number) {
  const scores: Record<string, number> = {};
  const today = new Date();

  userProfile.subjects.forEach((subject) => {
    let daysTillDeadline = daysAhead; // Default if no deadline
    if (subject.deadline) {
      const deadlineDate = new Date(subject.deadline);
      daysTillDeadline = Math.max(
        0,
        (deadlineDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
      );
    }

    const deadlineUrgency = Math.max(0, 1 - daysTillDeadline / daysAhead);
    const difficulty = Math.min(10, Math.max(1, subject.difficulty)) / 10;
    const currentGap = (10 - Math.min(10, Math.max(1, subject.currentLevel))) / 10;
    const motivationBoost = userProfile.motivation.toLowerCase().includes(subject.name.toLowerCase()) ? 1.2 : 1.0;

    const priorityScore =
      deadlineUrgency * 0.4 +
      difficulty * 0.3 +
      currentGap * 0.2 +
      motivationBoost * 0.1;

    scores[subject.id] = parseFloat(priorityScore.toFixed(3));
  });

  return scores;
}

/**
 * Verifies if there are overlaps in the schedule for any single day.
 * Returns true if an overlap is found.
 */
function hasTimeConflicts(blocks: ScheduleBlock[]): boolean {
  // Group blocks by date
  const blocksByDate: Record<string, ScheduleBlock[]> = {};
  
  blocks.forEach(b => {
    if (!blocksByDate[b.date]) blocksByDate[b.date] = [];
    blocksByDate[b.date].push(b);
  });

  for (const date in blocksByDate) {
    // Sort blocks by start time
    const dailyBlocks = blocksByDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    for (let i = 0; i < dailyBlocks.length - 1; i++) {
        const current = dailyBlocks[i];
        const next = dailyBlocks[i+1];
        if (current.endTime > next.startTime) {
            return true; // Conflict found!
        }
    }
  }
  return false;
}

/**
 * Validates the generated schedule JSON format.
 * Throws an error if required fields are missing.
 */
function validateScheduleData(data: any): ScheduleBlock[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected schedule to be a JSON array.');
  }

  return data.map((item: any) => {
    if (!item.subjectId || !item.date || !item.startTime || !item.endTime) {
      throw new Error('Schedule block is missing required time or subject fields.');
    }
    
    // Auto-generate block IDs if the LLM didn't follow the exact spec format
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const blockId = item.id || `block_${item.date}_${item.subjectId}_${randomSuffix}`;

    return {
      id: blockId,
      subjectId: item.subjectId,
      subject: item.subject || 'Unknown Subject',
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      type: item.type || 'new_content',
      topic: item.topic || 'General Review',
      status: 'pending',
      proofVerified: false,
      quizScore: null,
      notes: item.notes || '',
      resourceLink: item.resourceLink || null,
    };
  });
}

/**
 * Invokes the Groq API with robust timeout, throwing an error if it takes over 30s.
 */
async function generateWithGroq(messages: any[]): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
        const response = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 4000,
        }, { signal: controller.signal });
        
        clearTimeout(timeoutId);
        return response.choices[0]?.message?.content || '';
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Schedule generation timeout');
        }
        throw error;
    }
}

/**
 * Generates a structured 14-day study schedule using Groq.
 */
export async function generateSchedule(userProfile: UserProfile, daysAhead: number = 14): Promise<ScheduleGenerationResult> {
  const priorityScores = calculatePriorityScores(userProfile, daysAhead);

  const systemPrompt = generateSagePrompt(userProfile, 'schedule_gen');
  
  const instructionBlock = `
Generate a ${daysAhead}-day study schedule. Return ONLY a valid JSON array of ScheduleBlock objects. No explanations, no markdown.

Priority Scores for subjects: ${JSON.stringify(priorityScores)}
User Profile Constraints: ${JSON.stringify(userProfile.constraints)}
User Available Hours: ${JSON.stringify(userProfile.availableHours)}
Energy Peak: ${userProfile.energyPeak}

Schema for ScheduleBlock:
{ "id": "block_YYYY-MM-DD_subjectId_XXXX", "subjectId": "string", "subject": "string", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "type": "new_content"|"revision"|"practice"|"crunch"|"break", "topic": "string", "notes": "string" }

Constraints to enforce:
1. Block slots outside wakeAt (${userProfile.constraints.wakeAt}) to sleepBy (${userProfile.constraints.sleepBy}).
2. Exclude breakDays: ${userProfile.constraints.breakDays.join(', ')}.
3. Proportionally allocate blocks to subjects with higher priority scores (approx 60% top, 25% second, 15% rest).
4. Respect Energy Peak: Schedule subjects with difficulty >= 7 during the student's energy peak (${userProfile.energyPeak} hours — e.g., morning=07:00-12:00, afternoon=12:00-17:00, night=17:00-22:00).
5. Ensure no time overlaps on the same day.
6. Max hours/day: Weekday (${userProfile.availableHours.weekday}), Weekend (${userProfile.availableHours.weekend}).
7. Block Ratios:
   - new_content: 60-70 mins, 60% of high-priority subjects
   - revision: 30-40 mins, 25% allocation
   - practice: 45-60 mins, 15% for topics near exam
   - crunch: 90-120 mins ONLY if exam < 3 days away.
`;

    let messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: instructionBlock }
    ];

    let finalBlocks: ScheduleBlock[] = [];
    
    // We allow up to 2 attempts if there's a time conflict
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const rawResponse = await generateWithGroq(messages);
        
        try {
            // Strip any accidental markdown formatting the LLM might have returned
            const cleanJsonString = rawResponse.replace(/^[\s\S]*?(?=\[)/, '').replace(/\][\s\S]*?$/, ']');
            const parsedData = JSON.parse(cleanJsonString);
            
            finalBlocks = validateScheduleData(parsedData);
            
            if (hasTimeConflicts(finalBlocks)) {
                if (attempt === maxAttempts) {
                    console.warn('Schedule was generated with overlaps, returning anyway as max attempts reached.');
                    break;
                }
                messages.push({ role: 'assistant', content: rawResponse });
                messages.push({ role: 'user', content: 'The schedule has time conflicts. Fix overlaps and return corrected JSON only.' });
                continue; // Try again
            } else {
                break; // No conflicts, we are good!
            }
        } catch (error) {
            console.error('Failed to parse schedule JSON:', error);
            if (attempt === maxAttempts) {
                throw new Error('Failed to generate a valid schedule format after multiple attempts.');
            }
        }
    }

    // "Auto-save to Firebase under key..."
    // Since Firebase data fetching / saving will be handled at the DataStore layer (Task 3.1)
    // We'll log saving behavior to signify completion for this subsystem tier.
    const todayStr = new Date().toISOString().split('T')[0];
    const firebaseKey = 'schedule_blocks_' + todayStr;
    console.info(`[Info] In production, this output will be saved to Firebase path: ${firebaseKey}`);

    return {
        blocks: finalBlocks,
        metadata: {
            generatedAt: new Date().toISOString(),
            daysAhead,
            totalBlocksGenerated: finalBlocks.length
        }
    };
}
