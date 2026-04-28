import Link from "next/link";

const heroSignals = [
  { value: "5% máx.", label: "comisión vendedora simple, sin costo fijo por publicar" },
  { value: "4 capas", label: "identidad, fondos retenidos, seguro y encuentro seguro" },
  { value: "ARS + USD", label: "economics pensados para usados premium en Argentina" }
];

const marketGap = [
  {
    title: "Marketplace informal",
    description:
      "Liquidez sin control transaccional. Mucho volumen potencial, pero demasiado riesgo para bienes de ticket alto.",
    points: ["Perfiles descartables", "Pago por fuera", "Fraude y no-show"]
  },
  {
    title: "Marketplace corporativo",
    description:
      "Infraestructura robusta, pero con costos y fricción que expulsan parte del usado de alto valor y la venta ocasional.",
    points: ["Comisiones altas", "Experiencia genérica", "Menor flexibilidad C2C"]
  },
  {
    title: "La oportunidad",
    description:
      "Una categoría enorme de transacciones que hoy no suceden por falta de confianza, no por falta de demanda.",
    points: [
      "Comisiones super bajas",
      "4 capas de seguridad",
      "Seguro opcional embebido",
      "Fondos retenidos hasta validar la operación"
    ]
  }
];

const trustStack = [
  {
    eyebrow: "Identidad verificada",
    title: "La transacción empieza con una persona real.",
    description:
      "Publicar y comprar requiere validación documental y biométrica, reduciendo cuentas descartables, fraude y disputas sin respaldo."
  },
  {
    eyebrow: "Fondos retenidos",
    title: "El dinero no viaja directo al vendedor.",
    description:
      "La plataforma retiene y libera fondos según el estado de la operación, dejando trazabilidad clara para ambas partes."
  },
  {
    eyebrow: "Encuentro seguro",
    title: "La coordinación también forma parte del producto.",
    description:
      "El flujo contempla propuestas de franjas horarias, mensajería y puntos de encuentro controlados para bajar incertidumbre operativa."
  },
  {
    eyebrow: "Seguro embebido",
    title: "Protección opcional en el momento exacto de la compra.",
    description:
      "En categorías de alto valor, el comprador puede sumar una cobertura específica sin salir del checkout."
  }
];

const insuranceFlow = [
  "Cotización automática solo en categorías elegibles y tickets altos.",
  "Selección opcional durante el checkout, sin desviar a otro canal.",
  "Emisión después de confirmación de pago y soporte de reclamo trazable."
];

const roadmap = [
  {
    phase: "Fase 1",
    title: "Confianza transaccional",
    description:
      "Cerrar el núcleo: identidad, escrow, notificaciones, conciliación operativa y experiencia segura de compra/venta."
  },
  {
    phase: "Fase 2",
    title: "Densidad y partners",
    description:
      "Integrar pagos reales, storage productivo, proveedores de identidad y seguros, y activar oferta en verticales premium."
  },
  {
    phase: "Fase 3",
    title: "Escala nacional",
    description:
      "Expandir red logística, acuerdos comerciales y capa de riesgo para convertir confianza en liquidez repetible."
  }
];

