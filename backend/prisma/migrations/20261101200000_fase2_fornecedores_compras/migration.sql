ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'DIRECT_ENTRY';

CREATE TYPE "PurchasePaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'CREDIT');
CREATE TYPE "ExtrasSplitMode" AS ENUM ('BY_VALUE', 'BY_UNITS');

ALTER TABLE "suppliers" ADD COLUMN "whatsapp" TEXT;

ALTER TABLE "purchases"
  ADD COLUMN "transportCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "otherCosts" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "invoiceTotal" DECIMAL(12,2),
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'MZN',
  ADD COLUMN "exchangeRate" DECIMAL(14,6) NOT NULL DEFAULT 1,
  ADD COLUMN "paymentStatus" "PurchasePaymentStatus" NOT NULL DEFAULT 'PAID',
  ADD COLUMN "dueDate" TIMESTAMP(3);

ALTER TABLE "stock_lots"
  ADD COLUMN "purchaseId" UUID,
  ADD COLUMN "acquisitionCost" DECIMAL(12,2);

ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

CREATE TABLE "supplier_payments" (
  "id" UUID NOT NULL,
  "pharmacyId" UUID NOT NULL,
  "supplierId" UUID NOT NULL,
  "purchaseId" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paidFrom" TEXT NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "userId" UUID NOT NULL,
  "cashSessionId" UUID,
  "cashMovementId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "supplier_payments_pharmacyId_idx" ON "supplier_payments"("pharmacyId");
CREATE INDEX "supplier_payments_supplierId_idx" ON "supplier_payments"("supplierId");
CREATE INDEX "supplier_payments_purchaseId_idx" ON "supplier_payments"("purchaseId");

ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;