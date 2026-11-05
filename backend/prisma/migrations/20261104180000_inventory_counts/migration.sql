CREATE TYPE "InventoryStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

CREATE TABLE "inventory_counts" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdById" UUID,
    "completedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "inventory_counts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_count_lines" (
    "id" UUID NOT NULL,
    "countId" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "countedQty" INTEGER,
    "appliedDiff" INTEGER,
    CONSTRAINT "inventory_count_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_counts_pharmacyId_idx" ON "inventory_counts"("pharmacyId");
CREATE INDEX "inventory_counts_status_idx" ON "inventory_counts"("status");
CREATE UNIQUE INDEX "inventory_count_lines_countId_lotId_key" ON "inventory_count_lines"("countId", "lotId");
CREATE INDEX "inventory_count_lines_lotId_idx" ON "inventory_count_lines"("lotId");

ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "inventory_count_lines_countId_fkey" FOREIGN KEY ("countId") REFERENCES "inventory_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "inventory_count_lines_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "stock_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;