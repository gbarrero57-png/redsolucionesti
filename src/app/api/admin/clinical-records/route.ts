import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createUserClient } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const patient_id = searchParams.get('patient_id');
  const page       = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1);
  const limit      = 10;

  if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 });

  const userClient = createUserClient(ctx.accessToken);
  const { data, error } = await userClient.rpc('get_patient_timeline', {
    p_patient_id: patient_id,
    p_clinic_id:  ctx.clinic_id,
    p_limit:      limit,
    p_offset:     (page - 1) * limit,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const rows = Array.isArray(data) ? data : [];
  const total = rows[0]?.total_count ?? 0;
  const res = NextResponse.json({ records: rows, total, page, limit }, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const {
    patient_id, consultation_date, reason, diagnosis, treatment,
    medications, observations, next_appointment_rec,
    weight_kg, height_cm, blood_pressure, temperature_c,
    appointment_id,
    // New: follow-up appointment fields
    next_appt_service, next_appt_time, next_appt_duration_min,
  } = body;

  if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 });
  if (!reason?.trim()) return NextResponse.json({ error: 'reason required' }, { status: 400 });
  if (!diagnosis?.trim()) return NextResponse.json({ error: 'diagnosis required' }, { status: 400 });

  // Verify patient belongs to this clinic (security: prevent cross-clinic writes)
  const { data: patientCheck, error: patientErr } = await supabaseAdmin
    .from('patients')
    .select('id, full_name, phone')
    .eq('id', patient_id)
    .eq('clinic_id', ctx.clinic_id)
    .single();

  if (patientErr || !patientCheck) {
    return NextResponse.json({ error: 'Paciente no encontrado en esta clínica' }, { status: 403, headers: NO_CACHE });
  }

  const userClient = createUserClient(ctx.accessToken);
  const { data, error } = await userClient.rpc('add_clinical_record', {
    p_patient_id:           patient_id,
    p_clinic_id:            ctx.clinic_id,
    p_consultation_date:    consultation_date || new Date().toISOString().split('T')[0],
    p_reason:               reason.trim(),
    p_diagnosis:            diagnosis.trim(),
    p_treatment:            treatment?.trim() || null,
    p_medications:          medications?.trim() || null,
    p_observations:         observations?.trim() || null,
    p_next_appointment_rec: next_appointment_rec || null,
    p_weight_kg:            weight_kg ? parseFloat(weight_kg) : null,
    p_height_cm:            height_cm ? parseFloat(height_cm) : null,
    p_blood_pressure:       blood_pressure?.trim() || null,
    p_temperature_c:        temperature_c ? parseFloat(temperature_c) : null,
    p_appointment_id:       appointment_id || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const row = Array.isArray(data) ? data[0] : data;
  const record_id = row?.record_id ?? null;

  // ── Create follow-up appointment if doctor specified date + service ──────────
  let created_appointment_id: string | null = null;

  if (next_appointment_rec && next_appt_service?.trim()) {
    const time   = next_appt_time || '09:00';
    const durMin = Math.min(Math.max(parseInt(next_appt_duration_min) || 60, 15), 480);

    const startDt = new Date(`${next_appointment_rec}T${time}:00`);
    const endDt   = new Date(startDt.getTime() + durMin * 60 * 1000);

    // Validate date is not in the past
    if (startDt > new Date()) {
      const { data: apptData, error: apptErr } = await supabaseAdmin
        .from('appointments')
        .insert({
          clinic_id:    ctx.clinic_id,
          patient_id:   patient_id,
          patient_name: patientCheck.full_name,
          phone:        patientCheck.phone,
          service:      next_appt_service.trim(),
          start_time:   startDt.toISOString(),
          end_time:     endDt.toISOString(),
          status:       'scheduled',
          source:       'staff',
          notes:        `Cita de seguimiento. Diagnóstico previo: ${diagnosis.trim().slice(0, 120)}`,
          created_by:   ctx.user?.id ?? null,
        })
        .select('id')
        .single();

      if (!apptErr && apptData) {
        created_appointment_id = apptData.id;

        // Update the clinical record to link this new appointment as the recommended one
        // (best-effort, don't fail the whole request if this errors)
        await supabaseAdmin
          .from('clinical_records')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', record_id)
          .eq('clinic_id', ctx.clinic_id);
      }
    }
  }

  const res = NextResponse.json(
    { record_id, appointment_id: created_appointment_id },
    { status: 201, headers: NO_CACHE }
  );
  return applyRefreshedToken(res, ctx);
}
