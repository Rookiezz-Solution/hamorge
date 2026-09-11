'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import CheckoutGate from '@/components/CheckoutGate';
import { newEventId, trackInitiateCheckout, trackAddPaymentInfo, trackPurchase, TrackedItem, TrackedUser } from '@/lib/analytics';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: 'none', borderBottom: '1px solid #000',
  fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000',
  padding: '8px 0', outline: 'none', background: 'transparent',
};

const inputErrStyle: React.CSSProperties = {
  width: '100%', border: 'none', borderBottom: '1px solid #c00',
  fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000',
  padding: '8px 0', outline: 'none', background: 'transparent',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em',
  color: '#666', marginBottom: 8, display: 'block',
};

const errMsgStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter)', fontSize: 11, color: '#c00', marginTop: 4,
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) { resolve(true); return; }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGuest = searchParams.get('guest') === '1';
  const { items, total, coupon, discount, payableTotal, clearCart, applyFirstOrderDiscount } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [showGate, setShowGate] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isFirstTimeAddress, setIsFirstTimeAddress] = useState(false);

  useEffect(() => {
    if (!authLoading && !user && !isGuest) setShowGate(true);
  }, [authLoading, user, isGuest]);

  // Fallback for logged-in customers who land on checkout without visiting the cart
  // page first (the cart page already does this for the normal flow).
  useEffect(() => {
    if (user?.wcId && items.length > 0) {
      applyFirstOrderDiscount(user.wcId, user.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.wcId, items.length]);

  // Preload Razorpay script so it's ready when the user clicks Place Order
  useEffect(() => { loadRazorpayScript(); }, []);

  // Analytics view of the cart — shared by InitiateCheckout, AddPaymentInfo and Purchase.
  function trackedItems(): TrackedItem[] {
    return items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, variant: i.size }));
  }

  // Sent to our own /api/events, which hashes it before it reaches Meta.
  // Better matching = more conversions attributed to the right ad.
  function trackedUser(): TrackedUser {
    return {
      email: form.email, phone: form.phone,
      firstName: form.firstName, lastName: form.lastName,
      city: form.city, state: form.state, zip: form.postcode, country: form.country,
      externalId: user?.wcId ?? undefined,
    };
  }

  // InitiateCheckout — once per visit to this page, after the cart hydrates.
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (checkoutTracked.current || items.length === 0) return;
    checkoutTracked.current = true;
    trackInitiateCheckout(trackedItems(), payableTotal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address1: '', address2: '', city: '', state: '', postcode: '',
    country: 'IN', paymentMethod: 'razorpay',
  });

  // Pre-fill the form. For logged-in users:
  //  - If a pre-selected address exists in localStorage (from /address page), jump to payment.
  //  - Else, ask the server if they have saved addresses. If yes, redirect to /address.
  //  - Else, treat as first-time customer.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const stored = localStorage.getItem('hamorge_pending_address');
      if (stored) {
        try {
          const addr = JSON.parse(stored);
          setForm(prev => ({
            ...prev,
            firstName: addr.firstName || user.firstName || '',
            lastName: addr.lastName || user.lastName || '',
            email: user.email || '',
            phone: addr.phone || '',
            address1: addr.address1 || '',
            address2: addr.address2 || '',
            city: addr.city || '',
            state: addr.state || '',
            postcode: addr.postcode || '',
            country: addr.country || 'IN',
          }));
          setStep(2);
          return;
        } catch { /* fall through */ }
      }

      // No pending address — check server for saved addresses.
      try {
        const params = new URLSearchParams();
        if (user.wcId) params.set('customerId', String(user.wcId));
        if (user.email) params.set('email', user.email);
        const res = await fetch(`/api/addresses?${params.toString()}`, { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.addresses) && data.addresses.length > 0) {
          router.replace('/address');
          return;
        }
      } catch { /* treat as first-time on error */ }

      if (cancelled) return;
      setIsFirstTimeAddress(true);
      setForm(prev => ({
        ...prev,
        firstName: prev.firstName || user.firstName || '',
        lastName: prev.lastName || user.lastName || '',
        email: prev.email || user.email || '',
      }));
    })();
    return () => { cancelled = true; };
  }, [user, router]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateField(field: string, value: string): string {
    switch (field) {
      case 'firstName':
      case 'lastName':
        return value.trim() ? '' : 'Required';
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? '' : 'Enter a valid email address';
      case 'phone':
        return /^\d{10}$/.test(value.trim()) ? '' : 'Enter a valid 10-digit phone number';
      case 'address1':
        return value.trim() ? '' : 'Required';
      case 'city':
        return value.trim() ? '' : 'Required';
      case 'state':
        return value.trim() ? '' : 'Required';
      case 'postcode':
        return /^\d{6}$/.test(value.trim()) ? '' : 'Enter a valid 6-digit pincode';
      default:
        return '';
    }
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field] !== undefined) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    }
  }

  function handleBlur(field: string) {
    const err = validateField(field, form[field as keyof typeof form] as string);
    setErrors((prev) => ({ ...prev, [field]: err }));
  }

  function validateAll(): boolean {
    const fields = ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'state', 'postcode'];
    const newErrors: Record<string, string> = {};
    let valid = true;
    for (const field of fields) {
      const err = validateField(field, form[field as keyof typeof form] as string);
      if (err) { newErrors[field] = err; valid = false; }
    }
    setErrors(newErrors);
    return valid;
  }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;
    if (!user) applyFirstOrderDiscount(undefined, form.email);
    trackAddPaymentInfo(trackedItems(), payableTotal, trackedUser());
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildOrderPayload(paymentMethod: string) {
    return {
      payment_method: paymentMethod,
      payment_method_title: paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay',
      set_paid: false,
      ...(user?.wcId ? { customer_id: user.wcId } : {}),
      billing: {
        first_name: form.firstName,
        last_name: form.lastName,
        address_1: form.address1,
        address_2: form.address2,
        city: form.city,
        state: form.state,
        postcode: form.postcode,
        country: form.country,
        email: form.email,
        phone: form.phone,
      },
      shipping: {
        first_name: form.firstName,
        last_name: form.lastName,
        address_1: form.address1,
        address_2: form.address2,
        city: form.city,
        state: form.state,
        postcode: form.postcode,
        country: form.country,
      },
      line_items: items.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        meta_data: item.size ? [{ key: 'Size', value: item.size }] : [],
      })),
      ...(coupon ? { coupon_lines: [{ code: coupon.code }] } : {}),
    };
  }

  async function saveAddressAfterOrder() {
    const pendingRaw = localStorage.getItem('hamorge_pending_address');
    localStorage.removeItem('hamorge_pending_address');
    if (!user?.email) return;
    try {
      if (isFirstTimeAddress) {
        await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: user.wcId,
            email: user.email,
            address: {
              firstName: form.firstName,
              lastName: form.lastName,
              phone: form.phone,
              address1: form.address1,
              address2: form.address2,
              city: form.city,
              state: form.state,
              postcode: form.postcode,
              country: form.country,
            },
          }),
        });
      } else if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        if (pending?.id) {
          await fetch('/api/addresses', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: user.wcId,
              email: user.email,
              addressId: pending.id,
            }),
          });
        }
      }
    } catch { /* non-blocking */ }
  }

  async function handleCodSubmit() {
    // One id, two halves: the server fires the Meta Purchase from the order route
    // and the browser fires its twin below. Meta collapses them into one conversion.
    const metaEventId = newEventId();
    const purchaseItems = trackedItems();
    const purchaseValue = payableTotal;

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...buildOrderPayload('cod'), metaEventId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? 'Order failed');
    trackPurchase({
      eventId: metaEventId,
      orderId: data.id,
      items: purchaseItems,
      value: purchaseValue,
      coupon: coupon?.code,
    });
    await saveAddressAfterOrder();
    clearCart();
    router.push(`/order-confirmation?order=${data.id}${isGuest ? '&guest=1' : ''}`);
  }

  async function handleRazorpaySubmit() {
    // Captured before payment opens — the cart is cleared by the time it succeeds.
    const metaEventId = newEventId();
    const purchaseItems = trackedItems();
    const purchaseValue = payableTotal;
    const purchaseCoupon = coupon?.code;

    const loaded = await loadRazorpayScript();
    if (!loaded) throw new Error('Could not load payment gateway. Please try again.');

    // Create Razorpay order — send item IDs so server calculates the real total
    const rzpRes = await fetch('/api/razorpay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        line_items: items.map(i => ({ product_id: i.id, quantity: i.quantity, size: i.size })),
        ...(coupon ? { coupon: coupon.code } : {}),
      }),
    });
    if (!rzpRes.ok) {
      const errData = await rzpRes.json().catch(() => null);
      throw new Error(errData?.error ?? 'Could not initiate payment. Please try again.');
    }
    const rzpOrder = await rzpRes.json();

    return new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: rzpOrder.key_id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: 'Hamorge',
        description: `Order — ${items.length} item${items.length !== 1 ? 's' : ''}`,
        image: 'https://hamorge.com/logo.png',
        order_id: rzpOrder.id,
        prefill: {
          name: `${form.firstName} ${form.lastName}`,
          email: form.email,
          contact: form.phone,
        },
        theme: { color: '#000000' },
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderPayload: buildOrderPayload('razorpay'),
                metaEventId,
              }),
            });
            const order = await verifyRes.json();
            if (!verifyRes.ok) { reject(new Error(order.message ?? 'Payment verification failed')); return; }
            trackPurchase({
              eventId: metaEventId,
              orderId: order.id,
              items: purchaseItems,
              value: purchaseValue,
              coupon: purchaseCoupon,
            });
            await saveAddressAfterOrder();
            clearCart();
            router.push(`/order-confirmation?order=${order.id}${isGuest ? '&guest=1' : ''}`);
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled')),
        },
      });
      rzp.open();
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (form.paymentMethod === 'cod') {
        await handleCodSubmit();
      } else {
        await handleRazorpaySubmit();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      if (msg !== 'Payment cancelled') setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>

      {/* Processing overlay */}
      {submitting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(3px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
        }}>
          <div style={{
            width: 32, height: 32, border: '2px solid #e0e0e0',
            borderTop: '2px solid #000', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.12em', color: '#000' }}>
            {form.paymentMethod === 'cod' ? 'PLACING ORDER…' : 'PROCESSING PAYMENT…'}
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>

        {/* Title + step indicator */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.08em', color: '#000' }}>
            CHECKOUT
          </p>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#999' }}>
            <span style={{ color: step === 1 ? '#000' : '#999' }}>01 DELIVERY</span>
            {' '}—{' '}
            <span style={{ color: step === 2 ? '#000' : '#999' }}>02 PAYMENT</span>
          </p>
        </div>
        <div style={{ height: 1, background: '#ddd', marginBottom: 48 }} />

        {/* ── STEP 1: Delivery ── */}
        {step === 1 && (
          <form onSubmit={handleStep1}>
            <div style={{ maxWidth: 600 }}>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, letterSpacing: '0.12em', color: '#000', marginBottom: 28 }}>
                CONTACT INFORMATION
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>FIRST NAME *</label>
                  <input style={errors.firstName ? inputErrStyle : inputStyle} value={form.firstName} onChange={e => set('firstName', e.target.value)} onBlur={() => handleBlur('firstName')} />
                  {errors.firstName && <p style={errMsgStyle}>{errors.firstName}</p>}
                </div>
                <div>
                  <label style={labelStyle}>LAST NAME *</label>
                  <input style={errors.lastName ? inputErrStyle : inputStyle} value={form.lastName} onChange={e => set('lastName', e.target.value)} onBlur={() => handleBlur('lastName')} />
                  {errors.lastName && <p style={errMsgStyle}>{errors.lastName}</p>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>EMAIL *</label>
                  <input type="email" style={errors.email ? inputErrStyle : inputStyle} value={form.email} onChange={e => set('email', e.target.value)} onBlur={() => handleBlur('email')} />
                  {errors.email && <p style={errMsgStyle}>{errors.email}</p>}
                </div>
                <div>
                  <label style={labelStyle}>PHONE *</label>
                  <input type="tel" maxLength={10} style={errors.phone ? inputErrStyle : inputStyle} value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} onBlur={() => handleBlur('phone')} />
                  {errors.phone && <p style={errMsgStyle}>{errors.phone}</p>}
                </div>
              </div>

              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, letterSpacing: '0.12em', color: '#000', marginBottom: 28, marginTop: 40 }}>
                SHIPPING ADDRESS
              </p>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>ADDRESS LINE 1 *</label>
                <input style={errors.address1 ? inputErrStyle : inputStyle} value={form.address1} onChange={e => set('address1', e.target.value)} onBlur={() => handleBlur('address1')} />
                {errors.address1 && <p style={errMsgStyle}>{errors.address1}</p>}
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>ADDRESS LINE 2</label>
                <input style={inputStyle} value={form.address2} onChange={e => set('address2', e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>CITY *</label>
                  <input style={errors.city ? inputErrStyle : inputStyle} value={form.city} onChange={e => set('city', e.target.value)} onBlur={() => handleBlur('city')} />
                  {errors.city && <p style={errMsgStyle}>{errors.city}</p>}
                </div>
                <div>
                  <label style={labelStyle}>STATE *</label>
                  <input style={errors.state ? inputErrStyle : inputStyle} value={form.state} onChange={e => set('state', e.target.value)} onBlur={() => handleBlur('state')} />
                  {errors.state && <p style={errMsgStyle}>{errors.state}</p>}
                </div>
                <div>
                  <label style={labelStyle}>PINCODE *</label>
                  <input maxLength={6} style={errors.postcode ? inputErrStyle : inputStyle} value={form.postcode} onChange={e => set('postcode', e.target.value.replace(/\D/g, ''))} onBlur={() => handleBlur('postcode')} />
                  {errors.postcode && <p style={errMsgStyle}>{errors.postcode}</p>}
                </div>
              </div>
            </div>

            {/* Bottom row: CONTINUE left, total right, GST below */}
            <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #ddd' }}>
              {discount > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888' }}>Subtotal</p>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888' }}>₹ {total.toFixed(2)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888' }}>Discount ({coupon?.code})</p>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#c00' }}>− ₹ {discount.toFixed(2)}</p>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                <button
                  type="submit"
                  style={{
                    width: 220, height: 48,
                    background: '#fff', border: '1px solid #000',
                    fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400,
                    letterSpacing: '0.14em', color: '#000', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  CONTINUE
                </button>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 500, color: '#000' }}>₹ {payableTotal.toFixed(2)}</p>
              </div>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888' }}>Including GST and shipping cost</p>
            </div>
          </form>
        )}

        {/* ── STEP 2: Payment ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div style={{ maxWidth: 680 }}>

              {/* Product thumbnails */}
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#999', marginBottom: 12 }}>
                {items.length} {items.length === 1 ? 'product' : 'products'}
              </p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 40, overflowX: 'auto', paddingBottom: 4 }}>
                {items.map((item) => (
                  <div key={item.key} className="img-skeleton" style={{ width: 140, height: 175, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                    {(item.secondaryImage || item.image) && (
                      <Image src={item.secondaryImage || item.image} alt={item.name} fill style={{ objectFit: 'cover' }} sizes="140px" />
                    )}
                  </div>
                ))}
              </div>

              {/* Delivery address */}
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, letterSpacing: '0.12em', color: '#000' }}>
                    DELIVERY ADDRESS
                  </p>
                  <button
                    type="button"
                    onClick={() => isFirstTimeAddress ? setStep(1) : router.push('/address')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#666', textDecoration: 'underline', padding: 0 }}
                  >
                    CHANGE
                  </button>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '16px 20px' }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', marginBottom: 6, fontWeight: 500 }}>
                    {form.firstName} {form.lastName}
                  </p>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', lineHeight: 1.7 }}>
                    {form.address1}{form.address2 ? `, ${form.address2}` : ''}<br />
                    {form.city}{form.state ? `, ${form.state}` : ''} — {form.postcode}
                  </p>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888', marginTop: 8 }}>
                    {form.email} · {form.phone}
                  </p>
                </div>
              </div>

              {/* Payment method */}
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, letterSpacing: '0.12em', color: '#000', marginBottom: 24 }}>
                CHOOSE A PAYMENT METHOD
              </p>

              {/* Online Payment via Razorpay */}
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#555', marginBottom: 16 }}>
                  ONLINE PAYMENT
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="payment"
                    value="razorpay"
                    checked={form.paymentMethod === 'razorpay'}
                    onChange={() => set('paymentMethod', 'razorpay')}
                    style={{ accentColor: '#000' }}
                  />
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000' }}>
                    UPI / Card / Net Banking
                  </span>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888', marginLeft: 'auto' }}>
                    Secured by Razorpay
                  </span>
                </label>
              </div>

              {/* Cash on delivery */}
              <div style={{ marginBottom: 40 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#555', marginBottom: 16 }}>
                  OTHER
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={form.paymentMethod === 'cod'}
                    onChange={() => set('paymentMethod', 'cod')}
                    style={{ accentColor: '#000' }}
                  />
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000' }}>Cash on Delivery</span>
                </label>
              </div>

              {error && (
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: 'red', marginBottom: 16 }}>{error}</p>
              )}

              {/* Bottom: pay button, GST below */}
              <div style={{ paddingTop: 24, borderTop: '1px solid #ddd' }}>
                {discount > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888' }}>Subtotal</p>
                      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888' }}>₹ {total.toFixed(2)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888' }}>Discount ({coupon?.code})</p>
                      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#c00' }}>− ₹ {discount.toFixed(2)}</p>
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting || items.length === 0}
                  style={{
                    width: 220, height: 48,
                    background: '#fff', border: '1px solid #000',
                    fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400,
                    letterSpacing: '0.14em', color: submitting ? '#999' : '#000', cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {form.paymentMethod === 'cod' ? 'PLACE ORDER' : `PAY ₹ ${payableTotal.toFixed(2)}`}
                </button>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888', marginTop: 12 }}>Including GST and shipping</p>
              </div>

            </div>
          </form>
        )}

      </div>

      {showGate && (
        <CheckoutGate
          onClose={() => setShowGate(false)}
          onGuest={() => { setShowGate(false); router.replace('/checkout?guest=1'); }}
          onAuth={() => setShowGate(false)}
        />
      )}
    </main>
  );
}

export default function CheckoutPageWrapper() {
  return (
    <Suspense fallback={<main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }} />}>
      <CheckoutPage />
    </Suspense>
  );
}
