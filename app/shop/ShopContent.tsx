'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useFavourites } from '@/context/FavouritesContext';

interface WCProduct {
  id: number;
  name: string;
  slug: string;
  price: string;
  images: { src: string }[];
  secondary_image?: { src: string } | null;
  stock_status?: string;
  sizeAvailability?: Record<string, boolean>;
}

const SIZES = ['S', 'M', 'L', 'XL'];

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="15" viewBox="0 0 24 28" fill={filled ? '#000' : 'none'} stroke="#000" strokeWidth="1.5">
      <path d="M5 2h14a1 1 0 0 1 1 1v22l-8-5-8 5V3a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function Icon2Col({ active }: { active: boolean }) {
  return (
    <svg className="w-[13px] h-[13px] md:w-[18px] md:h-[18px]" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="8" height="20" stroke={active ? '#000' : '#aaa'} strokeWidth="1.3" />
      <rect x="13" y="1" width="8" height="20" stroke={active ? '#000' : '#aaa'} strokeWidth="1.3" />
    </svg>
  );
}

function Icon3Col({ active }: { active: boolean }) {
  return (
    <svg className="w-[13px] h-[13px] md:w-[18px] md:h-[18px]" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="8" height="8" stroke={active ? '#000' : '#aaa'} strokeWidth="1.3" />
      <rect x="13" y="1" width="8" height="8" stroke={active ? '#000' : '#aaa'} strokeWidth="1.3" />
      <rect x="1" y="13" width="8" height="8" stroke={active ? '#000' : '#aaa'} strokeWidth="1.3" />
      <rect x="13" y="13" width="8" height="8" stroke={active ? '#000' : '#aaa'} strokeWidth="1.3" />
    </svg>
  );
}

export default function ShopContent({ initialProducts }: { initialProducts: WCProduct[] }) {
  const [view, setView] = useState<'2col' | '3col'>('3col');
  const [sizePicker, setSizePicker] = useState<WCProduct | null>(null);
  const { addItem } = useCart();
  const { toggle, isFavourite } = useFavourites();

  function isSizeAvailable(product: WCProduct, size: string) {
    return !product.sizeAvailability || product.sizeAvailability[size] !== false;
  }

  function handleSizeSelect(product: WCProduct, size: string) {
    if (!isSizeAvailable(product, size)) return;
    addItem(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: parseFloat(product.price) || 0,
        image: product.images?.[0]?.src ?? '',
        secondaryImage: product.secondary_image?.src ?? product.images?.[0]?.src ?? '',
      },
      1,
      size,
    );
    setSizePicker(null);
  }

  function handleToggleFav(product: WCProduct) {
    toggle({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: parseFloat(product.price) || 0,
      image: product.images?.[0]?.src ?? '',
      secondaryImage: product.secondary_image?.src ?? product.images?.[0]?.src ?? '',
    });
  }

  return (
    <main className="min-h-screen bg-white mobile-font-shop" style={{ paddingTop: 'clamp(80px, 18vw, 140px)' }}>
      <div className="w-full max-w-[1440px] mx-auto" style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 120 }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 10px)', fontWeight: 700, letterSpacing: '0.08em', color: '#000' }}>
            VIEW ALL
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setView('3col')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }} aria-label="2-column view">
              <Icon2Col active={view === '3col'} />
            </button>
            <button onClick={() => setView('2col')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }} aria-label="3-column view">
              <Icon3Col active={view === '2col'} />
            </button>
          </div>
        </div>

        {/* Grid */}
        {initialProducts.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 10px)', color: '#999', marginTop: 60 }}>No products available right now.</p>
        ) : (
          <div className={view === '2col' ? 'grid grid-cols-3 md:grid-cols-4 gap-x-2 gap-y-4 md:gap-x-5 md:gap-y-6' : 'grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-6 md:gap-x-7 md:gap-y-8'}>
            {initialProducts.map(product => {
              const fav = isFavourite(product.id);
              const outOfStock = product.stock_status === 'outofstock';
              return (
                <div key={product.id}>
                  <Link href={`/product/${product.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
                    <div className="img-skeleton aspect-[2/3] md:aspect-[3/4]" style={{ background: undefined, overflow: 'hidden', marginBottom: 10, position: 'relative' }}>
                      {(() => {
                        const src = view === '2col'
                          ? (product.secondary_image?.src ?? product.images?.[0]?.src)
                          : (product.images?.[0]?.src ?? product.secondary_image?.src);
                        return src
                          ? <Image src={src} alt={product.name} fill style={{ objectFit: 'cover', opacity: outOfStock ? 0.5 : 1 }} sizes={view === '2col' ? '(max-width: 768px) 33vw, 22vw' : '(max-width: 768px) 48vw, 22vw'} loading="lazy" />
                          : <div style={{ width: '100%', height: '100%', background: '#e8e4df' }} />;
                      })()}
                      {outOfStock && (
                        <span style={{ position: 'absolute', top: 8, left: 8, background: '#fff', border: '1px solid #000', padding: '3px 8px', fontFamily: 'var(--font-inter)', fontSize: 'clamp(7px, 2vw, 9px)', letterSpacing: '0.08em', color: '#000' }}>
                          OUT OF STOCK
                        </span>
                      )}
                    </div>
                  </Link>

                  {view === '3col' && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 10px)', letterSpacing: '0.04em', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        {product.name.toUpperCase()}
                      </p>
                      <button
                        onClick={() => handleToggleFav(product)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 1 }}
                        aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
                      >
                        <BookmarkIcon filled={fav} />
                      </button>
                    </div>
                  )}

                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 10px)', color: '#000', marginBottom: view === '2col' ? 8 : 10 }}>
                    ₹ {product.price}
                  </p>

                  {view === '3col' && (
                    <button
                      onClick={() => !outOfStock && setSizePicker(product)}
                      disabled={outOfStock}
                      style={{ width: '100%', height: 30, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 10px)', letterSpacing: '0.14em', color: outOfStock ? '#bbb' : '#000', cursor: outOfStock ? 'not-allowed' : 'pointer', borderColor: outOfStock ? '#bbb' : '#000' }}
                    >
                      {outOfStock ? 'OUT OF STOCK' : 'ADD'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Size picker */}
      {sizePicker && (
        <>
          <div onClick={() => setSizePicker(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 90 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: '#fff', borderTop: '1px solid #ddd' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZES.length}, 1fr)` }}>
              {SIZES.map((sz, i) => {
                const available = isSizeAvailable(sizePicker, sz);
                return (
                  <button
                    key={sz}
                    onClick={() => handleSizeSelect(sizePicker, sz)}
                    disabled={!available}
                    style={{
                      position: 'relative', padding: '20px 0', background: 'none', border: 'none',
                      borderRight: i < SIZES.length - 1 ? '1px solid #ddd' : 'none',
                      fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 10px)', letterSpacing: '0.08em',
                      color: available ? '#000' : '#bbb', cursor: available ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {sz}
                    {!available && (
                      <span style={{ position: 'absolute', left: '20%', right: '20%', top: '50%', height: 1, background: '#bbb', transform: 'rotate(-14deg)' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
