import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createUserClient } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const q      = (searchParams.get('q') || '').trim().substring(0, 100);
  const id     = searchParams.get('id');
  const today  = searchParams.get('today'); // get today's appointments with status

  // Single patient by id
  if (id) {
    const { data, error } = await supabaseAdmin.rpc('get_patient_by_dni', {
      p_clinic_id: ctx.clinic_id,
      p_dni: id, // actually we query by uuid — see below
    });
    // Fallback: direct query by patient id
    const { data: patient, error: err2 } = await supabaseAdmin
      .from('patients')
      .select('id, dni, full_name, birth_date, gender, phone, email, address, blood_type, emergency_contact_name, emergency_contact_phone, created_at, patient_allergies(id, allergen, severity, reaction, confirmed)')
      .eq('id', id)
      .eq('clinic_id', ctx.clinic_id)
      .is('deleted_at', null)
      .single();
    if (err2 || !patient) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_CACHE });
    const res = NextResponse.json(patient, { headers: NO_CACHE });
    return applyRefreshedToken(res, ctx);
  }

  // Today's appointments with patient status
  if (today === '1') {
    const userClient = createUserClient(ctx.accessToken);
    const { data, error } = await userClient.rpc('get_today_appointments_with_status', {
      p_clinic_id: ctx.clinic_id,
    });
    if (error) return NextResponse.json([], { headers: NO_CACHE });
    const res = NextResponse.json(data || [], { headers: NO_CACHE });
    return applyRefreshedToken(res, ctx);
  }

  // Search patients
  if (q) {
    const userClient = createUserClient(ctx.accessToken);
    const { data, error } = await userClient.rpc('search_patients', {
      p_clinic_id: ctx.clinic_id,
      p_query: q,
      p_limit: 20,
    });
    if (error) return NextResponse.json([], { headers: NO_CACHE });
    const res = NextResponse.json(data || [], { headers: NO_CACHE });
    return applyRefreshedToken(res, ctx);
  }

  return NextResponse.json([], { headers: NO_CACHE });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { dni, full_name, birth_date, gender, phone, email, address, blood_type,
          emergency_contact_name, emergency_contact_phone } = body;

  if (!dni || !/^[0-9]{8}$/.test(dni))
    return NextResponse.json({ error: 'DNI debe tener 8 dígitos numéricos' }, { status: 400 });
  if (!full_name?.trim())
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

  const userClient = createUserClient(ctx.accessToken);
  const { data, error } = await userClient.rpc('create_or_update_patient', {
    p_clinic_id: ctx.clinic_id,
    p_dni: dni,
    p_full_name: full_name.trim(),
    p_birth_date: birth_date || null,
    p_gender: gender || null,
    p_phone: phone || null,
    p_email: email || null,
    p_address: address || null,
    p_blood_type: blood_type || 'desconocido',
    p_emergency_contact_name: emergency_contact_name || null,
    p_emergency_contact_phone: emergency_contact_phone || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const row = Array.isArray(data) ? data[0] : data;
  const res = NextResponse.json({ patient_id: row?.patient_id }, { status: 201, headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}
