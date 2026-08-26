"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PEDIDO_FIELDS, type FieldDef } from "@/lib/fields";
import { formatCurrency, formatDate } from "@/lib/format";
import { usePedidoOptions } from "@/lib/useOptions";
import { anyFilterActive, buildPedidosQueryParams, type FiltersState } from "@/lib/pedido-query-client";
import ColumnFilter from "@/components/pedidos/ColumnFilter";
import PedidoFormModal, { type PedidoRecord } from "@/components/pedidos/PedidoFormModal";
import AttachmentsModal from "@/components/pedidos/AttachmentsModal";
import BulkEditModal from "@/components/pedidos/BulkEditModal";

const ID_FIELD: FieldDef = { key: "id", label: "#", type: "number", formEditable: false };

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  id: 70,
  status: 130,
  cliente: 160,
  pedidoCompra: 150,
  data: 110,
  qtd: 80,
  codigo: 130,
  descricao: 320,
  ncm: 100,
  valorUnitario: 120,
  valorTotal: 120,
  pagamento: 100,
  faturamento: 130,
  tipo: 100,
  observacao: 220,
  faturado: 100,
  dataFaturamento: 140,
  nf: 90,
  pdv: 90,
  anexos: 90,
  editadoPor: 150,
};
const MIN_COLUMN_WIDTH = 50;
const COLUMN_WIDTHS_STORAGE_KEY = "imetal:pedidos:columnWidths";

