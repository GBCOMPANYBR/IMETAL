import { z } from "zod";

/** Maps the JSON body keys accepted by the Pedido API to the canonical field key used for permissions. */
export const FORM_KEY_TO_FIELD_KEY: Record<string, string> = {
  statusId: "status",
  clienteId: "cliente",
  pedidoCompra: "pedidoCompra",
  data: "data",
  qtd: "qtd",
  codigo: "codigo",
  descricao: "descricao",
  ncm: "ncm",
  valorUnitario: "valorUnitario",
  pagamento: "pagamento",
  faturamentoId: "faturamento",
  tipoId: "tipo",
  observacao: "observacao",
  faturadoId: "faturado",
  dataFaturamento: "dataFaturamento",
  nf: "nf",
  pdv: "pdv",
};

/** Returns the body keys that the user is not allowed to view/edit, or [] if the payload is fully permitted. */
export function findDisallowedKeys(bodyKeys: string[], visibleFields: Set<string>): string[] {
  return bodyKeys.filter((key) => {
    const fieldKey = FORM_KEY_TO_FIELD_KEY[key];
    if (!fieldKey) return false; // unknown keys are ignored by zod, not a permission concern
    return !visibleFields.has(fieldKey);
  });
}

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : v ?? null));

const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(v) : null));

export const pedidoCreateSchema = z.object({
  statusId: z.number().int(),
  clienteId: z.number().int(),
  faturamentoId: z.number().int(),
  tipoId: z.number().int(),
  pedidoCompra: optionalTrimmedString,
  data: optionalDate,
  qtd: z.number().finite().default(0),
  codigo: optionalTrimmedString,
  descricao: optionalTrimmedString,
  ncm: optionalTrimmedString,
  valorUnitario: z.number().finite().default(0),
  pagamento: optionalTrimmedString,
  observacao: optionalTrimmedString,
  dataFaturamento: optionalDate,
  nf: optionalTrimmedString,
  pdv: optionalTrimmedString,
});

export const pedidoUpdateSchema = z.object({
  statusId: z.number().int().optional(),
  clienteId: z.number().int().optional(),
  faturamentoId: z.number().int().optional(),
  tipoId: z.number().int().optional(),
  faturadoId: z.number().int().optional(),
  pedidoCompra: optionalTrimmedString,
  data: optionalDate,
  qtd: z.number().finite().optional(),
  codigo: optionalTrimmedString,
  descricao: optionalTrimmedString,
  ncm: optionalTrimmedString,
  valorUnitario: z.number().finite().optional(),
  pagamento: optionalTrimmedString,
  observacao: optionalTrimmedString,
  dataFaturamento: optionalDate,
  nf: optionalTrimmedString,
  pdv: optionalTrimmedString,
});
