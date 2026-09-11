'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useFavourites } from '@/context/FavouritesContext';
import YouMayBeInterestedIn from '@/components/YouMayBeInterestedIn';
import { trackViewContent, trackAddToCart } from '@/lib/analytics';

/* ─── Types ──────────────────────────────────────────── */
interface Review { stars: number; date: string; text: string; }
interface StaticProduct {
  name: string; price: string; description: string;
  images: string[]; sizes: string[];
  measurementsCm: Record<string, Record<string, number>>;
  measurementsIn: Record<string, Record<string, number>>;
}

/* WooCommerce review shape (from /products/reviews) */
interface WcReview { rating: number; review: string; reviewer: string; date_created: string; }

/* Format an ISO date (2025-01-05T…) into "5 JAN 2025" */
function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* ─── Default measurements ───────────────────────────── */
const DEFAULT_MEASUREMENTS_CM: Record<string, Record<string, number>> = {
  Chest: { S: 52, M: 54.5, L: 59.5, XL: 60 },
  'Front length': { S: 68, M: 69.5, L: 73, XL: 76.1 },
  'Sleeve length': { S: 26.5, M: 26.5, L: 26.4, XL: 26.6 },
  'Back width': { S: 43.5, M: 47.7, L: 51, XL: 51.5 },
  'Arm width': { S: 19.5, M: 19.3, L: 20.5, XL: 21 },
};
const DEFAULT_MEASUREMENTS_IN: Record<string, Record<string, number>> = {
  Chest: { S: 20.6, M: 21.5, L: 23.5, XL: 23.6 },
  'Front length': { S: 26.7, M: 27.4, L: 28.8, XL: 30 },
  'Sleeve length': { S: 10.4, M: 10.4, L: 10.4, XL: 10.5 },
  'Back width': { S: 17.1, M: 18.8, L: 20.1, XL: 20.3 },
  'Arm width': { S: 7.7, M: 7.6, L: 8.1, XL: 8.3 },
};

/* ─── Static catalogue (fallback for reviews / measurements) ── */
const STATIC: Record<string, StaticProduct> = {
  'steel-gray-tee': {
    name: 'STEEL GRAY T-SHIRT', price: '₹ 899.00',
    description: 'Relaxed fit t shirt with round neck and short sleeves. Featuring with print in left chest and right sleeve, Embroidery in right chest.',
    images: ['/images/products/steel-gray.jpg'], sizes: ['S', 'M', 'L', 'XL'],
    measurementsCm: DEFAULT_MEASUREMENTS_CM, measurementsIn: DEFAULT_MEASUREMENTS_IN,
  },
  'cream-tee': {
    name: 'CREAM T-SHIRT', price: '₹ 899.00',
    description: 'Relaxed fit t shirt with round neck and short sleeves. Featuring with print in left chest and right sleeve, Embroidery in right chest.',
    images: ['/images/products/cream.jpg'], sizes: ['S', 'M', 'L', 'XL'],
    measurementsCm: DEFAULT_MEASUREMENTS_CM, measurementsIn: DEFAULT_MEASUREMENTS_IN,
  },
  'red-tee': {
    name: 'RED T-SHIRT', price: '₹ 899.00',
    description: 'Relaxed fit t shirt with round neck and short sleeves. Featuring with print in left chest and right sleeve, Embroidery in right chest.',
    images: ['/images/products/red.jpg'], sizes: ['S', 'M', 'L', 'XL'],
    measurementsCm: DEFAULT_MEASUREMENTS_CM, measurementsIn: DEFAULT_MEASUREMENTS_IN,
  },
  'black-tee': {
    name: 'BLACK T-SHIRT', price: '₹ 899.00',
    description: 'Relaxed fit t shirt with round neck and short sleeves. Featuring with print in left chest and right sleeve, Embroidery in right chest.',
    images: ['/images/products/black.jpg'], sizes: ['S', 'M', 'L', 'XL'],
    measurementsCm: DEFAULT_MEASUREMENTS_CM, measurementsIn: DEFAULT_MEASUREMENTS_IN,
  },
};

/* ─── Stars ──────────────────────────────────────────── */
function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rating >= i ? '#000' : rating >= i - 0.5 ? 'url(#half)' : 'none';
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="#000" strokeWidth="1.2">
            <defs><linearGradient id="half"><stop offset="50%" stopColor="#000" /><stop offset="50%" stopColor="transparent" /></linearGradient></defs>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      })}
    </span>
  );
}

