import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "../../../lib/auth";
import { INTERNAL_API_URL } from "../../../lib/internal-api-url";

export async function getAuthToken() {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value;
}

export async function proxyListingApi(
  path: string,
  init: RequestInit = {}
) {
  const token = await getAuthToken();

  if (!token) {
    return NextResponse.json(
      { message: "Sesión no disponible." },
      { status: 401 }
    );
  }

  const response = await fetch(`${INTERNAL_API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    }
  });

  const raw = await response.text();

  return new NextResponse(raw, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json"
    }
  });
}
