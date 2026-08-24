import { Prisma } from "@prisma/client";
import type { AuthedUser } from "@/lib/permissions";
import { canEditPedidoWithStatus } from "@/lib/permissions";

export const PEDIDO_INCLUDE = {
  status: true,
  cliente: true,
  faturamento: true,
  tipo: true,
  faturado: true,
  updatedBy: { select: { name: true } },
  _count: { select: { attachments: true } },
} satisfies Prisma.PedidoInclude;

export type PedidoWithRelations = Prisma.PedidoGetPayload<{ include: typeof PEDIDO_INCLUDE }>;

/**
 * Converts a Pedido row into a plain JSON-safe object that only contains the
 * fields the given user is allowed to view. Fields the user cannot view are
 * simply absent from the payload — the client never receives that data.
 */
export function serializePedido(pedido: PedidoWithRelations, user: AuthedUser) {
  const can = (key: string) => user.visibleFields.has(key);
  const editable = canEditPedidoWithStatus(user, pedido.status.editable);

  const out: Record<string, unknown> = {
    id: pedido.id,
    canEdit: editable,
  };

  if (can("status")) {
    out.status = {
      id: pedido.status.id,
      label: pedido.status.label,
      color: pedido.status.color,
      editable: pedido.status.editable,
    };
  }
  if (can("cliente")) {
    out.cliente = { id: pedido.cliente.id, name: pedido.cliente.name };
  }
  if (can("pedidoCompra")) out.pedidoCompra = pedido.pedidoCompra;
  if (can("data")) out.data = pedido.data;
  if (can("qtd")) out.qtd = pedido.qtd;
  if (can("codigo")) out.codigo = pedido.codigo;
  if (can("descricao")) out.descricao = pedido.descricao;
  if (can("ncm")) out.ncm = pedido.ncm;
  if (can("valorUnitario")) out.valorUnitario = pedido.valorUnitario;
  if (can("valorTotal")) out.valorTotal = pedido.valorTotal;
  if (can("pagamento")) out.pagamento = pedido.pagamento;
  if (can("faturamento")) out.faturamento = { id: pedido.faturamento.id, label: pedido.faturamento.label };
  if (can("tipo")) out.tipo = { id: pedido.tipo.id, label: pedido.tipo.label };
  if (can("observacao")) out.observacao = pedido.observacao;
  if (can("faturado")) out.faturado = { id: pedido.faturado.id, label: pedido.faturado.label };
  if (can("dataFaturamento")) out.dataFaturamento = pedido.dataFaturamento;
  if (can("nf")) out.nf = pedido.nf;
  if (can("pdv")) out.pdv = pedido.pdv;
  if (can("anexos")) out.anexosCount = pedido._count.attachments;
  if (can("editadoPor")) out.editadoPor = pedido.updatedBy?.name ?? null;

  return out;
}
