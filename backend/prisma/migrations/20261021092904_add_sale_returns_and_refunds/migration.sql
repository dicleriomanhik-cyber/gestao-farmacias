/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `sale_payments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnLineCondition" AS ENUM ('PENDING_INSPECTION', 'RESELLABLE', 'DAMAGED', 'EXPIRED', 'LOST');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('CASH', 'CARD', 'MPESA', 'EMOLA', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "sale_payments" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateTable
CREATE TABLE "sale_returns" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "totalRefund" DECIMAL(12,2) NOT NULL,
    "userId" UUID NOT NULL,
    "confirmationKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_return_lines" (
    "id" UUID NOT NULL,
    "returnId" UUID NOT NULL,
    "saleLineId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityInspected" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "condition" "ReturnLineCondition" NOT NULL DEFAULT 'PENDING_INSPECTION',
    "lotId" UUID,
    "lotNumber" TEXT,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "sale_return_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarantine_stock" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "saleReturnLineId" UUID NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantityReceived" INTEGER NOT NULL,
    "quantityInspected" INTEGER NOT NULL DEFAULT 0,
    "quantityReleased" INTEGER NOT NULL DEFAULT 0,
    "quantityDamaged" INTEGER NOT NULL DEFAULT 0,
    "quantityLost" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "status" "ReturnLineCondition" NOT NULL DEFAULT 'PENDING_INSPECTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quarantine_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_refunds" (
    "id" UUID NOT NULL,
    "returnLineId" UUID NOT NULL,
    "salePaymentId" UUID,
    "method" "RefundMethod" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "idempotencyKey" TEXT,
    "cashSessionId" UUID,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sale_returns_confirmationKey_key" ON "sale_returns"("confirmationKey");

-- CreateIndex
CREATE INDEX "sale_returns_pharmacyId_idx" ON "sale_returns"("pharmacyId");

-- CreateIndex
CREATE INDEX "sale_returns_saleId_idx" ON "sale_returns"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_returns_pharmacyId_returnNumber_key" ON "sale_returns"("pharmacyId", "returnNumber");

-- CreateIndex
CREATE INDEX "sale_return_lines_returnId_idx" ON "sale_return_lines"("returnId");

-- CreateIndex
CREATE INDEX "sale_return_lines_saleLineId_idx" ON "sale_return_lines"("saleLineId");

-- CreateIndex
CREATE INDEX "quarantine_stock_pharmacyId_idx" ON "quarantine_stock"("pharmacyId");

-- CreateIndex
CREATE INDEX "quarantine_stock_productId_idx" ON "quarantine_stock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "return_refunds_idempotencyKey_key" ON "return_refunds"("idempotencyKey");

-- CreateIndex
CREATE INDEX "return_refunds_returnLineId_idx" ON "return_refunds"("returnLineId");

-- CreateIndex
CREATE INDEX "return_refunds_salePaymentId_idx" ON "return_refunds"("salePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_payments_idempotencyKey_key" ON "sale_payments"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_lines" ADD CONSTRAINT "sale_return_lines_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "sale_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_lines" ADD CONSTRAINT "sale_return_lines_saleLineId_fkey" FOREIGN KEY ("saleLineId") REFERENCES "sale_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_lines" ADD CONSTRAINT "sale_return_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_lines" ADD CONSTRAINT "sale_return_lines_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "stock_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarantine_stock" ADD CONSTRAINT "quarantine_stock_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarantine_stock" ADD CONSTRAINT "quarantine_stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarantine_stock" ADD CONSTRAINT "quarantine_stock_saleReturnLineId_fkey" FOREIGN KEY ("saleReturnLineId") REFERENCES "sale_return_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_refunds" ADD CONSTRAINT "return_refunds_returnLineId_fkey" FOREIGN KEY ("returnLineId") REFERENCES "sale_return_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_refunds" ADD CONSTRAINT "return_refunds_salePaymentId_fkey" FOREIGN KEY ("salePaymentId") REFERENCES "sale_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_refunds" ADD CONSTRAINT "return_refunds_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_refunds" ADD CONSTRAINT "return_refunds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
