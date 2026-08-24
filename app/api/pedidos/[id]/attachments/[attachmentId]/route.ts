import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/permissions";
import { deleteAttachmentFile, readAttachmentFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!user.visibleFields.has("anexos")) {
    return NextResponse.json({ error: "Sem permissão para visualizar anexos." }, { status: 403 });
  }

  const { id, attachmentId } = await params;
  const attachment = await prisma.attachment.findFirst({
    where: { id: Number(attachmentId), pedidoId: Number(id) },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
  }

  const bytes = await readAttachmentFile(attachment.storedPath).catch(() => null);
  if (!bytes) {
    return NextResponse.json({ error: "Arquivo não encontrado no armazenamento." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.filename)}"`,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id, attachmentId } = await params;
  const pedidoId = Number(id);

  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const attachment = await prisma.attachment.findFirst({ where: { id: Number(attachmentId), pedidoId } });
  if (!attachment) {
    return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
  }

  await prisma.attachment.delete({ where: { id: attachment.id } });
  await deleteAttachmentFile(attachment.storedPath);

  return NextResponse.json({ ok: true });
}
