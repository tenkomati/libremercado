import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../../../lib/api";
import { canAccessAdmin, verifySessionToken } from "../../../../lib/auth";
import { formatCurrency, formatDate } from "../../../../lib/format";

import { approveSandboxPaymentAction, runEscrowAction } from "../../actions";
import { ConfirmForm, SubmitButton } from "../../form-controls";

type EscrowDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

type EscrowEvent = {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

type EscrowDetail = {
  id: string;
  status: string;
  amount: string;
  feeAmount: string;
  netAmount: string;
  isInsured: boolean;
  insuranceFee: string;
  currency: "ARS" | "USD";
  shippingProvider: string;
  shippingTrackingCode: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  releaseEligibleAt: string | null;
  releasedAt: string | null;
  disputeReason: string | null;
  listing: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    locationCity: string;
    locationProvince: string;
  };
  buyer: {
    firstName: string;
    lastName: string;
    email: string;
    city: string;
    province: string;
    kycStatus: string;
  };
  seller: {
    firstName: string;
    lastName: string;
    email: string;
    city: string;
    province: string;
    kycStatus: string;
  };
  events: EscrowEvent[];
  paymentIntents: Array<{
    id: string;
    provider: string;
    status: string;
    amount: string;
    feeAmount: string;
    netAmount: string;
    currency: "ARS" | "USD";
    checkoutUrl: string | null;
    providerPaymentId: string | null;
    providerPreferenceId: string | null;
    providerStatus: string | null;
    approvedAt: string | null;
    fundsHeldAt: string | null;
    releasedAt: string | null;
    createdAt: string;
    events: Array<{
      id: string;
      status: string;
      provider: string;
      providerEventId: string | null;
      createdAt: string;
    }>;
  }>;
  insurancePolicy: {
    id: string;
    status: string;
    policyUrl: string;
    externalPolicyId: string;
    premiumAmount: string;
    coverageAmount: string;
    provider: {
      id: string;
      name: string;
    };
  } | null;
};

type AuditLog = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  actorRole: string;
  actor: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

type PaginatedResponse<T> = {
  items: T[];
};

