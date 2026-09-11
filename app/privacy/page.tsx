const body: React.CSSProperties = {
  fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#333', lineHeight: 1.75, marginBottom: 20,
};

export default function PrivacyPage() {
  return (
    <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>

        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#000', marginBottom: 12 }}>
          PRIVACY POLICY
        </p>
        <p style={{ ...body, marginBottom: 28 }}>Your privacy matters to us</p>

        <p style={body}>
          HAM ORGE is committed to protecting your personal information. We collect only the neccessary data required to delivery your orders efficiently. We collect Name, Phone number, Email, shipping address, payment details (procesed securely through our payment partners), order history and preferences. We do not store banking passwords, credit/debit Card number, or UPI PINs.
        </p>

        <p style={body}>
          Your data is used only for processing and delivery orders providing tracking updates customer support improving shopping experience Internal analytics and security. We do not sell or rent customers information to any external company.
        </p>

        <p style={body}>
          Unfortunately, no data transmission internet is 100% secure. however, we continuously monitor and upgrade our protection methods.
        </p>

        <p style={body}>
          If at anytime you wish to be completely removed from all over systems or if you just want to update any personal data we have about you or your business and then please contact us by any means.
        </p>

      </div>
    </main>
  );
}
