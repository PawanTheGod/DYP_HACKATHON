/**
 * onboardingPipeline.ts — Task 1.2: Onboarding Chat & Data Extraction
 *
 * Implements the AI-driven onboarding module for StudyOS.
 * - Extracts topics, constraints, dates, and motivation conversationally
 * - Parses the unstructured chat into a structured UserProfile JSON
 */

import Groq from 'groq-sdk';
import { generateSagePrompt } from './sageSystemPrompt';
import type { ChatMessage, UserProfile } from '../types';
import { ENV } from '../config/env';

// Initialize Groq SDK
// Note: dangerouslyAllowBrowser is required when running directly in a React/Vite web or Expo app
const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

/**
 * We use Mixtral or Llama-3 depending on what qrok has available, 
 * but standard qrok models are available via 'llama3-70b-8192' typically.
 */
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Standard utility to run Groq API requests with robust retry logic.
 */
async function callGroqWithRetry(messages: any[], maxRetries = 3): Promise<string> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      attempt++;
      console.warn(`Groq API timeout/error (attempt ${attempt}/${maxRetries}):`, error);
      if (attempt >= maxRetries) {
        throw new Error('Groq API failed after multiple retries.');
      }
      // Brief backoff before retry (e.g. 1000ms)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return '';
}

/**
 * Function A: processOnboardingTurn
 * 
 * Adapts the "runOnboardingChat" spec into a stateless React-friendly pipeline function.
 * UI passes the history and the latest user message, and this returns the AI's response.
 * It also checks if the chat has exceeded ~15 turns to gracefully force a summary.
 *
 * @param chatHistory - Current conversation array
 * @param userMessage - Latest string from user (null if initializing chat)
 * @returns Object with the new Sage Message and a flag if we've hit the summary stage.
 */
export async function processOnboardingTurn(
  chatHistory: ChatMessage[],
  userMessage: string | null
): Promise<{ nextMessage: ChatMessage; isSummaryReady: boolean }> {
  // 1. First opening message if history is empty
  if (chatHistory.length === 0 && !userMessage) {
    return {
      nextMessage: {
        id: crypto.randomUUID(),
        role: 'sage',
        content: "Hi! I'm Sage, your study partner. Let me understand your situation so I can build you the perfect schedule. What subjects are you preparing for right now? Be specific — tell me the names and how many you have.",
        timestamp: new Date().toISOString(),
      },
      isSummaryReady: false,
    };
  }

  // 2. Prepare context for Groq
  const systemPrompt = generateSagePrompt(null, 'onboarding');
  
  // Format history for Groq SDK format: { role: 'system'|'user'|'assistant', content: string }
  const groqMessages: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  // Map existing history
  chatHistory.forEach((msg) => {
    groqMessages.push({
      // We map our 'sage' role back to standard 'assistant' role for the API
      role: msg.role === 'sage' ? 'assistant' : 'user',
      content: msg.content,
    });
  });

  // Append new user message (if any)
  if (userMessage) {
    groqMessages.push({ role: 'user', content: userMessage });
  }

  // Check limits. If the user has taken 15 turns without Sage wrapping up, we force a wrap-up prompt injection.
  // 1 turn = user + sage (rough estimate). So 15 turns total implies length around 30.
  if (chatHistory.length >= 28) {
    groqMessages[0].content += '\n\nIMPORTANT: We have hit the conversational limit. Summarize the collected information right now and ask for final confirmation in this exact reply.';
  }

  // 3. Call Groq
  let sageResponseText = await callGroqWithRetry(groqMessages, 3);
  
  // Guard: if the AI accidentally generates a JSON block, strip it out.
  sageResponseText = sageResponseText.replace(/```(?:json)?[\s\S]*?```/gi, '').trim();

  // Determine if Sage has decided we are ready to move on.
  // We infer this if Sage says "confirm", "summary", or if they list things explicitly using bullet points at the end.
  const lowerResp = sageResponseText.toLowerCase();
  const isSummaryReady = 
    lowerResp.includes('let me confirm') || 
    lowerResp.includes('anything i got wrong') ||
    chatHistory.length >= 28;

  return {
    nextMessage: {
      id: crypto.randomUUID(),
      role: 'sage',
      content: sageResponseText,
      timestamp: new Date().toISOString(),
    },
    isSummaryReady,
  };
}

