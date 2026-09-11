'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface SavedAddress {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  createdAt?: number;
  lastUsedAt?: number;
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: 'none', borderBottom: '1px solid #000',
  fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000',
  padding: '8px 0', outline: 'none', background: 'transparent',
};

const inputErrStyle: React.CSSProperties = {
  ...inputStyle, borderBottom: '1px solid #c00',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)',
  letterSpacing: '0.10em', color: '#666', marginBottom: 8, display: 'block',
};

const errMsgStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter)', fontSize: 11, color: '#c00', marginTop: 4,
};

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '',
  address1: '', address2: '', city: '', state: '', postcode: '', country: 'IN',
};

function sortAddresses(list: SavedAddress[]): SavedAddress[] {
  return [...list].sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
}

export default function AddressPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchAddresses = useCallback(async (): Promise<SavedAddress[]> => {
    if (!user) return [];
    const params = new URLSearchParams();
    if (user.wcId) params.set('customerId', String(user.wcId));
    if (user.email) params.set('email', user.email);
    const res = await fetch(`/api/addresses?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.addresses) ? data.addresses : [];
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/checkout'); return; }
    let cancelled = false;
    (async () => {
      const list = sortAddresses(await fetchAddresses());
      if (cancelled) return;
      if (list.length === 0) {
        localStorage.removeItem('hamorge_pending_address');
        router.replace('/checkout');
        return;
      }
      setAddresses(list);
      setSelectedId(list[0].id);
      setLoadingAddresses(false);
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, fetchAddresses, router]);

  function validateField(field: string, value: string): string {
    switch (field) {
      case 'firstName': return value.trim() ? '' : 'Required';
      case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? '' : 'Enter a valid email address';
      case 'phone': return /^\d{10}$/.test(value.trim()) ? '' : 'Enter a valid 10-digit phone number';
      case 'address1': return value.trim() ? '' : 'Required';
      case 'city': return value.trim() ? '' : 'Required';
      case 'state': return value.trim() ? '' : 'Required';
      case 'postcode': return /^\d{6}$/.test(value.trim()) ? '' : 'Enter a valid 6-digit pincode';
      default: return '';
    }
  }

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field] !== undefined) {
      setErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
    }
  }

  function handleBlur(field: string) {
    setErrors(prev => ({ ...prev, [field]: validateField(field, form[field as keyof typeof form]) }));
  }

  function validateAll(): boolean {
    const fields = ['firstName', 'email', 'phone', 'address1', 'city', 'state', 'postcode'];
    const newErrors: Record<string, string> = {};
    let valid = true;
    for (const field of fields) {
      const err = validateField(field, form[field as keyof typeof form]);
      if (err) { newErrors[field] = err; valid = false; }
    }
    setErrors(newErrors);
    return valid;
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAll() || !user) return;
    setSaving(true);
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.wcId,
          email: user.email,
          address: form,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.newAddress) throw new Error(data.error || 'Could not save address');
      const list = sortAddresses(data.addresses ?? []);
      setAddresses(list);
      setSelectedId(data.newAddress.id);
      setForm(emptyForm);
      setErrors({});
      setShowForm(false);
      localStorage.setItem('hamorge_pending_address', JSON.stringify(data.newAddress));
      router.push('/checkout');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save address');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(addressId: string) {
    if (!user || !window.confirm('Remove this address?')) return;
    try {
      const res = await fetch('/api/addresses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.wcId,
          email: user.email,
          addressId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not delete address');
      const list = sortAddresses(data.addresses ?? []);
      setAddresses(list);
      if (list.length === 0) {
        localStorage.removeItem('hamorge_pending_address');
        router.replace('/checkout');
      } else if (selectedId === addressId) {
        setSelectedId(list[0].id);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete address');
    }
  }

  function handleContinue() {
    const addr = addresses.find(a => a.id === selectedId);
    if (!addr) return;
    localStorage.setItem('hamorge_pending_address', JSON.stringify(addr));
    router.push('/checkout');
  }

  if (authLoading || loadingAddresses) {
    return (
      <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
        <div style={{ paddingLeft: '4%', paddingRight: '4%' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#999', letterSpacing: '0.08em' }}>
            LOADING…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 60 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.08em', color: '#000' }}>
            CHECKOUT
          </p>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#000' }}>
            DELIVERY ADDRESS
          </p>
        </div>
        <div style={{ height: 1, background: '#ddd', marginBottom: 40 }} />

        {/* Saved address cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32, maxWidth: 600 }}>
          {addresses.map(addr => {
            const isSelected = addr.id === selectedId;
            return (
              <div
                key={addr.id}
                onClick={() => setSelectedId(addr.id)}
                style={{
                  border: isSelected ? '1.5px solid #000' : '1px solid #ddd',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Radio dot */}
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  border: isSelected ? '5px solid #000' : '1.5px solid #ccc',
                  boxSizing: 'border-box',
                }} />

                {/* Address text */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 500, color: '#000', marginBottom: 4, letterSpacing: '0.04em' }}>
                    {addr.firstName} {addr.lastName}
                  </p>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', lineHeight: 1.7 }}>
                    {addr.address1}{addr.address2 ? `, ${addr.address2}` : ''}<br />
                    {addr.city}{addr.state ? `, ${addr.state}` : ''} — {addr.postcode}
                  </p>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888', marginTop: 6 }}>
                    {addr.phone}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(addr.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 11, letterSpacing: '0.08em', color: '#aaa', padding: 0, flexShrink: 0 }}
                >
                  REMOVE
                </button>
              </div>
            );
          })}
        </div>

        {/* Add new address toggle */}
        <div style={{ maxWidth: 600, marginBottom: 40 }}>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: '1px solid #ddd', padding: '16px 20px', background: 'none', cursor: 'pointer',
            }}
          >
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#000' }}>
              + ADD A NEW ADDRESS
            </span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.8"
              style={{ transform: showForm ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showForm && (
            <form onSubmit={handleSaveAddress} style={{ border: '1px solid #ddd', borderTop: 'none', padding: '28px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>FIRST NAME *</label>
                  <input
                    style={errors.firstName ? inputErrStyle : inputStyle}
                    value={form.firstName}
                    onChange={e => set('firstName', e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                  />
                  {errors.firstName && <p style={errMsgStyle}>{errors.firstName}</p>}
                </div>
                <div>
                  <label style={labelStyle}>LAST NAME</label>
                  <input style={inputStyle} value={form.lastName} onChange={e => set('lastName', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>EMAIL *</label>
                  <input
                    type="email"
                    style={errors.email ? inputErrStyle : inputStyle}
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                  />
                  {errors.email && <p style={errMsgStyle}>{errors.email}</p>}
                </div>
                <div>
                  <label style={labelStyle}>PHONE *</label>
                  <input
                    type="tel" maxLength={10}
                    style={errors.phone ? inputErrStyle : inputStyle}
                    value={form.phone}
                    onChange={e => set('phone', e.target.value.replace(/\D/g, ''))}
                    onBlur={() => handleBlur('phone')}
                  />
                  {errors.phone && <p style={errMsgStyle}>{errors.phone}</p>}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>ADDRESS LINE 1 *</label>
                <input
                  style={errors.address1 ? inputErrStyle : inputStyle}
                  value={form.address1}
                  onChange={e => set('address1', e.target.value)}
                  onBlur={() => handleBlur('address1')}
                />
                {errors.address1 && <p style={errMsgStyle}>{errors.address1}</p>}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>ADDRESS LINE 2</label>
                <input style={inputStyle} value={form.address2} onChange={e => set('address2', e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
                <div>
                  <label style={labelStyle}>CITY *</label>
                  <input
                    style={errors.city ? inputErrStyle : inputStyle}
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    onBlur={() => handleBlur('city')}
                  />
                  {errors.city && <p style={errMsgStyle}>{errors.city}</p>}
                </div>
                <div>
                  <label style={labelStyle}>STATE *</label>
                  <input
                    style={errors.state ? inputErrStyle : inputStyle}
                    value={form.state}
                    onChange={e => set('state', e.target.value)}
                    onBlur={() => handleBlur('state')}
                  />
                  {errors.state && <p style={errMsgStyle}>{errors.state}</p>}
                </div>
                <div>
                  <label style={labelStyle}>PINCODE *</label>
                  <input
                    maxLength={6}
                    style={errors.postcode ? inputErrStyle : inputStyle}
                    value={form.postcode}
                    onChange={e => set('postcode', e.target.value.replace(/\D/g, ''))}
                    onBlur={() => handleBlur('postcode')}
                  />
                  {errors.postcode && <p style={errMsgStyle}>{errors.postcode}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%', height: 48, background: saving ? '#f5f5f5' : '#000',
                  border: 'none', fontFamily: 'var(--font-inter)', fontSize: 12,
                  letterSpacing: '0.14em', color: saving ? '#999' : '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'SAVING…' : 'SAVE & CONTINUE'}
              </button>
            </form>
          )}
        </div>

        {/* Continue button */}
        <div style={{ paddingTop: 24, maxWidth: 600 }}>
          <button
            onClick={handleContinue}
            disabled={!selectedId}
            style={{
              width: 220, height: 48, background: '#fff', border: '1px solid #000',
              fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400,
              letterSpacing: '0.14em', color: '#000', cursor: selectedId ? 'pointer' : 'not-allowed',
            }}
          >
            CONTINUE TO CHECKOUT
          </button>
        </div>

      </div>
    </main>
  );
}
