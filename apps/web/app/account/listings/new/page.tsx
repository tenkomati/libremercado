import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../../../lib/api";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { getPlatformSettings } from "../../../../lib/platform-settings";
import { getKycStatusLabel, getUserStatusLabel } from "../../../../lib/status-labels";

import { ListingPublishWizard } from "../../listing-publish-wizard";

type AccountUser = {
  id: string;
  status: string;
  kycStatus: string;
  province: string;
  city: string;
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
    media: Array<{
      id?: string;
      url: string;
      type: "IMAGE" | "VIDEO";
      aiBlurDetected?: boolean;
      aiNoisyBackground?: boolean;
      aiVisibleDamage?: boolean;
      aiQualityScore?: number;
      aiSuggestion?: string | null;
    }>;
    catalogProduct: {
      id: string;
      externalRef: string;
      title: string;
      brand: string | null;
      model: string | null;
      category: string;
      releaseYear: number | null;
      technicalSpecs: Record<string, unknown> | null;
      defaultImageUrl: string | null;
    } | null;
  };
  matchedCatalogProduct: {
    id: string;
    externalRef: string;
    title: string;
    brand: string | null;
    model: string | null;
    category: string;
    releaseYear: number | null;
    technicalSpecs: Record<string, unknown> | null;
    defaultImageUrl: string | null;
  } | null;
};

async function getSessionContext() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?next=/account/listings/new");
  }

  let session;

  try {
    session = await verifySessionToken(token);
  } catch {
    redirect("/login?next=/account/listings/new");
  }

  return { token, session };
}

async function getCurrentUser(token: string, userId: string) {
  try {
    return await apiFetchWithToken<AccountUser>(`/users/${userId}`, token);
  } catch {
    redirect("/login?next=/account/listings/new");
  }
}

async function getActiveDraft(token: string) {
  try {
    return await apiFetchWithToken<ListingDraft>("/listings/drafts/active", token);
  } catch {
    redirect("/login?next=/account/listings/new");
  }
}

export default async function NewListingPage() {
  const { token, session } = await getSessionContext();
  const [user, draft, platformSettings] = await Promise.all([
    getCurrentUser(token, session.sub),
    getActiveDraft(token),
    getPlatformSettings()
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/account"
          className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)]"
        >
          Volver a mi cuenta
        </Link>
        <Link
          href="/account/kyc"
          className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)]"
        >
          Revisar identidad
        </Link>
      </div>

      <section className="mt-6 rounded-[2rem] border border-[var(--surface-border)] bg-white/88 p-8 shadow-[0_24px_80px_rgba(8,34,71,0.08)]">
        <div className="max-w-4xl">
          <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--brand-strong)]">
            Nuevo flujo de publicación
          </span>
          <h1
            className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-[var(--navy)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Publicá un usado premium con ficha guiada, señales de confianza y borrador persistente.
          </h1>
          <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
            Esta versión ya separa producto de publicación, permite catálogo mock, curación visual y cálculo inverso de precio.
            Si cerrás la pestaña, el borrador queda guardado en base.
          </p>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-[var(--surface-border)] bg-[#f8fbff] p-5 text-sm leading-6 text-[var(--muted)]">
          Estado actual de la cuenta: {getUserStatusLabel(user.status)} / identidad {getKycStatusLabel(user.kycStatus)}.
        </div>
      </section>

      <ListingPublishWizard
        currentUser={user}
        initialDraft={draft}
        platformSettings={platformSettings}
      />
    </main>
  );
}
