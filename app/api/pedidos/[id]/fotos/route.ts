import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessCliente, requireAuth } from "@/lib/permissions";
import { saveAttachmentFile } from "@/lib/storage";
import { parsePedidoId } from "@/lib/pedido-filters";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!user.visibleFields.has("fotos")) {
    return NextResponse.json({ error: "Sem permissão para visualizar fotos." }, { status: 403 });
  }

  const { id } = await params;
  const pedidoId = parsePedidoId(id);
  if (pedidoId === null) {
    return NextResponse.json([]);
  }
  const owner = await prisma.pedido.findUnique({ where: { id: pedidoId }, select: { clienteId: true } });
  if (!owner || !canAccessCliente(user, owner.clienteId)) {
    return NextResponse.json([]);
  }
  // Unlike anexos, fotos are NOT shared across Pedidos with the same Código — each Pedido has its own.
  const fotos = await prisma.foto.findMany({
    where: { pedidoId },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, filename: true, mimeType: true, size: true, uploadedAt: true, uploadedBy: { select: { name: true } } },
  });
  return NextResponse.json(fotos);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!user.visibleFields.has("fotos")) {
    return NextResponse.json({ error: "Sem permissão para gerenciar fotos." }, { status: 403 });
  }

  const { id } = await params;
  const pedidoId = parsePedidoId(id);
  if (pedidoId === null) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, include: { status: true } });
  if (!pedido || !canAccessCliente(user, pedido.clienteId)) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }
  // Uploading is allowed for anyone who can see the fotos column — even a read-only user —
  // as long as the record itself isn't locked. Deleting a foto stays ADMIN-only.
  if (!user.isAdmin && !pedido.status.editable) {
    return NextResponse.json({ error: "Este pedido está com um status que não permite edição." }, { status: 423 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo maior que 20MB." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const storedPath = await saveAttachmentFile(pedidoId, file.name, bytes);

  const foto = await prisma.foto.create({
    data: {
      pedidoId,
      filename: file.name,
      storedPath,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      uploadedById: user.id,
    },
    select: { id: true, filename: true, mimeType: true, size: true, uploadedAt: true },
  });

  return NextResponse.json(foto, { status: 201 });
}
