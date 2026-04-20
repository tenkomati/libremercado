import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../lib/api";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";
import { formatCurrency, formatDate } from "../../lib/format";

export const dynamic = "force-dynamic";

type AccountUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  province: string;
  city: string;
  status: string;
  role: string;
  kycStatus: string;
  reputationScore: string;
  listings: Array<{
    id: string;
    title: string;
    category: string;
    condition: string;
    status: string;
    price: string;
    locationCity: string;
    locationProvince: string;
    createdAt: string;
  }>;
  buyerEscrows: Array<{
    id: string;
    amount: string;
    status: string;
    createdAt: string;
    listing: { id: string; title: string };
    seller: { firstName: string; lastName: string };
  }>;
  sellerEscrows: Array<{
    id: string;
    amount: string;
    status: string;
    createdAt: string;
    listing: { id: string; title: string };
    buyer: { firstName: string; lastName: string };
  }>;
  kycVerifications: Array<{
    id: string;
    status: string;
    provider: string;
    documentType: string;
    createdAt: string;
    reviewerNotes: string | null;
  }>;
};

async function getAccount() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?next=/account");
  }

  let session;

  try {
    session = await verifySessionToken(token);
  } catch {
    redirect("/login?next=/account");
  }

  const user = await apiFetchWithToken<AccountUser>(`/users/${session.sub}`, token);
  return { token, user };
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
      {label}
    </span>
  );
}

export default async function AccountPage() {
  const { user } = await getAccount();
  const canCreateListing = user.status === "ACTIVE" && user.kycStatus === "APPROVED";

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      <section className="rounded-[2rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#082247,#0d3270)] p-8 text-white shadow-[0_22px_80px_rgba(8,34,71,0.24)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
              Mi cuenta
            </span>
            <h1
              className="mt-4 text-5xl font-semibold tracking-[-0.04em]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Hola, {user.firstName}. Tu operación protegida vive acá.
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-white/70">
              Revisá compras, ventas, publicaciones y estado de identidad antes
              de operar con pago protegido.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/market" className="rounded-full border border-white/15 bg-white/10 px-5 py-3 font-semibold">
              Ver market
            </Link>
            <Link href="/account/listings/new" className="rounded-full bg-white px-5 py-3 font-semibold text-[var(--navy)]">
              Publicar producto
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Perfil</h2>
            <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
              <p className="text-lg font-semibold text-[var(--navy)]">
                {user.firstName} {user.lastName}
              </p>
              <p>{user.email}</p>
              <p>{user.city}, {user.province}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <StatusPill label={user.status} />
                <StatusPill label={`Identidad ${user.kycStatus}`} />
                <StatusPill label={`score ${user.reputationScore}`} />
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,#f8fbff,#eaf2ff)] p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Próximas acciones</h2>
            <div className="mt-5 grid gap-3">
              <Link
                href="/account/kyc"
                className="rounded-[1.25rem] bg-white px-4 py-3 text-sm font-semibold text-[var(--navy)]"
              >
                Completar o revisar identidad
              </Link>
              <Link
                href="/account/listings/new"
                className="rounded-[1.25rem] bg-white px-4 py-3 text-sm font-semibold text-[var(--navy)]"
              >
                Crear publicación
              </Link>
              {!canCreateListing ? (
                <p className="rounded-[1.25rem] bg-[#fff7ed] px-4 py-3 text-sm leading-6 text-[#92400e]">
                  Para publicar o comprar con pago protegido necesitás cuenta
                  activa e identidad aprobada.
                </p>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--navy)]">Mis publicaciones</h2>
              <span className="text-sm text-[var(--muted)]">{user.listings.length}</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {user.listings.map((listing) => (
                <Link
                  className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4 transition hover:border-[rgba(18,107,255,0.2)]"
                  href={`/account/listings/${listing.id}`}
                  key={listing.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-[var(--navy)]">{listing.title}</p>
                    <StatusPill label={listing.status} />
                  </div>
                  <p className="mt-3 text-xl font-semibold text-[var(--brand-strong)]">
                    {formatCurrency(listing.price)}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {listing.category} · {listing.condition} · {formatDate(listing.createdAt)}
                  </p>
                </Link>
              ))}
              {user.listings.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Todavía no publicaste productos.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Mis compras</h2>
            <div className="mt-5 grid gap-3">
              {user.buyerEscrows.map((escrow) => (
                <article className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4" key={escrow.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--navy)]">{escrow.listing.title}</p>
                      <p className="text-sm text-[var(--muted)]">
                        Vendedor: {escrow.seller.firstName} {escrow.seller.lastName}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusPill label={escrow.status} />
                      <p className="mt-2 font-semibold text-[var(--navy)]">{formatCurrency(escrow.amount)}</p>
                    </div>
                  </div>
                </article>
              ))}
              {user.buyerEscrows.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Todavía no tenés compras protegidas.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/85 p-6">
            <h2 className="text-2xl font-semibold text-[var(--navy)]">Mis ventas</h2>
            <div className="mt-5 grid gap-3">
              {user.sellerEscrows.map((escrow) => (
                <article className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4" key={escrow.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--navy)]">{escrow.listing.title}</p>
                      <p className="text-sm text-[var(--muted)]">
                        Comprador: {escrow.buyer.firstName} {escrow.buyer.lastName}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusPill label={escrow.status} />
                      <p className="mt-2 font-semibold text-[var(--navy)]">{formatCurrency(escrow.amount)}</p>
                    </div>
                  </div>
                </article>
              ))}
              {user.sellerEscrows.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Todavía no tenés ventas protegidas.</p>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
