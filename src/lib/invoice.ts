import { jsPDF } from 'jspdf';
import { INVOICE_ISSUER, invoiceNumber } from './invoiceIssuer';

/**
 * Génération de la facture PDF d'une commande.
 *
 * `buildInvoice` est volontairement sans dépendance au DOM (hors jsPDF) pour
 * pouvoir être testée hors navigateur ; le chargement du logo, qui a besoin d'un
 * canvas, est isolé dans `downloadInvoice`.
 */

export type InvoiceData = {
  order: any;
  serviceTitle: string;
  sellerName: string;
  buyerName: string;
  buyerEmail?: string;
  isDuplicate?: boolean;
};

const NAVY = { r: 1, g: 17, b: 66 };       // frilya-900
const BLUE = { r: 2, g: 49, b: 189 };      // frilya-600
const GREY = { r: 100, g: 116, b: 139 };   // slate-500
const LIGHT = { r: 241, g: 245, b: 249 };  // slate-100

const euro = (value: number) =>
  `${Number(value || 0).toFixed(2).replace('.', ',')} €`;

const frDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente de paiement',
  in_progress: 'Payée — prestation en cours',
  delivered: 'Payée — livrée',
  completed: 'Payée — terminée',
  cancelled: 'Annulée',
  disputed: 'Payée — litige en cours'
};

