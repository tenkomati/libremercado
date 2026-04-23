import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../../../lib/api";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { getPlatformSettings } from "../../../../lib/platform-settings";

import { createListingAction } from "../../actions";
import { FeePreview } from "../fee-preview";
import { ListingImageUpload } from "../../listing-image-upload";

type NewListingPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

type AccountUser = {
  id: string;
  status: string;
  kycStatus: string;
  province: string;
  city: string;
};

async function getCurrentUser() {
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

  return apiFetchWithToken<AccountUser>(`/users/${session.sub}`, token);
}

export default async function NewListingPage({ searchParams }: NewListingPageProps) {
  const [user, params, platformSettings] = await Promise.all([
    getCurrentUser(),
    (searchParams ?? Promise.resolve({})) as Promise<{ error?: string }>,
    getPlatformSettings()
  ]);
  const canPublish = user.status === "ACTIVE" && user.kycStatus === "APPROVED";

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10 lg:px-12">
      <div className="flex flex-wrap gap-3">
        <Link href="/account" className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold">
          Volver a mi cuenta
        </Link>
        <Link href="/account/kyc" className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold">
          Revisar identidad
        </Link>
      </div>

      <section className="mt-6 rounded-[2rem] border border-[var(--surface-border)] bg-white/88 p-8 shadow-[0_24px_80px_rgba(8,34,71,0.08)]">
        <div>
          <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--brand-strong)]">
            Nueva publicación
          </span>
          <h1
            className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-[var(--navy)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Publicá un usado con confianza desde el primer contacto.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--muted)]">
            Esta primera versión crea publicaciones publicadas directamente. Más
            adelante sumaremos IA para fotos, precio sugerido y revisión de riesgo.
          </p>
        </div>

        {!canPublish ? (
          <div className="mt-6 rounded-[1.5rem] border border-[rgba(217,119,6,0.22)] bg-[#fff7ed] p-5 text-sm leading-6 text-[#92400e]">
            Para publicar necesitás cuenta activa e identidad aprobada. Estado
            actual: ` {user.status} / identidad {user.kycStatus} `. Completá la
            verificación o esperá revisión.
          </div>
        ) : null}

        {params.error ? (
          <div className="mt-6 rounded-[1.5rem] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.08)] px-5 py-4 text-sm font-medium text-[#991b1b]">
            {params.error}
          </div>
        ) : null}

        <form action={createListingAction} className="mt-8 grid gap-5">
          <fieldset className="grid gap-5 disabled:opacity-60" disabled={!canPublish}>
            <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
              Título
              <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="title" required />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
              Descripción
              <textarea className="min-h-36 rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="description" required />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                Categoría
                <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="category" required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                Condición
                <select className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="condition" required>
                  <option value="LIKE_NEW">Como nuevo</option>
                  <option value="VERY_GOOD">Muy bueno</option>
                  <option value="GOOD">Bueno</option>
                  <option value="FAIR">Con detalles</option>
                  <option value="NEW">Nuevo</option>
                </select>
              </label>
            </div>

            <FeePreview settings={platformSettings} />

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                Provincia
                <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" defaultValue={user.province} name="locationProvince" required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
                Ciudad
                <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" defaultValue={user.city} name="locationCity" required />
              </label>
            </div>

            <ListingImageUpload />

            <button className="rounded-full bg-[var(--brand)] px-5 py-4 font-semibold text-white transition hover:bg-[var(--brand-strong)]" type="submit">
              Crear publicación
            </button>
          </fieldset>
        </form>
      </section>
    </main>
  );
}
