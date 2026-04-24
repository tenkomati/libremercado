"use client";

import { useState } from "react";

import { formatCurrency } from "../../../lib/format";

type PurchaseCheckoutCardProps = {
  action: (formData: FormData) => void;
  listingId: string;
  basePrice: string;
  currency: "ARS" | "USD";
  insuranceQuote:
    | {
        eligible: boolean;
        provider: {
          name: string;
        };
        requiresIdentityVerified?: boolean;
        pricing: {
          premiumAmount: string;
          coverageAmount: string;
          totalWithInsurance: string;
        };
        reason: string | null;
      }
    | null;
};

export function PurchaseCheckoutCard({
  action,
  listingId,
  basePrice,
  currency,
  insuranceQuote
}: PurchaseCheckoutCardProps) {
  const [insuranceSelected, setInsuranceSelected] = useState(false);
  const insuranceEnabled = insuranceQuote?.eligible ?? false;
  const requiresIdentityVerified = insuranceQuote?.requiresIdentityVerified ?? false;
  const totalPrice =
    insuranceSelected && insuranceQuote
      ? insuranceQuote.pricing.totalWithInsurance
      : basePrice;

  return (
    <form action={action} className="mt-7">
      <input name="listingId" type="hidden" value={listingId} />

      {insuranceQuote ? (
        <div className="mb-4 rounded-[1.5rem] border border-[rgba(8,34,71,0.08)] bg-[#f8fbff] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--navy)]">
                Micro-seguro opcional
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Cobertura extra contra robo o estafa en productos de alto valor.
              </p>
            </div>
            {insuranceEnabled && !requiresIdentityVerified ? (
              <label className="inline-flex items-center gap-2 rounded-full border border-[rgba(18,107,255,0.16)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)]">
                <input
                  checked={insuranceSelected}
                  name="insuranceSelected"
                  onChange={(event) => setInsuranceSelected(event.target.checked)}
                  type="checkbox"
                />
                Agregar seguro
              </label>
            ) : (
              <span className="rounded-full bg-[#fff7ed] px-4 py-2 text-sm font-semibold text-[#92400e]">
                {requiresIdentityVerified ? "Requiere identidad aprobada" : "No elegible"}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs text-[var(--muted)]">Prima</p>
              <p className="mt-1 text-lg font-semibold text-[var(--navy)]">
                {formatCurrency(
                  insuranceQuote.pricing.premiumAmount,
                  currency
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs text-[var(--muted)]">Cobertura</p>
              <p className="mt-1 text-lg font-semibold text-[var(--navy)]">
                {formatCurrency(
                  insuranceQuote.pricing.coverageAmount,
                  currency
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs text-[var(--muted)]">Proveedor</p>
              <p className="mt-1 text-lg font-semibold text-[var(--navy)]">
                {insuranceQuote.provider.name}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-[var(--muted)]">
            {requiresIdentityVerified
              ? "Necesitás identidad aprobada para emitir el micro-seguro."
              : insuranceEnabled
              ? `Total con seguro: ${formatCurrency(totalPrice, currency)}`
              : insuranceQuote.reason ?? "Esta operación no califica para seguro."}
          </p>
        </div>
      ) : null}

      <button
        className="w-full rounded-full bg-[var(--brand)] px-5 py-4 font-semibold text-white shadow-[0_14px_40px_rgba(18,107,255,0.24)] transition hover:bg-[var(--brand-strong)]"
        type="submit"
      >
        {insuranceSelected
          ? `Comprar con pago protegido + seguro por ${formatCurrency(totalPrice, currency)}`
          : "Comprar con pago protegido"}
      </button>
    </form>
  );
}