/* ─── Desktop left-drawer ────────────────────────────── */
function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex">
      <div style={{ width: '50vw', minWidth: 320, maxWidth: 760, background: '#fff', height: '100%', overflowY: 'auto', padding: '40px 56px', flexShrink: 0 }}>
        <button onClick={onClose} style={{ fontFamily: 'var(--font-inter)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#000', marginBottom: 36, display: 'block' }}>X</button>
        {children}
      </div>
      <div className="flex-1 bg-black/40" onClick={onClose} />
    </div>
  );
}

/* ─── Price (with strikethrough regular price when on sale) ── */
function PriceBlock({ price, regularPrice, fontSize, style }: { price: string; regularPrice: string | null; fontSize: number | string; style?: React.CSSProperties }) {
  if (!regularPrice) {
    return <p style={{ fontFamily: 'var(--font-inter)', fontSize, color: '#000', ...style }}>{price}</p>;
  }
  return (
    <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-inter)', fontSize, ...style }}>
      <span style={{ color: '#999', textDecoration: 'line-through' }}>{regularPrice}</span>
      <span style={{ background: '#e8524f', color: '#fff', padding: '2px 8px', fontWeight: 500 }}>{price}</span>
    </p>
  );
}

/* ─── Chevron icon ───────────────────────────────────── */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.4"
      style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

const SIZES = ['S', 'M', 'L', 'XL'];

/* ─── Props ──────────────────────────────────────────── */
interface Props {
  slug: string;
  wcProduct: Record<string, unknown> | null;
  suggested: Record<string, unknown>[];
  wcReviews: WcReview[];
  sizeAvailability: Record<string, boolean> | null;
}

