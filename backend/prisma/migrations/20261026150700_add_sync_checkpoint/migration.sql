-- CreateTable
CREATE TABLE "sync_checkpoints" (
    "pharmacyId" UUID NOT NULL,
    "lastCommittedSequence" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_checkpoints_pkey" PRIMARY KEY ("pharmacyId")
);

-- AddForeignKey
ALTER TABLE "sync_checkpoints" ADD CONSTRAINT "sync_checkpoints_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