/**
 * Function B: parseOnboardingChat
 * 
 * Takes the completed conversation transcript and instructs Groq to
 * extract all data into the structured UserProfile JSON model.
 *
 * @param chatHistory - The array of ChatMessages representing the full onboarding chat
 * @returns A structured and validated UserProfile object
 */
export async function parseOnboardingChat(
  chatHistory: ChatMessage[]
): Promise<UserProfile> {
  // Construct the transcript string for the LLM Prompt
  const transcript = chatHistory
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');

  const extractionSchemaInstruction = `
You are a JSON extraction bot. Parse the onboarding chat below into the exact JSON structure provided.
Return ONLY valid JSON, no markdown formatting (do not include \`\`\`json blocks).

Expected JSON Structure:
{
  "name": "Student Name (if provided, else 'Student')",
  "motivation": "Exact motivation phrase the user gave",
  "energyPeak": "morning" | "afternoon" | "night",
  "subjects": [
    {
      "id": "uuid string (generate one)",
      "name": "Subject Name",
      "difficulty": 1-10,
      "deadline": "YYYY-MM-DD",
      "currentLevel": 1-10,
      "color": "Generate a unique hex color like #FF5733",
      "masteryScore": 0,
      "priorityScore": 0
    }
  ],
  "constraints": {
    "sleepBy": "HH:MM",
    "wakeAt": "HH:MM",
    "blockedSlots": [],
    "breakDays": []
  },
  "availableHours": { "weekday": 4, "weekend": 7 }
}

If any data is missing or vague, use sensible defaults (e.g. 4 hrs weekday, random colors, etc.).
Ensure exams are proper YYYY-MM-DD dates in the future.
`;

  const messages = [
    { role: 'system', content: extractionSchemaInstruction },
    { role: 'user', content: transcript },
  ];

  try {
    const jsonString = await callGroqWithRetry(messages, 3);
    
    // Safely parse JSON
    let parsed: any;
    try {
      // In case the model returns markdown ticks despite instructions, strip them
      const cleanString = jsonString.replace(/^```json\n?/i, '').replace(/\n?```$/i, '');
      parsed = JSON.parse(cleanString);
    } catch (parseError) {
      console.error('Failed to parse Groq extraction JSON:', jsonString);
      throw new Error('Could not parse the onboarding data. JSON format was invalid.');
    }

    // Validate essential keys
    if (!parsed.subjects || !Array.isArray(parsed.subjects)) {
      throw new Error('Missing subjects array in extracted profile.');
    }

    // Construct final UserProfile structure
    const userProfile: UserProfile = {
      userId: crypto.randomUUID(),
      name: parsed.name || 'Student',
      motivation: parsed.motivation || 'I want to succeed and achieve my goals',
      energyPeak: parsed.energyPeak || 'morning',
      subjects: parsed.subjects.map((sub: any) => ({
        id: sub.id || crypto.randomUUID(),
        name: sub.name || 'Unknown Subject',
        difficulty: Number(sub.difficulty) || 5,
        deadline: sub.deadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        currentLevel: Number(sub.currentLevel) || 1,
        color: sub.color || '#3B82F6',
        masteryScore: 0,
        priorityScore: 0,
        topics: [], // We initialise this empty for now
      })),
      constraints: {
        sleepBy: parsed.constraints?.sleepBy || '23:00',
        wakeAt: parsed.constraints?.wakeAt || '07:00',
        blockedSlots: parsed.constraints?.blockedSlots || [],
        breakDays: parsed.constraints?.breakDays || [],
      },
      availableHours: {
        weekday: Number(parsed.availableHours?.weekday) || 4,
        weekend: Number(parsed.availableHours?.weekend) || 7,
      },
      createdAt: new Date().toISOString(),
    };

    return userProfile;

  } catch (error) {
    console.error('Error during parseOnboardingChat:', error);
    throw error; // Re-throw to be handled by the UI
  }
}
