-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'PROCESSED', 'REJECTED', 'CONFLICT');

-- CreateTable
CREATE TABLE "sync_clients" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "appVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_operations" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "syncClientId" UUID NOT NULL,
    "operationType" TEXT NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "rejectionReason" TEXT,
    "rejectionCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "sync_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_clients_clientId_key" ON "sync_clients"("clientId");

-- CreateIndex
CREATE INDEX "sync_clients_pharmacyId_idx" ON "sync_clients"("pharmacyId");

-- CreateIndex
CREATE INDEX "sync_clients_lastSyncAt_idx" ON "sync_clients"("lastSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "sync_clients_pharmacyId_clientId_key" ON "sync_clients"("pharmacyId", "clientId");

-- CreateIndex
CREATE INDEX "sync_operations_pharmacyId_idx" ON "sync_operations"("pharmacyId");

-- CreateIndex
CREATE INDEX "sync_operations_syncClientId_idx" ON "sync_operations"("syncClientId");

-- CreateIndex
CREATE INDEX "sync_operations_status_idx" ON "sync_operations"("status");

-- CreateIndex
CREATE INDEX "sync_operations_createdAt_idx" ON "sync_operations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sync_operations_pharmacyId_idempotencyKey_key" ON "sync_operations"("pharmacyId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "sync_clients" ADD CONSTRAINT "sync_clients_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_syncClientId_fkey" FOREIGN KEY ("syncClientId") REFERENCES "sync_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