export default async function EscrowDetailPage({
  params,
  searchParams
}: EscrowDetailPageProps) {
  const token = (await cookies()).get("libremercado_admin_token")?.value;

  if (!token) {
    redirect("/login?next=/admin");
  }

  let session;

  try {
    session = await verifySessionToken(token);
  } catch {
    redirect("/login?next=/admin");
  }

  if (!canAccessAdmin(session.role)) {
    redirect("/login?next=/admin");
  }

  const { id } = await params;
  const currentPath = `/admin/escrows/${id}`;
  const resolvedSearchParams = (await searchParams) ?? {};

  const [escrow, auditLogs] = await Promise.all([
    apiFetchWithToken<EscrowDetail>(`/escrows/${id}`, token),
    apiFetchWithToken<PaginatedResponse<AuditLog>>(
      `/admin/audit-logs?resourceType=escrow&q=${encodeURIComponent(id)}&pageSize=50`,
      token
    )
  ]);

  const escrowAuditLogs = auditLogs.items.filter(
    (log) => log.resourceType === "escrow" && log.resourceId === id
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin"
          className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold"
        >
          Volver a admin
        </Link>
        <Link
          href="/market"
          className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold"
        >
          Ver market
        </Link>
      </div>

      {resolvedSearchParams.success ? (
        <div className="mt-6 rounded-[1.5rem] border border-[rgba(5,150,105,0.18)] bg-[rgba(5,150,105,0.08)] px-5 py-4 text-sm font-medium text-[#065f46]">
          {resolvedSearchParams.success}
        </div>
      ) : null}

      {resolvedSearchParams.error ? (
        <div className="mt-6 rounded-[1.5rem] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.08)] px-5 py-4 text-sm font-medium text-[#991b1b]">
          {resolvedSearchParams.error}
        </div>
      ) : null}

      <section className="mt-6 rounded-[2rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#082247,#0d3270)] p-8 text-white shadow-[0_22px_80px_rgba(8,34,71,0.24)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
              Escrow detail
            </span>
            <h1
              className="text-5xl font-semibold tracking-[-0.04em]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {escrow.listing.title}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-white/70">
              {escrow.buyer.firstName} {escrow.buyer.lastName} →{" "}
              {escrow.seller.firstName} {escrow.seller.lastName}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-white/60">Estado actual</p>
            <p className="mt-2 text-3xl font-semibold">{escrow.status}</p>
            <p className="mt-2 text-lg text-white/80">{formatCurrency(escrow.amount, escrow.currency)}</p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Resumen financiero</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.25rem] bg-[#f8fbff] p-4">
                <p className="text-sm text-[var(--muted)]">Monto</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--navy)]">
                  {formatCurrency(escrow.amount, escrow.currency)}
                </p>
              </div>
              <div className="rounded-[1.25rem] bg-[#f8fbff] p-4">
                <p className="text-sm text-[var(--muted)]">Fee</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--navy)]">
                  {formatCurrency(escrow.feeAmount, escrow.currency)}
                </p>
              </div>
              <div className="rounded-[1.25rem] bg-[#f8fbff] p-4">
                <p className="text-sm text-[var(--muted)]">Neto vendedor</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--navy)]">
                  {formatCurrency(escrow.netAmount, escrow.currency)}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-[1.25rem] bg-[#f8fbff] p-4 text-sm text-[var(--navy)]">
              <p>
                <span className="font-semibold">Micro-seguro:</span>{" "}
                {escrow.isInsured ? "Sí" : "No"}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Prima:</span>{" "}
                {formatCurrency(escrow.insuranceFee, escrow.currency)}
              </p>
            </div>
          </div>

          {escrow.insurancePolicy ? (
            <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Seguro embebido</h2>
              <div className="mt-5 rounded-[1.25rem] bg-[#f0fdf4] p-4 text-sm text-[#065f46]">
                <p className="font-semibold">
                  {escrow.insurancePolicy.provider.name} · {escrow.insurancePolicy.status}
                </p>
                <p className="mt-2">
                  Prima: {formatCurrency(escrow.insurancePolicy.premiumAmount, escrow.currency)}
                </p>
                <p className="mt-1">
                  Cobertura: {formatCurrency(escrow.insurancePolicy.coverageAmount, escrow.currency)}
                </p>
                <p className="mt-1">ID externo: {escrow.insurancePolicy.externalPolicyId}</p>
                <a
                  className="mt-3 inline-flex font-semibold underline"
                  href={escrow.insurancePolicy.policyUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Abrir póliza
                </a>
                <Link
                  className="mt-3 inline-flex font-semibold underline"
                  href={`/admin/insurance/${escrow.insurancePolicy.id}`}
                >
                  Operar desde admin
                </Link>
              </div>
            </div>
          ) : null}

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--navy)]">Pagos</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Adapter neutral listo para sandbox, Mercado Pago o Mobbex.
                </p>
              </div>
              <span className="text-sm text-[var(--muted)]">
                {escrow.paymentIntents.length} intentos
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {escrow.paymentIntents.map((paymentIntent) => (
                <article
                  className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4"
                  key={paymentIntent.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--navy)]">
                        {paymentIntent.provider} · {paymentIntent.status}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Preference: {paymentIntent.providerPreferenceId ?? "Sin preference"}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        Payment: {paymentIntent.providerPaymentId ?? "Pendiente"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--navy)]">
                        {formatCurrency(paymentIntent.amount, paymentIntent.currency)}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        {formatDate(paymentIntent.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-[var(--muted)] md:grid-cols-3">
                    <p>Fee: {formatCurrency(paymentIntent.feeAmount, paymentIntent.currency)}</p>
                    <p>Neto: {formatCurrency(paymentIntent.netAmount, paymentIntent.currency)}</p>
                    <p>Aprobado: {formatDate(paymentIntent.approvedAt)}</p>
                  </div>

                  {paymentIntent.provider === "SANDBOX" &&
                  paymentIntent.status === "PAYMENT_PENDING" ? (
                    <ConfirmForm action={approveSandboxPaymentAction} className="mt-4">
                      <input name="paymentIntentId" type="hidden" value={paymentIntent.id} />
                      <input name="returnTo" type="hidden" value={currentPath} />
                      <SubmitButton
                        className="rounded-full bg-[#059669] px-4 py-2 text-xs font-semibold text-white"
                        confirmMessage="¿Simular aprobación del pago sandbox y mover el escrow a fondos protegidos?"
                        pendingLabel="Aprobando..."
                      >
                        Simular pago aprobado
                      </SubmitButton>
                    </ConfirmForm>
                  ) : null}

                  {paymentIntent.events.length > 0 ? (
                    <div className="mt-4 rounded-2xl bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        Eventos de pago
                      </p>
                      <div className="mt-2 grid gap-2">
                        {paymentIntent.events.map((event) => (
                          <p className="text-xs text-[var(--muted)]" key={event.id}>
                            {formatDate(event.createdAt)} · {event.provider} · {event.status}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
              {escrow.paymentIntents.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Este escrow todavía no tiene intención de pago asociada.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Timeline</h2>
            <div className="mt-5 grid gap-3">
              {escrow.events.map((event) => (
                <article
                  key={event.id}
                  className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-[var(--navy)]">{event.type}</p>
                    <p className="text-sm text-[var(--muted)]">{formatDate(event.createdAt)}</p>
                  </div>
                  {event.payload ? (
                    <pre className="mt-3 overflow-x-auto rounded-2xl bg-white p-3 text-xs text-[var(--muted)]">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Auditoria</h2>
              <span className="text-sm text-[var(--muted)]">
                {escrowAuditLogs.length} eventos
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {escrowAuditLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--navy)]">{log.action}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {log.actor.firstName} {log.actor.lastName} · {log.actorRole}
                      </p>
                    </div>
                    <p className="text-sm text-[var(--muted)]">{formatDate(log.createdAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Partes</h2>
            <div className="mt-5 grid gap-4">
              <div className="rounded-[1.25rem] bg-[#f8fbff] p-4">
                <p className="text-sm text-[var(--muted)]">Comprador</p>
                <p className="mt-2 font-semibold text-[var(--navy)]">
                  {escrow.buyer.firstName} {escrow.buyer.lastName}
                </p>
                <p className="text-sm text-[var(--muted)]">{escrow.buyer.email}</p>
                <p className="text-sm text-[var(--muted)]">
                  {escrow.buyer.city}, {escrow.buyer.province}
                </p>
              </div>
              <div className="rounded-[1.25rem] bg-[#f8fbff] p-4">
                <p className="text-sm text-[var(--muted)]">Vendedor</p>
                <p className="mt-2 font-semibold text-[var(--navy)]">
                  {escrow.seller.firstName} {escrow.seller.lastName}
                </p>
                <p className="text-sm text-[var(--muted)]">{escrow.seller.email}</p>
                <p className="text-sm text-[var(--muted)]">
                  {escrow.seller.city}, {escrow.seller.province}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Logistica y accion</h2>
            <div className="mt-5 grid gap-3 text-sm text-[var(--muted)]">
              <p>Carrier: {escrow.shippingProvider}</p>
              <p>Tracking: {escrow.shippingTrackingCode ?? "Pendiente"}</p>
              <p>Shipped at: {formatDate(escrow.shippedAt)}</p>
              <p>Delivered at: {formatDate(escrow.deliveredAt)}</p>
              <p>Release eligible: {formatDate(escrow.releaseEligibleAt)}</p>
              {escrow.disputeReason ? <p>Dispute: {escrow.disputeReason}</p> : null}
            </div>

            <ConfirmForm action={runEscrowAction} className="mt-6 flex flex-wrap gap-2">
              <input name="escrowId" type="hidden" value={escrow.id} />
              <input name="returnTo" type="hidden" value={currentPath} />
              {escrow.status === "FUNDS_HELD" ? (
                <>
                  <input
                    className="rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 text-xs"
                    defaultValue={escrow.shippingTrackingCode ?? "LM-TRACK-NEW"}
                    name="trackingCode"
                  />
                  <SubmitButton
                    className="rounded-full bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white"
                    confirmMessage="¿Marcar este escrow como enviado?"
                    name="action"
                    pendingLabel="Enviando..."
                    value="ship"
                  >
                    Marcar enviado
                  </SubmitButton>
                </>
              ) : null}
              {escrow.status === "SHIPPED" ? (
                <SubmitButton
                  className="rounded-full bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white"
                  confirmMessage="¿Confirmar entrega de este escrow?"
                  name="action"
                  pendingLabel="Confirmando..."
                  value="confirm-delivery"
                >
                  Confirmar entrega
                </SubmitButton>
              ) : null}
              {escrow.status === "DELIVERED" ? (
                <SubmitButton
                  className="rounded-full bg-[#059669] px-3 py-2 text-xs font-semibold text-white"
                  confirmMessage="¿Liberar los fondos al vendedor?"
                  name="action"
                  pendingLabel="Liberando..."
                  value="release"
                >
                  Liberar fondos
                </SubmitButton>
              ) : null}
              {escrow.status !== "DISPUTED" &&
              escrow.status !== "RELEASED" &&
              escrow.status !== "REFUNDED" &&
              escrow.status !== "CANCELLED" ? (
                <>
                  <input
                    className="min-w-56 flex-1 rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 text-xs"
                    defaultValue="Disputa abierta desde consola admin para revision operativa."
                    name="reason"
                  />
                  <SubmitButton
                    className="rounded-full bg-[#dc2626] px-3 py-2 text-xs font-semibold text-white"
                    confirmMessage="¿Abrir una disputa para este escrow?"
                    name="action"
                    pendingLabel="Abriendo..."
                    value="dispute"
                  >
                    Abrir disputa
                  </SubmitButton>
                </>
              ) : null}
              {["FUNDS_PENDING", "FUNDS_HELD"].includes(escrow.status) ? (
                <>
                  <input
                    className="min-w-56 flex-1 rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 text-xs"
                    defaultValue="Cancelación operativa con reembolso controlado."
                    name="reason"
                  />
                  <SubmitButton
                    className="rounded-full bg-[#7f1d1d] px-3 py-2 text-xs font-semibold text-white"
                    confirmMessage="¿Cancelar esta operación y registrar reembolso si corresponde?"
                    name="action"
                    pendingLabel="Cancelando..."
                    value="cancel"
                  >
                    Cancelar y reembolsar
                  </SubmitButton>
                </>
              ) : null}
            </ConfirmForm>

            {escrow.status === "DISPUTED" ? (
              <div className="mt-5 rounded-[1.25rem] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.06)] p-4">
                <p className="text-sm font-semibold text-[#991b1b]">
                  Resolución operativa de disputa
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Elegí si corresponde liberar los fondos al vendedor o reembolsar al comprador.
                  Esta acción cierra la operación y notifica a ambas partes.
                </p>
                <ConfirmForm action={runEscrowAction} className="mt-4 grid gap-3">
                  <input name="escrowId" type="hidden" value={escrow.id} />
                  <input name="returnTo" type="hidden" value={currentPath} />
                  <select
                    className="rounded-2xl border border-[var(--surface-border)] bg-white px-3 py-3 text-sm"
                    name="outcome"
                    defaultValue="BUYER_REFUND"
                  >
                    <option value="BUYER_REFUND">Resolver a favor del comprador: reembolsar</option>
                    <option value="SELLER_RELEASE">
                      Resolver a favor del vendedor: liberar fondos
                    </option>
                  </select>
                  <textarea
                    className="min-h-28 rounded-2xl border border-[var(--surface-border)] bg-white px-3 py-3 text-sm"
                    defaultValue="Resolución operativa de soporte luego de revisar evidencia, mensajes y trazabilidad de la operación."
                    name="resolutionReason"
                  />
                  <SubmitButton
                    className="w-fit rounded-full bg-[#7f1d1d] px-4 py-2 text-xs font-semibold text-white"
                    confirmMessage="¿Resolver definitivamente esta disputa?"
                    name="action"
                    pendingLabel="Resolviendo..."
                    value="resolve-dispute"
                  >
                    Resolver disputa
                  </SubmitButton>
                </ConfirmForm>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
