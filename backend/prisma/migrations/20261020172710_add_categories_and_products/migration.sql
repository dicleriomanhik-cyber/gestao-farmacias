-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "categoryId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "activeIngredient" TEXT,
    "dosageForm" TEXT,
    "strength" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'UN',
    "salePrice" DECIMAL(10,2) NOT NULL,
    "referenceCost" DECIMAL(10,2),
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_pharmacyId_idx" ON "categories"("pharmacyId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_pharmacyId_name_key" ON "categories"("pharmacyId", "name");

-- CreateIndex
CREATE INDEX "products_pharmacyId_idx" ON "products"("pharmacyId");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "products_pharmacyId_sku_key" ON "products"("pharmacyId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_pharmacyId_barcode_key" ON "products"("pharmacyId", "barcode");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
