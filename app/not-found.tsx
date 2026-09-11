import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, letterSpacing: '0.14em', color: '#aaa', marginBottom: 16 }}>404</p>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 22, fontWeight: 400, letterSpacing: '0.08em', color: '#000', marginBottom: 32 }}>
          PAGE NOT FOUND
        </p>
        <Link href="/" style={{ fontFamily: 'var(--font-inter)', fontSize: 12, letterSpacing: '0.12em', color: '#000', textDecoration: 'none', border: '1px solid #000', padding: '16px 40px', display: 'inline-block' }}>
          GO HOME
        </Link>
      </div>
    </main>
  );
}
