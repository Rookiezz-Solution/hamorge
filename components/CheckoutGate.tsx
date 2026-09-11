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
  const { login, register, forgotPassword } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<View>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

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
    const err = await login(loginEmail, loginPassword);
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

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setError('');
    setForgotMsg('');
    const err = await forgotPassword(forgotEmail);
    setForgotLoading(false);
    if (err) { setError(err); return; }
    setForgotMsg(`Password reset email sent to ${forgotEmail}. Check your inbox.`);
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
                required type="email" placeholder="EMAIL" value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)} style={inputStyle}
              />
              <input
                required type="password" placeholder="PASSWORD" value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)} style={inputStyle}
              />

              <button
                type="button"
                onClick={() => { setForgotEmail(loginEmail); setForgotMsg(''); switchTo('forgot'); }}
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
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#555', marginBottom: 28, lineHeight: 1.6 }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {forgotMsg ? (
              <>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000', marginBottom: 24 }}>{forgotMsg}</p>
                <button
                  type="button"
                  onClick={() => switchTo('login')}
                  style={{ width: '100%', height: 52, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.14em', color: '#000', cursor: 'pointer' }}
                >
                  BACK TO LOG IN
                </button>
              </>
            ) : (
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <input
                  required type="email" placeholder="EMAIL" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)} style={inputStyle}
                />

                {error && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#c00' }}>{error}</p>
                )}

                <button
                  type="submit" disabled={forgotLoading}
                  style={{
                    width: '100%', height: 52, background: forgotLoading ? '#f5f5f5' : '#fff',
                    border: '1px solid #000', fontFamily: 'var(--font-inter)', fontSize: 12,
                    letterSpacing: '0.14em', color: '#000',
                    cursor: forgotLoading ? 'not-allowed' : 'pointer', marginTop: 4,
                  }}
                >
                  {forgotLoading ? 'SENDING…' : 'SEND RESET LINK'}
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
