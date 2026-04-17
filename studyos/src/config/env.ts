/**
 * src/config/env.ts
 * 
 * Cross-platform environment variable resolver.
 */

// Helper to safely access process.env without crashing in strict browser environments
const getProcessEnv = (key: string): string | undefined => {
    try {
        // @ts-ignore
        return typeof process !== 'undefined' ? process.env[key] : undefined;
    } catch (e) {
        return undefined;
    }
};

// Vite static injection references
// We MUST use literal `import.meta.env.VITE_XXX` so Vite's static analyzer can replace them during build.
const VITE_GROQ = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GROQ_API_KEY : '';
const VITE_GEMINI = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : '';
const VITE_SARVAM = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SARVAM_API_KEY : '';
const VITE_GOOGLE = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GOOGLE_SPEECH_API_KEY : '';

const VITE_FB_API = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_API_KEY : '';
const VITE_FB_AUTH = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : '';
const VITE_FB_PROJ = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_PROJECT_ID : '';
const VITE_FB_BUCKET = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : '';
const VITE_FB_SENDER = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : '';
const VITE_FB_APP = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_APP_ID : '';
const VITE_FB_MEASURE = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_MEASUREMENT_ID : '';

export const ENV = {
    GROQ_API_KEY: getProcessEnv('EXPO_PUBLIC_GROQ_API_KEY') || VITE_GROQ || '',
    GEMINI_API_KEY: getProcessEnv('EXPO_PUBLIC_GEMINI_API_KEY') || VITE_GEMINI || '',
    SARVAM_API_KEY: getProcessEnv('EXPO_PUBLIC_SARVAM_API_KEY') || VITE_SARVAM || '',
    GOOGLE_SPEECH_API_KEY: getProcessEnv('EXPO_PUBLIC_GOOGLE_SPEECH_API_KEY') || VITE_GOOGLE || '',
    
    FIREBASE_API_KEY: getProcessEnv('EXPO_PUBLIC_FIREBASE_API_KEY') || VITE_FB_API || '',
    FIREBASE_AUTH_DOMAIN: getProcessEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN') || VITE_FB_AUTH || '',
    FIREBASE_PROJECT_ID: getProcessEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID') || VITE_FB_PROJ || '',
    FIREBASE_STORAGE_BUCKET: getProcessEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET') || VITE_FB_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: getProcessEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') || VITE_FB_SENDER || '',
    FIREBASE_APP_ID: getProcessEnv('EXPO_PUBLIC_FIREBASE_APP_ID') || VITE_FB_APP || '',
    FIREBASE_MEASUREMENT_ID: getProcessEnv('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID') || VITE_FB_MEASURE || '',
};
