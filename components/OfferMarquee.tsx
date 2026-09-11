const MESSAGE = 'FLAT 10% OFF ON YOUR FIRST PURCHASE';

// Repeated enough times that the strip never runs out of content mid-scroll
// on ultra-wide screens — the animation loops the whole track at -50%, so as
// long as one half is wider than any real viewport, the seam is invisible.
const REPEATS = 8;

// Fixed (not responsive) so it matches exactly — components/layout/Navbar.tsx
// reads this same number to shift its own fixed header down on the homepage,
// so the two stack without a gap or an overlap. Keep them in sync if changed.
export const MARQUEE_HEIGHT = 36;

export default function OfferMarquee() {
  const items = Array.from({ length: REPEATS });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        height: MARQUEE_HEIGHT,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          width: 'max-content',
          animation: 'offer-marquee-scroll 22s linear infinite',
        }}
      >
        {[0, 1].map((track) => (
          <div key={track} style={{ display: 'flex', alignItems: 'center', height: '100%' }} aria-hidden={track === 1}>
            {items.map((_, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontFamily: 'var(--font-inter)',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  color: '#000',
                  whiteSpace: 'nowrap',
                  padding: '0 28px',
                }}
              >
                {MESSAGE}
                <span style={{ margin: '0 28px', color: '#999' }} aria-hidden="true">●</span>
              </span>
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes offer-marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*="offer-marquee-scroll"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
