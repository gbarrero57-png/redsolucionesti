import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';
import { DEFAULT_DENTAL_KB } from '@/lib/default_kb';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

// ── GET: list all clinics with basic stats ────────────────────────────────────
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ctx.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: clinics, error } = await supabaseAdmin
    .from('clinics')
    .select('id, name, subdomain, phone, address, active, created_at, chatwoot_inbox_id')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  // Enrich each clinic with counts
  const enriched = await Promise.all((clinics || []).map(async (clinic) => {
    const [staffRes, kbRes, convsRes, apptsRes] = await Promise.all([
      supabaseAdmin.from('staff').select('id', { count: 'exact', head: true }).eq('clinic_id', clinic.id).eq('active', true),
      supabaseAdmin.from('knowledge_base').select('id', { count: 'exact', head: true }).eq('clinic_id', clinic.id),
      supabaseAdmin.from('conversations').select('id', { count: 'exact', head: true }).eq('clinic_id', clinic.id),
      supabaseAdmin.from('appointments').select('id', { count: 'exact', head: true }).eq('clinic_id', clinic.id),
    ]);
    return {
      ...clinic,
      staff_count: staffRes.count ?? 0,
      kb_count: kbRes.count ?? 0,
      conversations_count: convsRes.count ?? 0,
      appointments_count: apptsRes.count ?? 0,
    };
  }));

  return NextResponse.json(enriched, { headers: NO_CACHE });
}

// ── POST: onboard a new clinic ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ctx.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { clinic, admin, chatwoot_webhook, use_default_kb = true } = body;

  // Validate required fields
  if (!clinic?.name || !clinic?.subdomain) {
    return NextResponse.json({ error: 'clinic.name y clinic.subdomain son obligatorios' }, { status: 400 });
  }
  if (!admin?.email || !admin?.password) {
    return NextResponse.json({ error: 'admin.email y admin.password son obligatorios' }, { status: 400 });
  }
  if (!/^[a-z0-9-]+$/.test(clinic.subdomain)) {
    return NextResponse.json({ error: 'subdomain solo puede contener letras minúsculas, números y guiones' }, { status: 400 });
  }

  // Check subdomain uniqueness
  const { data: existing } = await supabaseAdmin
    .from('clinics')
    .select('id')
    .eq('subdomain', clinic.subdomain)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: `El subdomain '${clinic.subdomain}' ya está en uso` }, { status: 409 });
  }

  let clinicRecord: { id: string; name: string } | null = null;
  let authUserId: string | null = null;

  try {
    // ── Step 1: Create clinic ─────────────────────────────────────────────────
    const { data: newClinic, error: clinicErr } = await supabaseAdmin
      .from('clinics')
      .insert({
        name: clinic.name,
        subdomain: clinic.subdomain,
        phone: clinic.phone || null,
        address: clinic.address || null,
        timezone: clinic.timezone || 'America/Lima',
        bot_config: {
          max_bot_interactions: 3,
          business_hours_start: 8,
          business_hours_end: 22,
          reminder_hours_before: 24,
          welcome_message: clinic.welcome_message || `Hola 👋 Soy SofIA, tu asistente virtual de ${clinic.name}. ¿En qué puedo ayudarte?`,
          escalation_message: clinic.escalation_message || 'Entiendo, déjame conectarte con uno de nuestros asesores 🙏',
        },
        branding_config: {},
        active: true,
      })
      .select()
      .single();

    if (clinicErr || !newClinic) throw new Error(`Error creando clínica: ${clinicErr?.message}`);
    clinicRecord = newClinic;

    // ── Step 2: Create auth user ──────────────────────────────────────────────
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
      user_metadata: { full_name: admin.full_name, clinic_id: newClinic.id, role: 'admin' },
    });

    if (authErr || !authData.user) throw new Error(`Error creando usuario: ${authErr?.message}`);
    authUserId = authData.user.id;

    // ── Step 3: Create staff record ───────────────────────────────────────────
    const { error: staffErr } = await supabaseAdmin.from('staff').insert({
      user_id: authUserId,
      clinic_id: newClinic.id,
      role: 'admin',
      full_name: admin.full_name || admin.email.split('@')[0],
      active: true,
    });

    if (staffErr) throw new Error(`Error creando staff: ${staffErr.message}`);

    // ── Step 4: Seed knowledge base ───────────────────────────────────────────
    let kb_count = 0;
    if (use_default_kb) {
      const kbEntries = DEFAULT_DENTAL_KB.map(kb => ({
        clinic_id: newClinic.id,
        category: kb.category,
        question: kb.question,
        answer: kb.answer,
        keywords: kb.keywords,
        priority: kb.priority,
        metadata: {},
        active: true,
      }));

      const { error: kbErr } = await supabaseAdmin.from('knowledge_base').insert(kbEntries);
      if (!kbErr) kb_count = kbEntries.length;
    }

    // ── Step 5: Create Chatwoot inbox (best-effort) ───────────────────────────
    let chatwoot_inbox_id: number | null = null;
    const webhookUrl = chatwoot_webhook || 'https://workflows.n8n.redsolucionesti.com/webhook/chatwoot-sofia';
    const chatwootUrl = process.env.CHATWOOT_URL || 'https://chat.redsolucionesti.com/api/v1/accounts/2';
    const chatwootToken = process.env.CHATWOOT_TOKEN || 'yypAwZDH2dV3crfbqJqWCgj1';

    try {
      const inboxRes = await fetch(`${chatwootUrl}/inboxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', api_access_token: chatwootToken },
        body: JSON.stringify({
          name: `SofIA - ${clinic.name}`,
          channel: { type: 'api', webhook_url: webhookUrl },
        }),
      });
      const inbox = await inboxRes.json();
      if (inbox.id) {
        chatwoot_inbox_id = inbox.id;
        await supabaseAdmin.from('clinics').update({
          chatwoot_inbox_id: inbox.id,
          chatwoot_account_id: 2,
        }).eq('id', newClinic.id);
      }
    } catch { /* non-fatal */ }

    return NextResponse.json({
      success: true,
      clinic: { id: newClinic.id, name: clinic.name, subdomain: clinic.subdomain },
      admin: { email: admin.email, user_id: authUserId },
      kb_count,
      chatwoot_inbox_id,
      panel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://sofia-admin-theta.vercel.app'}/admin`,
    }, { headers: NO_CACHE });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    // Rollback: delete auth user if created, clinic will cascade-delete staff
    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
    }
    if (clinicRecord) {
      try { await supabaseAdmin.from('clinics').delete().eq('id', clinicRecord.id); } catch { /* ignore */ }
    }

    return NextResponse.json({ error: msg }, { status: 500, headers: NO_CACHE });
  }
}
