// @ts-nocheck — react-pdf SVG Text types don't expose fontSize/fill/textAnchor in current typedefs
/**
 * Custom SVG chart components for @react-pdf/renderer
 * All charts are pure SVG — no canvas, no external chart library required.
 */
import { Svg, Rect, Line, Text, Path, Circle, G } from '@react-pdf/renderer';
import type { WeekBar, DayLine, ServiceRow } from './metrics';

// ── Color palette ────────────────────────────────────────────────────────────
const C = {
  scheduled: '#60a5fa', // blue-400
  confirmed:  '#34d399', // emerald-400
  completed:  '#a78bfa', // violet-400
  cancelled:  '#f87171', // red-400
  no_show:    '#fbbf24', // amber-400
  conv:       '#818cf8', // indigo-400
  appt:       '#34d399', // emerald-400
  grid:       '#374151', // gray-700
  text:       '#9ca3af', // gray-400
  bg:         '#1f2937', // gray-800
  white:      '#f9fafb',
};

// ── Helper: map value to y pixel ─────────────────────────────────────────────
function yPos(value: number, maxVal: number, chartH: number, padTop = 10): number {
  if (maxVal === 0) return chartH;
  return padTop + (1 - value / maxVal) * (chartH - padTop);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STACKED BAR CHART — Weekly appointments by status
// ─────────────────────────────────────────────────────────────────────────────
interface StackedBarProps {
  data: WeekBar[];
  width?: number;
  height?: number;
}

export function StackedBarChart({ data, width = 460, height = 160 }: StackedBarProps) {
  if (!data || data.length === 0) return null;

  const padL = 28, padR = 8, padT = 10, padB = 28;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const maxTotal = Math.max(...data.map(w =>
    w.completed + w.confirmed + w.scheduled + w.cancelled + w.no_show
  ), 1);

  const gridLines = 4;
  const barW = Math.floor(chartW / data.length * 0.55);
  const gap  = chartW / data.length;

  const STATUS_STACK: Array<{ key: keyof WeekBar; color: string }> = [
    { key: 'cancelled',  color: C.cancelled  },
    { key: 'no_show',    color: C.no_show    },
    { key: 'scheduled',  color: C.scheduled  },
    { key: 'confirmed',  color: C.confirmed  },
    { key: 'completed',  color: C.completed  },
  ];

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Background */}
      <Rect x={0} y={0} width={width} height={height} rx={6} fill={C.bg} />

      {/* Grid lines */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padT + (i / gridLines) * chartH;
        const val = Math.round(maxTotal * (1 - i / gridLines));
        return (
          <G key={i}>
            <Line
              x1={padL} y1={y} x2={padL + chartW} y2={y}
              stroke={C.grid} strokeWidth={0.5}
              strokeDasharray={i === gridLines ? '' : '3,3'}
            />
            <Text
              x={padL - 4} y={y + 3}
              fontSize={7} fill={C.text} textAnchor="end"
            >{val}</Text>
          </G>
        );
      })}

      {/* Bars */}
      {data.map((week, wi) => {
        const x = padL + wi * gap + (gap - barW) / 2;
        let stackY = padT + chartH; // start from bottom

        return (
          <G key={wi}>
            {STATUS_STACK.map(({ key, color }) => {
              const val = week[key] as number;
              if (val === 0) return null;
              const barH = (val / maxTotal) * chartH;
              stackY -= barH;
              return (
                <Rect
                  key={key}
                  x={x} y={stackY}
                  width={barW} height={barH}
                  fill={color}
                  rx={wi === 0 ? 2 : 0}
                />
              );
            })}
            {/* Week label */}
            <Text
              x={x + barW / 2} y={padT + chartH + 10}
              fontSize={8} fill={C.text} textAnchor="middle"
            >{week.week}</Text>
          </G>
        );
      })}

      {/* Legend */}
      {[
        { color: C.completed, label: 'Completada' },
        { color: C.confirmed, label: 'Confirmada' },
        { color: C.scheduled, label: 'Agendada' },
        { color: C.cancelled, label: 'Cancelada' },
        { color: C.no_show,   label: 'No presentó' },
      ].map((item, i) => (
        <G key={i}>
          <Rect x={padL + i * 86} y={height - 10} width={7} height={7} fill={item.color} rx={1} />
          <Text x={padL + i * 86 + 10} y={height - 4} fontSize={6.5} fill={C.text}>{item.label}</Text>
        </G>
      ))}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DUAL LINE CHART — Daily conversations + appointments
