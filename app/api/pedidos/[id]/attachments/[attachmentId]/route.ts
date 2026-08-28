import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/permissions";
import { deleteAttachmentFile, readAttachmentFile } from "@/lib/storage";
import { parsePedidoId } from "@/lib/pedido-filters";

// Only these types are safe to render inline in the browser. Anything else (in particular
// text/html and image/svg+xml, which can carry executable script) is forced to download —
// the stored mimeType comes straight from the uploader's browser and is never trustworthy
// enough to hand back as-is with an inline disposition.
const SAFE_INLINE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!user.visibleFields.has("anexos")) {
    return NextResponse.json({ error: "Sem permissão para visualizar anexos." }, { status: 403 });
  }

  const { id, attachmentId } = await params;
  const pedidoId = parsePedidoId(id);
  const attId = parsePedidoId(attachmentId);
  if (pedidoId === null || attId === null) {
    return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
  }
  const attachment = await prisma.attachment.findFirst({
    where: { id: attId, pedidoId },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
  }

  const bytes = await readAttachmentFile(attachment.storedPath).catch(() => null);
  if (!bytes) {
    return NextResponse.json({ error: "Arquivo não encontrado no armazenamento." }, { status: 404 });
  }

  const isSafeInline = SAFE_INLINE_TYPES.has(attachment.mimeType);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": isSafeInline ? attachment.mimeType : "application/octet-stream",
      "Content-Disposition": `${isSafeInline ? "inline" : "attachment"}; filename="${encodeURIComponent(attachment.filename)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id, attachmentId } = await params;
  const pedidoId = parsePedidoId(id);
  const attId = parsePedidoId(attachmentId);
  if (pedidoId === null || attId === null) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const attachment = await prisma.attachment.findFirst({ where: { id: attId, pedidoId } });
  if (!attachment) {
    return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
  }

  await prisma.attachment.delete({ where: { id: attachment.id } });
  await deleteAttachmentFile(attachment.storedPath);

  return NextResponse.json({ ok: true });
}
