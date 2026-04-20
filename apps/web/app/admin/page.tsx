import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../lib/api";
import { canAccessAdmin, verifySessionToken } from "../../lib/auth";
import { formatCurrency, formatDate } from "../../lib/format";

import {
  reviewKycAction,
  runEscrowAction,
  updateListingStatusAction
} from "./actions";
import { ConfirmForm, SubmitButton } from "./form-controls";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  province: string;
  status: string;
  role: string;
  kycStatus: string;
  reputationScore: string;
  _count: {
    listings: number;
    buyerEscrows: number;
    sellerEscrows: number;
  };
};

type Verification = {
  id: string;
  provider: string;
  status: string;
  documentType: string;
  createdAt: string;
  reviewerNotes: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    city: string;
    province: string;
  };
};

type Listing = {
  id: string;
  title: string;
  category: string;
  status: string;
  price: string;
  locationCity: string;
  locationProvince: string;
  seller: {
    firstName: string;
    lastName: string;
    kycStatus: string;
  };
};

type Escrow = {
  id: string;
  status: string;
  amount: string;
  feeAmount: string;
  netAmount: string;
  shippingProvider: string;
  shippingTrackingCode: string | null;
  releaseEligibleAt: string | null;
  listing: {
    title: string;
    category: string;
    status: string;
  };
  buyer: {
    firstName: string;
    lastName: string;
  };
  seller: {
    firstName: string;
    lastName: string;
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

type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type PaginatedResponse<T> = {
  items: T[];
  meta: PaginationMeta;
};

type AdminOverview = {
  users: {
    total: number;
    byStatus: Record<string, number>;
    byRole: Record<string, number>;
  };
  kyc: {
    byStatus: Record<string, number>;
  };
  listings: {
    byStatus: Record<string, number>;
  };
  escrows: {
    total: number;
    byStatus: Record<string, number>;
    riskQueue: number;
    financials: {
      totalGmv: string;
      estimatedRevenue: string;
      netSellerAmount: string;
      averageTicket: string;
    };
  };
};

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function percentage(part: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return (part / total) * 100;
}

function buildApiPath(
  path: string,
  params: Record<string, string | number | undefined>
) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim() !== "") {
      search.set(key, String(value));
    }
  });

  return search.size ? `${path}?${search.toString()}` : path;
}

function getPositivePage(value: string | undefined) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1;
}

function buildPageHref(
  params: AdminSearchParams,
  pageKey: keyof AdminSearchParams,
  page: number
) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && key !== pageKey) {
      search.set(key, value);
    }
  });
  search.set(pageKey, page.toString());

  return `/admin?${search.toString()}`;
}

function PaginationControls({
  label,
  meta,
  params,
  pageKey
}: {
  label: string;
  meta: PaginationMeta;
  params: AdminSearchParams;
  pageKey: keyof AdminSearchParams;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
      <span>
        {label}: página {meta.page} de {meta.pageCount} · {meta.total} total
      </span>
      <div className="flex gap-2">
        {meta.hasPreviousPage ? (
          <Link
            className="rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 font-semibold text-[var(--navy)]"
            href={buildPageHref(params, pageKey, meta.page - 1)}
          >
            Anterior
          </Link>
        ) : null}
        {meta.hasNextPage ? (
          <Link
            className="rounded-full bg-[var(--navy)] px-3 py-2 font-semibold text-white"
            href={buildPageHref(params, pageKey, meta.page + 1)}
          >
            Siguiente
          </Link>
        ) : null}
      </div>
    </div>
  );
}

type AdminSearchParams = {
  success?: string;
  error?: string;
  q?: string;
  userStatus?: string;
  kycStatus?: string;
  listingStatus?: string;
  escrowStatus?: string;
  auditAction?: string;
  usersPage?: string;
  kycPage?: string;
  listingsPage?: string;
  escrowsPage?: string;
  auditPage?: string;
};

