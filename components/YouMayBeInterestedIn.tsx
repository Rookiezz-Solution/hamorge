import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: string;
  images: { src: string }[];
  secondary_image?: { src: string } | null;
}

export default function YouMayBeInterestedIn({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <div style={{ marginTop: 64 }}>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.10em', color: '#000', marginBottom: 48, paddingBottom: 16 }}>YOU MAY BE INTERESTED IN</p>
      <div style={{ paddingLeft: '4%', paddingRight: '4%' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-16">
          {products.map(p => {
            const pSrc = p.secondary_image?.src ?? p.images?.[0]?.src;
            return (
              <Link key={p.id} href={`/product/${p.slug}`} style={{ textDecoration: 'none', display: 'block', width: '70%', margin: '0 auto' }}>
                <div className="img-skeleton" style={{ background: undefined, aspectRatio: '3/4', overflow: 'hidden', marginBottom: 8, position: 'relative' }}>
                  {pSrc
                    ? <Image src={pSrc} alt={p.name} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 44vw, 22vw" loading="lazy" />
                    : <div style={{ width: '100%', height: '100%', background: '#e8e4df' }} />}
                </div>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#000' }}>₹ {p.price}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
