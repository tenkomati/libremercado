CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "sellerCommissionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "buyerCommissionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "fixedListingFee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "fixedTransactionFee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "defaultCurrency" "CurrencyCode" NOT NULL DEFAULT 'ARS',
    "allowUsdListings" BOOLEAN NOT NULL DEFAULT true,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformSettings" (
    "id",
    "sellerCommissionPercentage",
    "buyerCommissionPercentage",
    "fixedListingFee",
    "fixedTransactionFee",
    "defaultCurrency",
    "allowUsdListings",
    "createdAt",
    "updatedAt"
)
VALUES (
    'global',
    5.00,
    0.00,
    0.00,
    0.00,
    'ARS',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
