'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  createRecaptchaVerifier, removeRecaptchaContainer, sendFirebaseOtp, firebaseConfigured, type ConfirmationResult,
} from '@/lib/firebase-client';
import type { RecaptchaVerifier } from 'firebase/auth';

/** Firebase's own error codes are prefixed like "auth/invalid-phone-number" — map the common ones to plain copy. */
function friendlyFirebaseError(message: string): string {
  if (message.includes('invalid-phone-number')) return 'Enter a valid 10-digit phone number.';
  if (message.includes('too-many-requests')) return 'Too many attempts. Please try again later.';
  if (message.includes('invalid-verification-code') || message.includes('code-expired')) return 'Incorrect or expired code.';
  if (message.includes('quota-exceeded')) return 'SMS limit reached. Please try again later.';
  return message;
}

export default function LoginPage() {
  const { login, forgotPassword, verifyFirebasePhoneLogin } = useAuth();
  const router = useRouter();

  const [method, setMethod] = useState<'password' | 'otp'>('password');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Phone OTP (Firebase) — two steps: enter phone, then the code sent to it.
  // Firebase runs the whole send/verify exchange client-side; our backend only
  // ever sees the resulting ID token, which it verifies server-side before
  // trusting the phone number at all (see /api/auth/firebase-verify).
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSentMsg, setOtpSentMsg] = useState('');

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    // Tear down the reCAPTCHA widget on unmount so a stale instance never lingers.
    return () => { recaptchaRef.current?.clear(); recaptchaRef.current = null; removeRecaptchaContainer(); };
  }, []);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', border: 'none', borderBottom: '1px solid #000',
    fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000',
    padding: '8px 0', outline: 'none', background: 'transparent',
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await login(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    router.push('/');
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');
    setOtpSentMsg('');
    try {
      recaptchaRef.current = createRecaptchaVerifier(recaptchaRef.current);
      const e164 = `+91${phone}`;
      confirmationRef.current = await sendFirebaseOtp(e164, recaptchaRef.current);
      setOtpStep('code');
      setOtpSentMsg(`Code sent to ${e164}.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not send the code. Please try again.';
      setOtpError(friendlyFirebaseError(message));
      // A failed attempt can leave the widget unusable — reset so retry works cleanly.
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');
    try {
      if (!confirmationRef.current) throw new Error('Please request a new code.');
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();
      const err = await verifyFirebasePhoneLogin(idToken);
      if (err) { setOtpError(err); return; }
      router.push('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid or expired code.';
      setOtpError(friendlyFirebaseError(message));
    } finally {
      setOtpLoading(false);
    }
  }

  function switchMethod(next: 'password' | 'otp') {
    setMethod(next);
    setError('');
    setOtpError('');
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotMsg('');
    const err = await forgotPassword(forgotEmail);
    setForgotLoading(false);
    if (err) { setForgotError(err); return; }
    setForgotMsg(`Password reset email sent to ${forgotEmail}. Check your inbox.`);
  }

  return (
    <>
      <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
        <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>

          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.08em', color: '#000', marginBottom: 32 }}>
            LOG IN
          </p>

          {/* PASSWORD / PHONE OTP method toggle */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 32, borderBottom: '1px solid #eee' }}>
            {(['password', 'otp'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMethod(m)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 14px 0',
                  fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em',
                  color: method === m ? '#000' : '#999',
                  borderBottom: method === m ? '2px solid #000' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {m === 'password' ? 'PASSWORD' : 'PHONE OTP'}
              </button>
            ))}
          </div>

          {method === 'password' ? (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.10em', color: '#000', marginBottom: 10 }}>EMAIL</p>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.10em', color: '#000', marginBottom: 10 }}>PASSWORD</p>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
              </div>

              <p
                onClick={() => setForgotOpen(true)}
                style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', letterSpacing: '0.08em', marginBottom: 20, cursor: 'pointer', textDecoration: 'underline', display: 'inline-block' }}
              >
                FORGOT PASSWORD?
              </p>

              {error && (
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#c00', marginBottom: 16 }}>{error}</p>
              )}

              <div style={{ marginBottom: 24 }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', height: 64, border: '1px solid #000', background: loading ? '#f5f5f5' : '#fff',
                    fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400,
                    letterSpacing: '0.12em', color: '#000', cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'LOGGING IN…' : 'LOG IN'}
                </button>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginTop: 16, textAlign: 'left' }}>
                  Don&apos;t have an account?{' '}
                  <Link href="/account/register" style={{ color: '#000', textDecoration: 'underline' }}>
                    Create one
                  </Link>
                </p>
              </div>
            </form>
          ) : !firebaseConfigured ? (
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#c00', marginBottom: 24 }}>
              Phone login isn&apos;t set up yet.
            </p>
          ) : otpStep === 'phone' ? (
            <form onSubmit={handleSendOtp}>
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.10em', color: '#000', marginBottom: 10 }}>PHONE NUMBER</p>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #000' }}>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#555', padding: '8px 8px 8px 0' }}>+91</span>
                  <input
                    type="tel" inputMode="numeric" required placeholder="10-digit mobile number"
                    value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ ...inputStyle, border: 'none', padding: '8px 0' }}
                  />
                </div>
              </div>


              {otpError && (
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#c00', marginBottom: 16 }}>{otpError}</p>
              )}

              <div style={{ marginBottom: 24 }}>
                <button
                  type="submit"
                  disabled={otpLoading || phone.length !== 10}
                  style={{
                    width: '100%', height: 64, border: '1px solid #000', background: otpLoading ? '#f5f5f5' : '#fff',
                    fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400,
                    letterSpacing: '0.12em', color: phone.length === 10 ? '#000' : '#bbb',
                    cursor: otpLoading || phone.length !== 10 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {otpLoading ? 'SENDING CODE…' : 'SEND OTP'}
                </button>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginTop: 16, textAlign: 'left' }}>
                  Don&apos;t have an account?{' '}
                  <Link href="/account/register" style={{ color: '#000', textDecoration: 'underline' }}>
                    Create one
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              {otpSentMsg && (
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginBottom: 20 }}>{otpSentMsg}</p>
              )}

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.10em', color: '#000', marginBottom: 10 }}>ENTER OTP</p>
                <input
                  type="text" inputMode="numeric" required autoFocus placeholder="6-digit code"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={inputStyle}
                />
              </div>

              <p
                onClick={() => { setOtpStep('phone'); setOtp(''); setOtpError(''); setOtpSentMsg(''); }}
                style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', letterSpacing: '0.08em', marginBottom: 20, cursor: 'pointer', textDecoration: 'underline', display: 'inline-block' }}
              >
                CHANGE NUMBER / RESEND
              </p>

              {otpError && (
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#c00', marginBottom: 16 }}>{otpError}</p>
              )}

              <div style={{ marginBottom: 24 }}>
                <button
                  type="submit"
                  disabled={otpLoading || otp.length !== 6}
                  style={{
                    width: '100%', height: 64, border: '1px solid #000', background: otpLoading ? '#f5f5f5' : '#fff',
                    fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400,
                    letterSpacing: '0.12em', color: otp.length === 6 ? '#000' : '#bbb',
                    cursor: otpLoading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {otpLoading ? 'VERIFYING…' : 'VERIFY & LOG IN'}
                </button>
              </div>
            </form>
          )}

          <div style={{ height: 1, background: '#eee', marginBottom: 24 }} />

          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', lineHeight: 1.6 }}>
            By logging in, I agree to link my account in accordance with the{' '}
            <Link href="/privacy" style={{ color: '#000', textDecoration: 'underline' }}>Privacy Policy</Link>
          </p>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ background: '#fff', padding: '48px 40px', width: '100%', maxWidth: 420 }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#000', marginBottom: 24 }}>
              RESET PASSWORD
            </p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginBottom: 28, lineHeight: 1.6 }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {forgotMsg ? (
              <>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', marginBottom: 24 }}>{forgotMsg}</p>
                <button onClick={() => { setForgotOpen(false); setForgotMsg(''); }} style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#000', background: 'none', border: '1px solid #000', padding: '14px 32px', cursor: 'pointer' }}>
                  CLOSE
                </button>
              </>
            ) : (
              <form onSubmit={handleForgot}>
                <input
                  type="email" required placeholder="EMAIL" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  style={{ width: '100%', border: 'none', borderBottom: '1px solid #000', fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000', padding: '8px 0', outline: 'none', background: 'transparent', marginBottom: 24 }}
                />
                {forgotError && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#c00', marginBottom: 16 }}>{forgotError}</p>
                )}
                <div style={{ display: 'flex', gap: 16 }}>
                  <button
                    type="submit" disabled={forgotLoading}
                    style={{ flex: 1, height: 52, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.12em', color: '#000', cursor: forgotLoading ? 'not-allowed' : 'pointer' }}
                  >
                    {forgotLoading ? 'SENDING…' : 'SEND RESET LINK'}
                  </button>
                  <button
                    type="button" onClick={() => setForgotOpen(false)}
                    style={{ flex: 1, height: 52, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.12em', color: '#000', cursor: 'pointer' }}
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
