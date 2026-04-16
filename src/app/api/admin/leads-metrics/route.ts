import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://inhyrrjidhzrbqecnptn.supabase.co';
const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

interface LeadRow {
  telefono?:          string | null;
  email?:             string | null;
  ciudad?:            string | null;
  distrito?:          string | null;
  status?:            string | null;
  fuente?:            string[] | null;
  whatsapp_enviado?:  boolean | null;
  sms_enviado?:       boolean | null;
}

// Status values that count as "email contacted"
const EMAIL_SENT_STATUSES = new Set([
  'enviado', 'email_enviado', 'follow_up_enviado', 'respondio', 'cerrado',
]);

const PAGE = 1000;

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ctx.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_KEY not configured' }, { status: 500 });
  }

  const SELECT = 'telefono,email,ciudad,distrito,status,fuente,whatsapp_enviado,sms_enviado';
  const records: LeadRow[] = [];
  let from = 0;

  // Paginate through all leads
  while (true) {
    const to = from + PAGE - 1;
    const res = await fetch(
      `${SB_URL}/rest/v1/leads?select=${SELECT}&order=created_at.asc`,
      {
        headers: {
          apikey:        serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Range:         `${from}-${to}`,
          'Range-Unit':  'items',
        },
        cache: 'no-store',
      }
    );
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Supabase error: ${err}` }, { status: 500, headers: NO_CACHE });
    }
    const rows: LeadRow[] = await res.json();
    records.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }

  // ── Aggregations ──────────────────────────────────────────────────────────
  let con_telefono    = 0;
  let con_email       = 0;
  let con_ambos       = 0;
  let email_enviado   = 0;
  let whatsapp_enviado = 0;
  let sms_enviado     = 0;

  const por_ciudad:   Record<string, number> = {};
  const por_status:   Record<string, number> = {};
  const por_fuente:   Record<string, number> = {};
  // key = "nombre||ciudad" to disambiguate same-name districts across cities
  const por_distrito: Record<string, { nombre: string; ciudad: string; count: number }> = {};

  for (const f of records) {
    const hasTel  = !!(f.telefono && String(f.telefono).trim().length > 3);
    const hasMail = !!(f.email    && String(f.email).trim().length > 5);
    if (hasTel) con_telefono++;
    if (hasMail) con_email++;
    if (hasTel && hasMail) con_ambos++;

    const ciudad = (f.ciudad  || '').trim() || 'Sin ciudad';
    const status = (f.status  || '').trim() || 'sin_estado';
    const distr  = (f.distrito || '').trim();

    if (EMAIL_SENT_STATUSES.has(status)) email_enviado++;
    if (f.whatsapp_enviado) whatsapp_enviado++;
    if (f.sms_enviado)      sms_enviado++;

    por_ciudad[ciudad] = (por_ciudad[ciudad] || 0) + 1;
    por_status[status] = (por_status[status] || 0) + 1;

    const fuentes: string[] = Array.isArray(f.fuente) ? f.fuente : [];
    if (fuentes.length === 0) {
      por_fuente['sin_fuente'] = (por_fuente['sin_fuente'] || 0) + 1;
    } else {
      fuentes.forEach(fu => { por_fuente[fu] = (por_fuente[fu] || 0) + 1; });
    }

    if (distr) {
      const key = `${distr}||${ciudad}`;
      if (!por_distrito[key]) por_distrito[key] = { nombre: distr, ciudad, count: 0 };
      por_distrito[key].count++;
    }
  }

  const total = records.length;

  const ciudades = Object.entries(por_ciudad)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const statuses = Object.entries(por_status)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const fuentes = Object.entries(por_fuente)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const top_distritos = Object.values(por_distrito)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map(({ nombre, ciudad, count }) => ({ nombre, ciudad, count }));

  return NextResponse.json(
    {
      total, con_telefono, con_email, con_ambos,
      email_enviado, whatsapp_enviado, sms_enviado,
      ciudades, statuses, fuentes, top_distritos,
    },
    { headers: NO_CACHE }
  );
}