const partnerTracks = [
  {
    title: "Para inversores",
    description:
      "Estamos construyendo infraestructura de confianza para un mercado enorme, fragmentado y todavía mal servido en Argentina."
  },
  {
    title: "Para proveedores",
    description:
      "La arquitectura ya contempla puntos de integración concretos para pagos, seguros, identidad, storage, mensajería y cloud."
  }
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[680px] bg-[radial-gradient(circle_at_top,rgba(18,107,255,0.22),transparent_44%)]" />
      <div className="absolute right-[-10%] top-20 -z-10 h-96 w-96 rounded-full bg-[rgba(45,179,255,0.16)] blur-3xl" />
      <div className="absolute left-[-8%] top-[32rem] -z-10 h-80 w-80 rounded-full bg-[rgba(18,107,255,0.12)] blur-3xl" />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-16 pt-6 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--navy)] text-lg font-semibold text-white">
              lm
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">libremercado</p>
              <p className="text-sm text-[var(--muted)]">Trust-tech para usados de alto valor</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-[var(--muted)] md:flex">
            <a href="#problema">Mercado</a>
            <a href="#solucion">Solución</a>
            <a href="#vision">Visión</a>
            <Link
              href="/market"
              className="rounded-full bg-[var(--navy)] px-5 py-2.5 font-semibold text-white"
            >
              Ver plataforma
            </Link>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.06fr_0.94fr] lg:py-16">
          <div className="space-y-8">
            <span className="inline-flex rounded-full border border-[var(--surface-border)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--brand-strong)] shadow-sm">
              Infraestructura de confianza para el comercio C2C en Argentina
            </span>

            <div className="space-y-5">
              <h1
                className="max-w-4xl text-5xl font-semibold leading-none tracking-[-0.05em] sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                El mercado de usados de alto valor necesita menos miedo y mejor infraestructura.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
                libremercado construye una capa de confianza entre comprador y
                vendedor para destrabar transacciones que hoy no ocurren por
                fraude, fricción o falta de garantías operativas.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/market"
                className="button-primary shadow-[0_14px_40px_rgba(8,34,71,0.18)]"
              >
                Ver producto funcionando
              </Link>
              <Link
                href="/signup"
                className="button-primary"
              >
                Crear cuenta
              </Link>
              <Link
                href="/login"
                className="button-secondary"
              >
                Ingresar
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {heroSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-[1.5rem] border border-[var(--surface-border)] bg-white/80 p-5 shadow-[0_14px_40px_rgba(8,34,71,0.06)]"
                >
                  <p className="text-3xl font-semibold text-[var(--navy)]">{signal.value}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{signal.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-10 top-10 h-64 rounded-full bg-[rgba(18,107,255,0.14)] blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.3rem] border border-[rgba(255,255,255,0.72)] bg-[linear-gradient(160deg,rgba(8,34,71,0.98),rgba(9,41,87,0.94)_58%,rgba(14,77,175,0.88))] p-6 text-white shadow-[0_30px_100px_rgba(8,34,71,0.28)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    Trust-Tech Stack
                  </p>
                  <h2
                    className="mt-3 max-w-sm text-3xl font-semibold leading-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    No es un clasificado. Es una operación diseñada para cerrarse mejor.
                  </h2>
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
                  High-value C2C
                </div>
              </div>

              <div className="mt-8 grid gap-4">
                {trustStack.slice(0, 3).map((pillar) => (
                  <article
                    key={pillar.title}
                    className="rounded-[1.5rem] border border-white/10 bg-white/8 p-5"
                  >
                    <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
                      {pillar.eyebrow}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/72">{pillar.description}</p>
                  </article>
                ))}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                <p className="text-sm text-white/60">Diferencial operativo</p>
                <p className="mt-2 text-base font-medium">
                  Seguro opcional, coordinación segura y trazabilidad de punta a punta.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="problema" className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
        <div className="rounded-[2rem] border border-[var(--surface-border)] bg-white/78 p-8 shadow-[0_18px_60px_rgba(8,34,71,0.06)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[var(--brand-strong)]">
                La grieta del mercado
              </p>
              <h2
                className="mt-3 max-w-3xl text-4xl font-semibold leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Entre el “lejano oeste” y la burocracia cara hay un océano azul sin capturar.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
              Las operaciones premium entre personas existen, pero muchas no se concretan.
              El freno no es la demanda: es la falta de un sistema confiable para cerrar.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {marketGap.map((card) => (
              <article
                key={card.title}
                className="rounded-[1.5rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#ffffff,rgba(232,240,255,0.55))] p-6"
              >
                <h3 className="text-xl font-semibold text-[var(--navy)]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{card.description}</p>
                <div className="mt-5 grid gap-2">
                  {card.points.map((point) => (
                    <div
                      key={point}
                      className="rounded-full bg-[rgba(8,34,71,0.05)] px-3 py-2 text-sm text-[var(--muted)]"
                    >
                      {point}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-[2rem] border border-[var(--surface-border)] bg-white/82 p-8 shadow-[0_18px_60px_rgba(8,34,71,0.05)]">
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--brand-strong)]">
              Diferencial defendible
            </p>
            <h2
              className="mt-3 text-4xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Embedded insurance en el punto exacto donde hoy se rompe la confianza.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              El seguro no aparece como add-on cosmético. Se ofrece solo cuando
              el ticket y la categoría lo justifican, y se integra al flujo
              transaccional con emisión y reclamo trazables.
            </p>
            <ol className="mt-6 grid gap-3">
              {insuranceFlow.map((step, index) => (
                <li
                  key={step}
                  className="flex items-start gap-4 rounded-[1.25rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#ffffff,#f5f9ff)] p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-6 text-[var(--muted)]">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-[2rem] border border-[rgba(18,107,255,0.16)] bg-[linear-gradient(180deg,#0c2d63,#123f8f)] p-8 text-white shadow-[0_24px_80px_rgba(8,34,71,0.18)]">
            <p className="text-sm uppercase tracking-[0.35em] text-white/55">Seguridad visible</p>
            <div className="mt-6 grid gap-4">
              {[
                "Identidad verificada",
                "Posibilidad de asegurar la transacción",
                "Puntos de encuentro seguros",
                "Retención del dinero hasta cerrar la operación"
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.25rem] border border-white/10 bg-white/8 px-5 py-4 text-base font-medium"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="vision" className="mx-auto w-full max-w-7xl px-6 py-8 pb-20 sm:px-10 lg:px-12">
        <div className="rounded-[2rem] border border-[var(--surface-border)] bg-white/80 p-8 shadow-[0_20px_70px_rgba(8,34,71,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[var(--brand-strong)]">
                Visión e integración
              </p>
              <h2
                className="mt-3 text-4xl font-semibold leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Estamos construyendo una red nacional de confianza para comercio entre personas.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
              La oportunidad no es solo captar oferta y demanda. Es convertirse en
              la capa que ordena identidad, riesgo, pagos y cumplimiento en un
              mercado históricamente informal.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {roadmap.map((item) => (
              <article
                key={item.phase}
                className="rounded-[1.5rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#ffffff,rgba(220,233,255,0.45))] p-5"
              >
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
                  {item.phase}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-[var(--navy)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {partnerTracks.map((track) => (
              <article
                key={track.title}
                className="rounded-[1.5rem] border border-[rgba(18,107,255,0.12)] bg-[linear-gradient(180deg,#f8fbff,#eef5ff)] p-6"
              >
                <h3 className="text-2xl font-semibold text-[var(--navy)]">{track.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{track.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/market"
              className="rounded-full bg-[var(--brand)] px-6 py-3.5 font-semibold text-white shadow-[0_14px_40px_rgba(18,107,255,0.2)] transition hover:bg-[var(--brand-strong)]"
            >
              Recorrer el producto
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-[var(--surface-border)] bg-white px-6 py-3.5 font-semibold text-[var(--foreground)]"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
