'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { trackSearch } from '@/lib/analytics';

interface WCProduct {
  id: number;
  name: string;
  slug: string;
  price: string;
  images: { src: string }[];
  secondary_image?: { src: string } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      fetchProducts('');
    } else {
      setQuery('');
      setProducts([]);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts(query);
      // Track the settled query only — not every keystroke.
      if (query.trim().length > 2) trackSearch(query.trim());
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open]);

  async function fetchProducts(search: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: '12' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex">
      {/* Panel */}
      <div style={{ background: '#fff', width: '100%', maxWidth: 1100, margin: '0 auto', height: '100%', overflowY: 'auto', position: 'relative' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px clamp(16px, 5%, 48px)' }}>
          <button
            onClick={onClose}
            style={{ fontFamily: 'var(--font-inter)', fontSize: 10, fontWeight: 400, background: 'none', border: 'none', cursor: 'pointer', color: '#000' }}
          >
            X
          </button>
          <Link href="/cart" onClick={onClose} style={{ color: '#000' }}>
            <svg className="w-[16px] h-[16px] md:w-[24px] md:h-[24px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </Link>
        </div>

        {/* Search input */}
        <div style={{ padding: '0 clamp(16px, 5%, 48px) 40px' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="SEARCH"
            style={{
              width: '100%', border: 'none', borderBottom: '1px solid #bbb',
              fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.14em',
              color: '#000', padding: '8px 0', outline: 'none', background: 'transparent',
            }}
          />
        </div>

        {/* Results */}
        <div style={{ padding: '0 clamp(16px, 5%, 48px) 60px' }}>
          {loading && (
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: '#999', marginBottom: 24 }}>
              Searching...
            </p>
          )}

          {!loading && products.length === 0 && query.length > 0 && (
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: '#666' }}>
              No products found for &quot;{query}&quot;.
            </p>
          )}

          {products.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-x-2 gap-y-4 md:gap-4">
              {products.map((product, idx) => {
                const imgSrc = product.secondary_image?.src ?? product.images?.[0]?.src;
                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    onClick={onClose}
                    style={{ textDecoration: 'none', display: 'block' }}
                  >
                    <div style={{ background: '#f0ede8', aspectRatio: '3/4', overflow: 'hidden', marginBottom: 8, position: 'relative' }}>
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={product.name}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 768px) 33vw, 28vw"
                          priority={idx < 3}
                          placeholder="empty"
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#e8e4df' }} />
                      )}
                    </div>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: '#555' }}>
                      ₹ {product.price}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dim overlay for sides (on wide screens) */}
      <div className="fixed inset-0 bg-black/40 -z-10" onClick={onClose} />
    </div>
  );
}
