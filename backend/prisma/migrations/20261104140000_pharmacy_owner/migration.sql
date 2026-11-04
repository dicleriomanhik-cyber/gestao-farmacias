ALTER TABLE "pharmacies" ADD COLUMN "ownerPharmacyId" UUID;
CREATE INDEX "pharmacies_ownerPharmacyId_idx" ON "pharmacies"("ownerPharmacyId");