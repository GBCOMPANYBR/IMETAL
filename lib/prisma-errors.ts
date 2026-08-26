import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Runs a Prisma write and turns a foreign-key violation (P2003 — e.g. a statusId/clienteId
 * that doesn't exist, from a stale client or a deleted option) into a clean 400 instead of
 * letting it bubble up as an unhandled 500.
 */
export async function runWithFkErrorHandling<T>(fn: () => Promise<T>): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json(
        { error: "Uma das referências enviadas (status, cliente, faturamento, tipo ou faturado) não existe mais." },
        { status: 400 }
      );
    }
    throw err;
  }
}
