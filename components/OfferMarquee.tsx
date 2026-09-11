const MESSAGE = 'FLAT 10% OFF ON YOUR FIRST PURCHASE';

// Repeated enough times that the strip never runs out of content mid-scroll
// on ultra-wide screens — the animation loops the whole track at -50%, so as
// long as one half is wider than any real viewport, the seam is invisible.
const REPEATS = 8;

export default function OfferMarquee() {
  const items = Array.from({ length: REPEATS });

  return (
    // Transparent spacer reserving the same clearance every other page gives the
    // fixed navbar — kept separate from the black strip below so this padded area
    // stays invisible (matching the white page background) instead of turning
    // into one giant black block under the nav.
    <div style={{ paddingTop: 'clamp(80px, 18vw, 140px)' }}>
      <div style={{ width: '100%', overflow: 'hidden', background: '#000' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: 'max-content',
            animation: 'offer-marquee-scroll 22s linear infinite',
          }}
        >
          {[0, 1].map((track) => (
            <div key={track} style={{ display: 'flex', alignItems: 'center' }} aria-hidden={track === 1}>
              {items.map((_, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontFamily: 'var(--font-inter)',
                    fontSize: 'clamp(10px, 2.6vw, 12px)',
                    fontWeight: 500,
                    letterSpacing: '0.14em',
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    padding: '12px 28px',
                  }}
                >
                  {MESSAGE}
                  <span style={{ margin: '0 28px', color: '#666' }} aria-hidden="true">●</span>
                </span>
              ))}
            </div>
          ))}
        </div>
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
