import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "../../../../lib/auth";
import { INTERNAL_API_URL } from "../../../../lib/internal-api-url";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    await fetch(`${INTERNAL_API_URL}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    }).catch(() => undefined);

    cookieStore.delete(AUTH_COOKIE_NAME);
  }

  return NextResponse.json({
    success: true
  });
}
