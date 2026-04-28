CREATE TYPE "AvailabilitySlotStatus" AS ENUM ('OPEN', 'SELECTED', 'CANCELLED');

CREATE TYPE "NotificationType" AS ENUM ('MEETING_PROPOSED', 'MEETING_RESPONDED', 'AVAILABILITY_ADDED', 'AVAILABILITY_SELECTED', 'ESCROW_MESSAGE');

CREATE TABLE "EscrowAvailabilitySlot" (
  "id" TEXT NOT NULL,
  "escrowId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "selectedByUserId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "AvailabilitySlotStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EscrowAvailabilitySlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EscrowMessage" (
  "id" TEXT NOT NULL,
  "escrowId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EscrowMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EscrowAvailabilitySlot_escrowId_status_idx" ON "EscrowAvailabilitySlot"("escrowId", "status");
CREATE INDEX "EscrowAvailabilitySlot_createdByUserId_startsAt_idx" ON "EscrowAvailabilitySlot"("createdByUserId", "startsAt");
CREATE INDEX "EscrowAvailabilitySlot_selectedByUserId_startsAt_idx" ON "EscrowAvailabilitySlot"("selectedByUserId", "startsAt");
CREATE INDEX "EscrowMessage_escrowId_createdAt_idx" ON "EscrowMessage"("escrowId", "createdAt");
CREATE INDEX "EscrowMessage_senderUserId_createdAt_idx" ON "EscrowMessage"("senderUserId", "createdAt");
CREATE INDEX "UserNotification_userId_readAt_createdAt_idx" ON "UserNotification"("userId", "readAt", "createdAt");
CREATE INDEX "UserNotification_resourceType_resourceId_idx" ON "UserNotification"("resourceType", "resourceId");

ALTER TABLE "EscrowAvailabilitySlot"
ADD CONSTRAINT "EscrowAvailabilitySlot_escrowId_fkey"
FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EscrowAvailabilitySlot"
ADD CONSTRAINT "EscrowAvailabilitySlot_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EscrowAvailabilitySlot"
ADD CONSTRAINT "EscrowAvailabilitySlot_selectedByUserId_fkey"
FOREIGN KEY ("selectedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EscrowMessage"
ADD CONSTRAINT "EscrowMessage_escrowId_fkey"
FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EscrowMessage"
ADD CONSTRAINT "EscrowMessage_senderUserId_fkey"
FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserNotification"
ADD CONSTRAINT "UserNotification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
