// Uses Brevo REST API instead of SMTP — Vercel serverless blocks outbound TCP (587/465)
const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.SMTP_PASS!;

// ── Welcome email for new clinic onboarding ──────────────────────────────────

export interface SendWelcomeEmailParams {
  to: string;                 // admin email (recipient)
  clinic_name: string;
  admin_password: string;
  staff_email?: string;       // second user (optional)
  staff_password?: string;
  panel_url: string;
  chatwoot_url?: string;
  twilio_webhook_url?: string; // https://chat.redsolucionesti.com/twilio/callback
  twilio_phone?: string;       // +14155238886
}

export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<void> {
  const { to, clinic_name, admin_password, staff_email, staff_password,
          panel_url, chatwoot_url, twilio_webhook_url, twilio_phone } = params;
  // Keep password alias for template readability
  const password = admin_password;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a SofIA</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;color:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:36px 32px;text-align:center;">
              <div style="font-size:11px;color:#a5b4fc;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Red Soluciones TI</div>
              <div style="font-size:32px;font-weight:bold;color:#a78bfa;margin-bottom:6px;">¡Bienvenido a SofIA!</div>
              <div style="font-size:15px;color:#e2e8f0;">${clinic_name}</div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.8;">
                Hola,<br><br>
                Tu cuenta de <strong style="color:#e2e8f0;">SofIA AI</strong> para <strong style="color:#a78bfa;">${clinic_name}</strong> está lista. A continuación encontrarás tus credenciales de acceso al panel de administración.
              </p>
            </td>
          </tr>

          <!-- Credentials box — Admin -->
          <tr>
            <td style="padding:24px 32px 12px;">
              <div style="background:#1e293b;border-radius:12px;padding:20px 24px;border:1px solid #334155;">
                <div style="font-size:10px;color:#7c3aed;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;">
                  👑 Administrador
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid #0f172a;">
                      <span style="font-size:11px;color:#64748b;display:block;margin-bottom:2px;">Email</span>
                      <span style="font-size:13px;color:#e2e8f0;font-family:monospace;">${to}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0 0;">
                      <span style="font-size:11px;color:#64748b;display:block;margin-bottom:2px;">Contraseña inicial</span>
                      <span style="font-size:15px;color:#a78bfa;font-family:monospace;font-weight:bold;letter-spacing:2px;">${password}</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          ${staff_email ? `
          <!-- Credentials box — Staff -->
          <tr>
            <td style="padding:0 32px 12px;">
              <div style="background:#1e293b;border-radius:12px;padding:20px 24px;border:1px solid #334155;">
                <div style="font-size:10px;color:#0891b2;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;">
                  👤 Recepcionista / Staff
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid #0f172a;">
                      <span style="font-size:11px;color:#64748b;display:block;margin-bottom:2px;">Email</span>
                      <span style="font-size:13px;color:#e2e8f0;font-family:monospace;">${staff_email}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0 0;">
                      <span style="font-size:11px;color:#64748b;display:block;margin-bottom:2px;">Contraseña inicial</span>
                      <span style="font-size:15px;color:#22d3ee;font-family:monospace;font-weight:bold;letter-spacing:2px;">${staff_password}</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Spacer -->
          <tr><td style="height:12px;"></td></tr>

          <!-- CTA button -->
          <tr>
            <td style="padding:0 32px 28px;text-align:center;">
              <a href="${panel_url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:bold;letter-spacing:0.5px;">
                Acceder al panel →
              </a>
              <p style="margin:12px 0 0;font-size:11px;color:#475569;">
                ${panel_url}
              </p>
            </td>
          </tr>

          ${twilio_webhook_url ? `
          <!-- Twilio WhatsApp config -->
          <tr>
            <td style="padding:0 32px 20px;">
              <div style="background:#0f1f0f;border-radius:12px;padding:20px;border:1px solid #14532d;">
                <div style="font-size:11px;color:#4ade80;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">WhatsApp / Twilio — Configuración</div>
                <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;line-height:1.6;">
                  Tu número de WhatsApp <strong style="color:#e2e8f0;">${twilio_phone || ''}</strong> ya está vinculado.<br>
                  En Twilio, configura el webhook de mensajes entrantes con esta URL:
                </p>
                <div style="background:#0a1a0a;border-radius:7px;padding:10px 14px;border:1px solid #166534;">
                  <span style="font-size:12px;color:#4ade80;font-family:monospace;">${twilio_webhook_url}</span>
                </div>
                <p style="margin:8px 0 0;font-size:11px;color:#475569;">
                  Twilio Console → Phone Numbers → tu número → Messaging → Webhook URL
                </p>
              </div>
            </td>
          </tr>
          ` : ''}

          ${chatwoot_url ? `
          <!-- Chatwoot access -->
          <tr>
            <td style="padding:0 32px 20px;">
              <div style="background:#0f2027;border-radius:12px;padding:20px;border:1px solid #1e3a4a;">
                <div style="font-size:11px;color:#67e8f9;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">Panel de conversaciones (Chatwoot)</div>
                <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;line-height:1.6;">
                  Tu cuenta de Chatwoot fue creada automáticamente. Desde ahí podrás ver todas las conversaciones de WhatsApp que gestiona SofIA.
                </p>
                <a href="${chatwoot_url}" style="display:inline-block;background:#0e7490;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:7px;font-size:13px;font-weight:bold;">
                  Abrir Chatwoot →
                </a>
                <p style="margin:10px 0 0;font-size:11px;color:#475569;">${chatwoot_url}</p>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Next steps -->
          <tr>
            <td style="padding:0 32px 28px;">
              <div style="background:#1e1b4b;border-radius:10px;padding:20px;border:1px solid #4c1d95;">
                <div style="font-size:11px;color:#a5b4fc;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">Primeros pasos</div>
                <ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#94a3b8;line-height:2;">
                  <li>Ingresa con tus credenciales y cambia tu contraseña</li>
                  <li>Configura el mensaje de bienvenida de SofIA</li>
                  <li>Revisa y personaliza tu base de conocimiento</li>
                  <li>Conecta tu número de WhatsApp al inbox configurado</li>
                  ${chatwoot_url ? '<li>Accede a Chatwoot para ver las conversaciones en tiempo real</li>' : ''}
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1e293b;">
              <p style="margin:0;font-size:10px;color:#475569;text-align:center;line-height:1.8;">
                Este correo fue generado automáticamente por SofIA AI.<br>
                Si no esperabas este mensaje, puedes ignorarlo.<br>
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

  const fromRaw = process.env.SMTP_FROM || 'SofIA AI <gabriel@redsolucionesti.com>';
  const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
  const senderName  = fromMatch ? fromMatch[1].trim() : 'SofIA AI';
  const senderEmail = fromMatch ? fromMatch[2].trim() : 'gabriel@redsolucionesti.com';

  const body = {
    sender:      { name: senderName, email: senderEmail },
    to:          [{ email: to }],
    subject:     `🎉 Bienvenido a SofIA — ${clinic_name}`,
    htmlContent: html,
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
};

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
