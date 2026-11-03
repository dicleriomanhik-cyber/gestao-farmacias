-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('MEDICINE', 'PRODUCT');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "hasExpiry" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "minStock" INTEGER,
ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'PRODUCT';

-- AlterTable
ALTER TABLE "stock_lots" ADD COLUMN     "innerCount" INTEGER,
ADD COLUMN     "qrCode" TEXT,
ADD COLUMN     "totalUnits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unitsPerInner" INTEGER;
