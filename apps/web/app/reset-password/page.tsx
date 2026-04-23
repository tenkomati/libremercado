import Link from "next/link";

import { ResetPasswordForm } from "./reset-password-form";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams
}: ResetPasswordPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-10 sm:px-10 lg:px-12">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-center space-y-6">
          <div className="inline-flex w-fit rounded-full border border-[var(--surface-border)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--brand-strong)]">
            acceso protegido
          </div>
          <div className="space-y-4">
            <h2
              className="text-5xl font-semibold tracking-[-0.05em] text-[var(--navy)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Tu cuenta vuelve a estar bajo tu control.
            </h2>
            <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Este paso invalida todos los enlaces de recuperación anteriores
              para reducir riesgo de reutilización.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-full border border-[var(--surface-border)] bg-white px-5 py-3 font-semibold"
              href="/"
            >
              Volver al home
            </Link>
            <Link
              className="rounded-full border border-[var(--surface-border)] bg-white px-5 py-3 font-semibold"
              href="/login"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>

        <ResetPasswordForm token={params.token ?? ""} />
      </div>
    </main>
  );
}
