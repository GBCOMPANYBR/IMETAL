"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import { formatFileSize } from "@/lib/format";

interface FileItem {
  id: number;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: { name: string } | null;
}

interface Props {
  pedidoId: number;
  /** "anexos" (default) are shared across every Pedido with the same Cliente+Código; "fotos" are
   * private to this Pedido — see lib/attachment-group.ts. */
  kind?: "anexos" | "fotos";
  codigo?: string | null;
  canUpload: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

export default function AttachmentsModal({ pedidoId, kind = "anexos", codigo, canUpload, isAdmin, onClose, onChanged }: Props) {
  const isFotos = kind === "fotos";
  const basePath = `/api/pedidos/${pedidoId}/${isFotos ? "fotos" : "attachments"}`;
  const singular = isFotos ? "foto" : "anexo";

  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(basePath);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId, kind]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(basePath, { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Não foi possível enviar o arquivo.");
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
      await load();
      onChanged?.();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(`Excluir est${isFotos ? "a" : "e"} ${singular}?`)) return;
    const res = await fetch(`${basePath}/${id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
      onChanged?.();
    }
  }

  return (
    <Modal title={isFotos ? "Fotos do pedido" : "Anexos do pedido"} onClose={onClose} widthClassName="max-w-lg">
      {!isFotos && codigo?.trim() && (
        <p className="mb-3 text-xs text-slate-400">
          Compartilhado com todo pedido do mesmo Cliente com Código <span className="font-medium text-slate-500">{codigo}</span>.
        </p>
      )}
      {loading ? (
        <p className="py-6 text-center text-sm text-slate-400">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Nenhum{isFotos ? "a" : ""} {singular} neste pedido.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <a
                href={`${basePath}/${a.id}`}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-medium text-brand hover:underline"
                title={a.filename}
              >
                {a.filename}
              </a>
              <span className="shrink-0 text-xs text-slate-400">{formatFileSize(a.size)}</span>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(a.id)}
                  className="shrink-0 rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                  title={`Excluir ${singular}`}
                >
                  🗑
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canUpload && (
        <form onSubmit={handleUpload} className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
          <input ref={fileRef} type="file" accept={isFotos ? "image/*" : undefined} className="flex-1 text-sm" />
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-60"
          >
            {uploading ? "Enviando..." : "Enviar"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
