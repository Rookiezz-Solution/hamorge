import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Shipping & Returns', description: 'HAM ORGE shipping, return and refund policy.' };

const S = {
  title: { fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: '#000', marginBottom: 10 } as React.CSSProperties,
  body:  { fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#333', lineHeight: 1.7, marginBottom: 28 } as React.CSSProperties,
};

export default function ShippingPage() {
  return (
    <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>

        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#000', marginBottom: 36 }}>
          RETURN, SHIPPING &amp; REFUND POLICY
        </p>

        <p style={S.title}>Shipping</p>
        <p style={S.body}>
          We ship all orders within 24-48 hours<br />
          Delivery usually takes 3- 5 working days, depending on your location
        </p>

        <p style={S.title}>Retrun policy</p>
        <p style={S.body}>
          We offer a 30 days return policy from the date of delivery. You can retrun your product if, you received a damaged or defective item, The size is not fitting, The product delivered is wrong (different design/colour)
        </p>

        <p style={S.title}>To be eligible for a return</p>
        <p style={S.body}>
          The product must be unused, unwasted and in original condition. All tags and packaging should be intact.
        </p>

        <p style={S.title}>Return process and Refunds</p>
        <p style={S.body}>
          You can place your return request in our website. Refund will be issued to your original payment method upi card within 3-7 working day after we receive the return product
        </p>

        <p style={S.title}>Non-Returnable items</p>
        <p style={S.body}>
          Used, washed or damaged products ( after use ). Items without original tags. Clearance sale products
        </p>

        <p style={S.title}>Exchange</p>
        <p style={S.body}>
          If you want to change size/design, we offer free exchange within 30 days ( one time only)
        </p>

      </div>
    </main>
  );
}
