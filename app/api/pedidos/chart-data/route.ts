import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { parsePedidoQuery } from "@/lib/pedido-filters";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!user.canViewGraficos) {
    return NextResponse.json({ error: "Seu usuário não tem permissão para acessar os Gráficos." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const { where } = parsePedidoQuery(searchParams, user);

  const canValorTotal = user.visibleFields.has("valorTotal");
  const dateFieldParam = searchParams.get("dateField");
  const dateField = dateFieldParam === "dataFaturamento" ? "dataFaturamento" : "data";

  async function loadGeral(): Promise<number | null> {
    if (!canValorTotal) return null;
    const totals = await prisma.pedido.aggregate({ where, _sum: { valorTotal: true } });
    return totals._sum.valorTotal ?? 0;
  }

  async function loadPorCliente() {
    if (!canValorTotal || !user.visibleFields.has("cliente")) return null;
    const grouped = await prisma.pedido.groupBy({
      by: ["clienteId"],
      where,
      _sum: { valorTotal: true },
    });
    const clientes = await prisma.cliente.findMany({
      where: { id: { in: grouped.map((g) => g.clienteId) } },
    });
    const nameById = new Map(clientes.map((c) => [c.id, c.name]));
    return grouped
      .map((g) => ({
        clienteId: g.clienteId,
        cliente: nameById.get(g.clienteId) ?? "—",
        total: g._sum.valorTotal ?? 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  async function loadPorData() {
    if (!canValorTotal || !user.visibleFields.has(dateField)) return null;
    let porData: { data: Date | null; total: number }[];
    if (dateField === "dataFaturamento") {
      const grouped = await prisma.pedido.groupBy({ by: ["dataFaturamento"], where, _sum: { valorTotal: true } });
      porData = grouped.map((g) => ({ data: g.dataFaturamento, total: g._sum.valorTotal ?? 0 }));
    } else {
      const grouped = await prisma.pedido.groupBy({ by: ["data"], where, _sum: { valorTotal: true } });
      porData = grouped.map((g) => ({ data: g.data, total: g._sum.valorTotal ?? 0 }));
    }
    return porData
      .filter((g) => g.data !== null)
      .sort((a, b) => new Date(a.data as Date).getTime() - new Date(b.data as Date).getTime());
  }

  // The three aggregates are independent of each other — running them concurrently instead of
  // one after another means the page waits on the slowest single query, not their sum.
  const [geral, porCliente, porData] = await Promise.all([loadGeral(), loadPorCliente(), loadPorData()]);

  return NextResponse.json({ geral, porCliente, porData });
}
