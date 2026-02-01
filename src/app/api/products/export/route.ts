import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const headers = [
  'category',
  'subcategory',
  'name',
  'brand',
  'sku',
  'unit',
  'vat_rate',
  'internal_unit_price',
  'internal_cost',
  'type',
  'active',
  'tags',
];

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  const escaped = stringValue.replace(/"/g, '""');
  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

export async function GET() {
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

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (products || []).map((product) => {
    const record: Record<string, unknown> = {
      category: product.category,
      subcategory: product.subcategory,
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      unit: product.unit,
      vat_rate: product.vat_rate,
      internal_unit_price: product.internal_unit_price,
      internal_cost: product.internal_cost,
      type: product.type,
      active: product.active,
      tags: JSON.stringify(product.tags || []),
    };

    return headers.map((key) => escapeCsv(record[key]));
  });

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="catalogue.csv"',
    },
  });
}
