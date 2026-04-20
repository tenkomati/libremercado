import Link from "next/link";

const trustPillars = [
  {
    label: "Identidad verificada",
    title: "Identidad obligatoria antes de publicar o comprar",
    description:
      "Cada cuenta transaccional pasa por verificacion documental y biometrica para bajar fraude, perfiles descartables y disputas sin respaldo."
  },
  {
    label: "Pago protegido",
    title: "La plata no viaja directo al vendedor",
    description:
      "El dinero se inmoviliza, se sigue la entrega y solo se libera cuando el producto llega y el comprador tiene ventana de validacion."
  },
  {
    label: "Costo justo",
    title: "Comision pensada para usados, no para retail",
    description:
      "La plataforma se concentra en C2C de segunda mano y evita estructuras pesadas para sostener economics de 3% a 5%."
  }
];

const marketSignals = [
  { value: "48 hs", label: "ventana de validacion post entrega" },
  { value: "3-5%", label: "comision objetivo del marketplace" },
  { value: "100%", label: "transacciones con identidad verificada" }
];

const categories = [
  "Tecnologia",
  "Moda premium",
  "Gaming",
  "Hogar",
  "Movilidad",
  "Deportes"
];

const roadmap = [
  {
    phase: "Fase 01",
    title: "Confianza operacional",
    description:
      "Registro, verificacion de identidad, reputacion y gobierno de riesgo como gate de toda operacion."
  },
  {
    phase: "Fase 02",
    title: "Marketplace con liquidez",
    description:
      "Catalogo, discovery por cercania, publicaciones asistidas por IA y pricing sugerido."
  },
  {
    phase: "Fase 03",
    title: "Checkout protegido",
    description:
      "Pago protegido, tracking integrado, liberacion de fondos y circuito formal de disputas."
  },
  {
    phase: "Fase 04",
    title: "Escala nacional",
    description:
      "Orquestacion logistica, riesgo en tiempo real y expansion de categorias de alta demanda."
  }
];

const trustFlow = [
  "Alta del usuario con identidad real y scoring inicial.",
  "Publicacion guiada con IA, fotos limpias y precio sugerido.",
  "Compra con prioridad por cercania y pago protegido.",
  "Despacho trazable, confirmacion de entrega y liberacion de fondos."
];

