import { mkdir, unlink, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Attachments live outside the Next.js build output and are read/written using paths built
// from a runtime env var, so we opt them out of Turbopack's static file-tracing analysis
// (it would otherwise bundle the whole project into the server output).
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

export async function saveAttachmentFile(pedidoId: number, originalName: string, bytes: Buffer): Promise<string> {
  const dir = pedidoDir(pedidoId);
  await mkdir(dir, { recursive: true });
  const storedName = safeStoredName(originalName);
  const fullPath = path.join(/*turbopackIgnore: true*/ dir, storedName);
  await writeFile(fullPath, bytes);
  return path.join(String(pedidoId), storedName);
}

export async function readAttachmentFile(storedPath: string): Promise<Buffer> {
  const fullPath = path.join(/*turbopackIgnore: true*/ STORAGE_ROOT, storedPath);
  if (!fullPath.startsWith(STORAGE_ROOT)) {
    throw new Error("Caminho de anexo inválido.");
  }
  return readFile(fullPath);
}

export async function deleteAttachmentFile(storedPath: string): Promise<void> {
  const fullPath = path.join(/*turbopackIgnore: true*/ STORAGE_ROOT, storedPath);
  if (!fullPath.startsWith(STORAGE_ROOT)) return;
  await unlink(fullPath).catch(() => undefined);
}
