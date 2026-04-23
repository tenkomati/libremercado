import Link from "next/link";

import { apiFetch } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

import { SafeOperationGuides } from "../components/safe-operation-guides";

export const dynamic = "force-dynamic";

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  status: string;
  price: string;
  currency: "ARS" | "USD";
  locationProvince: string;
  locationCity: string;
  seller: {
    firstName: string;
    lastName: string;
    city: string;
    province: string;
    reputationScore: string;
    kycStatus: string;
  };
  images: Array<{
    url: string;
  }>;
  _count: {
    escrows: number;
  };
};

type PaginatedResponse<T> = {
  items: T[];
};

const highlights = [
  "Publicaciones con identidad validada",
  "Cobertura nacional con foco en cercania",
  "Pago protegido y eventos trazables"
];

export default async function MarketPage() {
  const listingsPage = await apiFetch<PaginatedResponse<Listing>>(
    "/listings?status=PUBLISHED&pageSize=24&sortBy=publishedAt&sortOrder=desc"
  );
  const listings = listingsPage.items;

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      <section className="rounded-[2rem] border border-[var(--surface-border)] bg-white/80 p-8 shadow-[0_20px_70px_rgba(8,34,71,0.07)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--brand-strong)]">
              Market live
            </span>
            <div className="space-y-3">
              <h1
                className="text-5xl font-semibold tracking-[-0.04em] text-[var(--navy)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Catalogo inicial conectado a datos reales.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-[var(--muted)]">
                Esta vista ya consume el seed cargado sobre la base y muestra
                publicaciones reales del MVP con vendedor verificado, precio y
                ubicacion.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-[var(--surface-border)] bg-white px-5 py-3 font-semibold"
            >
              Volver al home
            </Link>
            <Link
              href="/admin"
              className="rounded-full bg-[var(--brand)] px-5 py-3 font-semibold text-white"
            >
              Ver consola admin
            </Link>
            <Link
              href="/signup?next=/market"
              className="rounded-full bg-[var(--navy)] px-5 py-3 font-semibold text-white"
            >
              Crear cuenta
            </Link>
            <Link
              href="/account"
              className="rounded-full border border-[var(--surface-border)] bg-white px-5 py-3 font-semibold"
            >
              Mi cuenta
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {highlights.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[rgba(18,107,255,0.14)] bg-[#f5f9ff] px-4 py-2 text-sm text-[var(--navy)]"
            >
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SafeOperationGuides compact mode="buyer" />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <article
            key={listing.id}
            className="overflow-hidden rounded-[1.75rem] border border-[var(--surface-border)] bg-white shadow-[0_16px_50px_rgba(8,34,71,0.06)]"
          >
            <div className="relative h-64 bg-[linear-gradient(135deg,#dbeafe,#eff6ff)]">
              {listing.images[0] ? (
                <img
                  alt={listing.title}
                  className="h-full w-full object-cover"
                  src={listing.images[0].url}
                />
              ) : null}
              <div className="absolute left-4 top-4 rounded-full bg-[rgba(8,34,71,0.78)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                {listing.category}
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-[var(--navy)]">
                  {listing.title}
                </h2>
                <p className="line-clamp-3 text-sm leading-6 text-[var(--muted)]">
                  {listing.description}
                </p>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--muted)]">Precio</p>
                  <p className="text-3xl font-semibold text-[var(--brand-strong)]">
                    {formatCurrency(listing.price, listing.currency)}
                  </p>
                </div>
                <div className="text-right text-sm text-[var(--muted)]">
                  <p>{listing.locationCity}</p>
                  <p>{listing.locationProvince}</p>
                </div>
              </div>

              <div className="grid gap-3 rounded-[1.25rem] bg-[#f5f9ff] p-4 text-sm text-[var(--navy)]">
                <div className="flex items-center justify-between">
                  <span>Vendedor</span>
                  <span className="font-semibold">
                    {listing.seller.firstName} {listing.seller.lastName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Condicion</span>
                  <span className="font-semibold">{listing.condition}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Identidad</span>
                  <span className="font-semibold">{listing.seller.kycStatus}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Operaciones</span>
                  <span className="font-semibold">{listing._count.escrows}</span>
                </div>
              </div>

              <Link
                className="inline-flex w-full justify-center rounded-full bg-[var(--navy)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--brand-strong)]"
                href={`/market/${listing.id}`}
              >
                Ver detalle y comprar protegido
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
