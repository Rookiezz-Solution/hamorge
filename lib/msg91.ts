/**
 * MSG91 OTP integration.
 *
 * MSG91's dedicated OTP API (not their plain SMS API) generates, sends, stores
 * and expires the code entirely on their side — we never see or store the OTP
 * ourselves. That's deliberate: this project has no database, and building a
 * safe OTP store (expiry, attempt limits, replay protection) from scratch on a
 * serverless/stateless host is exactly the kind of thing worth NOT hand-rolling
 * when the provider already does it correctly.
 *
 * Required setup in the MSG91 dashboard before this works (see .env.example):
 *  1. An account + auth key (Settings → API).
 *  2. A DLT-registered sender ID and OTP message template — mandatory for any
 *     transactional SMS to Indian numbers. MSG91 walks you through DLT
 *     registration; it can take anywhere from minutes to a couple of days for
 *     the telecom operators to approve a new template.
 *  3. The approved template's ID goes in MSG91_OTP_TEMPLATE_ID.
 */

const AUTH_KEY = process.env.MSG91_AUTH_KEY;
const TEMPLATE_ID = process.env.MSG91_OTP_TEMPLATE_ID;
const BASE = 'https://control.msg91.com/api/v5/otp';

export const msg91Configured = Boolean(AUTH_KEY && TEMPLATE_ID);

export interface Msg91Result {
  ok: boolean;
  error?: string;
}

/** Indian 10-digit numbers get the country code prefixed; anything else is passed through digits-only. */
function toMsg91Mobile(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function sendOtp(phone: string): Promise<Msg91Result> {
  if (!msg91Configured) {
    return { ok: false, error: 'SMS OTP is not configured yet.' };
  }

  const mobile = toMsg91Mobile(phone);
  const url = new URL(BASE);
  url.searchParams.set('template_id', TEMPLATE_ID!);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('authkey', AUTH_KEY!);
  url.searchParams.set('otp_expiry', '5'); // minutes

  try {
    const res = await fetch(url.toString(), { method: 'POST' });
    const data = await res.json().catch(() => null);
    if (data?.type === 'success') return { ok: true };
    return { ok: false, error: data?.message || 'Could not send OTP. Please try again.' };
  } catch {
    return { ok: false, error: 'Could not reach the SMS provider. Please try again.' };
  }
}

export async function verifyOtp(phone: string, otp: string): Promise<Msg91Result> {
  if (!msg91Configured) {
    return { ok: false, error: 'SMS OTP is not configured yet.' };
  }

  const mobile = toMsg91Mobile(phone);
  const url = new URL(`${BASE}/verify`);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('otp', otp);
  url.searchParams.set('authkey', AUTH_KEY!);

  try {
    const res = await fetch(url.toString(), { method: 'GET' });
    const data = await res.json().catch(() => null);
    if (data?.type === 'success') return { ok: true };
    return { ok: false, error: data?.message || 'Invalid or expired OTP.' };
  } catch {
    return { ok: false, error: 'Could not reach the SMS provider. Please try again.' };
  }
}
