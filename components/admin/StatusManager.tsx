"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/pedidos/StatusBadge";

interface StatusItem {
  id: number;
  label: string;
  color: string;
  editable: boolean;
  order: number;
}

const DEFAULT_COLOR = "#6b7280";

export default function StatusManager() {
  const [items, setItems] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [newEditable, setNewEditable] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);
  const [editEditable, setEditEditable] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/options/status");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setError(null);
    const res = await fetch("/api/options/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim(), color: newColor, editable: newEditable }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Não foi possível criar o status.");
      return;
    }
    setNewLabel("");
    setNewColor(DEFAULT_COLOR);
    setNewEditable(true);
    load();
  }

  function startEdit(item: StatusItem) {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditColor(item.color);
    setEditEditable(item.editable);
  }

  async function handleUpdate(id: number) {
    setError(null);
    const res = await fetch(`/api/options/status/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editLabel.trim(), color: editColor, editable: editEditable }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Não foi possível atualizar.");
      return;
    }
    setEditingId(null);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este status?")) return;
    const res = await fetch(`/api/options/status/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Não foi possível excluir.");
      return;
    }
    load();
  }

  return (
    <div className="max-w-2xl space-y-4">
      <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nome do status"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-9 w-12 rounded border border-slate-300" />
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={newEditable} onChange={(e) => setNewEditable(e.target.checked)} />
          Permite edição
        </label>
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light">
          Adicionar
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {editingId === item.id ? (
                <>
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
                  <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="h-8 w-10 rounded border border-slate-300" />
                  <label className="flex items-center gap-1.5 text-sm text-slate-600">
                    <input type="checkbox" checked={editEditable} onChange={(e) => setEditEditable(e.target.checked)} />
                    Permite edição
                  </label>
                  <button onClick={() => handleUpdate(item.id)} className="text-sm font-medium text-brand hover:underline">
                    Salvar
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-slate-400 hover:text-slate-600">
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <StatusBadge label={item.label} color={item.color} />
                  </div>
                  <span className={`text-xs font-medium ${item.editable ? "text-emerald-600" : "text-red-500"}`}>
                    {item.editable ? "Permite edição" : "Bloqueado para edição"}
                  </span>
                  <button onClick={() => startEdit(item)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand" title="Editar">
                    ✎
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Excluir">
                    🗑
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
