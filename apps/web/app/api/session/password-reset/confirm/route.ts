import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(`${API_URL}/auth/password-reset/confirm`, {
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
        message: errorBody || "El enlace es inválido o venció."
      },
      { status: response.status }
    );
  }

  return NextResponse.json(await response.json());
}
