'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  patientId: string;
  clinicId: string;
  readonly?: boolean;
}

type ToothStatus = 'healthy' | 'caries' | 'treated' | 'extracted' | 'crown' | 'implant' | 'missing';
type Surface = 'O' | 'M' | 'D' | 'V' | 'L';

interface ToothData {
  tooth_fdi: number;
  status: ToothStatus;
  surfaces?: string | null;
  notes?: string | null;
}

interface ToothDraft {
  status: ToothStatus;
  surfaces: Surface[];
  notes: string;
}

const STATUS_CYCLE: ToothStatus[] = [
  'healthy', 'caries', 'treated', 'extracted', 'crown', 'implant', 'missing',
];

const STATUS_CONFIG: Record<ToothStatus, {
  label: string;
  crown: string;
  stroke: string;
  root: string;
  legendBg: string;
  dashed?: boolean;
}> = {
  healthy:   { label: 'Sano',       crown: '#374151', stroke: '#4b5563', root: '#1f2937', legendBg: '#4b5563' },
  caries:    { label: 'Caries',     crown: '#dc2626', stroke: '#ef4444', root: '#7f1d1d', legendBg: '#ef4444' },
  treated:   { label: 'Tratado',    crown: '#1d4ed8', stroke: '#3b82f6', root: '#1e3a8a', legendBg: '#3b82f6' },
  extracted: { label: 'Extracción', crown: '#111827', stroke: '#374151', root: '#111827', legendBg: '#1f2937' },
  crown:     { label: 'Corona',     crown: '#b45309', stroke: '#f59e0b', root: '#78350f', legendBg: '#f59e0b' },
  implant:   { label: 'Implante',   crown: '#5b21b6', stroke: '#8b5cf6', root: '#3b0764', legendBg: '#8b5cf6' },
  missing:   { label: 'Ausente',    crown: 'transparent', stroke: '#4b5563', root: 'transparent', legendBg: 'transparent', dashed: true },
};

const SURFACE_LABELS: Record<Surface, string> = {
  O: 'Oclusal',
  M: 'Mesial',
  D: 'Distal',
  V: 'Vestibular',
  L: 'Ling./Pal.',
};

const UPPER_ROW: number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ROW: number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function toothWidth(fdi: number): number {
  if ([16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48].includes(fdi)) return 30;
  if ([14, 15, 24, 25, 34, 35, 44, 45].includes(fdi)) return 23;
  return 19;
}

interface ToothLayout { fdi: number; x: number; w: number; }

function buildRow(fdis: number[]): ToothLayout[] {
  const GAP = 3;
  const MIDGAP = 14;
  let x = 0;
  return fdis.map((fdi, idx) => {
    const w = toothWidth(fdi);
    const entry: ToothLayout = { fdi, x, w };
    x += w + GAP;
    if (idx === 7) x += MIDGAP;
    return entry;
  });
}

const UPPER_LAYOUT = buildRow(UPPER_ROW);
const LOWER_LAYOUT = buildRow(LOWER_ROW);
const SVG_W = UPPER_LAYOUT[15].x + UPPER_LAYOUT[15].w;

const CROWN_H  = 30;
const ROOT_H   = 12;
const ROOT_GAP = 3;
const NUM_GAP  = 13;
const TOOTH_GRP_H = ROOT_H + ROOT_GAP + CROWN_H;
const ROW_H = NUM_GAP + TOOTH_GRP_H + NUM_GAP;
const MIDLINE_X = UPPER_LAYOUT[7].x + UPPER_LAYOUT[7].w + 7;

function parseSurfaces(s: string | null | undefined): Surface[] {
  if (!s) return [];
  return s.split(',').filter((x): x is Surface => ['O', 'M', 'D', 'V', 'L'].includes(x));
}

function serializeSurfaces(surfaces: Surface[]): string {
  return surfaces.join(',');
}

function toothName(fdi: number): string {
  const q = Math.floor(fdi / 10);
  const n = fdi % 10;
  const jaw  = q <= 2 ? 'Sup.' : 'Inf.';
  const side = (q === 1 || q === 4) ? 'Der.' : 'Izq.';
  const names: Record<number, string> = {
    1: 'Incisivo Central', 2: 'Incisivo Lateral', 3: 'Canino',
    4: 'Premolar 1',       5: 'Premolar 2',
    6: 'Molar 1',          7: 'Molar 2',          8: 'Molar 3',
  };
  return `${names[n] ?? 'Pieza'} ${jaw} ${side}`;
}

