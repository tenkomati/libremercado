import { NextResponse } from "next/server";

import { INTERNAL_API_URL } from "../../../../../lib/internal-api-url";

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(`${INTERNAL_API_URL}/listings/catalog/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const raw = await response.text();

  return new NextResponse(raw, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json"
    }
  });
}
