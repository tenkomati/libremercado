import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../../../lib/api";
import { canAccessAdmin, verifySessionToken } from "../../../../lib/auth";
import { formatCurrency, formatDate } from "../../../../lib/format";

import {
  updateUserStatusAction,
  updateUserRoleAction,
  reviewKycAction
} from "../../actions";
import { ConfirmForm, SubmitButton } from "../../form-controls";

type UserDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

type KycVerification = {
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
};

type UserListing = {
  id: string;
  title: string;
  category: string;
  condition: string;
  status: string;
  price: string;
  currency: string;
  locationCity: string;
  locationProvince: string;
  createdAt: string;
};

type EscrowSummary = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  listing: { id: string; title: string };
  seller?: { id: string; firstName: string; lastName: string };
  buyer?: { id: string; firstName: string; lastName: string };
};

type UserDetail = {
  id: string;
  email: string;
  dni: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  province: string;
  city: string;
  status: string;
  role: string;
  kycStatus: string;
  reputationScore: string;
  createdAt: string;
  updatedAt: string;
  kycVerifications: KycVerification[];
  listings: UserListing[];
  buyerEscrows: EscrowSummary[];
  sellerEscrows: EscrowSummary[];
};

type AuditLog = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  actorRole: string;
  actor: { firstName: string; lastName: string; email: string };
};

