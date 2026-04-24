-- Embedded insurance foundation for LibreMercado.
-- In this codebase, the "order" equivalent is "EscrowTransaction".

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'InsurancePolicyStatus'
  ) THEN
    CREATE TYPE "InsurancePolicyStatus" AS ENUM ('PENDING', 'ACTIVE', 'CLAIMED');
  END IF;
END $$;

ALTER TABLE "EscrowTransaction"
ADD COLUMN IF NOT EXISTS "is_insured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "insurance_fee" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS insurance_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  endpoint_api TEXT NOT NULL,
  api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS insurance_policies (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES "EscrowTransaction"(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES insurance_providers(id) ON DELETE RESTRICT,
  policy_id_externo TEXT NOT NULL UNIQUE,
  status "InsurancePolicyStatus" NOT NULL DEFAULT 'PENDING',
  premium_amount DECIMAL(12,2) NOT NULL,
  coverage_amount DECIMAL(12,2) NOT NULL,
  policy_url TEXT NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS insurance_policies_provider_id_status_idx
  ON insurance_policies(provider_id, status);

CREATE INDEX IF NOT EXISTS insurance_policies_status_created_at_idx
  ON insurance_policies(status, created_at);
