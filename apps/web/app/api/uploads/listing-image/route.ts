import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
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
      { message: "La imagen no puede superar 5 MB." },
      { status: 400 }
    );
  }

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "listings"
  );
  await mkdir(uploadDir, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const destination = path.join(uploadDir, filename);
  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  let buffer;

  try {
    buffer = await normalizeImage(sourceBuffer, file, extension);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudo procesar la imagen."
      },
      { status: 400 }
    );
  }

  await writeFile(destination, buffer);

  return NextResponse.json({
    url: `/uploads/listings/${filename}`
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

  if (isHeic) {
    try {
      return await sharp(buffer)
        .rotate()
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer();
    } catch {
      throw new Error(
        "No se pudo convertir la imagen HEIC/HEIF. Probá exportarla como JPG desde tu dispositivo."
      );
    }
  }

  if (extension === "jpg") {
    return sharp(buffer).rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  }

  if (extension === "png") {
    return sharp(buffer).rotate().png({ compressionLevel: 9 }).toBuffer();
  }

  return sharp(buffer).rotate().webp({ quality: 88 }).toBuffer();
}
