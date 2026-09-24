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
  login: (identifier: string, password: string) => Promise<string | null>;
  register: (data: RegisterData) => Promise<string | null>;
  logout: () => void;
  sendRegisterOtp: (phone: string) => Promise<{ token: string | null; error: string | null }>;
  sendForgotPasswordOtp: (phone: string) => Promise<{ token: string | null; error: string | null }>;
  resetPassword: (phone: string, otp: string, otpToken: string, password: string) => Promise<string | null>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  /** The code sent to `phone` via sendRegisterOtp, plus the token it
   *  returned — the backend re-verifies both before creating the account.
   *  Required whenever `phone` is non-empty; omit all three together (e.g.
   *  the CheckoutGate quick-registration path, which never collects a
   *  phone). */
  otp?: string;
  otpToken?: string;
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

  async function login(identifier: string, password: string): Promise<string | null> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
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

  async function sendRegisterOtp(phone: string): Promise<{ token: string | null; error: string | null }> {
    const res = await fetch('/api/auth/whatsapp-otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) return { token: null, error: data.error ?? 'Could not send the code.' };
    return { token: data.token, error: null };
  }

  async function sendForgotPasswordOtp(phone: string): Promise<{ token: string | null; error: string | null }> {
    const res = await fetch('/api/auth/forgot-password/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) return { token: null, error: data.error ?? 'Could not send the code.' };
    return { token: data.token, error: null };
  }

  async function resetPassword(phone: string, otp: string, otpToken: string, password: string): Promise<string | null> {
    const res = await fetch('/api/auth/forgot-password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, otpToken, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? 'Could not reset the password.';
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, sendRegisterOtp, sendForgotPasswordOtp, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
