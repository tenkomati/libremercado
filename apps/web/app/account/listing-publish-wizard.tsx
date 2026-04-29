"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import { formatCurrency } from "../../lib/format";
import {
  calculateListingPriceFromTargetNet,
  calculateSellerNetAmount,
  type PlatformSettings
} from "../../lib/platform-settings";
import { getKycStatusLabel, getListingConditionLabel, getUserStatusLabel } from "../../lib/status-labels";

import { ListingMediaUploader } from "./listing-media-uploader";

type CatalogProduct = {
  id: string;
  externalRef: string;
  title: string;
  brand: string | null;
  model: string | null;
  category: string;
  releaseYear: number | null;
  technicalSpecs: Record<string, unknown> | null;
  defaultImageUrl: string | null;
};

type DraftMedia = {
  id?: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  aiBlurDetected?: boolean;
  aiNoisyBackground?: boolean;
  aiVisibleDamage?: boolean;
  aiQualityScore?: number;
  aiSuggestion?: string | null;
};

type ListingDraft = {
  id: string;
  status?: "OPEN" | "PUBLISHED" | "ABANDONED";
  currentStep: "PRODUCT_MATCH" | "GALLERY" | "SECURITY" | "LOGISTICS" | "REVIEW";
  searchQuery: string | null;
  referenceImageUrl: string | null;
  targetNetAmount: string | null;
  askingPrice: string | null;
  shippingFeeEstimate: string | null;
  insuranceFeeEstimate: string | null;
  currency: "ARS" | "USD";
  locationProvince: string | null;
  locationCity: string | null;
  deliveryMethods: Array<"COURIER" | "SAFE_MEETING" | "MESSAGING" | "PICKUP">;
  insuranceSelected: boolean;
  hasFunctionalityVideo: boolean;
  publishedListingId?: string | null;
  product: {
    id: string;
    title: string | null;
    brand: string | null;
    model: string | null;
    category: string | null;
    manufactureYear: number | null;
    description: string | null;
    condition: string | null;
    serialNumber: string | null;
    imei: string | null;
    invoiceVerified: boolean;
    transparencyBadge: boolean;
    technicalSpecs: Record<string, unknown> | null;
    marketTags: string[];
    visionSummary: {
      minimumPhotoRequirementMet?: boolean;
      hasFunctionalityVideo?: boolean;
      blurDetected?: boolean;
      noisyBackgroundDetected?: boolean;
      visibleDamageDetected?: boolean;
      suggestions?: string[];
    } | null;
    media: DraftMedia[];
    catalogProduct: CatalogProduct | null;
  };
  matchedCatalogProduct: CatalogProduct | null;
};

type WizardUser = {
  status: string;
  kycStatus: string;
  province: string;
  city: string;
};

type ListingPublishWizardProps = {
  initialDraft: ListingDraft;
  currentUser: WizardUser;
  platformSettings: PlatformSettings;
};

const stepOrder = [
  "PRODUCT_MATCH",
  "GALLERY",
  "SECURITY",
  "LOGISTICS",
  "REVIEW"
] as const;

const listingCategoryOptions = [
  "Celulares",
  "Computacion",
  "Fotografia",
  "Bicicletas",
  "Gaming",
  "Tecnologia",
  "Hogar y Muebles",
  "Moda"
] as const;

const stepMeta: Record<(typeof stepOrder)[number], { title: string; subtitle: string }> = {
  PRODUCT_MATCH: {
    title: "1. Escáner de producto",
    subtitle: "Buscá el modelo o subí una referencia para precargar ficha técnica."
  },
  GALLERY: {
    title: "2. Galería y curación",
    subtitle: "Subí mínimo 4 fotos y, si podés, un video funcional."
  },
  SECURITY: {
    title: "3. Seguridad y estado",
    subtitle: "Condición real, trazabilidad e incentivos de transparencia."
  },
  LOGISTICS: {
    title: "4. Logística y precio",
    subtitle: "Elegí cómo entregar y cuánto querés recibir realmente."
  },
  REVIEW: {
    title: "5. Revisión y publicación",
    subtitle: "Revisá señales de confianza, tags y salí a mercado."
  }
};

