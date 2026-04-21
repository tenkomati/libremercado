import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../lib/api";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";
import { formatCurrency, formatDate, formatDateTime } from "../../lib/format";

import { LogoutButton } from "../admin/logout-button";

import { AvailabilitySlotForm } from "./availability-slot-form";
import {
  createMeetingProposalAction,
  createDeliveryProposalAction,
  respondMeetingProposalAction,
  respondDeliveryProposalAction,
  selectAvailabilitySlotAction,
  sendEscrowMessageAction
} from "./actions";

export const dynamic = "force-dynamic";

type AccountPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

type MeetingProposal = {
  id: string;
  brand: "YPF" | "SHELL" | "AXION";
  stationName: string;
  address: string;
  city: string;
  province: string;
  proposedAt: string;
  status: string;
  responseNote: string | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

type MeetingSuggestion = {
  brand: "YPF" | "SHELL" | "AXION";
  stationName: string;
  address: string;
  city: string;
  province: string;
  source: "google_maps" | "fallback";
};

type DeliveryProposal = {
  id: string;
  method: "MESSAGING" | "COURIER" | "SAFE_MEETING" | "PICKUP";
  details: string | null;
  status: string;
  responseNote: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

type AvailabilitySlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  selectedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

type EscrowMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

type Notification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type AccountUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  province: string;
  city: string;
  status: string;
  role: string;
  kycStatus: string;
  reputationScore: string;
  listings: Array<{
    id: string;
    title: string;
    category: string;
    condition: string;
    status: string;
    price: string;
    locationCity: string;
    locationProvince: string;
    createdAt: string;
  }>;
  buyerEscrows: Array<{
    id: string;
    amount: string;
    status: string;
    createdAt: string;
    listing: { id: string; title: string };
    seller: { id: string; firstName: string; lastName: string };
    meetingProposals: MeetingProposal[];
    deliveryProposals: DeliveryProposal[];
    availabilitySlots: AvailabilitySlot[];
    messages: EscrowMessage[];
  }>;
  sellerEscrows: Array<{
    id: string;
    amount: string;
    status: string;
    createdAt: string;
    listing: { id: string; title: string };
    buyer: { id: string; firstName: string; lastName: string };
    meetingProposals: MeetingProposal[];
    deliveryProposals: DeliveryProposal[];
    availabilitySlots: AvailabilitySlot[];
    messages: EscrowMessage[];
  }>;
  kycVerifications: Array<{
    id: string;
    status: string;
    provider: string;
    documentType: string;
    createdAt: string;
    reviewerNotes: string | null;
  }>;
  notifications: Notification[];
};

async function getAccount() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?next=/account");
  }

  let session;

  try {
    session = await verifySessionToken(token);
  } catch {
    redirect("/login?next=/account");
  }

  const user = await apiFetchWithToken<AccountUser>(`/users/${session.sub}`, token);
  return { token, user };
}

async function getMeetingSuggestions(token: string, escrowId: string) {
  try {
    const response = await apiFetchWithToken<{ items: MeetingSuggestion[] }>(
      `/escrows/${escrowId}/meeting-suggestions`,
      token
    );
    return response.items;
  } catch {
    return [];
  }
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
      {label}
    </span>
  );
}

function getPaymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    CANCELLED: "Pago cancelado",
    DELIVERED: "Pago recibido",
    DISPUTED: "Pago retenido",
    FUNDS_HELD: "Pago recibido",
    FUNDS_PENDING: "Pago pendiente",
    REFUNDED: "Pago reembolsado",
    RELEASED: "Pago liberado",
    SHIPPED: "Pago recibido"
  };

  return labels[status] ?? status;
}

function getShippingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    CANCELLED: "Envío cancelado",
    DELIVERED: "Entregado",
    DISPUTED: "Entrega en revisión",
    FUNDS_HELD: "Pendiente de envío",
    FUNDS_PENDING: "Pendiente de pago",
    REFUNDED: "Sin envío activo",
    RELEASED: "Entregado",
    SHIPPED: "En camino"
  };

  return labels[status] ?? status;
}

