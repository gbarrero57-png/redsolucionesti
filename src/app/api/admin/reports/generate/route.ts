import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';
import { fetchReportMetrics } from '@/lib/reports/metrics';
import { MonthlyReportPDF } from '@/lib/reports/pdf';
import { sendReportEmail } from '@/lib/reports/email';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json().catch(() => ({}));

  // clinic_id: super admin passes it; regular admin uses own clinic
  const clinic_id = body.clinic_id || ctx.clinic_id;
  if (!clinic_id) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  // month: 'YYYY-MM', defaults to last month
  let month: string = body.month;
  if (!month) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 });
  }

  try {
    // 1. Fetch all metrics
    const metrics = await fetchReportMetrics(clinic_id, month);

    if (!metrics.admin_email && !body.email_override) {
      return NextResponse.json({
        error: 'No admin_email configured for this clinic. Set it in clinics table or pass email_override.',
      }, { status: 400 });
    }

    const emailTo = body.email_override || metrics.admin_email;

    // 2. Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      createElement(MonthlyReportPDF, { m: metrics }) as ReactElement<DocumentProps>
    );

    const safeName  = metrics.clinic_name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
    const filename  = `reporte-${month}-${safeName}.pdf`;

    // 3. Upload to Supabase Storage
    let pdf_url: string | null = null;
    const storagePath = `${clinic_id}/${month}/${filename}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('monthly-reports')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage
        .from('monthly-reports')
        .getPublicUrl(storagePath);
      pdf_url = urlData?.publicUrl || null;
    } else {
      console.warn('Storage upload failed (bucket may not exist):', uploadError.message);
    }

    // 4. Send email
    await sendReportEmail({
      to:           emailTo,
      clinic_name:  metrics.clinic_name,
      month_label:  metrics.month_label,
      pdf_buffer:   Buffer.from(pdfBuffer),
      pdf_filename: filename,
      metrics_summary: {
        total_appointments:  metrics.total_appointments,
        completion_rate:     metrics.completion_rate,
        total_conversations: metrics.total_conversations,
        reminders_sent:      metrics.reminders_sent,
      },
    });

    // 5. Save record to monthly_reports
    const metricsSnapshot = {
      total_appointments:    metrics.total_appointments,
      completed_appointments: metrics.completed_appointments,
      cancelled_appointments: metrics.cancelled_appointments,
      no_show_appointments:  metrics.no_show_appointments,
      completion_rate:       metrics.completion_rate,
      total_conversations:   metrics.total_conversations,
      escalation_rate:       metrics.escalation_rate,
      reminders_sent:        metrics.reminders_sent,
      bot_appointments:      metrics.bot_appointments,
      manual_appointments:   metrics.manual_appointments,
    };

    await supabaseAdmin.from('monthly_reports').upsert({
      clinic_id,
      month,
      pdf_url,
      email_to:   emailTo,
      sent_at:    new Date().toISOString(),
      metrics:    metricsSnapshot,
    }, { onConflict: 'clinic_id,month' });

    return NextResponse.json({
      ok:          true,
      month,
      clinic_name: metrics.clinic_name,
      email_to:    emailTo,
      pdf_url,
    }, { headers: NO_CACHE });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[reports/generate]', msg);
    return NextResponse.json({ error: msg }, { status: 500, headers: NO_CACHE });
  }
}
