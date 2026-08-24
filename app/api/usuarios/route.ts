import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import { isValidFieldKey } from "@/lib/fields";

const createSchema = z.object({
  username: z.string().trim().min(3, "Login deve ter ao menos 3 caracteres."),
  name: z.string().trim().min(1, "Informe o nome."),
  password: z.string().min(4, "Senha deve ter ao menos 4 caracteres."),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
  canEdit: z.boolean().default(true),
  active: z.boolean().default(true),
  visibleFields: z.array(z.string()).default([]),
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

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const users = await prisma.user.findMany({
    include: { permissions: true },
    orderBy: { username: "asc" },
  });
  return NextResponse.json(users.map(serializeUser));
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const data = parsed.data;
  const validFieldKeys = data.visibleFields.filter(isValidFieldKey);
  const passwordHash = await hashPassword(data.password);

  try {
    const created = await prisma.user.create({
      data: {
        username: data.username,
        name: data.name,
        passwordHash,
        role: data.role,
        canEdit: data.role === "ADMIN" ? true : data.canEdit,
        active: data.active,
        permissions: {
          create: validFieldKeys.map((fieldKey) => ({ fieldKey, canView: true })),
        },
      },
      include: { permissions: true },
    });
    return NextResponse.json(serializeUser(created), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Já existe um usuário com esse login." }, { status: 409 });
  }
}
