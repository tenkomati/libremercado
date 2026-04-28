"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type KycImagePurpose = "dni-front" | "dni-back" | "selfie";

type FaceDetectorResult = {
  passed: boolean;
  message: string;
};

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

  return "No se pudo crear la cuenta. Revisá los datos e intentá de nuevo.";
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

async function detectFaceIfSupported(file: File): Promise<FaceDetectorResult> {
  const FaceDetectorClass = (
    window as typeof window & { FaceDetector?: BrowserFaceDetectorConstructor }
  ).FaceDetector;

  if (!FaceDetectorClass) {
    return {
      passed: true,
      message:
        "Tu navegador no permite validar rostro localmente. La selfie queda guardada para revisión manual."
    };
  }

  const bitmap = await createImageBitmap(file);
  const detector = new FaceDetectorClass({ fastMode: true, maxDetectedFaces: 1 });
  const faces = await detector.detect(bitmap);

  bitmap.close();

  if (faces.length === 0) {
    return {
      passed: false,
      message: "No detectamos un rostro claro en la selfie. Probá con mejor luz y de frente."
    };
  }

  return {
    passed: true,
    message: "Selfie validada localmente: se detectó un rostro."
  };
}

export function SignupForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [faceDetectionMessage, setFaceDetectionMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setFaceDetectionMessage(null);

    const phone = String(formData.get("phone") ?? "").trim();
    const documentFront = formData.get("documentFront");
    const documentBack = formData.get("documentBack");
    const selfie = formData.get("selfie");

    if (!(documentFront instanceof File) || documentFront.size === 0) {
      setError("Subí una foto clara del frente del DNI.");
      setIsSubmitting(false);
      return;
    }

    if (!(documentBack instanceof File) || documentBack.size === 0) {
      setError("Subí una foto clara del dorso del DNI.");
      setIsSubmitting(false);
      return;
    }

    if (!(selfie instanceof File) || selfie.size === 0) {
      setError("Subí una selfie para comparar identidad.");
      setIsSubmitting(false);
      return;
    }

    const faceDetection = await detectFaceIfSupported(selfie).catch(() => ({
      passed: true,
      message:
        "No se pudo ejecutar la detección local. La selfie queda guardada para revisión manual."
    }));

    setFaceDetectionMessage(faceDetection.message);

    if (!faceDetection.passed) {
      setError(faceDetection.message);
      setIsSubmitting(false);
      return;
    }

    let uploadedImages;

    try {
      uploadedImages = await Promise.all([
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
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/session/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: formData.get("email"),
        dni: formData.get("dni"),
        password: formData.get("password"),
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        ...(phone ? { phone } : {}),
        province: formData.get("province"),
        city: formData.get("city"),
        documentFrontImageUrl: uploadedImages[0].url,
        documentBackImageUrl: uploadedImages[1].url,
        selfieImageUrl: uploadedImages[2].url,
        identityVerificationConsent:
          formData.get("identityVerificationConsent") === "on"
      })
    });

    if (!response.ok) {
      setError(getErrorMessage(await response.json().catch(() => undefined)));
      setIsSubmitting(false);
      return;
    }

    startTransition(() => {
      router.push(nextPath);
      router.refresh();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="rounded-[2rem] border border-[var(--surface-border)] bg-white/88 p-8 shadow-[0_24px_80px_rgba(8,34,71,0.08)]"
    >
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--brand-strong)]">
          Crear cuenta
        </p>
        <h1
          className="text-4xl font-semibold tracking-[-0.04em] text-[var(--navy)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Entrá al marketplace protegido.
        </h1>
        <p className="text-base leading-7 text-[var(--muted)]">
          La cuenta queda creada con verificación pendiente. Para comprar o
          vender con pago protegido, operación debe aprobar la identidad desde admin.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Nombre
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="firstName" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Apellido
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="lastName" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)] md:col-span-2">
          Email
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="email" required type="email" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          DNI
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="dni" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Teléfono
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="phone" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Provincia
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="province" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
          Ciudad
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" name="city" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--navy)] md:col-span-2">
          Password
          <input className="rounded-2xl border border-[var(--surface-border)] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[var(--brand)]" minLength={8} name="password" required type="password" />
        </label>
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-[var(--surface-border)] bg-[#f8fbff] p-5">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--brand-strong)]">
            Verificación inicial
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--navy)]">
            DNI y selfie para operar con seguridad
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Pedimos frente del DNI, dorso y una selfie. Si el navegador soporta
            detección de rostro, validamos localmente que la selfie tenga una
            cara visible; la aprobación final queda para revisión operativa o
            proveedor biométrico real.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
            Frente del DNI
            <input
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              className="rounded-2xl border border-[var(--surface-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
              name="documentFront"
              required
              type="file"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[var(--navy)]">
            Dorso del DNI
            <input
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              className="rounded-2xl border border-[var(--surface-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
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
              className="rounded-2xl border border-[var(--surface-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand)]"
              name="selfie"
              required
              type="file"
            />
          </label>
        </div>

        {faceDetectionMessage ? (
          <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-[var(--muted)]">
            {faceDetectionMessage}
          </p>
        ) : null}

        <label className="mt-5 flex gap-3 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          <input
            className="mt-1 h-4 w-4"
            name="identityVerificationConsent"
            required
            type="checkbox"
          />
          <span>
            Acepto que libremercado use estas imágenes para validar identidad,
            prevenir fraude y revisar manualmente mi cuenta antes de habilitar
            operaciones sensibles.
          </span>
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-[rgba(213,45,45,0.14)] bg-[rgba(213,45,45,0.06)] px-4 py-3 text-sm text-[#9f1d1d]">
          {error}
        </div>
      ) : null}

      <button
        className="button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending || isSubmitting}
        type="submit"
      >
        {isPending || isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
