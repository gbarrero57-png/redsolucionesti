import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const VALID_ROLES = ['admin', 'staff'];

// Superadmin: create a user for any clinic
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });
  if (!ctx.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_CACHE });

  const body = await req.json();
  const { clinic_id, email, password, full_name, role = 'staff' } = body;

  if (!clinic_id || !email || !password) {
    return NextResponse.json({ error: 'clinic_id, email y password son requeridos' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'email inválido' }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `role debe ser: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'password debe tener al menos 8 caracteres' }, { status: 400 });
  }

  // Verify clinic exists
  const { data: clinic, error: clinicErr } = await supabaseAdmin
    .from('clinics')
    .select('id, name')
    .eq('id', clinic_id)
    .single();

  if (clinicErr || !clinic) {
    return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404, headers: NO_CACHE });
  }

  try {
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, clinic_id, role },
    });

    if (authErr) {
      return NextResponse.json({ error: authErr.message || 'Error al crear usuario' }, { status: 400, headers: NO_CACHE });
    }
    const userId = authData.user.id;

    const { data: staffData, error: staffErr } = await supabaseAdmin
      .from('staff')
      .insert({
        user_id: userId,
        clinic_id,
        full_name: full_name || email.split('@')[0],
        role,
        active: true,
      })
      .select()
      .single();

    if (staffErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Error al registrar usuario' }, { status: 500, headers: NO_CACHE });
    }

    return NextResponse.json({ ...staffData, email, clinic_name: clinic.name }, { status: 201, headers: NO_CACHE });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500, headers: NO_CACHE });
  }
}
