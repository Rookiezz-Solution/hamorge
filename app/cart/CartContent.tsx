'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useFavourites, FavItem } from '@/context/FavouritesContext';
import { useAuth } from '@/context/AuthContext';
import CheckoutGate from '@/components/CheckoutGate';
import YouMayBeInterestedIn from '@/components/YouMayBeInterestedIn';
import { trackViewCart } from '@/lib/analytics';

interface WCProduct {
  id: number;
  name: string;
  slug: string;
  price: string;
  images: { src: string }[];
  secondary_image?: { src: string } | null;
}

export default function CartContent({ suggested }: { suggested: WCProduct[] }) {
  const { items, itemCount, total, coupon, discount, payableTotal, removeItem, updateQuantity, applyCoupon, removeCoupon, applyFirstOrderDiscount } = useCart();
  const { favourites, toggle } = useFavourites();
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'bag' | 'favourites'>('bag');
  const [showGate, setShowGate] = useState(false);
  const [routing, setRouting] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // ViewCart — fire once, after the cart has hydrated from localStorage.
  const viewCartSent = useRef(false);
  useEffect(() => {
    if (viewCartSent.current || items.length === 0) return;
    viewCartSent.current = true;
    trackViewCart(
      items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, variant: i.size })),
      total,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Auto-apply the first-purchase discount for logged-in customers with no order
  // history — silent, and never overrides a coupon the customer already applied.
  useEffect(() => {
    if (user?.wcId && items.length > 0) {
      applyFirstOrderDiscount(user.wcId, user.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.wcId, items.length]);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    const err = await applyCoupon(couponInput.trim());
    setCouponLoading(false);
    if (err) { setCouponError(err); return; }
    setCouponInput('');
  }

  async function handleCheckout() {
    if (!user) {
      setShowGate(true);
      return;
    }
    setRouting(true);
    try {
      const params = new URLSearchParams();
      if (user.wcId) params.set('customerId', String(user.wcId));
      if (user.email) params.set('email', user.email);
      const res = await fetch(`/api/addresses?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      const hasSaved = Array.isArray(data.addresses) && data.addresses.length > 0;
      router.push(hasSaved ? '/address' : '/checkout');
    } catch {
      router.push('/checkout');
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em',
    background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 4px',
    fontWeight: active ? 700 : 400, color: '#000',
    borderBottom: active ? '1.5px solid #000' : '1.5px solid transparent',
  });

  const termsText = (
    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#555', lineHeight: 1.7, marginBottom: 16, maxWidth: 480 }}>
      By continuing, I declare that I have read and accept the{' '}
      <Link href="/terms" style={{ color: '#000', textDecoration: 'underline' }}>Terms and conditions</Link>
      {' '}and understand HAM ORGE&apos;s{' '}
      <Link href="/privacy" style={{ color: '#000', textDecoration: 'underline' }}>Privacy Policy.</Link>
    </p>
  );

  const couponRow = (
    <div style={{ marginBottom: 24, maxWidth: 420 }}>
      {coupon ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #000', padding: '12px 16px' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#000' }}>
            &ldquo;{coupon.code.toUpperCase()}&rdquo; APPLIED
          </p>
          <button
            onClick={removeCoupon}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', letterSpacing: '0.08em', color: '#888', textDecoration: 'underline', padding: 0 }}
          >
            REMOVE
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#666', marginBottom: 10 }}>
              ENTER YOUR COUPON CODE
            </p>
            <input
              value={couponInput}
              onChange={e => { setCouponInput(e.target.value); setCouponError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
              style={{ width: '100%', border: 'none', borderBottom: '1px solid #000', fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000', padding: '8px 0', outline: 'none', background: 'transparent' }}
            />
          </div>
          <button
            onClick={handleApplyCoupon}
            disabled={couponLoading || !couponInput.trim()}
            style={{ height: 44, padding: '0 28px', border: '1px solid #000', background: couponLoading ? '#f5f5f5' : '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', letterSpacing: '0.14em', color: couponLoading ? '#999' : '#000', cursor: couponLoading ? 'not-allowed' : 'pointer', flexShrink: 0 }}
          >
            {couponLoading ? '…' : 'APPLY'}
          </button>
        </div>
      )}
      {couponError && (
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#c00', marginTop: 8 }}>{couponError}</p>
      )}
    </div>
  );

  const continueRow = (
    <div style={{ marginBottom: 12 }}>
      {discount > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#666' }}>Subtotal</p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#666' }}>₹ {total.toFixed(2)}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#666' }}>Discount ({coupon?.code})</p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#c00' }}>− ₹ {discount.toFixed(2)}</p>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <button
          onClick={handleCheckout}
          disabled={routing}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 160, height: 44, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', letterSpacing: '0.14em', color: routing ? '#999' : '#000', cursor: routing ? 'not-allowed' : 'pointer', flexShrink: 0 }}
        >
          {routing ? '…' : 'CONTINUE'}
        </button>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 500, color: '#000' }}>₹ {payableTotal.toFixed(2)}</p>
      </div>
    </div>
  );

  const gstText = (
    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#888' }}>Including GST and shipping cost</p>
  );

  return (
    <>
    <main style={{ paddingTop: 'clamp(80px, 14vw, 100px)', minHeight: '100vh', background: '#fff', overflowX: 'hidden' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: tab === 'bag' && items.length > 0 ? 180 : 80 }}>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 40 }}>
          <button style={tabStyle(tab === 'bag')} onClick={() => setTab('bag')}>
            SHOPPING BAG {itemCount > 0 && `(${itemCount})`}
          </button>
          <button style={{ ...tabStyle(tab === 'favourites'), display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setTab('favourites')}>
            FAVORITES
            <svg width="12" height="14" viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M5 2h14a1 1 0 0 1 1 1v22l-8-5-8 5V3a1 1 0 0 1 1-1z" />
            </svg>
          </button>
        </div>

        {/* ── SHOPPING BAG ── */}
        {tab === 'bag' && (
          <>
            {items.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', letterSpacing: '0.06em', marginBottom: 80 }}>
                YOUR BAG IS EMPTY
              </p>
            ) : (
              <>
                {/* Item list */}
                <div style={{ marginBottom: 40 }}>
                  {items.map(item => (
                    <div key={item.key} style={{ display: 'flex', gap: 20, paddingBottom: 28, marginBottom: 28 }}>
                      <Link href={`/product/${item.slug}`} style={{ flexShrink: 0, display: 'block', width: 100, height: 140, overflow: 'hidden', position: 'relative' }} className="img-skeleton">
                        {(item.secondaryImage || item.image) && <Image src={item.secondaryImage || item.image} alt={item.name} fill style={{ objectFit: 'cover' }} sizes="100px" />}
                      </Link>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <Link href={`/product/${item.slug}`} style={{ textDecoration: 'none' }}>
                            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', letterSpacing: '0.06em', color: '#000', marginBottom: 4 }}>{item.name}</p>
                          </Link>
                          {item.size && <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#888', marginBottom: 8, letterSpacing: '0.04em' }}>{item.size}</p>}
                          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#000', marginBottom: 0 }}>₹ {(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0', height: 32 }}>
                            <button
                              onClick={() => updateQuantity(item.key, item.quantity - 1)}
                              style={{ width: 32, height: 32, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 16, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                              aria-label="Decrease quantity"
                            >−</button>
                            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#000', width: 28, textAlign: 'center', flexShrink: 0 }}>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.key, item.quantity + 1)}
                              style={{ width: 32, height: 32, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 16, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                              aria-label="Increase quantity"
                            >+</button>
                          </div>
                          <button onClick={() => removeItem(item.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', letterSpacing: '0.08em', color: '#888', padding: 0 }}>
                            DELETE
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile: coupon sits in the scrollable content, above the fixed bottom bar */}
                <div className="md:hidden">
                  {couponRow}
                </div>

                {/* Desktop: in-flow bottom section */}
                <div className="hidden md:block" style={{ paddingTop: 12 }}>
                  {couponRow}
                  {termsText}
                  {continueRow}
                  {gstText}
                </div>

              </>
            )}

            {/* You may be interested in — desktop only */}
            <div className="hidden md:block">
              <YouMayBeInterestedIn products={suggested} />
            </div>
          </>
        )}

        {/* ── FAVOURITES ── */}
        {tab === 'favourites' && (
          <>
            {favourites.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', letterSpacing: '0.06em' }}>YOU HAVE NO SAVED FAVOURITES</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
                {favourites.map((item: FavItem) => (
                  <div key={item.id}>
                    <Link href={`/product/${item.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                      <div className="img-skeleton" style={{ background: undefined, aspectRatio: '3/4', overflow: 'hidden', marginBottom: 10, position: 'relative' }}>
                        {(item.secondaryImage || item.image)
                          ? <Image src={item.secondaryImage || item.image} alt={item.name} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 44vw, 22vw" loading="lazy" />
                          : <div style={{ width: '100%', height: '100%', background: '#e8e4df' }} />}
                      </div>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', letterSpacing: '0.06em', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>
                        {item.name}
                      </p>
                      <button onClick={() => toggle(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                        <svg width="13" height="15" viewBox="0 0 24 28" fill="#000" stroke="#000" strokeWidth="1.4">
                          <path d="M5 2h14a1 1 0 0 1 1 1v22l-8-5-8 5V3a1 1 0 0 1 1-1z" />
                        </svg>
                      </button>
                    </div>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#000' }}>₹ {item.price}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      {showGate && <CheckoutGate onClose={() => setShowGate(false)} />}
    </main>

    {/* Mobile sticky bottom bar — outside <main> so iOS fixed positioning works */}
    {tab === 'bag' && items.length > 0 && (
      <div style={{ flexDirection: 'column', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#fff', padding: '12px 4%', borderTop: '1px solid #eee' }}
        className="flex md:hidden">
        {termsText}
        {continueRow}
        {gstText}
      </div>
    )}
    </>
  );
}
