import nodemailer from 'nodemailer';

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false', // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.SMTP_FROM || "Celine's Bloemen <info@celinesbloemen.nl>";

export async function sendOrderConfirmation({
  to,
  customerName,
  orderNumber,
  items,
  total,
  deliveryMethod,
  deliveryDate,
}: {
  to: string;
  customerName: string;
  orderNumber: string;
  items: { name: string; size?: string; quantity: number; price: string }[];
  total: string;
  deliveryMethod: string;
  deliveryDate?: string;
}) {
  const transporter = getTransporter();

  const itemRows = items
    .map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #E3D4C6">${i.name}${i.size ? ` (${i.size})` : ''} &times; ${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #E3D4C6;text-align:right">${i.price}</td></tr>`)
    .join('');

  const deliveryInfo = deliveryMethod === 'pickup'
    ? 'Ophalen in de winkel — Langstraat 81, Arnemuiden'
    : deliveryMethod === 'local'
      ? `Lokale bezorging${deliveryDate ? ` op ${deliveryDate}` : ''}`
      : 'Verzending via PostNL';

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Bedankt voor je bestelling! (#${orderNumber})`,
    html: `
      <div style="font-family:'Outfit',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#2B0000">
        <div style="text-align:center;padding:32px 0 24px">
          <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:500;margin:0">Bedankt, ${customerName}!</h1>
          <p style="color:#2B0000aa;font-size:14px;margin-top:8px">Bestelling #${orderNumber}</p>
        </div>

        <div style="background:#F2E5D9;border-radius:16px;padding:24px;margin-bottom:24px">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            ${itemRows}
            <tr><td style="padding:12px 0 0;font-weight:600">Totaal</td><td style="padding:12px 0 0;text-align:right;font-weight:600;font-size:18px">${total}</td></tr>
          </table>
        </div>

        <div style="background:white;border:1px solid #E3D4C6;border-radius:16px;padding:20px;margin-bottom:24px;font-size:14px">
          <p style="margin:0 0 4px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#a06d69">Bezorging</p>
          <p style="margin:0;color:#2B0000cc">${deliveryInfo}</p>
        </div>

        <div style="text-align:center;padding:16px 0;font-size:13px;color:#2B0000aa">
          <p>Vragen? Stuur een berichtje via WhatsApp of mail.</p>
          <p style="margin-top:16px;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:16px;color:#a06d69">Puur natuur bloemwerk</p>
        </div>
      </div>
    `,
  });
}

export async function sendSubscriptionConfirmation({
  to,
  customerName,
  planType,
  planSize,
  frequency,
  price,
}: {
  to: string;
  customerName: string;
  planType: string;
  planSize: string;
  frequency: string;
  price: string;
}) {
  const transporter = getTransporter();

  const freqLabel: Record<string, string> = {
    weekly: 'Wekelijks',
    biweekly: 'Tweewekelijks',
    monthly: 'Maandelijks',
    quarterly: 'Per kwartaal',
    biannual: 'Per halfjaar',
    yearly: 'Per jaar',
  };

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Je bloemenabonnement is gestart!`,
    html: `
      <div style="font-family:'Outfit',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#2B0000">
        <div style="text-align:center;padding:32px 0 24px">
          <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:500;margin:0">Welkom, ${customerName}!</h1>
          <p style="color:#2B0000aa;font-size:14px;margin-top:8px">Je bloemenabonnement is actief</p>
        </div>

        <div style="background:#F2E5D9;border-radius:16px;padding:24px;margin-bottom:24px;font-size:14px">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#2B0000aa">Type</td><td style="text-align:right">${planType === 'fresh' ? 'Verse bloemen' : 'Kunstbloemen'}</td></tr>
            <tr><td style="padding:6px 0;color:#2B0000aa">Maat</td><td style="text-align:right">${planSize}</td></tr>
            <tr><td style="padding:6px 0;color:#2B0000aa">Frequentie</td><td style="text-align:right">${freqLabel[frequency] || frequency}</td></tr>
            <tr><td style="padding:10px 0 0;font-weight:600;border-top:1px solid #E3D4C6">Per levering</td><td style="padding:10px 0 0;text-align:right;font-weight:600;font-size:18px;border-top:1px solid #E3D4C6">${price}</td></tr>
          </table>
        </div>

        <div style="text-align:center;padding:16px 0;font-size:13px;color:#2B0000aa">
          <p>Wil je je abonnement pauzeren of aanpassen? Stuur even een berichtje!</p>
          <p style="margin-top:16px;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:16px;color:#a06d69">Puur natuur bloemwerk</p>
        </div>
      </div>
    `,
  });
}
