import sharp from "sharp";

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

export function getTargetImageExtension(file: File) {
  const typeExtension = ALLOWED_IMAGE_TYPES.get(file.type);

  if (typeExtension) {
    return typeExtension;
  }

  const fileExtension = file.name.split(".").pop()?.toLowerCase();
  return fileExtension ? ALLOWED_IMAGE_EXTENSIONS.get(fileExtension) : undefined;
}

export function getNormalizedContentType(extension: string) {
  if (extension === "jpg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  return "image/webp";
}

export async function normalizeUploadImage({
  buffer,
  extension,
  file,
  maxWidth
}: {
  buffer: Buffer;
  extension: string;
  file: File;
  maxWidth?: number;
}) {
  const pipeline = sharp(buffer).rotate();
  const image = maxWidth
    ? pipeline.resize({ width: maxWidth, withoutEnlargement: true })
    : pipeline;
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");

  if (isHeic || extension === "jpg") {
    try {
      return await image.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    } catch {
      throw new Error(
        "No se pudo convertir la imagen. Probá exportarla como JPG desde tu dispositivo."
      );
    }
  }

  if (extension === "png") {
    return image.png({ compressionLevel: 9 }).toBuffer();
  }

  return image.webp({ quality: 88 }).toBuffer();
}