function getSurfaceName(fdi: number, surface: Surface): string {
  const n = fdi % 10;
  if (surface === 'O' && n <= 3) return 'Incisal';
  return SURFACE_LABELS[surface];
}

function buildZones(x: number, crownY: number, w: number) {
  const sideW  = Math.max(Math.floor(w * 0.27), 5);
  const stripH = Math.max(Math.floor(CROWN_H * 0.28), 7);
  const innerH = CROWN_H - stripH * 2;
  return {
    V: { x,             y: crownY,                  w,               h: stripH  },
    L: { x,             y: crownY + CROWN_H - stripH, w,             h: stripH  },
    M: { x,             y: crownY + stripH,          w: sideW,       h: innerH  },
    D: { x: x + w - sideW, y: crownY + stripH,      w: sideW,       h: innerH  },
    O: { x: x + sideW,  y: crownY + stripH,          w: w - sideW * 2, h: innerH },
  };
}

// ─── SurfaceZones ────────────────────────────────────────────────────────────

function SurfaceZones({ x, crownY, w, surfaces, statusColor }: {
  x: number; crownY: number; w: number;
  surfaces: Surface[];
  statusColor: string;
}) {
  if (surfaces.length === 0) return null;
  const zones = buildZones(x, crownY, w);
  return (
    <g>
      {(['V', 'L', 'M', 'D', 'O'] as Surface[]).map(k => {
        const z = zones[k];
        const active = surfaces.includes(k);
        return (
          <rect
            key={k}
            x={z.x} y={z.y} width={z.w} height={z.h}
            fill={active ? statusColor : 'rgba(0,0,0,0.4)'}
            opacity={active ? 0.85 : 0.55}
          />
        );
      })}
    </g>
  );
}

// ─── ToothGroup ──────────────────────────────────────────────────────────────

