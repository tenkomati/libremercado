"use client";

import { useState, useTransition } from "react";

type ListingImageUploadProps = {
  defaultUrl?: string;
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

  return "No se pudo subir la imagen.";
}

export function ListingImageUpload({ defaultUrl = "" }: ListingImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(defaultUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function uploadFile(file: File) {
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/uploads/listing-image", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        setError(getErrorMessage(await response.json().catch(() => undefined)));
        return;
      }

      const payload = (await response.json()) as { url: string };
      setImageUrl(payload.url);
    });
  }

  return (
    <div className="grid gap-3">
      <input name="imageUrl" type="hidden" value={imageUrl} />

      <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
        Imagen principal
        <input
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
          disabled={isPending}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              uploadFile(file);
            }
          }}
          type="file"
        />
      </label>

      {isPending ? (
        <p className="text-sm font-medium text-[var(--brand-strong)]">
          Subiendo imagen...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.08)] px-4 py-3 text-sm text-[#991b1b]">
          {error}
        </p>
      ) : null}

      {imageUrl ? (
        <div className="overflow-hidden rounded-[1.25rem] border border-[var(--surface-border)] bg-white">
          <img
            alt="Vista previa de la publicación"
            className="h-56 w-full object-cover"
            src={imageUrl}
          />
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-[var(--muted)]">
            <span className="truncate">{imageUrl}</span>
            <button
              className="font-semibold text-[#991b1b]"
              onClick={() => setImageUrl("")}
              type="button"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-[1.25rem] bg-[#f8fbff] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          Subí una imagen JPG, PNG, WEBP, HEIC o HEIF de hasta 5 MB. Los HEIC/HEIF
          se convierten automáticamente a JPG. En producción esto debe migrar a
          storage externo/CDN.
        </p>
      )}
    </div>
  );
}
