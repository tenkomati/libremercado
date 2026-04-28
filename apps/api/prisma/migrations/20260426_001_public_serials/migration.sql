ALTER TABLE "User" ADD COLUMN "publicSerial" INTEGER;
CREATE SEQUENCE "User_publicSerial_seq";
ALTER SEQUENCE "User_publicSerial_seq" OWNED BY "User"."publicSerial";
ALTER TABLE "User" ALTER COLUMN "publicSerial" SET DEFAULT nextval('"User_publicSerial_seq"');

WITH ordered_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS serial
  FROM "User"
)
UPDATE "User"
SET "publicSerial" = ordered_users.serial
FROM ordered_users
WHERE "User".id = ordered_users.id;

SELECT setval('"User_publicSerial_seq"', COALESCE((SELECT MAX("publicSerial") FROM "User"), 1), true);
ALTER TABLE "User" ALTER COLUMN "publicSerial" SET NOT NULL;
CREATE UNIQUE INDEX "User_publicSerial_key" ON "User"("publicSerial");

ALTER TABLE "EscrowTransaction" ADD COLUMN "publicSerial" INTEGER;
CREATE SEQUENCE "EscrowTransaction_publicSerial_seq";
ALTER SEQUENCE "EscrowTransaction_publicSerial_seq" OWNED BY "EscrowTransaction"."publicSerial";
ALTER TABLE "EscrowTransaction" ALTER COLUMN "publicSerial" SET DEFAULT nextval('"EscrowTransaction_publicSerial_seq"');

WITH ordered_escrows AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS serial
  FROM "EscrowTransaction"
)
UPDATE "EscrowTransaction"
SET "publicSerial" = ordered_escrows.serial
FROM ordered_escrows
WHERE "EscrowTransaction".id = ordered_escrows.id;

SELECT setval(
  '"EscrowTransaction_publicSerial_seq"',
  COALESCE((SELECT MAX("publicSerial") FROM "EscrowTransaction"), 1),
  true
);
ALTER TABLE "EscrowTransaction" ALTER COLUMN "publicSerial" SET NOT NULL;
CREATE UNIQUE INDEX "EscrowTransaction_publicSerial_key" ON "EscrowTransaction"("publicSerial");
