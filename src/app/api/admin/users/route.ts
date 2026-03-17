import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const VALID_ROLES = ['admin', 'staff'];

// List all staff members for this clinic
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  try {
    const { data: staffRows, error: staffErr } = await supabaseAdmin
      .from('staff')
      .select('id, user_id, full_name, role, active, created_at')
      .eq('clinic_id', ctx.clinic_id)
      .order('created_at', { ascending: false });

    if (staffErr) return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500, headers: NO_CACHE });

    const enriched = await Promise.all(
      (staffRows || []).map(async (s) => {
        try {
          const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(s.user_id);
          return { ...s, email: user?.email || '', last_sign_in: user?.last_sign_in_at || null };
        } catch {
          return { ...s, email: '', last_sign_in: null };
        }
      })
    );

    return NextResponse.json(enriched, { headers: NO_CACHE });
  } catch {
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500, headers: NO_CACHE });
  }
}

// Create a new staff user (admin only)
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_CACHE });

  const body = await req.json();
  const { email, password, full_name, role = 'staff' } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }
  // Validar email básico
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'email inválido' }, { status: 400 });
  }
  // Validar role contra allowlist
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `role debe ser: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }
  // Mínimo de seguridad en contraseña
  if (password.length < 8) {
    return NextResponse.json({ error: 'password debe tener al menos 8 caracteres' }, { status: 400 });
  }

  try {
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, clinic_id: ctx.clinic_id, role },
    });

    if (authErr) return NextResponse.json({ error: 'Error al crear usuario' }, { status: 400, headers: NO_CACHE });
    const userId = authData.user.id;

    const { data: staffData, error: staffErr } = await supabaseAdmin
      .from('staff')
      .insert({
        user_id: userId,
        clinic_id: ctx.clinic_id,
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

    return NextResponse.json({ ...staffData, email }, { status: 201, headers: NO_CACHE });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500, headers: NO_CACHE });
  }
}

// Update staff (admin only)
export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_CACHE });

  const body = await req.json();
  const { id, role, active, full_name } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Validar role si viene en el body
  if (role !== undefined && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `role debe ser: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (role !== undefined)      updates.role = role;
  if (active !== undefined)    updates.active = Boolean(active);
  if (full_name !== undefined) updates.full_name = String(full_name).slice(0, 100);

  const { data, error } = await supabaseAdmin
    .from('staff')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500, headers: NO_CACHE });
  return NextResponse.json(data, { headers: NO_CACHE });
}

// Delete staff user (admin only)
export async function DELETE(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: staff, error: fetchErr } = await supabaseAdmin
    .from('staff')
    .select('user_id')
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id)
    .single();

  if (fetchErr) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404, headers: NO_CACHE });

  const { error } = await supabaseAdmin
    .from('staff')
    .delete()
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id);

  if (error) return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500, headers: NO_CACHE });

  await supabaseAdmin.auth.admin.deleteUser(staff.user_id).catch(() => {});

  return NextResponse.json({ success: true }, { headers: NO_CACHE });
}
