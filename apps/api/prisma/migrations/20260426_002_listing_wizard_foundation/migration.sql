-- CreateEnum
CREATE TYPE "ProductMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "ListingDraftStatus" AS ENUM ('OPEN', 'PUBLISHED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ListingDraftStep" AS ENUM ('PRODUCT_MATCH', 'GALLERY', 'SECURITY', 'LOGISTICS', 'REVIEW');

-- AlterTable
ALTER TABLE "Listing"
ADD COLUMN "productId" TEXT,
ADD COLUMN "slug" TEXT,
ADD COLUMN "autoTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "marketTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "category" TEXT NOT NULL,
    "releaseYear" INTEGER,
    "technicalSpecs" JSONB,
    "searchAliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "catalogProductId" TEXT,
    "title" TEXT,
    "slugBase" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "category" TEXT,
    "manufactureYear" INTEGER,
    "description" TEXT,
    "condition" "ListingCondition",
    "serialNumber" TEXT,
    "imei" TEXT,
    "invoiceVerified" BOOLEAN NOT NULL DEFAULT false,
    "transparencyBadge" BOOLEAN NOT NULL DEFAULT false,
    "technicalSpecs" JSONB,
    "searchTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "marketTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visionSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMedia" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "ProductMediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "aiBlurDetected" BOOLEAN NOT NULL DEFAULT false,
    "aiNoisyBackground" BOOLEAN NOT NULL DEFAULT false,
    "aiVisibleDamage" BOOLEAN NOT NULL DEFAULT false,
    "aiQualityScore" INTEGER NOT NULL DEFAULT 0,
    "aiSuggestion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingDraft" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "matchedCatalogProductId" TEXT,
    "status" "ListingDraftStatus" NOT NULL DEFAULT 'OPEN',
    "currentStep" "ListingDraftStep" NOT NULL DEFAULT 'PRODUCT_MATCH',
    "searchQuery" TEXT,
    "referenceImageUrl" TEXT,
    "targetNetAmount" DECIMAL(12,2),
    "askingPrice" DECIMAL(12,2),
    "shippingFeeEstimate" DECIMAL(12,2),
    "insuranceFeeEstimate" DECIMAL(12,2),
    "currency" "CurrencyCode" NOT NULL DEFAULT 'ARS',
    "locationProvince" TEXT,
    "locationCity" TEXT,
    "deliveryMethods" "DeliveryMethod"[] DEFAULT ARRAY[]::"DeliveryMethod"[],
    "insuranceSelected" BOOLEAN NOT NULL DEFAULT false,
    "hasFunctionalityVideo" BOOLEAN NOT NULL DEFAULT false,
    "publishedListingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingDraft_pkey" PRIMARY KEY ("id")
);

-- Seed Product rows from existing listings
INSERT INTO "Product" (
    "id",
    "sellerId",
    "title",
    "slugBase",
    "brand",
    "model",
    "category",
    "description",
    "condition",
    "searchTags",
    "marketTags",
    "createdAt",
    "updatedAt"
)
SELECT
    'prod_' || "id",
    "sellerId",
    "title",
    lower(regexp_replace("title", '[^a-zA-Z0-9]+', '-', 'g')),
    split_part("title", ' ', 1),
    NULL,
    "category",
    "description",
    "condition",
    ARRAY[
      lower("category"),
      lower(regexp_replace("title", '\s+', '-', 'g'))
    ]::TEXT[],
    ARRAY[]::TEXT[],
    "createdAt",
    "updatedAt"
FROM "Listing";

-- Link listings to products
UPDATE "Listing"
SET "productId" = 'prod_' || "id",
    "slug" = lower(regexp_replace("title", '[^a-zA-Z0-9]+', '-', 'g')),
    "autoTags" = ARRAY[
      lower("category"),
      lower(regexp_replace("title", '\s+', '-', 'g'))
    ]::TEXT[]
WHERE "productId" IS NULL;

-- Copy existing listing images into product media
INSERT INTO "ProductMedia" (
    "id",
    "productId",
    "type",
    "url",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    'media_' || li."id",
    'prod_' || li."listingId",
    'IMAGE'::"ProductMediaType",
    li."url",
    li."sortOrder",
    li."createdAt",
    CURRENT_TIMESTAMP
FROM "ListingImage" li;

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_externalRef_key" ON "CatalogProduct"("externalRef");
CREATE UNIQUE INDEX "CatalogProduct_slug_key" ON "CatalogProduct"("slug");
CREATE INDEX "CatalogProduct_category_isActive_idx" ON "CatalogProduct"("category", "isActive");
CREATE INDEX "CatalogProduct_title_isActive_idx" ON "CatalogProduct"("title", "isActive");

-- CreateIndex
CREATE INDEX "Product_sellerId_updatedAt_idx" ON "Product"("sellerId", "updatedAt");
CREATE INDEX "Product_category_condition_idx" ON "Product"("category", "condition");

-- CreateIndex
CREATE INDEX "ProductMedia_productId_type_sortOrder_idx" ON "ProductMedia"("productId", "type", "sortOrder");

-- CreateIndex
CREATE INDEX "ListingDraft_sellerId_status_updatedAt_idx" ON "ListingDraft"("sellerId", "status", "updatedAt");
CREATE INDEX "ListingDraft_productId_status_idx" ON "ListingDraft"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_productId_key" ON "Listing"("productId");
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");
CREATE INDEX "Listing_slug_idx" ON "Listing"("slug");

-- AddForeignKey
ALTER TABLE "Product"
ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductMedia"
ADD CONSTRAINT "ProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ListingDraft"
ADD CONSTRAINT "ListingDraft_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ListingDraft"
ADD CONSTRAINT "ListingDraft_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ListingDraft"
ADD CONSTRAINT "ListingDraft_matchedCatalogProductId_fkey" FOREIGN KEY ("matchedCatalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Listing"
ADD CONSTRAINT "Listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
