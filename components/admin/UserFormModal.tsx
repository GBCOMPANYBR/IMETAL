"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { PEDIDO_FIELDS } from "@/lib/fields";

export interface UserRecord {
  id: number;
  username: string;
  name: string;
  role: "ADMIN" | "USER";
  canEdit: boolean;
  active: boolean;
  visibleFields: string[];
}

interface Props {
  mode: "create" | "edit";
  user: UserRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function UserFormModal({ mode, user, onClose, onSaved }: Props) {
  const [username, setUsername] = useState(user?.username ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">(user?.role ?? "USER");
  const [canEdit, setCanEdit] = useState(user?.canEdit ?? true);
  const [active, setActive] = useState(user?.active ?? true);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set(user?.visibleFields ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = visibleFields.size === PEDIDO_FIELDS.length;

  function toggleField(key: string) {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        role,
        canEdit: role === "ADMIN" ? true : canEdit,
        active,
        visibleFields: Array.from(visibleFields),
      };
      if (mode === "create") {
        payload.username = username;
        payload.password = password;
      } else if (password) {
        payload.password = password;
      }

      const url = mode === "create" ? "/api/usuarios" : `/api/usuarios/${user!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Não foi possível salvar o usuário.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={mode === "create" ? "Novo usuário" : `Editar usuário: ${user?.username}`} onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Login</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={mode === "edit"}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">{mode === "create" ? "Senha" : "Nova senha (opcional)"}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={mode === "create"}
              placeholder={mode === "edit" ? "Deixe em branco para manter" : ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Perfil</label>
            <select value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "USER")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="USER">Usuário</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={role === "ADMIN" ? true : canEdit} disabled={role === "ADMIN"} onChange={(e) => setCanEdit(e.target.checked)} />
            Pode editar pedidos (senão, acesso somente leitura)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Usuário ativo
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-600">Colunas visíveis para este usuário</label>
            <button
              type="button"
              onClick={() => setVisibleFields(allSelected ? new Set() : new Set(PEDIDO_FIELDS.map((f) => f.key)))}
              className="text-xs font-medium text-brand hover:underline"
            >
              {allSelected ? "Desmarcar todos" : "Marcar todos"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
            {PEDIDO_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={visibleFields.has(f.key)} onChange={() => toggleField(f.key)} />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
