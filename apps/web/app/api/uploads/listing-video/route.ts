import { NextResponse } from "next/server";

import { checkRateLimit } from "../../../../lib/rate-limit";
import { storeMediaFile } from "../../../../lib/media-storage";

const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Map<string, string>([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"]
]);

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: "upload-listing-video",
    limit: 10,
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

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "No se recibió un video válido." },
      { status: 400 }
    );
  }

  if (file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { message: "El video no puede superar 20 MB." },
      { status: 400 }
    );
  }

  const extension = ALLOWED_VIDEO_TYPES.get(file.type);

  if (!extension) {
    return NextResponse.json(
      { message: "Formato no permitido. Usá MP4, WEBM o MOV." },
      { status: 400 }
    );
  }

  try {
    const storedFile = await storeMediaFile({
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      extension,
      folder: "listings"
    });

    return NextResponse.json({
      key: storedFile.key,
      url: storedFile.url
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudo guardar el video. Revisá la configuración de storage." },
      { status: 500 }
    );
  }
}