function getDeliveryTypeLabel(status: string) {
  if (status === "FUNDS_HELD") {
    return "A coordinar";
  }

  if (status === "SHIPPED" || status === "DELIVERED" || status === "RELEASED") {
    return "Mensajería / correo";
  }

  if (status === "DISPUTED") {
    return "En revisión";
  }

  return "Pendiente";
}

function getDeliveryMethodLabel(method: DeliveryProposal["method"]) {
  const labels: Record<DeliveryProposal["method"], string> = {
    COURIER: "Correo / operador logístico",
    MESSAGING: "Mensajería privada",
    PICKUP: "Retiro acordado",
    SAFE_MEETING: "Encuentro seguro"
  };

  return labels[method];
}

function getAcceptedDeliveryProposal(proposals: DeliveryProposal[]) {
  return proposals.find((proposal) => proposal.status === "ACCEPTED");
}

function hasPendingProposalForUser(proposals: MeetingProposal[], currentUserId: string) {
  return proposals.some(
    (proposal) => proposal.status === "PENDING" && proposal.createdBy.id !== currentUserId
  );
}

function hasPendingDeliveryProposalForUser(
  proposals: DeliveryProposal[],
  currentUserId: string
) {
  return proposals.some(
    (proposal) => proposal.status === "PENDING" && proposal.createdBy.id !== currentUserId
  );
}

function getOpenSlots(slots: AvailabilitySlot[]) {
  return slots.filter((slot) => slot.status === "OPEN");
}

