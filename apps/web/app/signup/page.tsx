import Link from "next/link";

import { SignupForm } from "./signup-form";

type SignupPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/market";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-10 sm:px-10 lg:px-12">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-center space-y-6">
          <div className="inline-flex w-fit rounded-full border border-[var(--surface-border)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--brand-strong)]">
            Frontoffice seguro
          </div>
          <div className="space-y-4">
            <h2
              className="text-5xl font-semibold tracking-[-0.05em] text-[var(--navy)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Comprá y vendé usados con identidad y pago protegido.
            </h2>
            <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Esta cuenta te permite entrar al flujo público. Para operar con
              pago protegido, la identidad debe quedar aprobada por el equipo de riesgo.
              El alta incluye datos personales, fotos del DNI y selfie.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/market"
              className="rounded-full border border-[var(--surface-border)] bg-white px-5 py-3 font-semibold"
            >
              Ver market
            </Link>
            <Link
              href="/login?next=/market"
              className="rounded-full bg-[var(--navy)] px-5 py-3 font-semibold text-white"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>

        <SignupForm nextPath={nextPath} />
      </div>
    </main>
  );
}
