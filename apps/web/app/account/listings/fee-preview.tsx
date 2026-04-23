"use client";

import { useState } from "react";

import { calculateSellerNetAmount, type PlatformSettings } from "../../../lib/platform-settings";
import { formatCurrency } from "../../../lib/format";

type FeePreviewProps = {
  settings: PlatformSettings;
  defaultPrice?: number;
  defaultCurrency?: "ARS" | "USD";
};

export function FeePreview({
  settings,
  defaultPrice = 0,
  defaultCurrency = settings.defaultCurrency
}: FeePreviewProps) {
  const [price, setPrice] = useState(defaultPrice);
  const [currency, setCurrency] = useState<"ARS" | "USD">(defaultCurrency);
  const fee = calculateSellerNetAmount(price, settings);

  return (
    <div className="rounded-[1.5rem] border border-[rgba(18,107,255,0.14)] bg-[#f5f9ff] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--navy)]">
            Cálculo transparente para el vendedor
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Publicar es gratis. La comisión se descuenta recién cuando la venta
            se concreta.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
          Vendedor {fee.commissionPercentage}% · Comprador {Number(settings.buyerCommissionPercentage)}%
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Precio de publicación
          <input
            className="rounded-2xl border border-[var(--surface-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--navy)] outline-none focus:border-[var(--brand)]"
            min="1"
            name="price"
            onChange={(event) => setPrice(Number(event.target.value))}
            required
            type="number"
            value={price || ""}
          />
        </label>
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Moneda
          <select
            className="rounded-2xl border border-[var(--surface-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--navy)] outline-none focus:border-[var(--brand)]"
            name="currency"
            onChange={(event) => setCurrency(event.target.value as "ARS" | "USD")}
            required
            value={currency}
          >
            <option value="ARS">Pesos argentinos</option>
            {settings.allowUsdListings ? <option value="USD">Dólares USD</option> : null}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-[var(--muted)]">Precio publicado</p>
          <p className="mt-1 text-xl font-semibold text-[var(--navy)]">
            {formatCurrency(price || 0, currency)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-[var(--muted)]">Comisión al vender</p>
          <p className="mt-1 text-xl font-semibold text-[#b45309]">
            {formatCurrency(fee.totalFee, currency)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-[var(--muted)]">Recibís estimado</p>
          <p className="mt-1 text-xl font-semibold text-[#047857]">
            {formatCurrency(fee.netAmount, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
