CREATE TYPE "PurchasePaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'CREDIT');

ALTER TABLE "suppliers" ADD COLUMN "whatsapp" TEXT;

ALTER TABLE "purchases"
  ADD COLUMN "transportCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "otherCosts" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "invoiceTotal" DECIMAL(12,2),
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'MZN',
  ADD COLUMN "exchangeRate" DECIMAL(14,6) NOT NULL DEFAULT 1,
  ADD COLUMN "paymentStatus" "PurchasePaymentStatus" NOT NULL DEFAULT 'PAID',
  ADD COLUMN "dueDate" TIMESTAMP(3);

ALTER TABLE "stock_lots" ADD COLUMN "purchaseId" UUID;

CREATE TABLE "supplier_payments" (
  "id" UUID NOT NULL,
  "pharmacyId" UUID NOT NULL,
  "supplierId" UUID NOT NULL,
  "purchaseId" UUID,
  "amount" DECIMAL(12,2) NOT NULL,
  "paidFrom" "ExpensePaidFrom" NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "cashSessionId" UUID,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" UUID NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_lots_purchaseId_idx" ON "stock_lots"("purchaseId");
CREATE INDEX "supplier_payments_pharmacyId_idx" ON "supplier_payments"("pharmacyId");
CREATE INDEX "supplier_payments_supplierId_idx" ON "supplier_payments"("supplierId");
CREATE INDEX "supplier_payments_purchaseId_idx" ON "supplier_payments"("purchaseId");
CREATE INDEX "supplier_payments_cashSessionId_idx" ON "supplier_payments"("cashSessionId");

ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;