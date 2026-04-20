"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getSessionToken() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?next=/account");
  }

  try {
    const session = await verifySessionToken(token);
    return { token, session };
  } catch {
    redirect("/login?next=/account");
  }
}

async function getApiError(response: Response) {
  const raw = await response.text();

  if (!raw) {
    return `Operación rechazada (${response.status}).`;
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string | string[]; error?: string };
    return Array.isArray(parsed.message)
      ? parsed.message.join(" ")
      : parsed.message ?? parsed.error ?? raw;
  } catch {
    return raw;
  }
}

function redirectWithMessage(
  path: string,
  kind: "success" | "error",
  message: string
) {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

export async function createListingAction(formData: FormData) {
  const { token, session } = await getSessionToken();
  const returnTo = "/account/listings/new";
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();

  const response = await fetch(`${API_URL}/listings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sellerId: session.sub,
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      condition: formData.get("condition"),
      price: Number(formData.get("price")),
      currency: "ARS",
      locationProvince: formData.get("locationProvince"),
      locationCity: formData.get("locationCity"),
      status: "PUBLISHED",
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {})
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    redirectWithMessage(returnTo, "error", await getApiError(response));
  }

  const listing = (await response.json()) as { id: string };
  revalidatePath("/account");
  revalidatePath("/market");
  redirect(`/market/${listing.id}?success=${encodeURIComponent("Publicación creada correctamente.")}`);
}

export async function createKycVerificationAction(formData: FormData) {
  const { token, session } = await getSessionToken();
  const returnTo = "/account/kyc";

  const response = await fetch(`${API_URL}/kyc/verifications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      userId: session.sub,
      provider: "frontoffice",
      documentType: formData.get("documentType"),
      documentNumber: formData.get("documentNumber"),
      reviewerNotes: formData.get("reviewerNotes")
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    redirectWithMessage(returnTo, "error", await getApiError(response));
  }

  revalidatePath("/account");
  redirectWithMessage(returnTo, "success", "Verificación de identidad enviada a revisión.");
}

export async function updateOwnListingAction(formData: FormData) {
  const { token } = await getSessionToken();
  const listingId = String(formData.get("listingId"));
  const returnTo = `/account/listings/${listingId}`;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();

  const response = await fetch(`${API_URL}/listings/${listingId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      condition: formData.get("condition"),
      price: Number(formData.get("price")),
      currency: "ARS",
      locationProvince: formData.get("locationProvince"),
      locationCity: formData.get("locationCity"),
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {})
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    redirectWithMessage(returnTo, "error", await getApiError(response));
  }

  revalidatePath("/account");
  revalidatePath("/market");
  revalidatePath(`/market/${listingId}`);
  redirectWithMessage(returnTo, "success", "Publicación actualizada.");
}

export async function updateOwnListingStatusAction(formData: FormData) {
  const { token } = await getSessionToken();
  const listingId = String(formData.get("listingId"));
  const status = String(formData.get("status"));
  const returnTo = `/account/listings/${listingId}`;

  const response = await fetch(`${API_URL}/listings/${listingId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status }),
    cache: "no-store"
  });

  if (!response.ok) {
    redirectWithMessage(returnTo, "error", await getApiError(response));
  }

  revalidatePath("/account");
  revalidatePath("/market");
  revalidatePath(`/market/${listingId}`);
  redirectWithMessage(returnTo, "success", `Publicación movida a ${status}.`);
}

export async function createMeetingProposalAction(formData: FormData) {
  const { token } = await getSessionToken();
  const escrowId = String(formData.get("escrowId"));
  const returnTo = "/account";

  const response = await fetch(`${API_URL}/escrows/${escrowId}/meeting-proposals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      brand: formData.get("brand"),
      stationName: formData.get("stationName"),
      address: formData.get("address"),
      city: formData.get("city"),
      province: formData.get("province"),
      proposedAt: formData.get("proposedAt")
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    redirectWithMessage(returnTo, "error", await getApiError(response));
  }

  revalidatePath("/account");
  redirectWithMessage(returnTo, "success", "Encuentro seguro propuesto.");
}

export async function respondMeetingProposalAction(formData: FormData) {
  const { token } = await getSessionToken();
  const escrowId = String(formData.get("escrowId"));
  const proposalId = String(formData.get("proposalId"));
  const status = String(formData.get("status"));
  const returnTo = "/account";

  const response = await fetch(
    `${API_URL}/escrows/${escrowId}/meeting-proposals/${proposalId}/respond`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status,
        responseNote: formData.get("responseNote") || undefined
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    redirectWithMessage(returnTo, "error", await getApiError(response));
  }

  revalidatePath("/account");
  redirectWithMessage(
    returnTo,
    "success",
    status === "ACCEPTED" ? "Encuentro seguro aceptado." : "Encuentro seguro rechazado."
  );
}

export async function createAvailabilitySlotAction(formData: FormData) {
  const { token } = await getSessionToken();
  const escrowId = String(formData.get("escrowId"));
  const returnTo = "/account";

  const response = await fetch(`${API_URL}/escrows/${escrowId}/availability-slots`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt")
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    redirectWithMessage(returnTo, "error", await getApiError(response));
  }

  revalidatePath("/account");
  redirectWithMessage(returnTo, "success", "Disponibilidad publicada para el comprador.");
}

export async function selectAvailabilitySlotAction(formData: FormData) {
  const { token } = await getSessionToken();
  const escrowId = String(formData.get("escrowId"));
  const slotId = String(formData.get("slotId"));
  const returnTo = "/account";

  const response = await fetch(
    `${API_URL}/escrows/${escrowId}/availability-slots/${slotId}/select`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        note: formData.get("note") || undefined
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    redirectWithMessage(returnTo, "error", await getApiError(response));
  }

  revalidatePath("/account");
  redirectWithMessage(returnTo, "success", "Horario elegido. El vendedor fue notificado.");
}

export async function sendEscrowMessageAction(formData: FormData) {
  const { token } = await getSessionToken();
  const escrowId = String(formData.get("escrowId"));
  const returnTo = "/account";

  const response = await fetch(`${API_URL}/escrows/${escrowId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      body: formData.get("body")
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    redirectWithMessage(returnTo, "error", await getApiError(response));
  }

  revalidatePath("/account");
  redirectWithMessage(returnTo, "success", "Mensaje enviado.");
}
