/**
 * Monthly Report PDF — @react-pdf/renderer
 * Branding: Red Soluciones TI + SofIA
 * Layout: A4, dark theme (gray-900 / violet accent)
 */
import {
  Document, Page, View, Text, Image, StyleSheet, Font,
} from '@react-pdf/renderer';
import type { ReportMetrics } from './metrics';
import {
  StackedBarChart, DualLineChart, HorizontalBarChart, DonutChart,
} from './charts';

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingBottom: 30,
  },

  // ── Cover ──
  cover: {
    backgroundColor: '#0f172a',
    height: 841,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  coverLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 48,
  },
  coverLogoImg: { width: 90, height: 90, objectFit: 'contain' },
  coverDivider: { width: 1, height: 70, backgroundColor: '#334155' },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#a78bfa',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 6,
  },
  coverClinic: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 6,
  },
  coverMonth: {
    fontSize: 13,
    color: '#7c3aed',
    textAlign: 'center',
    marginTop: 4,
  },
  coverBadge: {
    marginTop: 48,
    backgroundColor: '#1e1b4b',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#4c1d95',
  },
  coverBadgeText: {
    fontSize: 8,
    color: '#a5b4fc',
    textAlign: 'center',
  },

  // ── Section page layout ──
  sectionPage: {
    padding: 32,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sectionDot: {
    width: 6, height: 24, backgroundColor: '#7c3aed',
    borderRadius: 3, marginRight: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#e2e8f0',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },

  // ── KPI cards ──
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  kpiCardAccent: {
    flex: 1,
    backgroundColor: '#1e1b4b',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#4c1d95',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: '#a78bfa',
    textAlign: 'center',
  },
  kpiValueGreen: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: '#34d399',
    textAlign: 'center',
  },
  kpiValueBlue: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: '#60a5fa',
    textAlign: 'center',
  },
  kpiValueAmber: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: '#fbbf24',
    textAlign: 'center',
  },
  kpiLabel: {
    fontSize: 7.5,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Charts + tables ──
  chartContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chartLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#cbd5e1',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Status table ──
  table: { marginBottom: 14 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#0f172a',
    borderRadius: 3,
    marginBottom: 1,
  },
  tableCell: { flex: 1, fontSize: 8, color: '#94a3b8' },
  tableCellBold: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#e2e8f0' },
  tableHeaderCell: { flex: 1, fontSize: 7.5, color: '#64748b', fontFamily: 'Helvetica-Bold' },

  // ── Two-column layout ──
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  // ── Stat badge ──
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statLabel: { flex: 1, fontSize: 8, color: '#94a3b8' },
  statValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#e2e8f0' },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 6,
  },
  footerText: { fontSize: 6.5, color: '#475569' },
  footerPage: { fontSize: 6.5, color: '#7c3aed' },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sofia.redsolucionesti.com';
const LOGO_RST   = `${APP_URL}/logo-rst.png`;
const LOGO_SOFIA = `${APP_URL}/logo-sofia.png`;

