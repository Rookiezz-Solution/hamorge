import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="bg-white">

      {/* ── CATEGORY SHOWCASE (homepage remake v1) ── */}
      <section className="w-full bg-white">
        {/* EVERYDAY ESSENTIALS */}
        <div>
          <div className="hidden md:grid md:grid-cols-2">
            <Link href="/product/basic-relaxed-fit-white-t-shirt" className="relative overflow-hidden block" style={{ aspectRatio: '2/3' }}>
              <Image src="/images/front-page/homepage-remake/essentials-1.jpg" alt="Everyday Essentials" fill style={{ objectFit: 'cover' }} sizes="50vw" priority />
            </Link>
            <Link href="/product/slogan-print-black-t-shirt" className="relative overflow-hidden block" style={{ aspectRatio: '2/3' }}>
              <Image src="/images/front-page/homepage-remake/essentials-2.jpg" alt="Everyday Essentials" fill style={{ objectFit: 'cover' }} sizes="50vw" priority />
            </Link>
          </div>
          <div className="block md:hidden" style={{ paddingTop: 'clamp(80px, 18vw, 140px)' }}>
            <Link href="/product/basic-relaxed-fit-white-t-shirt" className="relative overflow-hidden block" style={{ aspectRatio: '2/3', marginLeft: '4%', marginRight: '4%' }}>
              <Image src="/images/front-page/homepage-remake/essentials-1.jpg" alt="Everyday Essentials" fill style={{ objectFit: 'cover' }} sizes="92vw" priority />
            </Link>
          </div>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 500, letterSpacing: '0.08em', color: '#000', textTransform: 'uppercase', padding: '14px 4%' }}>
            EVERYDAY ESSENTIALS
          </p>
        </div>

        {/* OVERSIZED COLLECTION */}
        <div>
          <div className="hidden md:grid md:grid-cols-2">
            <Link href="/product/slogan-print-white-t-shirt" className="relative overflow-hidden block" style={{ aspectRatio: '2/3' }}>
              <Image src="/images/front-page/homepage-remake/oversized-1.jpg" alt="Oversized Collection" fill style={{ objectFit: 'cover' }} sizes="50vw" loading="lazy" />
            </Link>
            <Link href="/product/slogan-print-white-t-shirt" className="relative overflow-hidden block" style={{ aspectRatio: '2/3' }}>
              <Image src="/images/front-page/homepage-remake/oversized-2.jpg" alt="Oversized Collection" fill style={{ objectFit: 'cover' }} sizes="50vw" loading="lazy" />
            </Link>
          </div>
          <Link href="/product/contrast-print-red-t-shirt" className="block md:hidden relative overflow-hidden" style={{ aspectRatio: '2/3', marginLeft: '4%', marginRight: '4%' }}>
            <Image src="/images/front-page/homepage-remake/graphic-1.jpg" alt="Oversized Collection" fill style={{ objectFit: 'cover' }} sizes="92vw" loading="lazy" />
          </Link>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 500, letterSpacing: '0.08em', color: '#000', textTransform: 'uppercase', padding: '14px 4%' }}>
            OVERSIZED COLLECTION
          </p>
        </div>

        {/* GRAPHIC TEES */}
        <div>
          <div className="hidden md:grid md:grid-cols-2">
            <Link href="/product/contrast-print-red-t-shirt" className="relative overflow-hidden block" style={{ aspectRatio: '2/3' }}>
              <Image src="/images/front-page/homepage-remake/graphic-1.jpg" alt="Graphic Tees" fill style={{ objectFit: 'cover' }} sizes="50vw" loading="lazy" />
            </Link>
            <Link href="/product/love-unbound-graphic-brown-t-shirt" className="relative overflow-hidden block" style={{ aspectRatio: '2/3' }}>
              <Image src="/images/front-page/homepage-remake/graphic-2.jpg" alt="Graphic Tees" fill style={{ objectFit: 'cover' }} sizes="50vw" loading="lazy" />
            </Link>
          </div>
          <Link href="/product/love-unbound-graphic-brown-t-shirt" className="block md:hidden relative overflow-hidden" style={{ aspectRatio: '2/3', marginLeft: '4%', marginRight: '4%' }}>
            <Image src="/images/front-page/homepage-remake/graphic-2.jpg" alt="Graphic Tees" fill style={{ objectFit: 'cover' }} sizes="92vw" loading="lazy" />
          </Link>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 500, letterSpacing: '0.08em', color: '#000', textTransform: 'uppercase', padding: '14px 4%' }}>
            GRAPHIC TEES
          </p>
        </div>

        {/* SHOP ALL — mobile only, no desktop equivalent in reference */}
        <div className="block md:hidden">
          <Link href="/shop" className="relative overflow-hidden block" style={{ aspectRatio: '2/3', marginLeft: '4%', marginRight: '4%' }}>
            <Image src="/images/front-page/homepage-remake/essentials-2.jpg" alt="Shop All" fill style={{ objectFit: 'cover' }} sizes="92vw" loading="lazy" />
          </Link>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 500, letterSpacing: '0.08em', color: '#000', textTransform: 'uppercase', padding: '14px 4%' }}>
            SHOP ALL
          </p>
        </div>
      </section>

    </main>
  );
}