function ToothGroup({
  layout, data, saving, isUpper, hovered, selected, readonly,
  onMouseEnter, onMouseLeave, onClick,
}: {
  layout: ToothLayout;
  data: ToothData | undefined;
  saving: boolean;
  isUpper: boolean;
  hovered: boolean;
  selected: boolean;
  readonly: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const { x, w, fdi } = layout;
  const status    = data?.status ?? 'healthy';
  const cfg       = STATUS_CONFIG[status];
  const surfaces  = parseSurfaces(data?.surfaces);
  const hasNotes  = !!(data?.notes?.trim());
  const hasSurfs  = surfaces.length > 0;
  const cx        = x + w / 2;

  const crownY  = isUpper ? ROOT_H + ROOT_GAP : 0;
  const rootY   = isUpper ? 0 : CROWN_H + ROOT_GAP;
  const rootW   = Math.max(w - 10, 8);
  const rootX   = cx - rootW / 2;
  const numY    = isUpper ? -(NUM_GAP - 3) : TOOTH_GRP_H + (NUM_GAP - 3);
  const strokeW = selected ? 2.5 : hovered ? 2 : 1.5;
  const opacity = saving ? 0.55 : 1;

  // dark background when surfaces are set (zones carry the color)
  const crownFill = (hasSurfs && status !== 'extracted' && status !== 'missing')
    ? '#111827' : cfg.crown;

  return (
    <g
      transform={`translate(0, ${NUM_GAP})`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: readonly ? 'default' : 'pointer' }}
      role="button"
      aria-label={`Diente ${fdi}: ${cfg.label}`}
    >
      {/* Selection ring */}
      {selected && (
        <rect
          x={x - 3} y={crownY - 3} width={w + 6} height={CROWN_H + 6}
          rx={8} ry={8}
          fill="none" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 2"
          opacity={0.8}
        />
      )}

      {/* Root */}
      {status !== 'extracted' && status !== 'missing' && (
        <rect
          x={rootX} y={rootY} width={rootW} height={ROOT_H}
          rx={3} ry={3}
          fill={cfg.root} opacity={opacity * 0.85}
        />
      )}

      {/* Crown */}
      {status === 'missing' ? (
        <rect
          x={x} y={crownY} width={w} height={CROWN_H}
          rx={6} ry={6}
          fill="transparent" stroke={cfg.stroke}
          strokeWidth={1.5} strokeDasharray="4 3" opacity={opacity}
        />
      ) : status === 'extracted' ? (
        <>
          <rect
            x={x} y={crownY} width={w} height={CROWN_H}
            rx={6} ry={6}
            fill={cfg.crown} stroke={cfg.stroke} strokeWidth={strokeW} opacity={opacity}
          />
          <line x1={x + 6}     y1={crownY + 6}           x2={x + w - 6} y2={crownY + CROWN_H - 6}
            stroke="#6b7280" strokeWidth={2} strokeLinecap="round" />
          <line x1={x + w - 6} y1={crownY + 6}           x2={x + 6}     y2={crownY + CROWN_H - 6}
            stroke="#6b7280" strokeWidth={2} strokeLinecap="round" />
        </>
      ) : (
        <>
          <rect
            x={x} y={crownY} width={w} height={CROWN_H}
            rx={6} ry={6}
            fill={crownFill}
            stroke={selected ? '#6366f1' : cfg.stroke}
            strokeWidth={strokeW} opacity={opacity}
          />

          {/* Surface zone overlays */}
          {hasSurfs && (
            <SurfaceZones
              x={x} crownY={crownY} w={w}
              surfaces={surfaces} statusColor={cfg.crown}
            />
          )}

          {/* Status dot when no surfaces defined */}
          {status !== 'healthy' && !hasSurfs && (
            <circle cx={cx} cy={crownY + CROWN_H / 2} r={4}
              fill={cfg.stroke} opacity={opacity * 0.9} />
          )}

          {/* Crown cap */}
          {status === 'crown' && (
            <rect x={x + 3} y={crownY + 3} width={w - 6} height={7}
              rx={3} ry={3} fill="#fbbf24" opacity={opacity * 0.5} />
          )}

          {/* Implant post */}
          {status === 'implant' && (
            <rect x={cx - 2} y={crownY + CROWN_H - 8} width={4} height={ROOT_H + ROOT_GAP + 8}
              rx={2} fill="#a78bfa" opacity={opacity * 0.7} />
          )}

          {/* Notes indicator: amber dot top-right */}
          {hasNotes && (
            <circle cx={x + w - 5} cy={crownY + 5} r={3.5}
              fill="#f59e0b" opacity={0.9} />
          )}
        </>
      )}

      {/* Saving spinner */}
      {saving && (
        <circle cx={cx} cy={crownY + CROWN_H / 2} r={7}
          fill="none" stroke="#c4b5fd" strokeWidth={2} strokeDasharray="10 5">
          <animateTransform
            attributeName="transform" type="rotate"
            from={`0 ${cx} ${crownY + CROWN_H / 2}`}
            to={`360 ${cx} ${crownY + CROWN_H / 2}`}
            dur="0.7s" repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Tooth number */}
      <text
        x={cx} y={numY}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fontFamily="ui-monospace, monospace"
        fill={selected ? '#a5b4fc' : hovered ? '#e5e7eb' : '#6b7280'}
        style={{ userSelect: 'none' }}
      >
        {fdi}
      </text>
    </g>
  );
}

// ─── SurfaceButton ────────────────────────────────────────────────────────────

function SurfaceButton({ surface, fdi, active, onToggle, statusColor }: {
  surface: Surface; fdi: number; active: boolean;
  onToggle: () => void; statusColor: string;
}) {
  const label = surface === 'O' ? getSurfaceName(fdi, 'O').slice(0, 3) : surface;
  return (
    <button
      onClick={onToggle}
      title={getSurfaceName(fdi, surface)}
      style={{
        width: 38, height: 30,
        borderRadius: 6, fontSize: 10, fontWeight: 700,
        cursor: 'pointer',
        border: `1.5px solid ${active ? statusColor : '#334155'}`,
        background: active ? statusColor + '33' : '#1e293b',
        color: active ? statusColor : '#4b5563',
        transition: 'all 0.12s',
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </button>
  );
}

// ─── ToothDetailPanel ─────────────────────────────────────────────────────────

function ToothDetailPanel({ fdi, draft, saving, onChange, onSave, onClose }: {
  fdi: number;
  draft: ToothDraft;
  saving: boolean;
  onChange: (d: ToothDraft) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, [fdi]);

  function toggleSurface(s: Surface) {
    const next = draft.surfaces.includes(s)
      ? draft.surfaces.filter(x => x !== s)
      : [...draft.surfaces, s];
    onChange({ ...draft, surfaces: next });
  }

  const cfg = STATUS_CONFIG[draft.status];

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderTop: `2px solid #6366f1`,
      borderRadius: '0 0 16px 16px',
      padding: '16px 20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 22, fontWeight: 700, color: '#a5b4fc' }}>
            {fdi}
          </span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{toothName(fdi)}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: '1px solid #1e293b',
            cursor: 'pointer', color: '#4b5563', fontSize: 14,
            padding: '2px 8px', borderRadius: 6, lineHeight: 1.4,
          }}
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Status pills */}
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
            Estado
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 260 }}>
            {STATUS_CYCLE.map(s => {
              const c = STATUS_CONFIG[s];
              const active = draft.status === s;
              return (
                <button
                  key={s}
                  onClick={() => onChange({ ...draft, status: s })}
                  style={{
                    padding: '3px 10px', borderRadius: 99,
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${active ? c.stroke : c.stroke + '40'}`,
                    background: active ? c.crown : 'transparent',
                    color: active ? '#f9fafb' : c.stroke,
                    transition: 'all 0.1s',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Surface cross picker */}
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
            Superficies
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 38px)', gridTemplateRows: 'repeat(3, 30px)', gap: 3 }}>
            {/* Row 1 */}
            <div />
            <SurfaceButton surface="V" fdi={fdi} active={draft.surfaces.includes('V')} onToggle={() => toggleSurface('V')} statusColor={cfg.stroke} />
            <div />
            {/* Row 2 */}
            <SurfaceButton surface="M" fdi={fdi} active={draft.surfaces.includes('M')} onToggle={() => toggleSurface('M')} statusColor={cfg.stroke} />
            <SurfaceButton surface="O" fdi={fdi} active={draft.surfaces.includes('O')} onToggle={() => toggleSurface('O')} statusColor={cfg.stroke} />
            <SurfaceButton surface="D" fdi={fdi} active={draft.surfaces.includes('D')} onToggle={() => toggleSurface('D')} statusColor={cfg.stroke} />
            {/* Row 3 */}
            <div />
            <SurfaceButton surface="L" fdi={fdi} active={draft.surfaces.includes('L')} onToggle={() => toggleSurface('L')} statusColor={cfg.stroke} />
            <div />
          </div>
          {/* Surface labels */}
          {draft.surfaces.length > 0 && (
            <div style={{ fontSize: 10, color: '#6366f1', marginTop: 5, maxWidth: 120 }}>
              {draft.surfaces.map(s => getSurfaceName(fdi, s)).join(' · ')}
            </div>
          )}
        </div>

        {/* Diagnosis notes */}
        <div style={{ flex: '1 1 180px' }}>
          <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
            Diagnóstico
          </div>
          <textarea
            ref={inputRef}
            value={draft.notes}
            onChange={e => onChange({ ...draft, notes: e.target.value })}
            placeholder={`Ej: Caries oclusal clase I`}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: 8, color: '#e2e8f0',
              fontSize: 12, padding: '8px 10px',
              resize: 'vertical', fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12, gap: 10 }}>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: '1px solid #1e293b',
            color: '#4b5563', fontSize: 12, padding: '6px 14px',
            borderRadius: 8, cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            background: saving ? '#3730a3' : '#4f46e5',
            color: 'white', border: 'none', borderRadius: 8,
            padding: '6px 18px', fontSize: 12, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Odontogram ──────────────────────────────────────────────────────────

export default function Odontogram({ patientId, clinicId, readonly = false }: Props) {
  const [teeth,         setTeeth]         = useState<Record<number, ToothData>>({});
  const [saving,        setSaving]        = useState<Record<number, boolean>>({});
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [hovered,       setHovered]       = useState<number | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [editDraft,     setEditDraft]     = useState<ToothDraft | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/patient-teeth?patient_id=${patientId}`)
      .then(r => r.json())
      .then((rows: ToothData[]) => {
        const map: Record<number, ToothData> = {};
        if (Array.isArray(rows)) rows.forEach(r => { map[r.tooth_fdi] = r; });
        setTeeth(map);
        setLoading(false);
      })
      .catch(() => { setError('Error al cargar odontograma'); setLoading(false); });
  }, [patientId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closePanel(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPanel(fdi: number) {
    if (readonly) return;
    const data = teeth[fdi];
    setSelectedTooth(fdi);
    setEditDraft({
      status:   data?.status ?? 'healthy',
      surfaces: parseSurfaces(data?.surfaces),
      notes:    data?.notes ?? '',
    });
  }

  function closePanel() {
    setSelectedTooth(null);
    setEditDraft(null);
  }

  async function handleSave() {
    if (selectedTooth == null || editDraft == null) return;
    const fdi = selectedTooth;
    const surfacesStr = serializeSurfaces(editDraft.surfaces);
    const notesStr    = editDraft.notes.trim();

    setTeeth(prev => ({
      ...prev,
      [fdi]: { ...prev[fdi], tooth_fdi: fdi, status: editDraft.status,
               surfaces: surfacesStr || null, notes: notesStr || null },
    }));
    setSaving(prev => ({ ...prev, [fdi]: true }));

    try {
      const res = await fetch('/api/admin/patient-teeth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId, clinic_id: clinicId,
          tooth_fdi: fdi, status: editDraft.status,
          surfaces: surfacesStr || null, notes: notesStr || null,
        }),
      });
      if (res.ok) {
        const updated: ToothData = await res.json();
        setTeeth(prev => ({ ...prev, [fdi]: updated }));
        closePanel();
      }
    } finally {
      setSaving(prev => ({ ...prev, [fdi]: false }));
    }
  }

  // Hover bar data
  const hovData    = hovered != null ? teeth[hovered] : null;
  const hovStatus  = hovData?.status ?? 'healthy';
  const hovSurfs   = parseSurfaces(hovData?.surfaces);
  const hovNotes   = hovData?.notes?.trim();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-gray-400 animate-pulse">Cargando odontograma...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{error}</div>
    );
  }

  function renderJaw(layout: ToothLayout[], isUpper: boolean) {
    return layout.map(l => (
      <ToothGroup
        key={l.fdi}
        layout={l}
        data={teeth[l.fdi]}
        saving={!!saving[l.fdi]}
        isUpper={isUpper}
        hovered={hovered === l.fdi}
        selected={selectedTooth === l.fdi}
        readonly={readonly}
        onMouseEnter={() => setHovered(l.fdi)}
        onMouseLeave={() => setHovered(null)}
        onClick={() => {
          if (selectedTooth === l.fdi) closePanel();
          else openPanel(l.fdi);
        }}
      />
    ));
  }

  return (
    <div className="space-y-0">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
           style={selectedTooth != null ? { borderRadius: '16px 16px 0 0' } : undefined}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h3 className="text-sm font-semibold text-white">Odontograma FDI</h3>
            <p className="text-xs text-gray-500 mt-0.5">Notación internacional — 32 piezas</p>
          </div>
          {!readonly && (
            <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-lg">
              Clic en diente para editar
            </span>
          )}
        </div>

        {/* Chart */}
        <div className="px-5 py-4 overflow-x-auto">
          <div style={{ minWidth: SVG_W + 80 }}>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2, paddingLeft: 40 }}>
              <div style={{ width: MIDLINE_X, display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#6366f1', letterSpacing: '0.06em', fontWeight: 600 }}>Q1 — SUPERIOR DER.</span>
              </div>
              <div style={{ width: SVG_W - MIDLINE_X, display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#6366f1', letterSpacing: '0.06em', fontWeight: 600 }}>Q2 — SUPERIOR IZQ.</span>
              </div>
            </div>

            {/* Upper jaw */}
            <div style={{ position: 'relative', paddingLeft: 40 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                display: 'flex', alignItems: 'center',
                fontSize: 9, color: '#4b5563', letterSpacing: '0.1em',
                textTransform: 'uppercase', fontWeight: 600,
                writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              }}>Superior</div>
              <svg width={SVG_W} height={ROW_H} style={{ display: 'block', overflow: 'visible' }}>
                <rect x={0} y={NUM_GAP + ROOT_H + ROOT_GAP - 1} width={SVG_W} height={4} rx={2} fill="#1f2937" />
                <line x1={MIDLINE_X} y1={NUM_GAP - 4} x2={MIDLINE_X} y2={NUM_GAP + TOOTH_GRP_H + 4}
                  stroke="#374151" strokeWidth={1} strokeDasharray="3 3" />
                {renderJaw(UPPER_LAYOUT, true)}
              </svg>
            </div>

            {/* Jaw separator */}
            <div style={{ marginLeft: 40, height: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #374151, transparent)' }} />
              <span style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>LÍNEA MEDIA</span>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #374151, transparent)' }} />
            </div>

            {/* Lower jaw */}
            <div style={{ position: 'relative', paddingLeft: 40 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                display: 'flex', alignItems: 'center',
                fontSize: 9, color: '#4b5563', letterSpacing: '0.1em',
                textTransform: 'uppercase', fontWeight: 600,
                writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              }}>Inferior</div>
              <svg width={SVG_W} height={ROW_H} style={{ display: 'block', overflow: 'visible' }}>
                <rect x={0} y={NUM_GAP + CROWN_H - 3} width={SVG_W} height={4} rx={2} fill="#1f2937" />
                <line x1={MIDLINE_X} y1={NUM_GAP - 4} x2={MIDLINE_X} y2={NUM_GAP + TOOTH_GRP_H + 4}
                  stroke="#374151" strokeWidth={1} strokeDasharray="3 3" />
                {renderJaw(LOWER_LAYOUT, false)}
              </svg>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginTop: 2, paddingLeft: 40 }}>
              <div style={{ width: MIDLINE_X, display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#6366f1', letterSpacing: '0.06em', fontWeight: 600 }}>Q4 — INFERIOR DER.</span>
              </div>
              <div style={{ width: SVG_W - MIDLINE_X, display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#6366f1', letterSpacing: '0.06em', fontWeight: 600 }}>Q3 — INFERIOR IZQ.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hover status bar */}
        <div style={{
          minHeight: 36, display: 'flex', alignItems: 'center', flexWrap: 'wrap',
          paddingLeft: 20, paddingRight: 20,
          borderTop: '1px solid #1f2937', background: '#0f172a', gap: 8,
        }}>
          {hovered != null ? (
            <>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Diente</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', fontFamily: 'ui-monospace, monospace' }}>
                {hovered}
              </span>
              <span style={{ fontSize: 11, color: '#374151' }}>·</span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: STATUS_CONFIG[hovStatus].stroke,
                background: STATUS_CONFIG[hovStatus].crown,
                padding: '1px 8px', borderRadius: 99,
                border: `1px solid ${STATUS_CONFIG[hovStatus].stroke}40`,
              }}>
                {STATUS_CONFIG[hovStatus].label}
              </span>
              {hovSurfs.length > 0 && (
                <>
                  <span style={{ fontSize: 11, color: '#374151' }}>·</span>
                  <span style={{ fontSize: 11, color: '#6366f1' }}>
                    {hovSurfs.map(s => getSurfaceName(hovered, s)).join(' · ')}
                  </span>
                </>
              )}
              {hovNotes && (
                <>
                  <span style={{ fontSize: 11, color: '#374151' }}>·</span>
                  <span style={{ fontSize: 11, color: '#d1d5db', fontStyle: 'italic' }}>{hovNotes}</span>
                </>
              )}
              {!readonly && (
                <span style={{ fontSize: 10, color: '#4b5563', marginLeft: 'auto' }}>
                  {selectedTooth === hovered ? 'Panel abierto' : 'Clic para editar'}
                </span>
              )}
            </>
          ) : (
            <span style={{ fontSize: 11, color: '#374151' }}>
              {readonly ? 'Odontograma de solo lectura' : 'Pasa el cursor sobre un diente'}
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-gray-800/50">
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {STATUS_CYCLE.map(s => {
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div style={{
                    width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                    background: cfg.legendBg,
                    border: cfg.dashed ? `1.5px dashed ${cfg.stroke}` : `1.5px solid ${cfg.stroke}`,
                  }} />
                  <span className="text-xs text-gray-400">{cfg.label}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-1.5">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
              <span className="text-xs text-gray-400">Con diagnóstico</span>
            </div>
          </div>
        </div>

      </div>

      {/* Detail panel — attaches below the chart */}
      {selectedTooth != null && editDraft != null && !readonly && (
        <ToothDetailPanel
          fdi={selectedTooth}
          draft={editDraft}
          saving={!!saving[selectedTooth]}
          onChange={setEditDraft}
          onSave={handleSave}
          onClose={closePanel}
        />
      )}
    </div>
  );
}
