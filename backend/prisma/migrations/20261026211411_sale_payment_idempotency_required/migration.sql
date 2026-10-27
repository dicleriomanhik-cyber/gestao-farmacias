-- Backfill: preencher idempotencyKey NULL com UUID v4 unicos
UPDATE "sale_payments"
SET "idempotencyKey" = gen_random_uuid()::text
WHERE "idempotencyKey" IS NULL;

-- Verificar duplicados (deve ser 0; se nao for, a migracao falha)
DO $$
DECLARE
  dup_count INT;
BEGIN
  SELECT COUNT(*) - COUNT(DISTINCT "idempotencyKey") INTO dup_count FROM "sale_payments";
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Existem % idempotencyKey duplicados em sale_payments', dup_count;
  END IF;
END
$$;

-- Garantir NOT NULL
ALTER TABLE "sale_payments" ALTER COLUMN "idempotencyKey" SET NOT NULL;