function loadStoredColumnWidths(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Paints the row with the exact status color as configured in /admin/status — no blending, per the client's explicit call. */
function rowTint(color: string | undefined): React.CSSProperties {
  if (!color) return {};
  return { backgroundColor: color };
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const colRefs = useRef<Record<string, HTMLTableColElement | null>>({});

  useEffect(() => {
    setColumnWidths(loadStoredColumnWidths());
  }, []);

  const canBulkEdit = isAdmin || canEdit;

  function columnWidth(fieldKey: string): number {
    return columnWidths[fieldKey] ?? DEFAULT_COLUMN_WIDTHS[fieldKey] ?? 150;
  }

  // Resizes by writing directly to the <col> element's style during the drag, instead of going
  // through React state on every pointer move — with hundreds/thousands of rows on screen, a
  // state update (and full table re-render) per pixel of movement made the drag feel completely
  // unresponsive. React state is only touched once, on release, to persist the result.
  // Uses the Pointer Events API with explicit capture on the handle itself (setPointerCapture)
  // instead of window-level mouse listeners, so the drag keeps tracking reliably even once the
  // cursor leaves the (intentionally thin) handle strip.
  const resizeState = useRef<{ fieldKey: string; startX: number; startWidth: number; finalWidth: number } | null>(null);

  function handleResizePointerDown(fieldKey: string, e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = columnWidth(fieldKey);
    resizeState.current = { fieldKey, startX: e.clientX, startWidth, finalWidth: startWidth };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function handleResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const state = resizeState.current;
    if (!state) return;
    state.finalWidth = Math.max(MIN_COLUMN_WIDTH, state.startWidth + (e.clientX - state.startX));
    const col = colRefs.current[state.fieldKey];
    if (col) col.style.width = `${state.finalWidth}px`;
  }

  function handleResizePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const state = resizeState.current;
    if (!state) return;
    resizeState.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    setColumnWidths((prev) => {
      const next = { ...prev, [state.fieldKey]: state.finalWidth };
      try {
        localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore (private browsing / storage disabled)
      }
      return next;
    });
  }

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
    setSelectedIds(new Set());
    setLoading(false);
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = buildPedidosQueryParams({ filters, quickSearch, sort, dir });
      params.set("export", "1");
      const res = await fetch(`/api/pedidos?${params.toString()}`);
      if (!res.ok) return;
      const body = await res.json();
      const allColumns = [ID_FIELD, ...columns];
      const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const header = allColumns.map((f) => escape(f.label)).join(",");
      const rows = (body.items as PedidoRow[]).map((pedido) =>
        allColumns.map((f) => escape(f.key === "id" ? pedido.id : cellText(pedido, f.key))).join(",")
      );
      const csv = "﻿" + [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
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

  /** Plain-text version of a cell's value, used for CSV export (cellValue below returns JSX for the screen). */
  function cellText(pedido: PedidoRow, fieldKey: string): string {
    switch (fieldKey) {
      case "status":
        return pedido.status?.label ?? "";
      case "editadoPor":
        return (pedido.editadoPor as string | null | undefined) ?? "";
      case "cliente":
        return pedido.cliente?.name ?? "";
      case "faturamento":
        return pedido.faturamento?.label ?? "";
      case "tipo":
        return pedido.tipo?.label ?? "";
      case "faturado":
        return pedido.faturado?.label ?? "";
      case "data":
        return formatDate(pedido.data);
      case "dataFaturamento":
        return formatDate(pedido.dataFaturamento);
      case "qtd":
        return String(pedido.qtd ?? "");
      case "valorUnitario":
        return formatCurrency(pedido.valorUnitario);
      case "valorTotal":
        return formatCurrency((pedido as unknown as { valorTotal?: number }).valorTotal);
      case "anexos":
        return String(pedido.anexosCount ?? 0);
      default:
        return (pedido as unknown as Record<string, string | null | undefined>)[fieldKey] ?? "";
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
      <div className="flex flex-wrap items-center gap-3 print:hidden">
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
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          {exporting ? "Exportando..." : "Exportar CSV"}
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Imprimir
        </button>
        {(isAdmin || canEdit) && (
          <button
            onClick={() => setEditing("new")}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light"
          >
            + Novo Pedido
          </button>
        )}
      </div>

      {canBulkEdit && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-brand bg-brand/5 px-4 py-2 text-sm print:hidden">
          <span className="font-medium text-slate-700">{selectedIds.size} pedido(s) selecionado(s)</span>
          <button onClick={() => setShowBulkEdit(true)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-light">
            Aplicar Data Faturamento / NF / PDV em lote...
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs font-medium text-slate-400 hover:text-slate-600">
            Limpar seleção
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div
          className={hasFilters ? "resize-y overflow-auto print:h-auto print:max-h-none print:resize-none print:overflow-visible" : "overflow-auto"}
          style={hasFilters ? { height: "70vh", minHeight: "260px", maxHeight: "90vh" } : undefined}
          title={hasFilters ? "Arraste o canto inferior direito para ajustar a altura" : undefined}
        >
          <table className="table-fixed border-collapse text-sm">
            <colgroup>
              {canBulkEdit && <col style={{ width: 36 }} />}
              {[ID_FIELD, ...columns].map((f) => (
                <col key={f.key} ref={(el) => { colRefs.current[f.key] = el; }} style={{ width: columnWidth(f.key) }} />
              ))}
              <col style={{ width: 90 }} />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50 print:static">
              <tr>
                {canBulkEdit && (
                  <th className="border-b border-slate-200 px-3 py-2 print:hidden">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selectedIds.size === items.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                {[ID_FIELD, ...columns].map((f) => (
                  <th key={f.key} className="relative border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-500">
                    <span className="inline-flex max-w-full items-center overflow-hidden">
                      <button
                        onClick={() => f.sortable !== false && toggleSort(f.key)}
                        className="truncate hover:text-slate-700 disabled:cursor-default disabled:opacity-50"
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
                    <div
                      onPointerDown={(e) => handleResizePointerDown(f.key, e)}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={handleResizePointerUp}
                      onPointerCancel={handleResizePointerUp}
                      className="absolute -right-1 top-0 z-10 h-full w-2.5 touch-none cursor-col-resize select-none hover:bg-brand/50 active:bg-brand/70 print:hidden"
                      title="Arraste para redimensionar a coluna"
                    />
                  </th>
                ))}
                <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold text-slate-500 print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={columns.length + 2 + (canBulkEdit ? 1 : 0)} className="px-3 py-10 text-center text-slate-400">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2 + (canBulkEdit ? 1 : 0)} className="px-3 py-10 text-center text-slate-400">
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
                    {canBulkEdit && (
                      <td className="px-3 py-2 print:hidden">
                        <input type="checkbox" checked={selectedIds.has(pedido.id)} onChange={() => toggleSelect(pedido.id)} />
                      </td>
                    )}
                    <td className="overflow-hidden px-3 py-2 text-slate-400">{pedido.id}</td>
                    {columns.map((f) => (
                      <td key={f.key} className="overflow-hidden whitespace-normal break-words px-3 py-2 align-top text-slate-700">
                        {cellValue(pedido, f.key)}
                      </td>
                    ))}
                    <td className="px-3 py-2 print:hidden">
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

      <div className="flex items-center justify-between text-sm text-slate-500 print:hidden">
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
          canUpload={isAdmin || attachmentsFor.status?.editable !== false}
          isAdmin={isAdmin}
          onClose={() => setAttachmentsFor(null)}
          onChanged={load}
        />
      )}

      {showBulkEdit && (
        <BulkEditModal
          pedidoIds={Array.from(selectedIds)}
          visibleFields={visibleSet}
          onClose={() => setShowBulkEdit(false)}
          onDone={load}
        />
      )}
    </div>
  );
}
