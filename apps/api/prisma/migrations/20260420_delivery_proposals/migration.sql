CREATE TYPE "DeliveryMethod" AS ENUM ('MESSAGING', 'COURIER', 'SAFE_MEETING', 'PICKUP');

CREATE TYPE "DeliveryProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

ALTER TYPE "NotificationType" ADD VALUE 'DELIVERY_PROPOSED';
ALTER TYPE "NotificationType" ADD VALUE 'DELIVERY_RESPONDED';

CREATE TABLE "EscrowDeliveryProposal" (
  "id" TEXT NOT NULL,
  "escrowId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "method" "DeliveryMethod" NOT NULL,
  "details" TEXT,
  "status" "DeliveryProposalStatus" NOT NULL DEFAULT 'PENDING',
  "responseNote" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EscrowDeliveryProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EscrowDeliveryProposal_escrowId_status_idx" ON "EscrowDeliveryProposal"("escrowId", "status");
CREATE INDEX "EscrowDeliveryProposal_createdByUserId_createdAt_idx" ON "EscrowDeliveryProposal"("createdByUserId", "createdAt");
CREATE INDEX "EscrowDeliveryProposal_method_status_idx" ON "EscrowDeliveryProposal"("method", "status");

ALTER TABLE "EscrowDeliveryProposal"
ADD CONSTRAINT "EscrowDeliveryProposal_escrowId_fkey"
FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EscrowDeliveryProposal"
ADD CONSTRAINT "EscrowDeliveryProposal_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
