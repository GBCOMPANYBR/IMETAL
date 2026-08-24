import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/permissions";

const createSchema = z.object({
  label: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6b7280"),
  editable: z.boolean().default(true),
});

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const items = await prisma.status.findMany({ orderBy: [{ order: "asc" }, { label: "asc" }] });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos para o status." }, { status: 400 });
  }

  const maxOrder = await prisma.status.aggregate({ _max: { order: true } });

  try {
    const created = await prisma.status.create({
      data: {
        label: parsed.data.label.trim(),
        color: parsed.data.color,
        editable: parsed.data.editable,
        order: (maxOrder._max.order ?? 0) + 1,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Já existe um status com esse nome." }, { status: 409 });
  }
}
