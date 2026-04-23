import {
  getProtectedPurchaseSummary,
  protectedPurchaseTerms
} from "../../lib/protected-purchase-terms";

type ProtectedPurchaseTermsProps = {
  compact?: boolean;
  title?: string;
};

export function ProtectedPurchaseTerms({
  compact = false,
  title = "Reglas claras de compra protegida"
}: ProtectedPurchaseTermsProps) {
  return (
    <section className="rounded-[2rem] border border-[var(--surface-border)] bg-white/88 p-6 shadow-[0_18px_60px_rgba(8,34,71,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
        Compra protegida
      </p>
      <h2
        className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--navy)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {getProtectedPurchaseSummary()}
      </p>

      <div className={compact ? "mt-5 grid gap-3" : "mt-5 grid gap-4 md:grid-cols-3"}>
        {protectedPurchaseTerms.map((term) => (
          <article
            className="rounded-[1.25rem] border border-[rgba(18,107,255,0.12)] bg-[#f8fbff] p-4"
            key={term.title}
          >
            <p className="font-semibold text-[var(--navy)]">{term.title}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{term.body}</p>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
        Estos textos son una explicación operativa del MVP. Antes de beta pública deben
        transformarse en términos legales revisados.
      </p>
    </section>
  );
}
