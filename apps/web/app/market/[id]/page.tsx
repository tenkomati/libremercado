import Link from "next/link";
import { cookies } from "next/headers";

import { apiFetch } from "../../../lib/api";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { formatCurrency, formatDate } from "../../../lib/format";
import { getPlatformSettings, calculateSellerNetAmount } from "../../../lib/platform-settings";
import { getProtectedPurchaseSummary } from "../../../lib/protected-purchase-terms";
import { ProtectedPurchaseTerms } from "../../components/protected-purchase-terms";
import { SafeOperationGuides } from "../../components/safe-operation-guides";

import { createProtectedPurchaseAction } from "./actions";

export const dynamic = "force-dynamic";

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
  currency: "ARS" | "USD";
  aiSuggestedPrice: string | null;
  publishedAt: string | null;
  locationCity: string;
  locationProvince: string;
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    city: string;
    province: string;
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
  }>;
};

async function getSession() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export default async function ListingDetailPage({
  params,
  searchParams
}: ListingDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const [listing, session, platformSettings] = await Promise.all([
    apiFetch<ListingDetail>(`/listings/${id}`),
    getSession(),
    getPlatformSettings()
  ]);
  const isAvailable = listing.status === "PUBLISHED";
  const isOwnListing = session?.sub === listing.seller.id;
  const sellerNetPreview = calculateSellerNetAmount(
    Number(listing.price),
    platformSettings
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/market"
          className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold"
        >
          Volver al market
        </Link>
        <Link
          href="/signup"
          className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold"
        >
          Crear cuenta
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

      <section className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[2rem] border border-[var(--surface-border)] bg-white shadow-[0_20px_70px_rgba(8,34,71,0.08)]">
          <div className="relative h-[520px] bg-[linear-gradient(135deg,#dbeafe,#eff6ff)]">
            {listing.images[0] ? (
              <img
                alt={listing.title}
                className="h-full w-full object-cover"
                src={listing.images[0].url}
              />
            ) : null}
            <div className="absolute left-5 top-5 rounded-full bg-[rgba(8,34,71,0.82)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              {listing.category}
            </div>
          </div>
          {listing.images.length > 1 ? (
            <div className="grid grid-cols-3 gap-3 p-4">
              {listing.images.slice(1, 4).map((image) => (
                <img
                  alt={listing.title}
                  className="h-32 rounded-[1.25rem] object-cover"
                  key={image.id}
                  src={image.url}
                />
              ))}
            </div>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-[var(--surface-border)] bg-white/88 p-7 shadow-[0_20px_70px_rgba(8,34,71,0.07)]">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                {listing.status}
              </span>
              <span className="rounded-full bg-[#f5f9ff] px-3 py-1 text-xs font-semibold text-[var(--navy)]">
                {listing.condition}
              </span>
            </div>

            <h1
              className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-[var(--navy)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {listing.title}
            </h1>
            <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
              {listing.description}
            </p>

            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-[var(--muted)]">Precio protegido</p>
                <p className="text-4xl font-semibold text-[var(--brand-strong)]">
                  {formatCurrency(listing.price, listing.currency)}
                </p>
              </div>
              <div className="text-right text-sm text-[var(--muted)]">
                <p>{listing.locationCity}</p>
                <p>{listing.locationProvince}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-[rgba(18,107,255,0.12)] bg-[#f5f9ff] p-4 text-sm text-[var(--navy)]">
              <div className="flex items-center justify-between gap-3">
                <span>Publicar es gratis</span>
                <strong>$0 costo fijo</strong>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span>Comprador paga</span>
                <strong>{formatCurrency(listing.price, listing.currency)}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span>Comisión vendedor</span>
                <strong>{sellerNetPreview.commissionPercentage}% al vender</strong>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span>Vendedor recibe estimado</span>
                <strong>{formatCurrency(sellerNetPreview.netAmount, listing.currency)}</strong>
              </div>
            </div>

            {session && isAvailable && !isOwnListing ? (
              <form action={createProtectedPurchaseAction} className="mt-7">
                <input name="listingId" type="hidden" value={listing.id} />
                <button
                  className="w-full rounded-full bg-[var(--brand)] px-5 py-4 font-semibold text-white shadow-[0_14px_40px_rgba(18,107,255,0.24)] transition hover:bg-[var(--brand-strong)]"
                  type="submit"
                >
                  Comprar con pago protegido
                </button>
              </form>
            ) : null}

            {!session ? (
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <Link
                  className="rounded-full bg-[var(--brand)] px-5 py-4 text-center font-semibold text-white"
                  href={`/login?next=/market/${listing.id}`}
                >
                  Iniciar sesión para comprar
                </Link>
                <Link
                  className="rounded-full border border-[var(--surface-border)] bg-white px-5 py-4 text-center font-semibold text-[var(--navy)]"
                  href={`/signup?next=/market/${listing.id}`}
                >
                  Crear cuenta
                </Link>
              </div>
            ) : null}

            {isOwnListing ? (
              <div className="mt-7 rounded-[1.5rem] bg-[#f5f9ff] p-4 text-sm leading-6 text-[var(--muted)]">
                Esta publicación es tuya. No podés iniciar una compra sobre tu
                propio producto.
              </div>
            ) : null}

            {!isAvailable ? (
              <div className="mt-7 rounded-[1.5rem] bg-[#fff7ed] p-4 text-sm leading-6 text-[#92400e]">
                Esta publicación no está disponible para compra directa en este
                momento.
              </div>
            ) : null}
          </section>

          <section className="rounded-[2rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#f8fbff,#eaf2ff)] p-6">
            <h2 className="text-xl font-semibold text-[var(--navy)]">
              Vendedor verificado
            </h2>
            <div className="mt-4 rounded-[1.5rem] bg-white p-5">
              <p className="text-lg font-semibold text-[var(--navy)]">
                {listing.seller.firstName} {listing.seller.lastName}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {listing.seller.city}, {listing.seller.province}
              </p>
              <div className="mt-4 grid gap-2 text-sm text-[var(--navy)]">
                <div className="flex justify-between">
                  <span>Identidad</span>
                  <strong>{listing.seller.kycStatus}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Reputación</span>
                  <strong>{listing.seller.reputationScore}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Publicado</span>
                  <strong>{formatDate(listing.publishedAt)}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[var(--surface-border)] bg-white/88 p-6">
            <h2 className="text-xl font-semibold text-[var(--navy)]">
              Cómo te protege libremercado
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {getProtectedPurchaseSummary()}
            </p>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--muted)]">
              <p>1. El pago queda retenido de forma segura.</p>
              <p>2. El vendedor despacha o coordina entrega segura.</p>
              <p>3. La operación registra eventos y auditoría.</p>
              <p>4. Los fondos se liberan cuando la entrega queda validada.</p>
            </div>
          </section>

          <ProtectedPurchaseTerms compact title="Antes de comprar, estas son las reglas" />

          <SafeOperationGuides compact mode="buyer" />
        </aside>
      </section>
    </main>
  );
}
