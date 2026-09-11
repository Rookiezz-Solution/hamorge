'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<'hidden' | 'loading' | 'done'>('hidden');
  const [width, setWidth] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathname = useRef(pathname);

  // Start bar on any internal link click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;

      // Skip if navigating to the same page
      try {
        const url = new URL(href, window.location.href);
        if (url.pathname === window.location.pathname) return;
      } catch {
        return;
      }

      if (intervalRef.current) clearInterval(intervalRef.current);
      setState('loading');
      setWidth(15);
      let current = 15;
      intervalRef.current = setInterval(() => {
        current += Math.random() * 10 + 2;
        if (current >= 85) {
          current = 85;
          clearInterval(intervalRef.current!);
        }
        setWidth(current);
      }, 250);
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Complete bar when route changes
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      if (intervalRef.current) clearInterval(intervalRef.current);
      setWidth(100);
      setState('done');
      const t = setTimeout(() => {
        setState('hidden');
        setWidth(0);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  if (state === 'hidden') return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          backgroundColor: '#1a1a1a',
          transition:
            state === 'done'
              ? 'width 0.25s ease, opacity 0.4s ease 0.2s'
              : 'width 0.3s ease',
          opacity: state === 'done' ? 0 : 1,
        }}
      />
    </div>
  );
}
