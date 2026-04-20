"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function getErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return "No se pudo crear la cuenta. Revisá los datos e intentá de nuevo.";
}

export function SignupForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    const phone = String(formData.get("phone") ?? "").trim();

    const response = await fetch("/api/session/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: formData.get("email"),
        dni: formData.get("dni"),
        password: formData.get("password"),
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        ...(phone ? { phone } : {}),
        province: formData.get("province"),
        city: formData.get("city")
      })
    });

    if (!response.ok) {
      setError(getErrorMessage(await response.json().catch(() => undefined)));
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
          Crear cuenta
        </p>
        <h1
          className="text-4xl font-semibold tracking-[-0.04em] text-[var(--navy)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Entrá al marketplace protegido.
        </h1>
        <p className="text-base leading-7 text-[var(--muted)]">
          La cuenta queda creada con verificación pendiente. Para comprar o
          vender con pago protegido, operación debe aprobar la identidad desde admin.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Nombre
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="firstName" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Apellido
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="lastName" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)] md:col-span-2">
          Email
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="email" required type="email" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          DNI
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="dni" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Teléfono
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="phone" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Provincia
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="province" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Ciudad
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="city" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)] md:col-span-2">
          Password
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" minLength={8} name="password" required type="password" />
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
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
