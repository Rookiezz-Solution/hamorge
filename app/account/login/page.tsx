'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login, forgotPassword } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

          <div style={{ height: 1, background: '#eee', marginBottom: 24 }} />

          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.10em', color: '#000', marginBottom: 16 }}>
            ACCESS WITH
          </p>

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
