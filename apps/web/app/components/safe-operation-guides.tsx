import {
  buyerGuideSteps,
  sellerGuideSteps
} from "../../lib/safe-operation-guides";

type SafeOperationGuidesProps = {
  compact?: boolean;
  mode?: "both" | "buyer" | "seller";
};

export function SafeOperationGuides({
  compact = false,
  mode = "both"
}: SafeOperationGuidesProps) {
  const guides = [
    ...(mode === "both" || mode === "buyer"
      ? [{ title: "Cómo comprar seguro", steps: buyerGuideSteps }]
      : []),
    ...(mode === "both" || mode === "seller"
      ? [{ title: "Cómo vender seguro", steps: sellerGuideSteps }]
      : [])
  ];

  return (
    <section className="rounded-[2rem] border border-[var(--surface-border)] bg-white/88 p-6 shadow-[0_18px_60px_rgba(8,34,71,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">
        Guía rápida
      </p>
      <h2
        className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--navy)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Operá sin improvisar
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Una operación segura depende de pocos hábitos: identidad aprobada, pago
        protegido, entrega trazable y mensajes dentro de la plataforma.
      </p>

      <div className={compact ? "mt-5 grid gap-4" : "mt-6 grid gap-4 lg:grid-cols-2"}>
        {guides.map((guide) => (
          <article
            className="rounded-[1.5rem] border border-[rgba(18,107,255,0.12)] bg-[#f8fbff] p-5"
            key={guide.title}
          >
            <h3 className="text-lg font-semibold text-[var(--navy)]">{guide.title}</h3>
            <ol className="mt-4 grid gap-3">
              {guide.steps.map((step, index) => (
                <li className="flex gap-3" key={step.title}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--navy)]">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                      {step.body}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
