'use client';

import { useState, useEffect } from 'react';

interface Props {
  patientId: string;
  clinicId: string;
  readonly?: boolean;
}

type ToothStatus = 'healthy' | 'caries' | 'treated' | 'extracted' | 'crown' | 'implant' | 'missing';

interface ToothData {
  tooth_fdi: number;
  status: ToothStatus;
  surfaces?: string | null;
  notes?: string | null;
}

const STATUS_CYCLE: ToothStatus[] = [
  'healthy', 'caries', 'treated', 'extracted', 'crown', 'implant', 'missing',
];

const STATUS_LABELS: Record<ToothStatus, string> = {
  healthy:   'Sano',
  caries:    'Caries',
  treated:   'Tratado',
  extracted: 'Extracción',
  crown:     'Corona',
  implant:   'Implante',
  missing:   'Ausente',
};

const STATUS_FILL: Record<ToothStatus, string> = {
  healthy:   '#4b5563', // gray-600
  caries:    '#ef4444', // red-500
  treated:   '#3b82f6', // blue-500
  extracted: '#1f2937', // gray-800
  crown:     '#fbbf24', // amber-400
  implant:   '#8b5cf6', // violet-500
  missing:   'transparent',
};

const STATUS_STROKE: Record<ToothStatus, string> = {
  healthy:   '#4b5563',
  caries:    '#ef4444',
  treated:   '#3b82f6',
  extracted: '#1f2937',
  crown:     '#fbbf24',
  implant:   '#8b5cf6',
  missing:   '#6b7280', // dashed border color
};

const STATUS_LEGEND_BG: Record<ToothStatus, string> = {
  healthy:   '#4b5563',
  caries:    '#ef4444',
  treated:   '#3b82f6',
  extracted: '#1f2937',
  crown:     '#fbbf24',
  implant:   '#8b5cf6',
  missing:   'transparent',
};

// FDI layout rows
// Upper jaw: Q1 (18→11) then Q2 (21→28) — left to right in display
const UPPER_ROW: number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
// Lower jaw: Q4 (48→41) then Q3 (31→38) — left to right in display
const LOWER_ROW: number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const TOOTH_W = 28;
const TOOTH_H = 34;
const GAP_X   = 4;   // gap between teeth
const DIV_GAP = 10;  // extra gap at the midline divider
const RX      = 4;   // border radius

function toothX(index: number): number {
  // Index 0–7 = first quadrant, 8–15 = second quadrant
  // Add DIV_GAP extra space between index 7 and 8
  const base = index * (TOOTH_W + GAP_X);
  return index >= 8 ? base + DIV_GAP : base;
}

const SVG_W = toothX(15) + TOOTH_W + 1; // total width

