import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import { isValidFieldKey } from "@/lib/fields";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres.").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "USER"]).optional(),
  canEdit: z.boolean().optional(),
  active: z.boolean().optional(),
  visibleFields: z.array(z.string()).optional(),
});

function serializeUser(user: {
  id: number;
  username: string;
  name: string;
  role: string;
  canEdit: boolean;
  active: boolean;
  createdAt: Date;
  permissions: { fieldKey: string; canView: boolean }[];
}) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    canEdit: user.canEdit,
    active: user.active,
    createdAt: user.createdAt,
    visibleFields: user.permissions.filter((p) => p.canView).map((p) => p.fieldKey),
  };
}

async function countActiveAdmins() {
  return prisma.user.count({ where: { role: "ADMIN", active: true } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const targetId = Number(id);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const data = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const demotingSelf = target.role === "ADMIN" && (data.role === "USER" || data.active === false);
  if (demotingSelf && target.id === auth.user.id) {
    const admins = await countActiveAdmins();
    if (admins <= 1) {
      return NextResponse.json(
        { error: "Não é possível remover o acesso de administrador do único ADMIN ativo." },
        { status: 409 }
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.canEdit !== undefined) updateData.canEdit = data.canEdit;
  if (data.active !== undefined) updateData.active = data.active;
  const effectiveRole = data.role ?? target.role;
  if (effectiveRole === "ADMIN") updateData.canEdit = true;
  if (data.password) updateData.passwordHash = await hashPassword(data.password);

  const updated = await prisma.$transaction(async (tx) => {
    if (data.visibleFields !== undefined) {
      await tx.fieldPermission.deleteMany({ where: { userId: targetId } });
      const validFieldKeys = data.visibleFields.filter(isValidFieldKey);
      if (validFieldKeys.length > 0) {
        await tx.fieldPermission.createMany({
          data: validFieldKeys.map((fieldKey) => ({ userId: targetId, fieldKey, canView: true })),
        });
      }
    }
    return tx.user.update({
      where: { id: targetId },
      data: updateData,
      include: { permissions: true },
    });
  });

  return NextResponse.json(serializeUser(updated));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const targetId = Number(id);

  if (targetId === auth.user.id) {
    return NextResponse.json({ error: "Você não pode excluir o seu próprio usuário." }, { status: 409 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  if (target.role === "ADMIN" && target.active) {
    const admins = await countActiveAdmins();
    if (admins <= 1) {
      return NextResponse.json({ error: "Não é possível excluir o único ADMIN ativo." }, { status: 409 });
    }
  }

  await prisma.user.delete({ where: { id: targetId } });
  return NextResponse.json({ ok: true });
}
