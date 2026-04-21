import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../../../lib/api";
import { canAccessAdmin, verifySessionToken } from "../../../../lib/auth";
import { formatDate } from "../../../../lib/format";

import { reviewKycAction } from "../../actions";
import { ConfirmForm, SubmitButton } from "../../form-controls";

type KycDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

type KycDetail = {
  id: string;
  provider: string;
  documentType: string;
  documentNumber: string;
  status: string;
  riskScore: string | null;
  faceMatchScore: string | null;
  documentFrontImageUrl: string | null;
  documentBackImageUrl: string | null;
  selfieImageUrl: string | null;
  biometricConsentAt: string | null;
  reviewerNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    dni: string;
    phone: string | null;
    city: string;
    province: string;
    status: string;
    role: string;
    kycStatus: string;
    reputationScore: string;
    createdAt: string;
    _count: {
      listings: number;
      buyerEscrows: number;
      sellerEscrows: number;
    };
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

const KYC_COLORS: Record<string, string> = {
  APPROVED: "border-[rgba(5,150,105,0.25)] bg-[rgba(5,150,105,0.12)] text-[#065f46]",
  PENDING: "border-[rgba(217,119,6,0.25)] bg-[rgba(217,119,6,0.12)] text-[#92400e]",
  REJECTED: "border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.1)] text-[#991b1b]",
  REQUIRES_REVIEW:
    "border-[rgba(99,102,241,0.25)] bg-[rgba(99,102,241,0.12)] text-[#3730a3]"
};

function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        className ?? "border-[var(--surface-border)] bg-white text-[var(--navy)]"
      }`}
    >
      {label}
    </span>
  );
}

function EvidenceImage({
  alt,
  label,
  url
}: {
  alt: string;
  label: string;
  url: string | null;
}) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-[var(--surface-border)] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--surface-border)] px-4 py-3">
        <p className="font-semibold text-[var(--navy)]">{label}</p>
        {url ? (
          <a
            className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]"
            href={url}
            rel="noreferrer"
            target="_blank"
          >
            Abrir original
          </a>
        ) : null}
      </div>
      {url ? (
        <img alt={alt} className="h-80 w-full bg-[#f8fbff] object-contain" src={url} />
      ) : (
        <div className="flex h-80 items-center justify-center bg-[#f8fbff] px-6 text-center text-sm text-[var(--muted)]">
          No hay imagen cargada para esta evidencia.
        </div>
      )}
    </article>
  );
}

function maskDni(dni: string) {
  return `••••••${dni.slice(-3)}`;
}

export default async function KycDetailPage({
  params,
  searchParams
}: KycDetailPageProps) {
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
  const currentPath = `/admin/kyc/${id}`;
  const resolvedSearchParams = (await searchParams) ?? {};

  const [verification, auditLogs] = await Promise.all([
    apiFetchWithToken<KycDetail>(`/kyc/verifications/${id}`, token),
    apiFetchWithToken<PaginatedResponse<AuditLog>>(
      `/admin/audit-logs?resourceType=kyc_verification&q=${encodeURIComponent(id)}&pageSize=50`,
      token
    )
  ]);
  const verificationAuditLogs = auditLogs.items.filter(
    (log) => log.resourceType === "kyc_verification" && log.resourceId === id
  );
  const isPendingReview =
    verification.status === "PENDING" || verification.status === "REQUIRES_REVIEW";
  const hasAllEvidence =
    Boolean(verification.documentFrontImageUrl) &&
    Boolean(verification.documentBackImageUrl) &&
    Boolean(verification.selfieImageUrl);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold"
          href="/admin"
        >
          Volver a admin
        </Link>
        <Link
          className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold"
          href={`/admin/users/${verification.user.id}`}
        >
          Ver usuario
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
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge
                className={
                  KYC_COLORS[verification.status] ??
                  "border-white/15 bg-white/10 text-white"
                }
                label={verification.status}
              />
              <Badge className="border-white/15 bg-white/10 text-white" label={verification.provider} />
              <Badge
                className={hasAllEvidence ? "border-white/15 bg-white/10 text-white" : "border-[#fca5a5] bg-[#fee2e2] text-[#991b1b]"}
                label={hasAllEvidence ? "Evidencia completa" : "Evidencia incompleta"}
              />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-white/60">
                Revisión de identidad
              </p>
              <h1
                className="mt-2 text-5xl font-semibold tracking-[-0.04em]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {verification.user.firstName} {verification.user.lastName}
              </h1>
            </div>
            <div className="grid gap-1 text-sm text-white/70">
              <p>{verification.user.email}</p>
              <p>
                {verification.user.city}, {verification.user.province}
              </p>
              <p>
                {verification.documentType}: {maskDni(verification.documentNumber)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 text-right sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/8 p-4">
              <p className="text-sm text-white/55">Usuario</p>
              <p className="mt-2 text-2xl font-semibold">{verification.user.status}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/8 p-4">
              <p className="text-sm text-white/55">KYC global</p>
              <p className="mt-2 text-2xl font-semibold">{verification.user.kycStatus}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/8 p-4">
              <p className="text-sm text-white/55">Score</p>
              <p className="mt-2 text-2xl font-semibold">{verification.user.reputationScore}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--navy)]">
                  Evidencia documental
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Revisá legibilidad, coincidencia de datos y consistencia entre DNI y selfie.
                </p>
              </div>
              <Badge
                className={
                  verification.biometricConsentAt
                    ? "border-[rgba(5,150,105,0.25)] bg-[rgba(5,150,105,0.12)] text-[#065f46]"
                    : "border-[rgba(217,119,6,0.25)] bg-[rgba(217,119,6,0.12)] text-[#92400e]"
                }
                label={
                  verification.biometricConsentAt
                    ? "Consentimiento registrado"
                    : "Sin consentimiento biométrico"
                }
              />
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <EvidenceImage
                alt="Frente del DNI"
                label="Frente del DNI"
                url={verification.documentFrontImageUrl}
              />
              <EvidenceImage
                alt="Dorso del DNI"
                label="Dorso del DNI"
                url={verification.documentBackImageUrl}
              />
              <div className="xl:col-span-2">
                <EvidenceImage
                  alt="Selfie de verificación"
                  label="Selfie"
                  url={verification.selfieImageUrl}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Auditoría KYC</h2>
            <div className="mt-5 grid gap-3">
              {verificationAuditLogs.map((log) => (
                <article
                  className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4"
                  key={log.id}
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
              {verificationAuditLogs.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Todavía no hay eventos de auditoría para esta verificación.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Decisión operativa</h2>
            <div className="mt-5 grid gap-3 rounded-[1.25rem] bg-[#f8fbff] p-4 text-sm text-[var(--muted)]">
              <p>
                <span className="font-semibold text-[var(--navy)]">Creado:</span>{" "}
                {formatDate(verification.createdAt)}
              </p>
              <p>
                <span className="font-semibold text-[var(--navy)]">Revisado:</span>{" "}
                {formatDate(verification.reviewedAt)}
              </p>
              <p>
                <span className="font-semibold text-[var(--navy)]">Risk score:</span>{" "}
                {verification.riskScore ?? "Sin proveedor"}
              </p>
              <p>
                <span className="font-semibold text-[var(--navy)]">Face match:</span>{" "}
                {verification.faceMatchScore ?? "Sin proveedor"}
              </p>
              <p>
                <span className="font-semibold text-[var(--navy)]">Notas:</span>{" "}
                {verification.reviewerNotes ?? "Sin notas previas."}
              </p>
            </div>

            <ConfirmForm action={reviewKycAction} className="mt-5 grid gap-3">
              <input name="verificationId" type="hidden" value={verification.id} />
              <input name="returnTo" type="hidden" value={currentPath} />
              <label className="grid gap-2 text-sm font-semibold text-[var(--navy)]">
                Notas de revisión
                <textarea
                  className="min-h-32 rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 text-sm font-normal text-[var(--foreground)]"
                  defaultValue={
                    verification.reviewerNotes ??
                    "Documento legible, selfie consistente y consentimiento registrado."
                  }
                  name="reviewerNotes"
                />
              </label>

              <div className="grid gap-2">
                <SubmitButton
                  className="rounded-full bg-[#059669] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  confirmMessage="¿Aprobar esta identidad y habilitar operaciones sensibles?"
                  disabled={!isPendingReview || !hasAllEvidence}
                  name="status"
                  pendingLabel="Aprobando..."
                  value="APPROVED"
                >
                  Aprobar identidad
                </SubmitButton>
                <SubmitButton
                  className="rounded-full bg-[#f59e0b] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  confirmMessage="¿Pedir corrección o revisión adicional?"
                  disabled={verification.status === "REQUIRES_REVIEW"}
                  name="status"
                  pendingLabel="Guardando..."
                  value="REQUIRES_REVIEW"
                >
                  Pedir corrección / revisión
                </SubmitButton>
                <SubmitButton
                  className="rounded-full bg-[#dc2626] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  confirmMessage="¿Rechazar esta identidad?"
                  disabled={verification.status === "REJECTED"}
                  name="status"
                  pendingLabel="Rechazando..."
                  value="REJECTED"
                >
                  Rechazar identidad
                </SubmitButton>
              </div>
            </ConfirmForm>

            {!hasAllEvidence ? (
              <p className="mt-4 rounded-2xl border border-[rgba(220,38,38,0.16)] bg-[rgba(220,38,38,0.07)] px-4 py-3 text-sm leading-6 text-[#991b1b]">
                Falta evidencia obligatoria. No se permite aprobar hasta tener frente,
                dorso y selfie.
              </p>
            ) : null}
          </section>

          <section className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Snapshot usuario</h2>
            <div className="mt-5 grid gap-3 text-sm text-[var(--muted)]">
              <p>
                <span className="font-semibold text-[var(--navy)]">Email:</span>{" "}
                {verification.user.email}
              </p>
              <p>
                <span className="font-semibold text-[var(--navy)]">DNI cuenta:</span>{" "}
                {maskDni(verification.user.dni)}
              </p>
              <p>
                <span className="font-semibold text-[var(--navy)]">Teléfono:</span>{" "}
                {verification.user.phone ?? "No informado"}
              </p>
              <p>
                <span className="font-semibold text-[var(--navy)]">Alta:</span>{" "}
                {formatDate(verification.user.createdAt)}
              </p>
            </div>
            <div className="mt-5 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-3">
              <span className="rounded-full bg-[#f8fbff] px-3 py-2 text-center">
                {verification.user._count.listings} publicaciones
              </span>
              <span className="rounded-full bg-[#f8fbff] px-3 py-2 text-center">
                {verification.user._count.buyerEscrows} compras
              </span>
              <span className="rounded-full bg-[#f8fbff] px-3 py-2 text-center">
                {verification.user._count.sellerEscrows} ventas
              </span>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
