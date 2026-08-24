import { mkdir, unlink, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put, del } from "@vercel/blob";

// On Vercel the filesystem is read-only/ephemeral, so attachments live in Vercel Blob there
// (BLOB_READ_WRITE_TOKEN is auto-injected once a Blob store is connected to the project).
// Locally (no token set) they fall back to disk under storage/attachments, so `npm run dev`
// keeps working without any cloud dependency.
const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const STORAGE_ROOT = path.resolve(process.cwd(), /*turbopackIgnore: true*/ process.env.STORAGE_DIR ?? "./storage/attachments");

function pedidoDir(pedidoId: number): string {
  return path.join(/*turbopackIgnore: true*/ STORAGE_ROOT, String(pedidoId));
}

/** Generates a filesystem-safe stored filename that can't be used for path traversal. */
function safeStoredName(originalName: string): string {
  const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);
  const random = randomUUID();
  return `${random}${ext}`;
}

/**
 * Returns an opaque identifier for the saved file — a relative disk path in local mode,
 * or the Blob URL in Blob mode. Callers must always go through readAttachmentFile /
 * deleteAttachmentFile rather than interpreting this value themselves.
 */
export async function saveAttachmentFile(pedidoId: number, originalName: string, bytes: Buffer): Promise<string> {
  if (USE_BLOB) {
    const blob = await put(`pedidos/${pedidoId}/${safeStoredName(originalName)}`, bytes, {
      access: "public",
      addRandomSuffix: true,
    });
    return blob.url;
  }

  const dir = pedidoDir(pedidoId);
  await mkdir(dir, { recursive: true });
  const storedName = safeStoredName(originalName);
  const fullPath = path.join(/*turbopackIgnore: true*/ dir, storedName);
  await writeFile(fullPath, bytes);
  return path.join(String(pedidoId), storedName);
}

/**
 * Reads the file back through our own server — even in Blob mode we never hand the raw
 * Blob URL to the client, since that URL is publicly reachable by anyone who has it. The
 * permission check stays entirely in the API route that calls this function.
 */
export async function readAttachmentFile(storedPath: string): Promise<Buffer> {
  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    const res = await fetch(storedPath);
    if (!res.ok) throw new Error("Não foi possível ler o anexo do armazenamento.");
    return Buffer.from(await res.arrayBuffer());
  }

  const fullPath = path.join(/*turbopackIgnore: true*/ STORAGE_ROOT, storedPath);
  if (!fullPath.startsWith(STORAGE_ROOT)) {
    throw new Error("Caminho de anexo inválido.");
  }
  return readFile(fullPath);
}

export async function deleteAttachmentFile(storedPath: string): Promise<void> {
  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    await del(storedPath).catch(() => undefined);
    return;
  }

  const fullPath = path.join(/*turbopackIgnore: true*/ STORAGE_ROOT, storedPath);
  if (!fullPath.startsWith(STORAGE_ROOT)) return;
  await unlink(fullPath).catch(() => undefined);
}
