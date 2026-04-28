import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { resolveLocalPublicDirectory } from "../../../lib/media-storage";

type RouteContext = {
  params: Promise<{ parts: string[] }>;
};

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime"
};

export const runtime = "nodejs";

export async function GET(_: Request, context: RouteContext) {
  const { parts } = await context.params;

  if (!parts.length || parts.some((part) => part.includes(".."))) {
    return NextResponse.json({ message: "Archivo inválido." }, { status: 400 });
  }

  const publicDirectory = resolveLocalPublicDirectory();
  const absolutePath = path.resolve(publicDirectory, "uploads", ...parts);
  const expectedRoot = path.resolve(publicDirectory);

  if (!absolutePath.startsWith(expectedRoot)) {
    return NextResponse.json({ message: "Acceso inválido." }, { status: 400 });
  }

  try {
    const body = await readFile(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ message: "Archivo no encontrado." }, { status: 404 });
  }
}
