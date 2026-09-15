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

const RECAPTCHA_CONTAINER_ID = 'firebase-recaptcha-container';

/**
 * Mounts an invisible reCAPTCHA and returns a fresh verifier. Firebase
 * requires one of these per phone-auth attempt as its bot-abuse check — it's
 * invisible in practice (no puzzle shown) unless Firebase's risk scoring
 * flags the attempt as suspicious.
 *
 * The container is created and destroyed here, imperatively, appended
 * directly to <body> — deliberately kept OUTSIDE React's render tree rather
 * than referencing a div from JSX. Two real problems forced this:
 *  1. Google's reCAPTCHA JS tags the container *element itself* as already
 *     used once rendered — clearing innerHTML, or even calling
 *     RecaptchaVerifier.clear(), isn't enough to stop a retry from throwing
 *     "reCAPTCHA has already been rendered in this element".
 *  2. Swapping in a fresh element for one React rendered (replaceChild)
 *     leaves React's fiber holding a stale reference to the now-detached old
 *     node — its eventual unmount then throws trying to remove a node that's
 *     no longer anyone's child.
 * Owning the whole element's lifecycle here avoids both: nothing but this
 * function ever creates, reads, or removes it.
 */
export function createRecaptchaVerifier(previous?: RecaptchaVerifier | null): RecaptchaVerifier {
  previous?.clear();
  document.getElementById(RECAPTCHA_CONTAINER_ID)?.remove();
  const container = document.createElement('div');
  container.id = RECAPTCHA_CONTAINER_ID;
  document.body.appendChild(container);
  return new RecaptchaVerifier(getFirebaseAuth(), RECAPTCHA_CONTAINER_ID, { size: 'invisible' });
}

/** Removes the reCAPTCHA container, if one exists. Call on unmount alongside clearing the verifier. */
export function removeRecaptchaContainer(): void {
  document.getElementById(RECAPTCHA_CONTAINER_ID)?.remove();
}

export async function sendFirebaseOtp(
  phoneE164: string,
  verifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(getFirebaseAuth(), phoneE164, verifier);
}

export type { ConfirmationResult };
