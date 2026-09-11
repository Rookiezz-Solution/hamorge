import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white" style={{ paddingTop: 60, paddingBottom: 60, paddingLeft: '4%', paddingRight: '4%' }}>

      {/* Be Part Of — centered */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <p style={{
          fontFamily: 'var(--font-inter)',
          fontSize: 'clamp(10px, 2.6vw, 12px)',
          fontWeight: 600,
          letterSpacing: '0.14em',
          color: '#2d2d2d',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Be Part Of{' '}
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            Ham Orge
          </Link>
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <a href="https://www.instagram.com/ham_orge?igsh=bTcxbzBmcnA2d3l2" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#3d3d3d', textDecoration: 'none' }}>
            Instagram
          </a>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#3d3d3d' }}>|</span>
          <a href="https://pin.it/4Ju3zMbU1" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-inter)', fontSize: 'clamp(8px, 2.2vw, 12px)', color: '#3d3d3d', textDecoration: 'none' }}>
            Pinterest
          </a>
        </div>
      </div>

      {/* Address — left aligned */}
      <address style={{
        fontStyle: 'normal',
        fontFamily: 'var(--font-inter)',
        fontSize: 'clamp(8px, 2.2vw, 12px)',
        fontWeight: 600,
        color: '#2d2d2d',
        textTransform: 'uppercase',
        lineHeight: 1.9,
      }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
          Ham Orge Pvt Ltd
        </Link><br />
        Manavalakurichi, Kanyakumari<br />
        Tamil Nadu, India
      </address>

    </footer>
  );
}
