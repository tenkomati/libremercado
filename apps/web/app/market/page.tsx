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
    condition?: string;
    brand?: string;
    currency?: string;
    year?: string;
    specKey?: string;
    specValue?: string;
    shutterCount?: string;
    batteryHealth?: string;
    storage?: string;
    memory?: string;
    wheelSize?: string;
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

type FacetOption = {
  value: string;
  label: string;
  count: number;
};

type DynamicFacetGroup = {
  key: string;
  label: string;
  options: FacetOption[];
};

type ListingsResponse = {
  items: Listing[];
  facets: {
    categories: FacetOption[];
    conditions: FacetOption[];
    brands: FacetOption[];
    currencies: FacetOption[];
    years: FacetOption[];
    dynamicSpecs: DynamicFacetGroup[];
  };
  meta: {
    total: number;
  };
};

type PaginatedResponse<T> = {
  items: T[];
  meta: {
    total: number;
  };
};

type FilterState = {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  condition?: string;
  brand?: string;
  currency?: string;
  year?: string;
  specKey?: string;
  specValue?: string;
  shutterCount?: string;
  batteryHealth?: string;
  storage?: string;
  memory?: string;
  wheelSize?: string;
};

const highlights = [
  "Búsqueda unificada con categorías y facetas dinámicas",
  "Publicaciones con identidad validada y precio protegido",
  "Exploración rápida desde desktop y mobile"
];

const categorySpecificFilters: Record<
  string,
  Array<{
    key: "brand" | "shutterCount" | "batteryHealth" | "storage" | "memory" | "wheelSize";
    title: string;
  }>
> = {
  fotografia: [
    { key: "brand", title: "Marca" },
    { key: "shutterCount", title: "Cantidad de disparos" }
  ],
  celulares: [
    { key: "brand", title: "Marca" },
    { key: "batteryHealth", title: "% de batería" },
    { key: "storage", title: "Almacenamiento (GB)" }
  ],
  computacion: [
    { key: "brand", title: "Marca" },
    { key: "storage", title: "Almacenamiento (GB)" },
    { key: "memory", title: "Memoria" }
  ],
  bicicletas: [
    { key: "brand", title: "Marca" },
    { key: "wheelSize", title: "Rodado" }
  ]
};

function buildMarketQuery(params: FilterState) {
  const query = new URLSearchParams({
    status: "PUBLISHED",
    pageSize: "48",
    sortBy: params.q?.trim() ? "publishedAt" : "publishedAt",
    sortOrder: "desc"
  });

  for (const [key, value] of Object.entries(params)) {
    if (value?.trim()) {
      query.set(key, value.trim());
    }
  }

  return query.toString();
}

function makeFilterHref(current: FilterState, overrides: Partial<FilterState>) {
  const next = { ...current, ...overrides };
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(next)) {
    if (value?.trim()) {
      params.set(key, value.trim());
    }
  }

  const suffix = params.toString();
  return suffix ? `/market?${suffix}` : "/market";
}