function Footer({ page, total, month }: { page: number; total: number; month: string }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>SofIA AI · Reporte Mensual {month} · Red Soluciones TI</Text>
      <Text style={S.footerPage}>Página {page} de {total}</Text>
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={S.sectionHeader}>
      <View style={S.sectionDot} />
      <View>
        <Text style={S.sectionTitle}>{title}</Text>
        {subtitle && <Text style={S.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// ── Document ─────────────────────────────────────────────────────────────────
export function MonthlyReportPDF({ m }: { m: ReportMetrics }) {
  const now = new Date().toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <Document
      title={`Reporte ${m.month_label} — ${m.clinic_name}`}
      author="SofIA AI · Red Soluciones TI"
      subject="Reporte Mensual de Actividad"
    >
      {/* ══════════════════════════════════════════
          PAGE 1 — COVER
      ══════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.cover}>
          {/* Logos */}
          <View style={S.coverLogos}>
            <Image src={LOGO_RST} style={S.coverLogoImg} />
            <View style={S.coverDivider} />
            <Image src={LOGO_SOFIA} style={S.coverLogoImg} />
          </View>

          <Text style={S.coverTitle}>REPORTE MENSUAL</Text>
          <Text style={S.coverSubtitle}>Actividad y Métricas · SofIA AI</Text>
          <Text style={S.coverClinic}>{m.clinic_name}</Text>
          <Text style={S.coverMonth}>{m.month_label}</Text>

          <View style={S.coverBadge}>
            <Text style={S.coverBadgeText}>
              Generado automáticamente el {now}{'\n'}
              Red Soluciones TI · redsolucionesti.com
            </Text>
          </View>
        </View>
        <Footer page={1} total={4} month={m.month_label} />
      </Page>

      {/* ══════════════════════════════════════════
          PAGE 2 — RESUMEN EJECUTIVO + CITAS
      ══════════════════════════════════════════ */}
      <Page size="A4" style={[S.page, S.sectionPage]}>
        <SectionHeader
          title="Resumen Ejecutivo"
          subtitle={`Indicadores clave de ${m.month_label}`}
        />

        {/* KPI row */}
        <View style={S.kpiRow}>
          <View style={S.kpiCardAccent}>
            <Text style={S.kpiValue}>{m.total_appointments}</Text>
            <Text style={S.kpiLabel}>Citas totales{'\n'}agendadas</Text>
          </View>
          <View style={S.kpiCard}>
            <Text style={S.kpiValueGreen}>{m.completion_rate}%</Text>
            <Text style={S.kpiLabel}>Tasa de{'\n'}completación</Text>
          </View>
          <View style={S.kpiCard}>
            <Text style={S.kpiValueBlue}>{m.total_conversations}</Text>
            <Text style={S.kpiLabel}>Conversaciones{'\n'}WhatsApp</Text>
          </View>
          <View style={S.kpiCard}>
            <Text style={S.kpiValueAmber}>{m.reminders_sent}</Text>
            <Text style={S.kpiLabel}>Recordatorios{'\n'}enviados</Text>
          </View>
        </View>

        {/* ── Citas del mes ── */}
        <SectionHeader
          title="Citas del Mes"
          subtitle="Distribución semanal por estado"
        />

        <View style={S.chartContainer}>
          <Text style={S.chartLabel}>Citas por semana</Text>
          <StackedBarChart data={m.weekly_bars} width={490} height={155} />
        </View>

        <View style={S.row}>
          {/* Status table */}
          <View style={S.col}>
            <View style={S.chartContainer}>
              <Text style={S.chartLabel}>Desglose por estado</Text>
              <View style={S.table}>
                <View style={S.tableHeader}>
                  <Text style={S.tableHeaderCell}>Estado</Text>
                  <Text style={S.tableHeaderCell}>Total</Text>
                  <Text style={S.tableHeaderCell}>%</Text>
                </View>
                {[
                  { label: 'Completadas', val: m.completed_appointments, color: '#a78bfa' },
                  { label: 'Canceladas',  val: m.cancelled_appointments, color: '#f87171' },
                  { label: 'No presentó', val: m.no_show_appointments,   color: '#fbbf24' },
                  { label: 'Pendientes',  val: m.total_appointments - m.completed_appointments - m.cancelled_appointments - m.no_show_appointments, color: '#60a5fa' },
                ].map((row, i) => (
                  <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                    <View style={{ ...S.tableCell as object, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: row.color, marginRight: 5 }} />
                      <Text style={S.tableCell}>{row.label}</Text>
                    </View>
                    <Text style={S.tableCellBold}>{row.val}</Text>
                    <Text style={S.tableCell}>
                      {m.total_appointments ? Math.round(row.val / m.total_appointments * 100) : 0}%
                    </Text>
                  </View>
                ))}
              </View>

              {/* Bot vs Manual */}
              <View style={{ marginTop: 6 }}>
                <Text style={S.chartLabel}>Origen</Text>
                <View style={S.statBadge}>
                  <View style={{ ...S.statDot as object, backgroundColor: '#818cf8' }} />
                  <Text style={S.statLabel}>Agendadas por SofIA (bot)</Text>
                  <Text style={S.statValue}>{m.bot_appointments}</Text>
                </View>
                <View style={S.statBadge}>
                  <View style={{ ...S.statDot as object, backgroundColor: '#fb923c' }} />
                  <Text style={S.statLabel}>Creadas manualmente (staff)</Text>
                  <Text style={S.statValue}>{m.manual_appointments}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Top services */}
          <View style={S.col}>
            <View style={S.chartContainer}>
              <Text style={S.chartLabel}>Top servicios solicitados</Text>
              <HorizontalBarChart data={m.top_services} width={218} height={160} />
            </View>
          </View>
        </View>

        <Footer page={2} total={4} month={m.month_label} />
      </Page>

      {/* ══════════════════════════════════════════
          PAGE 3 — CONVERSACIONES WHATSAPP
      ══════════════════════════════════════════ */}
      <Page size="A4" style={[S.page, S.sectionPage]}>
        <SectionHeader
          title="Conversaciones WhatsApp"
          subtitle="Actividad diaria y distribución bot vs humano"
        />

        {/* Daily line chart */}
        <View style={S.chartContainer}>
          <Text style={S.chartLabel}>Conversaciones y citas por día</Text>
          <DualLineChart data={m.daily_line} width={490} height={130} />
        </View>

        <View style={S.row}>
          {/* Donut */}
          <View style={{ width: 140 }}>
            <View style={S.chartContainer}>
              <Text style={S.chartLabel}>Bot vs Humano</Text>
              <DonutChart
                bot={m.bot_only_conversations}
                human={m.escalated_conversations}
                size={110}
              />
            </View>
          </View>

          {/* Stats */}
          <View style={S.col}>
            <View style={S.chartContainer}>
              <Text style={S.chartLabel}>Métricas de conversación</Text>
              {[
                { label: 'Total conversaciones iniciadas', val: String(m.total_conversations), color: '#818cf8' },
                { label: 'Resueltas solo por SofIA (bot)', val: `${m.bot_only_conversations} (${100 - m.escalation_rate}%)`, color: '#34d399' },
                { label: 'Escaladas a humano', val: `${m.escalated_conversations} (${m.escalation_rate}%)`, color: '#fbbf24' },
                { label: 'Promedio mensajes / conversación', val: String(m.avg_messages_per_conv), color: '#60a5fa' },
              ].map((stat, i) => (
                <View key={i} style={S.statBadge}>
                  <View style={{ ...S.statDot as object, backgroundColor: stat.color }} />
                  <Text style={S.statLabel}>{stat.label}</Text>
                  <Text style={S.statValue}>{stat.val}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Footer page={3} total={4} month={m.month_label} />
      </Page>

      {/* ══════════════════════════════════════════
          PAGE 4 — RECORDATORIOS + CIERRE
      ══════════════════════════════════════════ */}
      <Page size="A4" style={[S.page, S.sectionPage]}>
        <SectionHeader
          title="Recordatorios y Retención"
          subtitle="Efectividad de recordatorios automáticos 24h"
        />

        <View style={S.kpiRow}>
          <View style={S.kpiCardAccent}>
            <Text style={S.kpiValue}>{m.reminders_sent}</Text>
            <Text style={S.kpiLabel}>Recordatorios{'\n'}enviados</Text>
          </View>
          <View style={S.kpiCard}>
            <Text style={S.kpiValueAmber}>{m.no_show_appointments}</Text>
            <Text style={S.kpiLabel}>No se{'\n'}presentaron</Text>
          </View>
          <View style={S.kpiCard}>
            <Text style={S.kpiValueGreen}>
              {m.total_appointments > 0
                ? Math.round((1 - m.no_show_appointments / m.total_appointments) * 100)
                : 100}%
            </Text>
            <Text style={S.kpiLabel}>Tasa de{'\n'}asistencia</Text>
          </View>
          <View style={S.kpiCard}>
            <Text style={S.kpiValue}>{m.cancellation_rate}%</Text>
            <Text style={S.kpiLabel}>Tasa de{'\n'}cancelación</Text>
          </View>
        </View>

        {/* ── Cobros del mes ── */}
        <View style={{ marginTop: 14, marginBottom: 4 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#f1f5f9', marginBottom: 8 }}>
            Cobros del mes
          </Text>
          <View style={S.kpiRow}>
            <View style={{ ...S.kpiCard as object, borderColor: '#78350f' }}>
              <Text style={{ ...S.kpiValueAmber as object }}>
                {`S/ ${Number(m.revenue_month).toLocaleString('es-PE', { minimumFractionDigits: 0 })}`}
              </Text>
              <Text style={S.kpiLabel}>Cobrado{'\n'}este mes</Text>
            </View>
            <View style={{ ...S.kpiCard as object, borderColor: '#7c3aed' }}>
              <Text style={{ ...S.kpiValue as object }}>
                {`S/ ${Number(m.debt_total).toLocaleString('es-PE', { minimumFractionDigits: 0 })}`}
              </Text>
              <Text style={S.kpiLabel}>Deuda{'\n'}total</Text>
            </View>
            <View style={{ ...S.kpiCard as object, borderColor: '#991b1b' }}>
              <Text style={{ ...S.kpiValue as object, color: '#f87171' }}>
                {`S/ ${Number(m.debt_overdue).toLocaleString('es-PE', { minimumFractionDigits: 0 })}`}
              </Text>
              <Text style={S.kpiLabel}>Deuda{'\n'}vencida</Text>
            </View>
            <View style={S.kpiCard}>
              <Text style={S.kpiValue}>{m.debt_reminders_month}</Text>
              <Text style={S.kpiLabel}>Recordat.{'\n'}de cobro</Text>
            </View>
          </View>
        </View>

        {/* ── NPS ── */}
        {m.nps_total > 0 && (
          <View style={{ marginTop: 14, marginBottom: 4 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#f1f5f9', marginBottom: 8 }}>
              Satisfacción de Pacientes (NPS)
            </Text>
            <View style={S.kpiRow}>
              <View style={{ ...S.kpiCardAccent as object }}>
                <Text style={{ fontSize: 26, fontFamily: 'Helvetica-Bold', color: m.nps_score >= 50 ? '#34d399' : m.nps_score >= 0 ? '#fbbf24' : '#f87171', textAlign: 'center' }}>
                  {m.nps_score > 0 ? '+' : ''}{m.nps_score}
                </Text>
                <Text style={S.kpiLabel}>NPS Score</Text>
              </View>
              <View style={S.kpiCard}>
                <Text style={S.kpiValueAmber}>{m.nps_avg_score.toFixed(1)}</Text>
                <Text style={S.kpiLabel}>Promedio{'\n'}(sobre 5)</Text>
              </View>
              <View style={S.kpiCard}>
                <Text style={S.kpiValueGreen}>{m.nps_promoters}</Text>
                <Text style={S.kpiLabel}>Promotores{'\n'}(4-5 ⭐)</Text>
              </View>
              <View style={{ ...S.kpiCard as object, borderColor: '#7f1d1d' }}>
                <Text style={{ ...S.kpiValue as object, color: '#f87171' }}>{m.nps_detractors}</Text>
                <Text style={S.kpiLabel}>Detractores{'\n'}(1-2 ⭐)</Text>
              </View>
            </View>
          </View>
        )}

        {/* Summary text */}
        <View style={{ ...S.chartContainer as object, marginTop: 8 }}>
          <Text style={S.chartLabel}>Resumen del mes</Text>
          <Text style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.6 }}>
            Durante {m.month_label}, SofIA gestionó {m.total_conversations} conversaciones de WhatsApp
            para {m.clinic_name}. El bot resolvió automáticamente el {100 - m.escalation_rate}% de las
            interacciones sin necesidad de intervención humana, mientras que el {m.escalation_rate}%
            restante fue escalado al equipo de la clínica.{'\n\n'}

            Se agendaron {m.total_appointments} citas en total, de las cuales{' '}
            {m.completed_appointments} fueron completadas exitosamente ({m.completion_rate}% de
            completación). Se enviaron {m.reminders_sent} recordatorios automáticos 24 horas
            antes de cada cita.{' '}
            {m.revenue_month > 0 ? `Se cobraron S/ ${Number(m.revenue_month).toLocaleString('es-PE')} durante el mes. ` : ''}
            {m.nps_total > 0 ? `Los pacientes dieron una puntuación promedio de ${m.nps_avg_score.toFixed(1)}/5 (NPS ${m.nps_score > 0 ? '+' : ''}${m.nps_score}).` : ''}
          </Text>
        </View>

        {/* Footer CTA */}
        <View style={{
          marginTop: 'auto',
          backgroundColor: '#1e1b4b',
          borderRadius: 10,
          padding: 20,
          borderWidth: 1,
          borderColor: '#4c1d95',
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#a78bfa', marginBottom: 6 }}>
            ¿Preguntas sobre este reporte?
          </Text>
          <Text style={{ fontSize: 8, color: '#94a3b8', textAlign: 'center' }}>
            Contacta a tu equipo de soporte en info@redsolucionesti.com{'\n'}
            o accede al dashboard en redsolucionesti.com
          </Text>
        </View>

        <Footer page={4} total={4} month={m.month_label} />
      </Page>
    </Document>
  );
}
