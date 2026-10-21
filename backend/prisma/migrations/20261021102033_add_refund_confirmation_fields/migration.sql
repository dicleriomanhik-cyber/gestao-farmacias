-- AlterTable
ALTER TABLE "return_refunds" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedBy" UUID,
ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "notes" TEXT;

-- AddForeignKey
ALTER TABLE "return_refunds" ADD CONSTRAINT "return_refunds_confirmedBy_fkey" FOREIGN KEY ("confirmedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