type ProductFormState = {
  searchQuery: string;
  referenceImageUrl: string;
  title: string;
  category: string;
  brand: string;
  model: string;
  manufactureYear: string;
  description: string;
};

type CategorySpecFormState = {
  shutterCount: string;
  batteryHealth: string;
  storage: string;
  memory: string;
  wheelSize: string;
};

type SecurityFormState = {
  condition: string;
  serialOrImei: string;
  invoiceVerified: boolean;
  insuranceSelected: boolean;
};

type LogisticsFormState = {
  targetNetAmount: string;
  currency: "ARS" | "USD";
  locationProvince: string;
  locationCity: string;
  deliveryMethods: Array<"COURIER" | "SAFE_MEETING" | "MESSAGING" | "PICKUP">;
};

function createProductFormState(draft: ListingDraft): ProductFormState {
  return {
    searchQuery: draft.searchQuery ?? "",
    referenceImageUrl: draft.referenceImageUrl ?? "",
    title: draft.product.title ?? "",
    category: draft.product.category ?? "",
    brand: draft.product.brand ?? "",
    model: draft.product.model ?? "",
    manufactureYear: draft.product.manufactureYear ? String(draft.product.manufactureYear) : "",
    description: draft.product.description ?? ""
  };
}

function createSecurityFormState(draft: ListingDraft): SecurityFormState {
  return {
    condition: draft.product.condition ?? "VERY_GOOD",
    serialOrImei: draft.product.serialNumber ?? draft.product.imei ?? "",
    invoiceVerified: draft.product.invoiceVerified,
    insuranceSelected: draft.insuranceSelected
  };
}

function createCategorySpecFormState(draft: ListingDraft): CategorySpecFormState {
  const specs = (draft.product.technicalSpecs ?? {}) as Record<string, unknown>;

  return {
    shutterCount: specs.shutterCount ? String(specs.shutterCount) : "",
    batteryHealth: specs.batteryHealth ? String(specs.batteryHealth) : "",
    storage: specs.storage ? String(specs.storage) : "",
    memory: specs.memory ? String(specs.memory) : "",
    wheelSize: specs.wheelSize ? String(specs.wheelSize) : ""
  };
}

