-- Fase B: impor NOT NULL + unique em qrCode e unique (pharmacyId, qrCode).
-- Nenhum dado e perdido (Fase A ja preencheu todos com UUID).

-- Verificar que nao ha NULL (defesa)
DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM "stock_lots" WHERE "qrCode" IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Existem % lotes sem qrCode', null_count;
  END IF;
END
$$;

ALTER TABLE "stock_lots" ALTER COLUMN "qrCode" SET NOT NULL;
CREATE UNIQUE INDEX "stock_lots_pharmacyId_qrCode_key" ON "stock_lots"("pharmacyId", "qrCode");