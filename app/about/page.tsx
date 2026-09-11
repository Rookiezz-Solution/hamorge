import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'About Us', description: 'HAM ORGE is a clothing brand built with purpose, comfort and quality.' };

const body: React.CSSProperties = {
  fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#333', lineHeight: 1.75, marginBottom: 16,
};

export default function AboutPage() {
  return (
    <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>

        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 700, letterSpacing: '0.10em', color: '#000', marginBottom: 32 }}>
          ABOUT US
        </p>

        <p style={body}>
          Ham orge is a clothing brand with a clear purpose- to create apparel that feel good, fitswell and lasts.
        </p>
        <p style={body}>
          Every piece we design starts with real everyday needs, comfort, quality and style that speaks without shouting.
        </p>
        <p style={body}>
          At HAM ORGE, the customer is always at the center.
        </p>
        <p style={body}>
          Your feedback shapes out products and help us grow better everyday.
        </p>
        <p style={body}>
          For more information or support reach us at:{' '}
          <a href="mailto:support@hamorge.com" style={{ color: '#000' }}>support@hamorge.com</a>
        </p>

      </div>
    </main>
  );
}
