import nodemailer from 'nodemailer';
import { siteConfig } from '../config';

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

const FROM = process.env.SMTP_FROM || `${siteConfig.name} <${siteConfig.email}>`;

const SERIF = "font-family:'Cormorant Garamond',Georgia,serif";
const SANS = "font-family:'Outfit',Helvetica,Arial,sans-serif";

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function shell(title: string, subtitle: string, body: string): string {
  return `
    <div style="${SANS};max-width:560px;margin:0 auto;color:#2B0000">
      <div style="text-align:center;padding:32px 0 24px">
        <h1 style="${SERIF};font-size:28px;font-weight:500;margin:0">${title}</h1>
        <p style="color:#2B0000aa;font-size:14px;margin-top:8px">${subtitle}</p>
      </div>
      ${body}
      <div style="text-align:center;padding:16px 0;font-size:13px;color:#2B0000aa">
        <p>Vragen? Stuur een berichtje via WhatsApp of mail naar ${esc(siteConfig.email)}.</p>
        <p style="margin-top:4px">${esc(siteConfig.name)} · ${esc(siteConfig.address.street)}, ${esc(siteConfig.address.postalCode)} ${esc(siteConfig.address.city)}</p>
        <p style="margin-top:16px;${SERIF};font-style:italic;font-size:16px;color:#a06d69">Bloemen voor de mooiste momenten</p>
      </div>
    </div>`;
}

const row = (label: string, value: string, strong = false) =>
  `<tr><td style="padding:6px 0;color:#2B0000aa${strong ? ';font-weight:600;color:#2B0000' : ''}">${label}</td><td style="text-align:right${strong ? ';font-weight:600' : ''}">${value}</td></tr>`;

export interface OrderMailData {
  to: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string | null;
  orderNumber: string;
  items: { name: string; size?: string; quantity: number; price: string }[];
  subtotal: string;
  deliveryCost: string;
  total: string;
  deliveryMethod: string;      // 'pickup' | 'local' | 'shipping'
  deliveryDate?: string | null;
  deliveryRegion?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  paymentMethod?: string | null; // 'in_store' als er bij ophalen betaald wordt
  customerNote?: string | null;
}

