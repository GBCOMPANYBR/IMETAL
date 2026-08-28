"use client";

import { useEffect, useState } from "react";
import UserFormModal, { type UserRecord } from "@/components/admin/UserFormModal";

export default function UsuariosManager() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserRecord | "new" | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/usuarios");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(u: UserRecord) {
    if (!confirm(`Excluir o usuário "${u.username}"?`)) return;
    const res = await fetch(`/api/usuarios/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Não foi possível excluir.");
      return;
    }
    load();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setEditing("new")} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light">
          + Novo usuário
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Login</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Nome</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Perfil</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Edição</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Colunas visíveis</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Empresas</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Status</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-700">{u.username}</td>
                  <td className="px-4 py-2 text-slate-600">{u.name}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === "ADMIN" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      {u.role === "ADMIN" ? "Administrador" : "Usuário"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{u.canEdit ? "Sim" : "Somente leitura"}</td>
                  <td className="px-4 py-2 text-slate-600">{u.visibleFields.length} / 19</td>
                  <td className="px-4 py-2 text-slate-600">
                    {u.allClientes ? "Todas" : `${u.clienteIds.length} empresa(s)`}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium ${u.active ? "text-emerald-600" : "text-red-500"}`}>{u.active ? "Ativo" : "Inativo"}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(u)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand" title="Editar">
                        ✎
                      </button>
                      <button onClick={() => handleDelete(u)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Excluir">
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <UserFormModal
          mode={editing === "new" ? "create" : "edit"}
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
