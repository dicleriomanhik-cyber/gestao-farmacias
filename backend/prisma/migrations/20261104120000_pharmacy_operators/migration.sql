CREATE TABLE "pharmacy_operators" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_operators_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pharmacy_operators_pharmacyId_idx" ON "pharmacy_operators"("pharmacyId");

ALTER TABLE "sales" ADD COLUMN "operatorId" UUID,
ADD COLUMN "operatorName" TEXT;