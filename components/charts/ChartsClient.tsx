"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePedidoOptions } from "@/lib/useOptions";
import { buildPedidosQueryParams, type FiltersState } from "@/lib/pedido-query-client";
import { formatCurrency, formatDate } from "@/lib/format";

interface Props {
  visibleFields: string[];
}

type FaturadoFilter = "TODOS" | "SIM" | "NAO";

const BAR_COLOR = "#0f2c52";

export default function ChartsClient({ visibleFields }: Props) {
  const visibleSet = useMemo(() => new Set(visibleFields), [visibleFields]);
  const canValorTotal = visibleSet.has("valorTotal");
  const canCliente = visibleSet.has("cliente");
  const canData = visibleSet.has("data");
  const canDataFaturamento = visibleSet.has("dataFaturamento");
  const canFaturado = visibleSet.has("faturado");

  const { options } = usePedidoOptions();
  const [clienteIds, setClienteIds] = useState<number[]>([]);
  const [dataFrom, setDataFrom] = useState("");
  const [dataTo, setDataTo] = useState("");
  const [faturadoFilter, setFaturadoFilter] = useState<FaturadoFilter>("TODOS");
  const [chartData, setChartData] = useState<{
    geral: number | null;
    porCliente: { cliente: string; total: number }[] | null;
    porData: { data: string; total: number }[] | null;
  }>({
    geral: null,
    porCliente: null,
    porData: null,
  });
  const [loading, setLoading] = useState(true);

  // Pedidos faturados são analisados pela data em que foram faturados, não pela data do
  // pedido — as duas coisas podem cair em períodos bem diferentes. Não faturados (ou Todos)
  // usam a data do pedido, já que ainda não têm data de faturamento.
  const effectiveDateField: "data" | "dataFaturamento" =
    faturadoFilter === "SIM" && canDataFaturamento ? "dataFaturamento" : "data";
  const canEffectiveDateField = effectiveDateField === "dataFaturamento" ? canDataFaturamento : canData;
  const dateFieldLabel = effectiveDateField === "dataFaturamento" ? "Data de Faturamento" : "Data do Pedido";

  useEffect(() => {
    const filters: FiltersState = {};
    if (clienteIds.length > 0) filters.cliente = { type: "fk", ids: clienteIds };
    if (dataFrom || dataTo) filters[effectiveDateField] = { type: "date", from: dataFrom || undefined, to: dataTo || undefined };
    if (faturadoFilter !== "TODOS") {
      const target = options.faturado.find((f) => f.label === (faturadoFilter === "SIM" ? "SIM" : "NÃO"));
      if (target) filters.faturado = { type: "fk", ids: [target.id] };
    }

    setLoading(true);
    const params = buildPedidosQueryParams({ filters, quickSearch: "" });
    params.set("dateField", effectiveDateField);
    fetch(`/api/pedidos/chart-data?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { geral: null, porCliente: null, porData: null }))
      .then(setChartData)
      .finally(() => setLoading(false));
  }, [clienteIds, dataFrom, dataTo, faturadoFilter, effectiveDateField, options.faturado]);

  if (!canValorTotal) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Seu usuário não tem permissão para visualizar o Valor Total, necessário para os gráficos.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
        {canFaturado && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Faturado</label>
            <div className="flex gap-1 rounded-lg border border-slate-300 p-0.5">
              {(["TODOS", "SIM", "NAO"] as FaturadoFilter[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFaturadoFilter(opt)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    faturadoFilter === opt ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {opt === "TODOS" ? "Todos" : opt === "SIM" ? "Faturados" : "Não faturados"}
                </button>
              ))}
            </div>
          </div>
        )}
        {canEffectiveDateField && (
          <div className="flex gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{dateFieldLabel} de</label>
              <input type="date" value={dataFrom} onChange={(e) => setDataFrom(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{dateFieldLabel} até</label>
              <input type="date" value={dataTo} onChange={(e) => setDataTo(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            </div>
          </div>
        )}
        {canCliente && (
          <div className="min-w-[220px]">
            <label className="mb-1 block text-xs font-medium text-slate-500">Clientes</label>
            <select
              multiple
              value={clienteIds.map(String)}
              onChange={(e) => setClienteIds(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))}
              className="h-20 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
            >
              {options.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {(clienteIds.length > 0 || dataFrom || dataTo || faturadoFilter !== "TODOS") && (
          <button
            onClick={() => {
              setClienteIds([]);
              setDataFrom("");
              setDataTo("");
              setFaturadoFilter("TODOS");
            }}
            className="text-sm font-medium text-slate-400 hover:text-slate-600"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <p className="p-8 text-center text-sm text-slate-400">Carregando gráficos...</p>
      ) : (
        <>
          {chartData.geral !== null && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-500">
                Faturado Geral{clienteIds.length > 0 ? "" : " — todas as empresas"}
                {faturadoFilter !== "TODOS" && (faturadoFilter === "SIM" ? " (faturados)" : " (não faturados)")}
              </h2>
              <p className="mt-1 text-3xl font-bold text-slate-800">{formatCurrency(chartData.geral)}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {canCliente && chartData.porCliente && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-600">Valor Total por Cliente</h2>
              {chartData.porCliente.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">Sem dados para os filtros selecionados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(260, chartData.porCliente.length * 32)}>
                  <BarChart data={chartData.porCliente} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} fontSize={11} />
                    <YAxis type="category" dataKey="cliente" width={120} fontSize={12} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="total" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {canEffectiveDateField && chartData.porData && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-600">Valor Total por {dateFieldLabel}</h2>
              {chartData.porData.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">Sem dados para os filtros selecionados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.porData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" tickFormatter={(v) => formatDate(v)} fontSize={11} />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={11} width={90} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(v) => formatDate(v as string)} />
                    <Line type="monotone" dataKey="total" stroke={BAR_COLOR} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
}
