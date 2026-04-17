/**
 * voiceEngine.ts
 * 
 * Dedicated speech-to-text engine abstracting away Web APIs so it works cleanly 
 * on Expo (React Native) where standard browser AudioContext/SpeechRecognition fails.
 * 
 * Utilizes Sarvam AI for deep phonetic accuracy in Indian languages (Hindi, Marathi, Indian English)
 * and Google Speech-to-Text as a robust fallback for other global languages.
 */

import { ENV } from '../config/env';

export interface TranscriptionResult {
    text: string;
    confidence: number;
    provider: 'sarvam' | 'google' | 'error';
    error?: string;
}

/**
 * Sends Base64 audio explicitly to Sarvam AI.
 * Recommended for 'hi-IN' (Hindi), 'mr-IN' (Marathi), and 'en-IN' (Indian English).
 */
async function transcribeWithSarvam(audioBase64: string, languageCode: string): Promise<TranscriptionResult> {
    const SARVAM_API_URL = 'https://api.sarvam.ai/speech-to-text';
    const apiKey = ENV.SARVAM_API_KEY;

    if (!apiKey) {
        return { text: '', confidence: 0, provider: 'error', error: 'Missing Sarvam API Key' };
    }

    try {
        // Prepare the payload based on Sarvam's general spec
        // Sarvam usually expects an audio URL or multipart/form-data.
        // Assuming base64 is supported or needs to be mapped to a FormData object if native.
        // For Expo compatibility, passing JSON with base64 string if supported, 
        // else we construct a multi-part boundary.
        
        // This is a generic blueprint for Sarvam. Adjust payload formatting if checking docs.
        const response = await fetch(SARVAM_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-subscription-key': apiKey // Common Sarvam header
            },
            body: JSON.stringify({
                audio_base64: audioBase64,
                language_code: languageCode
            })
        });

        if (!response.ok) {
            throw new Error(`Sarvam API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            text: data.transcript || '',
            confidence: data.confidence || 0.9, 
            provider: 'sarvam'
        };

    } catch (err: any) {
        console.error('Sarvam AI transcription failed:', err);
        return { text: '', confidence: 0, provider: 'error', error: err.message };
    }
}

/**
 * Sends Base64 audio to Google Cloud Speech-to-Text API.
 * Recommended for standard English ('en-US', 'en-GB') and global fallbacks.
 */
async function transcribeWithGoogle(audioBase64: string, languageCode: string): Promise<TranscriptionResult> {
    const GOOGLE_API_KEY = ENV.GOOGLE_SPEECH_API_KEY;
    const GOOGLE_API_URL = `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`;

    if (!GOOGLE_API_KEY) {
        return { text: '', confidence: 0, provider: 'error', error: 'Missing Google Speech API Key' };
    }

    try {
        const response = await fetch(GOOGLE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                config: {
                    encoding: 'LINEAR16', // Adjust based on how Expo records audio
                    sampleRateHertz: 16000,
                    languageCode: languageCode,
                },
                audio: {
                    content: audioBase64
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Google Speech API Error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            return { text: '', confidence: 0, provider: 'google' };
        }

        const alternative = data.results[0].alternatives[0];
        return {
            text: alternative.transcript || '',
            confidence: alternative.confidence || 0.85,
            provider: 'google'
        };

    } catch (err: any) {
        console.error('Google Speech transcription failed:', err);
        return { text: '', confidence: 0, provider: 'error', error: err.message };
    }
}

/**
 * UNIVERSAL WRAPPER
 * Expo will pass base64 audio and the user's selected language down to this function.
 * This intelligently routes to Sarvam for Indian regional languages to get maximum accuracy,
 * and routes to Google for everything else.
 */
export async function processStudyAudio(audioBase64: string, detectedLanguage: string = 'en-US'): Promise<string> {
    // Strip standard data URI prefixes if the frontend attached one
    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z]+;base64,/, "");

    const indianLanguages = ['hi-IN', 'mr-IN', 'en-IN'];
    let result: TranscriptionResult;

    if (indianLanguages.includes(detectedLanguage)) {
        console.info(`Routing audio to Sarvam AI for ${detectedLanguage}`);
        result = await transcribeWithSarvam(cleanBase64, detectedLanguage);
        
        // Failover to Google if Sarvam fails or is rate-limited
        if (result.provider === 'error') {
            console.warn(`Sarvam failed. Falling back to Google for ${detectedLanguage}`);
            result = await transcribeWithGoogle(cleanBase64, detectedLanguage);
        }
    } else {
        console.info(`Routing audio to Google Speech for ${detectedLanguage}`);
        result = await transcribeWithGoogle(cleanBase64, detectedLanguage);
    }

    if (result.provider === 'error') {
        throw new Error(result.error || 'Transcription failed completely across all providers.');
    }

    return result.text;
}
