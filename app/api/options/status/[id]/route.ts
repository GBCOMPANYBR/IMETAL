import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  editable: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  try {
    const updated = await prisma.status.update({
      where: { id: Number(id) },
      data: {
        ...(parsed.data.label !== undefined ? { label: parsed.data.label.trim() } : {}),
        ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
        ...(parsed.data.editable !== undefined ? { editable: parsed.data.editable } : {}),
        ...(parsed.data.order !== undefined ? { order: parsed.data.order } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o status." }, { status: 409 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    await prisma.status.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Não é possível excluir: existem pedidos usando este status." },
      { status: 409 }
    );
  }
}
