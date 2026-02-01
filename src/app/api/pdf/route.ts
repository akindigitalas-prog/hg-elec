import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import { existsSync } from 'fs';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateTotals } from '@/lib/calc';
import { renderInvoicePdf, renderQuotePdf, type PdfSection } from '@/lib/pdf/templates';

export const runtime = 'nodejs';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function generatePdf(html: string, footerRight?: string) {
  const { chromium: playwrightChromium } = await import('playwright-core');

  const envExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  const candidates: Array<{ path: string; args?: string[]; headless?: boolean }> = [];

  if (envExecutable) {
    candidates.push({ path: envExecutable, args: [], headless: true });
  }

  if (isServerless) {
    const serverlessPath = await chromium.executablePath();
    if (serverlessPath) {
      const chromiumHeadless =
        (chromium as { headless?: boolean }).headless ?? true;
      candidates.push({
        path: serverlessPath,
        args: chromium.args,
        headless: chromiumHeadless,
      });
    }
  }

  if (!isServerless) {
    candidates.push(
      { path: 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe' },
      { path: 'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe' },
      { path: 'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe' },
      { path: 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe' }
    );
  }

  const resolved = candidates.find((candidate) => candidate.path && existsSync(candidate.path));

  if (!resolved) {
    throw new Error(
      'Chromium introuvable. Installez Chrome/Edge ou definissez PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.'
    );
  }

  const browser = await playwrightChromium.launch({
    args: resolved.args ?? [],
    executablePath: resolved.path,
    headless: resolved.headless ?? true,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  const rightText = footerRight ? escapeHtml(footerRight) : '';
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate:
      `<div style="font-size:10px;color:#64748b;width:100%;padding:0 16mm;display:flex;justify-content:space-between;align-items:center;">
        <div>HG ELEC &mdash; Page <span class='pageNumber'></span> / <span class='totalPages'></span></div>
        <div style="text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%;">${rightText}</div>
      </div>`,
    margin: { top: '16mm', bottom: '14mm', left: '16mm', right: '16mm' },
  });
  await browser.close();

  return pdf;
}

function buildPdfSections(
  items: Array<{
    label: string;
    qty: number;
    unit?: string | null;
    unit_price?: number | null;
    section_id?: string | null;
  }>,
  sections: Array<{ id: string; name: string }>
): PdfSection[] {
  const sectionMap = new Map<string, PdfSection>();
  sections.forEach((section) => {
    sectionMap.set(section.id, { name: section.name, lines: [] });
  });

  const generalLines: Array<{
    label: string;
    qty: number;
    unit?: string | null;
    unit_price?: number | null;
  }> = [];

  items.forEach((item) => {
    const line = {
      label: item.label,
      qty: item.qty,
      unit: item.unit,
      unit_price: item.unit_price ?? null,
    };
    if (item.section_id && sectionMap.has(item.section_id)) {
      sectionMap.get(item.section_id)!.lines.push(line);
    } else {
      generalLines.push(line);
    }
  });

  const result: PdfSection[] = [];
  if (generalLines.length > 0 || sections.length === 0) {
    result.push({ name: 'General', lines: generalLines });
  }

  sections.forEach((section) => {
    const entry = sectionMap.get(section.id);
    if (entry && entry.lines.length > 0) {
      result.push(entry);
    }
  });

  return result;
}

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
  }

  const { data: profile } = await authClient
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json(
      { error: 'type et id requis' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  if (type === 'quote') {
    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*, customers(*)')
      .eq('id', id)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 });
    }

    if (quote.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { data: quoteItems } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order', { ascending: true });

    const { data: quoteSections } = await supabase
      .from('quote_sections')
      .select('id, name')
      .eq('quote_id', id)
      .order('sort_order', { ascending: true });

    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', quote.tenant_id)
      .single();

    const lines = (quoteItems || []).map((item: any) => ({
      label: item.label,
      qty: item.qty,
      unit: item.unit,
      unit_price: Number(item.internal_unit_price ?? 0),
      item_type: item.item_type || 'fourniture',
      internal_unit_price: Number(item.internal_unit_price ?? 0),
      vat_rate: item.vat_rate,
      section_id: item.section_id || null,
    }));

    const vatExempt = Boolean(tenant?.vat_exempt);
    const rawTotals = quote.totals?.total_ht
      ? quote.totals
      : calculateTotals(
          lines.map((line) => ({
            qty: line.qty,
            internal_unit_price: line.internal_unit_price,
            vat_rate: line.vat_rate,
            item_type: line.item_type,
          })),
          { vatExempt }
        );
    const totals = vatExempt
      ? { ...rawTotals, total_tva: 0, total_ttc: rawTotals.total_ht }
      : rawTotals;
    const totalsFinal = { ...totals, vat_exempt: vatExempt };

    const depositPercent =
      typeof quote.deposit_percent === 'number'
        ? quote.deposit_percent
        : typeof tenant?.deposit_percent === 'number'
        ? tenant.deposit_percent
        : null;
    const depositAmount =
      typeof depositPercent === 'number' && depositPercent > 0
        ? Number(((totalsFinal.total_ttc * depositPercent) / 100).toFixed(2))
        : null;
    const remainingAmount =
      typeof depositAmount === 'number'
        ? Number((totalsFinal.total_ttc - depositAmount).toFixed(2))
        : null;
    const totalsWithDeposit =
      typeof depositPercent === 'number' && depositPercent > 0 && depositAmount !== null
        ? {
            ...totalsFinal,
            deposit_percent: depositPercent,
            deposit_amount: depositAmount,
            remaining_amount: remainingAmount,
          }
        : totalsFinal;

    const sections = buildPdfSections(
      lines,
      (quoteSections || []).map((section: any) => ({
        id: section.id,
        name: section.name,
      }))
    );

    const mentionParts: string[] = [];
    const addMention = (text: string, match?: RegExp | string) => {
      const haystack = mentionParts.join('\n').toLowerCase();
      if (match) {
        if (typeof match === 'string') {
          if (haystack.includes(match.toLowerCase())) return;
        } else if (match.test(haystack)) {
          return;
        }
      } else if (haystack.includes(text.toLowerCase())) {
        return;
      }
      mentionParts.push(text);
    };

    if (tenant?.pdf_terms) {
      mentionParts.push(tenant.pdf_terms);
    }
    if (tenant?.vat_exempt) {
      addMention(
        tenant?.vat_exempt_mention || 'TVA non applicable - article 293 B du CGI.',
        /tva non applicable|293 b/i
      );
    }

    addMention(
      `Devis valable 30 jours à compter de sa date d’émission.`,
      /devis valable\s*30\s*jours/i
    );

    const paymentPercent =
      typeof depositPercent === 'number' && depositPercent > 0 ? depositPercent : 30;
    const paymentPct = Number.isInteger(paymentPercent)
      ? paymentPercent
      : Number(paymentPercent.toFixed(1));
    addMention(
      `Modalités de paiement :\nAcompte de ${paymentPct}% à la commande.\nSolde payable à la fin des travaux, à réception de la facture.`,
      /modalit[eé]s de paiement|acompte de/i
    );

    addMention(
      `Les travaux débuteront après acceptation du devis et réception de l’acompte.`,
      /travaux débuteront|acceptation du devis/i
    );

    addMention(
      `Toute prestation non prévue dans le présent devis fera l’objet d’un devis complémentaire.`,
      /prestation non prévue|devis complémentaire/i
    );
    if (tenant?.insurance_name || tenant?.insurance_origin || tenant?.insurance_contract) {
      const insuranceLine = [tenant?.insurance_name, tenant?.insurance_origin]
        .filter(Boolean)
        .join(' - ');
      const contractLine = tenant?.insurance_contract
        ? `Contrat n° ${tenant.insurance_contract}`
        : '';
      mentionParts.push(
        `Assurance décennale :\n${insuranceLine || 'Non renseignée'}${contractLine ? `\n${contractLine}` : ''}`
      );
    }
    const mentions = mentionParts.filter(Boolean).join('\n');

    const html = renderQuotePdf({
      tenant: {
        name: tenant?.name || 'Entreprise',
        address: tenant?.address || null,
        city: tenant?.city || null,
        postal_code: tenant?.postal_code || null,
        country: tenant?.country || null,
        siret: tenant?.siret || null,
        vat_number: tenant?.vat_number || null,
        phone: tenant?.phone || null,
        email: tenant?.email || null,
        logo_url: tenant?.logo_url || null,
      },
      customer: {
        name: quote.customers?.name || 'Client',
        address: quote.customers?.address || null,
        postal_code: quote.customers?.postal_code || null,
        city: quote.customers?.city || null,
        email: quote.customers?.email || null,
        phone: quote.customers?.phone || null,
      },
      number: quote.number,
      issue_date: quote.issue_date,
      valid_until: quote.valid_until,
      sections,
      totals: totalsWithDeposit,
      display_mode: quote.display_mode || tenant?.client_display_mode || 'total_only',
      job_type: quote.job_type || null,
      notes: quote.notes,
      mentions: mentions || null,
      signature: 'Bon pour accord',
      show_prices: quote.show_prices ?? false,
    });

    const footerRight = `${tenant?.name || 'HG ELEC'} / ${quote.customers?.name || 'Client'} / ${quote.number}`;
    const pdf = await generatePdf(html, footerRight);
    const body = new Uint8Array(pdf);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quote.number}.pdf"`,
      },
    });
  }

  if (type === 'invoice') {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, customers(*)')
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 });
    }

    if (invoice.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { data: invoiceItems } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order', { ascending: true });

    const { data: invoiceSections } = await supabase
      .from('invoice_sections')
      .select('id, name')
      .eq('invoice_id', id)
      .order('sort_order', { ascending: true });

    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', invoice.tenant_id)
      .single();

    const lines = (invoiceItems || []).map((item: any) => ({
      label: item.label,
      qty: item.qty,
      unit: item.unit,
      unit_price: Number(item.internal_unit_price ?? 0),
      internal_unit_price: Number(item.internal_unit_price ?? 0),
      vat_rate: item.vat_rate,
      item_type: item.item_type || 'fourniture',
      section_id: item.section_id || null,
    }));

    const vatExempt = Boolean(tenant?.vat_exempt);
    const rawTotals = invoice.totals?.total_ht
      ? invoice.totals
      : calculateTotals(
          lines.map((line) => ({
            qty: line.qty,
            internal_unit_price: line.internal_unit_price,
            vat_rate: line.vat_rate,
            item_type: line.item_type,
          })),
          { vatExempt }
        );
    const totals = vatExempt
      ? { ...rawTotals, total_tva: 0, total_ttc: rawTotals.total_ht }
      : rawTotals;
    const totalsFinal = { ...totals, vat_exempt: vatExempt };

    const sections = buildPdfSections(
      lines,
      (invoiceSections || []).map((section: any) => ({
        id: section.id,
        name: section.name,
      }))
    );

    let depositPercent: number | null = null;
    let sourceQuote:
      | { deposit_percent?: number | null; number?: string | null; accepted_at?: string | null; status?: string | null }
      | null = null;
    const applyDeposit = invoice.kind !== 'deposit';
    if (invoice.quote_id) {
      const { data } = await supabase
        .from('quotes')
        .select('deposit_percent, number, accepted_at, status')
        .eq('id', invoice.quote_id)
        .maybeSingle();
      sourceQuote = data;
      if (applyDeposit) {
        if (typeof data?.deposit_percent === 'number') {
          depositPercent = data.deposit_percent;
        } else if (typeof tenant?.deposit_percent === 'number') {
          depositPercent = tenant.deposit_percent;
        }
      }
    }

    const depositAmount =
      typeof depositPercent === 'number' && depositPercent > 0
        ? Number(((totalsFinal.total_ttc * depositPercent) / 100).toFixed(2))
        : null;
    const remainingAmount =
      typeof depositAmount === 'number'
        ? Number((totalsFinal.total_ttc - depositAmount).toFixed(2))
        : null;
    const totalsWithDeposit =
      typeof depositPercent === 'number' && depositPercent > 0 && depositAmount !== null
        ? {
            ...totalsFinal,
            deposit_percent: depositPercent,
            deposit_amount: depositAmount,
            remaining_amount: remainingAmount,
          }
        : totalsFinal;

    const mentionParts: string[] = [];
    if (sourceQuote?.number && sourceQuote?.status === 'accepte') {
      let line = `Facture conforme au devis n° ${sourceQuote.number}`;
      if (sourceQuote.accepted_at) {
        line += ` accepté le ${sourceQuote.accepted_at}`;
      } else {
        line += ' accepté';
      }
      mentionParts.push(`${line}.`);
    }
    if (tenant?.vat_exempt) {
      mentionParts.push(
        tenant?.vat_exempt_mention || 'TVA non applicable - article 293 B du CGI.'
      );
    }
    if (tenant?.pdf_terms) {
      mentionParts.push(tenant.pdf_terms);
    }
    if (tenant?.insurance_name || tenant?.insurance_origin || tenant?.insurance_contract) {
      const insuranceLine = [tenant?.insurance_name, tenant?.insurance_origin]
        .filter(Boolean)
        .join(' - ');
      const contractLine = tenant?.insurance_contract
        ? `Contrat n° ${tenant.insurance_contract}`
        : '';
      mentionParts.push(
        `Assurance décennale :\n${insuranceLine || 'Non renseignée'}${contractLine ? `\n${contractLine}` : ''}`
      );
    }
    const mentions = mentionParts.filter(Boolean).join('\n');

    const html = renderInvoicePdf({
      tenant: {
        name: tenant?.name || 'Entreprise',
        address: tenant?.address || null,
        city: tenant?.city || null,
        postal_code: tenant?.postal_code || null,
        country: tenant?.country || null,
        siret: tenant?.siret || null,
        vat_number: tenant?.vat_number || null,
        phone: tenant?.phone || null,
        email: tenant?.email || null,
        logo_url: tenant?.logo_url || null,
      },
      customer: {
        name: invoice.customers?.name || 'Client',
        address: invoice.customers?.address || null,
        postal_code: invoice.customers?.postal_code || null,
        city: invoice.customers?.city || null,
        email: invoice.customers?.email || null,
        phone: invoice.customers?.phone || null,
      },
      number: invoice.number,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      sections,
      totals: totalsWithDeposit,
      job_type: invoice.job_type || null,
      mentions: mentions || null,
      show_prices: invoice.show_prices ?? false,
    });

    const footerRight = `${tenant?.name || 'HG ELEC'} / ${invoice.customers?.name || 'Client'} / ${invoice.number}`;
    const pdf = await generatePdf(html, footerRight);
    const body = new Uint8Array(pdf);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
}

