import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../../../lib/api";
import { canAccessAdmin, verifySessionToken } from "../../../../lib/auth";
import { formatCurrency, formatDate } from "../../../../lib/format";

import { updateInsurancePolicyStatusAction } from "../../actions";
import { ConfirmForm, SubmitButton } from "../../form-controls";

type InsurancePolicyDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

type InsurancePolicyDetail = {
  id: string;
  status: string;
  externalPolicyId: string;
  premiumAmount: string;
  coverageAmount: string;
  policyUrl: string;
  rawPayload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  provider: {
    id: string;
    name: string;
    endpointApi: string;
  };
  escrow: {
    id: string;
    status: string;
    amount: string;
    currency: "ARS" | "USD";
    isInsured: boolean;
    insuranceFee: string;
    listing: {
      id: string;
      title: string;
      category: string;
      status: string;
    };
    buyer: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      kycStatus: string;
    };
    seller: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      kycStatus: string;
    };
    paymentIntents: Array<{
      id: string;
      provider: string;
      status: string;
      amount: string;
      currency: "ARS" | "USD";
      providerPaymentId: string | null;
      providerPreferenceId: string | null;
      approvedAt: string | null;
      fundsHeldAt: string | null;
      createdAt: string;
    }>;
  };
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

export default async function InsurancePolicyDetailPage({
  params,
  searchParams
}: InsurancePolicyDetailPageProps) {
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
  const currentPath = `/admin/insurance/${id}`;
  const resolvedSearchParams = (await searchParams) ?? {};

  const [policy, auditLogs] = await Promise.all([
    apiFetchWithToken<InsurancePolicyDetail>(`/insurance/policies/${id}`, token),
    apiFetchWithToken<PaginatedResponse<AuditLog>>(
      `/admin/audit-logs?resourceType=insurance_policy&q=${encodeURIComponent(id)}&pageSize=50`,
      token
    )
  ]);

  const policyAuditLogs = auditLogs.items.filter(
    (log) => log.resourceType === "insurance_policy" && log.resourceId === id
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
          href={`/admin/escrows/${policy.escrow.id}`}
          className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold"
        >
          Ver escrow
        </Link>
        <Link
          href={`/admin/listings/${policy.escrow.listing.id}`}
          className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold"
        >
          Ver listing
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
              Insurance policy
            </span>
            <h1
              className="text-5xl font-semibold tracking-[-0.04em]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {policy.escrow.listing.title}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-white/70">
              {policy.provider.name} · {policy.externalPolicyId}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-white/60">Estado actual</p>
            <p className="mt-2 text-3xl font-semibold">{policy.status}</p>
            <p className="mt-2 text-lg text-white/80">
              {formatCurrency(policy.coverageAmount, policy.escrow.currency)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">
                Resumen de póliza
              </h2>
              <span className="text-sm text-[var(--muted)]">
                Actualizada {formatDate(policy.updatedAt)}
              </span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.25rem] bg-[#f8fbff] p-4">
                <p className="text-sm text-[var(--muted)]">Prima</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--navy)]">
                  {formatCurrency(policy.premiumAmount, policy.escrow.currency)}
                </p>
              </div>
              <div className="rounded-[1.25rem] bg-[#f8fbff] p-4">
                <p className="text-sm text-[var(--muted)]">Cobertura</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--navy)]">
                  {formatCurrency(policy.coverageAmount, policy.escrow.currency)}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-[1.25rem] bg-[#f8fbff] p-4 text-sm text-[var(--navy)]">
              <p>
                <span className="font-semibold">URL de póliza:</span>{" "}
                {policy.policyUrl ? (
                  <a
                    className="underline"
                    href={policy.policyUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Abrir documento
                  </a>
                ) : (
                  "Sin URL asociada"
                )}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Endpoint proveedor:</span>{" "}
                {policy.provider.endpointApi}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Creada:</span>{" "}
                {formatDate(policy.createdAt)}
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">
                Operación asociada
              </h2>
              <span className="text-sm text-[var(--muted)]">{policy.escrow.status}</span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.25rem] bg-[#f8fbff] p-4">
                <p className="font-semibold text-[var(--navy)]">Comprador</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {policy.escrow.buyer.firstName} {policy.escrow.buyer.lastName}
                </p>
                <p className="text-sm text-[var(--muted)]">{policy.escrow.buyer.email}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  KYC {policy.escrow.buyer.kycStatus}
                </p>
              </div>
              <div className="rounded-[1.25rem] bg-[#f8fbff] p-4">
                <p className="font-semibold text-[var(--navy)]">Vendedor</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {policy.escrow.seller.firstName} {policy.escrow.seller.lastName}
                </p>
                <p className="text-sm text-[var(--muted)]">{policy.escrow.seller.email}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  KYC {policy.escrow.seller.kycStatus}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-[1.25rem] bg-[#f8fbff] p-4 text-sm text-[var(--navy)]">
              <p>
                <span className="font-semibold">Escrow:</span> {policy.escrow.id}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Listing:</span>{" "}
                {policy.escrow.listing.title} · {policy.escrow.listing.category}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Monto:</span>{" "}
                {formatCurrency(policy.escrow.amount, policy.escrow.currency)}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Seguro marcado:</span>{" "}
                {policy.escrow.isInsured ? "Sí" : "No"} ·{" "}
                {formatCurrency(policy.escrow.insuranceFee, policy.escrow.currency)}
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">
                Intentos de pago
              </h2>
              <span className="text-sm text-[var(--muted)]">
                {policy.escrow.paymentIntents.length} eventos
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {policy.escrow.paymentIntents.map((paymentIntent) => (
                <article
                  key={paymentIntent.id}
                  className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--navy)]">
                        {paymentIntent.provider} · {paymentIntent.status}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        Payment {paymentIntent.providerPaymentId ?? "Pendiente"}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        Preference {paymentIntent.providerPreferenceId ?? "N/A"}
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
                  <div className="mt-3 grid gap-2 text-sm text-[var(--muted)] md:grid-cols-2">
                    <p>Aprobado: {formatDate(paymentIntent.approvedAt)}</p>
                    <p>Fondos retenidos: {formatDate(paymentIntent.fundsHeldAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Auditoría</h2>
              <span className="text-sm text-[var(--muted)]">
                {policyAuditLogs.length} eventos
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {policyAuditLogs.map((log) => (
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
                    <p className="text-sm text-[var(--muted)]">
                      {formatDate(log.createdAt)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">
              Operar póliza
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Flujo manual para sandbox: permite simular emisión activa o un
              siniestro reclamado sin integrar una aseguradora real.
            </p>

            <ConfirmForm
              action={updateInsurancePolicyStatusAction}
              className="mt-5 grid gap-3"
            >
              <input name="policyId" type="hidden" value={policy.id} />
              <input name="returnTo" type="hidden" value={currentPath} />
              <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                Estado
                <select
                  className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3"
                  defaultValue={policy.status}
                  name="status"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CLAIMED">CLAIMED</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                URL de póliza
                <input
                  className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3"
                  defaultValue={policy.policyUrl}
                  name="policyUrl"
                  placeholder="https://poliza.example/documento"
                />
              </label>
              <SubmitButton
                className="rounded-2xl bg-[var(--navy)] px-4 py-3 text-sm font-semibold text-white"
                confirmMessage="¿Guardar cambios en esta póliza?"
                pendingLabel="Guardando..."
              >
                Guardar cambios
              </SubmitButton>
            </ConfirmForm>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">
              Raw payload
            </h2>
            <pre className="mt-5 overflow-x-auto rounded-[1.25rem] bg-[#081a33] p-4 text-xs leading-6 text-white">
              {JSON.stringify(policy.rawPayload ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}
