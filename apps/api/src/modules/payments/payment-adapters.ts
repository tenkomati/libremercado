import { BadRequestException } from "@nestjs/common";
import {
  CurrencyCode,
  PaymentProvider,
  PaymentStatus,
  Prisma
} from "@prisma/client";

type AdapterCheckoutInput = {
  escrowId: string;
  amount: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
  netAmount: Prisma.Decimal;
  currency: CurrencyCode;
};

export type AdapterCheckoutResult = {
  checkoutUrl: string;
  providerPreferenceId: string;
  providerStatus: string;
  rawPayload: Prisma.InputJsonValue;
};

export type NormalizedPaymentWebhook = {
  eventId: string;
  paymentIntentId?: string;
  providerPaymentId?: string;
  providerPreferenceId?: string;
  status: PaymentStatus;
  providerStatus: string;
  rawPayload: Prisma.InputJsonValue;
};

export interface PaymentAdapter {
  provider: PaymentProvider;
  createCheckout(input: AdapterCheckoutInput): AdapterCheckoutResult;
  normalizeWebhook(payload: Record<string, unknown>): NormalizedPaymentWebhook;
}

export class SandboxPaymentAdapter implements PaymentAdapter {
  provider = PaymentProvider.SANDBOX;

  createCheckout(input: AdapterCheckoutInput) {
    const providerPreferenceId = `sandbox_pref_${input.escrowId}`;

    return {
      checkoutUrl: `/account?paymentIntent=${providerPreferenceId}`,
      providerPreferenceId,
      providerStatus: "created",
      rawPayload: {
        adapter: "sandbox",
        checkoutUrl: `/account?paymentIntent=${providerPreferenceId}`
      }
    };
  }

  normalizeWebhook(payload: Record<string, unknown>) {
    return normalizeGenericWebhook(PaymentProvider.SANDBOX, payload);
  }
}

export class ExternalRedirectPaymentAdapter implements PaymentAdapter {
  constructor(
    public readonly provider: PaymentProvider,
    private readonly checkoutBaseUrl?: string
  ) {}

  createCheckout(input: AdapterCheckoutInput) {
    if (!this.checkoutBaseUrl) {
      throw new BadRequestException(
        `Payment provider ${this.provider} requires PAYMENT_CHECKOUT_BASE_URL`
      );
    }

    const providerPreferenceId = `${this.provider.toLowerCase()}_pref_${input.escrowId}`;
    const checkoutUrl = new URL(this.checkoutBaseUrl);
    checkoutUrl.searchParams.set("preference_id", providerPreferenceId);
    checkoutUrl.searchParams.set("escrow_id", input.escrowId);
    checkoutUrl.searchParams.set("amount", input.amount.toString());
    checkoutUrl.searchParams.set("currency", input.currency);

    return {
      checkoutUrl: checkoutUrl.toString(),
      providerPreferenceId,
      providerStatus: "created",
      rawPayload: {
        adapter: "external_redirect",
        provider: this.provider,
        amount: input.amount.toString(),
        feeAmount: input.feeAmount.toString(),
        netAmount: input.netAmount.toString(),
        currency: input.currency,
        checkoutUrl: checkoutUrl.toString()
      }
    };
  }

  normalizeWebhook(payload: Record<string, unknown>) {
    return normalizeGenericWebhook(this.provider, payload);
  }
}

function normalizeGenericWebhook(
  provider: PaymentProvider,
  payload: Record<string, unknown>
): NormalizedPaymentWebhook {
  const providerStatus = getFirstString(
    payload,
    "providerStatus",
    "status",
    "payment_status",
    "state"
  );
  const status =
    getPaymentStatus(payload.status) ??
    getPaymentStatus(providerStatus) ??
    PaymentStatus.PAYMENT_PENDING;
  const eventId =
    getFirstString(payload, "eventId", "id", "event_id", "resource_id") ??
    `${provider.toLowerCase()}_${Date.now()}`;

  return {
    eventId,
    paymentIntentId: getFirstString(payload, "paymentIntentId", "payment_intent_id"),
    providerPaymentId: getFirstString(payload, "providerPaymentId", "payment_id", "id"),
    providerPreferenceId: getFirstString(
      payload,
      "providerPreferenceId",
      "preference_id",
      "external_reference"
    ),
    status,
    providerStatus: providerStatus ?? status,
    rawPayload: payload as Prisma.InputJsonValue
  };
}

function getFirstString(payload: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return undefined;
}

function getPaymentStatus(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized in PaymentStatus) {
    return PaymentStatus[normalized as keyof typeof PaymentStatus];
  }

  if (["APPROVED", "PAID", "SUCCESS", "SUCCEEDED"].includes(normalized)) {
    return PaymentStatus.FUNDS_HELD;
  }

  if (["PENDING", "IN_PROCESS", "CREATED"].includes(normalized)) {
    return PaymentStatus.PAYMENT_PENDING;
  }

  if (["REJECTED", "CANCELLED", "CANCELED", "EXPIRED", "FAILED"].includes(normalized)) {
    return PaymentStatus.FAILED;
  }

  if (["REFUNDED", "CHARGEBACK"].includes(normalized)) {
    return PaymentStatus.REFUNDED;
  }

  if (["DISPUTED", "IN_DISPUTE"].includes(normalized)) {
    return PaymentStatus.DISPUTED;
  }

  return undefined;
}
