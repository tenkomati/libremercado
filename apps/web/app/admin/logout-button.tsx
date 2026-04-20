"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    await fetch("/api/session/logout", {
      method: "POST"
    });

    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      className="rounded-full border border-white/15 bg-white/10 px-5 py-3 font-semibold text-white"
      disabled={isPending}
      onClick={handleLogout}
      type="button"
    >
      {isPending ? "Saliendo..." : "Cerrar sesion"}
    </button>
  );
}
