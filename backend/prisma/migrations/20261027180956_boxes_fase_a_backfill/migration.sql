-- Fase A: adicionar qrCode (nullable), totalUnits (nullable via int default), innerCount, unitsPerInner, e tornar expiryDate nullable.
-- Preservar todos os dados existentes.

-- 1. StockLot: qrCode nullable + preencher existentes com UUID v4 único
ALTER TABLE "stock_lots" ADD COLUMN "qrCode" TEXT;
UPDATE "stock_lots" SET "qrCode" = gen_random_uuid()::text WHERE "qrCode" IS NULL;

-- 2. StockLot: innerCount, unitsPerInner, totalUnits (com default seguro para existentes = quantityAvailable)
ALTER TABLE "stock_lots" ADD COLUMN "innerCount" INTEGER;
ALTER TABLE "stock_lots" ADD COLUMN "unitsPerInner" INTEGER;
ALTER TABLE "stock_lots" ADD COLUMN "totalUnits" INTEGER;
UPDATE "stock_lots" SET "totalUnits" = "quantityAvailable" WHERE "totalUnits" IS NULL;
ALTER TABLE "stock_lots" ALTER COLUMN "totalUnits" SET NOT NULL;

-- 3. StockLot: expiryDate nullable
ALTER TABLE "stock_lots" ALTER COLUMN "expiryDate" DROP NOT NULL;

-- 4. Product: type, hasExpiry, minStock (com default para existentes)
CREATE TYPE "ProductType" AS ENUM ('MEDICINE', 'PRODUCT');
ALTER TABLE "products" ADD COLUMN "type" "ProductType" NOT NULL DEFAULT 'PRODUCT';
ALTER TABLE "products" ADD COLUMN "hasExpiry" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN "minStock" INTEGER;

-- 5. Classificar produtos existentes: com strength/dosageForm/activeIngredient -> MEDICINE
UPDATE "products" SET "type" = 'MEDICINE' WHERE "strength" IS NOT NULL OR "dosageForm" IS NOT NULL OR "activeIngredient" IS NOT NULL;