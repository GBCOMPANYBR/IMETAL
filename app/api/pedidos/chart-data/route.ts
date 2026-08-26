import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { parsePedidoQuery } from "@/lib/pedido-filters";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const { where } = parsePedidoQuery(searchParams, user.visibleFields);

  const canValorTotal = user.visibleFields.has("valorTotal");
  const result: { geral: number | null; porCliente: unknown[] | null; porData: unknown[] | null } = {
    geral: null,
    porCliente: null,
    porData: null,
  };

  if (canValorTotal) {
    const totals = await prisma.pedido.aggregate({ where, _sum: { valorTotal: true } });
    result.geral = totals._sum.valorTotal ?? 0;
  }

  if (canValorTotal && user.visibleFields.has("cliente")) {
    const grouped = await prisma.pedido.groupBy({
      by: ["clienteId"],
      where,
      _sum: { valorTotal: true },
    });
    const clientes = await prisma.cliente.findMany({
      where: { id: { in: grouped.map((g) => g.clienteId) } },
    });
    const nameById = new Map(clientes.map((c) => [c.id, c.name]));
    result.porCliente = grouped
      .map((g) => ({
        clienteId: g.clienteId,
        cliente: nameById.get(g.clienteId) ?? "—",
        total: g._sum.valorTotal ?? 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  const dateFieldParam = searchParams.get("dateField");
  const dateField = dateFieldParam === "dataFaturamento" ? "dataFaturamento" : "data";

  if (canValorTotal && user.visibleFields.has(dateField)) {
    let porData: { data: Date | null; total: number }[];
    if (dateField === "dataFaturamento") {
      const grouped = await prisma.pedido.groupBy({ by: ["dataFaturamento"], where, _sum: { valorTotal: true } });
      porData = grouped.map((g) => ({ data: g.dataFaturamento, total: g._sum.valorTotal ?? 0 }));
    } else {
      const grouped = await prisma.pedido.groupBy({ by: ["data"], where, _sum: { valorTotal: true } });
      porData = grouped.map((g) => ({ data: g.data, total: g._sum.valorTotal ?? 0 }));
    }
    result.porData = porData
      .filter((g) => g.data !== null)
      .sort((a, b) => new Date(a.data as Date).getTime() - new Date(b.data as Date).getTime());
  }

  return NextResponse.json(result);
}
