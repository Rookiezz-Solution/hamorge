'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import CheckoutGate from '@/components/CheckoutGate';

interface LineItem {
  id: number;
  name: string;
  product_id: number;
  quantity: number;
  total: string;
  total_tax: string;
  image?: { id: number; src: string };
}

interface WCOrder {
  id: number;
  status: string;
  date_created: string;
  total: string;
  line_items: LineItem[];
  meta_data: { key: string; value: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'ORDER PLACED',
  'on-hold': 'ORDER PLACED',
  processing: 'ORDER CONFIRMED',
  shipped: 'ORDER SHIPPED',
  'out-for-delivery': 'OUT FOR DELIVERY',
  completed: 'ORDER DELIVERED',
  cancelled: 'ORDER CANCELLED',
  refunded: 'ORDER REFUNDED',
  failed: 'ORDER FAILED',
};

const STATUS_DESC: Record<string, string> = {
  pending: 'Your order has been placed and is awaiting payment.',
  'on-hold': 'Your order has been placed and is awaiting confirmation.',
  processing: 'Your order is confirmed. We ship our orders within 24 hours.',
  shipped: 'Your order is on its way!',
  'out-for-delivery': 'Your order will be delivered today.',
  completed: 'Your order has been delivered.',
  cancelled: 'Your order has been cancelled.',
  refunded: 'Your order has been refunded.',
  failed: 'Payment failed. Please try again.',
};

const RETURN_REASONS = [
  'Received a damaged or defective item.',
  'The size is not fitting',
  'The product delivered is wrong (different design/colour)',
  'Other',
];

function getTracking(meta: { key: string; value: string }[]): string | null {
  const keys = ['awb', 'track_url', '_shiprocket_awb_code', '_shiprocket_tracking_id', 'awb_code', 'tracking_id', 'shiprocket_awb'];
  for (const k of keys) {
    const found = meta.find(m => m.key === k);
    if (found?.value) return found.value;
  }
  return null;
}

// Mobile breakpoint detection (matches the 768px convention used across the site)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}


// ── RETURN PANEL ─────────────────────────────────────────────────
function ReturnPanel({ order, onClose }: { order: WCOrder; onClose: () => void }) {
  const isMobile = useIsMobile();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReturn() {
    if (!reason) return;
    setSubmitting(true);
    await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'refunded', customer_note: `Return: ${reason}. ${note}`.trim() }),
    });
    setDone(true);
    setSubmitting(false);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301, background: '#fff', padding: '40px 5%', maxHeight: '65vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 24, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 20, color: '#000', lineHeight: 1, padding: 0 }}>×</button>
        {done ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 700, letterSpacing: '0.08em', color: '#000', marginBottom: 12 }}>RETURN REQUESTED</p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555' }}>Our team will contact you shortly.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 24 : 56 }}>
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 700, letterSpacing: '0.10em', color: '#000', marginBottom: 24 }}>RETURN</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                {RETURN_REASONS.map(r => (
                  <label key={r} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                    <input type="radio" name="return-reason" checked={reason === r} onChange={() => setReason(r)} style={{ marginTop: 2, accentColor: '#000' }} />
                    <span style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000' }}>{r}</span>
                  </label>
                ))}
              </div>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888', marginBottom: 24 }}>
                The pickup address will be the same as the delivery address
              </p>
              <button
                onClick={handleReturn}
                disabled={!reason || submitting}
                style={{ width: '100%', height: 48, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.14em', color: reason ? '#000' : '#bbb', cursor: reason ? 'pointer' : 'not-allowed' }}
              >
                {submitting ? 'SUBMITTING...' : 'RETURN'}
              </button>
            </div>
            <div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Additional details (optional)"
                style={{ width: '100%', height: 220, border: '1px solid #ddd', padding: 16, fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000', resize: 'none', outline: 'none', background: '#fff' }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── ORDER DETAIL ─────────────────────────────────────────────────
function OrderDetail({ order, onBack }: { order: WCOrder; onBack: () => void }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [showReturn, setShowReturn] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  const label = STATUS_LABEL[currentStatus] ?? currentStatus.toUpperCase();
  const desc = STATUS_DESC[currentStatus] ?? '';
  const isDelivered = currentStatus === 'completed';
  const canCancel = currentStatus === 'processing' || currentStatus === 'pending' || currentStatus === 'on-hold';
  const tracking = getTracking(order.meta_data ?? []);
  const trackingPending = !tracking && !['cancelled', 'refunded', 'failed', 'completed'].includes(currentStatus);

  async function handleReview() {
    if (!rating) return;
    setSubmittingReview(true);
    const productId = order.line_items[0]?.product_id;
    if (productId) {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          rating,
          review: reviewText,
          reviewer: user?.email?.split('@')[0] || 'Customer',
          reviewer_email: user?.email || 'customer@hamorge.com',
        }),
      });
    }
    setReviewDone(true);
    setSubmittingReview(false);
  }

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#888', padding: 0, marginBottom: 28 }}
      >
        ← ORDERS
      </button>

      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#999', marginBottom: 12 }}>ORDERS DETAILS</p>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 700, letterSpacing: '0.08em', color: '#000', marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginBottom: tracking || trackingPending ? 20 : 32 }}>{desc}</p>

      {tracking && (
        <a
          href={tracking.startsWith('http') ? tracking : `https://shiprocket.co/tracking/${tracking}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #000', padding: '10px 24px', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.12em', color: '#000', textDecoration: 'none', marginBottom: 32 }}
        >
          TRACK SHIPMENT →
        </a>
      )}

      {trackingPending && (
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.04em', color: '#999', marginBottom: 32 }}>
          Tracking will be available once your order is shipped.
        </p>
      )}

      {/* Product rows + review (2-col for delivered on desktop, stacked on mobile) */}
      <div style={{ display: isDelivered && !isMobile ? 'grid' : 'block', gridTemplateColumns: isDelivered && !isMobile ? '1fr 1fr' : undefined, gap: isDelivered && !isMobile ? 48 : undefined }}>

        {/* Left: items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {order.line_items.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ width: 130, height: 200, background: '#f0ede8', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                {item.image?.src && <Image src={item.image.src} alt={item.name} fill style={{ objectFit: 'cover' }} sizes="130px" />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.06em', color: '#000', marginBottom: 6 }}>{item.name}</p>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', marginBottom: isDelivered ? 14 : 0 }}>₹ {(parseFloat(item.total) + parseFloat(item.total_tax || '0')).toFixed(2)}</p>
                {isDelivered && (
                  <button
                    onClick={() => setShowReturn(true)}
                    style={{ height: 36, padding: '0 20px', border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.12em', color: '#000', cursor: 'pointer' }}
                  >
                    RETURN
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right: review (delivered only) — stacks below product on mobile */}
        {isDelivered && (
          <div style={{ marginTop: isMobile ? 32 : 0 }}>
            {reviewDone ? (
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888', paddingTop: 8 }}>Thank you for your review!</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#000' }}>REVIEW</p>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <button
                        key={i}
                        onMouseEnter={() => setHoverRating(i)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill={(hoverRating || rating) >= i ? '#000' : 'none'} stroke="#000" strokeWidth="1.2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  style={{ width: '100%', height: 200, border: '1px solid #ddd', padding: 12, fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000', resize: 'none', outline: 'none', background: '#fff', display: 'block' }}
                />
                <button
                  onClick={handleReview}
                  disabled={!rating || submittingReview}
                  style={{ marginTop: 16, width: isMobile ? '100%' : 160, height: 44, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.14em', color: rating ? '#000' : '#bbb', cursor: rating ? 'pointer' : 'not-allowed' }}
                >
                  {submittingReview ? 'SUBMITTING...' : 'SUBMIT'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Cancel section */}
      {canCancel && (
        <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #eee' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888', marginBottom: 20, letterSpacing: '0.04em' }}>
            Cancellation is only available before shipping
          </p>
          <button
            onClick={() => setShowCancelConfirm(true)}
            style={{ width: '100%', maxWidth: 400, height: 48, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.14em', color: '#000', cursor: 'pointer' }}
          >
            CANCEL THE ORDER
          </button>
        </div>
      )}

      {showReturn && <ReturnPanel order={order} onClose={() => setShowReturn(false)} />}

      {/* Cancel confirmation dialog */}
      {showCancelConfirm && (
        <>
          <div onClick={() => setShowCancelConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 301, background: '#fff', padding: '36px 40px', minWidth: 320, maxWidth: 420,
          }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, letterSpacing: '0.06em', color: '#000', marginBottom: 32, textAlign: 'center' }}>
              Do you want to cancel the order?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{ flex: 1, height: 48, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.12em', color: '#000', cursor: 'pointer' }}
              >
                NO
              </button>
              <button
                onClick={async () => {
                  setShowCancelConfirm(false);
                  setCancelling(true);
                  await fetch(`/api/orders/${order.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'cancelled' }),
                  });
                  setCancelling(false);
                  setCurrentStatus('cancelled');
                }}
                disabled={cancelling}
                style={{ flex: 1, height: 48, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.12em', color: '#000', cursor: cancelling ? 'not-allowed' : 'pointer' }}
              >
                {cancelling ? 'CANCELLING...' : 'YES, CANCEL'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── ORDERS LIST ──────────────────────────────────────────────────
function OrdersList({ onSelect }: { onSelect: (order: WCOrder) => void }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<WCOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    const params = new URLSearchParams({ email: user.email });
    if (user.wcId) params.set('customer', String(user.wcId));
    fetch(`/api/orders?${params.toString()}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setOrders(data); else setError('Could not load orders.'); })
      .catch(() => setError('Could not load orders.'))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return (
    <div>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginBottom: 20 }}>Please log in to view your orders.</p>
      <Link href="/account/login" style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#000', textDecoration: 'underline' }}>LOG IN</Link>
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {[1, 2].map(i => <div key={i} style={{ height: 160, background: '#f5f5f5' }} />)}
    </div>
  );

  if (error) return <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#c00' }}>{error}</p>;

  if (orders.length === 0) return (
    <div>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginBottom: 24 }}>You have no orders yet.</p>
      <Link href="/shop" style={{ display: 'inline-block', border: '1px solid #000', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.12em', color: '#000', textDecoration: 'none', padding: '16px 40px' }}>SHOP NOW</Link>
    </div>
  );

  return (
    <div>
      {orders.map(order => {
        const firstItem = order.line_items?.[0];
        const label = STATUS_LABEL[order.status] ?? order.status.toUpperCase();
        const desc = STATUS_DESC[order.status] ?? '';
        return (
          <div
            key={order.id}
            onClick={() => onSelect(order)}
            style={{ display: 'flex', gap: 28, paddingBottom: 32, marginBottom: 32, borderBottom: '1px solid #eee', cursor: 'pointer' }}
          >
            <div style={{ width: 130, height: 200, background: '#f0ede8', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
              {firstItem?.image?.src && (
                <Image src={firstItem.image.src} alt={firstItem.name} fill style={{ objectFit: 'cover' }} sizes="130px" />
              )}
            </div>
            <div style={{ flex: 1, paddingTop: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 700, letterSpacing: '0.08em', color: '#000', marginBottom: 10 }}>{label}</p>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555' }}>{desc}</p>
              </div>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#aaa', marginTop: 20 }}>
                VIEW ORDER DETAILS →
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CONFIRMED ORDER SUMMARY ──────────────────────────────────────
function ConfirmedOrderSummary({ orderId, onSelect }: { orderId: string; onSelect: (order: WCOrder) => void }) {
  const [order, setOrder] = useState<WCOrder | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then(r => r.json())
      .then(data => { if (data?.id) setOrder(data); })
      .catch(() => {});
  }, [orderId]);

  if (!order) return null;

  const firstItem = order.line_items?.[0];
  const label = STATUS_LABEL[order.status] ?? order.status.toUpperCase();
  const desc = STATUS_DESC[order.status] ?? '';

  return (
    <div style={{ marginTop: 60 }}>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#999', marginBottom: 28 }}>ORDERS</p>
      <div
        onClick={() => onSelect(order)}
        style={{ display: 'flex', gap: 28, paddingBottom: 32, marginBottom: 32, borderBottom: '1px solid #eee', cursor: 'pointer' }}
      >
        <div style={{ width: 130, height: 200, background: '#f0ede8', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
          {firstItem?.image?.src && (
            <Image src={firstItem.image.src} alt={firstItem.name} fill style={{ objectFit: 'cover' }} sizes="130px" />
          )}
        </div>
        <div style={{ flex: 1, paddingTop: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 700, letterSpacing: '0.08em', color: '#000', marginBottom: 10 }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555' }}>{desc}</p>
          </div>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#aaa', marginTop: 20 }}>
            VIEW ORDER DETAILS →
          </p>
        </div>
      </div>
    </div>
  );
}

// ── PAGE ─────────────────────────────────────────────────────────
function OrdersContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const isGuest = searchParams.get('guest') === '1';
  const [selectedOrder, setSelectedOrder] = useState<WCOrder | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [guestMode, setGuestMode] = useState(isGuest);

  // Post-checkout confirmation screen
  if (orderId) {
    // When user clicks "VIEW ORDER DETAILS", replace the whole screen with OrderDetail
    if (selectedOrder) {
      return (
        <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
          <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>
            <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} />
          </div>
        </main>
      );
    }

    return (
      <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
        <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 700, letterSpacing: '0.10em', color: '#000', marginBottom: 12 }}>ORDER CONFIRMED</p>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginBottom: 8 }}>
            Your order is confirmed. We ship our orders within 24 hours.
          </p>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888', marginBottom: 32 }}>Order #{orderId}</p>
          <Link href="/shop" style={{ display: 'inline-block', height: 48, lineHeight: '48px', padding: '0 32px', border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.12em', color: '#000', textDecoration: 'none' }}>
            CONTINUE SHOPPING
          </Link>

          {guestMode && (
            <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #eee', maxWidth: 480 }}>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, letterSpacing: '0.10em', color: '#000', marginBottom: 10 }}>
                TRACK YOUR ORDER
              </p>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555', marginBottom: 20 }}>
                Create an account or log in to view your order status and history.
              </p>
              <button
                onClick={() => setShowGate(true)}
                style={{ height: 48, padding: '0 32px', border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.12em', color: '#000', cursor: 'pointer' }}
              >
                CREATE ACCOUNT / LOG IN
              </button>
            </div>
          )}

          {!guestMode && <ConfirmedOrderSummary orderId={orderId} onSelect={setSelectedOrder} />}
        </div>

        {showGate && (
          <CheckoutGate
            onClose={() => setShowGate(false)}
            onGuest={() => setShowGate(false)}
            onAuth={() => { setShowGate(false); setGuestMode(false); }}
          />
        )}
      </main>
    );
  }

  return (
    <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>
        {selectedOrder ? (
          <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} />
        ) : (
          <>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#999', marginBottom: 28 }}>ORDERS</p>
            <OrdersList onSelect={setSelectedOrder} />
          </>
        )}
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }} />}>
      <OrdersContent />
    </Suspense>
  );
}
