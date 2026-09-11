'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const inputStyle: React.CSSProperties = {
  width: '100%', border: 'none', borderBottom: '1px solid #000',
  fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000',
  padding: '8px 0', outline: 'none', background: 'transparent',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter)', fontSize: 11, letterSpacing: '0.10em',
  color: '#666', marginBottom: 8, display: 'block',
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const key = searchParams.get('key') ?? '';
  const login = searchParams.get('login') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!key || !login) {
    return (
      <div>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: '#c00', marginBottom: 20 }}>
          Invalid or missing reset link. Please request a new one.
        </p>
        <Link href="/account/login" style={{ fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.10em', color: '#000', textDecoration: 'underline' }}>
          Back to Log In
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, login, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Reset failed. Please try again.'); return; }
    setSuccess(true);
    setTimeout(() => router.push('/account/login'), 2500);
  }

  if (success) {
    return (
      <div>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: '#000', marginBottom: 8 }}>
          Password updated successfully.
        </p>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#555' }}>
          Redirecting you to log in…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 420 }}>
      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>NEW PASSWORD</label>
        <input
          required type="password" minLength={8}
          value={password} onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>CONFIRM PASSWORD</label>
        <input
          required type="password" minLength={8}
          value={confirm} onChange={e => setConfirm(e.target.value)}
          style={inputStyle}
        />
      </div>

      {error && (
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#c00', marginBottom: 16 }}>{error}</p>
      )}

      <button
        type="submit" disabled={loading}
        style={{
          width: 220, height: 48, background: '#fff', border: '1px solid #000',
          fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.14em',
          color: loading ? '#999' : '#000', cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'SAVING…' : 'SET NEW PASSWORD'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 400, letterSpacing: '0.08em', color: '#000', marginBottom: 32 }}>
          RESET PASSWORD
        </p>
        <div style={{ height: 1, background: '#ddd', marginBottom: 40 }} />
        <Suspense fallback={<div />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
