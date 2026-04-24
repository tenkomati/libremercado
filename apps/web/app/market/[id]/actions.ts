"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getErrorMessage(response: Response) {
  const raw = await response.text();

  if (!raw) {
    return "No se pudo iniciar la compra protegida.";
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string | string[] };
    return Array.isArray(parsed.message)
      ? parsed.message.join(" ")
      : parsed.message ?? raw;
  } catch {
    return raw;
  }
}

export async function createProtectedPurchaseAction(formData: FormData) {
  const listingId = String(formData.get("listingId"));
  const returnTo = `/market/${listingId}`;
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  try {
    await verifySessionToken(token);
  } catch {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const response = await fetch(`${API_URL}/payments/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      listingId,
      shippingProvider: "Entrega protegida libremercado",
      insuranceSelected: formData.get("insuranceSelected") === "on"
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await getErrorMessage(response);
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/market");
  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Checkout protegido iniciado. En sandbox, un admin puede simular la aprobación del pago para retener los fondos.")}`);
}
