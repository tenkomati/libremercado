"use client";

import { useState, useTransition } from "react";

import { createKycVerificationAction } from "./actions";

type KycCorrectionFormProps = {
  defaultDocumentNumber: string;
  latestReviewerNotes?: string | null;
  requiresCorrection: boolean;
};

type KycImagePurpose = "dni-front" | "dni-back" | "selfie";

type BrowserFaceDetector = {
  detect(image: ImageBitmapSource): Promise<Array<unknown>>;
};

type BrowserFaceDetectorConstructor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => BrowserFaceDetector;

function getErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return "No se pudo subir la documentación.";
}

async function uploadKycImage(file: File, purpose: KycImagePurpose) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("purpose", purpose);

  const response = await fetch("/api/uploads/kyc-image", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(getErrorMessage(await response.json().catch(() => undefined)));
  }

  return (await response.json()) as { url: string };
}

async function detectFaceIfSupported(file: File) {
  const FaceDetectorClass = (
    window as typeof window & { FaceDetector?: BrowserFaceDetectorConstructor }
  ).FaceDetector;

  if (!FaceDetectorClass) {
    return "Tu navegador no permite validar rostro localmente. La selfie queda guardada para revisión manual.";
  }

  const bitmap = await createImageBitmap(file);
  const detector = new FaceDetectorClass({ fastMode: true, maxDetectedFaces: 1 });
  const faces = await detector.detect(bitmap);

  bitmap.close();

  if (faces.length === 0) {
    throw new Error("No detectamos un rostro claro en la selfie. Probá con mejor luz y de frente.");
  }

  return "Selfie validada localmente: se detectó un rostro.";
}

export function KycCorrectionForm({
  defaultDocumentNumber,
  latestReviewerNotes,
  requiresCorrection
}: KycCorrectionFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [faceDetectionMessage, setFaceDetectionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setFaceDetectionMessage(null);

    const documentFront = formData.get("documentFront");
    const documentBack = formData.get("documentBack");
    const selfie = formData.get("selfie");

    if (!(documentFront instanceof File) || documentFront.size === 0) {
      setError("Subí una foto clara del frente del DNI.");
      return;
    }

    if (!(documentBack instanceof File) || documentBack.size === 0) {
      setError("Subí una foto clara del dorso del DNI.");
      return;
    }

    if (!(selfie instanceof File) || selfie.size === 0) {
      setError("Subí una selfie actual para revisar identidad.");
      return;
    }

    let faceMessage;

    try {
      faceMessage = await detectFaceIfSupported(selfie);
      setFaceDetectionMessage(faceMessage);
    } catch (faceError) {
      setError(
        faceError instanceof Error
          ? faceError.message
          : "No se pudo validar la selfie."
      );
      return;
    }

    startTransition(async () => {
      let frontUpload;
      let backUpload;
      let selfieUpload;

      try {
        [frontUpload, backUpload, selfieUpload] = await Promise.all([
          uploadKycImage(documentFront, "dni-front"),
          uploadKycImage(documentBack, "dni-back"),
          uploadKycImage(selfie, "selfie")
        ]);
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "No se pudieron subir las imágenes de identidad."
        );
        setFaceDetectionMessage(faceMessage);
        return;
      }

      const actionFormData = new FormData();

      actionFormData.set("documentType", String(formData.get("documentType") ?? "DNI"));
      actionFormData.set("documentNumber", String(formData.get("documentNumber") ?? ""));
      actionFormData.set(
        "reviewerNotes",
        String(formData.get("reviewerNotes") ?? "")
      );
      actionFormData.set("documentFrontImageUrl", frontUpload.url);
      actionFormData.set("documentBackImageUrl", backUpload.url);
      actionFormData.set("selfieImageUrl", selfieUpload.url);
      actionFormData.set("biometricConsentAt", new Date().toISOString());

      await createKycVerificationAction(actionFormData);
    });
  }

  return (
    <form action={handleSubmit} className="mt-6 grid gap-4">
      {requiresCorrection ? (
        <div className="rounded-[1.25rem] border border-[rgba(217,119,6,0.18)] bg-[rgba(217,119,6,0.08)] px-4 py-3 text-sm leading-6 text-[#92400e]">
          <p className="font-semibold">Necesitamos una corrección.</p>
          <p className="mt-1">
            {latestReviewerNotes ??
              "Reenviá fotos claras del DNI y una selfie actual para que podamos revisar la identidad."}
          </p>
        </div>
      ) : null}

      <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
        Tipo de documento
        <select className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="documentType" required>
          <option value="DNI">DNI</option>
          <option value="CUIL">CUIL</option>
          <option value="CUIT">CUIT</option>
          <option value="PASSPORT">Pasaporte</option>
        </select>
      </label>

      <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
        Número
        <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" defaultValue={defaultDocumentNumber} name="documentNumber" required />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Frente del DNI
          <input
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
            disabled={isPending}
            name="documentFront"
            required
            type="file"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Dorso del DNI
          <input
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
            disabled={isPending}
            name="documentBack"
            required
            type="file"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Selfie actual
          <input
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            capture="user"
            className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
            disabled={isPending}
            name="selfie"
            required
            type="file"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
        Mensaje para revisión
        <textarea
          className="min-h-28 rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]"
          name="reviewerNotes"
          placeholder="Ej: reenvié fotos con mejor luz y selfie actual."
        />
      </label>

      <label className="flex gap-3 rounded-2xl bg-[#f8fbff] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
        <input className="mt-1 h-4 w-4" required type="checkbox" />
        <span>
          Acepto reenviar estas imágenes para revisión de identidad, prevención de
          fraude y validación operativa.
        </span>
      </label>

      {faceDetectionMessage ? (
        <p className="rounded-2xl bg-[#f8fbff] px-4 py-3 text-sm text-[var(--muted)]">
          {faceDetectionMessage}
        </p>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.08)] px-4 py-3 text-sm text-[#991b1b]">
          {error}
        </div>
      ) : null}

      <button
        className="rounded-full bg-[var(--brand)] px-5 py-4 font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Subiendo documentación..." : "Enviar documentación a revisión"}
      </button>
    </form>
  );
}