// ─────────────────────────────────────────────────────────────────────────────
interface DualLineProps {
  data: DayLine[];
  width?: number;
  height?: number;
}

export function DualLineChart({ data, width = 460, height = 130 }: DualLineProps) {
  const padL = 28, padR = 8, padT = 12, padB = 24;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  if (data.length < 2) {
    return (
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} rx={6} fill={C.bg} />
        <Text x={width / 2} y={height / 2} fontSize={9} fill={C.text} textAnchor="middle">
          Sin datos suficientes
        </Text>
      </Svg>
    );
  }

  const maxConv = Math.max(...data.map(d => d.conversations), 1);
  const maxAppt = Math.max(...data.map(d => d.appointments), 1);
  const maxVal  = Math.max(maxConv, maxAppt, 1);

  const xStep = chartW / (data.length - 1);

  // Build SVG path strings
  const convPoints = data.map((d, i) => ({
    x: padL + i * xStep,
    y: yPos(d.conversations, maxVal, chartH, padT),
  }));
  const apptPoints = data.map((d, i) => ({
    x: padL + i * xStep,
    y: yPos(d.appointments, maxVal, chartH, padT),
  }));

  function toPath(pts: { x: number; y: number }[]) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }

  function toAreaPath(pts: { x: number; y: number }[], bottom: number) {
    const line = toPath(pts);
    return `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${bottom} L ${pts[0].x.toFixed(1)} ${bottom} Z`;
  }

  const bottom = padT + chartH;

  // X-axis labels — show every ~5 points to avoid crowding
  const labelEvery = Math.max(1, Math.floor(data.length / 6));

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} rx={6} fill={C.bg} />

      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
        const y = padT + frac * chartH;
        return (
          <G key={i}>
            <Line x1={padL} y1={y} x2={padL + chartW} y2={y}
              stroke={C.grid} strokeWidth={0.5} strokeDasharray="3,3" />
            <Text x={padL - 4} y={y + 3} fontSize={7} fill={C.text} textAnchor="end">
              {Math.round(maxVal * (1 - frac))}
            </Text>
          </G>
        );
      })}

      {/* Area fills */}
      <Path d={toAreaPath(convPoints, bottom)} fill={C.conv} fillOpacity={0.12} />
      <Path d={toAreaPath(apptPoints, bottom)} fill={C.appt} fillOpacity={0.12} />

      {/* Lines */}
      <Path d={toPath(convPoints)} stroke={C.conv} strokeWidth={1.5} fill="none" />
      <Path d={toPath(apptPoints)} stroke={C.appt} strokeWidth={1.5} fill="none" />

      {/* Dots at data points */}
      {convPoints.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2} fill={C.conv} />
      ))}
      {apptPoints.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2} fill={C.appt} />
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => {
        if (i % labelEvery !== 0) return null;
        return (
          <Text key={i}
            x={padL + i * xStep} y={bottom + 10}
            fontSize={6.5} fill={C.text} textAnchor="middle"
          >{d.day}</Text>
        );
      })}

      {/* Legend */}
      <Rect x={padL} y={height - 10} width={7} height={7} fill={C.conv} rx={1} />
      <Text x={padL + 10} y={height - 4} fontSize={6.5} fill={C.text}>Conversaciones</Text>
      <Rect x={padL + 100} y={height - 10} width={7} height={7} fill={C.appt} rx={1} />
      <Text x={padL + 110} y={height - 4} fontSize={6.5} fill={C.text}>Citas</Text>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HORIZONTAL BAR CHART — Top services
