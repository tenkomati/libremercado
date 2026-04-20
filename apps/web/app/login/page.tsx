import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { verifySessionToken } from "../../lib/auth";

import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const token = (await cookies()).get("libremercado_admin_token")?.value;
  const params = (await searchParams) ?? {};
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/market";

  if (token) {
    try {
      await verifySessionToken(token);
      redirect(nextPath);
    } catch {
      // Ignore invalid cookie and show login.
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-10 sm:px-10 lg:px-12">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-center space-y-6">
          <div className="inline-flex w-fit rounded-full border border-[var(--surface-border)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--brand-strong)]">
            libremercado access
          </div>
          <div className="space-y-4">
            <h2
              className="text-5xl font-semibold tracking-[-0.05em] text-[var(--navy)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Acceso protegido para comprar, vender y operar.
            </h2>
            <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Iniciá sesión para comprar con pago protegido, volver a una
              publicación o entrar a la consola si tu rol es `ADMIN` u `OPS`.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-[var(--surface-border)] bg-white px-5 py-3 font-semibold"
            >
              Volver al home
            </Link>
            <Link
              href="/market"
              className="rounded-full border border-[var(--surface-border)] bg-white px-5 py-3 font-semibold"
            >
              Ver market
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent(nextPath)}`}
              className="rounded-full bg-[var(--brand)] px-5 py-3 font-semibold text-white"
            >
              Crear cuenta
            </Link>
          </div>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
