import { NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/permissions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Delegate {
  findMany: (args?: any) => Promise<any[]>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
}

/**
 * Factory for the CRUD API routes shared by the simple text-option lists
 * (Faturamento, Tipo, Faturado, Cliente). Only ADMIN can create/update/delete;
 * any authenticated user can list, since these values populate dropdowns
 * across the app.
 */
export function makeOptionListRoutes(delegate: Delegate, entityLabel: string, fieldName: "label" | "name" = "label") {
  async function list() {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const items = await delegate.findMany({ orderBy: { [fieldName]: "asc" } });
    return NextResponse.json(items);
  }

  async function create(req: Request) {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const value = typeof body?.[fieldName] === "string" ? (body[fieldName] as string).trim() : "";
    if (!value) {
      return NextResponse.json({ error: "Informe um nome." }, { status: 400 });
    }
    try {
      const created = await delegate.create({ data: { [fieldName]: value } });
      return NextResponse.json(created, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: `Já existe um registro de ${entityLabel} com esse nome.` },
        { status: 409 }
      );
    }
  }

  async function update(req: Request, id: number) {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const value = typeof body?.[fieldName] === "string" ? (body[fieldName] as string).trim() : "";
    if (!value) {
      return NextResponse.json({ error: "Informe um nome." }, { status: 400 });
    }
    try {
      const updated = await delegate.update({ where: { id }, data: { [fieldName]: value } });
      return NextResponse.json(updated);
    } catch {
      return NextResponse.json({ error: "Não foi possível atualizar." }, { status: 409 });
    }
  }

  async function remove(id: number) {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    try {
      await delegate.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        { error: `Não é possível excluir: existem pedidos vinculados a este ${entityLabel}.` },
        { status: 409 }
      );
    }
  }

  return { list, create, update, remove };
}
