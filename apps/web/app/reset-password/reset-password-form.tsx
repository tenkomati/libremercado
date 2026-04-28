"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);

    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const response = await fetch("/api/session/password-reset/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token,
        newPassword
      })
    });

    if (!response.ok) {
      setError("El enlace es inválido, ya fue usado o venció.");
      return;
    }

    startTransition(() => {
      setSuccess(true);
    });
  }

  if (!token) {
    return (
      <div className="rounded-[2rem] border border-[rgba(213,45,45,0.14)] bg-white/88 p-8 text-[#9f1d1d] shadow-[0_24px_80px_rgba(8,34,71,0.08)]">
        <h1 className="text-3xl font-semibold text-[var(--navy)]">
          Enlace inválido
        </h1>
        <p className="mt-3 leading-7">
          Pedí un nuevo enlace para restablecer tu contraseña.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-[var(--brand)] px-5 py-3 font-semibold text-white"
          href="/forgot-password"
        >
          Pedir nuevo enlace
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-[2rem] border border-[rgba(5,150,105,0.18)] bg-white/88 p-8 text-[#065f46] shadow-[0_24px_80px_rgba(8,34,71,0.08)]">
        <h1 className="text-3xl font-semibold text-[var(--navy)]">
          Contraseña actualizada
        </h1>
        <p className="mt-3 leading-7">
          Ya podés iniciar sesión con tu nueva contraseña.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-[var(--brand)] px-5 py-3 font-semibold text-white"
          href="/login"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="rounded-[2rem] border border-[var(--surface-border)] bg-white/88 p-8 shadow-[0_24px_80px_rgba(8,34,71,0.08)]"
    >
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--brand-strong)]">
          Nueva contraseña
        </p>
        <h1
          className="text-4xl font-semibold tracking-[-0.04em] text-[var(--navy)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Creá una contraseña nueva.
        </h1>
        <p className="text-base leading-7 text-[var(--muted)]">
          Usá una contraseña distinta a la anterior. El enlace queda invalidado
          cuando completes el cambio.
        </p>
      </div>

      <div className="mt-8 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Nueva contraseña
          <input
            className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none ring-0 transition focus:border-[var(--brand)]"
            minLength={8}
            name="newPassword"
            required
            type="password"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Confirmar contraseña
          <input
            className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none ring-0 transition focus:border-[var(--brand)]"
            minLength={8}
            name="confirmPassword"
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
        className="button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Guardando..." : "Actualizar contraseña"}
      </button>
    </form>
  );
}
