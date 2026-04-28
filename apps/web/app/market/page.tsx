import Link from "next/link";

import { apiFetch } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { formatPublicUserCode } from "../../lib/public-ids";
import { getKycStatusLabel, getListingConditionLabel } from "../../lib/status-labels";

import { ReputationStars } from "../components/reputation-stars";
import { SafeOperationGuides } from "../components/safe-operation-guides";

export const dynamic = "force-dynamic";

type MarketPageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
};

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
    id: string;
    publicSerial: number;
    kycStatus: string;
    reputationScore: string;
  };
  images: Array<{
    url: string;
  }>;
};

type PaginatedResponse<T> = {
  items: T[];
  meta: {
    total: number;
  };
};

const highlights = [
  "Publicaciones con identidad validada",
  "Pago protegido y eventos trazables",
  "Exploración rápida desde desktop y mobile"
];

function buildMarketQuery(params: {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
}) {
  const query = new URLSearchParams({
    status: "PUBLISHED",
    pageSize: "48",
    sortBy: "publishedAt",
    sortOrder: "desc"
  });

  if (params.q?.trim()) {
    query.set("q", params.q.trim());
  }

  if (params.category?.trim()) {
    query.set("category", params.category.trim());
  }

  if (params.minPrice?.trim()) {
    query.set("minPrice", params.minPrice.trim());
  }

  if (params.maxPrice?.trim()) {
    query.set("maxPrice", params.maxPrice.trim());
  }

  return query.toString();
}

function makeFilterHref(
  current: {
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
  },
  overrides: Partial<{
    q: string;
    category: string;
    minPrice: string;
    maxPrice: string;
  }>
) {
  const next = { ...current, ...overrides };
  const params = new URLSearchParams();

  if (next.q?.trim()) {
    params.set("q", next.q.trim());
  }

  if (next.category?.trim()) {
    params.set("category", next.category.trim());
  }

  if (next.minPrice?.trim()) {
    params.set("minPrice", next.minPrice.trim());
  }

  if (next.maxPrice?.trim()) {
    params.set("maxPrice", next.maxPrice.trim());
  }

  const suffix = params.toString();
  return suffix ? `/market?${suffix}` : "/market";
}

function MarketSearchBar({
  q,
  category,
  minPrice,
  maxPrice
}: {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
}) {
  return (
    <form
      action="/market"
      className="rounded-[1.75rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#0b2247,#13366f)] p-4 text-white shadow-[0_18px_60px_rgba(8,34,71,0.22)] sm:p-5"
      method="GET"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_220px_220px_220px_auto]">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
          Buscar
          <input
            className="rounded-full border border-white/12 bg-white px-4 py-3 text-sm font-medium text-[var(--navy)] placeholder:text-slate-400"
            defaultValue={q ?? ""}
            name="q"
            placeholder="Buscar por producto, categoría o ubicación"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
          Categoría
          <input name="category" type="hidden" value={category ?? ""} />
          <div className="rounded-full border border-white/12 bg-white px-4 py-3 text-sm font-medium text-slate-500">
            Usá los filtros de la izquierda
          </div>
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
          Precio mínimo
          <input
            className="rounded-full border border-white/12 bg-white px-4 py-3 text-sm font-medium text-[var(--navy)] placeholder:text-slate-400"
            defaultValue={minPrice ?? ""}
            inputMode="decimal"
            name="minPrice"
            placeholder="Ej: 150000"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
          Precio máximo
          <input
            className="rounded-full border border-white/12 bg-white px-4 py-3 text-sm font-medium text-[var(--navy)] placeholder:text-slate-400"
            defaultValue={maxPrice ?? ""}
            inputMode="decimal"
            name="maxPrice"
            placeholder="Ej: 1000000"
          />
        </label>

        <div className="flex items-end gap-2">
          <button className="w-full rounded-full bg-[#f59e0b] px-5 py-3 text-sm font-semibold text-[#1f2937]" type="submit">
            Buscar
          </button>
        </div>
      </div>
    </form>
  );
}