type PaginatedResponse<T> = {
  items: T[];
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-[rgba(5,150,105,0.12)] text-[#065f46] border-[rgba(5,150,105,0.25)]",
  BLOCKED: "bg-[rgba(220,38,38,0.1)] text-[#991b1b] border-[rgba(220,38,38,0.22)]",
  PENDING_REVIEW: "bg-[rgba(217,119,6,0.12)] text-[#92400e] border-[rgba(217,119,6,0.25)]"
};

const KYC_COLORS: Record<string, string> = {
  APPROVED: "bg-[rgba(5,150,105,0.12)] text-[#065f46] border-[rgba(5,150,105,0.25)]",
  REJECTED: "bg-[rgba(220,38,38,0.1)] text-[#991b1b] border-[rgba(220,38,38,0.22)]",
  PENDING: "bg-[rgba(217,119,6,0.12)] text-[#92400e] border-[rgba(217,119,6,0.25)]",
  REQUIRES_REVIEW: "bg-[rgba(99,102,241,0.12)] text-[#3730a3] border-[rgba(99,102,241,0.25)]"
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-[rgba(18,107,255,0.12)] text-[var(--brand-strong)] border-[rgba(18,107,255,0.2)]",
  OPS: "bg-[rgba(99,102,241,0.12)] text-[#3730a3] border-[rgba(99,102,241,0.22)]",
  USER: "bg-[rgba(8,34,71,0.07)] text-[var(--navy)] border-[rgba(8,34,71,0.12)]"
};

const ESCROW_COLORS: Record<string, string> = {
  FUNDS_HELD: "bg-[rgba(217,119,6,0.1)] text-[#92400e] border-[rgba(217,119,6,0.25)]",
  SHIPPED: "bg-[rgba(99,102,241,0.1)] text-[#3730a3] border-[rgba(99,102,241,0.25)]",
  DELIVERED: "bg-[rgba(5,150,105,0.1)] text-[#065f46] border-[rgba(5,150,105,0.25)]",
  RELEASED: "bg-[rgba(5,150,105,0.15)] text-[#065f46] border-[rgba(5,150,105,0.3)]",
  DISPUTED: "bg-[rgba(220,38,38,0.1)] text-[#991b1b] border-[rgba(220,38,38,0.22)]",
  CANCELLED: "bg-[rgba(8,34,71,0.07)] text-[var(--navy)] border-[rgba(8,34,71,0.12)]",
  REFUNDED: "bg-[rgba(8,34,71,0.07)] text-[var(--navy)] border-[rgba(8,34,71,0.12)]",
  FUNDS_PENDING: "bg-[rgba(217,119,6,0.1)] text-[#92400e] border-[rgba(217,119,6,0.25)]"
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
}

function maskDni(dni: string) {
  return `••••••${dni.slice(-3)}`;
}

export default async function UserDetailPage({
  params,
  searchParams
}: UserDetailPageProps) {
  const token = (await cookies()).get("libremercado_admin_token")?.value;

  if (!token) redirect("/login?next=/admin");

  let session;
  try {
    session = await verifySessionToken(token);
  } catch {
    redirect("/login?next=/admin");
  }

  if (!canAccessAdmin(session.role)) redirect("/login?next=/admin");

  const { id } = await params;
  const currentPath = `/admin/users/${id}`;
  const resolvedSearchParams = (await searchParams) ?? {};

  const [user, auditLogs] = await Promise.all([
    apiFetchWithToken<UserDetail>(`/users/${id}`, token),
    apiFetchWithToken<PaginatedResponse<AuditLog>>(
      `/admin/audit-logs?resourceType=user&q=${encodeURIComponent(id)}&pageSize=100`,
      token
    )
  ]);

  const userAuditLogs = auditLogs.items.filter(
    (log) => log.resourceType === "user" && log.resourceId === id
  );

  const isAdmin = session.role === "ADMIN";

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      {/* ── Breadcrumb ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin"
          className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold"
        >
          Volver a admin
        </Link>
      </div>

      {/* ── Banners ── */}
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

      {/* ── Hero ── */}
      <section className="mt-6 rounded-[2rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#082247,#0d3270)] p-8 text-white shadow-[0_22px_80px_rgba(8,34,71,0.24)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge
                label={user.status}
                colorClass={
                  STATUS_COLORS[user.status] ??
                  "bg-white/10 text-white border-white/20"
                }
              />
              <Badge
                label={user.role}
                colorClass={
                  ROLE_COLORS[user.role] ??
                  "bg-white/10 text-white border-white/20"
                }
              />
              <Badge
                label={`KYC: ${user.kycStatus}`}
                colorClass={
                  KYC_COLORS[user.kycStatus] ??
                  "bg-white/10 text-white border-white/20"
                }
              />
            </div>
            <h1
              className="text-5xl font-semibold tracking-[-0.04em]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {user.firstName} {user.lastName}
            </h1>
            <div className="space-y-1 text-white/70">
              <p>{user.email}</p>
              <p>DNI: {maskDni(user.dni)}</p>
              {user.phone ? <p>Tel: {user.phone}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 text-right sm:grid-cols-3 lg:min-w-[360px]">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/8 p-4">
              <p className="text-sm text-white/55">Reputación</p>
              <p className="mt-2 text-3xl font-semibold">{user.reputationScore}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/8 p-4">
              <p className="text-sm text-white/55">Publicaciones</p>
              <p className="mt-2 text-3xl font-semibold">{user.listings.length}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/8 p-4">
              <p className="text-sm text-white/55">Transacciones</p>
              <p className="mt-2 text-3xl font-semibold">
                {user.buyerEscrows.length + user.sellerEscrows.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-6 border-t border-white/10 pt-6 text-sm text-white/60">
          <span>📍 {user.city}, {user.province}</span>
          <span>📅 Registro: {formatDate(user.createdAt)}</span>
          <span>🔄 Actualizado: {formatDate(user.updatedAt)}</span>
          <span>🆔 {user.id}</span>
        </div>
      </section>

      {/* ── Main content grid ── */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left column */}
        <div className="space-y-6">

          {/* KYC History */}
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Historial KYC</h2>
              <span className="text-sm text-[var(--muted)]">
                {user.kycVerifications.length} verificaciones
              </span>
            </div>
            {user.kycVerifications.length === 0 ? (
              <p className="mt-5 text-sm text-[var(--muted)]">Sin verificaciones registradas.</p>
            ) : (
              <div className="mt-5 grid gap-3">
                {user.kycVerifications.map((kyc) => (
                  <article
                    key={kyc.id}
                    className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            label={kyc.status}
                            colorClass={
                              KYC_COLORS[kyc.status] ??
                              "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          />
                          <span className="text-sm font-medium text-[var(--navy)]">
                            {kyc.documentType}: ••••{kyc.documentNumber.slice(-4)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          Proveedor: {kyc.provider}
                        </p>
                        {kyc.reviewerNotes ? (
                          <p className="text-xs text-[var(--muted)]">
                            Notas: {kyc.reviewerNotes}
                          </p>
                        ) : null}
                        {kyc.riskScore !== null ? (
                          <p className="text-xs text-[var(--muted)]">
                            Risk: {kyc.riskScore} · FaceMatch: {kyc.faceMatchScore ?? "N/A"}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2 pt-2 text-xs font-semibold">
                          <Link className="rounded-full border border-[var(--surface-border)] bg-white px-3 py-1 text-[var(--navy)]" href={`/admin/kyc/${kyc.id}`}>
                            Revisar ficha completa
                          </Link>
                          {kyc.documentFrontImageUrl ? (
                            <a className="rounded-full bg-white px-3 py-1 text-[var(--brand-strong)]" href={kyc.documentFrontImageUrl} target="_blank" rel="noreferrer">
                              Frente DNI
                            </a>
                          ) : null}
                          {kyc.documentBackImageUrl ? (
                            <a className="rounded-full bg-white px-3 py-1 text-[var(--brand-strong)]" href={kyc.documentBackImageUrl} target="_blank" rel="noreferrer">
                              Dorso DNI
                            </a>
                          ) : null}
                          {kyc.selfieImageUrl ? (
                            <a className="rounded-full bg-white px-3 py-1 text-[var(--brand-strong)]" href={kyc.selfieImageUrl} target="_blank" rel="noreferrer">
                              Selfie
                            </a>
                          ) : null}
                          {kyc.biometricConsentAt ? (
                            <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-[#047857]">
                              Consentimiento registrado
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right text-xs text-[var(--muted)]">
                        <p>{formatDate(kyc.createdAt)}</p>
                        {kyc.reviewedAt ? (
                          <p>Revisado: {formatDate(kyc.reviewedAt)}</p>
                        ) : null}
                      </div>
                    </div>
                    {kyc.status === "PENDING" || kyc.status === "REQUIRES_REVIEW" ? (
                      <ConfirmForm action={reviewKycAction} className="mt-4 flex flex-wrap gap-2">
                        <input name="verificationId" type="hidden" value={kyc.id} />
                        <input name="returnTo" type="hidden" value={currentPath} />
                        <input
                          className="min-w-48 flex-1 rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 text-xs"
                          name="reviewerNotes"
                          placeholder="Notas del revisor (opcional)"
                        />
                        <SubmitButton
                          className="rounded-full bg-[#059669] px-3 py-2 text-xs font-semibold text-white"
                          confirmMessage="¿Aprobar este KYC?"
                          name="status"
                          pendingLabel="Aprobando..."
                          value="APPROVED"
                        >
                          Aprobar
                        </SubmitButton>
                        <SubmitButton
                          className="rounded-full bg-[#dc2626] px-3 py-2 text-xs font-semibold text-white"
                          confirmMessage="¿Rechazar este KYC?"
                          name="status"
                          pendingLabel="Rechazando..."
                          value="REJECTED"
                        >
                          Rechazar
                        </SubmitButton>
                        <SubmitButton
                          className="rounded-full bg-[#d97706] px-3 py-2 text-xs font-semibold text-white"
                          confirmMessage="¿Mover este KYC a revisión manual?"
                          name="status"
                          pendingLabel="Guardando..."
                          value="REQUIRES_REVIEW"
                        >
                          Revisión manual
                        </SubmitButton>
                      </ConfirmForm>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Listings */}
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Publicaciones</h2>
              <span className="text-sm text-[var(--muted)]">{user.listings.length}</span>
            </div>
            {user.listings.length === 0 ? (
              <p className="mt-5 text-sm text-[var(--muted)]">Sin publicaciones.</p>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {user.listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/admin/listings/${listing.id}`}
                    className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4 transition hover:border-[rgba(18,107,255,0.2)] hover:bg-[#f0f6ff]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-[var(--navy)] leading-tight">
                        {listing.title}
                      </p>
                      <Badge
                        label={listing.status}
                        colorClass={
                          listing.status === "PUBLISHED"
                            ? "bg-[rgba(5,150,105,0.1)] text-[#065f46] border-[rgba(5,150,105,0.25)]"
                            : listing.status === "SOLD"
                            ? "bg-[rgba(18,107,255,0.1)] text-[var(--brand-strong)] border-[rgba(18,107,255,0.2)]"
                            : "bg-[rgba(8,34,71,0.06)] text-[var(--muted)] border-[rgba(8,34,71,0.1)]"
                        }
                      />
                    </div>
                    <p className="mt-2 text-lg font-semibold text-[var(--brand)]">
                      {formatCurrency(listing.price, listing.currency)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {listing.category} · {listing.condition} · {listing.locationCity}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(listing.createdAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Escrow Transactions */}
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Transacciones</h2>

            {/* As buyer */}
            <div className="mt-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Como comprador ({user.buyerEscrows.length})
              </p>
              {user.buyerEscrows.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">Sin compras.</p>
              ) : (
                <div className="mt-3 grid gap-3">
                  {user.buyerEscrows.map((escrow) => (
                    <Link
                      key={escrow.id}
                      href={`/admin/escrows/${escrow.id}`}
                      className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4 transition hover:border-[rgba(18,107,255,0.2)] hover:bg-[#f0f6ff]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--navy)]">
                          {escrow.listing.title}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          Vendedor: {escrow.seller?.firstName} {escrow.seller?.lastName} · {formatDate(escrow.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-[var(--navy)]">
                          {formatCurrency(escrow.amount, escrow.currency)}
                        </p>
                        <Badge
                          label={escrow.status}
                          colorClass={
                            ESCROW_COLORS[escrow.status] ??
                            "bg-gray-100 text-gray-600 border-gray-200"
                          }
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* As seller */}
            <div className="mt-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Como vendedor ({user.sellerEscrows.length})
              </p>
              {user.sellerEscrows.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">Sin ventas.</p>
              ) : (
                <div className="mt-3 grid gap-3">
                  {user.sellerEscrows.map((escrow) => (
                    <Link
                      key={escrow.id}
                      href={`/admin/escrows/${escrow.id}`}
                      className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4 transition hover:border-[rgba(18,107,255,0.2)] hover:bg-[#f0f6ff]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--navy)]">
                          {escrow.listing.title}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          Comprador: {escrow.buyer?.firstName} {escrow.buyer?.lastName} · {formatDate(escrow.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-[var(--navy)]">
                          {formatCurrency(escrow.amount, escrow.currency)}
                        </p>
                        <Badge
                          label={escrow.status}
                          colorClass={
                            ESCROW_COLORS[escrow.status] ??
                            "bg-gray-100 text-gray-600 border-gray-200"
                          }
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Auditoría</h2>
              <span className="text-sm text-[var(--muted)]">{userAuditLogs.length} eventos</span>
            </div>
            {userAuditLogs.length === 0 ? (
              <p className="mt-5 text-sm text-[var(--muted)]">Sin eventos de auditoría.</p>
            ) : (
              <div className="mt-5 grid gap-3">
                {userAuditLogs.map((log) => (
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
            )}
          </div>
        </div>

        {/* Right column — Actions */}
        <div className="space-y-6">
          {/* Status actions */}
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Estado de cuenta</h2>
            <div className="mt-4">
              <Badge
                label={user.status}
                colorClass={
                  STATUS_COLORS[user.status] ??
                  "bg-gray-100 text-gray-700 border-gray-200"
                }
              />
            </div>
            <div className="mt-5 grid gap-2">
              {user.status !== "ACTIVE" ? (
                <ConfirmForm action={updateUserStatusAction}>
                  <input name="userId" type="hidden" value={user.id} />
                  <input name="status" type="hidden" value="ACTIVE" />
                  <input name="returnTo" type="hidden" value={currentPath} />
                  <SubmitButton
                    className="w-full rounded-full bg-[#059669] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#047857]"
                    confirmMessage="¿Activar esta cuenta?"
                    pendingLabel="Activando..."
                  >
                    Activar cuenta
                  </SubmitButton>
                </ConfirmForm>
              ) : null}
              {user.status !== "BLOCKED" ? (
                <ConfirmForm action={updateUserStatusAction}>
                  <input name="userId" type="hidden" value={user.id} />
                  <input name="status" type="hidden" value="BLOCKED" />
                  <input name="returnTo" type="hidden" value={currentPath} />
                  <SubmitButton
                    className="w-full rounded-full bg-[#dc2626] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#b91c1c]"
                    confirmMessage="¿Bloquear esta cuenta? El usuario no podrá operar."
                    pendingLabel="Bloqueando..."
                  >
                    Bloquear cuenta
                  </SubmitButton>
                </ConfirmForm>
              ) : null}
              {user.status !== "PENDING_REVIEW" ? (
                <ConfirmForm action={updateUserStatusAction}>
                  <input name="userId" type="hidden" value={user.id} />
                  <input name="status" type="hidden" value="PENDING_REVIEW" />
                  <input name="returnTo" type="hidden" value={currentPath} />
                  <SubmitButton
                    className="w-full rounded-full border border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.08)] px-4 py-3 text-sm font-semibold text-[#92400e] transition hover:bg-[rgba(217,119,6,0.14)]"
                    confirmMessage="¿Mover esta cuenta a revisión operativa?"
                    pendingLabel="Moviendo..."
                  >
                    Mover a revisión
                  </SubmitButton>
                </ConfirmForm>
              ) : null}
            </div>
          </div>

          {/* Role change — ADMIN only */}
          {isAdmin ? (
            <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Rol</h2>
              <div className="mt-4">
                <Badge
                  label={user.role}
                  colorClass={
                    ROLE_COLORS[user.role] ??
                    "bg-gray-100 text-gray-700 border-gray-200"
                  }
                />
              </div>
              <ConfirmForm action={updateUserRoleAction} className="mt-5 space-y-3">
                <input name="userId" type="hidden" value={user.id} />
                <input name="returnTo" type="hidden" value={currentPath} />
                <select
                  name="role"
                  defaultValue={user.role}
                  className="w-full rounded-full border border-[var(--surface-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--navy)] outline-none"
                >
                  <option value="USER">USER</option>
                  <option value="OPS">OPS</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <SubmitButton
                  className="w-full rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
                  confirmMessage="¿Cambiar el rol de este usuario? Esto modifica sus permisos."
                  pendingLabel="Cambiando..."
                >
                  Cambiar rol
                </SubmitButton>
              </ConfirmForm>
            </div>
          ) : null}

          {/* Quick info card */}
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#f8fbff,#eaf2ff)] p-6">
            <h2 className="text-lg font-semibold text-[var(--navy)]">Datos del perfil</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Email</dt>
                <dd className="mt-1 font-medium text-[var(--navy)]">{user.email}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">DNI</dt>
                <dd className="mt-1 font-medium text-[var(--navy)]">{maskDni(user.dni)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Teléfono</dt>
                <dd className="mt-1 font-medium text-[var(--navy)]">{user.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Ubicación</dt>
                <dd className="mt-1 font-medium text-[var(--navy)]">
                  {user.city}, {user.province}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Reputación</dt>
                <dd className="mt-1 font-semibold text-[var(--brand)]">{user.reputationScore} / 5.00</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
