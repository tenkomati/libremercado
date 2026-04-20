ALTER TABLE "KycVerification"
ADD COLUMN "documentFrontImageUrl" TEXT,
ADD COLUMN "documentBackImageUrl" TEXT,
ADD COLUMN "selfieImageUrl" TEXT,
ADD COLUMN "biometricConsentAt" TIMESTAMP(3);
