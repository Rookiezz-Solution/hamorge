'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface WCOrder {
  id: number;
  total: string;
  line_items: { id: number; quantity: number }[];
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const isGuest = searchParams.get('guest') === '1';
  const [order, setOrder] = useState<WCOrder | null>(null);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/orders/${orderId}`)
      .then(r => r.json())
      .then(data => { if (data?.id) setOrder(data); })
      .catch(() => { /* summary is a nice-to-have — page still works without it */ });
  }, [orderId]);

  const itemCount = order?.line_items?.reduce((sum, i) => sum + i.quantity, 0) ?? null;
  const ordersHref = `/account/orders${orderId ? `?order=${orderId}${isGuest ? '&guest=1' : ''}` : ''}`;

  return (
    <main style={{ paddingTop: 'clamp(100px, 20vw, 160px)', minHeight: '100vh', background: '#fff' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 100, maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>

        {/* Checkmark */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%', border: '1px solid #000',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5">
            <path d="M4 12.5L9.5 18L20 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#999', marginBottom: 16 }}>
          ORDER CONFIRMED
        </p>

        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 500, letterSpacing: '0.01em', color: '#000', marginBottom: 20, lineHeight: 1.3 }}>
          Thank you for shopping with us
        </p>

        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(11px, 2.8vw, 13px)', color: '#555', lineHeight: 1.7, maxWidth: 420, margin: '0 auto' }}>
          Your order has been placed successfully. We ship within 24 hours, and you&apos;ll receive updates as it makes its way to you.
        </p>

        {orderId && (
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#000', marginTop: 32 }}>
            ORDER #{orderId}
          </p>
        )}

        {order && (
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888', marginTop: 6 }}>
            {itemCount} item{itemCount !== 1 ? 's' : ''} · ₹ {parseFloat(order.total).toFixed(2)}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '48px auto 0' }}>
          <Link
            href={ordersHref}
            style={{
              display: 'block', height: 52, lineHeight: '52px',
              background: '#fff', border: '1px solid #000',
              fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400,
              letterSpacing: '0.14em', color: '#000', textDecoration: 'none',
            }}
          >
            VIEW ORDER DETAILS
          </Link>
          <Link
            href="/shop"
            style={{
              display: 'block', height: 52, lineHeight: '52px',
              background: '#fff', border: '1px solid #000',
              fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400,
              letterSpacing: '0.14em', color: '#000', textDecoration: 'none',
            }}
          >
            CONTINUE SHOPPING
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }} />}>
      <OrderConfirmationContent />
    </Suspense>
  );
}
