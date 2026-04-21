"use client";

import { useState } from "react";

import { createAvailabilitySlotAction } from "./actions";

function getLocalDatePart(value: string) {
  return value.slice(0, 10);
}

function getEndOfLocalDay(value: string) {
  const date = getLocalDatePart(value);
  return `${date}T23:59`;
}

function formatLocalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function getOneHourLaterSameDay(value: string) {
  const start = new Date(value);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const date = getLocalDatePart(value);

  if (formatLocalDate(end) !== date) {
    return getEndOfLocalDay(value);
  }

  const hours = String(end.getHours()).padStart(2, "0");
  const minutes = String(end.getMinutes()).padStart(2, "0");

  return `${date}T${hours}:${minutes}`;
}

export function AvailabilitySlotForm({ escrowId }: { escrowId: string }) {
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  function handleStartsAtChange(value: string) {
    setStartsAt(value);

    if (!value) {
      setEndsAt("");
      return;
    }

    setEndsAt(getOneHourLaterSameDay(value));
  }

  return (
    <form action={createAvailabilitySlotAction} className="mt-4 grid gap-3 rounded-2xl bg-[#f8fbff] p-3 md:grid-cols-2">
      <input name="escrowId" type="hidden" value={escrowId} />
      <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
        Disponible desde
        <input
          className="rounded-2xl border border-[var(--surface-border)] bg-white px-3 py-2"
          name="startsAt"
          onChange={(event) => handleStartsAtChange(event.target.value)}
          required
          type="datetime-local"
          value={startsAt}
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-[var(--navy)]">
        Disponible hasta
        <input
          className="rounded-2xl border border-[var(--surface-border)] bg-white px-3 py-2 disabled:cursor-not-allowed disabled:bg-[#eef4ff] disabled:text-[var(--muted)]"
          disabled={!startsAt}
          max={startsAt ? getEndOfLocalDay(startsAt) : undefined}
          min={startsAt || undefined}
          name="endsAt"
          onChange={(event) => setEndsAt(event.target.value)}
          required
          type="datetime-local"
          value={endsAt}
        />
      </label>
      <button className="rounded-full bg-[var(--brand-strong)] px-4 py-3 text-sm font-semibold text-white md:col-span-2" type="submit">
        Pintar franja disponible
      </button>
    </form>
  );
}
