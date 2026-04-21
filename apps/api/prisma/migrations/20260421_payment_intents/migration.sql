CREATE TYPE "PaymentProvider" AS ENUM ('SANDBOX', 'MERCADO_PAGO', 'MOBBEX');

CREATE TYPE "PaymentStatus" AS ENUM (
  'PAYMENT_PENDING',
  'PAYMENT_APPROVED',
  'FUNDS_HELD',
  'READY_TO_RELEASE',
  'RELEASED',
  'REFUNDED',
  'DISPUTED',
  'FAILED'
);

ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_UPDATED';

CREATE TABLE "PaymentIntent" (
  "id" TEXT NOT NULL,
  "escrowId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
  "amount" DECIMAL(12,2) NOT NULL,
  "feeAmount" DECIMAL(12,2) NOT NULL,
  "netAmount" DECIMAL(12,2) NOT NULL,
  "currency" "CurrencyCode" NOT NULL DEFAULT 'ARS',
  "checkoutUrl" TEXT,
  "providerPaymentId" TEXT,
  "providerPreferenceId" TEXT,
  "providerStatus" TEXT,
  "providerRawPayload" JSONB,
  "approvedAt" TIMESTAMP(3),
  "fundsHeldAt" TIMESTAMP(3),
  "readyToReleaseAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "paymentIntentId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "status" "PaymentStatus" NOT NULL,
  "providerEventId" TEXT,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentIntent_escrowId_status_idx" ON "PaymentIntent"("escrowId", "status");
CREATE INDEX "PaymentIntent_buyerId_status_createdAt_idx" ON "PaymentIntent"("buyerId", "status", "createdAt");
CREATE INDEX "PaymentIntent_sellerId_status_createdAt_idx" ON "PaymentIntent"("sellerId", "status", "createdAt");
CREATE INDEX "PaymentIntent_provider_providerPaymentId_idx" ON "PaymentIntent"("provider", "providerPaymentId");
CREATE INDEX "PaymentIntent_provider_providerPreferenceId_idx" ON "PaymentIntent"("provider", "providerPreferenceId");
CREATE INDEX "PaymentEvent_paymentIntentId_createdAt_idx" ON "PaymentEvent"("paymentIntentId", "createdAt");
CREATE INDEX "PaymentEvent_provider_providerEventId_idx" ON "PaymentEvent"("provider", "providerEventId");

ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
