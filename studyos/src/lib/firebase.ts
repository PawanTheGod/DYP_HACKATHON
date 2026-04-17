/**
 * firebase.ts — Firebase Initialization (Person 3 / Task 3.1)
 *
 * Initializes the Firebase app, Firestore with offline persistence (v10 API),
 * Anonymous Authentication, and optional Analytics.
 *
 * Gracefully degrades to localStorage if config env vars are missing.
 */

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';

// ─── Config ───────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             as string | undefined,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         as string | undefined,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          as string | undefined,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              as string | undefined,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID      as string | undefined,
};

const REQUIRED_KEYS: (keyof typeof firebaseConfig)[] = ['apiKey', 'projectId', 'appId'];

// ─── State ────────────────────────────────────────────────────────────────────

let _app:           FirebaseApp | null = null;
let _db:            Firestore   | null = null;
let _auth:          Auth        | null = null;
let _analytics:     Analytics   | null = null;
let _currentUserId: string      | null = null;
let _firebaseReady                     = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasRequiredConfig(): boolean {
  return REQUIRED_KEYS.every((key) => {
    const val = firebaseConfig[key];
    return (
      typeof val === 'string' &&
      val.length > 0 &&
      !val.startsWith('your_') &&
      val !== 'undefined'
    );
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialises Firebase, Firestore (with offline persistence via v10 API),
 * Anonymous Auth, and optional Analytics.
 *
 * @returns `true` if Firebase is ready, `false` if falling back to localStorage.
 */
export async function initializeFirebase(): Promise<boolean> {
  if (_firebaseReady) return true;

  if (!hasRequiredConfig()) {
    console.warn(
      '[firebase] Missing or placeholder env vars — using localStorage fallback.\n' +
      'Copy .env.example → .env and fill in your Firebase project credentials.'
    );
    return false;
  }

  try {
    // Prevent duplicate app initialisation (Vite HMR safe)
    _app = getApps().length > 0
      ? getApps()[0]
      : initializeApp(firebaseConfig as Required<typeof firebaseConfig>);

    _auth = getAuth(_app);

    // ── Firestore with offline persistence (Firebase v10 API) ────────────────
    // Uses initializeFirestore + persistentLocalCache instead of the deprecated
    // getFirestore() + enableIndexedDbPersistence() pattern.
    // persistentMultipleTabManager handles multi-tab gracefully without errors.
    try {
      _db = initializeFirestore(_app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
      console.log('[firebase] Offline persistence enabled (IndexedDB, multi-tab).');
    } catch (err: unknown) {
      // initializeFirestore throws if called twice (e.g. Vite HMR) — re-use existing
      const { getFirestore } = await import('firebase/firestore');
      _db = getFirestore(_app);
      console.warn('[firebase] Re-using existing Firestore instance:', (err as Error).message);
    }

    // ── Anonymous Auth ───────────────────────────────────────────────────────
    await new Promise<void>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        _auth!,
        (user: User | null) => {
          unsubscribe();
          if (user) {
            _currentUserId = user.uid;
            _firebaseReady  = true;
            console.log(`[firebase] Signed in anonymously: ${user.uid}`);
            resolve();
          } else {
            signInAnonymously(_auth!)
              .then((cred) => {
                _currentUserId = cred.user.uid;
                _firebaseReady  = true;
                console.log(`[firebase] Signed in anonymously: ${cred.user.uid}`);
                resolve();
              })
              .catch(reject);
          }
        },
        reject
      );
    });

    // ── Analytics (optional — non-fatal) ─────────────────────────────────────
    if (firebaseConfig.measurementId) {
      try {
        const supported = await isSupported();
        if (supported) {
          _analytics = getAnalytics(_app);
          console.log('[firebase] Analytics enabled.');
        }
      } catch {
        console.warn('[firebase] Analytics could not be initialised (non-fatal).');
      }
    }

    return true;

  } catch (err) {
    console.error('[firebase] Initialisation failed — falling back to localStorage.', err);
    _firebaseReady = false;
    return false;
  }
}

// ─── Accessors ────────────────────────────────────────────────────────────────

export function getDb(): Firestore | null         { return _db; }
export function getAuthInstance(): Auth | null    { return _auth; }
export function getAnalyticsInstance(): Analytics | null { return _analytics; }
export function getCurrentUserId(): string | null { return _currentUserId; }
export function isFirebaseReady(): boolean        { return _firebaseReady; }
