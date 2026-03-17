// Uses Brevo REST API instead of SMTP — Vercel serverless blocks outbound TCP (587/465)
const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.SMTP_PASS!;

export interface SendReportEmailParams {
  to: string;
  clinic_name: string;
  month_label: string;    // 'Marzo 2026'
  pdf_buffer: Buffer;
  pdf_filename: string;   // 'reporte-marzo-2026-clinica.pdf'
  metrics_summary: {
    total_appointments: number;
    completion_rate: number;
    total_conversations: number;
    reminders_sent: number;
  };
}

export async function sendReportEmail(params: SendReportEmailParams): Promise<void> {
  const {
    to, clinic_name, month_label, pdf_buffer, pdf_filename, metrics_summary,
  } = params;

  const { total_appointments, completion_rate, total_conversations, reminders_sent } = metrics_summary;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Mensual SofIA</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;color:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:32px;text-align:center;">
              <div style="font-size:11px;color:#a5b4fc;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Red Soluciones TI · SofIA AI</div>
              <div style="font-size:24px;font-weight:bold;color:#a78bfa;margin-bottom:4px;">Reporte Mensual</div>
              <div style="font-size:14px;color:#e2e8f0;">${clinic_name}</div>
              <div style="font-size:12px;color:#7c3aed;margin-top:4px;">${month_label}</div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">
                Hola,<br><br>
                Adjuntamos el reporte de actividad de SofIA para <strong style="color:#e2e8f0;">${clinic_name}</strong> correspondiente a <strong style="color:#a78bfa;">${month_label}</strong>.
              </p>
            </td>
          </tr>

          <!-- KPI cards -->
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="25%" style="padding:0 4px 0 0;">
                    <div style="background:#1e293b;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">
                      <div style="font-size:28px;font-weight:bold;color:#a78bfa;">${total_appointments}</div>
                      <div style="font-size:10px;color:#64748b;margin-top:4px;">Citas<br>agendadas</div>
                    </div>
                  </td>
                  <td width="25%" style="padding:0 4px;">
                    <div style="background:#1e293b;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">
                      <div style="font-size:28px;font-weight:bold;color:#34d399;">${completion_rate}%</div>
                      <div style="font-size:10px;color:#64748b;margin-top:4px;">Tasa de<br>completación</div>
                    </div>
                  </td>
                  <td width="25%" style="padding:0 4px;">
                    <div style="background:#1e293b;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">
                      <div style="font-size:28px;font-weight:bold;color:#60a5fa;">${total_conversations}</div>
                      <div style="font-size:10px;color:#64748b;margin-top:4px;">Conversaciones<br>WhatsApp</div>
                    </div>
                  </td>
                  <td width="25%" style="padding:0 0 0 4px;">
                    <div style="background:#1e293b;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">
                      <div style="font-size:28px;font-weight:bold;color:#fbbf24;">${reminders_sent}</div>
                      <div style="font-size:10px;color:#64748b;margin-top:4px;">Recordatorios<br>enviados</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PDF note -->
          <tr>
            <td style="padding:0 32px 28px;">
              <div style="background:#1e1b4b;border-radius:10px;padding:16px;border:1px solid #4c1d95;text-align:center;">
                <p style="margin:0;font-size:12px;color:#a5b4fc;">
                  📎 El reporte completo con gráficos detallados está adjunto en este correo como archivo PDF.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1e293b;">
              <p style="margin:0;font-size:10px;color:#475569;text-align:center;line-height:1.6;">
                Este reporte fue generado automáticamente por SofIA AI.<br>
                Red Soluciones TI · <a href="https://redsolucionesti.com" style="color:#7c3aed;text-decoration:none;">redsolucionesti.com</a> · info@redsolucionesti.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const fromRaw = process.env.SMTP_FROM || 'SofIA Reports <gabriel@redsolucionesti.com>';
  const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
  const senderName  = fromMatch ? fromMatch[1].trim() : 'SofIA Reports';
  const senderEmail = fromMatch ? fromMatch[2].trim() : 'gabriel@redsolucionesti.com';

  const body = {
    sender:      { name: senderName, email: senderEmail },
    to:          [{ email: to }],
    subject:     `📊 Reporte Mensual SofIA — ${clinic_name} · ${month_label}`,
    htmlContent: html,
    attachment:  [{ content: pdf_buffer.toString('base64'), name: pdf_filename }],
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${detail}`);
  }
}