export function buildInvoice(data: InvoiceData, logoDataUrl?: string): jsPDF {
  const { order, serviceTitle, sellerName, buyerName, buyerEmail, isDuplicate } = data;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const total = Number(order?.amount || 0);
  const fee = Number(order?.platform_fee || 0);
  const net = Math.max(total - fee, 0);
  const feePercent = net > 0 ? Math.round((fee / net) * 100) : 0;
  const snapshot = order?.package_snapshot || {};
  const isPaid = order?.status && order.status !== 'pending' && order.status !== 'cancelled';

  // ---------------- En-tête ----------------
  if (logoDataUrl) {
    try {
      // Pour éviter d'écraser le logo, on utilise un ratio plus naturel
      // La hauteur sera calculée proportionnellement à la largeur de 32mm
      // Ratio estimé d'après le logo Frilya
      doc.addImage(logoDataUrl, 'PNG', margin, 14, 32, 32 * 0.35);
    } catch {
      // logo indisponible : on continue sans
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  if (!logoDataUrl) doc.text(INVOICE_ISSUER.name.toUpperCase(), margin, 20);

  doc.setFontSize(20);
  doc.text('FACTURE', pageWidth - margin, 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  doc.text(`N° ${invoiceNumber(order)}`, pageWidth - margin, 28, { align: 'right' });
  doc.text(`Date d'émission : ${frDate(order?.paid_at || order?.created_at)}`, pageWidth - margin, 33, { align: 'right' });
  doc.text(`Commande du : ${frDate(order?.created_at)}`, pageWidth - margin, 38, { align: 'right' });

  // ---------------- Émetteur / client ----------------
  let y = 52;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(LIGHT.r, LIGHT.g, LIGHT.b);
  doc.roundedRect(margin, y, contentWidth / 2 - 3, 38, 2, 2, 'F');
  doc.roundedRect(margin + contentWidth / 2 + 3, y, contentWidth / 2 - 3, 38, 2, 2, 'F');

  const blockLines = (title: string, lines: string[], x: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(GREY.r, GREY.g, GREY.b);
    doc.text(title.toUpperCase(), x + 5, y + 7);

    doc.setFontSize(9);
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    doc.text(lines[0] || '', x + 5, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GREY.r, GREY.g, GREY.b);
    lines.slice(1).forEach((line, i) => {
      doc.text(line, x + 5, y + 20 + i * 4.5);
    });
  };

  blockLines('Émetteur', [
    INVOICE_ISSUER.legalName,
    INVOICE_ISSUER.address1,
    INVOICE_ISSUER.address2,
    `${INVOICE_ISSUER.siret}${INVOICE_ISSUER.vatNumber ? ` — TVA ${INVOICE_ISSUER.vatNumber}` : ''}`,
    INVOICE_ISSUER.email
  ], margin);

  blockLines('Facturé à', [
    buyerName || 'Client',
    buyerEmail || '',
    '',
    `Vendeur de la prestation : ${sellerName || '—'}`
  ], margin + contentWidth / 2 + 3);

  // ---------------- Tableau des lignes ----------------
  y += 50;

  const colDesc = margin + 4;
  const colQty = margin + contentWidth - 68;
  const colUnit = margin + contentWidth - 42;
  const colTotal = margin + contentWidth - 4;

  doc.setFillColor(NAVY.r, NAVY.g, NAVY.b);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Désignation', colDesc, y + 6);
  doc.text('Qté', colQty, y + 6, { align: 'right' });
  doc.text('P.U.', colUnit, y + 6, { align: 'right' });
  doc.text('Total', colTotal, y + 6, { align: 'right' });

  y += 9;

  const rows: { label: string; sub?: string; qty: number; unit: number; total: number }[] = [
    {
      label: serviceTitle || 'Prestation',
      sub: [
        snapshot.name ? `Formule : ${snapshot.name}` : null,
        snapshot.delivery_days ? `Livraison : ${snapshot.delivery_days} jour(s)` : null,
        typeof snapshot.revisions_included === 'number' ? `${snapshot.revisions_included} révision(s)` : null
      ].filter(Boolean).join('  •  ') || undefined,
      qty: 1,
      unit: net,
      total: net
    },
    {
      label: `Frais de service Frilya${feePercent ? ` (${feePercent} %)` : ''}`,
      sub: 'Mise en relation, paiement sécurisé et médiation',
      qty: 1,
      unit: fee,
      total: fee
    }
  ];

  doc.setFont('helvetica', 'normal');
  rows.forEach((row, index) => {
    const height = row.sub ? 15 : 11;
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, height, 'F');
    }

    doc.setFontSize(9.5);
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    const label = doc.splitTextToSize(row.label, colQty - colDesc - 6)[0];
    doc.text(label, colDesc, y + 7);

    if (row.sub) {
      doc.setFontSize(7.5);
      doc.setTextColor(GREY.r, GREY.g, GREY.b);
      doc.text(doc.splitTextToSize(row.sub, colQty - colDesc - 6)[0], colDesc, y + 12);
    }

    doc.setFontSize(9.5);
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    doc.text(String(row.qty), colQty, y + 7, { align: 'right' });
    doc.text(euro(row.unit), colUnit, y + 7, { align: 'right' });
    doc.text(euro(row.total), colTotal, y + 7, { align: 'right' });

    y += height;
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, margin + contentWidth, y);

  // ---------------- Totaux ----------------
  y += 8;
  const totalsX = margin + contentWidth - 78;

  const totalLine = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 9.5);
    doc.setTextColor(bold ? NAVY.r : GREY.r, bold ? NAVY.g : GREY.g, bold ? NAVY.b : GREY.b);
    doc.text(label, totalsX, y);
    doc.setTextColor(bold ? BLUE.r : NAVY.r, bold ? BLUE.g : NAVY.g, bold ? BLUE.b : NAVY.b);
    doc.text(value, colTotal, y, { align: 'right' });
    y += bold ? 8 : 6;
  };

  totalLine('Sous-total prestation', euro(net));
  totalLine('Frais de service', euro(fee));

  doc.setFillColor(LIGHT.r, LIGHT.g, LIGHT.b);
  doc.roundedRect(totalsX - 5, y - 5, contentWidth - (totalsX - margin) + 1, 12, 2, 2, 'F');
  y += 3;
  totalLine('TOTAL PAYÉ', euro(total), true);

  // ---------------- Paiement ----------------
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  doc.text('RÈGLEMENT', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  y += 6;
  doc.text(
    `Mode : ${order?.payment_method === 'balance' ? 'Solde du compte Frilya' : order?.payment_method === 'card' ? 'Carte bancaire (Stripe)' : 'Non précisé'}`,
    margin, y
  );
  y += 5;
  doc.text(`Statut : ${STATUS_LABELS[order?.status] || order?.status || '—'}`, margin, y);
  y += 5;
  doc.text(`Date de règlement : ${frDate(order?.paid_at)}`, margin, y);

  if (isPaid) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(5, 150, 105);
    doc.text('PAYÉE', colTotal, y - 5, { align: 'right' });
  }

  // ---------------- Mentions ----------------
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  const notes = [
    INVOICE_ISSUER.vatNote,
    'Frilya agit en qualité d\'intermédiaire : la prestation est réalisée par le vendeur indiqué ci-dessus.',
    'Le règlement est conservé sous séquestre et versé au vendeur après validation de la livraison par le client.',
    `Référence de commande : ${order?.id || '—'}`
  ];
  notes.forEach(note => {
    doc.splitTextToSize(note, contentWidth).forEach((line: string) => {
      doc.text(line, margin, y);
      y += 4;
    });
  });

  // ---------------- Pied de page ----------------
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 280, margin + contentWidth, 280);
  doc.setFontSize(7.5);
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  doc.text(
    `${INVOICE_ISSUER.legalName} — ${INVOICE_ISSUER.website} — ${INVOICE_ISSUER.email}`,
    pageWidth / 2, 286, { align: 'center' }
  );

  // ---------------- Filigrane (Dessiné en dernier pour être au-dessus du texte) ----------------
  if (isDuplicate) {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(80);
    doc.setFont('helvetica', 'bold');
    doc.text('DUPLICATA', pageWidth / 2, 140, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  }

  return doc;
}

/** Charge le logo en data URL (nécessaire à jsPDF) puis déclenche le téléchargement */
export async function downloadInvoice(data: InvoiceData) {
  let logoDataUrl: string | undefined;

  try {
    const { default: logoUrl } = await import('../assets/logo.png');
    logoDataUrl = await toDataUrl(logoUrl as string);
  } catch (err) {
    console.warn('Logo indisponible pour la facture :', err);
  }

  const doc = buildInvoice(data, logoDataUrl);
  doc.save(`${invoiceNumber(data.order)}${data.isDuplicate ? '_DUPLICATA' : ''}.pdf`);
}

/** Génère le PDF en base64 pour envoi par e-mail */
export async function generateInvoiceBase64(data: InvoiceData): Promise<string> {
  let logoDataUrl: string | undefined;
  try {
    const { default: logoUrl } = await import('../assets/logo.png');
    logoDataUrl = await toDataUrl(logoUrl as string);
  } catch (err) {
    console.warn('Logo indisponible pour la facture :', err);
  }

  const doc = buildInvoice(data, logoDataUrl);
  return doc.output('datauristring').split(',')[1];
}

function toDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas indisponible'));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Chargement du logo impossible'));
    img.src = url;
  });
}
