'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Save, X, RefreshCw, Search, Tag } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM = { category: '', question: '', answer: '', tags: '' };

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/knowledge');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchItems(); }, []);

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort();

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    const matchCat = !categoryFilter || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  function startEdit(item: KnowledgeItem) {
    setEditId(item.id);
    setShowNew(false);
    setForm({
      category: item.category || '',
      question: item.question || '',
      answer: item.answer || '',
      tags: (item.tags || []).join(', '),
    });
  }

  function cancelEdit() {
    setEditId(null);
    setShowNew(false);
    setForm(EMPTY_FORM);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const body = {
        category: form.category,
        question: form.question,
        answer: form.answer,
        tags,
        ...(editId ? { id: editId } : {}),
      };
      const res = await fetch('/api/admin/knowledge', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        cancelEdit();
        await fetchItems();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este ítem de la base de conocimiento?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/knowledge?id=${id}`, { method: 'DELETE' });
      await fetchItems();
    } finally {
      setDeleting(null);
    }
  }

  async function toggleActive(item: KnowledgeItem) {
    try {
      await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, active: !item.active }),
      });
      await fetchItems();
    } catch { /* ignore */ }
  }

  const FormPanel = () => (
    <div className="bg-gray-800 rounded-xl border border-violet-700/30 p-5 mb-4">
      <h3 className="text-sm font-semibold text-violet-300 mb-4">
        {editId ? 'Editar ítem' : 'Nuevo ítem'}
      </h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Categoría</label>
            <input
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="ej: horarios, precios, servicios"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Tags (separados por coma)</label>
            <input
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="ej: cita, agenda, horario"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Pregunta</label>
          <input
            value={form.question}
            onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
            placeholder="¿Cuál es la pregunta?"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Respuesta</label>
          <textarea
            value={form.answer}
            onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
            rows={4}
            placeholder="Escribe la respuesta que SofIA dará..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={saveEdit}
            disabled={saving || !form.question || !form.answer}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={cancelEdit}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors"
          >
            <X size={14} />
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen size={22} className="text-violet-400" />
            Base de conocimiento
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{items.length} ítem{items.length !== 1 ? 's' : ''} registrados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchItems}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setShowNew(true); setEditId(null); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus size={16} />
            Nuevo ítem
          </button>
        </div>
      </div>

      {/* New form */}
      {showNew && !editId && <FormPanel />}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar pregunta, respuesta o categoría..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <RefreshCw size={20} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <BookOpen size={36} className="mb-3 opacity-30" />
          <p>No hay ítems</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id}>
              {editId === item.id ? (
                <FormPanel />
              ) : (
                <div className={`bg-gray-900 rounded-xl border p-4 transition-colors ${item.active ? 'border-gray-800' : 'border-gray-800 opacity-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {item.category && (
                          <span className="text-xs px-2 py-0.5 bg-violet-900/30 text-violet-400 border border-violet-700/30 rounded-full">
                            {item.category}
                          </span>
                        )}
                        {(item.tags || []).map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full flex items-center gap-1">
                            <Tag size={9} />{tag}
                          </span>
                        ))}
                        {!item.active && (
                          <span className="text-xs px-2 py-0.5 bg-red-900/20 text-red-400 rounded-full">Inactivo</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-100 mb-1">{item.question}</p>
                      <p className="text-sm text-gray-400 line-clamp-2">{item.answer}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(item)}
                        className={`p-1.5 rounded-lg text-xs transition-colors ${item.active ? 'text-green-400 hover:bg-green-400/10' : 'text-gray-600 hover:bg-gray-800'}`}
                        title={item.active ? 'Desactivar' : 'Activar'}
                      >
                        {item.active ? '●' : '○'}
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        disabled={deleting === item.id}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
