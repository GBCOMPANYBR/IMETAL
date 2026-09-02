import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessCliente, requireAdmin, requireAuth } from "@/lib/permissions";
import { deleteAttachmentFile, readAttachmentFile } from "@/lib/storage";
import { parsePedidoId } from "@/lib/pedido-filters";

// Only these types are safe to render inline in the browser. Anything else (in particular
// text/html and image/svg+xml, which can carry executable script) is forced to download —
// the stored mimeType comes straight from the uploader's browser and is never trustworthy
// enough to hand back as-is with an inline disposition.
const SAFE_INLINE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; fotoId: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!user.visibleFields.has("fotos")) {
    return NextResponse.json({ error: "Sem permissão para visualizar fotos." }, { status: 403 });
  }

  const { id, fotoId } = await params;
  const pedidoId = parsePedidoId(id);
  const fId = parsePedidoId(fotoId);
  if (pedidoId === null || fId === null) {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, select: { clienteId: true } });
  if (!pedido || !canAccessCliente(user, pedido.clienteId)) {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }
  const foto = await prisma.foto.findFirst({ where: { id: fId, pedidoId } });
  if (!foto) {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }

  const bytes = await readAttachmentFile(foto.storedPath).catch(() => null);
  if (!bytes) {
    return NextResponse.json({ error: "Arquivo não encontrado no armazenamento." }, { status: 404 });
  }

  const isSafeInline = SAFE_INLINE_TYPES.has(foto.mimeType);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": isSafeInline ? foto.mimeType : "application/octet-stream",
      "Content-Disposition": `${isSafeInline ? "inline" : "attachment"}; filename="${encodeURIComponent(foto.filename)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; fotoId: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id, fotoId } = await params;
  const pedidoId = parsePedidoId(id);
  const fId = parsePedidoId(fotoId);
  if (pedidoId === null || fId === null) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const foto = await prisma.foto.findFirst({ where: { id: fId, pedidoId } });
  if (!foto) {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }

  await prisma.foto.delete({ where: { id: foto.id } });
  await deleteAttachmentFile(foto.storedPath);

  return NextResponse.json({ ok: true });
}
