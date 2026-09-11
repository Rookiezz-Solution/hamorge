'use client';

import { useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  name: string;
  img: string;
  slug: string;
}

export default function ProductScrollGrid({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    if (!firstCard) return;
    const cardWidth = firstCard.offsetWidth + 12; // 12 = gap-3
    const index = Math.min(
      Math.round(el.scrollLeft / cardWidth),
      products.length - 1
    );
    setActiveIndex(index);
  }, [products.length]);

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto gap-3 md:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingLeft: '4%', paddingRight: '4%', scrollSnapType: 'x proximity' } as React.CSSProperties}
      >
        {products.map((p) => (
          <Link key={p.slug} href={`/product/${p.slug}`} className="group block flex-shrink-0 w-[62vw] md:w-[22vw] md:max-w-[320px]" style={{ scrollSnapAlign: 'start' }}>
            <div className="img-skeleton overflow-hidden relative" style={{ aspectRatio: '345/500' }}>
              <Image
                src={p.img}
                alt={p.name}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 62vw, 25vw"
                loading="lazy"
                className="group-hover:scale-[1.03] transition-transform duration-500"
              />
            </div>
            <p className="text-[8px] md:text-[13px]" style={{ fontFamily: 'var(--font-alexandria)', color: '#282828', marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {p.name}
            </p>
          </Link>
        ))}
      </div>

      {/* Mobile: dot indicators */}
      <div className="flex md:hidden justify-center gap-[6px]" style={{ marginTop: 14 }}>
        {products.map((_, i) => (
          <span
            key={i}
            style={{
              display: 'block',
              width: i === activeIndex ? 18 : 6,
              height: 6,
              borderRadius: 3,
              background: i === activeIndex ? '#282828' : '#d4d4d4',
              transition: 'width 0.25s ease, background 0.25s ease',
            }}
          />
        ))}
      </div>
    </>
  );
}
