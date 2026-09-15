'use client';

/**
 * Firebase client SDK — used only for Phone Auth on the login page.
 *
 * All these NEXT_PUBLIC_FIREBASE_* values are meant to be public; Firebase's
 * own docs are explicit about this — they identify the project, they don't
 * grant privileged access. Actual security comes from Firebase's own
 * reCAPTCHA/App Check abuse protection plus server-side ID token verification
 * (see lib/firebase-admin.ts), not from hiding these values.
 */

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

/**
 * Mounts an invisible reCAPTCHA bound to the given container id. Firebase
 * requires one of these per phone-auth attempt as its bot-abuse check — it's
 * invisible in practice (no puzzle shown) unless Firebase's risk scoring
 * flags the attempt as suspicious.
 */
export function createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(getFirebaseAuth(), containerId, { size: 'invisible' });
}

export async function sendFirebaseOtp(
  phoneE164: string,
  verifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(getFirebaseAuth(), phoneE164, verifier);
}

export type { ConfirmationResult };
