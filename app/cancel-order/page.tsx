'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface OrderState {
  id: number;
  status: string;
  total: string;
  prepaid: boolean;
  items: { name: string; quantity: number; size: string | null }[];
  canCancel: boolean;
  reason: 'already-cancelled' | 'not-cancellable' | 'shipped' | null;
}

const label = { fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#999' } as const;
const body = { fontFamily: 'var(--font-inter)', fontSize: 'clamp(11px, 2.8vw, 13px)', color: '#555', lineHeight: 1.7 } as const;
const button = {
  display: 'block', width: '100%', height: 52, lineHeight: '50px', textAlign: 'center' as const,
  background: '#fff', border: '1px solid #000', fontFamily: 'var(--font-inter)',
  fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.14em', color: '#000', textDecoration: 'none',
};

function CancelOrderContent() {
  const params = useSearchParams();
  const orderId = params.get('order');
  const key = params.get('key');

  const [state, setState] = useState<OrderState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!orderId || !key) { setError('This cancellation link is incomplete.'); setLoading(false); return; }
    fetch(`/api/orders/cancel?order=${encodeURIComponent(orderId)}&key=${encodeURIComponent(key)}`)
      .then(async r => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error ?? 'We could not find this order.');
        setState(data);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [orderId, key]);

  async function cancel() {
    setWorking(true);
    setError('');
    try {
      const r = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderId, key }),
      });
      const data = await r.json().catch(() => null);
      if (data?.id) setState(data);
      if (!r.ok) setError(data?.error ?? 'Could not cancel the order. Please contact us.');
    } catch {
      setError('Could not cancel the order. Please try again.');
    } finally {
      setWorking(false);
    }
  }

  const cancelled = state?.reason === 'already-cancelled';

  return (
    <main style={{ paddingTop: 'clamp(100px, 20vw, 160px)', minHeight: '100vh', background: '#fff' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 100, maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>

        {loading && <p style={label}>LOADING YOUR ORDER…</p>}

        {!loading && !state && (
          <>
            <p style={{ ...label, marginBottom: 16 }}>CANCEL ORDER</p>
            <p style={{ ...body, marginBottom: 40 }}>{error}</p>
            <Link href="/contact" style={{ ...button, maxWidth: 320, margin: '0 auto' }}>CONTACT US</Link>
          </>
        )}

        {state && (
          <>
            <p style={{ ...label, marginBottom: 16 }}>{cancelled ? 'ORDER CANCELLED' : 'CANCEL ORDER'}</p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 500, color: '#000', marginBottom: 20, lineHeight: 1.3 }}>
              {cancelled ? 'Your order has been cancelled' : state.canCancel ? 'Do you want to cancel this order?' : 'This order can’t be cancelled online'}
            </p>

            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#000', marginTop: 28 }}>
              ORDER #{state.id}
            </p>
            <div style={{ margin: '12px 0 0' }}>
              {state.items.map((i, n) => (
                <p key={n} style={{ ...body, color: '#444' }}>
                  {i.name}{i.size && !i.name.endsWith(`- ${i.size}`) ? ` · ${i.size}` : ''} · Qty {i.quantity}
                </p>
              ))}
              <p style={{ ...body, color: '#888', marginTop: 4 }}>₹ {parseFloat(state.total).toFixed(2)}</p>
            </div>

            {cancelled && (
              <p style={{ ...body, maxWidth: 420, margin: '28px auto 0' }}>
                {state.prepaid
                  ? 'Your payment will be refunded to your original payment method within 3–7 working days.'
                  : 'You chose Cash on Delivery, so nothing was charged and there is nothing to refund.'}
              </p>
            )}

            {!cancelled && !state.canCancel && (
              <p style={{ ...body, maxWidth: 420, margin: '28px auto 0' }}>
                {state.reason === 'shipped'
                  ? 'Your order has already been shipped. Please contact us and we will do our best to help.'
                  : 'This order can no longer be cancelled online. Please contact us if you need help.'}
              </p>
            )}

            {error && <p style={{ ...body, color: '#c00', marginTop: 20 }}>{error}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '48px auto 0' }}>
              {state.canCancel && (
                <button
                  onClick={cancel}
                  disabled={working}
                  style={{ ...button, cursor: working ? 'not-allowed' : 'pointer', background: working ? '#f5f5f5' : '#fff' }}
                >
                  {working ? 'CANCELLING…' : 'YES, CANCEL MY ORDER'}
                </button>
              )}
              {!cancelled && !state.canCancel && <Link href="/contact" style={button}>CONTACT US</Link>}
              <Link href="/shop" style={button}>CONTINUE SHOPPING</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function CancelOrderPage() {
  return (
    <Suspense fallback={<main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }} />}>
      <CancelOrderContent />
    </Suspense>
  );
}
