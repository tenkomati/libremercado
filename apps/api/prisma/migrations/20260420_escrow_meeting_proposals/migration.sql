CREATE TYPE "FuelStationBrand" AS ENUM ('YPF', 'SHELL', 'AXION');

CREATE TYPE "MeetingProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

CREATE TABLE "EscrowMeetingProposal" (
  "id" TEXT NOT NULL,
  "escrowId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "brand" "FuelStationBrand" NOT NULL,
  "stationName" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "province" TEXT NOT NULL,
  "proposedAt" TIMESTAMP(3) NOT NULL,
  "status" "MeetingProposalStatus" NOT NULL DEFAULT 'PENDING',
  "responseNote" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EscrowMeetingProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EscrowMeetingProposal_escrowId_status_idx" ON "EscrowMeetingProposal"("escrowId", "status");
CREATE INDEX "EscrowMeetingProposal_createdByUserId_createdAt_idx" ON "EscrowMeetingProposal"("createdByUserId", "createdAt");
CREATE INDEX "EscrowMeetingProposal_brand_city_province_idx" ON "EscrowMeetingProposal"("brand", "city", "province");

ALTER TABLE "EscrowMeetingProposal"
ADD CONSTRAINT "EscrowMeetingProposal_escrowId_fkey"
FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EscrowMeetingProposal"
ADD CONSTRAINT "EscrowMeetingProposal_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
