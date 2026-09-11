'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useFavourites } from '@/context/FavouritesContext';
import { useAuth } from '@/context/AuthContext';
import SearchOverlay from '@/components/layout/SearchOverlay';
import { MARQUEE_HEIGHT } from '@/components/OfferMarquee';

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { itemCount } = useCart();
  useFavourites();
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  function handleLogout() {
    logout();
    setLogoutConfirm(false);
    setMenuOpen(false);
  }

  // Logo intro animation: 'center' → 'moving' → 'done'
  const [introPhase, setIntroPhase] = useState<'center' | 'moving' | 'done'>('center');
  const logoRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem('logoIntroDone')) {
      setIntroPhase('done');
      return;
    }
    // Capture navbar logo position after mount
    if (logoRef.current) {
      const r = logoRef.current.getBoundingClientRect();
      setTargetRect({ x: r.left, y: r.top });
    }
    const t1 = setTimeout(() => setIntroPhase('moving'), 400);
    const t2 = setTimeout(() => {
      setIntroPhase('done');
      sessionStorage.setItem('logoIntroDone', '1');
    }, 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <header
        className="fixed left-0 right-0 z-50 transition-all duration-300"
        style={{
          // On the homepage, the OfferMarquee sits fixed above this header at
          // MARQUEE_HEIGHT (see components/OfferMarquee.tsx) — shift the header
          // down by that exact amount so the two stack without overlapping.
          // Every other page has no marquee, so the header stays flush at top:0.
          top: isHome ? MARQUEE_HEIGHT : 0,
          height: 64,
          background: isHome && scrolled ? '#fff' : 'transparent',
          boxShadow: isHome && scrolled ? '0 1px 12px rgba(0,0,0,0.07)' : 'none',
          visibility: menuOpen ? 'hidden' : 'visible',
        }}
      >
        <div className="h-full w-full max-w-[1440px] mx-auto flex items-center justify-between" style={{ paddingLeft: '4%', paddingRight: '4%' }}>
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-6 md:gap-16">
            <button onClick={() => setMenuOpen(true)} className="flex flex-col gap-[4px] md:gap-[5px] cursor-pointer p-1" aria-label="Open menu">
              <span className="block w-3 md:w-6 h-[1.5px] bg-black" />
              <span className="block w-3 md:w-6 h-[1.5px] bg-black" />
              <span className="block w-3 md:w-6 h-[1.5px] bg-black" />
            </button>
            <Link
              href="/"
              className="flex items-center"
              style={{ textDecoration: 'none' }}
            >
              <div ref={logoRef} style={{ opacity: introPhase === 'done' ? 1 : 0 }}>
                <Image src="/images/logo.png" alt="HAM ORGE" width={205} height={20} quality={100} sizes="(max-width: 768px) 35vw, 205px" style={{ width: 'clamp(130px, 32vw, 205px)', height: 'auto' }} priority />
              </div>
            </Link>
          </div>

          {/* Right: LOG IN + Search + Cart */}
          <div className="flex items-center gap-[18px] md:gap-[40px]">
            {isHome && (user ? (
              <button onClick={() => setLogoutConfirm(true)} style={{ fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 400, color: '#000', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                <span className="md:hidden">LOGOUT</span>
                <span className="hidden md:inline">{user.firstName.toUpperCase()} · LOGOUT</span>
              </button>
            ) : (
              <Link href="/account/login" style={{ fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 400, color: '#000', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                LOG IN
              </Link>
            ))}
            <button onClick={() => setSearchOpen(true)} aria-label="Search" style={{ color: '#000', display: 'flex', alignItems: 'center', padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="md:hidden">
                <circle cx="10.5" cy="10.5" r="7.5" /><path d="m21 21-5-5" />
              </svg>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="hidden md:block">
                <circle cx="10.5" cy="10.5" r="7.5" /><path d="m21 21-5-5" />
              </svg>
            </button>
            {/* Cart */}
            <Link href="/cart" aria-label="Cart" style={{ color: '#000', display: 'flex', alignItems: 'center', height: 40, paddingLeft: 4, position: 'relative' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="md:hidden">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="hidden md:block">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {itemCount > 0 && (
                <span style={{ position: 'absolute', top: 2, right: 0, background: '#000', color: '#fff', borderRadius: '50%', width: 13, height: 13, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-inter)' }}>
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ── MENU OVERLAY ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex">

          {/* Drawer */}
          <div className="bg-white flex flex-col overflow-y-auto md:w-[min(600px,90vw)] w-full" style={{ height: '100%', padding: '40px min(50px, 6vw)' }}>

            {/* X close */}
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu"
              className="text-[18px] sm:text-[22px]"
              style={{ fontFamily: 'var(--font-inter)', fontWeight: 400, color: '#000', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 32, lineHeight: 1 }}>
              X
            </button>

            {/* Product thumbnails */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
                <Link href="/product/love-unbound-graphic-brown-t-shirt" onClick={() => setMenuOpen(false)}>
                    <div className="img-skeleton" style={{ width: 100, height: 138, overflow: 'hidden', position: 'relative', display: 'block' }}>
                    <Image src="/images/media-brown.jpg" alt="Brown Tee"
                      fill style={{ objectFit: 'cover' }} loading="lazy" sizes="100px" />
                  </div>
                </Link>
                <Link href="/product/cream-t-shirt" onClick={() => setMenuOpen(false)}>
                    <div className="img-skeleton" style={{ width: 100, height: 138, overflow: 'hidden', position: 'relative', display: 'block' }}>
                    <Image src="/images/media-cream.jpg" alt="Cream Tee"
                      fill style={{ objectFit: 'cover' }} loading="lazy" sizes="100px" />
                  </div>
                </Link>
              </div>

              {/* T-SHIRTS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
                <Link href="/shop" onClick={() => setMenuOpen(false)}
                  className="text-[10px] md:text-[12px]"
                  style={{ fontFamily: 'var(--font-inter)', fontWeight: 400, color: '#000', textDecoration: 'none', letterSpacing: '0.08em' }}>
                  T-SHIRTS
                </Link>
              </div>

              {/* CUSTOMER SERVICE */}
              <p className="text-[10px] md:text-[12px]" style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, color: '#000', letterSpacing: '0.08em', marginBottom: 16 }}>
                CUSTOMER SERVICE
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
                {[{ label: 'CONTACT US', href: '/contact' }, { label: 'ORDERS', href: '/account/orders' }].map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                    className="text-[10px] md:text-[12px]"
                    style={{ fontFamily: 'var(--font-inter)', fontWeight: 400, color: '#000', textDecoration: 'none', letterSpacing: '0.08em' }}>
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* COMPANY */}
              <p className="text-[10px] md:text-[12px]" style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, color: '#000', letterSpacing: '0.08em', marginBottom: 16 }}>
                COMPANY
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'ABOUT US', href: '/about' },
                  { label: 'TERMS AND CONDITIONS', href: '/terms' },
                  { label: 'PRIVACY POLICY', href: '/privacy' },
                  { label: 'SHIPPING AND RETURN POLICY', href: '/shipping' },
                ].map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                    className="text-[10px] md:text-[12px]"
                    style={{ fontFamily: 'var(--font-inter)', fontWeight: 400, color: '#000', textDecoration: 'none', letterSpacing: '0.08em' }}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

          {/* Dim overlay — desktop only (mobile drawer is full width) */}
          <div className="hidden md:block flex-1 bg-black/40" onClick={() => setMenuOpen(false)} />
        </div>
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ── LOGOUT CONFIRMATION ── */}
      {logoutConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setLogoutConfirm(false)}>
          <div style={{ background: '#fff', padding: '40px 48px', minWidth: 320, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, letterSpacing: '0.08em', color: '#000', marginBottom: 32 }}>
              ARE YOU SURE YOU WANT TO LOGOUT?
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button onClick={handleLogout} style={{ width: 120, height: 40, background: '#fff', color: '#000', border: '1px solid #000', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.10em' }}>
                LOGOUT
              </button>
              <button onClick={() => setLogoutConfirm(false)} style={{ width: 120, height: 40, background: 'none', color: '#000', border: '1px solid #000', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.10em' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGO INTRO ANIMATION ── */}
      {introPhase !== 'done' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#fff',
            pointerEvents: 'none',
            opacity: introPhase === 'moving' ? 0 : 1,
            transition: introPhase === 'moving' ? 'opacity 0.6s ease 0.4s' : 'none',
          }}
        />
      )}
      {introPhase !== 'done' && (
        <div
          style={{
            position: 'fixed',
            zIndex: 10000,
            pointerEvents: 'none',
            transition: introPhase === 'moving'
              ? 'left 0.7s cubic-bezier(0.76,0,0.24,1), top 0.7s cubic-bezier(0.76,0,0.24,1), width 0.7s cubic-bezier(0.76,0,0.24,1)'
              : 'none',
            left: introPhase === 'moving' && targetRect ? targetRect.x : '50%',
            top: introPhase === 'moving' && targetRect ? targetRect.y : '50%',
            transform: introPhase === 'moving' ? 'none' : 'translate(-50%, -50%)',
            width: introPhase === 'moving'
              ? 'clamp(130px, 32vw, 205px)'
              : 'clamp(220px, 42vw, 546px)',
          }}
        >
          <Image
            src="/images/logo.png"
            alt="HAM ORGE"
            width={380}
            height={40}
            style={{ objectFit: 'contain', width: '100%', height: 'auto' }}
            priority
          />
        </div>
      )}
    </>
  );
}
