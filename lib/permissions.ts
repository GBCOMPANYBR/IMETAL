import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth";
import { PEDIDO_FIELD_KEYS } from "@/lib/fields";

export type Role = "ADMIN" | "USER";

export interface AuthedUser {
  id: number;
  username: string;
  name: string;
  role: Role;
  canEdit: boolean;
  active: boolean;
  isAdmin: boolean;
  visibleFields: Set<string>;
}

/**
 * Loads the current user fresh from the database on every call (role, canEdit and
 * field permissions are re-read each request) so an admin changing someone's
 * permissions takes effect immediately, without requiring the user to log in again.
 */
export async function getCurrentUser(): Promise<AuthedUser | null> {
  const session = await getSessionPayload();
  if (!session) return null;

  const record = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { permissions: true },
  });
  if (!record || !record.active) return null;

  const isAdmin = record.role === "ADMIN";
  const visibleFields = new Set<string>(
    isAdmin
      ? PEDIDO_FIELD_KEYS
      : record.permissions.filter((p) => p.canView).map((p) => p.fieldKey)
  );

  return {
    id: record.id,
    username: record.username,
    name: record.name,
    role: record.role as Role,
    canEdit: record.canEdit,
    active: record.active,
    isAdmin,
    visibleFields,
  };
}

export async function requireAuth(): Promise<{ user: AuthedUser } | { error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  return { user };
}

export async function requireAdmin(): Promise<{ user: AuthedUser } | { error: NextResponse }> {
  const result = await requireAuth();
  if ("error" in result) return result;
  if (!result.user.isAdmin) {
    return { error: NextResponse.json({ error: "Apenas administradores podem executar esta ação." }, { status: 403 }) };
  }
  return result;
}

/** Whether the given user may modify a pedido currently in the given status. */
export function canEditPedidoWithStatus(user: AuthedUser, statusEditable: boolean): boolean {
  if (user.isAdmin) return true;
  return user.canEdit && statusEditable;
}