type AdminPageProps = {
  searchParams?: Promise<AdminSearchParams>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
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

  const params: AdminSearchParams = await (searchParams ?? Promise.resolve({}));
  const query = params.q?.trim() ?? "";
  const [overview, usersPage, verificationsPage, listingsPage, escrowsPage, auditLogsPage] = await Promise.all([
    apiFetchWithToken<AdminOverview>("/admin/overview", token),
    apiFetchWithToken<PaginatedResponse<User>>(
      buildApiPath("/users", {
        q: query,
        status: params.userStatus,
        page: getPositivePage(params.usersPage),
        pageSize: 6,
        sortBy: "createdAt",
        sortOrder: "desc"
      }),
      token
    ),
    apiFetchWithToken<PaginatedResponse<Verification>>(
      buildApiPath("/kyc/verifications", {
        q: query,
        status: params.kycStatus,
        page: getPositivePage(params.kycPage),
        pageSize: 6,
        sortBy: "createdAt",
        sortOrder: "desc"
      }),
      token
    ),
    apiFetchWithToken<PaginatedResponse<Listing>>(
      buildApiPath("/listings", {
        q: query,
        status: params.listingStatus,
        page: getPositivePage(params.listingsPage),
        pageSize: 8,
        sortBy: "createdAt",
        sortOrder: "desc"
      }),
      token
    ),
    apiFetchWithToken<PaginatedResponse<Escrow>>(
      buildApiPath("/escrows", {
        q: query,
        status: params.escrowStatus,
        page: getPositivePage(params.escrowsPage),
        pageSize: 6,
        sortBy: "createdAt",
        sortOrder: "desc"
      }),
      token
    ),
    apiFetchWithToken<PaginatedResponse<AuditLog>>(
      buildApiPath("/admin/audit-logs", {
        q: query,
        action: params.auditAction,
        page: getPositivePage(params.auditPage),
        pageSize: 12,
        sortBy: "createdAt",
        sortOrder: "desc"
      }),
      token
    )
  ]);
  const users = usersPage.items;
  const verifications = verificationsPage.items;
  const listings = listingsPage.items;
  const escrows = escrowsPage.items;
  const auditLogs = auditLogsPage.items;

  const listingStatusCounts = overview.listings.byStatus;
  const kycStatusCounts = overview.kyc.byStatus;
  const escrowStatusCounts = overview.escrows.byStatus;

  const summaryCards = [
    { label: "Usuarios", value: overview.users.total.toString() },
    { label: "KYC activos", value: (kycStatusCounts.APPROVED ?? 0).toString() },
    { label: "Listings publicados", value: (listingStatusCounts.PUBLISHED ?? 0).toString() },
    { label: "Escrows abiertos", value: ((escrowStatusCounts.SHIPPED ?? 0) + (escrowStatusCounts.DELIVERED ?? 0) + (escrowStatusCounts.DISPUTED ?? 0)).toString() }
  ];
  const totalGmv = Number(overview.escrows.financials.totalGmv);
  const estimatedRevenue = Number(overview.escrows.financials.estimatedRevenue);
  const avgTicket = Number(overview.escrows.financials.averageTicket);
  const approvedKyc = kycStatusCounts.APPROVED ?? 0;
  const rejectedKyc = kycStatusCounts.REJECTED ?? 0;
  const kycApprovalRate = percentage(approvedKyc, verifications.length);
  const disputeCount = escrowStatusCounts.DISPUTED ?? 0;
  const riskQueue = overview.escrows.riskQueue;
  const publishedListings = listingStatusCounts.PUBLISHED ?? 0;
  const publishedListingRate = percentage(publishedListings, listings.length);
  const executiveKpis = [
    {
      label: "GMV seed",
      value: formatCurrency(totalGmv),
      detail: `${overview.escrows.total} escrows cargados`
    },
    {
      label: "Revenue fee",
      value: formatCurrency(estimatedRevenue),
      detail: "fee teórico de plataforma"
    },
    {
      label: "Ticket promedio",
      value: formatCurrency(avgTicket),
      detail: "monto promedio por escrow"
    },
    {
      label: "Cola de riesgo",
      value: riskQueue.toString(),
      detail: "KYC, listings o escrows a revisar"
    }
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      <section className="rounded-[2rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#082247,#0d3270)] p-8 text-white shadow-[0_22px_80px_rgba(8,34,71,0.24)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
              Console MVP
            </span>
            <div className="space-y-3">
              <h1
                className="text-5xl font-semibold tracking-[-0.04em]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Operacion central del marketplace.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-white/70">
                Panel inicial para revisar adopcion, estados KYC, catalogo y
                escrows sobre la data real del seed.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/10 px-5 py-3 font-semibold"
            >
              Home
            </Link>
            <Link
              href="/market"
              className="rounded-full bg-white px-5 py-3 font-semibold text-[var(--navy)]"
            >
              Ver market
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-[1.5rem] border border-white/10 bg-white/8 p-5">
              <p className="text-sm text-white/60">{card.label}</p>
              <p className="mt-2 text-4xl font-semibold">{card.value}</p>
            </div>
          ))}
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

      <section className="mt-6 rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--navy)]">
              Dashboard ejecutivo
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Señales rápidas para dirección: volumen, revenue, riesgo y salud
              de confianza.
            </p>
          </div>
          <span className="rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-semibold text-[var(--brand-strong)]">
            Seed live data
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {executiveKpis.map((kpi) => (
            <article
              key={kpi.label}
              className="rounded-[1.5rem] border border-[var(--surface-border)] bg-[#f8fbff] p-5"
            >
              <p className="text-sm text-[var(--muted)]">{kpi.label}</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--navy)]">
                {kpi.value}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">{kpi.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-[1.5rem] border border-[var(--surface-border)] bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold text-[var(--navy)]">KYC approval rate</p>
              <p className="font-semibold text-[var(--brand-strong)]">
                {formatPercent(kycApprovalRate)}
              </p>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#edf4ff]">
              <div
                className="h-full rounded-full bg-[var(--brand)]"
                style={{ width: `${kycApprovalRate}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {approvedKyc} aprobados · {rejectedKyc} rechazados
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-[var(--surface-border)] bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold text-[var(--navy)]">Listings publicados</p>
              <p className="font-semibold text-[var(--brand-strong)]">
                {formatPercent(publishedListingRate)}
              </p>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#edf4ff]">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${publishedListingRate}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {publishedListings} publicados sobre {listings.length} listings
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-[var(--surface-border)] bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold text-[var(--navy)]">Disputas activas</p>
              <p className="font-semibold text-[#dc2626]">{disputeCount}</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              La cola de riesgo combina disputas, KYC en revisión y listings en
              revisión para priorizar operación diaria.
            </p>
          </article>
        </div>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Filtros operativos</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Busqueda transversal y recortes por estado para revisar rapido lo
              que importa.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-2 text-sm font-semibold text-[var(--navy)]"
          >
            Limpiar filtros
          </Link>
        </div>

        <form className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input
            className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 text-sm"
            defaultValue={params.q ?? ""}
            name="q"
            placeholder="Buscar usuario, listing, tracking..."
          />
          <select
            className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 text-sm"
            defaultValue={params.userStatus ?? ""}
            name="userStatus"
          >
            <option value="">Usuarios: todos</option>
            <option value="ACTIVE">Usuarios ACTIVE</option>
            <option value="BLOCKED">Usuarios BLOCKED</option>
            <option value="PENDING_REVIEW">Usuarios PENDING_REVIEW</option>
          </select>
          <select
            className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 text-sm"
            defaultValue={params.kycStatus ?? ""}
            name="kycStatus"
          >
            <option value="">KYC: todos</option>
            <option value="APPROVED">KYC APPROVED</option>
            <option value="PENDING">KYC PENDING</option>
            <option value="REQUIRES_REVIEW">KYC REQUIRES_REVIEW</option>
            <option value="REJECTED">KYC REJECTED</option>
          </select>
          <select
            className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 text-sm"
            defaultValue={params.listingStatus ?? ""}
            name="listingStatus"
          >
            <option value="">Listings: todos</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="PAUSED">PAUSED</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="SOLD">SOLD</option>
            <option value="RESERVED">RESERVED</option>
          </select>
          <select
            className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 text-sm"
            defaultValue={params.escrowStatus ?? ""}
            name="escrowStatus"
          >
            <option value="">Escrows: todos</option>
            <option value="FUNDS_HELD">FUNDS_HELD</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="DISPUTED">DISPUTED</option>
            <option value="RELEASED">RELEASED</option>
          </select>
          <button
            className="rounded-2xl bg-[var(--navy)] px-4 py-3 text-sm font-semibold text-white"
            type="submit"
          >
            Aplicar filtros
          </button>
        </form>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Usuarios</h2>
              <span className="text-sm text-[var(--muted)]">{usersPage.meta.total} resultados</span>
            </div>
            <div className="mt-5 space-y-3">
              {users.map((user) => (
                <article
                  key={user.id}
                  className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="font-semibold text-[var(--navy)] transition hover:text-[var(--brand)]"
                      >
                        {user.firstName} {user.lastName}
                      </Link>
                      <p className="text-sm text-[var(--muted)]">{user.email}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {user.city}, {user.province}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--brand-strong)]">
                        {user.kycStatus}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {user.status} · {user.role}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                    <span className="rounded-full bg-white px-3 py-1">
                      listings {user._count.listings}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1">
                      compras {user._count.buyerEscrows}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1">
                      ventas {user._count.sellerEscrows}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1">
                      score {user.reputationScore}
                    </span>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="rounded-full border border-[var(--surface-border)] bg-white px-3 py-1 font-semibold text-[var(--navy)] transition hover:border-[rgba(18,107,255,0.2)] hover:text-[var(--brand)]"
                    >
                      Ver detalle →
                    </Link>
                  </div>
                </article>
              ))}

            </div>
            <PaginationControls
              label="Usuarios"
              meta={usersPage.meta}
              pageKey="usersPage"
              params={params}
            />
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">KYC</h2>
              <span className="text-sm text-[var(--muted)]">
                {verificationsPage.meta.total} resultados
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {verifications.map((verification) => (
                <article
                  key={verification.id}
                  className="rounded-[1.25rem] border border-[var(--surface-border)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--navy)]">
                        {verification.user.firstName} {verification.user.lastName}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        {verification.provider} · {verification.documentType}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--brand-strong)]">
                      {verification.status}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {verification.reviewerNotes ?? "Sin observaciones cargadas."}
                  </p>
                  <ConfirmForm action={reviewKycAction} className="mt-4 flex flex-wrap gap-2">
                    <input name="verificationId" type="hidden" value={verification.id} />
                    <SubmitButton
                      className="rounded-full bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white"
                      confirmMessage="¿Aprobar este KYC y habilitar la operación del usuario?"
                      name="status"
                      pendingLabel="Aprobando..."
                      value="APPROVED"
                    >
                      Aprobar
                    </SubmitButton>
                    <SubmitButton
                      className="rounded-full bg-[#f59e0b] px-3 py-2 text-xs font-semibold text-white"
                      confirmMessage="¿Marcar este KYC como requiere revisión manual?"
                      name="status"
                      pendingLabel="Guardando..."
                      value="REQUIRES_REVIEW"
                    >
                      Pedir revision
                    </SubmitButton>
                    <SubmitButton
                      className="rounded-full bg-[#dc2626] px-3 py-2 text-xs font-semibold text-white"
                      confirmMessage="¿Rechazar este KYC? Esta acción cambia el estado de confianza del usuario."
                      name="status"
                      pendingLabel="Rechazando..."
                      value="REJECTED"
                    >
                      Rechazar
                    </SubmitButton>
                    <input
                      className="min-w-52 flex-1 rounded-full border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2 text-xs text-[var(--foreground)]"
                      defaultValue={
                        verification.reviewerNotes ??
                        "Revision operativa desde consola admin."
                      }
                      name="reviewerNotes"
                    />
                  </ConfirmForm>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    {formatDate(verification.createdAt)}
                  </p>
                </article>
              ))}
            </div>
            <PaginationControls
              label="KYC"
              meta={verificationsPage.meta}
              pageKey="kycPage"
              params={params}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Listings</h2>
              <span className="text-sm text-[var(--muted)]">
                {listingsPage.meta.total} resultados
              </span>
            </div>
            <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-[var(--surface-border)]">
              <table className="min-w-full bg-white text-left text-sm">
                <thead className="bg-[#f5f9ff] text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Titulo</th>
                    <th className="px-4 py-3 font-medium">Vendedor</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Precio</th>
                    <th className="px-4 py-3 font-medium">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id} className="border-t border-[var(--surface-border)]">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[var(--navy)]">{listing.title}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {listing.category} · {listing.locationCity}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-[var(--muted)]">
                        {listing.seller.firstName} {listing.seller.lastName}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-[var(--navy)]">
                        {formatCurrency(listing.price)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            className="rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--navy)]"
                            href={`/admin/listings/${listing.id}`}
                          >
                            Ver detalle
                          </Link>
                          <ConfirmForm action={updateListingStatusAction} className="flex items-center gap-2">
                            <input name="listingId" type="hidden" value={listing.id} />
                            <input name="returnTo" type="hidden" value="/admin" />
                            <select
                              className="rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 text-xs"
                              defaultValue={listing.status}
                              name="status"
                            >
                              <option value="PUBLISHED">PUBLISHED</option>
                              <option value="PAUSED">PAUSED</option>
                              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                              <option value="REMOVED">REMOVED</option>
                              <option value="SOLD">SOLD</option>
                            </select>
                            <SubmitButton
                              className="rounded-full bg-[var(--navy)] px-3 py-2 text-xs font-semibold text-white"
                              confirmMessage="¿Aplicar este cambio de estado al listing?"
                              pendingLabel="Aplicando..."
                            >
                              Aplicar
                            </SubmitButton>
                          </ConfirmForm>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              label="Listings"
              meta={listingsPage.meta}
              pageKey="listingsPage"
              params={params}
            />
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Escrows</h2>
              <span className="text-sm text-[var(--muted)]">
                {escrowsPage.meta.total} resultados
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {escrows.map((escrow) => (
                <article
                  key={escrow.id}
                  className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--navy)]">{escrow.listing.title}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {escrow.buyer.firstName} {escrow.buyer.lastName} →{" "}
                        {escrow.seller.firstName} {escrow.seller.lastName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--brand-strong)]">
                        {escrow.status}
                      </p>
                      <p className="text-lg font-semibold text-[var(--navy)]">
                        {formatCurrency(escrow.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link
                      className="inline-flex rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--navy)]"
                      href={`/admin/escrows/${escrow.id}`}
                    >
                      Ver detalle
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-[var(--muted)] md:grid-cols-3">
                    <p>Carrier: {escrow.shippingProvider}</p>
                    <p>Tracking: {escrow.shippingTrackingCode ?? "Pendiente"}</p>
                    <p>Release: {formatDate(escrow.releaseEligibleAt)}</p>
                  </div>
                  <ConfirmForm action={runEscrowAction} className="mt-4 flex flex-wrap gap-2">
                    <input name="escrowId" type="hidden" value={escrow.id} />
                    <input name="returnTo" type="hidden" value="/admin" />
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
                    {escrow.status !== "DISPUTED" && escrow.status !== "RELEASED" ? (
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
                  </ConfirmForm>
                </article>
              ))}
            </div>
            <PaginationControls
              label="Escrows"
              meta={escrowsPage.meta}
              pageKey="escrowsPage"
              params={params}
            />
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[var(--navy)]">Auditoria admin</h2>
          <span className="text-sm text-[var(--muted)]">
            {auditLogsPage.meta.total} eventos
          </span>
        </div>
        <div className="mt-5 grid gap-3">
          {auditLogs.map((log) => (
            <article
              key={log.id}
              className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--navy)]">{log.action}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {log.resourceType} · {log.resourceId}
                  </p>
                </div>
                <div className="text-right text-sm text-[var(--muted)]">
                  <p>
                    {log.actor.firstName} {log.actor.lastName} · {log.actorRole}
                  </p>
                  <p>{formatDate(log.createdAt)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <PaginationControls
          label="Auditoría"
          meta={auditLogsPage.meta}
          pageKey="auditPage"
          params={params}
        />
      </section>
    </main>
  );
}
