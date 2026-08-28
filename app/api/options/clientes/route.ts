import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeOptionListRoutes } from "@/lib/option-list";
import { requireAuth } from "@/lib/permissions";

const routes = makeOptionListRoutes(prisma.cliente, "Cliente", "name");

// Overrides the shared list handler: a user restricted to specific Clientes (e.g. a read-only
// login created for VEOLIA) must not see other companies' names in this dropdown either, even
// though the Pedidos themselves are already filtered server-side.
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const where = user.allClientes ? {} : { id: { in: Array.from(user.visibleClienteIds) } };
  const items = await prisma.cliente.findMany({ where, orderBy: { name: "asc" } });
  return NextResponse.json(items);
}

export const POST = routes.create;