function deliveryText(d: OrderMailData): string {
  if (d.deliveryMethod === 'pickup') {
    return `Ophalen in de winkel, ${siteConfig.address.street} in ${siteConfig.address.city}`;
  }
  const addr = [d.address, [d.postalCode, d.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  if (d.deliveryMethod === 'local') {
    return `Bezorgen${d.deliveryDate ? ` op ${esc(d.deliveryDate)}` : ''}${d.deliveryRegion ? ` (${esc(d.deliveryRegion)})` : ''}<br>${esc(addr)}`;
  }
  return `Verzending per post<br>${esc(addr)}`;
}

function orderTable(d: OrderMailData): string {
  const lines = d.items
    .map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #E3D4C6">${esc(i.name)}${i.size ? ` (${esc(i.size)})` : ''} &times; ${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #E3D4C6;text-align:right">${esc(i.price)}</td></tr>`)
    .join('');
  const delivery = parseFloat(d.deliveryCost.replace('€', '').replace(',', '.')) > 0
    ? row('Bezorgkosten', esc(d.deliveryCost))
    : '';
  return `
    <div style="background:#F2E5D9;border-radius:16px;padding:24px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${lines}
        ${row('Subtotaal', esc(d.subtotal))}
        ${delivery}
        <tr><td style="padding:12px 0 0;font-weight:600">Totaal</td><td style="padding:12px 0 0;text-align:right;font-weight:600;font-size:18px">${esc(d.total)}</td></tr>
        <tr><td colspan="2" style="padding:4px 0 0;font-size:11px;color:#2B0000aa;text-align:right">Alle bedragen zijn inclusief btw</td></tr>
      </table>
    </div>`;
}

/** Bevestiging aan de klant, voor online betaald én voor betalen-in-de-winkel. */
export async function sendOrderConfirmation(d: OrderMailData) {
  const inStore = d.paymentMethod === 'in_store';
  const body = `
    ${orderTable(d)}
    <div style="background:white;border:1px solid #E3D4C6;border-radius:16px;padding:20px;margin-bottom:24px;font-size:14px">
      <p style="margin:0 0 4px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#a06d69">Bezorging</p>
      <p style="margin:0;color:#2B0000cc">${deliveryText(d)}</p>
      ${inStore ? `<p style="margin:12px 0 0;color:#2B0000cc">Je betaalt bij het ophalen in de winkel. Je bestelling ligt klaar zodra ik hem heb gemaakt.</p>` : ''}
    </div>`;
  await getTransporter().sendMail({
    from: FROM,
    to: d.to,
    subject: inStore ? `Je bestelling is geplaatst (#${d.orderNumber})` : `Bedankt voor je bestelling! (#${d.orderNumber})`,
    html: shell(`Bedankt, ${esc(d.customerName)}!`, `Bestelling #${esc(d.orderNumber)}`, body),
  });
}

/** Seintje naar Celine: nieuwe bestelling. Bevat alles om direct aan de slag te kunnen. */
export async function sendOwnerOrderNotification(to: string, d: OrderMailData) {
  const inStore = d.paymentMethod === 'in_store';
  const body = `
    <div style="background:white;border:1px solid #E3D4C6;border-radius:16px;padding:20px;margin-bottom:24px;font-size:14px">
      <table style="width:100%;border-collapse:collapse">
        ${row('Klant', esc(d.customerName))}
        ${row('E-mail', `<a href="mailto:${esc(d.customerEmail)}">${esc(d.customerEmail)}</a>`)}
        ${d.customerPhone ? row('Telefoon', esc(d.customerPhone)) : ''}
        ${row('Betaling', inStore ? 'Betaalt in de winkel bij ophalen' : 'Online betaald via Mollie')}
        ${row('Bezorging', deliveryText(d))}
        ${d.customerNote ? row('Opmerking', `<em>${esc(d.customerNote)}</em>`) : ''}
      </table>
    </div>
    ${orderTable(d)}
    <p style="text-align:center;font-size:13px"><a href="${siteConfig.url}/admin#orders" style="color:#a06d69">Open het beheer</a></p>`;
  await getTransporter().sendMail({
    from: FROM,
    to,
    replyTo: d.customerEmail,
    subject: `${inStore ? 'Nieuwe bestelling (betaalt in winkel)' : 'Nieuwe betaalde bestelling'} #${d.orderNumber} · ${d.total}`,
    html: shell('Nieuwe bestelling', `#${esc(d.orderNumber)}`, body),
  });
}

export interface SubscriptionMailData {
  to: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string | null;
  planType: string;
  planSize: string;
  frequency: string;
  price: string;
  vaseIncluded?: boolean;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  colorPreference?: string | null;
  customerNote?: string | null;
}

const FREQ_LABEL: Record<string, string> = {
  weekly: 'Wekelijks',
  biweekly: 'Per 2 weken',
  triweekly: 'Per 3 weken',
  monthly: 'Per maand',
  quarterly: 'Per kwartaal',
  biannual: 'Per halfjaar',
  yearly: 'Per jaar',
};

function subscriptionTable(d: SubscriptionMailData): string {
  return `
    <div style="background:#F2E5D9;border-radius:16px;padding:24px;margin-bottom:24px;font-size:14px">
      <table style="width:100%;border-collapse:collapse">
        ${row('Type', d.planType === 'fresh' ? 'Verse bloemen' : 'Kunstbloemen')}
        ${row('Maat', esc(d.planSize))}
        ${row('Frequentie', esc(FREQ_LABEL[d.frequency] || d.frequency))}
        ${row('Vaas', d.vaseIncluded ? 'In vaas geleverd (wordt geruild)' : 'Zonder vaas')}
        <tr><td style="padding:10px 0 0;font-weight:600;border-top:1px solid #E3D4C6">Per levering</td><td style="padding:10px 0 0;text-align:right;font-weight:600;font-size:18px;border-top:1px solid #E3D4C6">${esc(d.price)}</td></tr>
        <tr><td colspan="2" style="padding:4px 0 0;font-size:11px;color:#2B0000aa;text-align:right">Inclusief btw</td></tr>
      </table>
    </div>`;
}

export async function sendSubscriptionConfirmation(d: SubscriptionMailData) {
  const body = `
    ${subscriptionTable(d)}
    <div style="text-align:center;font-size:13px;color:#2B0000aa">
      <p>Wil je je abonnement pauzeren of aanpassen? Stuur even een berichtje!</p>
    </div>`;
  await getTransporter().sendMail({
    from: FROM,
    to: d.to,
    subject: 'Je bloemenabonnement is gestart!',
    html: shell(`Welkom, ${esc(d.customerName)}!`, 'Je bloemenabonnement is actief', body),
  });
}

export async function sendOwnerSubscriptionNotification(to: string, d: SubscriptionMailData) {
  const addr = [d.address, [d.postalCode, d.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const body = `
    <div style="background:white;border:1px solid #E3D4C6;border-radius:16px;padding:20px;margin-bottom:24px;font-size:14px">
      <table style="width:100%;border-collapse:collapse">
        ${row('Klant', esc(d.customerName))}
        ${row('E-mail', `<a href="mailto:${esc(d.customerEmail)}">${esc(d.customerEmail)}</a>`)}
        ${d.customerPhone ? row('Telefoon', esc(d.customerPhone)) : ''}
        ${row('Bezorgadres', esc(addr))}
        ${d.colorPreference ? row('Kleurvoorkeur', esc(d.colorPreference)) : ''}
        ${d.customerNote ? row('Opmerking', `<em>${esc(d.customerNote)}</em>`) : ''}
      </table>
    </div>
    ${subscriptionTable(d)}
    <p style="text-align:center;font-size:13px"><a href="${siteConfig.url}/admin#subscriptions" style="color:#a06d69">Open het beheer</a></p>`;
  await getTransporter().sendMail({
    from: FROM,
    to,
    replyTo: d.customerEmail,
    subject: `Nieuw bloemenabonnement · ${d.planSize} · ${d.price} ${FREQ_LABEL[d.frequency]?.toLowerCase() || ''}`,
    html: shell('Nieuw abonnement', 'De eerste betaling is binnen', body),
  });
}

/** Terugkerende incasso binnen (of mislukt): Celine weet dat er een levering aankomt. */
export async function sendOwnerSubscriptionPayment(to: string, d: SubscriptionMailData, paymentStatus: string) {
  const ok = paymentStatus === 'paid';
  const addr = [d.address, [d.postalCode, d.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const body = `
    <div style="background:${ok ? '#eef6ee' : '#fdecec'};border-radius:16px;padding:20px;margin-bottom:24px;font-size:14px;text-align:center">
      ${ok
        ? `<strong>Incasso van ${esc(d.price)} is binnen.</strong><br>Tijd om het volgende boeket voor ${esc(d.customerName)} te maken.`
        : `<strong>Incasso van ${esc(d.price)} is mislukt (${esc(paymentStatus)}).</strong><br>Neem contact op met ${esc(d.customerName)} voordat je bezorgt. Mollie probeert het niet automatisch opnieuw.`}
    </div>
    <div style="background:white;border:1px solid #E3D4C6;border-radius:16px;padding:20px;margin-bottom:24px;font-size:14px">
      <table style="width:100%;border-collapse:collapse">
        ${row('Klant', esc(d.customerName))}
        ${row('E-mail', `<a href="mailto:${esc(d.customerEmail)}">${esc(d.customerEmail)}</a>`)}
        ${d.customerPhone ? row('Telefoon', esc(d.customerPhone)) : ''}
        ${row('Bezorgadres', esc(addr))}
        ${d.colorPreference ? row('Kleurvoorkeur', esc(d.colorPreference)) : ''}
        ${d.customerNote ? row('Opmerking', `<em>${esc(d.customerNote)}</em>`) : ''}
      </table>
    </div>
    ${subscriptionTable(d)}
    <p style="text-align:center;font-size:13px"><a href="${siteConfig.url}/admin#subscriptions" style="color:#a06d69">Open het beheer</a></p>`;
  await getTransporter().sendMail({
    from: FROM,
    to,
    replyTo: d.customerEmail,
    subject: ok
      ? `Abonnement: levering maken voor ${d.customerName} (${d.planSize})`
      : `Abonnement: incasso mislukt bij ${d.customerName}`,
    html: shell(ok ? 'Nieuwe levering' : 'Incasso mislukt', `Abonnement ${esc(d.planSize)} · ${esc(FREQ_LABEL[d.frequency] || d.frequency)}`, body),
  });
}
