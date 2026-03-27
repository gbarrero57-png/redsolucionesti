import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';
import { DEFAULT_DENTAL_KB } from '@/lib/default_kb';
import { sendWelcomeEmail } from '@/lib/reports/email';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

// ── GET: list all clinics with basic stats ────────────────────────────────────
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ctx.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: clinics, error } = await supabaseAdmin
    .from('clinics')
    .select('id, name, subdomain, phone, address, active, created_at, chatwoot_inbox_id, chatwoot_account_id')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

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
  const {
    clinic,
    admin,
    staff,     // optional: { email, password, full_name }
    twilio,    // optional: { account_sid, auth_token, phone_number }
    chatwoot_webhook,
    use_default_kb = true,
  } = body;

  // ── Validations ──────────────────────────────────────────────────────────────
  if (!clinic?.name || !clinic?.subdomain)
    return NextResponse.json({ error: 'clinic.name y clinic.subdomain son obligatorios' }, { status: 400 });
  if (!admin?.email || !admin?.password)
    return NextResponse.json({ error: 'admin.email y admin.password son obligatorios' }, { status: 400 });
  if (!/^[a-z0-9-]+$/.test(clinic.subdomain))
    return NextResponse.json({ error: 'subdomain solo puede contener letras minúsculas, números y guiones' }, { status: 400 });
  if (staff?.email && !staff?.password)
    return NextResponse.json({ error: 'staff.password es obligatorio si se proporciona staff.email' }, { status: 400 });
  if (twilio && (!twilio.account_sid || !twilio.auth_token || !twilio.phone_number))
    return NextResponse.json({ error: 'twilio requiere account_sid, auth_token y phone_number' }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from('clinics').select('id').eq('subdomain', clinic.subdomain).maybeSingle();
  if (existing)
    return NextResponse.json({ error: `El subdomain '${clinic.subdomain}' ya está en uso` }, { status: 409 });

  let clinicRecord: { id: string; name: string } | null = null;
  let adminUserId: string | null = null;
  let staffUserId: string | null = null;

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
        admin_email: admin.email,
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

    // ── Step 2: Create admin auth user ────────────────────────────────────────
    const { data: adminAuth, error: adminAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
      user_metadata: { full_name: admin.full_name, clinic_id: newClinic.id, role: 'admin' },
    });
    if (adminAuthErr || !adminAuth.user) throw new Error(`Error creando admin: ${adminAuthErr?.message}`);
    adminUserId = adminAuth.user.id;

    // ── Step 3: Create admin staff record ─────────────────────────────────────
    const { error: adminStaffErr } = await supabaseAdmin.from('staff').insert({
      user_id: adminUserId,
      clinic_id: newClinic.id,
      role: 'admin',
      full_name: admin.full_name || admin.email.split('@')[0],
      active: true,
    });
    if (adminStaffErr) throw new Error(`Error creando registro admin: ${adminStaffErr.message}`);

    // ── Step 4: Create staff user (optional) ─────────────────────────────────
    if (staff?.email && staff?.password) {
      try {
        const { data: staffAuth, error: staffAuthErr } = await supabaseAdmin.auth.admin.createUser({
          email: staff.email,
          password: staff.password,
          email_confirm: true,
          user_metadata: { full_name: staff.full_name, clinic_id: newClinic.id, role: 'staff' },
        });
        if (!staffAuthErr && staffAuth.user) {
          staffUserId = staffAuth.user.id;
          await supabaseAdmin.from('staff').insert({
            user_id: staffUserId,
            clinic_id: newClinic.id,
            role: 'staff',
            full_name: staff.full_name || staff.email.split('@')[0],
            active: true,
          });
        }
      } catch (e) {
        console.warn('[onboard] staff user creation failed (non-fatal):', e);
      }
    }

    // ── Step 5: Seed knowledge base ───────────────────────────────────────────
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

    // ── Step 6: Create default doctor/schedule ────────────────────────────────
    try {
      const now = new Date().toISOString();
      await supabaseAdmin.from('doctors').insert({
        clinic_id:        newClinic.id,
        first_name:       'General',
        last_name:        clinic.name,
        specialty:        'Odontología General',
        display_name:     'Consultorio General',
        bio:              `Horario general de atención de ${clinic.name}.`,
        weekly_schedule: [
          { dow: 1, start_hour: 9, end_hour: 18 },
          { dow: 2, start_hour: 9, end_hour: 18 },
          { dow: 3, start_hour: 9, end_hour: 18 },
          { dow: 4, start_hour: 9, end_hour: 18 },
          { dow: 5, start_hour: 9, end_hour: 18 },
          { dow: 6, start_hour: 9, end_hour: 13 },
        ],
        slot_duration_min: 30,
        active:           true,
        created_at:       now,
        updated_at:       now,
      });
    } catch (e) {
      console.warn('[onboard] default doctor creation failed (non-fatal):', e);
    }

    // ── Step 7: Create Chatwoot account + inboxes + webhook ───────────────────
    let chatwoot_account_id: number | null = null;
    let chatwoot_inbox_id: number | null = null;
    let twilio_inbox_id: number | null = null;
    let twilio_webhook_url: string | null = null;

    const chatwootBase = (process.env.CHATWOOT_BASE_URL || 'https://chat.redsolucionesti.com').replace(/\/$/, '');
    const chatwootSuperToken = process.env.CHATWOOT_SUPERADMIN_TOKEN || process.env.CHATWOOT_TOKEN || 'yypAwZDH2dV3crfbqJqWCgj1';
    const n8nWebhook = chatwoot_webhook || 'https://workflows.n8n.redsolucionesti.com/webhook/chatwoot-sofia';

    try {
      // 6a. Create dedicated Chatwoot account
      // NOTE: /super_admin/api/v1/accounts returns 404 on this Chatwoot version.
      // Use /api/v1/accounts instead — works with SuperAdmin token and also
      // auto-adds the superadmin as administrator of the new account.
      const accountRes = await fetch(`${chatwootBase}/api/v1/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', api_access_token: chatwootSuperToken },
        body: JSON.stringify({
          account_name: clinic.name,
          email: admin.email,
          password: admin.password,
        }),
      });
      const accountJson = await accountRes.json();
      // Response: { data: { account_id: <newId>, accounts: [...] } }
      const newAccountId = accountJson?.data?.account_id ?? accountJson?.id ?? null;
      const accountData = newAccountId ? { id: newAccountId } : null;

      if (accountData?.id) {
        chatwoot_account_id = accountData.id;
        const headers = { 'Content-Type': 'application/json', api_access_token: chatwootSuperToken };
        const accountBase = `${chatwootBase}/api/v1/accounts/${chatwoot_account_id}`;

        // 6b. Create API inbox (bot channel — always created)
        const apiInboxRes = await fetch(`${accountBase}/inboxes`, {
          method: 'POST', headers,
          body: JSON.stringify({
            name: 'SofIA Bot',
            channel: { type: 'api', webhook_url: n8nWebhook },
          }),
        });
        const apiInboxData = await apiInboxRes.json();
        if (apiInboxData?.id) chatwoot_inbox_id = apiInboxData.id;

        // 6c. Create Twilio WhatsApp inbox (if credentials provided)
        if (twilio?.account_sid) {
          const twilioInboxRes = await fetch(`${accountBase}/inboxes`, {
            method: 'POST', headers,
            body: JSON.stringify({
              name: 'WhatsApp',
              channel: {
                type: 'twilio_sms',
                phone_number: twilio.phone_number,
                account_sid: twilio.account_sid,
                auth_token: twilio.auth_token,
              },
            }),
          });
          const twilioInboxData = await twilioInboxRes.json();
          if (twilioInboxData?.id) {
            twilio_inbox_id = twilioInboxData.id;
            // The Twilio inbox becomes the primary inbox for the bot
            chatwoot_inbox_id = twilio_inbox_id;
            twilio_webhook_url = `${chatwootBase}/twilio/callback`;
          }
        }

        // 6d. Register outgoing webhook (n8n receives all messages)
        await fetch(`${accountBase}/integrations/hooks`, {
          method: 'POST', headers,
          body: JSON.stringify({
            url: n8nWebhook,
            subscriptions: ['message_created', 'conversation_created', 'conversation_updated'],
          }),
        }).catch(() => {});

        // 6e. Persist Chatwoot IDs + token in clinic bot_config
        const currentBotConfig = (newClinic.bot_config as Record<string, unknown>) || {};
        await supabaseAdmin.from('clinics').update({
          chatwoot_account_id,
          chatwoot_inbox_id,
          bot_config: { ...currentBotConfig, chatwoot_api_token: chatwootSuperToken },
        }).eq('id', newClinic.id);
      }
    } catch (e) {
      console.warn('[onboard] chatwoot setup failed (non-fatal):', e);
    }

    // ── Step 8: Send welcome email (best-effort) ──────────────────────────────
    const panelUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sofia.redsolucionesti.com';
    sendWelcomeEmail({
      to: admin.email,
      clinic_name: clinic.name,
      admin_password: admin.password,
      staff_email: staff?.email,
      staff_password: staff?.password,
      panel_url: `${panelUrl}/admin`,
      chatwoot_url: chatwoot_account_id
        ? `${chatwootBase}/app/accounts/${chatwoot_account_id}/dashboard`
        : undefined,
      twilio_webhook_url: twilio_webhook_url || undefined,
      twilio_phone: twilio?.phone_number,
    }).catch((e) => console.warn('[onboard] welcome email failed:', e?.message));

    return NextResponse.json({
      success: true,
      clinic: { id: newClinic.id, name: clinic.name, subdomain: clinic.subdomain },
      users: {
        admin: { email: admin.email, password: admin.password, role: 'admin', user_id: adminUserId },
        staff: (staff?.email && staffUserId)
          ? { email: staff.email, password: staff.password, role: 'staff', user_id: staffUserId }
          : null,
      },
      kb_count,
      chatwoot_account_id,
      chatwoot_inbox_id,
      twilio_inbox_id,
      twilio_webhook_url,
      panel_url: `${panelUrl}/admin`,
    }, { headers: NO_CACHE });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Rollback
    if (staffUserId) await supabaseAdmin.auth.admin.deleteUser(staffUserId).catch(() => {});
    if (adminUserId) await supabaseAdmin.auth.admin.deleteUser(adminUserId).catch(() => {});
    if (clinicRecord) { try { await supabaseAdmin.from('clinics').delete().eq('id', clinicRecord.id); } catch { /* ignore */ } }
    return NextResponse.json({ error: msg }, { status: 500, headers: NO_CACHE });
  }
}
