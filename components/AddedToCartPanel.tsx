'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';

interface WCProduct {
  id: number;
  name: string;
  slug: string;
  price: string;
  images: { src: string }[];
  secondary_image?: { src: string } | null;
}

export default function AddedToCartPanel() {
  const { lastAdded, clearLastAdded } = useCart();
  const [visible, setVisible] = useState(false);
  const [suggested, setSuggested] = useState<WCProduct[]>([]);

  useEffect(() => {
    if (!lastAdded) { setVisible(false); return; }
    setVisible(true);
    fetch('/api/products?per_page=6')
      .then(r => r.json())
      .then((data: WCProduct[]) => {
        if (Array.isArray(data)) {
          setSuggested(data.filter(p => p.slug !== lastAdded.slug).slice(0, 4));
        }
      })
      .catch(() => {});
  }, [lastAdded]);

  function close() {
    setVisible(false);
    setTimeout(clearLastAdded, 300);
  }

  if (!lastAdded) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.25)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
          width: 380, maxWidth: '92vw',
          background: '#fff',
          overflowY: 'auto',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Added to bag bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #eee', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.06em', color: '#000' }}>
              ADDED TO BAG
            </span>
          </div>
          <button
            onClick={close}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 18, color: '#000', lineHeight: 1, padding: '0 0 0 12px', flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {/* Added item preview */}
        <div style={{ display: 'flex', gap: 14, padding: '20px 20px 0' }}>
          {(lastAdded.secondaryImage || lastAdded.image) && (
            <div className="img-skeleton" style={{ width: 72, height: 90, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
              <Image src={lastAdded.secondaryImage || lastAdded.image} alt={lastAdded.name} fill style={{ objectFit: 'cover' }} sizes="72px" />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.06em', color: '#000', marginBottom: 6 }}>
              {lastAdded.name}
            </p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: '#000' }}>
              ₹ {lastAdded.price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* View Bag button */}
        <div style={{ padding: '20px 20px 0' }}>
          <Link
            href="/cart"
            onClick={close}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: 44,
              background: '#fff', color: '#000', border: '1px solid #000',
              fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.14em',
              textDecoration: 'none',
            }}
          >
            VIEW BAG
          </Link>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#eee', margin: '24px 20px 0' }} />

        {/* You may also like */}
        {suggested.length > 0 && (
          <div style={{ padding: '20px 20px 32px', flex: 1 }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 9, letterSpacing: '0.12em', color: '#000', marginBottom: 16 }}>
              YOU MAY ALSO LIKE
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {suggested.map(p => {
                const pSrc = p.secondary_image?.src ?? p.images?.[0]?.src;
                return (
                  <Link key={p.id} href={`/product/${p.slug}`} onClick={close} style={{ textDecoration: 'none', display: 'block' }}>
                    <div className="img-skeleton" style={{ aspectRatio: '3/4', overflow: 'hidden', marginBottom: 8, position: 'relative' }}>
                      {pSrc
                        ? <Image src={pSrc} alt={p.name} fill style={{ objectFit: 'cover' }} sizes="140px" loading="lazy" />
                        : <div style={{ width: '100%', height: '100%', background: '#e8e4df' }} />}
                    </div>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 9, color: '#000' }}>₹ {p.price}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
