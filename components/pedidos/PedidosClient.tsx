"use client";

import { useEffect, useMemo, useState } from "react";
import { PEDIDO_FIELDS, type FieldDef } from "@/lib/fields";
import { formatCurrency, formatDate } from "@/lib/format";
import { usePedidoOptions } from "@/lib/useOptions";
import { anyFilterActive, buildPedidosQueryParams, type FiltersState } from "@/lib/pedido-query-client";
import ColumnFilter from "@/components/pedidos/ColumnFilter";
import PedidoFormModal, { type PedidoRecord } from "@/components/pedidos/PedidoFormModal";
import AttachmentsModal from "@/components/pedidos/AttachmentsModal";

const ID_FIELD: FieldDef = { key: "id", label: "#", type: "number", formEditable: false };

/** Tint of the status color used to paint the whole row — strong enough to spot at a glance, light enough that the dark row text stays readable. */
function rowTint(color: string | undefined): React.CSSProperties {
  if (!color) return {};
  return { backgroundColor: `${color}4d` };
}

interface PedidoRow extends PedidoRecord {
  canEdit: boolean;
  anexosCount?: number;
}

interface Props {
  visibleFields: string[];
  isAdmin: boolean;
  canEdit: boolean;
}

const PAGE_SIZE = 50;

export default function PedidosClient({ visibleFields, isAdmin, canEdit }: Props) {
  const visibleSet = useMemo(() => new Set(visibleFields), [visibleFields]);
  const columns = useMemo(() => PEDIDO_FIELDS.filter((f) => visibleSet.has(f.key)), [visibleSet]);
  const { options } = usePedidoOptions();

  const [filters, setFilters] = useState<FiltersState>({});
  const [quickSearchInput, setQuickSearchInput] = useState("");
  const [quickSearch, setQuickSearch] = useState("");
  const [sort, setSort] = useState<string | undefined>(undefined);
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<PedidoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasFilters, setHasFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<PedidoRow | "new" | null>(null);
  const [attachmentsFor, setAttachmentsFor] = useState<PedidoRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuickSearch(quickSearchInput), 350);
    return () => clearTimeout(t);
  }, [quickSearchInput]);

  useEffect(() => {
    setPage(1);
  }, [filters, quickSearch]);

  async function load() {
    setLoading(true);
    const params = buildPedidosQueryParams({ filters, quickSearch, sort, dir, page });
    const res = await fetch(`/api/pedidos?${params.toString()}`);
    if (res.ok) {
      const body = await res.json();
      setItems(body.items);
      setTotal(body.total);
      setHasFilters(body.hasFilters);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, quickSearch, sort, dir, page]);

  const filtersActive = anyFilterActive(filters, quickSearch);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function toggleSort(fieldKey: string) {
    if (sort === fieldKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(fieldKey);
      setDir("asc");
    }
  }

  async function handleDelete(pedido: PedidoRow) {
    if (!confirm(`Excluir o pedido #${pedido.id}? Esta ação não pode ser desfeita.`)) return;
    const res = await fetch(`/api/pedidos/${pedido.id}`, { method: "DELETE" });
    if (res.ok) load();
    else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Não foi possível excluir.");
    }
  }

  function cellValue(pedido: PedidoRow, fieldKey: string): React.ReactNode {
    switch (fieldKey) {
      case "status":
        return pedido.status ? <span className="font-semibold text-slate-700">{pedido.status.label}</span> : "—";
      case "editadoPor":
        return (pedido.editadoPor as string | null | undefined) ?? "—";
      case "cliente":
        return pedido.cliente?.name ?? "—";
      case "faturamento":
        return pedido.faturamento?.label ?? "—";
      case "tipo":
        return pedido.tipo?.label ?? "—";
      case "faturado":
        return pedido.faturado?.label ?? "—";
      case "data":
        return formatDate(pedido.data);
      case "dataFaturamento":
        return formatDate(pedido.dataFaturamento);
      case "qtd":
        return pedido.qtd ?? "—";
      case "valorUnitario":
        return formatCurrency(pedido.valorUnitario);
      case "valorTotal":
        return <span className="font-semibold text-slate-700">{formatCurrency((pedido as unknown as { valorTotal?: number }).valorTotal)}</span>;
      case "anexos":
        return (
          <button
            onClick={() => setAttachmentsFor(pedido)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            📎 {pedido.anexosCount ?? 0}
          </button>
        );
      default:
        return (pedido as unknown as Record<string, string | null | undefined>)[fieldKey] || "—";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={quickSearchInput}
          onChange={(e) => setQuickSearchInput(e.target.value)}
          placeholder="Buscar em todos os campos visíveis..."
          className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {filtersActive && (
          <button
            onClick={() => {
              setFilters({});
              setQuickSearchInput("");
              setQuickSearch("");
            }}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Limpar filtros
          </button>
        )}
        <div className="flex-1" />
        {(isAdmin || canEdit) && (
          <button
            onClick={() => setEditing("new")}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light"
          >
            + Novo Pedido
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className={hasFilters ? "max-h-[70vh] overflow-auto" : "overflow-auto"}>
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                {[ID_FIELD, ...columns].map((f) => (
                  <th key={f.key} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-500">
                    <span className="inline-flex items-center">
                      <button
                        onClick={() => f.sortable !== false && toggleSort(f.key)}
                        className="hover:text-slate-700 disabled:cursor-default disabled:opacity-50"
                        disabled={f.sortable === false}
                      >
                        {f.label} {sort === f.key ? (dir === "asc" ? "▲" : "▼") : ""}
                      </button>
                      {f.filterable !== false && (
                        <ColumnFilter
                          field={f}
                          value={filters[f.key]}
                          onChange={(v) => setFilters((prev) => ({ ...prev, [f.key]: v as never }))}
                          fkOptions={
                            f.type === "status"
                              ? options.status.map((s) => ({ id: s.id, label: s.label }))
                              : f.type === "cliente"
                              ? options.clientes.map((c) => ({ id: c.id, label: c.name }))
                              : f.type === "faturamento"
                              ? options.faturamento
                              : f.type === "tipo"
                              ? options.tipo
                              : f.type === "faturado"
                              ? options.faturado
                              : undefined
                          }
                        />
                      )}
                    </span>
                  </th>
                ))}
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={columns.length + 2} className="px-3 py-10 text-center text-slate-400">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} className="px-3 py-10 text-center text-slate-400">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((pedido) => (
                  <tr
                    key={pedido.id}
                    style={visibleSet.has("status") ? rowTint(pedido.status?.color) : undefined}
                    className="border-b border-slate-100 last:border-0 transition hover:brightness-95"
                  >
                    <td className="px-3 py-2 text-slate-400">{pedido.id}</td>
                    {columns.map((f) => (
                      <td key={f.key} className="max-w-[220px] truncate px-3 py-2 text-slate-700">
                        {cellValue(pedido, f.key)}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {pedido.canEdit ? (
                          <button onClick={() => setEditing(pedido)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand" title="Editar">
                            ✎
                          </button>
                        ) : (
                          <span className="rounded p-1 text-slate-300" title="Status não permite edição">
                            🔒
                          </span>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(pedido)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Excluir">
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        {hasFilters ? (
          <span>{total} resultado(s) encontrado(s) — exibindo todos, com rolagem.</span>
        ) : (
          <>
            <span>
              Página {page} de {pageCount} — {total} pedido(s) no total
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </>
        )}
      </div>

      {editing && (
        <PedidoFormModal
          mode={editing === "new" ? "create" : "edit"}
          pedido={editing === "new" ? null : editing}
          visibleFields={visibleSet}
          options={options}
          onClose={() => setEditing(null)}
          onItemAdded={load}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {attachmentsFor && (
        <AttachmentsModal
          pedidoId={attachmentsFor.id}
          canUpload={attachmentsFor.canEdit}
          isAdmin={isAdmin}
          onClose={() => setAttachmentsFor(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
