'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const { register, sendLoginOtp } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Phone verification gate — the account isn't created until this passes.
  // 'form' = filling in details, 'otp' = code sent, awaiting verification.
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSentMsg, setOtpSentMsg] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', border: 'none', borderBottom: '1px solid #000',
    fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.08em',
    color: '#000', padding: '8px 0', outline: 'none', background: 'transparent',
  };

  // Step 1: validate the form, then send the phone OTP (via MSG91) — the
  // account itself isn't created here, only once the code is verified
  // (see handleVerifyOtp), and MSG91's verify call happens server-side,
  // atomically with account creation, in /api/auth/register.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { setError('Please accept the Privacy Policy to continue.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!/^\d{10}$/.test(phone)) { setError('Enter a valid 10-digit phone number.'); return; }

    setLoading(true);
    setError('');
    const err = await sendLoginOtp(phone);
    setLoading(false);
    if (err) { setError(err); return; }
    setStep('otp');
    setOtpSentMsg(`Code sent to +91${phone}.`);
  }

  // Step 2: submit the code together with the form details — the account is
  // created only if MSG91 confirms the code server-side (see the route).
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');
    const err = await register({ firstName, lastName, email, phone, password, otp });
    setOtpLoading(false);
    if (err) { setOtpError(err); return; }
    setSuccess(true);
    setTimeout(() => router.push('/'), 2000);
  }

  if (success) {
    return (
      <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
        <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', marginBottom: 12 }}>
            Account created successfully!
          </p>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555' }}>
            A welcome email has been sent to <strong>{email}</strong>. Redirecting you now…
          </p>
        </div>
      </main>
    );
  }

  if (step === 'otp') {
    return (
      <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
        <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>

          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.10em', color: '#000', marginBottom: 40 }}>
            VERIFY YOUR PHONE
          </p>

          <form onSubmit={handleVerifyOtp}>
            {otpSentMsg && (
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginBottom: 28 }}>{otpSentMsg}</p>
            )}

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#000', marginBottom: 10 }}>ENTER OTP</p>
              <input
                type="text" inputMode="numeric" required autoFocus placeholder="6-digit code"
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={inputStyle}
              />
            </div>

            <p
              onClick={() => { setStep('form'); setOtp(''); setOtpError(''); setOtpSentMsg(''); }}
              style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', letterSpacing: '0.08em', marginBottom: 20, cursor: 'pointer', textDecoration: 'underline', display: 'inline-block' }}
            >
              CHANGE NUMBER / RESEND
            </p>

            {otpError && (
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#c00', marginBottom: 16 }}>{otpError}</p>
            )}

            <button
              type="submit"
              disabled={otpLoading || otp.length !== 6}
              style={{
                width: 260, height: 64, border: '1px solid #000', background: otpLoading ? '#f5f5f5' : '#fff',
                fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400,
                letterSpacing: '0.12em', color: otp.length === 6 ? '#000' : '#bbb',
                cursor: otpLoading || otp.length !== 6 ? 'not-allowed' : 'pointer',
              }}
            >
              {otpLoading ? 'VERIFYING…' : 'VERIFY & CREATE ACCOUNT'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>

        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.10em', color: '#000', marginBottom: 40 }}>
          REGISTRATION DETAILS
        </p>

        <form onSubmit={handleSubmit}>

          {/* First + Last name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 36 }}>
            <input
              type="text" placeholder="FIRST NAME" required value={firstName}
              onChange={e => setFirstName(e.target.value)} style={inputStyle}
            />
            <input
              type="text" placeholder="LAST NAME" value={lastName}
              onChange={e => setLastName(e.target.value)} style={inputStyle}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 36 }}>
            <input
              type="email" placeholder="EMAIL" required value={email}
              onChange={e => setEmail(e.target.value)} style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 36 }}>
            <input
              type="password" placeholder="PASSWORD" required value={password}
              onChange={e => setPassword(e.target.value)} style={inputStyle}
              minLength={8}
            />
            <input
              type="password" placeholder="CONFIRM PASSWORD" required value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} style={inputStyle}
              minLength={8}
            />
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#000', marginBottom: 12 }}>
              PREFIX
            </p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
              <div style={{ width: 80 }}>
                {/* Fixed, not editable — the OTP flow assumes +91 throughout. */}
                <input
                  type="text" value="+91" readOnly
                  style={{ ...inputStyle, textAlign: 'center', color: '#888' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="tel" inputMode="numeric" placeholder="TELEPHONE" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} style={inputStyle}
                />
              </div>
            </div>
          </div>

          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginBottom: 32, marginTop: 16 }}>
            We will send you an SMS to verify your phone number
          </p>

          {/* Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <input
              type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: '#000', cursor: 'pointer', flexShrink: 0 }}
            />
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000' }}>
              I accept the{' '}
              <Link href="/privacy" style={{ color: '#000', textDecoration: 'underline' }}>Privacy Policy</Link>
            </p>
          </div>

          {error && (
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#c00', marginBottom: 16 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: 260, height: 64, border: '1px solid #000', background: loading ? '#f5f5f5' : '#fff',
              fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400,
              letterSpacing: '0.12em', color: '#000', cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'SENDING CODE…' : 'CONTINUE'}
          </button>

          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginTop: 20 }}>
            Already have an account?{' '}
            <Link href="/account/login" style={{ color: '#000', textDecoration: 'underline' }}>Log in</Link>
          </p>

        </form>
      </div>
    </main>
  );
}
