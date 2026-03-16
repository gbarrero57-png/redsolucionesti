import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function verifyAuth(req: NextRequest) {
  const token = req.cookies.get('sb-token')?.value;
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function getAuthContext(req: NextRequest) {
  const token = req.cookies.get('sb-token')?.value;
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  // ── Superadmin check FIRST — does not require a staff record ──
  const superadminEmail = process.env.SUPERADMIN_EMAIL || '';
  const is_superadmin = superadminEmail !== '' && user.email === superadminEmail;

  if (is_superadmin) {
    return {
      user,
      clinic_id: '' as string,
      role: 'superadmin',
      is_superadmin: true,
    };
  }

  // ── Regular staff lookup ──────────────────────────────────────
  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id, clinic_id, role, active')
    .eq('user_id', user.id)
    .eq('active', true)
    .single();

  if (!staff) return null;

  return {
    user,
    clinic_id: staff.clinic_id as string,
    role: staff.role as string,
    is_superadmin: false,
  };
}
