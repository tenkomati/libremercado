import { NextResponse } from "next/server";

import { checkRateLimit } from "../../../../lib/rate-limit";
import { storeMediaFile } from "../../../../lib/media-storage";
import {
  getNormalizedContentType,
  getTargetImageExtension,
  normalizeUploadImage
} from "../../../../lib/upload-images";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: "upload-listing-image",
    limit: 20,
    windowSeconds: 3600
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        message: `Demasiados intentos de carga. Probá de nuevo en ${rateLimit.resetSeconds} segundos.`
      },
      { status: 429 }
    );
  }

  if (isPayloadTooLarge(request, MAX_IMAGE_BYTES)) {
    return NextResponse.json(
      { message: "La imagen no puede superar 5 MB." },
      { status: 413 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "No se recibió una imagen válida." },
      { status: 400 }
    );
  }

  const extension = getTargetImageExtension(file);

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

  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  let buffer;

  try {
    buffer = await normalizeUploadImage({ buffer: sourceBuffer, file, extension });
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

  try {
    const storedFile = await storeMediaFile({
      body: buffer,
      contentType: getNormalizedContentType(extension),
      extension,
      folder: "listings"
    });

    return NextResponse.json({
      key: storedFile.key,
      url: storedFile.url
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudo guardar la imagen. Revisá la configuración de storage." },
      { status: 500 }
    );
  }
}

function isPayloadTooLarge(request: Request, maxBytes: number) {
  const contentLength = Number(request.headers.get("content-length"));

  return Number.isFinite(contentLength) && contentLength > maxBytes + 512_000;
}
