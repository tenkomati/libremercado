import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../../../lib/api";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { formatCurrency, formatDate } from "../../../../lib/format";
import { getPlatformSettings } from "../../../../lib/platform-settings";
import { getEscrowStatusLabel, getListingStatusLabel } from "../../../../lib/status-labels";

import { updateOwnListingAction, updateOwnListingStatusAction } from "../../actions";
import { FeePreview } from "../fee-preview";
import { ListingImageUpload } from "../../listing-image-upload";

type AccountListingPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

type ListingDetail = {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  status: string;
  price: string;
  currency: "ARS" | "USD";
  locationCity: string;
  locationProvince: string;
  publishedAt: string | null;
  createdAt: string;
  images: Array<{
    id: string;
    url: string;
    sortOrder: number;
  }>;
  escrows: Array<{
    id: string;
    status: string;
    amount: string;
    currency: "ARS" | "USD";
    feePercentage: string;
    feeAmount: string;
    netAmount: string;
    createdAt: string;
    buyer: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
};

async function getListing(id: string) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect(`/login?next=/account/listings/${id}`);
  }

  let session;

  try {
    session = await verifySessionToken(token);
  } catch {
    redirect(`/login?next=/account/listings/${id}`);
  }

  const listing = await apiFetchWithToken<ListingDetail>(`/listings/${id}`, token);

  if (listing.sellerId !== session.sub && session.role === "USER") {
    redirect("/account");
  }

  return listing;
}

export default async function AccountListingPage({
  params,
  searchParams
}: AccountListingPageProps) {
  const { id } = await params;
  const [listing, resolvedSearchParams, platformSettings] = await Promise.all([
    getListing(id),
    (searchParams ?? Promise.resolve({})) as Promise<{
      success?: string;
      error?: string;
    }>,
    getPlatformSettings()
  ]);
  const imageUrl = listing.images[0]?.url ?? "";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-10 lg:px-12">
      <div className="flex flex-wrap gap-3">
        <Link href="/account" className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold">
          Volver a mi cuenta
        </Link>
        <Link href={`/market/${listing.id}`} className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold">
          Ver público
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

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-[var(--surface-border)] bg-white">
            <div className="h-80 bg-[linear-gradient(135deg,#dbeafe,#eff6ff)]">
              {imageUrl ? (
                <img alt={listing.title} className="h-full w-full object-cover" src={imageUrl} />
              ) : null}
            </div>
            <div className="p-6">
              <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                {getListingStatusLabel(listing.status)}
              </span>
              <h1
                className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--navy)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {listing.title}
              </h1>
              <p className="mt-3 text-3xl font-semibold text-[var(--brand-strong)]">
                {formatCurrency(listing.price, listing.currency)}
              </p>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Creada: {formatDate(listing.createdAt)} · Publicada: {formatDate(listing.publishedAt)}
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Estado</h2>
            <form action={updateOwnListingStatusAction} className="mt-5 grid gap-3">
              <input name="listingId" type="hidden" value={listing.id} />
              {listing.status !== "PAUSED" ? (
                <button
                  className="rounded-full border border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.08)] px-4 py-3 text-sm font-semibold text-[#92400e]"
                  name="status"
                  type="submit"
                  value="PAUSED"
                >
                  Pausar publicación
                </button>
              ) : null}
              {listing.status !== "PUBLISHED" ? (
                <button
                  className="rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white"
                  name="status"
                  type="submit"
                  value="PUBLISHED"
                >
                  Reactivar publicación
                </button>
              ) : null}
            </form>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Interés y operaciones</h2>
            <div className="mt-5 grid gap-3">
              {listing.escrows.map((escrow) => (
                <article className="rounded-[1.25rem] bg-[#f8fbff] p-4" key={escrow.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--navy)]">
                        {escrow.buyer.firstName} {escrow.buyer.lastName}
                      </p>
                      <p className="text-sm text-[var(--muted)]">{escrow.buyer.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--brand-strong)]">{getEscrowStatusLabel(escrow.status)}</p>
                      <p className="font-semibold text-[var(--navy)]">{formatCurrency(escrow.amount, escrow.currency)}</p>
                      <p className="text-xs text-[var(--muted)]">
                        Neto {formatCurrency(escrow.netAmount, escrow.currency)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
              {listing.escrows.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Todavía no hay operaciones sobre esta publicación.</p>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="rounded-[2rem] border border-[var(--surface-border)] bg-white/88 p-8 shadow-[0_24px_80px_rgba(8,34,71,0.08)]">
          <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--brand-strong)]">
            Editar publicación
          </span>
          <h2
            className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--navy)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ajustá la información pública del producto.
          </h2>

          <form action={updateOwnListingAction} className="mt-8 grid gap-5">
            <input name="listingId" type="hidden" value={listing.id} />
            <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
              Título
              <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" defaultValue={listing.title} name="title" required />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
              Descripción
              <textarea className="min-h-40 rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" defaultValue={listing.description} name="description" required />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                Categoría
                <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" defaultValue={listing.category} name="category" required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                Condición
                <select className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" defaultValue={listing.condition} name="condition" required>
                  <option value="LIKE_NEW">Como nuevo</option>
                  <option value="VERY_GOOD">Muy bueno</option>
                  <option value="GOOD">Bueno</option>
                  <option value="FAIR">Con detalles</option>
                  <option value="NEW">Nuevo</option>
                </select>
              </label>
            </div>

            <FeePreview
              defaultCurrency={listing.currency}
              defaultPrice={Number(listing.price)}
              settings={platformSettings}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                Provincia
                <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" defaultValue={listing.locationProvince} name="locationProvince" required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                Ciudad
                <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" defaultValue={listing.locationCity} name="locationCity" required />
              </label>
            </div>

            <ListingImageUpload defaultUrl={imageUrl} />

            <button className="rounded-full bg-[var(--brand)] px-5 py-4 font-semibold text-white transition hover:bg-[var(--brand-strong)]" type="submit">
              Guardar cambios
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
