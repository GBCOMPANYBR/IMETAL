import { Prisma } from "@prisma/client";

const FK_FIELDS: Record<string, string> = {
  status: "statusId",
  cliente: "clienteId",
  faturamento: "faturamentoId",
  tipo: "tipoId",
  faturado: "faturadoId",
};

// Postgres int4 bound — "id" is an Int column, so anything above this overflows and crashes the query
// (e.g. a Pedido de Compra number typed into quick search, which is often 10 digits).
const INT4_MAX = 2147483647;

const TEXT_FIELDS = ["pedidoCompra", "codigo", "descricao", "ncm", "pagamento", "observacao", "nf", "pdv"];
const NUMBER_FIELDS = ["qtd", "valorUnitario", "valorTotal"];
const DATE_FIELDS = ["data", "dataFaturamento"];

// Fields with a real matching Prisma column/relation — the only ones safe to pass through to orderBy.
// "id" is handled separately since it has no permission gate.
const SORTABLE_FIELDS = new Set([...Object.keys(FK_FIELDS), ...TEXT_FIELDS, ...NUMBER_FIELDS, ...DATE_FIELDS]);

export interface ParsedPedidoQuery {
  where: Prisma.PedidoWhereInput;
  orderBy: Prisma.PedidoOrderByWithRelationInput;
  hasFilters: boolean;
  page: number;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Parses a free-typed number that may use Brazilian formatting ("1.500,50" or "1500,5"), or null if it isn't one. */
function parseSearchedNumber(q: string): number | null {
  const cleaned = q.trim();
  if (!/^-?[\d.,]+$/.test(cleaned)) return null;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function parsePedidoQuery(searchParams: URLSearchParams, visibleFields: Set<string>): ParsedPedidoQuery {
  const and: Prisma.PedidoWhereInput[] = [];
  let hasFilters = false;

  {
    const min = searchParams.get("f_id_min");
    const max = searchParams.get("f_id_max");
    const range: Record<string, number> = {};
    if (min !== null && min !== "" && !Number.isNaN(Number(min)) && Number(min) <= INT4_MAX) range.gte = Number(min);
    if (max !== null && max !== "" && !Number.isNaN(Number(max)) && Number(max) <= INT4_MAX) range.lte = Number(max);
    if (Object.keys(range).length > 0) {
      and.push({ id: range });
      hasFilters = true;
    }
  }

  for (const [fieldKey, fkColumn] of Object.entries(FK_FIELDS)) {
    if (!visibleFields.has(fieldKey)) continue;
    const raw = searchParams.get(`f_${fieldKey}`);
    if (!raw) continue;
    const ids = raw
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isInteger(n));
    if (ids.length > 0) {
      and.push({ [fkColumn]: { in: ids } } as Prisma.PedidoWhereInput);
      hasFilters = true;
    }
  }

  for (const fieldKey of TEXT_FIELDS) {
    if (!visibleFields.has(fieldKey)) continue;
    const raw = searchParams.get(`f_${fieldKey}`);
    if (!raw) continue;
    and.push({ [fieldKey]: { contains: raw } } as Prisma.PedidoWhereInput);
    hasFilters = true;
  }

  for (const fieldKey of NUMBER_FIELDS) {
    if (!visibleFields.has(fieldKey)) continue;
    const min = searchParams.get(`f_${fieldKey}_min`);
    const max = searchParams.get(`f_${fieldKey}_max`);
    const range: Record<string, number> = {};
    if (min !== null && min !== "" && !Number.isNaN(Number(min))) range.gte = Number(min);
    if (max !== null && max !== "" && !Number.isNaN(Number(max))) range.lte = Number(max);
    if (Object.keys(range).length > 0) {
      and.push({ [fieldKey]: range } as Prisma.PedidoWhereInput);
      hasFilters = true;
    }
  }

  for (const fieldKey of DATE_FIELDS) {
    if (!visibleFields.has(fieldKey)) continue;
    const from = searchParams.get(`f_${fieldKey}_from`);
    const to = searchParams.get(`f_${fieldKey}_to`);
    const range: Record<string, Date> = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) range.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) range.lte = endOfDay(d);
    }
    if (Object.keys(range).length > 0) {
      and.push({ [fieldKey]: range } as Prisma.PedidoWhereInput);
      hasFilters = true;
    }
  }

  if (visibleFields.has("editadoPor")) {
    const raw = searchParams.get("f_editadoPor");
    if (raw) {
      and.push({ updatedBy: { name: { contains: raw } } });
      hasFilters = true;
    }
  }

  if (visibleFields.has("anexos")) {
    const raw = searchParams.get("f_anexos");
    if (raw === "1") {
      and.push({ attachments: { some: {} } });
      hasFilters = true;
    } else if (raw === "0") {
      and.push({ attachments: { none: {} } });
      hasFilters = true;
    }
  }

  const q = searchParams.get("q")?.trim();
  if (q) {
    hasFilters = true;
    const or: Prisma.PedidoWhereInput[] = [];
    for (const fieldKey of TEXT_FIELDS) {
      if (visibleFields.has(fieldKey)) {
        or.push({ [fieldKey]: { contains: q } } as Prisma.PedidoWhereInput);
      }
    }
    if (visibleFields.has("cliente")) or.push({ cliente: { name: { contains: q } } });
    if (visibleFields.has("status")) or.push({ status: { label: { contains: q } } });
    if (visibleFields.has("faturamento")) or.push({ faturamento: { label: { contains: q } } });
    if (visibleFields.has("tipo")) or.push({ tipo: { label: { contains: q } } });
    if (visibleFields.has("faturado")) or.push({ faturado: { label: { contains: q } } });
    if (visibleFields.has("editadoPor")) or.push({ updatedBy: { name: { contains: q } } });

    // ID has no permission gate — always searchable, matching how it's always shown as the row key.
    if (/^\d+$/.test(q) && Number(q) <= INT4_MAX) or.push({ id: Number(q) });

    const asNumber = parseSearchedNumber(q);
    if (asNumber !== null) {
      const EPSILON = 0.005;
      const range = { gte: asNumber - EPSILON, lte: asNumber + EPSILON };
      if (visibleFields.has("valorTotal")) or.push({ valorTotal: range });
      if (visibleFields.has("valorUnitario")) or.push({ valorUnitario: range });
    }

    if (or.length > 0) and.push({ OR: or });
  }

  const sortParam = searchParams.get("sort");
  const dirParam = searchParams.get("dir") === "asc" ? "asc" : "desc";
  let orderBy: Prisma.PedidoOrderByWithRelationInput = { id: "desc" };
  if (sortParam === "id") {
    orderBy = { id: dirParam };
  } else if (sortParam && SORTABLE_FIELDS.has(sortParam) && visibleFields.has(sortParam)) {
    if (FK_FIELDS[sortParam]) {
      const relationField = sortParam === "cliente" ? "name" : "label";
      orderBy = { [sortParam]: { [relationField]: dirParam } } as Prisma.PedidoOrderByWithRelationInput;
    } else {
      orderBy = { [sortParam]: dirParam } as Prisma.PedidoOrderByWithRelationInput;
    }
  }

  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  return {
    where: and.length > 0 ? { AND: and } : {},
    orderBy,
    hasFilters,
    page,
  };
}
