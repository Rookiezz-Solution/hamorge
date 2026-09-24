'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface Props {
  onClose: () => void;
  onAuth?: () => void;
  onGuest?: () => void;
}

type View = 'choose' | 'login' | 'register' | 'forgot';

const inputStyle: React.CSSProperties = {
  width: '100%', border: 'none', borderBottom: '1px solid #ccc',
  fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000',
  padding: '10px 0', outline: 'none', background: 'transparent',
  letterSpacing: '0.04em',
};

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0, marginBottom: 28 }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.8">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, letterSpacing: '0.10em', color: '#000' }}>BACK</span>
    </button>
  );
}

export default function CheckoutGate({ onClose, onAuth, onGuest }: Props) {
  const { login, register, sendForgotPasswordOtp, resetPassword } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<View>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot password fields — 'phone' = enter registered number, 'reset' = code sent, enter it plus a new password.
  const [forgotStep, setForgotStep] = useState<'phone' | 'reset'>('phone');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpToken, setForgotOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);

  function switchTo(v: View) {
    setError('');
    setView(v);
  }

  function handleGuest() {
    if (onGuest) { onGuest(); return; }
    onClose();
    router.push('/checkout?guest=1');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await login(loginIdentifier, loginPassword);
    setLoading(false);
    if (err) { setError(err); return; }
    if (onAuth) { onAuth(); return; }
    onClose();
    router.push('/address');
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (regPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    const err = await register({ firstName, lastName, email: regEmail, phone: '', password: regPassword });
    setLoading(false);
    if (err) { setError(err); return; }
    if (onAuth) { onAuth(); return; }
    onClose();
    router.push('/address');
  }

  function openForgot() {
    setForgotStep('phone');
    setForgotPhone('');
    setForgotOtp('');
    setForgotOtpToken('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotDone(false);
    setError('');
    switchTo('forgot');
  }

  async function handleSendForgotOtp(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setError('');
    const { token, error: sendErr } = await sendForgotPasswordOtp(forgotPhone);
    setForgotLoading(false);
    if (sendErr || !token) { setError(sendErr ?? 'Could not send the code.'); return; }
    setForgotOtpToken(token);
    setForgotStep('reset');
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match.'); return; }
    setForgotLoading(true);
    setError('');
    const err = await resetPassword(forgotPhone, forgotOtp, forgotOtpToken, newPassword);
    setForgotLoading(false);
    if (err) { setError(err); return; }
    setForgotDone(true);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, backdropFilter: 'blur(2px)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#fff', zIndex: 301,
        width: 'min(460px, 92vw)',
        padding: '40px 36px 44px',
      }}>

        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 20, color: '#999', lineHeight: 1, padding: 4 }}
        >
          ×
        </button>

        {/* ── CHOOSE ── */}
        {view === 'choose' && (
          <>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, letterSpacing: '0.14em', color: '#999', marginBottom: 6 }}>
              CHECKOUT
            </p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 400, letterSpacing: '0.06em', color: '#000', marginBottom: 36 }}>
              HOW WOULD YOU LIKE TO PROCEED?
            </p>

            <button
              onClick={() => switchTo('register')}
              style={{
                width: '100%', height: 52, background: '#fff', border: '1px solid #000',
                fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.14em',
                color: '#000', cursor: 'pointer', marginBottom: 12,
              }}
            >
              CREATE AN ACCOUNT
            </button>

            <button
              onClick={handleGuest}
              style={{
                width: '100%', height: 52, background: '#fff', border: '1px solid #000',
                fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.14em',
                color: '#000', cursor: 'pointer', marginBottom: 28,
              }}
            >
              CONTINUE AS GUEST
            </button>

            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: '#888', letterSpacing: '0.04em', marginBottom: 24 }}>
              Creating an account lets you track orders and save your details for next time.
            </p>

            <div style={{ height: 1, background: '#eee', marginBottom: 24 }} />

            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#555' }}>
              Already have an account?{' '}
              <button
                onClick={() => switchTo('login')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000', textDecoration: 'underline', letterSpacing: '0.04em' }}
              >
                Log in
              </button>
            </p>
          </>
        )}

        {/* ── LOGIN ── */}
        {view === 'login' && (
          <>
            <BackButton onClick={() => switchTo('choose')} />

            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 400, letterSpacing: '0.08em', color: '#000', marginBottom: 32 }}>
              LOG IN
            </p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <input
                required type="text" placeholder="EMAIL OR PHONE NUMBER" value={loginIdentifier}
                onChange={e => setLoginIdentifier(e.target.value)} style={inputStyle}
              />
              <input
                required type="password" placeholder="PASSWORD" value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)} style={inputStyle}
              />

              <button
                type="button"
                onClick={openForgot}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000', textDecoration: 'underline', alignSelf: 'flex-start' }}
              >
                Forgot password?
              </button>

              {error && (
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#c00' }}>{error}</p>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', height: 52, background: loading ? '#f5f5f5' : '#fff',
                  border: '1px solid #000', fontFamily: 'var(--font-inter)', fontSize: 12,
                  letterSpacing: '0.14em', color: '#000',
                  cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
                }}
              >
                {loading ? 'LOGGING IN…' : 'LOG IN & CONTINUE'}
              </button>

              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#555', textAlign: 'center' }}>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => switchTo('register')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000', textDecoration: 'underline' }}
                >
                  Create one
                </button>
              </p>
            </form>
          </>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {view === 'forgot' && (
          <>
            <BackButton onClick={() => switchTo('login')} />

            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 400, letterSpacing: '0.08em', color: '#000', marginBottom: 16 }}>
              RESET PASSWORD
            </p>

            {forgotDone ? (
              <>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000', marginBottom: 24 }}>
                  Password reset successfully. You can now log in with your new password.
                </p>
                <button
                  type="button"
                  onClick={() => switchTo('login')}
                  style={{ width: '100%', height: 52, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.14em', color: '#000', cursor: 'pointer' }}
                >
                  BACK TO LOG IN
                </button>
              </>
            ) : forgotStep === 'phone' ? (
              <form onSubmit={handleSendForgotOtp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#555', lineHeight: 1.6 }}>
                  Enter your registered phone number and we&apos;ll send you a verification code via WhatsApp.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #ccc' }}>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#555', padding: '10px 8px 10px 0' }}>+91</span>
                  <input
                    required type="tel" inputMode="numeric" placeholder="10-digit mobile number"
                    value={forgotPhone} onChange={e => setForgotPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ ...inputStyle, border: 'none', padding: '10px 0' }}
                  />
                </div>

                {error && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#c00' }}>{error}</p>
                )}

                <button
                  type="submit" disabled={forgotLoading || forgotPhone.length !== 10}
                  style={{
                    width: '100%', height: 52, background: forgotLoading ? '#f5f5f5' : '#fff',
                    border: '1px solid #000', fontFamily: 'var(--font-inter)', fontSize: 12,
                    letterSpacing: '0.14em', color: '#000',
                    cursor: forgotLoading || forgotPhone.length !== 10 ? 'not-allowed' : 'pointer', marginTop: 4,
                  }}
                >
                  {forgotLoading ? 'SENDING…' : 'SEND CODE'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#555', lineHeight: 1.6 }}>
                  Code sent to +91 {forgotPhone} via WhatsApp.
                </p>
                <input
                  required type="text" inputMode="numeric" placeholder="6-DIGIT CODE" value={forgotOtp}
                  onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} style={inputStyle}
                />
                <input
                  required type="password" placeholder="NEW PASSWORD" value={newPassword} minLength={8}
                  onChange={e => setNewPassword(e.target.value)} style={inputStyle}
                />
                <input
                  required type="password" placeholder="CONFIRM NEW PASSWORD" value={confirmNewPassword} minLength={8}
                  onChange={e => setConfirmNewPassword(e.target.value)} style={inputStyle}
                />

                <button
                  type="button"
                  onClick={() => setForgotStep('phone')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000', textDecoration: 'underline', alignSelf: 'flex-start' }}
                >
                  Change number / resend
                </button>

                {error && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#c00' }}>{error}</p>
                )}

                <button
                  type="submit" disabled={forgotLoading || forgotOtp.length !== 6}
                  style={{
                    width: '100%', height: 52, background: forgotLoading ? '#f5f5f5' : '#fff',
                    border: '1px solid #000', fontFamily: 'var(--font-inter)', fontSize: 12,
                    letterSpacing: '0.14em', color: '#000',
                    cursor: forgotLoading || forgotOtp.length !== 6 ? 'not-allowed' : 'pointer', marginTop: 4,
                  }}
                >
                  {forgotLoading ? 'RESETTING…' : 'RESET PASSWORD'}
                </button>
              </form>
            )}
          </>
        )}

        {/* ── REGISTER ── */}
        {view === 'register' && (
          <>
            <BackButton onClick={() => switchTo('choose')} />

            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 400, letterSpacing: '0.08em', color: '#000', marginBottom: 32 }}>
              CREATE ACCOUNT
            </p>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <input
                  required placeholder="FIRST NAME" value={firstName}
                  onChange={e => setFirstName(e.target.value)} style={inputStyle}
                />
                <input
                  placeholder="LAST NAME" value={lastName}
                  onChange={e => setLastName(e.target.value)} style={inputStyle}
                />
              </div>

              <input
                required type="email" placeholder="EMAIL" value={regEmail}
                onChange={e => setRegEmail(e.target.value)} style={inputStyle}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <input
                  required type="password" placeholder="PASSWORD" value={regPassword}
                  onChange={e => setRegPassword(e.target.value)} style={inputStyle} minLength={8}
                />
                <input
                  required type="password" placeholder="CONFIRM" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} minLength={8}
                />
              </div>

              {error && (
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#c00' }}>{error}</p>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', height: 52, background: loading ? '#f5f5f5' : '#fff',
                  border: '1px solid #000', fontFamily: 'var(--font-inter)', fontSize: 12,
                  letterSpacing: '0.14em', color: '#000',
                  cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
                }}
              >
                {loading ? 'CREATING ACCOUNT…' : 'CREATE & CONTINUE TO CHECKOUT'}
              </button>

              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#555', textAlign: 'center' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTo('login')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000', textDecoration: 'underline' }}
                >
                  Log in
                </button>
              </p>
            </form>
          </>
        )}

      </div>
    </>
  );
}