function getCategorySpecConfig(category?: string | null) {
  const normalizedCategory = (category ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (normalizedCategory === "fotografia") {
    return [{ key: "shutterCount", label: "Cantidad de disparos", placeholder: "Ej. 34800" }] as const;
  }

  if (normalizedCategory === "celulares") {
    return [
      { key: "batteryHealth", label: "% de batería", placeholder: "Ej. 96%" },
      { key: "storage", label: "Almacenamiento (GB)", placeholder: "Ej. 256 GB" }
    ] as const;
  }

  if (normalizedCategory === "computacion") {
    return [
      { key: "storage", label: "Almacenamiento (GB)", placeholder: "Ej. 512 GB SSD" },
      { key: "memory", label: "Memoria", placeholder: "Ej. 16 GB" }
    ] as const;
  }

  if (normalizedCategory === "bicicletas") {
    return [{ key: "wheelSize", label: "Rodado", placeholder: "Ej. 29" }] as const;
  }

  return [] as const;
}

function buildTechnicalSpecsPayload(
  category: string,
  formState: CategorySpecFormState,
  baseSpecs?: Record<string, unknown> | null
) {
  const nextSpecs: Record<string, unknown> = { ...(baseSpecs ?? {}) };
  const activeKeys = new Set(getCategorySpecConfig(category).map((item) => item.key));

  (["shutterCount", "batteryHealth", "storage", "memory", "wheelSize"] as const).forEach((key) => {
    if (!activeKeys.has(key)) {
      delete nextSpecs[key];
      return;
    }

    const value = formState[key].trim();

    if (!value) {
      delete nextSpecs[key];
      return;
    }

    nextSpecs[key] = value;
  });

  return Object.keys(nextSpecs).length ? nextSpecs : undefined;
}

function createLogisticsFormState(
  draft: ListingDraft,
  currentUser: WizardUser
): LogisticsFormState {
  return {
    targetNetAmount: draft.targetNetAmount ?? "",
    currency: draft.currency,
    locationProvince: draft.locationProvince ?? currentUser.province,
    locationCity: draft.locationCity ?? currentUser.city,
    deliveryMethods: draft.deliveryMethods
  };
}

export function ListingPublishWizard({
  initialDraft,
  currentUser,
  platformSettings
}: ListingPublishWizardProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const [isPublishing, startPublishTransition] = useTransition();
  const [activeStep, setActiveStep] = useState<(typeof stepOrder)[number]>(draft.currentStep);
  const [productForm, setProductForm] = useState(() => createProductFormState(initialDraft));
  const [categorySpecsForm, setCategorySpecsForm] = useState(() =>
    createCategorySpecFormState(initialDraft)
  );
  const [securityForm, setSecurityForm] = useState(() => createSecurityFormState(initialDraft));
  const [logisticsForm, setLogisticsForm] = useState(() =>
    createLogisticsFormState(initialDraft, currentUser)
  );
  const isPublishedDraft = draft.status === "PUBLISHED" && Boolean(draft.publishedListingId);

  const canPublishAccount =
    currentUser.status === "ACTIVE" && currentUser.kycStatus === "APPROVED";
  const media = useMemo(
    () =>
      draft.product.media.map((item) => ({
        url: item.url,
        type: item.type
      })),
    [draft.product.media]
  );

  useEffect(() => {
    setDraft((currentDraft) =>
      currentDraft.currentStep === activeStep
        ? currentDraft
        : {
            ...currentDraft,
            currentStep: activeStep
        }
    );
  }, [activeStep]);

  useEffect(() => {
    setProductForm(createProductFormState(draft));
    setCategorySpecsForm(createCategorySpecFormState(draft));
    setSecurityForm(createSecurityFormState(draft));
    setLogisticsForm(createLogisticsFormState(draft, currentUser));
  }, [draft, currentUser]);

  async function saveDraft(partial: Record<string, unknown>) {
    setPublishError(null);
    setPublishSuccess(null);

    const response = await fetch(`/api/listings/draft/${draft.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(partial)
    });

    const payload = (await response.json().catch(() => null)) as ListingDraft | { message?: string } | null;

    if (!response.ok) {
      throw new Error(
        payload && typeof payload === "object" && "message" in payload && payload.message
          ? payload.message
          : "No se pudo guardar el borrador."
      );
    }

    setDraft(payload as ListingDraft);
  }

  async function persistStep(step: (typeof stepOrder)[number], nextStep?: (typeof stepOrder)[number]) {
    switch (step) {
      case "PRODUCT_MATCH":
        await saveDraft({
          searchQuery: productForm.searchQuery || undefined,
          referenceImageUrl: productForm.referenceImageUrl || undefined,
          title: productForm.title || undefined,
          category: productForm.category || undefined,
          brand: productForm.brand || undefined,
          model: productForm.model || undefined,
          manufactureYear: productForm.manufactureYear
            ? Number(productForm.manufactureYear)
            : undefined,
          description: productForm.description || undefined,
          technicalSpecs: buildTechnicalSpecsPayload(
            productForm.category,
            categorySpecsForm,
            draft.product.technicalSpecs
          ),
          currentStep: nextStep ?? step
        });
        return;
      case "SECURITY": {
        const serialValue = securityForm.serialOrImei.trim();
        await saveDraft({
          condition: securityForm.condition,
          serialNumber: serialValue || undefined,
          imei: serialValue || undefined,
          invoiceVerified: securityForm.invoiceVerified,
          insuranceSelected: securityForm.insuranceSelected,
          currentStep: nextStep ?? step
        });
        return;
      }
      case "LOGISTICS": {
        const targetNetAmount = logisticsForm.targetNetAmount
          ? Number(logisticsForm.targetNetAmount)
          : undefined;

        await saveDraft({
          targetNetAmount,
          askingPrice:
            targetNetAmount !== undefined
              ? calculateListingPriceFromTargetNet(targetNetAmount, platformSettings)
              : undefined,
          currency: logisticsForm.currency,
          locationProvince: logisticsForm.locationProvince || undefined,
          locationCity: logisticsForm.locationCity || undefined,
          deliveryMethods: logisticsForm.deliveryMethods,
          currentStep: nextStep ?? step
        });
        return;
      }
      default:
        if (nextStep && nextStep !== step) {
          await saveDraft({ currentStep: nextStep });
        }
    }
  }

  async function handleCatalogSearch() {
    startSearchTransition(async () => {
      const response = await fetch("/api/listings/catalog/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: productForm.searchQuery,
          referenceImageUrl: productForm.referenceImageUrl
        })
      });

      const payload = (await response.json()) as {
        items: CatalogProduct[];
        requiresManualInput: boolean;
      };

      setSearchResults(payload.items);
      setSearchMessage(
        payload.items.length
          ? "Encontramos coincidencias para precargar la ficha."
          : "No encontramos una coincidencia clara. Seguí con carga manual."
      );
    });
  }

  const effectiveCurrency = logisticsForm.currency;
  const categorySpecConfig = getCategorySpecConfig(productForm.category);
  const targetNetPreview = logisticsForm.targetNetAmount
    ? Number(logisticsForm.targetNetAmount)
    : draft.targetNetAmount
      ? Number(draft.targetNetAmount)
      : 0;
  const askingPrice =
    targetNetPreview > 0
      ? calculateListingPriceFromTargetNet(targetNetPreview, platformSettings)
      : draft.askingPrice !== null && draft.askingPrice !== ""
        ? Number(draft.askingPrice)
        : 0;
  const feePreview = calculateSellerNetAmount(askingPrice || 0, platformSettings);
  const insuranceEligible =
    !!draft.product.category &&
    effectiveCurrency === "ARS" &&
    askingPrice >= 150000 &&
    ["electronica", "fotografia", "computacion", "celulares", "tecnologia"].some((item) =>
      draft.product.category?.toLowerCase().includes(item)
    );

  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
      <aside className="space-y-6">
        <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/88 p-6">
          <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-4 py-2 text-xs font-semibold text-[var(--brand-strong)]">
            Flujo de publicación
          </span>
          <h2
            className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--navy)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            De cero a vendido, con confianza desde la ficha.
          </h2>
          <div className="mt-5 grid gap-3">
            {stepOrder.map((step) => (
              <button
                className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                  activeStep === step
                    ? "border-[var(--brand)] bg-[#eef4ff]"
                    : "border-[var(--surface-border)] bg-white hover:border-[rgba(18,107,255,0.24)]"
                }`}
                key={step}
                onClick={async () => {
                  await persistStep(activeStep, step);
                  setActiveStep(step);
                }}
                type="button"
              >
                <p className="text-sm font-semibold text-[var(--navy)]">{stepMeta[step].title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{stepMeta[step].subtitle}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/88 p-6">
          <h3 className="text-xl font-semibold text-[var(--navy)]">Resumen del borrador</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--muted)]">Producto</dt>
              <dd className="font-semibold text-[var(--navy)]">{draft.product.title ?? "Sin definir"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--muted)]">Categoría</dt>
              <dd className="font-semibold text-[var(--navy)]">{draft.product.category ?? "Pendiente"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--muted)]">Fotos</dt>
              <dd className="font-semibold text-[var(--navy)]">
                {draft.product.media.filter((item) => item.type === "IMAGE").length}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--muted)]">Video</dt>
              <dd className="font-semibold text-[var(--navy)]">
                {draft.product.media.some((item) => item.type === "VIDEO") ? "Sí" : "No"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--muted)]">Moneda</dt>
              <dd className="font-semibold text-[var(--navy)]">{draft.currency}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--muted)]">Precio final</dt>
              <dd className="font-semibold text-[var(--navy)]">
                {askingPrice ? formatCurrency(askingPrice, draft.currency) : "Pendiente"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/88 p-6">
          <h3 className="text-xl font-semibold text-[var(--navy)]">Checklist operativo</h3>
          <ul className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
            <li>Cuenta: {getUserStatusLabel(currentUser.status)}</li>
            <li>Identidad: {getKycStatusLabel(currentUser.kycStatus)}</li>
            <li>Condición: {draft.product.condition ? getListingConditionLabel(draft.product.condition) : "Pendiente"}</li>
            <li>
              Transparencia: {draft.product.transparencyBadge ? "Badge activo" : "Aún sin badge"}
            </li>
          </ul>
        </div>
      </aside>

      <div className="rounded-[2rem] border border-[var(--surface-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(8,34,71,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--brand-strong)]">
              {stepMeta[activeStep].title}
            </span>
            <h1
              className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--navy)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {stepMeta[activeStep].subtitle}
            </h1>
          </div>
          <Link
            href="/account"
            className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)]"
          >
            Volver a mi cuenta
          </Link>
        </div>

        {!canPublishAccount ? (
          <div className="mt-6 rounded-[1.5rem] border border-[rgba(217,119,6,0.22)] bg-[#fff7ed] p-5 text-sm leading-6 text-[#92400e]">
            Podés trabajar el borrador, pero para publicar necesitás cuenta activa e identidad aprobada. Estado actual:
            {" "}
            {getUserStatusLabel(currentUser.status)} / identidad {getKycStatusLabel(currentUser.kycStatus)}.
          </div>
        ) : null}

        {publishError ? (
          <div className="mt-6 rounded-[1.5rem] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.08)] px-5 py-4 text-sm font-medium text-[#991b1b]">
            {publishError}
          </div>
        ) : null}

        {publishSuccess ? (
          <div className="mt-6 rounded-[1.5rem] border border-[rgba(5,150,105,0.18)] bg-[rgba(5,150,105,0.08)] px-5 py-4 text-sm font-medium text-[#065f46]">
            {publishSuccess}
          </div>
        ) : null}

        {isPublishedDraft && draft.publishedListingId ? (
          <div className="mt-6 flex flex-wrap gap-3 rounded-[1.5rem] border border-[rgba(5,150,105,0.18)] bg-[#effdf5] px-5 py-4">
            <Link
              className="button-primary rounded-full px-5 py-3 text-sm font-semibold"
              href={`/market/${draft.publishedListingId}`}
            >
              Ver publicación
            </Link>
            <Link
              className="rounded-full border border-[var(--surface-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--navy)]"
              href="/account"
            >
              Volver a mi cuenta
            </Link>
          </div>
        ) : null}

        <div className="mt-8 grid gap-8">
          {activeStep === "PRODUCT_MATCH" ? (
            <section className="grid gap-6">
              <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Buscar producto
                  <input
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setProductForm((current) => ({ ...current, searchQuery: event.target.value }));
                    }}
                    placeholder="Ej. Sony A7 III, MacBook Air M2, iPhone 15 Pro"
                    value={productForm.searchQuery}
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Imagen de referencia opcional
                  <input
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setProductForm((current) => ({
                        ...current,
                        referenceImageUrl: event.target.value
                      }));
                    }}
                    placeholder="/uploads/listings/ejemplo.jpg"
                    value={productForm.referenceImageUrl}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className="button-primary rounded-full px-5 py-3 text-sm font-semibold"
                  onClick={handleCatalogSearch}
                  type="button"
                >
                  {isSearching ? "Buscando..." : "Buscar en catálogo"}
                </button>
                <button
                  className="rounded-full border border-[var(--surface-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--navy)]"
                  onClick={async () => {
                    setSearchResults([]);
                    setSearchMessage("Carga manual habilitada.");
                    await saveDraft({
                      matchedCatalogProductId: null,
                      currentStep: activeStep
                    });
                  }}
                  type="button"
                >
                  Cargar manualmente
                </button>
              </div>

              {searchMessage ? <p className="text-sm text-[var(--muted)]">{searchMessage}</p> : null}

              {searchResults.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {searchResults.map((item) => (
                    <article
                      className={`rounded-[1.5rem] border p-5 ${
                        draft.matchedCatalogProduct?.id === item.id
                          ? "border-[var(--brand)] bg-[#eef4ff]"
                          : "border-[var(--surface-border)] bg-[#f8fbff]"
                      }`}
                      key={item.id}
                    >
                      <div className="flex items-start gap-4">
                        {item.defaultImageUrl ? (
                          <img
                            alt={item.title}
                            className="h-24 w-24 rounded-[1.25rem] object-cover"
                            src={item.defaultImageUrl}
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-semibold text-[var(--navy)]">{item.title}</p>
                          <p className="text-sm text-[var(--muted)]">
                            {item.brand ?? "Marca abierta"} · {item.category}
                            {item.releaseYear ? ` · ${item.releaseYear}` : ""}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(item.technicalSpecs ?? {}).slice(0, 3).map(([key, value]) => (
                              <span
                                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]"
                                key={key}
                              >
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        className="button-primary mt-4 rounded-full px-4 py-3 text-sm font-semibold"
                        onClick={async () => {
                          await saveDraft({
                            matchedCatalogProductId: item.id,
                            title: item.title,
                            brand: item.brand,
                            model: item.model,
                            category: item.category,
                            manufactureYear: item.releaseYear ?? undefined,
                            technicalSpecs: item.technicalSpecs ?? undefined,
                            currentStep: activeStep
                          });
                          setPublishSuccess("Ficha técnica precargada desde catálogo.");
                        }}
                        type="button"
                      >
                        Usar esta ficha
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Título comercial
                  <input
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setProductForm((current) => ({ ...current, title: event.target.value }));
                    }}
                    value={productForm.title}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Categoría
                  <select
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setProductForm((current) => ({ ...current, category: event.target.value }));
                    }}
                    value={productForm.category}
                  >
                    <option value="">Elegí una categoría</option>
                    {listingCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Marca
                  <input
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setProductForm((current) => ({ ...current, brand: event.target.value }));
                    }}
                    value={productForm.brand}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Modelo
                  <input
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setProductForm((current) => ({ ...current, model: event.target.value }));
                    }}
                    value={productForm.model}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Año
                  <input
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setProductForm((current) => ({
                        ...current,
                        manufactureYear: event.target.value
                      }));
                    }}
                    type="number"
                    value={productForm.manufactureYear}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)] md:col-span-2">
                  Descripción
                  <textarea
                    className="min-h-36 rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setProductForm((current) => ({
                        ...current,
                        description: event.target.value
                      }));
                    }}
                    value={productForm.description}
                  />
                </label>
              </div>

              {categorySpecConfig.length ? (
                <div className="rounded-[1.5rem] border border-[var(--surface-border)] bg-[#f8fbff] p-5">
                  <h3 className="text-lg font-semibold text-[var(--navy)]">
                    Datos específicos de la categoría
                  </h3>
                  <div className="mt-4 grid gap-5 md:grid-cols-2">
                    {categorySpecConfig.map((field) => (
                      <label
                        className="grid gap-2 text-sm font-medium text-[var(--navy)]"
                        key={field.key}
                      >
                        {field.label}
                        <input
                          className="rounded-2xl border border-[var(--surface-border)] bg-white px-4 py-3 outline-none focus:border-[var(--brand)]"
                          onChange={(event) => {
                            setCategorySpecsForm((current) => ({
                              ...current,
                              [field.key]: event.target.value
                            }));
                          }}
                          placeholder={field.placeholder}
                          value={categorySpecsForm[field.key]}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {activeStep === "GALLERY" ? (
            <section className="grid gap-6">
              <ListingMediaUploader
                onChange={async (value) => {
                  try {
                    await saveDraft({ media: value, currentStep: activeStep });
                  } catch (error) {
                    setPublishError(error instanceof Error ? error.message : "No se pudo guardar la galería.");
                  }
                }}
                value={media}
              />

              <div className="rounded-[1.5rem] border border-[var(--surface-border)] bg-[#f8fbff] p-5">
                <h3 className="text-lg font-semibold text-[var(--navy)]">Señales IA mock de visión</h3>
                <ul className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
                  {(draft.product.visionSummary?.suggestions ?? []).map((suggestion, index) => (
                    <li key={`${suggestion}-${index}`}>{suggestion}</li>
                  ))}
                  {!draft.product.visionSummary?.suggestions?.length ? (
                    <li>Todavía no hay suficientes medios para generar observaciones.</li>
                  ) : null}
                </ul>
              </div>
            </section>
          ) : null}

          {activeStep === "SECURITY" ? (
            <section className="grid gap-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Estado real
                  <select
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setSecurityForm((current) => ({
                        ...current,
                        condition: event.target.value
                      }));
                    }}
                    value={securityForm.condition}
                  >
                    <option value="LIKE_NEW">Como nuevo</option>
                    <option value="VERY_GOOD">Muy bueno</option>
                    <option value="GOOD">Bueno</option>
                    <option value="FAIR">Para repuestos / con detalles</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Número de serie o IMEI
                  <input
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setSecurityForm((current) => ({
                        ...current,
                        serialOrImei: event.target.value
                      }));
                    }}
                    placeholder="Opcional, pero suma badge de transparencia"
                    value={securityForm.serialOrImei}
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-[1.5rem] border border-[var(--surface-border)] bg-white p-5 text-sm text-[var(--navy)]">
                <input
                  className="mt-1"
                  checked={securityForm.invoiceVerified}
                  onChange={(event) => {
                    setSecurityForm((current) => ({
                      ...current,
                      invoiceVerified: event.target.checked
                    }));
                  }}
                  type="checkbox"
                />
                <span>
                  <strong>Validé factura o comprobante original.</strong>
                  <br />
                  Esto habilita el tag de mercado similar a “Único dueño”.
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-[1.5rem] border border-[rgba(18,107,255,0.14)] bg-[#f5f9ff] p-5 text-sm text-[var(--navy)]">
                <input
                  className="mt-1"
                  checked={securityForm.insuranceSelected}
                  disabled={!insuranceEligible}
                  onChange={(event) => {
                    setSecurityForm((current) => ({
                      ...current,
                      insuranceSelected: event.target.checked
                    }));
                  }}
                  type="checkbox"
                />
                <span>
                  <strong>Proteger esta venta con seguro opcional.</strong>
                  <br />
                  {insuranceEligible
                    ? `Estimado ${formatCurrency(Number(draft.insuranceFeeEstimate ?? "0"), draft.currency)}.`
                    : "Disponible para categorías premium en ARS desde $150.000."}
                </span>
              </label>
            </section>
          ) : null}

          {activeStep === "LOGISTICS" ? (
            <section className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Cuánto querés recibir
                  <input
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setLogisticsForm((current) => ({
                        ...current,
                        targetNetAmount: event.target.value
                      }));
                    }}
                    type="number"
                    value={logisticsForm.targetNetAmount}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Moneda
                  <select
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setLogisticsForm((current) => ({
                        ...current,
                        currency: event.target.value as "ARS" | "USD"
                      }));
                    }}
                    value={logisticsForm.currency}
                  >
                    <option value="ARS">Pesos argentinos</option>
                    {platformSettings.allowUsdListings ? <option value="USD">Dólares USD</option> : null}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#f8fbff] p-4">
                  <p className="text-xs text-[var(--muted)]">Precio publicado</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--navy)]">
                    {formatCurrency(askingPrice || 0, effectiveCurrency)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f8fbff] p-4">
                  <p className="text-xs text-[var(--muted)]">Comisión vendedor</p>
                  <p className="mt-1 text-xl font-semibold text-[#b45309]">
                    {formatCurrency(feePreview.totalFee, effectiveCurrency)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f8fbff] p-4">
                  <p className="text-xs text-[var(--muted)]">Recibís estimado</p>
                  <p className="mt-1 text-xl font-semibold text-[#047857]">
                    {formatCurrency(feePreview.netAmount, effectiveCurrency)}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Provincia
                  <input
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setLogisticsForm((current) => ({
                        ...current,
                        locationProvince: event.target.value
                      }));
                    }}
                    value={logisticsForm.locationProvince}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                  Ciudad
                  <input
                    className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
                    onChange={(event) => {
                      setLogisticsForm((current) => ({
                        ...current,
                        locationCity: event.target.value
                      }));
                    }}
                    value={logisticsForm.locationCity}
                  />
                </label>
              </div>

              <div className="grid gap-3">
                <p className="text-sm font-semibold text-[var(--navy)]">Modo de entrega</p>
                {[
                  { value: "COURIER", label: "Envío por correo / logística" },
                  { value: "SAFE_MEETING", label: "Punto de encuentro seguro" },
                  { value: "MESSAGING", label: "Mensajería urbana" },
                  { value: "PICKUP", label: "Retiro acordado" }
                ].map((method) => {
                  const checked = logisticsForm.deliveryMethods.includes(method.value as never);

                  return (
                    <label
                      className="flex items-start gap-3 rounded-[1.25rem] border border-[var(--surface-border)] bg-white px-4 py-4 text-sm text-[var(--navy)]"
                      key={method.value}
                    >
                      <input
                        checked={checked}
                        onChange={(event) => {
                          const nextMethods = event.target.checked
                            ? [...logisticsForm.deliveryMethods, method.value as never]
                            : logisticsForm.deliveryMethods.filter((item) => item !== method.value);

                          setLogisticsForm((current) => ({
                            ...current,
                            deliveryMethods: nextMethods
                          }));
                        }}
                        type="checkbox"
                      />
                      <span>{method.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          ) : null}

          {activeStep === "REVIEW" ? (
            <section className="grid gap-6">
              <div className="rounded-[1.5rem] border border-[var(--surface-border)] bg-[#f8fbff] p-6">
                <h3 className="text-xl font-semibold text-[var(--navy)]">Tags automáticos</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {draft.product.marketTags.length ? draft.product.marketTags.map((tag) => (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]" key={tag}>
                      #{tag}
                    </span>
                  )) : <span className="text-sm text-[var(--muted)]">Todavía no hay tags de mercado.</span>}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[rgba(18,107,255,0.14)] bg-[#f5f9ff] p-6">
                <h3 className="text-xl font-semibold text-[var(--navy)]">URL amigable esperada</h3>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {draft.product.title
                    ? `/productos/${draft.product.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
                    : "Se generará al publicar."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className="button-primary rounded-full px-6 py-4 text-sm font-semibold"
                  disabled={!canPublishAccount || isPublishing || isPublishedDraft}
                  onClick={() => {
                    startPublishTransition(async () => {
                      try {
                        await persistStep(activeStep);
                        const response = await fetch(`/api/listings/draft/${draft.id}/publish`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify({
                            locationProvince: draft.locationProvince,
                            locationCity: draft.locationCity
                          })
                        });
                        const payload = (await response.json().catch(() => null)) as
                          | { message?: string; publishedListingId?: string }
                          | ListingDraft
                          | null;

                        if (!response.ok) {
                          throw new Error(
                            payload && typeof payload === "object" && "message" in payload && payload.message
                              ? payload.message
                              : "No se pudo publicar."
                          );
                        }

                        const publishedDraft = payload as ListingDraft;
                        setDraft(publishedDraft);
                        setPublishSuccess("Publicación creada correctamente.");
                      } catch (error) {
                        setPublishError(
                          error instanceof Error ? error.message : "No se pudo publicar."
                        );
                      }
                    });
                  }}
                  type="button"
                >
                  {isPublishedDraft ? "Publicación creada" : isPublishing ? "Publicando..." : "Publicar ahora"}
                </button>
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--surface-border)] pt-6">
            <button
              className="rounded-full border border-[var(--surface-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--navy)]"
              disabled={stepOrder.indexOf(activeStep) === 0}
              onClick={() => {
                const currentIndex = stepOrder.indexOf(activeStep);
                setActiveStep(stepOrder[Math.max(0, currentIndex - 1)]);
              }}
              type="button"
            >
              Paso anterior
            </button>

            <button
              className="button-primary rounded-full px-5 py-3 text-sm font-semibold"
              disabled={isPublishedDraft}
              onClick={async () => {
                const currentIndex = stepOrder.indexOf(activeStep);
                const nextStep = stepOrder[Math.min(stepOrder.length - 1, currentIndex + 1)];
                await persistStep(activeStep, nextStep);
                setActiveStep(nextStep);
              }}
              type="button"
            >
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
