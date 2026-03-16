import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

// List all staff members for this clinic
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: staffRows, error: staffErr } = await supabaseAdmin
      .from('staff')
      .select('id, user_id, full_name, role, active, created_at')
      .eq('clinic_id', ctx.clinic_id)
      .order('created_at', { ascending: false });

    if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 500 });

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

    return NextResponse.json(enriched);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Create a new staff user (admin only)
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { email, password, full_name, role = 'staff' } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }

  try {
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, clinic_id: ctx.clinic_id, role },
    });

    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });
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
      return NextResponse.json({ error: staffErr.message }, { status: 500 });
    }

    return NextResponse.json({ ...staffData, email }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Update staff (admin only)
export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, role, active, full_name } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (active !== undefined) updates.active = active;
  if (full_name !== undefined) updates.full_name = full_name;

  const { data, error } = await supabaseAdmin
    .from('staff')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Delete staff user (admin only)
export async function DELETE(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: staff, error: fetchErr } = await supabaseAdmin
    .from('staff')
    .select('user_id')
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id)
    .single();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 404 });

  const { error } = await supabaseAdmin
    .from('staff')
    .delete()
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.auth.admin.deleteUser(staff.user_id).catch(() => {});

  return NextResponse.json({ success: true });
}
