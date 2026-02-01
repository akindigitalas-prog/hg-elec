import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const requiredHeaders = ['category', 'name', 'sku'];
type FormDataEntryValue = File | string;
type FormDataLike = { get(name: string): FormDataEntryValue | null };

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      const nextChar = text[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    if (row.some((cell) => cell.trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function parseTags(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return trimmed
    .split(/[|;]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeCategory(raw: string) {
  const key = raw.trim().toLowerCase();
  const normalized = key.replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' / ');
  const aliases: Record<string, string> = {
    appareillage: 'appareillage',
    'protection / tableau': 'protection_tableau',
    'protection/tableau': 'protection_tableau',
    'protection tableau': 'protection_tableau',
    'cables & conducteurs': 'cables_conducteurs',
    'cables et conducteurs': 'cables_conducteurs',
    'cables conducteurs': 'cables_conducteurs',
    eclairage: 'eclairage',
    'courant faible': 'courant_faible',
    'chauffage / ventilation': 'chauffage_ventilation',
    securite: 'securite',
    'main d oeuvre': 'main_oeuvre',
    "main d'oeuvre": 'main_oeuvre',
    'main oeuvre': 'main_oeuvre',
    'consommables / fixations': 'consommables_fixations',
    'consommables fixations': 'consommables_fixations',
  };
  return aliases[normalized] ?? aliases[key] ?? raw.trim();
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(_name: string, _value: string, _options: CookieOptions) {},
        remove(_name: string, _options: CookieOptions) {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 });
  }

  const formData = (await request.formData()) as unknown as FormDataLike;
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length < 2) {
    return NextResponse.json({ error: 'CSV vide' }, { status: 400 });
  }

  const headers = rows[0].map(normalizeHeader);
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      return NextResponse.json({ error: `Colonne requise manquante: ${header}` }, { status: 400 });
    }
  }

  const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]));

  const products = rows.slice(1).map((row) => {
    const get = (key: string) => (row[headerIndex[key]] ?? '').trim();
    const activeRaw = get('active').toLowerCase();
    const category = normalizeCategory(get('category'));

    return {
      tenant_id: profile.tenant_id,
      category,
      subcategory: get('subcategory') || null,
      name: get('name'),
      brand: get('brand') || null,
      sku: get('sku'),
      unit: get('unit') || 'piece',
      vat_rate: Number(get('vat_rate') || 20),
      internal_unit_price: Number(get('internal_unit_price') || 0),
      internal_cost: get('internal_cost') ? Number(get('internal_cost')) : null,
      type: get('type') || 'fourniture',
      active:
        activeRaw === 'false' || activeRaw === '0' || activeRaw === 'non'
          ? false
          : true,
      tags: parseTags(get('tags')),
    };
  });

  const invalid = products.find((product) => !product.category || !product.name || !product.sku);
  if (invalid) {
    return NextResponse.json({ error: 'Certaines lignes sont invalides (category, name, sku requis).' }, { status: 400 });
  }

  const { error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'tenant_id,sku', ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `${products.length} produits importes.` });
}
