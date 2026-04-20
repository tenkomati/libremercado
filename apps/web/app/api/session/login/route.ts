import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "../../../../lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(`${API_URL}/auth/login`, {
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
        message: errorBody || "Invalid credentials"
      },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as {
    accessToken: string;
    expiresIn: number;
    user: {
      role: "USER" | "OPS" | "ADMIN";
    };
  };

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, payload.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: payload.expiresIn
  });

  return NextResponse.json({
    user: payload.user
  });
}
