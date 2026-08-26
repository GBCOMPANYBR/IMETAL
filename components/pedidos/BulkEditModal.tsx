"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

interface Props {
  pedidoIds: number[];
  visibleFields: Set<string>;
  onClose: () => void;
  onDone: () => void;
}

export default function BulkEditModal({ pedidoIds, visibleFields, onClose, onDone }: Props) {
  const [dataFaturamento, setDataFaturamento] = useState("");
  const [nf, setNf] = useState("");
  const [pdv, setPdv] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    if (dataFaturamento) payload.dataFaturamento = dataFaturamento;
    if (nf.trim()) payload.nf = nf.trim();
    if (pdv.trim()) payload.pdv = pdv.trim();

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    const results = await Promise.allSettled(
      pedidoIds.map((id) =>
        fetch(`/api/pedidos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then((res) => {
          if (!res.ok) throw new Error();
        })
      )
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    setSaving(false);
    setResult({ ok, failed });
    onDone();
  }

  return (
    <Modal title={`Aplicar em lote — ${pedidoIds.length} pedido(s) selecionado(s)`} onClose={onClose} widthClassName="max-w-md">
      {result ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            {result.ok} pedido(s) atualizado(s) com sucesso.
            {result.failed > 0 && ` ${result.failed} não foram atualizados (sem permissão ou status bloqueado para edição).`}
          </p>
          <div className="flex justify-end">
            <button onClick={onClose} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light">
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-slate-500">Preencha apenas os campos que quer aplicar a todos os selecionados. Campos em branco não são alterados.</p>
          {visibleFields.has("dataFaturamento") && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Data Faturamento</label>
              <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={dataFaturamento} onChange={(e) => setDataFaturamento(e.target.value)} />
            </div>
          )}
          {visibleFields.has("nf") && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">NF</label>
              <input type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={nf} onChange={(e) => setNf(e.target.value)} />
            </div>
          )}
          {visibleFields.has("pdv") && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">PDV</label>
              <input type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={pdv} onChange={(e) => setPdv(e.target.value)} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-60">
              {saving ? "Aplicando..." : `Aplicar a ${pedidoIds.length} pedido(s)`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