// ─────────────────────────────────────────────────────────────────────────────
interface HBarProps {
  data: ServiceRow[];
  width?: number;
  height?: number;
}

export function HorizontalBarChart({ data, width = 220, height = 140 }: HBarProps) {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const barH   = 14;
  const gap    = 4;
  const labelW = 110;
  const barAreaW = width - labelW - 30;
  const totalH = data.length * (barH + gap) + 10;
  const h = Math.min(height, totalH + 10);

  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <Rect x={0} y={0} width={width} height={h} rx={6} fill={C.bg} />
      {data.map((row, i) => {
        const y     = 8 + i * (barH + gap);
        const barW  = Math.max(2, (row.count / maxVal) * barAreaW);
        const label = row.service.length > 18 ? row.service.slice(0, 17) + '…' : row.service;
        return (
          <G key={i}>
            <Text x={4} y={y + barH - 3} fontSize={7.5} fill={C.text}>{label}</Text>
            {/* Background track */}
            <Rect x={labelW} y={y + 2} width={barAreaW} height={barH - 4} rx={3} fill={C.grid} />
            {/* Filled bar */}
            <Rect x={labelW} y={y + 2} width={barW} height={barH - 4} rx={3} fill={C.completed} />
            {/* Count label */}
            <Text x={labelW + barAreaW + 4} y={y + barH - 3} fontSize={7.5} fill={C.white}>{row.count}</Text>
          </G>
        );
      })}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DONUT CHART — Bot vs Human
// ─────────────────────────────────────────────────────────────────────────────
interface DonutProps {
  bot: number;
  human: number;
  size?: number;
}

export function DonutChart({ bot, human, size = 100 }: DonutProps) {
  const total = bot + human;
  if (total === 0) return null;

  const cx = size / 2, cy = size / 2;
  const R = size * 0.38, r = size * 0.22;
  const botFrac   = bot / total;
  const humanFrac = human / total;

  // Arc path helper (clockwise from top)
  function arc(startFrac: number, endFrac: number, outerR: number, innerR: number) {
    const start = startFrac * 2 * Math.PI - Math.PI / 2;
    const end   = endFrac   * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + outerR * Math.cos(start);
    const y1 = cy + outerR * Math.sin(start);
    const x2 = cx + outerR * Math.cos(end);
    const y2 = cy + outerR * Math.sin(end);
    const x3 = cx + innerR * Math.cos(end);
    const y3 = cy + innerR * Math.sin(end);
    const x4 = cx + innerR * Math.cos(start);
    const y4 = cy + innerR * Math.sin(start);
    const large = (endFrac - startFrac) > 0.5 ? 1 : 0;
    return [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${outerR} ${outerR} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
      'Z',
    ].join(' ');
  }

  return (
    <Svg width={size} height={size + 28} viewBox={`0 0 ${size} ${size + 28}`}>
      <Rect x={0} y={0} width={size} height={size + 28} rx={6} fill={C.bg} />

      {/* Bot slice */}
      <Path d={arc(0, botFrac, R, r)} fill={C.conv} />
      {/* Human slice */}
      <Path d={arc(botFrac, 1, R, r)} fill={C.no_show} />

      {/* Center text */}
      <Text x={cx} y={cy - 4} fontSize={11} fill={C.white} textAnchor="middle" fontFamily="Helvetica-Bold">
        {Math.round(botFrac * 100)}%
      </Text>
      <Text x={cx} y={cy + 8} fontSize={6.5} fill={C.text} textAnchor="middle">Bot</Text>

      {/* Legend */}
      <Rect x={4} y={size + 6} width={7} height={7} fill={C.conv} rx={1} />
      <Text x={14} y={size + 13} fontSize={7} fill={C.text}>Bot ({bot})</Text>
      <Rect x={size / 2 + 2} y={size + 6} width={7} height={7} fill={C.no_show} rx={1} />
      <Text x={size / 2 + 12} y={size + 13} fontSize={7} fill={C.text}>Humano ({human})</Text>
    </Svg>
  );
}
