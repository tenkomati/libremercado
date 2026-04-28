import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../../lib/api";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { formatDate } from "../../../lib/format";
import { getKycStatusLabel } from "../../../lib/status-labels";

import { KycCorrectionForm } from "../kyc-correction-form";

type KycPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

type AccountUser = {
  id: string;
  firstName: string;
  lastName: string;
  kycStatus: string;
  dni: string;
  kycVerifications: Array<{
    id: string;
    provider: string;
    documentType: string;
    documentNumber: string;
    status: string;
    reviewerNotes: string | null;
    documentFrontImageUrl: string | null;
    documentBackImageUrl: string | null;
    selfieImageUrl: string | null;
    biometricConsentAt: string | null;
    createdAt: string;
    reviewedAt: string | null;
  }>;
};

async function getCurrentUser() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?next=/account/kyc");
  }

  let session;

  try {
    session = await verifySessionToken(token);
  } catch {
    redirect("/login?next=/account/kyc");
  }

  return apiFetchWithToken<AccountUser>(`/users/${session.sub}`, token);
}

export default async function KycPage({ searchParams }: KycPageProps) {
  const [user, params] = await Promise.all([
    getCurrentUser(),
    (searchParams ?? Promise.resolve({})) as Promise<{
      success?: string;
      error?: string;
    }>
  ]);
  const latestVerification = user.kycVerifications[0];
  const requiresCorrection =
    user.kycStatus === "REQUIRES_REVIEW" || user.kycStatus === "REJECTED";
  const isApproved = user.kycStatus === "APPROVED";
  const isPending = user.kycStatus === "PENDING";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-10 lg:px-12">
      <div className="flex flex-wrap gap-3">
        <Link href="/account" className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold">
          Volver a mi cuenta
        </Link>
        <Link href="/market" className="rounded-full border border-[var(--surface-border)] bg-white px-4 py-2 text-sm font-semibold">
          Ver market
        </Link>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#082247,#0d3270)] p-8 text-white shadow-[0_22px_80px_rgba(8,34,71,0.24)]">
          <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
            Verificación de identidad
          </span>
          <h1
            className="mt-4 text-5xl font-semibold tracking-[-0.05em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Validá identidad para operar con confianza.
          </h1>
          <p className="mt-4 text-lg leading-8 text-white/70">
            La identidad aprobada habilita compra protegida, publicaciones y
            menor fricción operativa.
          </p>
          <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/8 p-5">
            <p className="text-sm text-white/60">Estado actual</p>
            <p className="mt-2 text-4xl font-semibold">{getKycStatusLabel(user.kycStatus)}</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--surface-border)] bg-white/88 p-8 shadow-[0_24px_80px_rgba(8,34,71,0.08)]">
          <h2 className="text-2xl font-semibold text-[var(--navy)]">
            {requiresCorrection ? "Corregir documentación" : "Enviar documentación"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Subí frente del DNI, dorso y selfie actual. Si operación pidió una
            corrección, usá fotos nuevas, bien iluminadas y legibles.
          </p>

          {params.success ? (
            <div className="mt-5 rounded-[1.5rem] border border-[rgba(5,150,105,0.18)] bg-[rgba(5,150,105,0.08)] px-5 py-4 text-sm font-medium text-[#065f46]">
              {params.success}
            </div>
          ) : null}

          {params.error ? (
            <div className="mt-5 rounded-[1.5rem] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.08)] px-5 py-4 text-sm font-medium text-[#991b1b]">
              {params.error}
            </div>
          ) : null}

          {isApproved ? (
            <div className="mt-6 rounded-[1.5rem] border border-[rgba(5,150,105,0.18)] bg-[rgba(5,150,105,0.08)] px-5 py-4 text-sm leading-6 text-[#065f46]">
              Tu identidad ya está aprobada. No hace falta reenviar documentación
              salvo que soporte te lo solicite.
            </div>
          ) : null}

          {isPending && !requiresCorrection ? (
            <div className="mt-6 rounded-[1.5rem] border border-[rgba(217,119,6,0.18)] bg-[rgba(217,119,6,0.08)] px-5 py-4 text-sm leading-6 text-[#92400e]">
              Tu documentación está pendiente de revisión. Si subiste una imagen
              incorrecta, podés reenviar el set completo desde este formulario.
            </div>
          ) : null}

          {!isApproved ? (
            <KycCorrectionForm
              defaultDocumentNumber={user.dni}
              latestReviewerNotes={latestVerification?.reviewerNotes}
              requiresCorrection={requiresCorrection}
            />
          ) : null}
        </div>
      </section>

      <section className="mt-8 rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[var(--navy)]">Historial de verificaciones</h2>
          <span className="text-sm text-[var(--muted)]">{user.kycVerifications.length} solicitudes</span>
        </div>
        <div className="mt-5 grid gap-3">
          {user.kycVerifications.map((verification) => (
            <article className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4" key={verification.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--navy)]">
                    {verification.documentType} · {verification.provider}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    Creado: {formatDate(verification.createdAt)}
                  </p>
                  {verification.reviewerNotes ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">{verification.reviewerNotes}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    {verification.documentFrontImageUrl ? (
                      <a className="rounded-full bg-white px-3 py-1 text-[var(--brand-strong)]" href={verification.documentFrontImageUrl} target="_blank" rel="noreferrer">
                        Frente DNI
                      </a>
                    ) : null}
                    {verification.documentBackImageUrl ? (
                      <a className="rounded-full bg-white px-3 py-1 text-[var(--brand-strong)]" href={verification.documentBackImageUrl} target="_blank" rel="noreferrer">
                        Dorso DNI
                      </a>
                    ) : null}
                    {verification.selfieImageUrl ? (
                      <a className="rounded-full bg-white px-3 py-1 text-[var(--brand-strong)]" href={verification.selfieImageUrl} target="_blank" rel="noreferrer">
                        Selfie
                      </a>
                    ) : null}
                    {verification.biometricConsentAt ? (
                      <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-[#047857]">
                        Consentimiento registrado
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                  {getKycStatusLabel(verification.status)}
                </span>
              </div>
            </article>
          ))}
          {user.kycVerifications.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Todavía no enviaste documentación.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