function FilterSidebar({
  categories,
  selectedCategory,
  currentFilters
}: {
  categories: string[];
  selectedCategory?: string;
  currentFilters: {
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
  };
}) {
  const priceLinks = [
    { label: "Hasta $200.000", minPrice: "", maxPrice: "200000" },
    { label: "$200.000 a $800.000", minPrice: "200000", maxPrice: "800000" },
    { label: "$800.000 a $1.500.000", minPrice: "800000", maxPrice: "1500000" },
    { label: "Más de $1.500.000", minPrice: "1500000", maxPrice: "" }
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] border border-[var(--surface-border)] bg-white p-5 shadow-[0_14px_40px_rgba(8,34,71,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
          Filtrar por categoría
        </p>
        <div className="mt-4 grid gap-2">
          <Link
            className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
              !selectedCategory
                ? "bg-[var(--navy)] text-white"
                : "bg-[#f5f9ff] text-[var(--navy)] hover:bg-[#e8f1ff]"
            }`}
            href={makeFilterHref(currentFilters, { category: "" })}
          >
            Todas las categorías
          </Link>
          {categories.map((category) => (
            <Link
              className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                selectedCategory === category
                  ? "bg-[var(--navy)] text-white"
                  : "bg-[#f5f9ff] text-[var(--navy)] hover:bg-[#e8f1ff]"
              }`}
              href={makeFilterHref(currentFilters, { category })}
              key={category}
            >
              {category}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-[var(--surface-border)] bg-white p-5 shadow-[0_14px_40px_rgba(8,34,71,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
          Filtrar por precio
        </p>
        <div className="mt-4 grid gap-2">
          {priceLinks.map((item) => (
            <Link
              className="rounded-2xl bg-[#f5f9ff] px-3 py-2 text-sm font-medium text-[var(--navy)] transition hover:bg-[#e8f1ff]"
              href={makeFilterHref(currentFilters, {
                minPrice: item.minPrice,
                maxPrice: item.maxPrice
              })}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
          <Link
            className="rounded-2xl px-3 py-2 text-sm font-medium text-[var(--brand-strong)] underline"
            href={makeFilterHref(currentFilters, { minPrice: "", maxPrice: "" })}
          >
            Limpiar rango
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const currentFilters = {
    q: resolvedSearchParams.q,
    category: resolvedSearchParams.category,
    minPrice: resolvedSearchParams.minPrice,
    maxPrice: resolvedSearchParams.maxPrice
  };

  const [listingsPage, categoriesPage] = await Promise.all([
    apiFetch<PaginatedResponse<Listing>>(`/listings?${buildMarketQuery(currentFilters)}`),
    apiFetch<PaginatedResponse<Listing>>(
      "/listings?status=PUBLISHED&pageSize=100&sortBy=publishedAt&sortOrder=desc"
    )
  ]);

  const listings = listingsPage.items;
  const categories = Array.from(
    new Set(categoriesPage.items.map((listing) => listing.category).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <section className="rounded-[2rem] border border-[var(--surface-border)] bg-white/80 p-6 shadow-[0_20px_70px_rgba(8,34,71,0.07)] sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--brand-strong)]">
              Market live
            </span>
            <div className="space-y-3">
              <h1
                className="text-4xl font-semibold tracking-[-0.04em] text-[var(--navy)] sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Explorá el market con búsqueda y filtros reales.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
                Buscá arriba como en un marketplace grande, filtrá por categoría o precio
                y entrá a la ficha sin necesidad de iniciar sesión.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/" className="button-secondary">
              Volver al home
            </Link>
            <Link href="/signup?next=/market" className="button-primary">
              Crear cuenta
            </Link>
            <Link href="/account" className="button-secondary">
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

      <section className="mt-6">
        <MarketSearchBar
          category={currentFilters.category}
          maxPrice={currentFilters.maxPrice}
          minPrice={currentFilters.minPrice}
          q={currentFilters.q}
        />
      </section>

      <section className="mt-6 lg:hidden">
        <details className="rounded-[1.5rem] border border-[var(--surface-border)] bg-white p-4 shadow-[0_14px_40px_rgba(8,34,71,0.06)]">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
            Filtros
          </summary>
          <div className="mt-4">
            <FilterSidebar
              categories={categories}
              currentFilters={currentFilters}
              selectedCategory={currentFilters.category}
            />
          </div>
        </details>
      </section>

      <section className="mt-8">
        <SafeOperationGuides compact mode="buyer" />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <FilterSidebar
            categories={categories}
            currentFilters={currentFilters}
            selectedCategory={currentFilters.category}
          />
        </aside>

        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[var(--surface-border)] bg-white p-4 shadow-[0_14px_40px_rgba(8,34,71,0.06)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                Resultados
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--navy)]">
                {listingsPage.meta.total} publicaciones encontradas
              </p>
            </div>

            {(currentFilters.q || currentFilters.category || currentFilters.minPrice || currentFilters.maxPrice) ? (
              <div className="flex flex-wrap gap-2">
                {currentFilters.q ? (
                  <span className="rounded-full bg-[#f5f9ff] px-3 py-2 text-xs font-semibold text-[var(--navy)]">
                    Búsqueda: {currentFilters.q}
                  </span>
                ) : null}
                {currentFilters.category ? (
                  <span className="rounded-full bg-[#f5f9ff] px-3 py-2 text-xs font-semibold text-[var(--navy)]">
                    Categoría: {currentFilters.category}
                  </span>
                ) : null}
                {currentFilters.minPrice || currentFilters.maxPrice ? (
                  <span className="rounded-full bg-[#f5f9ff] px-3 py-2 text-xs font-semibold text-[var(--navy)]">
                    Precio: {currentFilters.minPrice || "0"} a {currentFilters.maxPrice || "sin tope"}
                  </span>
                ) : null}
                <Link className="rounded-full px-3 py-2 text-xs font-semibold text-[var(--brand-strong)] underline" href="/market">
                  Limpiar filtros
                </Link>
              </div>
            ) : null}
          </div>

          {listings.length > 0 ? (
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                        <span>ID vendedor</span>
                        <span className="font-semibold">
                          {formatPublicUserCode(listing.seller.publicSerial)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Condición</span>
                        <span className="font-semibold">
                          {getListingConditionLabel(listing.condition)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Identidad</span>
                        <span className="font-semibold">
                          {getKycStatusLabel(listing.seller.kycStatus)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Reputación</span>
                        <ReputationStars
                          score={listing.seller.reputationScore}
                          sizeClassName="text-sm"
                          textClassName="text-xs text-[var(--muted)]"
                        />
                      </div>
                    </div>

                    <Link className="button-primary w-full" href={`/market/${listing.id}`}>
                      Ver detalle
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white p-8 text-center shadow-[0_16px_50px_rgba(8,34,71,0.06)]">
              <p className="text-2xl font-semibold text-[var(--navy)]">
                No encontramos publicaciones con esos filtros
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Probá ampliar el rango de precio, limpiar la categoría o usar una búsqueda más general.
              </p>
              <Link className="button-primary mt-6 inline-flex" href="/market">
                Ver todo el market
              </Link>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
