import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import sharp from "sharp";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_PURPOSES = new Set(["dni-front", "dni-back", "selfie"]);
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "jpg"],
  ["image/heif", "jpg"]
]);
const ALLOWED_IMAGE_EXTENSIONS = new Map([
  ["jpg", "jpg"],
  ["jpeg", "jpg"],
  ["png", "png"],
  ["webp", "webp"],
  ["heic", "jpg"],
  ["heif", "jpg"]
]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const purpose = String(formData.get("purpose") ?? "");

  if (!ALLOWED_PURPOSES.has(purpose)) {
    return NextResponse.json(
      { message: "Tipo de imagen de identidad inválido." },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "No se recibió una imagen válida." },
      { status: 400 }
    );
  }

  const extension = getTargetExtension(file);

  if (!extension) {
    return NextResponse.json(
      { message: "Formato no permitido. Usá JPG, PNG, WEBP, HEIC o HEIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { message: "La imagen no puede superar 8 MB." },
      { status: 400 }
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "kyc");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${Date.now()}-${purpose}-${randomUUID()}.${extension}`;
  const destination = path.join(uploadDir, filename);
  const sourceBuffer = Buffer.from(await file.arrayBuffer());

  try {
    await writeFile(destination, await normalizeImage(sourceBuffer, file, extension));
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudo procesar la imagen de identidad."
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    url: `/uploads/kyc/${filename}`
  });
}

function getTargetExtension(file: File) {
  const typeExtension = ALLOWED_IMAGE_TYPES.get(file.type);

  if (typeExtension) {
    return typeExtension;
  }

  const fileExtension = file.name.split(".").pop()?.toLowerCase();
  return fileExtension ? ALLOWED_IMAGE_EXTENSIONS.get(fileExtension) : undefined;
}

async function normalizeImage(buffer: Buffer, file: File, extension: string) {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");

  if (isHeic || extension === "jpg") {
    try {
      return await sharp(buffer)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();
    } catch {
      throw new Error(
        "No se pudo convertir la imagen. Probá exportarla como JPG desde tu dispositivo."
      );
    }
  }

  if (extension === "png") {
    return sharp(buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  return sharp(buffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();
}
