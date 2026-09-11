'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFavourites, FavItem } from '@/context/FavouritesContext';
import { useCart } from '@/context/CartContext';

export default function FavouritesPage() {
  const { favourites, toggle } = useFavourites();
  const { addItem } = useCart();
  const [sizePicker, setSizePicker] = useState<number | null>(null);

  const SIZES = ['S', 'M', 'L', 'XL'];

  function handleAdd(item: FavItem, size: string) {
    addItem(
      { id: item.id, name: item.name, slug: item.slug, price: item.price, image: item.image ?? '', secondaryImage: item.secondaryImage ?? '' },
      1,
      size,
    );
    setSizePicker(null);
  }

  return (
    <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>

        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 22px)', fontWeight: 400, letterSpacing: '0.08em', color: '#000', marginBottom: 32 }}>
          FAVOURITES {favourites.length > 0 && `[${favourites.length}]`}
        </p>

        <div style={{ height: 1, background: '#ddd', marginBottom: 48 }} />

        {favourites.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60, paddingBottom: 80 }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#555', marginBottom: 32 }}>
              You have no saved favourites.
            </p>
            <Link href="/shop" style={{
              display: 'inline-block', border: '1px solid #000', background: '#fff',
              fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', letterSpacing: '0.12em',
              color: '#000', textDecoration: 'none', padding: '18px 48px',
            }}>
              EXPLORE COLLECTION
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {favourites.map((item) => (
              <div key={item.id}>
                <Link href={`/product/${item.slug}`}>
                  <div className="img-skeleton" style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden', marginBottom: 12 }}>
                    {(item.secondaryImage || item.image) ? (
                      <Image src={item.secondaryImage || item.image} alt={item.name} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 44vw, 22vw" loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#e8e4df' }} />
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); toggle(item); }}
                      style={{
                        position: 'absolute', top: 12, right: 12,
                        background: '#fff', border: 'none', borderRadius: '50%',
                        width: 32, height: 32, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      aria-label="Remove from favourites"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#e00" stroke="#e00" strokeWidth="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                </Link>

                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', fontWeight: 400, letterSpacing: '0.08em', color: '#000', marginBottom: 4 }}>
                  {item.name}
                </p>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#000', marginBottom: 12 }}>
                  ₹ {item.price}
                </p>

                {sizePicker === item.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {SIZES.map(sz => (
                      <button key={sz} onClick={() => handleAdd(item, sz)}
                        style={{ flex: 1, height: 36, border: '1px solid #000', background: '#fff', fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#000', cursor: 'pointer' }}>
                        {sz}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => setSizePicker(item.id)}
                    style={{
                      width: '100%', height: 40, border: '1px solid #000', background: '#fff',
                      fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', letterSpacing: '0.12em',
                      color: '#000', cursor: 'pointer',
                    }}
                  >
                    ADD TO CART
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
