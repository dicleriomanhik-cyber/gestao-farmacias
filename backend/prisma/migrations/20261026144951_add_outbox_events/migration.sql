-- CreateTable
CREATE TABLE "outbox_events" (
    "sequence" BIGSERIAL NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("sequence")
);

-- CreateIndex
CREATE INDEX "outbox_events_pharmacyId_sequence_idx" ON "outbox_events"("pharmacyId", "sequence");

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