function MarketHeaderSearch({
  categories,
  currentFilters
}: {
  categories: string[];
  currentFilters: FilterState;
}) {
  return (
    <header className="sticky top-0 z-20 rounded-[2rem] border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,#0b2247,#13366f)] px-4 py-4 text-white shadow-[0_18px_60px_rgba(8,34,71,0.28)] sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-lg font-semibold text-white"
          >
            lm
          </Link>
          <div>
            <p className="text-base font-semibold tracking-tight">libremercado market</p>
            <p className="text-xs text-white/65">Usados premium con búsqueda y filtros inteligentes</p>
          </div>
        </div>

        <form
          action="/market"
          className="grid min-w-0 flex-1 gap-3 lg:max-w-4xl lg:grid-cols-[220px_minmax(0,1fr)_auto]"
          method="GET"
        >
          <label className="sr-only" htmlFor="market-category">
            Categoría
          </label>
          <select
            className="rounded-full border border-white/14 bg-white px-4 py-3 text-sm font-medium text-[var(--navy)]"
            defaultValue={currentFilters.category ?? ""}
            id="market-category"
            name="category"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="market-query">
            Buscar
          </label>
          <input
            className="rounded-full border border-white/14 bg-white px-5 py-3 text-sm font-medium text-[var(--navy)] placeholder:text-slate-400"
            defaultValue={currentFilters.q ?? ""}
            id="market-query"
            name="q"
            placeholder="Buscar productos, marcas o necesidades concretas"
          />

          <button
            className="rounded-full bg-[#f59e0b] px-6 py-3 text-sm font-semibold text-[#1f2937] shadow-[0_10px_24px_rgba(245,158,11,0.22)]"
            type="submit"
          >
            Buscar
          </button>

          {currentFilters.condition ? <input name="condition" type="hidden" value={currentFilters.condition} /> : null}
          {currentFilters.brand ? <input name="brand" type="hidden" value={currentFilters.brand} /> : null}
          {currentFilters.currency ? <input name="currency" type="hidden" value={currentFilters.currency} /> : null}
          {currentFilters.year ? <input name="year" type="hidden" value={currentFilters.year} /> : null}
          {currentFilters.minPrice ? <input name="minPrice" type="hidden" value={currentFilters.minPrice} /> : null}
          {currentFilters.maxPrice ? <input name="maxPrice" type="hidden" value={currentFilters.maxPrice} /> : null}
          {currentFilters.specKey ? <input name="specKey" type="hidden" value={currentFilters.specKey} /> : null}
          {currentFilters.specValue ? <input name="specValue" type="hidden" value={currentFilters.specValue} /> : null}
          {currentFilters.shutterCount ? <input name="shutterCount" type="hidden" value={currentFilters.shutterCount} /> : null}
          {currentFilters.batteryHealth ? <input name="batteryHealth" type="hidden" value={currentFilters.batteryHealth} /> : null}
          {currentFilters.storage ? <input name="storage" type="hidden" value={currentFilters.storage} /> : null}
          {currentFilters.memory ? <input name="memory" type="hidden" value={currentFilters.memory} /> : null}
          {currentFilters.wheelSize ? <input name="wheelSize" type="hidden" value={currentFilters.wheelSize} /> : null}
        </form>
      </div>
    </header>
  );
}

function FilterSection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-[var(--surface-border)] bg-white p-5 shadow-[0_14px_40px_rgba(8,34,71,0.06)]">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
        {title}
      </h3>
      <div className="mt-4 grid gap-2">{children}</div>
    </section>
  );
}