function ToothShape({
  fdi,
  data,
  saving,
  showNumAbove,
  onClick,
}: {
  fdi: number;
  data: ToothData | undefined;
  saving: boolean;
  showNumAbove: boolean;
  onClick: () => void;
}) {
  const index   = UPPER_ROW.includes(fdi) ? UPPER_ROW.indexOf(fdi) : LOWER_ROW.indexOf(fdi);
  const x       = toothX(index);
  const status  = data?.status ?? 'healthy';
  const fill    = STATUS_FILL[status];
  const stroke  = STATUS_STROKE[status];
  const isDashed = status === 'missing';
  const isExtracted = status === 'extracted';

  const NUM_OFFSET = 14;
  const numY = showNumAbove ? -NUM_OFFSET + 2 : TOOTH_H + NUM_OFFSET - 2;

  return (
    <g
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`Diente ${fdi}: ${STATUS_LABELS[status]}`}
    >
      <rect
        x={x}
        y={0}
        width={TOOTH_W}
        height={TOOTH_H}
        rx={RX}
        ry={RX}
        fill={fill}
        stroke={stroke}
        strokeWidth={isDashed ? 1.5 : 1}
        strokeDasharray={isDashed ? '4 3' : undefined}
        opacity={saving ? 0.5 : 1}
      />
      {isExtracted && (
        <>
          <line
            x1={x + 6}  y1={6}
            x2={x + TOOTH_W - 6} y2={TOOTH_H - 6}
            stroke="#9ca3af" strokeWidth={2} strokeLinecap="round"
          />
          <line
            x1={x + TOOTH_W - 6} y1={6}
            x2={x + 6} y2={TOOTH_H - 6}
            stroke="#9ca3af" strokeWidth={2} strokeLinecap="round"
          />
        </>
      )}
      {saving && (
        <circle
          cx={x + TOOTH_W / 2}
          cy={TOOTH_H / 2}
          r={5}
          fill="none"
          stroke="#c4b5fd"
          strokeWidth={1.5}
          strokeDasharray="8 4"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${x + TOOTH_W / 2} ${TOOTH_H / 2}`}
            to={`360 ${x + TOOTH_W / 2} ${TOOTH_H / 2}`}
            dur="0.8s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      <text
        x={x + TOOTH_W / 2}
        y={numY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={9}
        fill="#9ca3af"
        style={{ userSelect: 'none', fontFamily: 'monospace' }}
      >
        {fdi}
      </text>
    </g>
  );
}

export default function Odontogram({ patientId, clinicId, readonly = false }: Props) {
  const [teeth, setTeeth]     = useState<Record<number, ToothData>>({});
  const [saving, setSaving]   = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/patient-teeth?patient_id=${patientId}`)
      .then(r => r.json())
      .then((rows: ToothData[]) => {
        const map: Record<number, ToothData> = {};
        if (Array.isArray(rows)) {
          rows.forEach(r => { map[r.tooth_fdi] = r; });
        }
        setTeeth(map);
        setLoading(false);
      })
      .catch(() => {
        setError('Error al cargar odontograma');
        setLoading(false);
      });
  }, [patientId]);

  function cycleStatus(current: ToothStatus): ToothStatus {
    const idx = STATUS_CYCLE.indexOf(current);
    return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
  }

  async function handleToothClick(fdi: number) {
    if (readonly) return;
    const current = teeth[fdi]?.status ?? 'healthy';
    const next = cycleStatus(current);

    // Optimistic update
    setTeeth(prev => ({
      ...prev,
      [fdi]: { ...prev[fdi], tooth_fdi: fdi, status: next },
    }));
    setSaving(prev => ({ ...prev, [fdi]: true }));

    try {
      const res = await fetch('/api/admin/patient-teeth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          clinic_id:  clinicId,
          tooth_fdi:  fdi,
          status:     next,
          surfaces:   teeth[fdi]?.surfaces ?? null,
          notes:      teeth[fdi]?.notes ?? null,
        }),
      });
      if (!res.ok) {
        // Revert on error
        setTeeth(prev => ({
          ...prev,
          [fdi]: { ...prev[fdi], tooth_fdi: fdi, status: current },
        }));
      } else {
        const updated: ToothData = await res.json();
        setTeeth(prev => ({ ...prev, [fdi]: updated }));
      }
    } catch {
      setTeeth(prev => ({
        ...prev,
        [fdi]: { ...prev[fdi], tooth_fdi: fdi, status: current },
      }));
    } finally {
      setSaving(prev => ({ ...prev, [fdi]: false }));
    }
  }

  const ROW_PADDING_TOP    = 16; // space above tooth number (upper row)
  const ROW_PADDING_BOTTOM = 16; // space below tooth number (lower row)
  const ROW_H = ROW_PADDING_TOP + TOOTH_H + ROW_PADDING_BOTTOM;

  // Upper SVG: numbers above teeth, teeth below
  // Lower SVG: teeth above, numbers below
  const UPPER_SVG_H = ROW_PADDING_TOP + TOOTH_H;  // number sits in padding area
  const LOWER_SVG_H = TOOTH_H + ROW_PADDING_BOTTOM;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-400 animate-pulse">Cargando odontograma...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Odontograma FDI</h3>
          {!readonly && (
            <p className="text-xs text-gray-500">Clic en un diente para cambiar su estado</p>
          )}
        </div>

        {/* Chart */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: SVG_W + 32, padding: '0 16px' }}>

            {/* Superior label */}
            <p style={{
              fontSize: 10,
              color: '#6b7280',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 4,
              paddingLeft: 2,
            }}>
              Superior
            </p>

            {/* Upper jaw */}
            <svg
              width={SVG_W}
              height={ROW_H}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {/* Midline divider */}
              <line
                x1={toothX(8) - DIV_GAP / 2}
                y1={ROW_PADDING_TOP - 4}
                x2={toothX(8) - DIV_GAP / 2}
                y2={ROW_PADDING_TOP + TOOTH_H + 4}
                stroke="#374151"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <g transform={`translate(0, ${ROW_PADDING_TOP})`}>
                {UPPER_ROW.map(fdi => (
                  <ToothShape
                    key={fdi}
                    fdi={fdi}
                    data={teeth[fdi]}
                    saving={!!saving[fdi]}
                    showNumAbove={true}
                    onClick={() => handleToothClick(fdi)}
                  />
                ))}
              </g>
            </svg>

            {/* Gap between jaws */}
            <div style={{ height: 12, borderBottom: '1px dashed #374151', marginBottom: 12 }} />

            {/* Lower jaw */}
            <svg
              width={SVG_W}
              height={ROW_H}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {/* Midline divider */}
              <line
                x1={toothX(8) - DIV_GAP / 2}
                y1={-4}
                x2={toothX(8) - DIV_GAP / 2}
                y2={TOOTH_H + 4}
                stroke="#374151"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <g transform="translate(0, 0)">
                {LOWER_ROW.map(fdi => (
                  <ToothShape
                    key={fdi}
                    fdi={fdi}
                    data={teeth[fdi]}
                    saving={!!saving[fdi]}
                    showNumAbove={false}
                    onClick={() => handleToothClick(fdi)}
                  />
                ))}
              </g>
            </svg>

            {/* Inferior label */}
            <p style={{
              fontSize: 10,
              color: '#6b7280',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 4,
              paddingLeft: 2,
            }}>
              Inferior
            </p>

          </div>
        </div>

        {/* Legend */}
        <div className="mt-5 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Leyenda</p>
          <div className="flex flex-wrap gap-3">
            {STATUS_CYCLE.map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: STATUS_LEGEND_BG[s],
                  border: s === 'missing'
                    ? '1.5px dashed #6b7280'
                    : `1px solid ${STATUS_STROKE[s]}`,
                  flexShrink: 0,
                }} />
                <span className="text-xs text-gray-400">{STATUS_LABELS[s]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
