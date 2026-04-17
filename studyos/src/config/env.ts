/**
 * src/config/env.ts
 * 
 * Cross-platform environment variable resolver.
 * 
 * Automatically detects whether the application is running in an Expo (React Native) 
 * build via `process.env.EXPO_PUBLIC_...` or a standard Web build via `import.meta.env.VITE_...`.
 * This prevents critical crash bugs when transitioning codebases across mobile and web.
 */

// Helper to safely access process.env without crashing in strict browser environments
const getProcessEnv = (key: string) => {
    try {
        return process.env[key];
    } catch (e) {
        return undefined;
    }
};

// Helper to safely access import.meta.env without crashing in strict Node/Native environments
const getMetaEnv = (key: string) => {
    try {
        // @ts-ignore - Ignore TS error in environments where import.meta is fully strictly typed
        return import.meta.env[key];
    } catch (e) {
        return undefined;
    }
};

/**
 * Universal Key Resolver
 */
function resolveKey(expoKey: string, viteKey: string): string {
    // 1. Try Expo natively
    const expoVal = getProcessEnv(expoKey);
    if (expoVal) return expoVal;

    // 2. Try Vite / Browser natively
    const viteVal = getMetaEnv(viteKey);
    if (viteVal) return viteVal;

    // 3. Fallback safely
    return '';
}

export const ENV = {
    GROQ_API_KEY: resolveKey('EXPO_PUBLIC_GROQ_API_KEY', 'VITE_GROQ_API_KEY'),
    GEMINI_API_KEY: resolveKey('EXPO_PUBLIC_GEMINI_API_KEY', 'VITE_GEMINI_API_KEY'),
    SARVAM_API_KEY: resolveKey('EXPO_PUBLIC_SARVAM_API_KEY', 'VITE_SARVAM_API_KEY'),
    GOOGLE_SPEECH_API_KEY: resolveKey('EXPO_PUBLIC_GOOGLE_SPEECH_API_KEY', 'VITE_GOOGLE_SPEECH_API_KEY'),
    
    FIREBASE_API_KEY: resolveKey('EXPO_PUBLIC_FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY'),
    FIREBASE_AUTH_DOMAIN: resolveKey('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_AUTH_DOMAIN'),
    FIREBASE_PROJECT_ID: resolveKey('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID'),
    FIREBASE_STORAGE_BUCKET: resolveKey('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_STORAGE_BUCKET'),
    FIREBASE_MESSAGING_SENDER_ID: resolveKey('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
    FIREBASE_APP_ID: resolveKey('EXPO_PUBLIC_FIREBASE_APP_ID', 'VITE_FIREBASE_APP_ID'),
    FIREBASE_MEASUREMENT_ID: resolveKey('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID', 'VITE_FIREBASE_MEASUREMENT_ID'),
};
