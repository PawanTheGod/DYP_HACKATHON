import Groq from 'groq-sdk';
import { generateSagePrompt } from './sageSystemPrompt';
import type { UserProfile, ScheduleBlock, CompletionLogEntry } from '../types';
import { ENV } from '../config/env';

const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface BehavioralInsights {
  summary: string;
  smartTip: string;
  encouragement: string;
}

/**
 * Generates behavioral insights using Groq based on user activity.
 */
export async function generateAIInsights(
  userProfile: UserProfile,
  scheduleBlocks: ScheduleBlock[],
  completionLog: CompletionLogEntry[]
): Promise<BehavioralInsights> {
  const systemPrompt = generateSagePrompt(userProfile, 'analytics_insights');
  
  // Calculate some basic stats to pass as context
  const totalSessions = scheduleBlocks.filter(b => b.type !== 'break').length;
  const completedSessions = completionLog.length;
  const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
  
  const recentSubjects = completionLog
    .slice(-5)
    .map(entry => {
      const block = scheduleBlocks.find(b => b.id === entry.blockId);
      return block?.subject || 'Unknown';
    });

  const instructionBody = `
Analyze the student's study behavior:
- Name: ${userProfile.name}
- Completion Rate: ${completionRate.toFixed(1)}% (${completedSessions}/${totalSessions} sessions)
- Energy Peak: ${userProfile.energyPeak}
- Recent focus areas: ${recentSubjects.join(', ')}
- Motivation: "${userProfile.motivation}"

Identify patterns (e.g., consistency, subject bias, or energy alignment) and provide Sage's insight.
`;

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: instructionBody }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const rawResponse = response.choices[0]?.message?.content || '{}';
    // Strip markdown if present
    const cleanJson = rawResponse.replace(/^[\s\S]*?(?=\{)/, '').replace(/\}[\s\S]*?$/, '}');
    const parsed = JSON.parse(cleanJson);

    return {
      summary: parsed.summary || 'I am still gathering data on your beautiful study journey.',
      smartTip: parsed.smartTip || 'Keep showing up—consistency is your greatest superpower.',
      encouragement: parsed.encouragement || 'You are doing this for a reason. Keep that motivation close.'
    };
  } catch (error) {
    console.error('Failed to generate AI insights:', error);
    return {
      summary: "I've been watching your progress, but my connection to the cognitive cloud is a bit fuzzy right now.",
      smartTip: "Focus on your hardest subject during your next energy peak.",
      encouragement: "Remember: every minute you spend learning is a minute spent growing."
    };
  }
}
