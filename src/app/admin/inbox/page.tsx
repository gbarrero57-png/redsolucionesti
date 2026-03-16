'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bot, User, Pause, Play, X, RefreshCw, Circle, Clock, CheckCircle } from 'lucide-react';

interface Conversation {
  id: string;
  chatwoot_conversation_id: string;
  patient_name: string | null;
  status: 'active' | 'human' | 'closed';
  bot_paused: boolean;
  last_message: string | null;
  last_activity_at: string;
  assigned_user_id: string | null;
}

const STATUS_FILTERS = [
  { value: null, label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'human', label: 'Con humano' },
  { value: 'closed', label: 'Cerradas' },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function StatusBadge({ status, botPaused }: { status: string; botPaused: boolean }) {
  if (status === 'closed') return (
    <span className="flex items-center gap-1 text-xs text-gray-500"><CheckCircle size={12} />Cerrada</span>
  );
  if (botPaused) return (
    <span className="flex items-center gap-1 text-xs text-amber-400"><User size={12} />Humano</span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-green-400"><Bot size={12} />Bot activo</span>
  );
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Conversation | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/conversations?${params}`);
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  async function doAction(convId: string, action: string) {
    setActionLoading(convId + action);
    try {
      await fetch('/api/admin/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, conversation_id: convId }),
      });
      await fetchConversations();
      if (selected?.id === convId) setSelected(null);
    } finally {
      setActionLoading(null);
    }
  }

  const isBusy = (convId: string, action: string) => actionLoading === convId + action;

  return (
    <div className="flex h-full">
      {/* List panel */}
      <div className="w-96 flex-shrink-0 border-r border-gray-800 flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold">Conversaciones</h1>
            <button
              onClick={fetchConversations}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          {/* Filters */}
          <div className="flex gap-1.5">
            {STATUS_FILTERS.map(f => (
              <button
                key={String(f.value)}
                onClick={() => setStatusFilter(f.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <RefreshCw size={20} className="animate-spin mr-2" /> Cargando...
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
              <Circle size={24} className="mb-2 opacity-40" />
              No hay conversaciones
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelected(conv)}
                className={`w-full text-left px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${
                  selected?.id === conv.id ? 'bg-gray-800' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-100 truncate">
                        {conv.patient_name || 'Paciente desconocido'}
                      </span>
                      {conv.bot_paused && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {conv.last_message || 'Sin mensajes'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={conv.status} botPaused={conv.bot_paused} />
                      <span className="text-xs text-gray-600">#{conv.chatwoot_conversation_id}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0 flex items-center gap-1 mt-0.5">
                    <Clock size={10} />
                    {timeAgo(conv.last_activity_at)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            {/* Detail header */}
            <div className="px-6 py-4 border-b border-gray-800 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  {selected.patient_name || 'Paciente desconocido'}
                </h2>
                <p className="text-sm text-gray-400">
                  Conversación #{selected.chatwoot_conversation_id} · {timeAgo(selected.last_activity_at)}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-500 hover:text-gray-300">
                <X size={18} />
              </button>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-b border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Acciones</p>
              <div className="flex flex-wrap gap-2">
                {selected.status !== 'closed' && (
                  <>
                    {selected.bot_paused ? (
                      <button
                        onClick={() => doAction(selected.id, 'resume')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Play size={14} />
                        {isBusy(selected.id, 'resume') ? 'Reanudando...' : 'Reanudar bot'}
                      </button>
                    ) : (
                      <button
                        onClick={() => doAction(selected.id, 'pause')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Pause size={14} />
                        {isBusy(selected.id, 'pause') ? 'Pausando...' : 'Pausar bot'}
                      </button>
                    )}
                    <button
                      onClick={() => doAction(selected.id, 'close')}
                      disabled={!!actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X size={14} />
                      {isBusy(selected.id, 'close') ? 'Cerrando...' : 'Cerrar'}
                    </button>
                  </>
                )}
                <a
                  href={`https://chat.redsolucionesti.com/app/accounts/1/conversations/${selected.chatwoot_conversation_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white text-sm rounded-lg transition-colors"
                >
                  <MessageIcon size={14} />
                  Ver en Chatwoot
                </a>
              </div>
            </div>

            {/* Info */}
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Detalles</p>
              <dl className="space-y-3">
                <InfoRow label="Estado" value={
                  <StatusBadge status={selected.status} botPaused={selected.bot_paused} />
                } />
                <InfoRow label="Bot" value={selected.bot_paused ? 'Pausado' : 'Activo'} />
                <InfoRow label="Última actividad" value={new Date(selected.last_activity_at).toLocaleString('es-ES')} />
                <InfoRow label="Último mensaje" value={selected.last_message || '—'} />
                <InfoRow label="ID Chatwoot" value={`#${selected.chatwoot_conversation_id}`} />
                <InfoRow label="Asignado a" value={selected.assigned_user_id || 'Sin asignar'} />
              </dl>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
            <div className="mb-3 opacity-20"><MessageSquareIcon size={48} /></div>
            <p className="text-sm">Selecciona una conversación</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <dt className="text-sm text-gray-500 w-36 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-200">{value}</dd>
    </div>
  );
}

function MessageIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}

function MessageSquareIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