function MeetingPlanner({
  escrowId,
  currentUserId,
  role,
  proposals,
  suggestions,
  availabilitySlots,
  defaultCity,
  defaultProvince
}: {
  escrowId: string;
  currentUserId: string;
  role: "buyer" | "seller";
  proposals: MeetingProposal[];
  suggestions: MeetingSuggestion[];
  availabilitySlots: AvailabilitySlot[];
  defaultCity: string;
  defaultProvince: string;
}) {
  const openSlots = getOpenSlots(availabilitySlots);
  const canSuggestMeetingPlace = role === "seller";

  return (
    <div className="mt-4 rounded-[1.25rem] border border-[rgba(18,107,255,0.12)] bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--navy)]">Encuentro seguro</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          El vendedor propone franjas, el comprador elige una o responde con un
          mensaje. Recomendamos shops YPF, Shell o Axion en un punto intermedio.
        </p>
      </div>

      {canSuggestMeetingPlace && suggestions.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-[#f8fbff] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
            Puntos sugeridos
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {suggestions.map((suggestion, index) => (
              <article
                className="rounded-2xl border border-[var(--surface-border)] bg-white p-3"
                key={`${suggestion.brand}-${suggestion.stationName}-${index}`}
              >
                <p className="text-sm font-semibold text-[var(--navy)]">
                  {suggestion.brand} · {suggestion.stationName}
                </p>
                <p className="mt-1 min-h-10 text-xs leading-5 text-[var(--muted)]">
                  {suggestion.address}
                </p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                  {suggestion.source === "google_maps" ? "Google Maps" : "Fallback local"}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {availabilitySlots.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-[#f8fbff] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
            Franjas del vendedor
          </p>
          <div className="mt-3 grid gap-2">
            {availabilitySlots.map((slot) => (
              <article className="rounded-2xl bg-white p-3 text-sm" key={slot.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--navy)]">
                      {formatDateTime(slot.startsAt)} a {formatDateTime(slot.endsAt)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Creado por {slot.createdBy.firstName} {slot.createdBy.lastName}
                      {slot.selectedBy
                        ? ` · elegido por ${slot.selectedBy.firstName} ${slot.selectedBy.lastName}`
                        : ""}
                    </p>
                  </div>
                  <StatusPill label={slot.status} />
                </div>
                {role === "buyer" && slot.status === "OPEN" ? (
                  <form action={selectAvailabilitySlotAction} className="mt-3 flex flex-wrap gap-2">
                    <input name="escrowId" type="hidden" value={escrowId} />
                    <input name="slotId" type="hidden" value={slot.id} />
                    <input
                      className="min-w-44 flex-1 rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 text-xs"
                      name="note"
                      placeholder="Mensaje opcional para el vendedor"
                    />
                    <button className="rounded-full bg-[#059669] px-3 py-2 text-xs font-semibold text-white" type="submit">
                      Elegir horario
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {role === "seller" ? (
        <AvailabilitySlotForm escrowId={escrowId} />
      ) : openSlots.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-[#fff7ed] p-3 text-xs leading-5 text-[#92400e]">
          Todavía no hay franjas abiertas del vendedor. Podés escribirle para pedir
          alternativas.
        </p>
      ) : null}

      {proposals.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {proposals.map((proposal) => {
            const canRespond =
              proposal.status === "PENDING" && proposal.createdBy.id !== currentUserId;

            return (
              <article className="rounded-2xl bg-[#f8fbff] p-3 text-sm" key={proposal.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--navy)]">
                      {proposal.brand} · {proposal.stationName}
                    </p>
                    <p className="text-xs leading-5 text-[var(--muted)]">
                      {proposal.address}, {proposal.city}, {proposal.province}
                    </p>
                    <p className="text-xs leading-5 text-[var(--muted)]">
                      {formatDateTime(proposal.proposedAt)} · propuesto por{" "}
                      {proposal.createdBy.firstName} {proposal.createdBy.lastName}
                    </p>
                  </div>
                  <StatusPill label={proposal.status} />
                </div>

                {canRespond ? (
                  <form action={respondMeetingProposalAction} className="mt-3 flex flex-wrap gap-2">
                    <input name="escrowId" type="hidden" value={escrowId} />
                    <input name="proposalId" type="hidden" value={proposal.id} />
                    <input
                      className="min-w-44 flex-1 rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 text-xs"
                      name="responseNote"
                      placeholder="Nota opcional"
                    />
                    <button
                      className="rounded-full bg-[#059669] px-3 py-2 text-xs font-semibold text-white"
                      name="status"
                      type="submit"
                      value="ACCEPTED"
                    >
                      Aceptar
                    </button>
                    <button
                      className="rounded-full bg-[#dc2626] px-3 py-2 text-xs font-semibold text-white"
                      name="status"
                      type="submit"
                      value="DECLINED"
                    >
                      Rechazar
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {role === "seller" ? (
        <form action={createMeetingProposalAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="escrowId" type="hidden" value={escrowId} />
          <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
            Estación
            <select className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" name="brand" required>
              <option value="YPF">YPF</option>
              <option value="SHELL">Shell</option>
              <option value="AXION">Axion</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
            Fecha y hora
            <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" name="proposedAt" required type="datetime-local" />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
            Shop / sucursal
            <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" name="stationName" placeholder="Ej: YPF Panamericana km 32" required />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
            Dirección
            <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" name="address" placeholder="Av. / calle y altura" required />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
            Ciudad
            <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" defaultValue={defaultCity} name="city" required />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
            Provincia
            <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" defaultValue={defaultProvince} name="province" required />
          </label>
          <button className="rounded-full bg-[var(--navy)] px-4 py-3 text-sm font-semibold text-white md:col-span-2" type="submit">
            Proponer encuentro seguro
          </button>
        </form>
      ) : null}

    </div>
  );
}

function MessagesPanel({
  escrowId,
  messages
}: {
  escrowId: string;
  messages: EscrowMessage[];
}) {
  return (
    <div className="rounded-2xl bg-[#f8fbff] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
        Mensajes de coordinación
      </p>
      {messages.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {messages.map((message) => (
            <article className="rounded-2xl bg-white p-3 text-xs" key={message.id}>
              <p className="font-semibold text-[var(--navy)]">
                {message.sender.firstName} {message.sender.lastName}
              </p>
              <p className="mt-1 leading-5 text-[var(--muted)]">{message.body}</p>
              <p className="mt-2 text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                {formatDateTime(message.createdAt)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--muted)]">Aún no hay mensajes.</p>
      )}
      <form action={sendEscrowMessageAction} className="mt-3 flex flex-wrap gap-2">
        <input name="escrowId" type="hidden" value={escrowId} />
        <input
          className="min-w-52 flex-1 rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 text-xs"
          name="body"
          placeholder="Ej: No llego a ese horario, puedo 30 minutos después."
          required
        />
        <button className="rounded-full bg-[var(--navy)] px-3 py-2 text-xs font-semibold text-white" type="submit">
          Enviar
        </button>
      </form>
    </div>
  );
}

function DeliveryProposalPanel({
  escrowId,
  currentUserId,
  role,
  proposals
}: {
  escrowId: string;
  currentUserId: string;
  role: "buyer" | "seller";
  proposals: DeliveryProposal[];
}) {
  return (
    <div className="mt-4 rounded-2xl bg-[#f8fbff] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
        Método de envío
      </p>

      {proposals.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {proposals.map((proposal) => {
            const canRespond =
              proposal.status === "PENDING" && proposal.createdBy.id !== currentUserId;

            return (
              <article className="rounded-2xl bg-white p-3 text-sm" key={proposal.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--navy)]">
                      {getDeliveryMethodLabel(proposal.method)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      {proposal.details ?? "Sin detalle adicional."} · propuesto por{" "}
                      {proposal.createdBy.firstName} {proposal.createdBy.lastName}
                    </p>
                  </div>
                  <StatusPill label={proposal.status} />
                </div>

                {canRespond ? (
                  <form action={respondDeliveryProposalAction} className="mt-3 flex flex-wrap gap-2">
                    <input name="escrowId" type="hidden" value={escrowId} />
                    <input name="proposalId" type="hidden" value={proposal.id} />
                    <input
                      className="min-w-44 flex-1 rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 text-xs"
                      name="responseNote"
                      placeholder="Nota opcional"
                    />
                    <button
                      className="rounded-full bg-[#059669] px-3 py-2 text-xs font-semibold text-white"
                      name="status"
                      type="submit"
                      value="ACCEPTED"
                    >
                      Aceptar
                    </button>
                    <button
                      className="rounded-full bg-[#dc2626] px-3 py-2 text-xs font-semibold text-white"
                      name="status"
                      type="submit"
                      value="DECLINED"
                    >
                      Rechazar
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Todavía no hay método de envío propuesto.
        </p>
      )}

      {role === "seller" ? (
        <form action={createDeliveryProposalAction} className="mt-4 grid gap-3 rounded-2xl bg-white p-3 md:grid-cols-2">
          <input name="escrowId" type="hidden" value={escrowId} />
          <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
            Proponer método
            <select className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" name="method" required>
              <option value="SAFE_MEETING">Encuentro seguro</option>
              <option value="MESSAGING">Mensajería privada</option>
              <option value="COURIER">Correo / operador logístico</option>
              <option value="PICKUP">Retiro acordado</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
            Detalle
            <input
              className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2"
              name="details"
              placeholder="Ej: Correo Argentino a sucursal o YPF Full de la zona"
            />
          </label>
          <button className="rounded-full bg-[var(--navy)] px-4 py-3 text-sm font-semibold text-white md:col-span-2" type="submit">
            Proponer método de envío
          </button>
        </form>
      ) : null}
    </div>
  );
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [{ token, user }, params] = await Promise.all([
    getAccount(),
    (searchParams ?? Promise.resolve({})) as Promise<{
      success?: string;
      error?: string;
    }>
  ]);
  const activeMeetingStatuses = ["FUNDS_HELD", "SHIPPED", "DELIVERED"];
  const pendingActions = [
    ...(user.kycStatus === "APPROVED"
      ? []
      : [
          {
            href: "/account/kyc",
            label: "Completar verificación de identidad",
            detail: "Necesaria para publicar y operar con compra protegida."
          }
        ]),
    ...user.buyerEscrows.flatMap((escrow) => {
      const actions = [];

      if (getOpenSlots(escrow.availabilitySlots).length > 0) {
        actions.push({
          href: `#purchase-${escrow.id}`,
          label: `Elegir horario para ${escrow.listing.title}`,
          detail: "El vendedor publicó franjas disponibles."
        });
      }

      if (hasPendingProposalForUser(escrow.meetingProposals, user.id)) {
        actions.push({
          href: `#purchase-${escrow.id}`,
          label: `Responder propuesta de encuentro para ${escrow.listing.title}`,
          detail: "Hay una propuesta esperando tu respuesta."
        });
      }

      if (hasPendingDeliveryProposalForUser(escrow.deliveryProposals, user.id)) {
        actions.push({
          href: `#purchase-${escrow.id}`,
          label: `Responder método de envío para ${escrow.listing.title}`,
          detail: "El vendedor propuso una forma de entrega."
        });
      }

      return actions;
    }),
    ...user.sellerEscrows.flatMap((escrow) => {
      const actions = [];

      if (
        activeMeetingStatuses.includes(escrow.status) &&
        getOpenSlots(escrow.availabilitySlots).length === 0
      ) {
        actions.push({
          href: `#sale-${escrow.id}`,
          label: `Publicar horarios para ${escrow.listing.title}`,
          detail: "El comprador necesita opciones para coordinar entrega."
        });
      }

      if (hasPendingProposalForUser(escrow.meetingProposals, user.id)) {
        actions.push({
          href: `#sale-${escrow.id}`,
          label: `Responder propuesta de encuentro para ${escrow.listing.title}`,
          detail: "Hay una propuesta esperando tu respuesta."
        });
      }

      if (hasPendingDeliveryProposalForUser(escrow.deliveryProposals, user.id)) {
        actions.push({
          href: `#sale-${escrow.id}`,
          label: `Responder método de envío para ${escrow.listing.title}`,
          detail: "Hay una forma de entrega esperando tu respuesta."
        });
      }

      return actions;
    })
  ];
  const escrowIds = user.sellerEscrows.map((escrow) => escrow.id);
  const suggestionEntries = await Promise.all(
    escrowIds.map(async (escrowId) => [
      escrowId,
      await getMeetingSuggestions(token, escrowId)
    ] as const)
  );
  const suggestionsByEscrowId = Object.fromEntries(suggestionEntries);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      <section className="rounded-[2rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#082247,#0d3270)] p-8 text-white shadow-[0_22px_80px_rgba(8,34,71,0.24)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
              Mi cuenta
            </span>
            <h1
              className="mt-4 text-5xl font-semibold tracking-[-0.04em]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Hola, {user.firstName}. Tu operación protegida vive acá.
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-white/70">
              Revisá compras, ventas, publicaciones y estado de identidad antes
              de operar con pago protegido.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/market" className="rounded-full border border-white/15 bg-white/10 px-5 py-3 font-semibold">
              Ver market
            </Link>
            <LogoutButton />
            <Link href="/account/listings/new" className="rounded-full border border-white bg-white px-5 py-3 font-semibold text-[#082247] shadow-sm">
              Publicar producto
            </Link>
          </div>
        </div>
      </section>

      {params.success ? (
        <div className="mt-6 rounded-[1.5rem] border border-[rgba(5,150,105,0.18)] bg-[rgba(5,150,105,0.08)] px-5 py-4 text-sm font-medium text-[#065f46]">
          {params.success}
        </div>
      ) : null}

      {params.error ? (
        <div className="mt-6 rounded-[1.5rem] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.08)] px-5 py-4 text-sm font-medium text-[#991b1b]">
          {params.error}
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Perfil</h2>
            <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
              <p className="text-lg font-semibold text-[var(--navy)]">
                {user.firstName} {user.lastName}
              </p>
              <p>{user.email}</p>
              <p>{user.city}, {user.province}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <StatusPill label={user.status} />
                <StatusPill label={`Identidad ${user.kycStatus}`} />
                <StatusPill label={`score ${user.reputationScore}`} />
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#f8fbff,#eaf2ff)] p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Próximas acciones</h2>
            <div className="mt-5 grid gap-3">
              {pendingActions.map((action) => (
                <Link
                  href={action.href}
                  className="rounded-[1.25rem] bg-white px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:shadow-[0_12px_30px_rgba(8,34,71,0.08)]"
                  key={`${action.href}-${action.label}`}
                >
                  {action.label}
                  <span className="mt-1 block text-xs font-normal leading-5 text-[var(--muted)]">
                    {action.detail}
                  </span>
                </Link>
              ))}
              {pendingActions.length === 0 ? (
                <p className="rounded-[1.25rem] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  No tenés acciones pendientes ahora.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Notificaciones</h2>
              <span className="text-sm text-[var(--muted)]">{user.notifications.length}</span>
            </div>
            <div className="mt-4 grid gap-3">
              {user.notifications.map((notification) => (
                <article
                  className="rounded-[1.25rem] border border-[rgba(18,107,255,0.12)] bg-[#f8fbff] p-4"
                  key={notification.id}
                >
                  <p className="text-sm font-semibold text-[var(--navy)]">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {notification.body}
                  </p>
                  <p className="mt-2 text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </article>
              ))}
              {user.notifications.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No hay novedades por ahora.</p>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Mis publicaciones</h2>
              <span className="text-sm text-[var(--muted)]">{user.listings.length}</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {user.listings.map((listing) => (
                <Link
                  className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4 transition hover:border-[rgba(18,107,255,0.2)]"
                  href={`/account/listings/${listing.id}`}
                  key={listing.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-[var(--navy)]">{listing.title}</p>
                    <StatusPill label={listing.status} />
                  </div>
                  <p className="mt-3 text-xl font-semibold text-[var(--brand-strong)]">
                    {formatCurrency(listing.price)}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {listing.category} · {listing.condition} · {formatDate(listing.createdAt)}
                  </p>
                </Link>
              ))}
              {user.listings.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Todavía no publicaste productos.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Mis compras</h2>
            <div className="mt-5 grid gap-3">
              {user.buyerEscrows.map((escrow) => {
                const acceptedDelivery = getAcceptedDeliveryProposal(escrow.deliveryProposals);

                return (
                <details
                  className="group rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4"
                  id={`purchase-${escrow.id}`}
                  key={escrow.id}
                >
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--navy)]">{escrow.listing.title}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Tocá para ver detalle de producto, envío y mensajes.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-right">
                      <StatusPill label={getPaymentStatusLabel(escrow.status)} />
                      <StatusPill label={getShippingStatusLabel(escrow.status)} />
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-4">
                    <section className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                        Información del producto
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-[var(--muted)] md:grid-cols-2">
                        <p>
                          <span className="font-semibold text-[var(--navy)]">Producto:</span>{" "}
                          {escrow.listing.title}
                        </p>
                        <p>
                          <span className="font-semibold text-[var(--navy)]">ID vendedor:</span>{" "}
                          {escrow.seller.id}
                        </p>
                        <p>
                          <span className="font-semibold text-[var(--navy)]">Vendedor:</span>{" "}
                          {escrow.seller.firstName} {escrow.seller.lastName}
                        </p>
                        <p>
                          <span className="font-semibold text-[var(--navy)]">Precio:</span>{" "}
                          {formatCurrency(escrow.amount)}
                        </p>
                        <p>
                          <span className="font-semibold text-[var(--navy)]">Forma de pago:</span>{" "}
                          Compra protegida
                        </p>
                        <p>
                          <span className="font-semibold text-[var(--navy)]">Estado del pago:</span>{" "}
                          {getPaymentStatusLabel(escrow.status)}
                        </p>
                      </div>
                    </section>

                    <section className="rounded-2xl bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                            Información del envío
                          </p>
                          <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
                            <p>
                              <span className="font-semibold text-[var(--navy)]">Tipo pactado:</span>{" "}
                              {acceptedDelivery
                                ? getDeliveryMethodLabel(acceptedDelivery.method)
                                : getDeliveryTypeLabel(escrow.status)}
                            </p>
                            <p>
                              <span className="font-semibold text-[var(--navy)]">Estado:</span>{" "}
                              {getShippingStatusLabel(escrow.status)}
                            </p>
                          </div>
                        </div>
                        <form action={sendEscrowMessageAction}>
                          <input name="escrowId" type="hidden" value={escrow.id} />
                          <input
                            name="body"
                            type="hidden"
                            value="Solicito cambiar el tipo de envío o recoordinar la entrega."
                          />
                          <button className="rounded-full border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-2 text-xs font-semibold text-[var(--navy)]" type="submit">
                            Solicitar cambio
                          </button>
                        </form>
                      </div>

                      <DeliveryProposalPanel
                        currentUserId={user.id}
                        escrowId={escrow.id}
                        proposals={escrow.deliveryProposals}
                        role="buyer"
                      />

                      <MeetingPlanner
                        currentUserId={user.id}
                        defaultCity={user.city}
                        defaultProvince={user.province}
                        escrowId={escrow.id}
                        role="buyer"
                        proposals={escrow.meetingProposals}
                        suggestions={[]}
                        availabilitySlots={escrow.availabilitySlots}
                      />
                    </section>

                    <section className="rounded-2xl bg-white p-4">
                      <MessagesPanel escrowId={escrow.id} messages={escrow.messages} />
                    </section>
                  </div>
                </details>
                );
              })}
              {user.buyerEscrows.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Todavía no tenés compras protegidas.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Mis ventas</h2>
            <div className="mt-5 grid gap-3">
              {user.sellerEscrows.map((escrow) => {
                const acceptedDelivery = getAcceptedDeliveryProposal(escrow.deliveryProposals);

                return (
                  <details
                    className="group rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4"
                    id={`sale-${escrow.id}`}
                    key={escrow.id}
                  >
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--navy)]">{escrow.listing.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Tocá para ver detalle de producto, envío y mensajes.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-right">
                        <StatusPill label={getPaymentStatusLabel(escrow.status)} />
                        <StatusPill label={getShippingStatusLabel(escrow.status)} />
                      </div>
                    </summary>

                    <div className="mt-4 grid gap-4">
                      <section className="rounded-2xl bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                          Información del producto
                        </p>
                        <div className="mt-3 grid gap-2 text-sm text-[var(--muted)] md:grid-cols-2">
                          <p>
                            <span className="font-semibold text-[var(--navy)]">Producto:</span>{" "}
                            {escrow.listing.title}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--navy)]">ID comprador:</span>{" "}
                            {escrow.buyer.id}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--navy)]">Comprador:</span>{" "}
                            {escrow.buyer.firstName} {escrow.buyer.lastName}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--navy)]">Precio:</span>{" "}
                            {formatCurrency(escrow.amount)}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--navy)]">Forma de cobro:</span>{" "}
                            Compra protegida
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--navy)]">Estado del pago:</span>{" "}
                            {getPaymentStatusLabel(escrow.status)}
                          </p>
                        </div>
                      </section>

                      <section className="rounded-2xl bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                          Información del envío
                        </p>
                        <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
                          <p>
                            <span className="font-semibold text-[var(--navy)]">Tipo pactado:</span>{" "}
                            {acceptedDelivery
                              ? getDeliveryMethodLabel(acceptedDelivery.method)
                              : getDeliveryTypeLabel(escrow.status)}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--navy)]">Estado:</span>{" "}
                            {getShippingStatusLabel(escrow.status)}
                          </p>
                        </div>

                        <DeliveryProposalPanel
                          currentUserId={user.id}
                          escrowId={escrow.id}
                          proposals={escrow.deliveryProposals}
                          role="seller"
                        />

                        <MeetingPlanner
                          currentUserId={user.id}
                          defaultCity={user.city}
                          defaultProvince={user.province}
                          escrowId={escrow.id}
                          role="seller"
                          proposals={escrow.meetingProposals}
                          suggestions={suggestionsByEscrowId[escrow.id] ?? []}
                          availabilitySlots={escrow.availabilitySlots}
                        />
                      </section>

                      <section className="rounded-2xl bg-white p-4">
                        <MessagesPanel escrowId={escrow.id} messages={escrow.messages} />
                      </section>
                    </div>
                  </details>
                );
              })}
              {user.sellerEscrows.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Todavía no tenés ventas protegidas.</p>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
