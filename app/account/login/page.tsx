'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login, sendForgotPasswordOtp, resetPassword } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [forgotOpen, setForgotOpen] = useState(false);
  // 'phone' = enter the registered number, 'reset' = code sent, enter it plus a new password.
  const [forgotStep, setForgotStep] = useState<'phone' | 'reset'>('phone');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpToken, setForgotOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotDone, setForgotDone] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', border: 'none', borderBottom: '1px solid #000',
    fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000',
    padding: '8px 0', outline: 'none', background: 'transparent',
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await login(identifier, password);
    setLoading(false);
    if (err) { setError(err); return; }
    router.push('/');
  }

  function openForgot() {
    setForgotStep('phone');
    setForgotPhone('');
    setForgotOtp('');
    setForgotOtpToken('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotError('');
    setForgotDone(false);
    setForgotOpen(true);
  }

  async function handleSendForgotOtp(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    const { token, error: sendErr } = await sendForgotPasswordOtp(forgotPhone);
    setForgotLoading(false);
    if (sendErr || !token) { setForgotError(sendErr ?? 'Could not send the code.'); return; }
    setForgotOtpToken(token);
    setForgotStep('reset');
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) { setForgotError('Passwords do not match.'); return; }
    setForgotLoading(true);
    setForgotError('');
    const err = await resetPassword(forgotPhone, forgotOtp, forgotOtpToken, newPassword);
    setForgotLoading(false);
    if (err) { setForgotError(err); return; }
    setForgotDone(true);
  }

  return (
    <>
      <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
        <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>

          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.08em', color: '#000', marginBottom: 32 }}>
            LOG IN
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.10em', color: '#000', marginBottom: 10 }}>EMAIL OR PHONE NUMBER</p>
              <input type="text" required value={identifier} onChange={e => setIdentifier(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.10em', color: '#000', marginBottom: 10 }}>PASSWORD</p>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            </div>

            <p
              onClick={openForgot}
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

            {forgotDone ? (
              <>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', marginBottom: 24 }}>
                  Password reset successfully. You can now log in with your new password.
                </p>
                <button onClick={() => setForgotOpen(false)} style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#000', background: 'none', border: '1px solid #000', padding: '14px 32px', cursor: 'pointer' }}>
                  CLOSE
                </button>
              </>
            ) : forgotStep === 'phone' ? (
              <form onSubmit={handleSendForgotOtp}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginBottom: 28, lineHeight: 1.6 }}>
                  Enter your registered phone number and we&apos;ll send you a verification code via WhatsApp.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #000', marginBottom: 24 }}>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#555', padding: '8px 8px 8px 0' }}>+91</span>
                  <input
                    type="tel" inputMode="numeric" required placeholder="10-digit mobile number"
                    value={forgotPhone} onChange={e => setForgotPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ ...inputStyle, border: 'none', padding: '8px 0' }}
                  />
                </div>

                {forgotError && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#c00', marginBottom: 16 }}>{forgotError}</p>
                )}

                <div style={{ display: 'flex', gap: 16 }}>
                  <button
                    type="submit" disabled={forgotLoading || forgotPhone.length !== 10}
                    style={{ flex: 1, height: 52, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.12em', color: '#000', cursor: forgotLoading ? 'not-allowed' : 'pointer' }}
                  >
                    {forgotLoading ? 'SENDING…' : 'SEND CODE'}
                  </button>
                  <button
                    type="button" onClick={() => setForgotOpen(false)}
                    style={{ flex: 1, height: 52, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.12em', color: '#000', cursor: 'pointer' }}
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginBottom: 24, lineHeight: 1.6 }}>
                  Code sent to +91 {forgotPhone} via WhatsApp.
                </p>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#000', marginBottom: 10 }}>ENTER OTP</p>
                  <input
                    type="text" inputMode="numeric" required autoFocus placeholder="6-digit code"
                    value={forgotOtp} onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#000', marginBottom: 10 }}>NEW PASSWORD</p>
                  <input
                    type="password" required minLength={8} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#000', marginBottom: 10 }}>CONFIRM NEW PASSWORD</p>
                  <input
                    type="password" required minLength={8} value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)} style={inputStyle}
                  />
                </div>

                <p
                  onClick={() => { setForgotStep('phone'); setForgotOtp(''); setForgotError(''); }}
                  style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', letterSpacing: '0.08em', marginBottom: 20, cursor: 'pointer', textDecoration: 'underline', display: 'inline-block' }}
                >
                  CHANGE NUMBER / RESEND
                </p>

                {forgotError && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#c00', marginBottom: 16 }}>{forgotError}</p>
                )}

                <button
                  type="submit" disabled={forgotLoading || forgotOtp.length !== 6}
                  style={{
                    width: '100%', height: 52, border: '1px solid #000', background: forgotLoading ? '#f5f5f5' : '#fff',
                    fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.12em',
                    color: '#000', cursor: forgotLoading || forgotOtp.length !== 6 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {forgotLoading ? 'RESETTING…' : 'RESET PASSWORD'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
