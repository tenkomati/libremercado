import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../../../lib/api";
import { canAccessAdmin, verifySessionToken } from "../../../../lib/auth";
import { formatCurrency, formatDate } from "../../../../lib/format";

import { updateListingStatusAction } from "../../actions";
import { ConfirmForm, SubmitButton } from "../../form-controls";

type ListingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

type ListingDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  status: string;
  price: string;
  aiSuggestedPrice: string | null;
  locationCity: string;
  locationProvince: string;
  publishedAt: string | null;
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    city: string;
    province: string;
    role: string;
    status: string;
    kycStatus: string;
    reputationScore: string;
  };
  images: Array<{
    id: string;
    url: string;
    sortOrder: number;
  }>;
  escrows: Array<{
    id: string;
    status: string;
    amount: string;
    shippingProvider: string;
    shippingTrackingCode: string | null;
    createdAt: string;
    buyer: {
      firstName: string;
      lastName: string;
      email: string;
    };
    seller: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
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

export default async function ListingDetailPage({
  params,
  searchParams
}: ListingDetailPageProps) {
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
  const currentPath = `/admin/listings/${id}`;
  const resolvedSearchParams = (await searchParams) ?? {};

  const [listing, auditLogs] = await Promise.all([
    apiFetchWithToken<ListingDetail>(`/listings/${id}`, token),
    apiFetchWithToken<PaginatedResponse<AuditLog>>(
      `/admin/audit-logs?resourceType=listing&q=${encodeURIComponent(id)}&pageSize=50`,
      token
    )
  ]);

  const listingAuditLogs = auditLogs.items.filter(
    (log) => log.resourceType === "listing" && log.resourceId === id
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
              Listing detail
            </span>
            <h1
              className="text-5xl font-semibold tracking-[-0.04em]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {listing.title}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-white/70">
              {listing.category} · {listing.locationCity}, {listing.locationProvince}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-white/60">Estado</p>
            <p className="mt-2 text-3xl font-semibold">{listing.status}</p>
            <p className="mt-2 text-lg text-white/80">{formatCurrency(listing.price)}</p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Contenido</h2>
            <p className="mt-4 text-base leading-8 text-[var(--muted)]">{listing.description}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listing.images.map((image) => (
                <div
                  key={image.id}
                  className="overflow-hidden rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff]"
                >
                  <img
                    alt={listing.title}
                    className="h-52 w-full object-cover"
                    src={image.url}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Escrows asociados</h2>
              <span className="text-sm text-[var(--muted)]">{listing.escrows.length} eventos</span>
            </div>
            <div className="mt-5 grid gap-3">
              {listing.escrows.map((escrow) => (
                <article
                  key={escrow.id}
                  className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--navy)]">{escrow.status}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {escrow.buyer.firstName} {escrow.buyer.lastName} →{" "}
                        {escrow.seller.firstName} {escrow.seller.lastName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--navy)]">
                        {formatCurrency(escrow.amount)}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        {formatDate(escrow.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-[var(--muted)]">
                      {escrow.shippingProvider}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-[var(--muted)]">
                      {escrow.shippingTrackingCode ?? "Sin tracking"}
                    </span>
                    <Link
                      className="rounded-full border border-[var(--surface-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--navy)]"
                      href={`/admin/escrows/${escrow.id}`}
                    >
                      Ver escrow
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Auditoria</h2>
              <span className="text-sm text-[var(--muted)]">
                {listingAuditLogs.length} eventos
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {listingAuditLogs.map((log) => (
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
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Seller snapshot</h2>
            <div className="mt-5 rounded-[1.25rem] bg-[#f8fbff] p-4">
              <p className="font-semibold text-[var(--navy)]">
                {listing.seller.firstName} {listing.seller.lastName}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{listing.seller.email}</p>
              <p className="text-sm text-[var(--muted)]">
                {listing.seller.city}, {listing.seller.province}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                <span className="rounded-full bg-white px-3 py-1">
                  role {listing.seller.role}
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  status {listing.seller.status}
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  kyc {listing.seller.kycStatus}
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  score {listing.seller.reputationScore}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/80 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Moderacion</h2>
            <div className="mt-5 grid gap-3 text-sm text-[var(--muted)]">
              <p>Condicion: {listing.condition}</p>
              <p>Publicado: {formatDate(listing.publishedAt)}</p>
              <p>IA sugerido: {listing.aiSuggestedPrice ? formatCurrency(listing.aiSuggestedPrice) : "Sin sugerencia"}</p>
            </div>

            <ConfirmForm action={updateListingStatusAction} className="mt-6 flex flex-wrap gap-2">
              <input name="listingId" type="hidden" value={listing.id} />
              <input name="returnTo" type="hidden" value={currentPath} />
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
                Aplicar estado
              </SubmitButton>
            </ConfirmForm>
          </div>
        </div>
      </section>
    </main>
  );
}
