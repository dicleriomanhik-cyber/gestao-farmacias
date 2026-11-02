ALTER TABLE "stock_lots" ADD COLUMN "realUnitCost" DECIMAL(14,6);
ALTER TABLE "sale_line_lots" ADD COLUMN "unitCost" DECIMAL(14,6);

WITH s AS (
  SELECT l.id,
    l."acquisitionCost" AS acq,
    l."totalUnits" AS units,
    p."transportCost" + p."otherCosts" AS extras,
    p."exchangeRate" AS rate,
    ps."extrasSplitMode"::text AS mode,
    SUM(l."acquisitionCost") OVER (PARTITION BY l."purchaseId") AS sum_acq,
    SUM(l."totalUnits") OVER (PARTITION BY l."purchaseId") AS sum_units
  FROM "stock_lots" l
  JOIN "purchases" p ON p.id = l."purchaseId"
  LEFT JOIN "pharmacy_settings" ps ON ps."pharmacyId" = p."pharmacyId"
  WHERE l."acquisitionCost" IS NOT NULL AND l."totalUnits" > 0
)
UPDATE "stock_lots" l SET "realUnitCost" = ROUND((
  (s.acq + CASE
    WHEN s.mode = 'BY_UNITS' THEN CASE WHEN s.sum_units > 0 THEN s.extras * s.units / s.sum_units ELSE 0 END
    ELSE CASE WHEN s.sum_acq > 0 THEN s.extras * s.acq / s.sum_acq ELSE 0 END
  END) * s.rate / s.units)::numeric, 6)
FROM s WHERE s.id = l.id;

UPDATE "stock_lots" SET "realUnitCost" = ROUND(("acquisitionCost" / "totalUnits")::numeric, 6)
WHERE "purchaseId" IS NULL AND "acquisitionCost" IS NOT NULL AND "totalUnits" > 0;