/* ─── ProductContent ─────────────────────────────────── */
export default function ProductContent({ slug, wcProduct, suggested, wcReviews, sizeAvailability }: Props) {
  const staticData = STATIC[slug];

  const images: string[] = wcProduct && (wcProduct.images as { src: string }[])?.length > 0
    ? ((wcProduct.images as { src: string }[]) ?? []).map(i => i.src)
    : (staticData?.images ?? []);
  const secondaryImageSrc: string =
    (wcProduct?.secondary_image as { src: string } | null | undefined)?.src ?? images[0] ?? '';

  const name = (wcProduct?.name as string) || staticData?.name || '';
  const rawPrice = (wcProduct?.price as string) || (wcProduct?.regular_price as string) || (wcProduct?.sale_price as string) || '';
  const price = rawPrice ? `₹ ${parseFloat(rawPrice).toFixed(2)}` : (staticData?.price ?? '');
  const onSale = wcProduct?.on_sale === true;
  const rawRegularPrice = (wcProduct?.regular_price as string) || '';
  const regularPrice = onSale && rawRegularPrice ? `₹ ${parseFloat(rawRegularPrice).toFixed(2)}` : null;
  const rawDesc = ((wcProduct?.short_description as string) || (wcProduct?.description as string) || '')
    .replace(/<\/(p|div|li)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const description = rawDesc || staticData?.description || '';
  const productId = wcProduct ? (wcProduct.id as number) : 0;
  const outOfStock = wcProduct ? (wcProduct.stock_status as string) === 'outofstock' : false;

  const [drawer, setDrawer] = useState<null | 'review' | 'measurement' | 'material' | 'shipping'>(null);
  const [mobileReviewOpen, setMobileReviewOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<null | 'measurement' | 'material' | 'shipping'>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [measureUnit, setMeasureUnit] = useState<'cm' | 'in'>('cm');
  const [sizePicker, setSizePicker] = useState(false);

  const { addItem } = useCart();
  const { favourites, toggle } = useFavourites();
  const numericPrice = parseFloat(price.replace(/[^\d.]/g, '')) || 0;

  // ViewContent — once per product, not on every re-render.
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!name || viewedRef.current === slug) return;
    viewedRef.current = slug;
    trackViewContent({ id: productId || slug, name, price: numericPrice, quantity: 1 });
  }, [slug, name, productId, numericPrice]);

  const favItem = { id: productId || 0, slug, name, price: parseFloat(price.replace('₹', '').trim()) || 0, image: images[0] ?? '', secondaryImage: secondaryImageSrc };
  const isFav = favourites.some(f => f.slug === slug);

  function isSizeAvailable(size: string) {
    return !sizeAvailability || sizeAvailability[size] !== false;
  }

  function handleSizeSelect(size: string) {
    if (outOfStock || !isSizeAvailable(size)) return;
    const cartPrice = numericPrice || 899;
    addItem(
      { id: productId || Date.now(), name, slug, price: cartPrice, image: images[0] ?? '', secondaryImage: secondaryImageSrc },
      1, size,
    );
    trackAddToCart({ id: productId || slug, name, price: cartPrice, quantity: 1, variant: size });
    setSizePicker(false);
    setSelectedSize(null);
  }

  function handleMobileAdd() {
    if (outOfStock) return;
    if (selectedSize) {
      handleSizeSelect(selectedSize);
    } else {
      setSizePicker(true);
    }
  }

  function toggleAccordion(key: 'measurement' | 'material' | 'shipping') {
    setOpenAccordion(prev => prev === key ? null : key);
  }

  const measurements = measureUnit === 'cm'
    ? (staticData?.measurementsCm ?? DEFAULT_MEASUREMENTS_CM)
    : (staticData?.measurementsIn ?? DEFAULT_MEASUREMENTS_IN);
  // Build the review display data from real, approved WooCommerce reviews.
  // When the product has none, `reviews` stays null and the section is hidden.
  const reviewList: Review[] = (wcReviews ?? []).map(r => ({
    stars: Number(r.rating) || 0,
    date: formatReviewDate(r.date_created),
    text: (r.review || '').replace(/<[^>]*>/g, '').trim(),
  }));
  const reviews = reviewList.length > 0
    ? {
        count: reviewList.length,
        rating: Math.round((reviewList.reduce((s, r) => s + r.stars, 0) / reviewList.length) * 10) / 10,
        list: reviewList,
      }
    : null;

  if (!wcProduct && !staticData) {
    return (
      <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555' }}>Product not found.</p>
      </main>
    );
  }

  /* ── Shared accordion content renderers ── */
  const measurementContent = (
    <>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#444', lineHeight: 1.65, marginBottom: 16, marginTop: 8 }}>
        The measurement may vary slightly due to the production process. The garment is measured on the flat surface.
      </p>
      <div style={{ display: 'flex', gap: 28, marginBottom: 20 }}>
        {(['cm', 'in'] as const).map(u => (
          <button key={u} onClick={() => setMeasureUnit(u)}
            style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: measureUnit === u ? 600 : 400, color: measureUnit === u ? '#000' : '#aaa', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', padding: '0 0 2px', letterSpacing: '0.06em', borderBottom: measureUnit === u ? '1.5px solid #000' : '1.5px solid transparent' }}>
            {u}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)' }}>
          <thead>
            <tr>{['AREA', 'S', 'M', 'L', 'XL'].map(h => (
              <th key={h} style={{ textAlign: 'left', paddingBottom: 12, fontWeight: 600, color: '#000', letterSpacing: '0.04em', paddingRight: 20, whiteSpace: 'nowrap' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {Object.entries(measurements).map(([area, vals]) => (
              <tr key={area}>
                <td style={{ padding: '10px 20px 10px 0', color: '#333', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>{area}</td>
                {(['S', 'M', 'L', 'XL'] as const).map(s => (
                  <td key={s} style={{ padding: '10px 20px 10px 0', color: '#333', borderBottom: '1px solid #f0f0f0' }}>{vals[s]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const materialContent = (
    <div style={{ marginTop: 8 }}>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, marginBottom: 8 }}>MATERIAL 100% cotton</p>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, marginTop: 16, marginBottom: 6 }}>GARMENT CARE INSTRUCTIONS</p>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#444', lineHeight: 1.65, marginBottom: 16 }}>
        Take good care of your Ham Orge piece to keep them looking fresh and lasting longer. Wash gently and at lower temperatures to help maintain the color, shape, and softness of the fabric
      </p>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, marginBottom: 10 }}>CARE GUIDE</p>
      {['🧺  Machine wash cold (max. 30°C/ 80°F) on a gentle cycle', '🚫  Do not use bleach', '♨️  Iron at a maximum of 110°C/ 280°F', '❌  Do not dry clean', '🚫  Do not tumble dry', 'ⓘ  Wash inside out', 'ⓘ  Wash separately', 'ⓘ  Iron inside out'].map(item => (
        <p key={item} style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#444', lineHeight: 1.5, marginBottom: 6 }}>{item}</p>
      ))}
    </div>
  );

  const shippingContent = (
    <div style={{ marginTop: 8 }}>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, marginBottom: 6 }}>SHIPPING</p>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#444', lineHeight: 1.65, marginBottom: 20 }}>Delivery in 5 to 7 working days</p>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, marginBottom: 6 }}>EXCHANGE AND RETURNS</p>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#444', lineHeight: 1.65 }}>
        You have 30 days from the shipping date to return your purchase from Ham Orge.com. For more details, please refer to our{' '}
        <Link href="/shipping" style={{ color: '#000', textDecoration: 'underline' }}>Return, Shipping &amp; Refund Policy</Link>
      </p>
    </div>
  );

  return (
    <>
      {/* ══════════════════════════════════════════
          MOBILE LAYOUT
      ══════════════════════════════════════════ */}
      <main className="block md:hidden mobile-font-product" style={{ paddingTop: 64, background: '#fff', minHeight: '100vh', paddingBottom: 68 }}>

        {/* Stacked full-width images */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {images.map((src, i) => (
            <div key={i} style={{ width: 'calc(100% - 16px)', margin: '0 8px', aspectRatio: '2/3', position: 'relative', overflow: 'hidden' }} className="img-skeleton">
              <Image src={src} alt={`${name} ${i + 1}`} fill style={{ objectFit: 'cover' }} sizes="100vw" priority={i === 0} loading={i === 0 ? undefined : 'lazy'} />
            </div>
          ))}
          {images.length === 0 && (
            <div style={{ width: 'calc(100% - 16px)', margin: '0 8px', aspectRatio: '2/3', background: '#f0f0f0' }} />
          )}
        </div>

        {/* Product info */}
        <div style={{ padding: '20px 4% 16px' }}>
          <p className="mobile-heading" style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 400, letterSpacing: '0.06em', color: '#000', marginBottom: 8 }}>{name}</p>
          <PriceBlock price={price} regularPrice={regularPrice} fontSize="clamp(10px, 2.6vw, 12px)" style={{ marginBottom: 4 }} />
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(9px, 2.2vw, 10px)', color: '#aaa', marginBottom: 16 }}>(MRP INCL. OF ALL TAXES)</p>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#444', lineHeight: 1.75, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{description}</p>
        </div>

        {/* Review row → slide-up */}
        {reviews && (
          <button onClick={() => setMobileReviewOpen(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 4%' }}>
            <span className="mobile-heading" style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#000' }}>
              REVIEW &nbsp;[{reviews.count}]
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Stars rating={reviews.rating} size={13} />
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000' }}>{reviews.rating}</span>
              <svg width="6" height="10" viewBox="0 0 7 12" fill="none" stroke="#000" strokeWidth="1.3"><path d="M1 1l5 5-5 5" /></svg>
            </span>
          </button>
        )}

        {/* Inline accordions */}
        {([
          { key: 'measurement' as const, label: 'PRODUCT MEASUREMENT', content: measurementContent },
          { key: 'material' as const, label: 'MATERIAL AND CARE', content: materialContent },
          { key: 'shipping' as const, label: 'SHIPPING, EXCHANGE AND RETURN', content: shippingContent },
        ]).map(({ key, label, content }) => (
          <div key={key}>
            <button onClick={() => toggleAccordion(key)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 4%' }}>
              <span className="mobile-heading" style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.06em', color: '#000' }}>{label}</span>
              <Chevron open={openAccordion === key} />
            </button>
            {openAccordion === key && (
              <div style={{ padding: '0 4% 24px' }}>{content}</div>
            )}
          </div>
        ))}

        {/* YOU MAY ALSO LIKE */}
        {suggested.length > 0 && (
          <div style={{ padding: '48px 4% 20px' }}>
            <p className="mobile-heading" style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#000', marginBottom: 16 }}>YOU MAY ALSO LIKE</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '0 4%' }}>
              {suggested.slice(0, 6).map((p) => {
                const pImages = (p.images as { src: string }[] | undefined) ?? [];
                const pSrc = (p.secondary_image as { src: string } | null)?.src ?? pImages[0]?.src ?? '';
                return (
                  <Link key={p.id as number} href={`/product/${p.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div className="img-skeleton" style={{ background: undefined, aspectRatio: '2/3', overflow: 'hidden', marginBottom: 6, position: 'relative' }}>
                      {pSrc ? <Image src={pSrc} alt={p.name as string} fill style={{ objectFit: 'cover' }} sizes="30vw" loading="lazy" /> : null}
                    </div>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000' }}>₹ {p.price as string}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Mobile sticky bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden"
        style={{ background: '#fff', borderTop: '1px solid #e0e0e0', height: 52, alignItems: 'center', padding: '0 4%', gap: 12 }}>
        {/* Left: title + bookmark + price */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.06em', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
              {name}
            </p>
            <button onClick={() => toggle(favItem)} aria-label="Add to favourites"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
              <svg width="12" height="14" viewBox="0 0 24 28" fill={isFav ? '#000' : 'none'} stroke="#000" strokeWidth="1.4">
                <path d="M5 2h14a1 1 0 0 1 1 1v22l-8-5-8 5V3a1 1 0 0 1 1-1z" />
              </svg>
            </button>
          </div>
          <PriceBlock price={price} regularPrice={regularPrice} fontSize="clamp(10px, 2.6vw, 12px)" style={{ marginTop: 2 }} />
        </div>
        {/* Right: ADD button */}
        <button onClick={handleMobileAdd} disabled={outOfStock}
          style={{ width: 140, height: 28, background: outOfStock ? '#fff' : (selectedSize ? '#000' : '#fff'), border: `1px solid ${outOfStock ? '#bbb' : '#000'}`, fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.14em', color: outOfStock ? '#bbb' : (selectedSize ? '#fff' : '#000'), cursor: outOfStock ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'background 0.15s, color 0.15s' }}>
          {outOfStock ? 'OUT OF STOCK' : (selectedSize ? `ADD  ${selectedSize}` : 'ADD')}
        </button>
      </div>

      {/* ── Mobile review slide-up ── */}
      {mobileReviewOpen && (
        <div className="md:hidden"
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => setMobileReviewOpen(false)}>
          <div style={{ background: '#fff', maxHeight: '85vh', overflowY: 'auto', borderRadius: '10px 10px 0 0', padding: '20px 4% 40px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#000' }}>REVIEW [{reviews?.count}]</span>
                <Stars rating={reviews?.rating || 0} size={13} />
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000' }}>{reviews?.rating}</span>
              </div>
              <button onClick={() => setMobileReviewOpen(false)}
                style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', background: 'none', border: 'none', cursor: 'pointer', color: '#000', padding: 4 }}>X</button>
            </div>
            {reviews?.list.map((r, i) => (
              <div key={i} style={{ borderTop: '1px solid #e0e0e0', padding: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Stars rating={r.stars} size={13} />
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#888' }}>{r.date}</span>
                </div>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#444', lineHeight: 1.6 }}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          DESKTOP LAYOUT
      ══════════════════════════════════════════ */}
      <main className="hidden md:block" style={{ paddingTop: 64, background: '#fff', minHeight: '100vh' }}>

        <div style={{ paddingLeft: '4%', paddingTop: 20, paddingBottom: 20 }}>
          <Link href="/shop" style={{ fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.08em', color: '#888', textDecoration: 'none' }}>
            ← BACK TO SHOP
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '4%' }}>
          <div style={{ flex: '0 0 52%' }}>
            {images[0] ? (
              <div className="img-skeleton" style={{ width: 'calc(100% - 16px)', margin: '0 8px', aspectRatio: '8/11', overflow: 'hidden', position: 'relative' }}>
                <Image src={images[0]} alt={name} fill style={{ objectFit: 'cover' }} sizes="52vw" priority />
              </div>
            ) : (
              <div className="img-skeleton" style={{ width: 'calc(100% - 16px)', margin: '0 8px', aspectRatio: '8/11' }} />
            )}
          </div>

          <div style={{ flex: 1, position: 'sticky', top: 80, alignSelf: 'flex-start', padding: '0 4% 40px 48px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 400, letterSpacing: '0.08em', color: '#000', margin: 0 }}>{name}</p>
              <button onClick={() => toggle(favItem)} aria-label="Add to favourites"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                <svg width="18" height="20" viewBox="0 0 24 28" fill={isFav ? '#000' : 'none'} stroke="#000" strokeWidth="1.4">
                  <path d="M5 2h14a1 1 0 0 1 1 1v22l-8-5-8 5V3a1 1 0 0 1 1-1z" />
                </svg>
              </button>
            </div>
            <PriceBlock price={price} regularPrice={regularPrice} fontSize={14} style={{ marginBottom: 4 }} />
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: '#aaa', marginBottom: 20 }}>(MRP INCL. OF ALL TAXES)</p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#444', lineHeight: 1.8, marginBottom: 24, whiteSpace: 'pre-wrap' }}>{description}</p>

            {reviews && (
              <button onClick={() => setDrawer('review')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', borderTop: '1px solid #e0e0e0', cursor: 'pointer', padding: '14px 0', width: '100%' }}>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.08em', color: '#000' }}>REVIEW &nbsp;[{reviews.count}]</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Stars rating={reviews.rating} size={13} />
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#000' }}>{reviews.rating}</span>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="#000" strokeWidth="1.3"><path d="M1 1l5 5-5 5" /></svg>
                </span>
              </button>
            )}

            {[
              { key: 'measurement', label: 'PRODUCT MEASUREMENT' },
              { key: 'material',    label: 'MATERIAL AND CARE' },
              { key: 'shipping',    label: 'SHIPPING, EXCHANGE AND RETURN' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setDrawer(key as typeof drawer)}
                style={{ display: 'block', textAlign: 'left', width: '100%', background: 'none', border: 'none', borderTop: '1px solid #e0e0e0', cursor: 'pointer', padding: '14px 0', fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.06em', color: '#000' }}>
                {label}
              </button>
            ))}

            <div style={{ height: 1, background: '#e0e0e0', marginBottom: 24 }} />
            <button onClick={() => !outOfStock && setSizePicker(true)} disabled={outOfStock}
              style={{ width: '100%', height: 52, background: '#fff', border: `1px solid ${outOfStock ? '#bbb' : '#000'}`, fontFamily: 'var(--font-inter)', fontSize: 13, letterSpacing: '0.14em', color: outOfStock ? '#bbb' : '#000', cursor: outOfStock ? 'not-allowed' : 'pointer' }}>
              {outOfStock ? 'OUT OF STOCK' : 'ADD'}
            </button>
          </div>
        </div>

        {images.length > 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 56, marginTop: 56, paddingLeft: '4%', paddingRight: '4%' }}>
            {images.slice(1).map((src, i) => (
              <div key={i} style={{ width: 'calc(100% - 16px)', margin: '0 8px', aspectRatio: '8/11', overflow: 'hidden', position: 'relative' }} className="img-skeleton">
                <Image src={src} alt={`${name} ${i + 2}`} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 46vw" loading="lazy" />
              </div>
            ))}
          </div>
        )}

        <div style={{ paddingTop: 32, paddingBottom: 80, paddingLeft: '4%' }}>
          <YouMayBeInterestedIn products={suggested as unknown as Parameters<typeof YouMayBeInterestedIn>[0]['products']} />
        </div>
      </main>

      {/* ── SIZE PICKER (shared mobile + desktop) ── */}
      {sizePicker && (
        <>
          <div onClick={() => setSizePicker(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 90 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: '#fff', borderTop: '1px solid #ddd' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZES.length}, 1fr)` }}>
              {SIZES.map((sz, i) => {
                const available = isSizeAvailable(sz);
                return (
                  <button key={sz} onClick={() => handleSizeSelect(sz)} disabled={!available}
                    style={{ position: 'relative', padding: '12px 0', background: 'none', border: 'none', borderRight: i < SIZES.length - 1 ? '1px solid #ddd' : 'none', fontFamily: 'var(--font-inter)', fontSize: 14, letterSpacing: '0.08em', color: available ? '#000' : '#bbb', cursor: available ? 'pointer' : 'not-allowed' }}>
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

      {/* ── DESKTOP DRAWERS ── */}
      <Drawer open={drawer === 'review'} onClose={() => setDrawer(null)}>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 24 }}>REVIEW {reviews ? `[${reviews.count}]` : ''}</p>
        {reviews?.list.map((r, i) => (
          <div key={i} style={{ borderTop: '1px solid #e0e0e0', padding: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Stars rating={r.stars} size={14} />
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: '#888' }}>{r.date}</span>
            </div>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#444', lineHeight: 1.6 }}>{r.text}</p>
          </div>
        ))}
      </Drawer>

      <Drawer open={drawer === 'measurement'} onClose={() => setDrawer(null)}>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 400, letterSpacing: '0.08em', color: '#000', marginBottom: 20 }}>PRODUCT MEASUREMENT</p>
        {measurementContent}
      </Drawer>

      <Drawer open={drawer === 'material'} onClose={() => setDrawer(null)}>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 16 }}>MATERIAL AND CARE</p>
        {materialContent}
      </Drawer>

      <Drawer open={drawer === 'shipping'} onClose={() => setDrawer(null)}>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 20 }}>SHIPPING, EXCHANGE AND RETURN</p>
        {shippingContent}
      </Drawer>
    </>
  );
}
