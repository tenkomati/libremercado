import { NextResponse } from "next/server";
import { INTERNAL_API_URL } from "../../../../../lib/internal-api-url";

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(`${INTERNAL_API_URL}/auth/password-reset/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorBody = await response.text();

    return NextResponse.json(
      {
        message: errorBody || "No se pudo iniciar la recuperación."
      },
      { status: response.status }
    );
  }

  return NextResponse.json(await response.json());
}
