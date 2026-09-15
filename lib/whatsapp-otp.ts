import crypto from 'crypto';

/**
 * WhatsApp OTP via Meta's own WhatsApp Cloud API — no BSP middleman, no DLT
 * (that's an SMS-specific TRAI rule; WhatsApp follows Meta's own Business
 * Messaging Policy instead), no setup fee from Meta itself.
 *
 * Unlike MSG91's dedicated OTP API, the Cloud API is a generic messaging
 * API — it sends a templated message, nothing more. It doesn't generate,
 * store, or verify a code for us. Since this project has no database, the
 * OTP itself is never stored anywhere: instead, `sendOtp` returns a signed
 * token alongside the send confirmation, which the client holds and submits
 * back at verify time together with the code the user typed. `verifyOtp`
 * recomputes the same signature from (phone, submitted code, expiry) and
 * compares — only whoever received the original send (and thus the token)
 * can produce a token that matches a given code, since only this server
 * knows WHATSAPP_OTP_SECRET. No one, including us, ever has the code
 * sitting in a database to leak or replay outside its 5-minute window.
 *
 * Required setup (see .env.example):
 *  1. A Meta Business Account + a Meta app with the WhatsApp product added
 *     (developers.facebook.com) — free.
 *  2. A real business phone number registered to it (not a number already
 *     active on regular WhatsApp/WhatsApp Business app) + business
 *     verification for production use beyond the small free test-number tier.
 *  3. An "Authentication" category template approved by Meta — this category
 *     is reviewed faster than general marketing templates, but isn't
 *     necessarily instant.
 *  4. A permanent access token (Business Settings → System Users) and the
 *     phone number's numeric ID (different from the phone number itself).
 */

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TEMPLATE_NAME = process.env.WHATSAPP_OTP_TEMPLATE_NAME;
const SECRET = process.env.WHATSAPP_OTP_SECRET;
// Most Authentication templates include a "Copy Code" button, which needs its
// own parameter alongside the body's. Set to "false" if your approved
// template is body-only (no button component).
const HAS_COPY_BUTTON = process.env.WHATSAPP_OTP_HAS_COPY_BUTTON !== 'false';
const API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';

export const whatsappOtpConfigured = Boolean(ACCESS_TOKEN && PHONE_NUMBER_ID && TEMPLATE_NAME && SECRET);

const OTP_VALIDITY_SECONDS = 5 * 60;

export interface WhatsappOtpResult {
  ok: boolean;
  token?: string;
  error?: string;
}

function toE164Digits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

function sign(phone: string, otp: string, expiresAt: number): string {
  return crypto.createHmac('sha256', SECRET!).update(`${phone}:${otp}:${expiresAt}`).digest('hex');
}

export async function sendOtp(phone: string): Promise<WhatsappOtpResult> {
  if (!whatsappOtpConfigured) {
    return { ok: false, error: 'WhatsApp OTP is not configured yet.' };
  }

  const to = toE164Digits(phone);
  const otp = String(crypto.randomInt(100000, 1000000));
  const expiresAt = Math.floor(Date.now() / 1000) + OTP_VALIDITY_SECONDS;
  const token = `${expiresAt}.${sign(to, otp, expiresAt)}`;

  const components: unknown[] = [
    { type: 'body', parameters: [{ type: 'text', text: otp }] },
  ];
  if (HAS_COPY_BUTTON) {
    components.push({
      type: 'button', sub_type: 'url', index: '0',
      parameters: [{ type: 'text', text: otp }],
    });
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: TEMPLATE_NAME,
          language: { code: 'en' },
          components,
        },
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || 'Could not send the WhatsApp message. Please try again.' };
    }
    return { ok: true, token };
  } catch {
    return { ok: false, error: 'Could not reach WhatsApp. Please try again.' };
  }
}

export function verifyOtp(phone: string, otp: string, token: string): WhatsappOtpResult {
  if (!whatsappOtpConfigured) {
    return { ok: false, error: 'WhatsApp OTP is not configured yet.' };
  }
  if (!token || !token.includes('.')) {
    return { ok: false, error: 'Please request a new code.' };
  }

  const [expiresAtStr, signature] = token.split('.');
  const expiresAt = parseInt(expiresAtStr, 10);
  if (!expiresAt || Math.floor(Date.now() / 1000) > expiresAt) {
    return { ok: false, error: 'This code has expired. Please request a new one.' };
  }

  const to = toE164Digits(phone);
  const expected = sign(to, otp, expiresAt);

  // Constant-time comparison — avoids leaking how many leading characters of
  // the signature matched via response-timing differences.
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) {
    return { ok: false, error: 'Incorrect code. Please try again.' };
  }
  return { ok: true };
}
