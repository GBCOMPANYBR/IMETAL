import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { saveAttachmentFile } from "@/lib/storage";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!user.visibleFields.has("anexos")) {
    return NextResponse.json({ error: "Sem permissão para visualizar anexos." }, { status: 403 });
  }

  const { id } = await params;
  const attachments = await prisma.attachment.findMany({
    where: { pedidoId: Number(id) },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, filename: true, mimeType: true, size: true, uploadedAt: true, uploadedBy: { select: { name: true } } },
  });
  return NextResponse.json(attachments);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!user.visibleFields.has("anexos")) {
    return NextResponse.json({ error: "Sem permissão para gerenciar anexos." }, { status: 403 });
  }

  const { id } = await params;
  const pedidoId = Number(id);
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, include: { status: true } });
  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }
  // Uploading is allowed for anyone who can see the anexos column — even a read-only user —
  // as long as the record itself isn't locked. Deleting an attachment stays ADMIN-only.
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

  const attachment = await prisma.attachment.create({
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

  return NextResponse.json(attachment, { status: 201 });
}
