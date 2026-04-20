import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetchWithToken } from "../../lib/api";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";
import { formatCurrency, formatDate, formatDateTime } from "../../lib/format";

import { LogoutButton } from "../admin/logout-button";

import {
  createMeetingProposalAction,
  respondMeetingProposalAction
} from "./actions";

export const dynamic = "force-dynamic";

type AccountPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

type MeetingProposal = {
  id: string;
  brand: "YPF" | "SHELL" | "AXION";
  stationName: string;
  address: string;
  city: string;
  province: string;
  proposedAt: string;
  status: string;
  responseNote: string | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

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
    meetingProposals: MeetingProposal[];
  }>;
  sellerEscrows: Array<{
    id: string;
    amount: string;
    status: string;
    createdAt: string;
    listing: { id: string; title: string };
    buyer: { firstName: string; lastName: string };
    meetingProposals: MeetingProposal[];
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

function MeetingPlanner({
  escrowId,
  currentUserId,
  proposals,
  defaultCity,
  defaultProvince
}: {
  escrowId: string;
  currentUserId: string;
  proposals: MeetingProposal[];
  defaultCity: string;
  defaultProvince: string;
}) {
  return (
    <div className="mt-4 rounded-[1.25rem] border border-[rgba(18,107,255,0.12)] bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--navy)]">Encuentro seguro</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          Coordiná día, hora y shop de estación de servicio. Por ahora aceptamos
          YPF, Shell o Axion.
        </p>
      </div>

      {proposals.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {proposals.map((proposal) => {
            const canRespond =
              proposal.status === "PENDING" && proposal.createdBy.id !== currentUserId;

            return (
              <article className="rounded-2xl bg-[#f8fbff] p-3 text-sm" key={proposal.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--navy)]">
                      {proposal.brand} · {proposal.stationName}
                    </p>
                    <p className="text-xs leading-5 text-[var(--muted)]">
                      {proposal.address}, {proposal.city}, {proposal.province}
                    </p>
                    <p className="text-xs leading-5 text-[var(--muted)]">
                      {formatDateTime(proposal.proposedAt)} · propuesto por{" "}
                      {proposal.createdBy.firstName} {proposal.createdBy.lastName}
                    </p>
                  </div>
                  <StatusPill label={proposal.status} />
                </div>

                {canRespond ? (
                  <form action={respondMeetingProposalAction} className="mt-3 flex flex-wrap gap-2">
                    <input name="escrowId" type="hidden" value={escrowId} />
                    <input name="proposalId" type="hidden" value={proposal.id} />
                    <input
                      className="min-w-44 flex-1 rounded-full border border-[var(--surface-border)] bg-white px-3 py-2 text-xs"
                      name="responseNote"
                      placeholder="Nota opcional"
                    />
                    <button
                      className="rounded-full bg-[#059669] px-3 py-2 text-xs font-semibold text-white"
                      name="status"
                      type="submit"
                      value="ACCEPTED"
                    >
                      Aceptar
                    </button>
                    <button
                      className="rounded-full bg-[#dc2626] px-3 py-2 text-xs font-semibold text-white"
                      name="status"
                      type="submit"
                      value="DECLINED"
                    >
                      Rechazar
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      <form action={createMeetingProposalAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <input name="escrowId" type="hidden" value={escrowId} />
        <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
          Estación
          <select className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" name="brand" required>
            <option value="YPF">YPF</option>
            <option value="SHELL">Shell</option>
            <option value="AXION">Axion</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
          Fecha y hora
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" name="proposedAt" required type="datetime-local" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
          Shop / sucursal
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" name="stationName" placeholder="Ej: YPF Panamericana km 32" required />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
          Dirección
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" name="address" placeholder="Av. / calle y altura" required />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
          Ciudad
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" defaultValue={defaultCity} name="city" required />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
          Provincia
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2" defaultValue={defaultProvince} name="province" required />
        </label>
        <button className="rounded-full bg-[var(--navy)] px-4 py-3 text-sm font-semibold text-white md:col-span-2" type="submit">
          Proponer encuentro seguro
        </button>
      </form>
    </div>
  );
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [{ user }, params] = await Promise.all([
    getAccount(),
    (searchParams ?? Promise.resolve({})) as Promise<{
      success?: string;
      error?: string;
    }>
  ]);
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
            <LogoutButton />
            <Link href="/account/listings/new" className="rounded-full border border-white bg-white px-5 py-3 font-semibold text-[#082247] shadow-sm">
              Publicar producto
            </Link>
          </div>
        </div>
      </section>

      {params.success ? (
        <div className="mt-6 rounded-[1.5rem] border border-[rgba(5,150,105,0.18)] bg-[rgba(5,150,105,0.08)] px-5 py-4 text-sm font-medium text-[#065f46]">
          {params.success}
        </div>
      ) : null}

      {params.error ? (
        <div className="mt-6 rounded-[1.5rem] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.08)] px-5 py-4 text-sm font-medium text-[#991b1b]">
          {params.error}
        </div>
      ) : null}

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
                  <MeetingPlanner
                    currentUserId={user.id}
                    defaultCity={user.city}
                    defaultProvince={user.province}
                    escrowId={escrow.id}
                    proposals={escrow.meetingProposals}
                  />
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
                  <MeetingPlanner
                    currentUserId={user.id}
                    defaultCity={user.city}
                    defaultProvince={user.province}
                    escrowId={escrow.id}
                    proposals={escrow.meetingProposals}
                  />
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
