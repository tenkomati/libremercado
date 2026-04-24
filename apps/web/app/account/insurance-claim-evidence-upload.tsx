"use client";

import { useState, useTransition } from "react";

type InsuranceClaimEvidenceUploadProps = {
  defaultUrls?: string[];
  maxFiles?: number;
};

function getErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return "No se pudo subir la evidencia.";
}

export function InsuranceClaimEvidenceUpload({
  defaultUrls = [],
  maxFiles = 5
}: InsuranceClaimEvidenceUploadProps) {
  const [urls, setUrls] = useState(defaultUrls);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function uploadFiles(files: FileList) {
    setError(null);

    const selected = Array.from(files).slice(0, Math.max(maxFiles - urls.length, 0));

    if (selected.length === 0) {
      return;
    }

    startTransition(async () => {
      const nextUrls: string[] = [];

      for (const file of selected) {
        const formData = new FormData();
        formData.set("file", file);

        const response = await fetch("/api/uploads/insurance-claim-image", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          setError(getErrorMessage(await response.json().catch(() => undefined)));
          return;
        }

        const payload = (await response.json()) as { url: string };
        nextUrls.push(payload.url);
      }

      setUrls((current) => [...current, ...nextUrls].slice(0, maxFiles));
    });
  }

  function removeUrl(target: string) {
    setUrls((current) => current.filter((url) => url !== target));
  }

  return (
    <div className="grid gap-3">
      <input name="evidenceUrls" type="hidden" value={urls.join("\n")} />

      <label className="grid gap-2 text-xs font-semibold text-[var(--navy)]">
        Evidencias
        <input
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          disabled={isPending || urls.length >= maxFiles}
          multiple
          onChange={(event) => {
            const files = event.target.files;

            if (files && files.length > 0) {
              uploadFiles(files);
            }

            event.currentTarget.value = "";
          }}
          type="file"
        />
      </label>

      {isPending ? (
        <p className="text-xs font-medium text-[var(--brand-strong)]">
          Subiendo evidencias...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.08)] px-4 py-3 text-sm text-[#991b1b]">
          {error}
        </p>
      ) : null}

      {urls.length > 0 ? (
        <div className="grid gap-2">
          {urls.map((url, index) => (
            <div
              key={url}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--surface-border)] bg-white px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <img
                  alt={`Evidencia ${index + 1}`}
                  className="h-14 w-14 rounded-xl object-cover"
                  src={url}
                />
                <span className="truncate text-xs text-[var(--muted)]">{url}</span>
              </div>
              <button
                className="shrink-0 text-xs font-semibold text-[#991b1b]"
                onClick={() => removeUrl(url)}
                type="button"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[1.25rem] bg-[#f8fbff] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          Subí hasta {maxFiles} imágenes JPG, PNG, WEBP, HEIC o HEIF de hasta 8
          MB cada una. Se guardan en el mismo storage real del proyecto.
        </p>
      )}
    </div>
  );
}
