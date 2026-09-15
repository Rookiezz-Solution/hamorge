'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  wcId?: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (data: RegisterData) => Promise<string | null>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<string | null>;
  sendLoginOtp: (phone: string) => Promise<string | null>;
  verifyLoginOtp: (phone: string, otp: string) => Promise<string | null>;
  sendRegisterOtp: (email: string) => Promise<string | null>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  /** The code sent to `email` via sendRegisterOtp — the backend re-verifies
   *  it before creating the account. Interim: verifies by email rather than
   *  phone while MSG91's DLT registration is pending; required whenever
   *  `phone` is non-empty, omit both together (e.g. the CheckoutGate
   *  quick-registration path, which never collects a phone). */
  otp?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('hamorge_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setLoading(false);
  }, []);

  async function login(email: string, password: string): Promise<string | null> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? 'Login failed.';
    setUser(data);
    localStorage.setItem('hamorge_user', JSON.stringify(data));
    return null;
  }

  async function register(form: RegisterData): Promise<string | null> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? 'Registration failed.';
    setUser(data);
    localStorage.setItem('hamorge_user', JSON.stringify(data));
    return null;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('hamorge_user');
  }

  async function forgotPassword(email: string): Promise<string | null> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? 'Failed to send reset email.';
    return null;
  }

  async function sendLoginOtp(phone: string): Promise<string | null> {
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? 'Could not send OTP.';
    return null;
  }

  async function verifyLoginOtp(phone: string, otp: string): Promise<string | null> {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? 'Invalid or expired OTP.';
    setUser(data);
    localStorage.setItem('hamorge_user', JSON.stringify(data));
    return null;
  }

  async function sendRegisterOtp(email: string): Promise<string | null> {
    const res = await fetch('/api/auth/register-otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? 'Could not send the code.';
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, forgotPassword, sendLoginOtp, verifyLoginOtp, sendRegisterOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