const comparison = [
  {
    title: "Facebook Marketplace",
    traits: ["Liquidez alta", "Sin pago protegido", "Alta exposicion a fraude"]
  },
  {
    title: "Mercado Libre",
    traits: ["Infra robusta", "Comision alta", "Friccion mayor para C2C casual"]
  },
  {
    title: "libremercado",
    traits: ["Identidad obligatoria", "Pago protegido nativo", "Economics pensados para usados"]
  }
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(circle_at_top,rgba(18,107,255,0.22),transparent_42%)]" />
      <div className="absolute right-[-10%] top-16 -z-10 h-80 w-80 rounded-full bg-[rgba(45,179,255,0.18)] blur-3xl" />
      <div className="absolute left-[-8%] top-72 -z-10 h-72 w-72 rounded-full bg-[rgba(18,107,255,0.14)] blur-3xl" />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-16 pt-6 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--navy)] text-lg font-semibold text-white">
              lm
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">libremercado</p>
              <p className="text-sm text-[var(--muted)]">Marketplace C2C de confianza</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-[var(--muted)] md:flex">
            <a href="#trust">Confianza</a>
            <a href="#arquitectura">Arquitectura</a>
            <a href="#categorias">Categorias</a>
            <a href="#roadmap">Roadmap</a>
            <Link
              href="/signup"
              className="rounded-full bg-[var(--navy)] px-5 py-2.5 font-semibold text-white"
            >
              Crear cuenta
            </Link>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
          <div className="space-y-8">
            <span className="inline-flex rounded-full border border-[var(--surface-border)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--brand-strong)] shadow-sm">
              Argentina 2026 · confianza, escala y bajo costo
            </span>

            <div className="space-y-5">
              <h1
                className="max-w-4xl text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                El marketplace de usados que se siente grande desde el primer clic.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
                libremercado toma lo mejor de los lideres del mercado, elimina
                la friccion innecesaria y pone identidad validada, pago protegido y
                logistica trazable en el centro del producto.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-[var(--brand)] px-6 py-3.5 font-semibold text-white shadow-[0_14px_40px_rgba(18,107,255,0.25)] transition hover:bg-[var(--brand-strong)]"
              >
                Crear cuenta segura
              </Link>
              <Link
                href="/market"
                className="rounded-full border border-[var(--surface-border)] bg-white/85 px-6 py-3.5 font-semibold text-[var(--foreground)] backdrop-blur"
              >
                Explorar market live
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-[var(--surface-border)] bg-white/85 px-6 py-3.5 font-semibold text-[var(--foreground)] backdrop-blur"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/admin"
                className="rounded-full border border-[var(--surface-border)] bg-white/85 px-6 py-3.5 font-semibold text-[var(--foreground)] backdrop-blur"
              >
                Ver consola admin
              </Link>
              <Link
                href="/account"
                className="rounded-full border border-[var(--surface-border)] bg-white/85 px-6 py-3.5 font-semibold text-[var(--foreground)] backdrop-blur"
              >
                Mi cuenta
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {marketSignals.map((signal) => (
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
            <div className="absolute inset-x-12 top-8 h-56 rounded-full bg-[rgba(18,107,255,0.14)] blur-3xl" />
            <div className="relative rounded-[2rem] border border-[rgba(255,255,255,0.7)] bg-[linear-gradient(180deg,rgba(8,34,71,0.98),rgba(9,41,87,0.94))] p-6 text-white shadow-[0_30px_100px_rgba(8,34,71,0.28)]">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">Trust OS</p>
                  <h2
                    className="mt-2 text-3xl font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Operacion blindada para C2C.
                  </h2>
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
                  Live stack
                </div>
              </div>

              <div className="grid gap-4 py-6">
                {trustPillars.map((pillar) => (
                  <article
                    key={pillar.title}
                    className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5"
                  >
                    <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
                      {pillar.label}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/70">{pillar.description}</p>
                  </article>
                ))}
              </div>

              <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-white/55">Prioridad de busqueda</p>
                  <p className="mt-2 text-base font-medium">Cercania primero, escala despues</p>
                </div>
                <div>
                  <p className="text-sm text-white/55">Disputas</p>
                  <p className="mt-2 text-base font-medium">Trazabilidad + evidencia + arbitraje</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="trust" className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
        <div className="grid gap-6 rounded-[2rem] border border-[var(--surface-border)] bg-white/75 p-6 shadow-[0_18px_60px_rgba(8,34,71,0.06)] backdrop-blur lg:grid-cols-[0.8fr_1.2fr] lg:p-8">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--brand-strong)]">
              Arquitectura de confianza
            </p>
            <h2
              className="text-4xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              La categoria ya no tolera clasificados sin control transaccional.
            </h2>
            <p className="text-base leading-7 text-[var(--muted)]">
              Los grandes jugadores enseñaron dos cosas: la liquidez sin
              seguridad escala fraude, y la seguridad sin eficiencia expulsa al
              vendedor ocasional. libremercado nace exactamente en el medio.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {comparison.map((card) => (
              <article
                key={card.title}
                className={`rounded-[1.5rem] border p-5 ${
                  card.title === "libremercado"
                    ? "border-[rgba(18,107,255,0.22)] bg-[linear-gradient(180deg,#f8fbff,#eaf2ff)]"
                    : "border-[var(--surface-border)] bg-white"
                }`}
              >
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <div className="mt-4 grid gap-2">
                  {card.traits.map((trait) => (
                    <div
                      key={trait}
                      className="rounded-full bg-[rgba(8,34,71,0.05)] px-3 py-2 text-sm text-[var(--muted)]"
                    >
                      {trait}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="arquitectura"
        className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 sm:px-10 lg:grid-cols-[1fr_1fr] lg:px-12"
      >
        <div className="rounded-[2rem] border border-[var(--surface-border)] bg-[var(--navy)] p-8 text-white shadow-[0_24px_80px_rgba(8,34,71,0.18)]">
          <p className="text-sm uppercase tracking-[0.35em] text-white/55">Flujo operativo</p>
          <ol className="mt-6 grid gap-4">
            {trustFlow.map((step, index) => (
              <li
                key={step}
                className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[var(--navy)]">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-7 text-white/78">{step}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div id="categorias" className="space-y-6">
          <div className="rounded-[2rem] border border-[var(--surface-border)] bg-white/80 p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--accent)]">
              Categorias prioritarias
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-[rgba(18,107,255,0.15)] bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--navy)]"
                >
                  {category}
                </span>
              ))}
            </div>
            <p className="mt-6 text-base leading-7 text-[var(--muted)]">
              La entrada por categorias de ticket medio y alta rotacion permite
              construir densidad, reputacion y repeticion antes de abrir el
              abanico completo.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#ffffff,#f0f6ff)] p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--brand-strong)]">
              Posicionamiento
            </p>
            <h3
              className="mt-3 text-3xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Una experiencia de marketplace nacional con estetica de institucion.
            </h3>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              El tono visual apunta a confianza mas que a promo. Mucho aire,
              bloques limpios, señal de infraestructura y una promesa simple:
              comprar y vender usados sin entrar en terreno gris.
            </p>
          </div>
        </div>
      </section>

      <section id="roadmap" className="mx-auto w-full max-w-7xl px-6 py-8 pb-20 sm:px-10 lg:px-12">
        <div className="rounded-[2rem] border border-[var(--surface-border)] bg-white/80 p-8 shadow-[0_20px_70px_rgba(8,34,71,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[var(--brand-strong)]">
                Roadmap MVP
              </p>
              <h2
                className="mt-3 text-4xl font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                De producto confiable a red de alcance nacional.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-[var(--muted)]">
              El orden importa: primero confianza, despues liquidez, luego
              checkout y finalmente escala de operaciones.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
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
        </div>
      </section>
    </main>
  );
}
