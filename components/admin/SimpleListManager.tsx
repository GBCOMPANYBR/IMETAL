"use client";

import { useEffect, useState } from "react";

interface Item {
  id: number;
  [key: string]: unknown;
}

interface Props {
  endpoint: string;
  fieldName: "label" | "name";
  itemLabel: string;
  placeholder?: string;
}

export default function SimpleListManager({ endpoint, fieldName, itemLabel, placeholder }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(endpoint);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newValue.trim()) return;
    setError(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [fieldName]: newValue.trim() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Não foi possível criar.");
      return;
    }
    setNewValue("");
    load();
  }

  async function handleUpdate(id: number) {
    if (!editingValue.trim()) return;
    setError(null);
    const res = await fetch(`${endpoint}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [fieldName]: editingValue.trim() }),
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
    if (!confirm(`Excluir este registro de ${itemLabel}?`)) return;
    const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Não foi possível excluir.");
      return;
    }
    load();
  }

  return (
    <div className="max-w-md space-y-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={placeholder ?? `Novo ${itemLabel}`}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light">
          Adicionar
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-400">Nenhum registro.</li>}
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 px-4 py-2.5">
              {editingId === item.id ? (
                <>
                  <input
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button onClick={() => handleUpdate(item.id)} className="text-sm font-medium text-brand hover:underline">
                    Salvar
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-slate-400 hover:text-slate-600">
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-slate-700">{String(item[fieldName])}</span>
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingValue(String(item[fieldName]));
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand"
                    title="Editar"
                  >
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
