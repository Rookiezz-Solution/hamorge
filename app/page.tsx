import Link from 'next/link';
import Image from 'next/image';
import OfferMarquee, { MARQUEE_HEIGHT } from '@/components/OfferMarquee';
import { getCategories } from '@/lib/wp';

interface Tile { src: string; alt: string; href: string; }

const IMG = '/images/front-page/homepage-remake';
const PURPLE_FRONT: Tile = { src: `${IMG}/purple-front.jpg`, alt: 'Almost Forget t-shirt', href: '/product/regular-fit-slogan-t-shirt' };
const PURPLE_CLOSEUP: Tile = { src: `${IMG}/purple-closeup.jpg`, alt: 'Almost Forget t-shirt print detail', href: '/product/regular-fit-slogan-t-shirt' };
const LIGHT_BLUE: Tile = { src: `${IMG}/light-blue.jpg`, alt: 'Contrast neck t-shirt', href: '/product/contrast-neck-regular-fit-t-shirt' };
const CREAM: Tile = { src: `${IMG}/cream-you.jpg`, alt: 'Cream t-shirt', href: '/product/cream-t-shirt' };
const BLACK: Tile = { src: `${IMG}/black-hold-me.jpg`, alt: 'Hold Me t-shirt back print', href: '/product/slogan-print-black-t-shirt' };
const RED: Tile = { src: `${IMG}/red-wandering.jpg`, alt: 'Wandering Somewhere t-shirt', href: '/product/regular-fit-printed-t-shirt' };

const DESKTOP_TILES = [PURPLE_FRONT, PURPLE_CLOSEUP, LIGHT_BLUE, CREAM, BLACK, RED];
const MOBILE_TILES = [PURPLE_FRONT, LIGHT_BLUE, CREAM, RED];

const rowLink = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', borderTop: '1px solid #e5e5e5', fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', letterSpacing: '0.08em', color: '#000', textTransform: 'uppercase', textDecoration: 'none' } as const;

export default async function Home() {
  const categories = await getCategories().catch(() => []);

  return (
    <main className="bg-white">

      <OfferMarquee />

      <section className="w-full bg-white">
        <div className="hidden md:grid md:grid-cols-2" style={{ columnGap: 6, rowGap: 20 }}>
          {DESKTOP_TILES.map((t, i) => (
            <Link key={t.src} href={t.href} className="relative overflow-hidden block" style={{ aspectRatio: '2/3' }}>
              <Image src={t.src} alt={t.alt} fill style={{ objectFit: 'cover' }} sizes="50vw" priority={i < 2} loading={i < 2 ? undefined : 'lazy'} />
            </Link>
          ))}
        </div>

        {/* Mobile clears the fixed header + the marquee stacked above it (see OfferMarquee's
            MARQUEE_HEIGHT) — desktop intentionally has no padding, letting the hero bleed
            under the transparent nav. */}
        <div className="flex flex-col md:hidden" style={{ paddingTop: `calc(clamp(80px, 18vw, 140px) + ${MARQUEE_HEIGHT}px)`, paddingLeft: '4%', paddingRight: '4%', rowGap: 14 }}>
          {MOBILE_TILES.map((t, i) => (
            <Link key={t.src} href={t.href} className="relative overflow-hidden block" style={{ aspectRatio: '2/3' }}>
              <Image src={t.src} alt={t.alt} fill style={{ objectFit: 'cover' }} sizes="92vw" priority={i === 0} loading={i === 0 ? undefined : 'lazy'} />
            </Link>
          ))}
        </div>
      </section>

      <section style={{ padding: '40px 4% 80px' }}>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 500, letterSpacing: '0.08em', color: '#000', marginBottom: 20 }}>
          SHOP BY CATEGORY
        </p>
        <Link href="/shop" style={rowLink}>
          <span>View all</span>
          <span aria-hidden="true">→</span>
        </Link>
        {categories.map(c => (
          <Link key={c.id} href={`/shop?category=${c.slug}`} style={rowLink}>
            <span>{c.name}</span>
            <span aria-hidden="true">→</span>
          </Link>
        ))}
        <div style={{ borderTop: '1px solid #e5e5e5' }} />
      </section>

    </main>
  );
}
