CREATE TYPE "ExpensePaidFrom" AS ENUM ('PHARMACY_CASH', 'OWNER_CASH', 'BANK', 'MPESA', 'EMOLA', 'OTHER');

CREATE TYPE "ExtrasSplitMode" AS ENUM ('BY_VALUE', 'BY_UNITS');

ALTER TABLE "expenses" ADD COLUMN "paidFrom" "ExpensePaidFrom" NOT NULL DEFAULT 'PHARMACY_CASH';

UPDATE "expenses" e SET "paidFrom" = CASE
  WHEN e."method" = 'CASH' AND (e."origin" = 'COLLABORATOR' OR EXISTS (SELECT 1 FROM "cash_movements" m WHERE m."expenseId" = e."id")) THEN 'PHARMACY_CASH'::"ExpensePaidFrom"
  WHEN e."method" = 'CASH' THEN 'OWNER_CASH'::"ExpensePaidFrom"
  WHEN e."method" = 'MPESA' THEN 'MPESA'::"ExpensePaidFrom"
  WHEN e."method" = 'EMOLA' THEN 'EMOLA'::"ExpensePaidFrom"
  WHEN e."method" IN ('CARD', 'TRANSFER') THEN 'BANK'::"ExpensePaidFrom"
  ELSE 'OTHER'::"ExpensePaidFrom"
END;

CREATE INDEX "expenses_paidFrom_idx" ON "expenses"("paidFrom");

CREATE TABLE "pharmacy_settings" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "allowCashExpenses" BOOLEAN NOT NULL DEFAULT true,
    "collaboratorExpenses" BOOLEAN NOT NULL DEFAULT true,
    "requireApprovalForCash" BOOLEAN NOT NULL DEFAULT false,
    "usePayables" BOOLEAN NOT NULL DEFAULT false,
    "multiCurrency" BOOLEAN NOT NULL DEFAULT false,
    "extrasSplitMode" "ExtrasSplitMode" NOT NULL DEFAULT 'BY_VALUE',
    "supplierExtraFields" BOOLEAN NOT NULL DEFAULT false,
    "vatRegime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pharmacy_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pharmacy_settings_pharmacyId_key" ON "pharmacy_settings"("pharmacyId");

ALTER TABLE "pharmacy_settings" ADD CONSTRAINT "pharmacy_settings_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "pharmacy_settings" ("id", "pharmacyId", "updatedAt") SELECT gen_random_uuid(), "id", CURRENT_TIMESTAMP FROM "pharmacies";