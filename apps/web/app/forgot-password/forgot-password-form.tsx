"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/session/password-reset/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: formData.get("email")
      })
    });

    if (!response.ok) {
      setError("No pudimos procesar la solicitud. Probá de nuevo en unos minutos.");
      return;
    }

    startTransition(() => {
      setSuccess(
        "Si el email pertenece a una cuenta activa, te enviamos un enlace para crear una contraseña nueva."
      );
    });
  }

  return (
    <form
      action={handleSubmit}
      className="rounded-[2rem] border border-[var(--surface-border)] bg-white/88 p-8 shadow-[0_24px_80px_rgba(8,34,71,0.08)]"
    >
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--brand-strong)]">
          Recuperación
        </p>
        <h1
          className="text-4xl font-semibold tracking-[-0.04em] text-[var(--navy)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Restablecé tu contraseña.
        </h1>
        <p className="text-base leading-7 text-[var(--muted)]">
          Ingresá tu email y te enviaremos un enlace de un solo uso. Por seguridad,
          no confirmamos si la cuenta existe.
        </p>
      </div>

      <label className="mt-8 grid gap-2 text-sm font-medium text-[var(--navy)]">
        Email
        <input
          className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none ring-0 transition focus:border-[var(--brand)]"
          name="email"
          placeholder="tu@email.com"
          required
          type="email"
        />
      </label>

      {error ? (
        <div className="mt-4 rounded-2xl border border-[rgba(213,45,45,0.14)] bg-[rgba(213,45,45,0.06)] px-4 py-3 text-sm text-[#9f1d1d]">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-2xl border border-[rgba(5,150,105,0.18)] bg-[rgba(5,150,105,0.08)] px-4 py-3 text-sm text-[#065f46]">
          {success}
        </div>
      ) : null}

      <button
        className="mt-6 w-full rounded-full bg-[var(--brand)] px-5 py-3.5 font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Enviando..." : "Enviar enlace"}
      </button>

      <Link
        className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-strong)]"
        href="/login"
      >
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
