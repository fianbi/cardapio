import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Guarda uma imagem enviada pelo lojista e devolve a URL.
 * Em produção usa o Vercel Blob (variável BLOB_READ_WRITE_TOKEN); sem ela, grava em public/uploads (desenvolvimento).
 */
export async function saveImage(file: File, folder: string): Promise<UploadResult> {
  const ext = TYPES[file.type];
  if (!ext) return { ok: false, error: "Envie a foto em JPG, PNG ou WebP." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "A foto deve ter no máximo 4 MB." };

  const name = `${folder}/${randomUUID()}.${ext}`;
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(name, file, { access: "public", contentType: file.type });
      return { ok: true, url: blob.url };
    }
    const dir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(process.cwd(), "public", "uploads", name), Buffer.from(await file.arrayBuffer()));
    return { ok: true, url: `/uploads/${name}` };
  } catch (e) {
    console.error("Falha no upload", e);
    return { ok: false, error: "Não foi possível enviar a foto. Tente novamente." };
  }
}

/** Arquivo de imagem vindo de um formulário (ignora o campo vazio). */
export function formImage(form: FormData, key: string): File | null {
  const value = form.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}
