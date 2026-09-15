/**
 * Firebase Admin SDK — server-only. Verifies the ID token the client gets
 * after a successful phone sign-in, so we never trust a phone number the
 * browser merely claims — only one Firebase itself has cryptographically
 * confirmed via a completed SMS verification.
 *
 * FIREBASE_SERVICE_ACCOUNT_KEY holds the full service-account JSON (from
 * Firebase Console → Project Settings → Service Accounts → Generate new
 * private key), stored as a single-line JSON string. Treat it like a
 * password — it grants admin access to the whole Firebase project.
 */

import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const firebaseAdminConfigured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

function getFirebaseAdminApp(): App {
  if (getApps().length) return getApp();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
  }

  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
}

export interface VerifiedFirebasePhone {
  uid: string;
  phoneNumber: string;
}

/** Throws if the token is invalid/expired, or if it doesn't carry a verified phone number. */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebasePhone> {
  const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken);
  if (!decoded.phone_number) {
    throw new Error('This sign-in was not verified by phone number.');
  }
  return { uid: decoded.uid, phoneNumber: decoded.phone_number };
}