function FacetLink({
  href,
  active,
  children
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-[var(--navy)] !text-white"
          : "bg-[#f5f9ff] text-[var(--navy)] hover:bg-[#e8f1ff]"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

function FilterSidebar({
  facets,
  currentFilters
}: {
  facets: ListingsResponse["facets"];
  currentFilters: FilterState;
}) {
  const selectedCategory = currentFilters.category?.trim();
  const normalizedCategory = selectedCategory?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const categoryConfig = normalizedCategory ? categorySpecificFilters[normalizedCategory] ?? [] : [];
  const dynamicFacetByKey = new Map(facets.dynamicSpecs.map((group) => [group.key, group]));

  const extraFilterSections = categoryConfig
    .map((config) => {
      if (config.key === "brand") {
        return {
          key: config.key,
          title: config.title,
          options: facets.brands,
          currentValue: currentFilters.brand ?? "",
          clearOverrides: { brand: "" },
          makeOverrides: (value: string) => ({ brand: value })
        };
      }

      const group = dynamicFacetByKey.get(config.key);

      if (!group) {
        return null;
      }

      const currentValue = currentFilters[config.key] ?? "";

      return {
        key: config.key,
        title: config.title,
        options: group.options,
        currentValue,
        clearOverrides: { [config.key]: "" },
        makeOverrides: (value: string) => ({ [config.key]: value })
      };
    })
    .filter(Boolean) as Array<{
    key: string;
    title: string;
    options: FacetOption[];
    currentValue: string;
    clearOverrides: Partial<FilterState>;
    makeOverrides: (value: string) => Partial<FilterState>;
  }>;

  return (
    <aside className="space-y-5">
      <FilterSection title="Categorías">
        <FacetLink
          active={!currentFilters.category}
          href={makeFilterHref(currentFilters, {
            category: "",
            brand: "",
            specKey: "",
            specValue: "",
            shutterCount: "",
            batteryHealth: "",
            storage: "",
            memory: "",
            wheelSize: ""
          })}
        >
          Todas
        </FacetLink>
        {facets.categories.map((option) => (
          <FacetLink
            active={currentFilters.category === option.value}
            href={makeFilterHref(currentFilters, {
              category: option.value,
              brand: "",
              specKey: "",
              specValue: "",
              shutterCount: "",
              batteryHealth: "",
              storage: "",
              memory: "",
              wheelSize: ""
            })}
            key={option.value}
          >
            {option.label} ({option.count})
          </FacetLink>
        ))}
      </FilterSection>

      <FilterSection title="Precio">
        <FacetLink
          active={!currentFilters.minPrice && !currentFilters.maxPrice}
          href={makeFilterHref(currentFilters, { minPrice: "", maxPrice: "" })}
        >
          Todos los precios
        </FacetLink>
        <FacetLink
          active={currentFilters.maxPrice === "200000" && !currentFilters.minPrice}
          href={makeFilterHref(currentFilters, { minPrice: "", maxPrice: "200000" })}
        >
          Hasta $200.000
        </FacetLink>
        <FacetLink
          active={currentFilters.minPrice === "200000" && currentFilters.maxPrice === "800000"}
          href={makeFilterHref(currentFilters, { minPrice: "200000", maxPrice: "800000" })}
        >
          $200.000 a $800.000
        </FacetLink>
        <FacetLink
          active={currentFilters.minPrice === "800000" && currentFilters.maxPrice === "1500000"}
          href={makeFilterHref(currentFilters, { minPrice: "800000", maxPrice: "1500000" })}
        >
          $800.000 a $1.500.000
        </FacetLink>
        <FacetLink
          active={currentFilters.minPrice === "1500000" && !currentFilters.maxPrice}
          href={makeFilterHref(currentFilters, { minPrice: "1500000", maxPrice: "" })}
        >
          Más de $1.500.000
        </FacetLink>
      </FilterSection>

      <FilterSection title="Condición">
        <FacetLink
          active={!currentFilters.condition}
          href={makeFilterHref(currentFilters, { condition: "" })}
        >
          Todas
        </FacetLink>
        {facets.conditions.map((option) => (
          <FacetLink
            active={currentFilters.condition === option.value}
            href={makeFilterHref(currentFilters, { condition: option.value })}
            key={option.value}
          >
            {option.label} ({option.count})
          </FacetLink>
        ))}
      </FilterSection>

      {selectedCategory
        ? extraFilterSections.map((section) => (
            <FilterSection key={section.key} title={section.title}>
              <FacetLink
                active={!section.currentValue}
                href={makeFilterHref(currentFilters, section.clearOverrides)}
              >
                Todas
              </FacetLink>
              {section.options.map((option) => (
                <FacetLink
                  active={section.currentValue === option.value}
                  href={makeFilterHref(currentFilters, section.makeOverrides(option.value))}
                  key={`${section.key}-${option.value}`}
                >
                  {option.label} ({option.count})
                </FacetLink>
              ))}
            </FilterSection>
          ))
        : null}
    </aside>
  );
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const currentFilters: FilterState = {
    q: resolvedSearchParams.q,
    category: resolvedSearchParams.category,
    minPrice: resolvedSearchParams.minPrice,
    maxPrice: resolvedSearchParams.maxPrice,
    condition: resolvedSearchParams.condition,
    brand: resolvedSearchParams.brand,
    currency: resolvedSearchParams.currency,
    year: resolvedSearchParams.year,
    specKey: resolvedSearchParams.specKey,
    specValue: resolvedSearchParams.specValue,
    shutterCount: resolvedSearchParams.shutterCount,
    batteryHealth: resolvedSearchParams.batteryHealth,
    storage: resolvedSearchParams.storage,
    memory: resolvedSearchParams.memory,
    wheelSize: resolvedSearchParams.wheelSize
  };

  const [listingsPage, categoriesPage] = await Promise.all([
    apiFetch<ListingsResponse>(`/listings?${buildMarketQuery(currentFilters)}`),
    apiFetch<PaginatedResponse<Listing>>(
      "/listings?status=PUBLISHED&pageSize=100&sortBy=publishedAt&sortOrder=desc"
    )
  ]);

  const listings = listingsPage.items;
  const categories = Array.from(
    new Set(categoriesPage.items.map((listing) => listing.category).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-8 lg:px-10">
      <MarketHeaderSearch categories={categories} currentFilters={currentFilters} />

      <section className="mt-6 rounded-[2rem] border border-[var(--surface-border)] bg-white/82 p-6 shadow-[0_20px_70px_rgba(8,34,71,0.07)] sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--brand-strong)]">
              Discovery engine
            </span>
            <div className="space-y-3">
              <h1
                className="text-4xl font-semibold tracking-[-0.04em] text-[var(--navy)] sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Buscá como en un gran marketplace, pero con foco en usados premium.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
                La barra superior concentra la búsqueda principal. Cuando aparece una intención
                clara, el lateral se adapta con filtros de precio, condición, categoría y facetas
                relevantes según el tipo de producto.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item}
                className="rounded-[1.35rem] border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-4 text-sm font-medium text-[var(--navy)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <FilterSidebar facets={listingsPage.facets} currentFilters={currentFilters} />

        <div className="space-y-5">
          <div className="rounded-[1.5rem] border border-[var(--surface-border)] bg-white px-5 py-4 shadow-[0_14px_40px_rgba(8,34,71,0.06)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--navy)]">
                  {listingsPage.meta.total} resultados
                  {currentFilters.q?.trim() ? ` para “${currentFilters.q.trim()}”` : ""}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {currentFilters.category?.trim()
                    ? `Categoría seleccionada: ${currentFilters.category}`
                    : "Todas las categorías disponibles"}
                </p>
              </div>

              {(currentFilters.q ||
                currentFilters.category ||
                currentFilters.condition ||
                currentFilters.brand ||
                currentFilters.currency ||
                currentFilters.year ||
                currentFilters.minPrice ||
                currentFilters.maxPrice ||
                currentFilters.specValue) ? (
                <Link
                  href="/market"
                  className="text-sm font-semibold text-[var(--brand-strong)] underline"
                >
                  Limpiar filtros
                </Link>
              ) : null}
            </div>
          </div>

          {listings.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <article
                  key={listing.id}
                  className="overflow-hidden rounded-[1.75rem] border border-[var(--surface-border)] bg-white shadow-[0_18px_50px_rgba(8,34,71,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(8,34,71,0.12)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(180deg,#eaf2ff,#f8fbff)]">
                    {listing.images[0] ? (
                      <img
                        alt={listing.title}
                        className="h-full w-full object-cover"
                        src={listing.images[0].url}
                      />
                    ) : null}
                    <div className="absolute left-4 top-4 rounded-full bg-white/88 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
                      {listing.category}
                    </div>
                  </div>

                  <div className="space-y-5 p-5">
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--navy)]">
                        {listing.title}
                      </h2>
                      <p className="line-clamp-3 text-sm leading-6 text-[var(--muted)]">
                        {listing.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[1.15rem] bg-[#f8fbff] p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                          Precio
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[var(--navy)]">
                          {formatCurrency(Number(listing.price), listing.currency)}
                        </p>
                      </div>
                      <div className="rounded-[1.15rem] bg-[#f8fbff] p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                          Ubicación
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--navy)]">
                          {listing.locationCity}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-[1.25rem] border border-[var(--surface-border)] bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                            ID vendedor
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[var(--navy)]">
                            {formatPublicUserCode(listing.seller.publicSerial)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                            Identidad
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[var(--navy)]">
                            {getKycStatusLabel(listing.seller.kycStatus)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                            Condición
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[var(--navy)]">
                            {getListingConditionLabel(listing.condition)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                            Reputación
                          </p>
                          <div className="mt-1 flex justify-end">
                            <ReputationStars score={Number(listing.seller.reputationScore)} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/market/${listing.id}`}
                      className="button-primary flex w-full items-center justify-center"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-[rgba(8,34,71,0.14)] bg-white/85 px-6 py-14 text-center">
              <h2
                className="text-3xl font-semibold tracking-[-0.04em] text-[var(--navy)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                No encontramos resultados para esta combinación.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                Probá ampliando la búsqueda, cambiando de categoría o limpiando filtros para volver
                a explorar el market completo.
              </p>
            </div>
          )}

          <SafeOperationGuides />
        </div>
      </section>
    </main>
  );
}
