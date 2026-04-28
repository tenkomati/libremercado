-- CreateEnum
CREATE TYPE "OrderStatusScope" AS ENUM ('PAYMENT', 'SHIPPING', 'LEGACY');

-- CreateEnum
CREATE TYPE "EscrowPaymentStatus" AS ENUM (
  'PAYMENT_PENDING',
  'PAYMENT_RECEIVED',
  'PAYMENT_RELEASED',
  'DISPUTED',
  'PAYMENT_CANCELLED',
  'PAYMENT_REFUNDED'
);

-- CreateEnum
CREATE TYPE "EscrowShippingStatus" AS ENUM (
  'WAITING_DISPATCH',
  'IN_TRANSIT',
  'READY_FOR_PICKUP',
  'DELIVERED',
  'RETURNING',
  'WAITING_MEETING',
  'AT_MEETING_POINT',
  'QR_CONFIRMED'
);

-- AlterTable
ALTER TABLE "EscrowTransaction"
ADD COLUMN "paymentStatus" "EscrowPaymentStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
ADD COLUMN "shippingStatus" "EscrowShippingStatus";

-- Backfill payment status from legacy escrow status
UPDATE "EscrowTransaction"
SET "paymentStatus" = CASE
  WHEN "status" = 'FUNDS_PENDING' THEN 'PAYMENT_PENDING'::"EscrowPaymentStatus"
  WHEN "status" IN ('FUNDS_HELD', 'SHIPPED', 'DELIVERED') THEN 'PAYMENT_RECEIVED'::"EscrowPaymentStatus"
  WHEN "status" = 'RELEASED' THEN 'PAYMENT_RELEASED'::"EscrowPaymentStatus"
  WHEN "status" = 'DISPUTED' THEN 'DISPUTED'::"EscrowPaymentStatus"
  WHEN "status" = 'CANCELLED' THEN 'PAYMENT_CANCELLED'::"EscrowPaymentStatus"
  WHEN "status" = 'REFUNDED' THEN 'PAYMENT_REFUNDED'::"EscrowPaymentStatus"
  ELSE 'PAYMENT_PENDING'::"EscrowPaymentStatus"
END;

-- Backfill shipping status from legacy escrow status and current delivery mode
UPDATE "EscrowTransaction"
SET "shippingStatus" = CASE
  WHEN "status" = 'FUNDS_PENDING' THEN NULL
  WHEN "shippingProvider" ILIKE '%encuentro%' AND "status" = 'FUNDS_HELD' THEN 'WAITING_MEETING'::"EscrowShippingStatus"
  WHEN "shippingProvider" ILIKE '%encuentro%' AND "status" = 'SHIPPED' THEN 'AT_MEETING_POINT'::"EscrowShippingStatus"
  WHEN "shippingProvider" ILIKE '%encuentro%' AND "status" IN ('DELIVERED', 'RELEASED') THEN 'QR_CONFIRMED'::"EscrowShippingStatus"
  WHEN "shippingProvider" ILIKE '%encuentro%' AND "status" IN ('DISPUTED', 'REFUNDED', 'CANCELLED') THEN 'WAITING_MEETING'::"EscrowShippingStatus"
  WHEN "status" = 'FUNDS_HELD' THEN 'WAITING_DISPATCH'::"EscrowShippingStatus"
  WHEN "status" = 'SHIPPED' THEN 'IN_TRANSIT'::"EscrowShippingStatus"
  WHEN "status" IN ('DELIVERED', 'RELEASED') THEN 'DELIVERED'::"EscrowShippingStatus"
  WHEN "status" IN ('DISPUTED', 'REFUNDED', 'CANCELLED') THEN 'DELIVERED'::"EscrowShippingStatus"
  ELSE NULL
END;

-- CreateTable
CREATE TABLE "OrderHistory" (
  "id" TEXT NOT NULL,
  "escrowId" TEXT NOT NULL,
  "scope" "OrderStatusScope" NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderHistory_pkey" PRIMARY KEY ("id")
);

-- Backfill current snapshot to history
INSERT INTO "OrderHistory" ("id", "escrowId", "scope", "fromStatus", "toStatus", "note", "metadata")
SELECT
  'hist_payment_' || e."id",
  e."id",
  'PAYMENT'::"OrderStatusScope",
  NULL,
  e."paymentStatus"::text,
  'Initial backfill from legacy escrow status',
  jsonb_build_object('legacyStatus', e."status"::text)
FROM "EscrowTransaction" e;

INSERT INTO "OrderHistory" ("id", "escrowId", "scope", "fromStatus", "toStatus", "note", "metadata")
SELECT
  'hist_shipping_' || e."id",
  e."id",
  'SHIPPING'::"OrderStatusScope",
  NULL,
  e."shippingStatus"::text,
  'Initial backfill from legacy escrow status',
  jsonb_build_object('legacyStatus', e."status"::text)
FROM "EscrowTransaction" e
WHERE e."shippingStatus" IS NOT NULL;

-- CreateIndex
CREATE INDEX "EscrowTransaction_buyerId_paymentStatus_idx" ON "EscrowTransaction"("buyerId", "paymentStatus");

-- CreateIndex
CREATE INDEX "EscrowTransaction_sellerId_paymentStatus_idx" ON "EscrowTransaction"("sellerId", "paymentStatus");

-- CreateIndex
CREATE INDEX "EscrowTransaction_listingId_paymentStatus_idx" ON "EscrowTransaction"("listingId", "paymentStatus");

-- CreateIndex
CREATE INDEX "EscrowTransaction_buyerId_shippingStatus_idx" ON "EscrowTransaction"("buyerId", "shippingStatus");

-- CreateIndex
CREATE INDEX "EscrowTransaction_sellerId_shippingStatus_idx" ON "EscrowTransaction"("sellerId", "shippingStatus");

-- CreateIndex
CREATE INDEX "EscrowTransaction_listingId_shippingStatus_idx" ON "EscrowTransaction"("listingId", "shippingStatus");

-- CreateIndex
CREATE INDEX "OrderHistory_escrowId_createdAt_idx" ON "OrderHistory"("escrowId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderHistory_scope_createdAt_idx" ON "OrderHistory"("scope", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderHistory" ADD CONSTRAINT "OrderHistory_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
