"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nextPath = searchParams.get("next") ?? "/market";

  async function handleSubmit(formData: FormData) {
    setError(null);

    const email = formData.get("email");
    const password = formData.get("password");

    const response = await fetch("/api/session/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      setError("Credenciales inválidas o sesión no habilitada.");
      return;
    }

    startTransition(() => {
      router.push(nextPath);
      router.refresh();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="rounded-[2rem] border border-[var(--surface-border)] bg-white/88 p-8 shadow-[0_24px_80px_rgba(8,34,71,0.08)]"
    >
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--brand-strong)]">
          Acceso
        </p>
        <h1
          className="text-4xl font-semibold tracking-[-0.04em] text-[var(--navy)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Ingresar a libremercado.
        </h1>
        <p className="text-base leading-7 text-[var(--muted)]">
          Accedé con un usuario validado. La sesión se guarda en cookie segura
          y respeta permisos de usuario, operaciones y administración.
        </p>
      </div>

      <div className="mt-8 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Email
          <input
            className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none ring-0 transition focus:border-[var(--brand)]"
            name="email"
            placeholder="sofia.romero@libremercado.test"
            required
            type="email"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Password
          <input
            className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none ring-0 transition focus:border-[var(--brand)]"
            name="password"
            placeholder="********"
            required
            type="password"
          />
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-[rgba(213,45,45,0.14)] bg-[rgba(213,45,45,0.06)] px-4 py-3 text-sm text-[#9f1d1d]">
          {error}
        </div>
      ) : null}

      <button
        className="mt-6 w-full rounded-full bg-[var(--brand)] px-5 py-3.5 font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Ingresando..." : "Ingresar"}
      </button>

      <div className="mt-6 rounded-[1.5rem] bg-[#f5f9ff] p-4 text-sm leading-6 text-[var(--muted)]">
        Demo:
        <br />
        `sofia.romero@libremercado.test`
        <br />
        `Admin12345!`
        <br />
        `valentina.mendez@libremercado.test`
        <br />
        `Buyer12345!`
      </div>
    </form>
  );
}
