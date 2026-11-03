-- CreateTable
CREATE TABLE "sync_operations" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "saleId" UUID,
    "rejectionCode" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "sync_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_operations_idempotencyKey_key" ON "sync_operations"("idempotencyKey");

-- CreateIndex
CREATE INDEX "sync_operations_pharmacyId_status_idx" ON "sync_operations"("pharmacyId", "status");
