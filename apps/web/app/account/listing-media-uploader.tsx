"use client";

import { useState, useTransition } from "react";

type ListingMediaItem = {
  url: string;
  type: "IMAGE" | "VIDEO";
};

type ListingMediaUploaderProps = {
  value: ListingMediaItem[];
  onChange: (value: ListingMediaItem[]) => void;
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

  return "No se pudo subir el archivo.";
}

export function ListingMediaUploader({
  value,
  onChange
}: ListingMediaUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function uploadFile(file: File, type: "IMAGE" | "VIDEO") {
    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch(
      type === "VIDEO" ? "/api/uploads/listing-video" : "/api/uploads/listing-image",
      {
        method: "POST",
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(getErrorMessage(await response.json().catch(() => undefined)));
    }

    const payload = (await response.json()) as { url: string };
    return { url: payload.url, type };
  }

  function uploadFiles(files: File[], type: "IMAGE" | "VIDEO") {
    setError(null);

    startTransition(async () => {
      try {
        const uploadedItems: ListingMediaItem[] = [];

        for (const file of files) {
          uploadedItems.push(await uploadFile(file, type));
        }

        if (uploadedItems.length) {
          onChange([...value, ...uploadedItems]);
        }
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "No se pudo subir el archivo."
        );
      }
    });
  }

  const imageCount = value.filter((item) => item.type === "IMAGE").length;
  const hasVideo = value.some((item) => item.type === "VIDEO");

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <label className="grid gap-2 rounded-[1.5rem] border border-[var(--surface-border)] bg-[#f8fbff] p-4 text-sm font-medium text-[var(--navy)]">
          Fotos del producto
          <input
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            className="rounded-2xl border border-[var(--surface-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
            disabled={isPending}
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);

              if (files.length) {
                uploadFiles(files, "IMAGE");
              }
            }}
            type="file"
          />
          <span className="text-xs leading-6 text-[var(--muted)]">
            Mínimo 4 fotos. HEIC/HEIF se convierten automáticamente.
          </span>
        </label>

        <label className="grid gap-2 rounded-[1.5rem] border border-[rgba(18,107,255,0.14)] bg-[#f5f9ff] p-4 text-sm font-medium text-[var(--navy)]">
          Video funcional opcional
          <input
            accept="video/mp4,video/webm,video/quicktime"
            className="rounded-2xl border border-[var(--surface-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
            disabled={isPending || hasVideo}
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                uploadFiles([file], "VIDEO");
              }
            }}
            type="file"
          />
          <span className="text-xs leading-6 text-[var(--muted)]">
            Un video corto del funcionamiento suma un badge de confianza.
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[var(--navy)]">
          Fotos cargadas: {imageCount}/4
        </span>
        <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[var(--navy)]">
          Video funcional: {hasVideo ? "Sí" : "No"}
        </span>
      </div>

      {isPending ? (
        <p className="text-sm font-medium text-[var(--brand-strong)]">
          Subiendo archivo...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.08)] px-4 py-3 text-sm text-[#991b1b]">
          {error}
        </p>
      ) : null}

      {value.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {value.map((media, index) => (
            <article
              className="overflow-hidden rounded-[1.25rem] border border-[var(--surface-border)] bg-white"
              key={`${media.url}-${index}`}
            >
              {media.type === "VIDEO" ? (
                <video className="h-48 w-full bg-[#dbeafe] object-cover" controls src={media.url} />
              ) : (
                <img
                  alt={`Media ${index + 1}`}
                  className="h-48 w-full object-cover"
                  src={media.url}
                />
              )}
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-[var(--muted)]">
                <span>{media.type === "VIDEO" ? "Video funcional" : `Foto ${index + 1}`}</span>
                <button
                  className="font-semibold text-[#991b1b]"
                  onClick={() => {
                    onChange(value.filter((_, currentIndex) => currentIndex !== index));
                  }}
                  type="button"
                >
                  Quitar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
