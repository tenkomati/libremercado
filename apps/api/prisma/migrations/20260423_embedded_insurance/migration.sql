CREATE TYPE "InsurancePolicyStatus" AS ENUM ('PENDING', 'ACTIVE', 'CLAIMED');

ALTER TABLE "EscrowTransaction"
ADD COLUMN "is_insured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "insurance_fee" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "insurance_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpoint_api" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_providers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "insurance_policies" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "policy_id_externo" TEXT NOT NULL,
    "status" "InsurancePolicyStatus" NOT NULL DEFAULT 'PENDING',
    "premium_amount" DECIMAL(12,2) NOT NULL,
    "coverage_amount" DECIMAL(12,2) NOT NULL,
    "policy_url" TEXT NOT NULL,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "insurance_providers_name_key" ON "insurance_providers"("name");
CREATE UNIQUE INDEX "insurance_policies_order_id_key" ON "insurance_policies"("order_id");
CREATE UNIQUE INDEX "insurance_policies_policy_id_externo_key" ON "insurance_policies"("policy_id_externo");
CREATE INDEX "insurance_policies_provider_id_status_idx" ON "insurance_policies"("provider_id", "status");
CREATE INDEX "insurance_policies_status_created_at_idx" ON "insurance_policies"("status", "created_at");

ALTER TABLE "insurance_policies"
ADD CONSTRAINT "insurance_policies_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "insurance_policies"
ADD CONSTRAINT "insurance_policies_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "insurance_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
