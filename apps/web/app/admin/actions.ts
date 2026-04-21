"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { AUTH_COOKIE_NAME, canAccessAdmin, verifySessionToken } from "../../lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getAdminToken() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?next=/admin");
  }

  try {
    const payload = await verifySessionToken(token);

    if (!canAccessAdmin(payload.role)) {
      redirect("/login?next=/admin");
    }

    return token;
  } catch {
    redirect("/login?next=/admin");
  }
}

async function callAdminApi(path: string, method: string, body?: unknown) {
  const token = await getAdminToken();

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await getResponseErrorMessage(response);
    throw new Error(message || `No se pudo completar la operación (${response.status}).`);
  }

  revalidatePath("/admin");
}

async function getResponseErrorMessage(response: Response) {
  const fallback = `No se pudo completar la operación (${response.status}).`;
  const raw = await response.text();

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(" ");
    }

    return parsed.message ?? parsed.error ?? fallback;
  } catch {
    return raw;
  }
}

function redirectWithMessage(
  kind: "success" | "error",
  message: string,
  returnTo?: string
) {
  const basePath = returnTo && returnTo.startsWith("/") ? returnTo : "/admin";
  redirect(`${basePath}?${kind}=${encodeURIComponent(message)}`);
}

export async function reviewKycAction(formData: FormData) {
  try {
    const verificationId = String(formData.get("verificationId"));
    const status = String(formData.get("status"));
    const rawNotes = formData.get("reviewerNotes");
    const reviewerNotes = rawNotes && String(rawNotes).trim() !== "" ? String(rawNotes) : undefined;
    const returnTo = String(formData.get("returnTo") ?? "/admin");

    await callAdminApi(`/kyc/verifications/${verificationId}/review`, "PATCH", {
      status,
      ...(reviewerNotes ? { reviewerNotes } : {})
    });
    redirectWithMessage("success", `KYC actualizado a ${status}.`, returnTo);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "No se pudo actualizar el KYC.",
      String(formData.get("returnTo") ?? "/admin")
    );
  }
}

export async function updateListingStatusAction(formData: FormData) {
  try {
    const listingId = String(formData.get("listingId"));
    const status = String(formData.get("status"));
    const returnTo = String(formData.get("returnTo") ?? "/admin");

    await callAdminApi(`/listings/${listingId}/status`, "PATCH", {
      status
    });
    redirectWithMessage("success", `Listing movido a ${status}.`, returnTo);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "No se pudo actualizar el listing.",
      String(formData.get("returnTo") ?? "/admin")
    );
  }
}

export async function runEscrowAction(formData: FormData) {
  try {
    const escrowId = String(formData.get("escrowId"));
    const action = String(formData.get("action"));
    const returnTo = String(formData.get("returnTo") ?? "/admin");

    if (action === "ship") {
      const trackingCode = String(formData.get("trackingCode"));

      await callAdminApi(`/escrows/${escrowId}/ship`, "PATCH", {
        trackingCode
      });
      redirectWithMessage("success", "Escrow marcado como enviado.", returnTo);
    }

    if (action === "confirm-delivery") {
      await callAdminApi(`/escrows/${escrowId}/confirm-delivery`, "PATCH");
      redirectWithMessage("success", "Entrega confirmada.", returnTo);
    }

    if (action === "release") {
      await callAdminApi(`/escrows/${escrowId}/release`, "PATCH");
      redirectWithMessage("success", "Fondos liberados.", returnTo);
    }

    if (action === "dispute") {
      const reason =
        String(formData.get("reason")) ||
        "Disputa abierta desde consola admin para revision operativa.";

      await callAdminApi(`/escrows/${escrowId}/dispute`, "PATCH", {
        reason
      });
      redirectWithMessage("success", "Disputa abierta correctamente.", returnTo);
    }

    redirectWithMessage("error", "Acción de escrow no reconocida.", returnTo);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "No se pudo operar el escrow.",
      String(formData.get("returnTo") ?? "/admin")
    );
  }
}

export async function approveSandboxPaymentAction(formData: FormData) {
  try {
    const paymentIntentId = String(formData.get("paymentIntentId"));
    const returnTo = String(formData.get("returnTo") ?? "/admin");

    await callAdminApi(`/payments/${paymentIntentId}/sandbox/approve`, "POST");
    redirectWithMessage("success", "Pago sandbox aprobado y fondos protegidos.", returnTo);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "No se pudo aprobar el pago sandbox.",
      String(formData.get("returnTo") ?? "/admin")
    );
  }
}

export async function updateUserStatusAction(formData: FormData) {
  try {
    const userId = String(formData.get("userId"));
    const status = String(formData.get("status"));
    const returnTo = String(formData.get("returnTo") ?? "/admin");

    await callAdminApi(`/users/${userId}/status`, "PATCH", { status });
    redirectWithMessage("success", `Usuario movido a ${status}.`, returnTo);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "No se pudo actualizar el estado del usuario.",
      String(formData.get("returnTo") ?? "/admin")
    );
  }
}

export async function updateUserRoleAction(formData: FormData) {
  try {
    const userId = String(formData.get("userId"));
    const role = String(formData.get("role"));
    const returnTo = String(formData.get("returnTo") ?? "/admin");

    await callAdminApi(`/users/${userId}/role`, "PATCH", { role });
    redirectWithMessage("success", `Rol del usuario cambiado a ${role}.`, returnTo);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "No se pudo actualizar el rol del usuario.",
      String(formData.get("returnTo") ?? "/admin")
    );
  }
}
