/**
 * proofVerifier.ts — Task 1.5: Proof Verification Engine
 * 
 * Defines verification mechanisms to keep students honest about their progress.
 * Uses Google Gemini (gemini-2.5-flash) to evaluate photo proofs,
 * and Groq (qrok) to generate rapid MCQ quizzes and grade those quizzes.
 */

import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateSagePrompt } from './sageSystemPrompt';
import { ENV } from '../config/env';

// --- Initialize Groq for Text Verification (Quizzes) ---
const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// --- Initialize Gemini for Vision Verification (Photos) ---
const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY || '');
const GEMINI_VISION_MODEL = 'gemini-2.5-flash';

export interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswerKey: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  feedback: string;
}

export interface QuizGradeResult {
  score: number;
  feedback: string;
  incorrectExplanations: string[];
}

/**
 * Invokes the Groq API strictly for text requests with timeout.
 */
async function generateTextResp(messages: any[]): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: 0.2, // Low temp for strictly structured quiz results
      max_tokens: 2000,
    }, { signal: controller.signal });
    return response.choices[0]?.message?.content || '';
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Groq verification request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * FUNCTION A: Verify Photo Proof (Using Google Gemini 2.5 Flash)
 * Validates whether an uploaded image contains evidence of studying the provided topic.
 */
export async function verifyPhotoProof(
  imageBase64: string, 
  subject: string, 
  topic: string
): Promise<VerificationResult> {
  
  // Format the image properly for the Gemini Vision APIs
  // Ensure the base64 string doesn't include the data URI prefix if it exists
  let base64Data = imageBase64;
  let mimeType = "image/jpeg"; // default
  
  const matches = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    mimeType = matches[1];
    base64Data = matches[2];
  } else {
    // If it doesn't match the regex, blindly manually strip the prefix if they passed it
    base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
  }

  const promptText = `
System Instruction: You are Sage's visual analyzer.
Analyze this user's study photo. Does this image show evidence of studying ${subject} — specifically ${topic}? 
Look for: textbook visibility, handwritten notes, problem solutions, open laptop screen, relevant materials. 

Return ONLY valid JSON: 
{ 
  "verified": true|false, 
  "confidence": 0-1, 
  "feedback": "brief 1-sentence explanation" 
}
`;

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_VISION_MODEL });
    
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType
      }
    };

    const result = await model.generateContent([promptText, imagePart]);
    const content = result.response.text();
    
    // Strip markdown JSON markers if Gemini included them
    const cleanJsonString = content.replace(/^[\s\S]*?(?=\{)/, '').replace(/\}[\s\S]*?$/, '}');
    const parsed = JSON.parse(cleanJsonString);

    return {
      verified: Boolean(parsed.verified ?? (parsed.confidence >= 0.5)),
      confidence: Number(parsed.confidence || 0.5),
      feedback: parsed.feedback || "Evaluated by Sage.",
    };
  } catch (error) {
    console.warn("Gemini vision verification failed, degrading gracefully", error);
    // Graceful degradation per specs
    return {
      verified: true,
      confidence: 0.5,
      feedback: "Verification auto-passed due to slow connection. Let's assume you did great!",
    };
  }
}

/**
 * FUNCTION B: Generate Quick Quiz (Using Groq text model)
 * Instantly builds a 3-question MCQ based on the topic.
 */
export async function generateQuickQuiz(
  subject: string, 
  topic: string, 
  difficulty: number
): Promise<{ questions: QuizQuestion[] }> {
  const systemPrompt = generateSagePrompt(null, 'verification');
  const userInstruction = `
Generate 3 multiple-choice assessment questions to test understanding of [${topic}] in [${subject}]. 
Difficulty level: ${difficulty}/10. 
Each question format MUST strictly follow: 
{ "question": string, "options": { "A": string, "B": string, "C": string, "D": string }, "correctAnswerKey": "A"|"B"|"C"|"D", "explanation": string }

Return ONLY a JSON array containing these 3 objects. No markdown.
`;

  try {
    const rawResponse = await generateTextResp([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInstruction }
    ]);

    const cleanJsonString = rawResponse.replace(/^[\s\S]*?(?=\[)/, '').replace(/\][\s\S]*?$/, ']');
    const parsed = JSON.parse(cleanJsonString);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Invalid array format returned from Groq quiz generator.");
    }

    return { questions: parsed };
  } catch (error) {
    console.error("Failed to generate quick quiz.", error);
    throw error;
  }
}

/**
 * FUNCTION C: Grade Quiz Answers (Using Groq text model)
 * Passes the quiz mapping back to Groq so it can calculate score and explain any errors.
 */
export async function gradeQuizAnswers(
  subject: string,
  topic: string,
  questions: QuizQuestion[],
  userAnswers: ('A' | 'B' | 'C' | 'D')[]
): Promise<QuizGradeResult> {
  const systemPrompt = generateSagePrompt(null, 'verification');
  
  const userInstruction = `
Grade these quiz answers for ${topic} in ${subject}. 
Questions: ${JSON.stringify(questions)}
Student answers: ${JSON.stringify(userAnswers)}

Return ONLY JSON format:
{ "correctCount": number, "totalCount": number, "score": number, "briefFeedback": string, "incorrectExplanations": string[] }
No markdown.
`;

  try {
    const rawResponse = await generateTextResp([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInstruction }
    ]);

    const cleanJsonString = rawResponse.replace(/^[\s\S]*?(?=\{)/, '').replace(/\}[\s\S]*?$/, '}');
    const parsed = JSON.parse(cleanJsonString);

    const totalCount = questions.length;
    let actualCorrectCount = 0;
    questions.forEach((q, i) => {
      if (q.correctAnswerKey === userAnswers[i]) actualCorrectCount++;
    });
    
    // Favor actual deterministic mathematical checking over the LLM output if they differ dangerously
    const finalScore = Math.round((actualCorrectCount / totalCount) * 100);

    return {
      score: finalScore,
      feedback: parsed.briefFeedback || `You scored ${finalScore}%!`,
      incorrectExplanations: Array.isArray(parsed.incorrectExplanations) ? parsed.incorrectExplanations : []
    };
  } catch (error) {
    console.warn("Failed to reach Groq for grading, falling back to local deterministic grading", error);
    
    let actualCorrectCount = 0;
    const explanations: string[] = [];
    questions.forEach((q, i) => {
      if (q.correctAnswerKey === userAnswers[i]) {
        actualCorrectCount++;
      } else {
        explanations.push(`Question: ${q.question} - The correct answer was ${q.correctAnswerKey}.`);
      }
    });

    const backupScore = Math.round((actualCorrectCount / questions.length) * 100);

    return {
      score: backupScore,
      feedback: backupScore >= 70 ? "Good job falling back locally!" : "Needs a bit of review.",
      incorrectExplanations: explanations
    };
  }
}
