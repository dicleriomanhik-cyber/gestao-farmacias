-- Adicionar default uuid() a qrCode (para lotes criados pelo Prisma sem qrCode explicito)
-- Adicionar default 0 a totalUnits (compat com create sem totalUnits; servicos fornecem-no explicitamente)
ALTER TABLE "stock_lots" ALTER COLUMN "qrCode" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "stock_lots" ALTER COLUMN "totalUnits" SET DEFAULT 0;