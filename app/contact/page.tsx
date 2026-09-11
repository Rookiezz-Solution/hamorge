import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Contact', description: 'Get in touch with HAM ORGE customer service.' };

export default function ContactPage() {
  return (
    <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>

        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, letterSpacing: '0.10em', color: '#000', marginBottom: 48 }}>
          CUSTOMER SERVICE
        </p>

        {/* Telephone */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 48, alignItems: 'flex-start' }}>
          <div style={{ marginTop: 2 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.4">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/>
            </svg>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 600, letterSpacing: '0.10em', color: '#000', marginBottom: 10 }}>
              TELEPHONE
            </p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', marginBottom: 6 }}>
              +91 9488429474
            </p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#555' }}>
              mon-sat: 9:00 AM to 9:00 PM
            </p>
          </div>
        </div>

        {/* Email */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 48, alignItems: 'flex-start' }}>
          <div style={{ marginTop: 2 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.4">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 600, letterSpacing: '0.10em', color: '#000', marginBottom: 10 }}>
              EMAIL
            </p>
            <a href="mailto:support@hamorge.com" style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000', textDecoration: 'none' }}>
              support@hamorge.com
            </a>
          </div>
        </div>

        {/* Instagram */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ marginTop: 2 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.4">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 600, letterSpacing: '0.10em', color: '#000' }}>
                INSTAGRAM
              </p>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.4">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#000' }}>
              @hamorge
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
