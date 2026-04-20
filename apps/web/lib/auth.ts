import { type JWTPayload } from "jose";
import { jwtVerify } from "jose/jwt/verify";

export const AUTH_COOKIE_NAME = "libremercado_admin_token";

export type SessionPayload = JWTPayload & {
  sub: string;
  email: string;
  role: "USER" | "OPS" | "ADMIN";
};

function getJwtSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? "dev-only-local-secret-change-me"
  );
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as SessionPayload;
}

export function canAccessAdmin(role: SessionPayload["role"]) {
  return role === "ADMIN" || role === "OPS";
}
