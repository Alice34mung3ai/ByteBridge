import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProgressData } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firestoreDatabaseId according to Firebase integration guidelines
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function isPermissionError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code;
  return (
    code === 'permission-denied' ||
    msg.toLowerCase().includes('permission') ||
    msg.toLowerCase().includes('insufficient permissions')
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection to Firestore (graceful check)
export async function testFirestoreConnection() {
  // No-op to avoid spurious unauthenticated offline logs on initialization
}

// Google Sign-In using popup (compatible with preview environment)
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Create or update user profile document (with offline tolerance)
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          uid: user.uid,
          displayName: user.displayName || 'Flight Cadet',
          email: user.email || '',
          photoURL: user.photoURL || '',
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (profileErr: any) {
      if (isPermissionError(profileErr)) {
        handleFirestoreError(profileErr, OperationType.WRITE, `users/${user.uid}`);
      }
      console.warn('User profile sync deferred (offline or pending):', profileErr?.message || profileErr);
    }

    return user;
  } catch (err: any) {
    console.error('Google Sign-In failed:', err);
    throw err;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Save telemetry to Firestore
export async function syncTelemetryToFirestore(userId: string, telemetry: UserProgressData): Promise<void> {
  const path = `users/${userId}/telemetry/flight_data`;
  try {
    const telemetryRef = doc(db, 'users', userId, 'telemetry', 'flight_data');
    await setDoc(telemetryRef, {
      userId,
      questionsAttempted: telemetry.questionsAttempted || 0,
      questionsCorrect: telemetry.questionsCorrect || 0,
      domainStats: telemetry.domainStats || {},
      topicStats: telemetry.topicStats || {},
      missedConcepts: telemetry.missedConcepts || {},
      flashcardStates: telemetry.flashcardStates || {},
      studyStreakDays: telemetry.studyStreakDays || 1,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    if (isPermissionError(err)) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
    console.warn('Firestore sync deferred (offline or token pending):', err?.message || err);
  }
}

// Load telemetry from Firestore
export async function loadTelemetryFromFirestore(userId: string): Promise<UserProgressData | null> {
  const path = `users/${userId}/telemetry/flight_data`;
  try {
    const telemetryRef = doc(db, 'users', userId, 'telemetry', 'flight_data');
    const snap = await getDoc(telemetryRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProgressData;
  } catch (err: any) {
    if (isPermissionError(err)) {
      handleFirestoreError(err, OperationType.GET, path);
    }
    console.warn('Firestore unreachable or offline, continuing with local storage:', err?.message || err);
    return null;
  }
}
