import type { DisplayMode, JobType } from '@/lib/constants';
import { JOB_TYPE_LABELS } from '@/lib/constants';

export type PdfParty = {
  name: string;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  siret?: string | null;
  vat_number?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
};

export type PdfLine = {
  label: string;
  qty: number;
  unit?: string | null;
  unit_price?: number | null;
};

export type PdfSection = {
  name: string;
  lines: PdfLine[];
};

export type PdfTotals = {
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  total_supplies_ht: number;
  total_labor_ht: number;
  total_travel_ht: number;
  deposit_percent?: number | null;
  deposit_amount?: number | null;
  remaining_amount?: number | null;
  vat_exempt?: boolean;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeText(value?: string | null) {
  if (!value) return '';
  return escapeHtml(value);
}

function safeTextWithBreaks(value?: string | null) {
  if (!value) return '';
  return escapeHtml(value).replace(/\n/g, '<br/>');
}

function formatMentions(value?: string | null) {
  if (!value) return '';
  return safeTextWithBreaks(value).replace(
    /Assurance décennale/gi,
    (match) => `<strong>${match}</strong>`
  );
}

function formatSectionTitle(value: string) {
  if (!value) return '';
  const spaced = value.replace(/\s*\/\s*/g, ' / ');
  return spaced.replace(/\bsejour\b/gi, (match) => {
    if (match === match.toUpperCase()) return 'SÉJOUR';
    if (match === match.toLowerCase()) return 'séjour';
    return 'Séjour';
  });
}

const baseStyles = `
  <style>
    @page { margin: 16mm; }
    :root {
      --accent: #1E3A8A;
      --text: #0F172A;
      --text-muted: #475569;
      --card-bg: #F8FAFC;
      --border: #E2E8F0;
    }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: var(--text); margin: 0; }
    .page { padding: 0; position: relative; }
    .watermark { position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); font-size: 96px; font-weight: 700; color: #0f172a; opacity: 0.04; pointer-events: none; letter-spacing: 0.08em; }
    .header { display: grid; grid-template-columns: 1.2fr 1fr 1.1fr; gap: 16px; align-items: start; border-left: 3px solid var(--accent); padding-left: 10px; }
    .header-center { text-align: center; }
    .doc-title { font-size: 22px; font-weight: 700; letter-spacing: 0.02em; color: var(--accent); }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 6px; }
    .brand { font-size: 18px; font-weight: 800; letter-spacing: 0.03em; white-space: nowrap; }
    .brand-subtitle { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .muted { color: var(--text-muted); font-size: 12px; }
    .doc-number { color: var(--accent); font-size: 12px; font-weight: 600; }
    .card { border: 1px solid var(--border); border-radius: 14px; padding: 8px 10px; background: var(--card-bg); }
    .card-strong { border: 1px solid var(--border); background: var(--card-bg); }
    .card-header { background: var(--card-bg); }
    .card-section { background: var(--card-bg); }
    .logo { width: 120px; height: 60px; object-fit: contain; display: block; margin-bottom: 10px; }
    .logo-placeholder { width: 120px; height: 60px; border: 1px dashed #cbd5e1; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; margin-bottom: 10px; }
    .center-logo { width: 140px; height: 70px; object-fit: contain; display: block; margin: 0 auto; }
    .center-logo-placeholder { width: 140px; height: 70px; border: 1px dashed #cbd5e1; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; margin: 0 auto; }
    .header-right { display: grid; gap: 10px; }
    .sections { margin-top: 18px; }
    .section { margin-top: 4px; break-inside: auto; page-break-inside: auto; }
    .section-header { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); font-weight: 700; margin-bottom: 8px; break-after: avoid; page-break-after: avoid; }
    .table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    .table thead { display: table-header-group; }
    .table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); background: #ffffff; padding: 6px 8px; border-bottom: 1px solid var(--border); }
    .table td { padding: 6px 8px; font-size: 12px; border-bottom: 1px solid var(--border); }
    .table tbody tr:nth-child(even) td { background: transparent; }
    .table tr { break-inside: avoid; page-break-inside: avoid; }
    .qty { text-align: right; white-space: nowrap; }
    .price { text-align: right; white-space: nowrap; }
    .totals { margin-top: 4px; }
    .totals-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; color: var(--text-muted); }
    .totals-strong { font-weight: 700; font-size: 16px; color: var(--accent); }
    .totals-highlight { margin-top: 8px; padding: 8px 10px; background: #ffffff; border: 1px solid var(--border); border-radius: 10px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: var(--card-bg); font-size: 11px; color: var(--text); margin-top: 6px; border: 1px solid var(--border); }
    .notes { margin-top: 6px; }
    .bottom-block { break-inside: auto; page-break-inside: auto; display: grid; gap: 6px; margin-top: 10px; }
    .bottom-core { break-inside: avoid; page-break-inside: avoid; display: grid; gap: 6px; }
    .bottom-tail { break-inside: avoid; page-break-inside: avoid; display: grid; gap: 6px; }
    .totals-card { break-inside: avoid; page-break-inside: avoid; break-before: avoid; page-break-before: avoid; }
    .mentions-card { break-inside: auto; page-break-inside: auto; margin-top: 0; font-size: 10px; line-height: 1.2; padding: 6px 10px; }
    .mentions-card strong { font-weight: 700; }
    .signature-card { break-inside: avoid; page-break-inside: avoid; margin-top: 10px; padding: 7px 10px; border: 2px solid var(--border); }
    .signature-row { display: grid; grid-template-columns: 40px 1.4fr 110px 2fr; align-items: center; gap: 10px; font-size: 11px; }
    .signature-line { border-bottom: 1px solid var(--text); height: 14px; }
  </style>
`;

function renderLogo(logoUrl?: string | null) {
  if (logoUrl) {
    return `<img class="logo" src="${safeText(logoUrl)}" alt="Logo" />`;
  }
  return `<div class="logo-placeholder">LOGO</div>`;
}

function renderCenterLogo(logoUrl?: string | null) {
  if (logoUrl) {
    return `<img class="center-logo" src="${safeText(logoUrl)}" alt="Logo" />`;
  }
  return `<div class="center-logo-placeholder">LOGO</div>`;
}

function formatBrandName(value?: string | null) {
  if (!value) return 'HG ELEC';
  const cleaned = value
    .replace(/auto[-\s]?entrepreneur/gi, ' ')
    .replace(/[|/]+/g, ' ')
    .replace(/-+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const finalValue = cleaned || value.trim();
  return finalValue.toUpperCase();
}

function renderCompanyCard(party: PdfParty) {
  const addressLine = safeText(party.address);
  const cityLine = [safeText(party.postal_code), safeText(party.city)]
    .filter(Boolean)
    .join(' ');
  const brandName = formatBrandName(party.name || 'HG ELEC');

  return `
    <div class="card card-header">
      <div class="label">Émetteur</div>
      <div class="brand">${safeText(brandName)}</div>
      <div class="brand-subtitle">Auto-entrepreneur</div>
      <div class="muted">${party.siret ? `SIRET: ${safeText(party.siret)}` : ''}</div>
      <div class="muted">${addressLine || ''}</div>
      <div class="muted">${cityLine || ''}</div>
      <div class="muted">${safeText(party.phone) || ''}</div>
      <div class="muted">${safeText(party.email) || ''}</div>
    </div>
  `;
}

function renderClientCard(party: PdfParty) {
  const addressLine = safeText(party.address);
  const cityLine = [safeText(party.postal_code), safeText(party.city)]
    .filter(Boolean)
    .join(' ');

  return `
    <div class="card card-header">
      <div class="label">Client</div>
      <div class="brand">${safeText(party.name)}</div>
      <div class="muted">${addressLine || ''}</div>
      <div class="muted">${cityLine || ''}</div>
      <div class="muted">${safeText(party.phone) || ''}</div>
      <div class="muted">${safeText(party.email) || ''}</div>
      <!-- TODO: Adresse chantier -->
    </div>
  `;
}

function renderLines(lines: PdfLine[], showPrices = false) {
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Désignation</th>
          <th class="qty">Quantité</th>
          ${showPrices ? '<th class="price">PU</th><th class="price">Prix total</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${lines
          .map((line) => {
            const unitPrice =
              typeof line.unit_price === 'number' && Number.isFinite(line.unit_price)
                ? line.unit_price
                : 0;
            const lineTotal = line.qty * unitPrice;
            return `
          <tr>
            <td>${safeText(line.label)}</td>
            <td class="qty">${line.qty} ${safeText(line.unit || '')}</td>
            ${
              showPrices
                ? `<td class="price">${unitPrice.toFixed(2)} EUR</td>
                   <td class="price">${lineTotal.toFixed(2)} EUR</td>`
                : ''
            }
          </tr>
        `;
          })
          .join('')}
      </tbody>
    </table>
  `;
}

function renderSections(sections: PdfSection[], showPrices = false) {
  const ordered = sections.filter((section) => section.lines.length > 0);

  if (ordered.length === 0) {
    return `
      <div class="section card">
        <div class="section-header">Aucune ligne</div>
        <div class="muted">Aucune ligne à afficher pour ce document.</div>
      </div>
    `;
  }

  return ordered
    .map(
      (section) => `
        <div class="section card card-section">
          <div class="section-header">${safeText(formatSectionTitle(section.name))}</div>
          ${renderLines(section.lines, showPrices)}
        </div>
      `
    )
    .join('');
}

function renderSummary(totals: PdfTotals, displayMode: DisplayMode) {
  const rows = [] as Array<{ label: string; value: number }>;
  if (displayMode === 'group_totals') {
    if (totals.total_supplies_ht > 0) rows.push({ label: 'Fournitures (HT)', value: totals.total_supplies_ht });
    if (totals.total_labor_ht > 0) rows.push({ label: 'Main d’œuvre (HT)', value: totals.total_labor_ht });
    if (totals.total_travel_ht > 0) rows.push({ label: 'Déplacement (HT)', value: totals.total_travel_ht });
  } else {
    rows.push({ label: 'Total global HT', value: totals.total_ht });
  }

  const hasDeposit =
    typeof totals.deposit_percent === 'number' &&
    totals.deposit_percent > 0 &&
    typeof totals.deposit_amount === 'number' &&
    typeof totals.remaining_amount === 'number';

  return `
    <div class="totals card card-strong totals-card">
      ${rows
        .map(
          (row) => `
        <div class="totals-row">
          <span>${row.label}</span>
          <span>${row.value.toFixed(2)} EUR</span>
        </div>
      `
        )
        .join('')}
      <div class="totals-row totals-strong totals-highlight">
        <span>Total TTC</span>
        <span>${totals.total_ttc.toFixed(2)} EUR</span>
      </div>
      ${
        hasDeposit
          ? `
        <div class="totals-row">
          <span>Acompte (${totals.deposit_percent}%)</span>
          <span>${totals.deposit_amount!.toFixed(2)} EUR</span>
        </div>
        <div class="totals-row">
          <span>Reste à payer</span>
          <span>${totals.remaining_amount!.toFixed(2)} EUR</span>
        </div>
      `
          : ''
      }
    </div>
  `;
}

function renderInvoiceTotals(totals: PdfTotals) {
  const rows = [] as Array<{ label: string; value: number }>;
  rows.push({ label: 'Total HT', value: totals.total_ht });
  if (!totals.vat_exempt && totals.total_tva > 0) {
    rows.push({ label: 'TVA', value: totals.total_tva });
  }
  const hasDeposit =
    typeof totals.deposit_percent === 'number' &&
    totals.deposit_percent > 0 &&
    typeof totals.deposit_amount === 'number' &&
    typeof totals.remaining_amount === 'number';

  return `
    <div class="totals card card-strong totals-card">
      ${rows
        .map(
          (row) => `
        <div class="totals-row">
          <span>${row.label}</span>
          <span>${row.value.toFixed(2)} EUR</span>
        </div>
      `
        )
        .join('')}
      ${
        hasDeposit
          ? `
      <div class="totals-row">
        <span>Total TTC</span>
        <span>${totals.total_ttc.toFixed(2)} EUR</span>
      </div>
      <div class="totals-row">
        <span>Acompte (${totals.deposit_percent}%)</span>
        <span>${totals.deposit_amount!.toFixed(2)} EUR</span>
      </div>
      <div class="totals-row totals-strong totals-highlight">
        <span>Reste à payer</span>
        <span>${totals.remaining_amount!.toFixed(2)} EUR</span>
      </div>
    `
          : `
      <div class="totals-row totals-strong totals-highlight">
        <span>Total TTC</span>
        <span>${totals.total_ttc.toFixed(2)} EUR</span>
      </div>
    `
      }
    </div>
  `;
}

function renderDocMeta(options: {
  number: string;
  issueDate: string;
  extraLine?: string | null;
  jobType?: JobType | null;
  docType?: string | null;
}) {
  const jobLabel = options.jobType
    ? safeText(JOB_TYPE_LABELS[options.jobType] || options.jobType)
    : '';
  const numberLine = options.docType
    ? `${safeText(options.docType)} N° ${safeText(options.number)}`
    : '';

  return `
    <div class="card card-header">
      <div class="label">Infos document</div>
      ${numberLine ? `<div class="doc-number">${numberLine}</div>` : ''}
      <div class="muted">Date : ${safeText(options.issueDate)}</div>
      ${options.extraLine ? `<div class="muted">${safeText(options.extraLine)}</div>` : ''}
      ${jobLabel ? `<div class="muted">Chantier : ${jobLabel}</div>` : ''}
      <!-- TODO: Adresse chantier -->
    </div>
  `;
}

export function renderQuotePdf({
  tenant,
  customer,
  number,
  issue_date,
  valid_until,
  sections,
  totals,
  display_mode,
  job_type,
  notes,
  mentions,
  signature,
  show_prices,
}: {
  tenant: PdfParty;
  customer: PdfParty;
  number: string;
  issue_date: string;
  valid_until?: string | null;
  sections: PdfSection[];
  totals: PdfTotals;
  display_mode: DisplayMode;
  job_type?: JobType | null;
  notes?: string | null;
  mentions?: string | null;
  signature?: string | null;
  show_prices?: boolean | null;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        ${baseStyles}
      </head>
      <body>
        <div class="watermark">DEVIS</div>
        <div class="page">
          <div class="header">
            <div class="header-left">
              ${renderCompanyCard(tenant)}
            </div>
            <div class="header-center">
              ${renderCenterLogo(tenant.logo_url)}
            </div>
            <div class="header-right">
              ${renderDocMeta({
                number,
                issueDate: issue_date,
                extraLine: valid_until ? `Valable jusqu'au : ${valid_until}` : null,
                jobType: job_type || null,
                docType: 'Devis',
              })}
              ${renderClientCard(customer)}
            </div>
          </div>

          <div class="sections">
            ${renderSections(sections, Boolean(show_prices))}
          </div>

          ${
            notes
              ? `<div class="notes card"><div class="label">Notes</div>${safeTextWithBreaks(notes)}</div>`
              : ''
          }

          <div class="bottom-block">
            <div class="bottom-core">
              ${renderSummary(totals, display_mode)}
            </div>
            ${
              signature || mentions
                ? `<div class="bottom-tail">
                    ${
                      signature
                        ? `<div class="notes card signature-card">
                            <div class="label">${safeText(signature)}</div>
                            <div class="signature-row">
                              <span>Date</span>
                              <span class="signature-line"></span>
                              <span>Signature du client</span>
                              <span class="signature-line"></span>
                            </div>
                          </div>`
                        : ''
                    }
                    ${
                      mentions
                        ? `<div class="notes card mentions-card"><div class="mentions">${formatMentions(mentions)}</div></div>`
                        : ''
                    }
                  </div>`
                : ''
            }
          </div>
        </div>
      </body>
    </html>
  `;
}

export function renderInvoicePdf({
  tenant,
  customer,
  number,
  issue_date,
  due_date,
  sections,
  totals,
  job_type,
  mentions,
  show_prices,
}: {
  tenant: PdfParty;
  customer: PdfParty;
  number: string;
  issue_date: string;
  due_date?: string | null;
  sections: PdfSection[];
  totals: PdfTotals;
  job_type?: JobType | null;
  mentions?: string | null;
  show_prices?: boolean | null;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        ${baseStyles}
      </head>
      <body>
        <div class="watermark">FACTURE</div>
        <div class="page">
          <div class="header">
            <div class="header-left">
              ${renderCompanyCard(tenant)}
            </div>
            <div class="header-center">
              ${renderCenterLogo(tenant.logo_url)}
            </div>
            <div class="header-right">
              ${renderDocMeta({
                number,
                issueDate: issue_date,
                extraLine: due_date ? `Echeance : ${due_date}` : null,
                jobType: job_type || null,
                docType: 'Facture',
              })}
              ${renderClientCard(customer)}
            </div>
          </div>

          <div class="sections">
            ${renderSections(sections, Boolean(show_prices))}
          </div>

          <div class="bottom-block">
            <div class="bottom-core">
              ${renderInvoiceTotals(totals)}
            </div>
            ${
              mentions
                ? `<div class="bottom-tail">
                    <div class="notes card mentions-card"><div class="mentions">${formatMentions(mentions)}</div></div>
                  </div>`
                : ''
            }
          </div>
        </div>
      </body>
    </html>
  `;
}
