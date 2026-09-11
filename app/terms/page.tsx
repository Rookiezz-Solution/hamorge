const body: React.CSSProperties = {
  fontFamily: 'var(--font-inter)', fontSize: 'clamp(10px, 2.6vw, 12px)', color: '#333', lineHeight: 1.75, marginBottom: 20,
};
const heading: React.CSSProperties = {
  fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 700, color: '#000', marginBottom: 12, marginTop: 32,
};

export default function TermsPage() {
  return (
    <main style={{ paddingTop: 'clamp(80px, 18vw, 140px)', minHeight: '100vh', background: '#fff' }}>
      <div style={{ paddingLeft: '4%', paddingRight: '4%', paddingBottom: 80 }}>

        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#000', marginBottom: 20 }}>
          TERMS AND CONDITIONS
        </p>

        <p style={body}>
          Thank you for visiting HAM ORGE PRIVATE LIMITED. By accessing our website or purchasing from us. You agree to the terms listed below. This terms and conditions govern your use of our service and define the responsibilities between you and HAM ORGE.
        </p>
        <p style={body}>
          Any images data are file uploaded on the website must not be used without the consent of the authorised personnel of the brand
        </p>
        <p style={body}>
          All products showcased on our platform or subject to availability. Prices may changed due to the production costs, logistics, seasonal updates or promotions. Orders placed cannot demand price adjustment after completion of payment. We ship across India through trusted delivery partners. Delivery time varies according to customer location. Unexpected dealers caused by courier, government restrictions, weather or transport issues are beyond our control.
        </p>
        <p style={body}>
          Returns and exchanges are accepted only under our official policy. Product must be unused unwashed and returned with original packaging and tags. Items purchased on or clearance may not be eligible for return. For detailed process, propose to our return and refund policy page.
        </p>
        <p style={body}>
          HAM ORGE it&apos;s not responsible for damages caused by misuse of products, improper washing
        </p>

        <p style={heading}>SCAM AWARENESS</p>
        <p style={body}>
          HAM ORGE PRIVATE LIMITED never requests customers to make additional payments or share sensitive financial information through phone calls, WhatsApp, SMS, or social media messages after an order have placed. Please stay alert and avoid responding to any suspicious communication that claims to represent HAM ORGE and demands advance payment, OTP, bank details, or card information.
        </p>
        <p style={body}>
          Your safety is important to us. If you need support from our official team, please contact us only through our verified platforms mentioned on our website.
        </p>

        <p style={heading}>DISCLAIMER</p>
        <p style={body}>
          HAM ORGE PRIVATE LIMITED reserve you right to upload our change these term policy at anytime without prior notice. Continused use of our website or service means you accept the revised terms. While we take reasonable steps to protect your information we cannot guarantee completely security against cyber risks, and you are not liable for any loss caused by unauthorised access or technical issues.
        </p>
        <p style={body}>
          If you not agree with any part of these terms, you may terminate your use of the website immediately.
        </p>

      </div>
    </main>
  );
}
