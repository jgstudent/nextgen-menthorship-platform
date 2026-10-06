ALTER TABLE "Item" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Workshop" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Item_archivedAt_idx" ON "Item"("archivedAt");
CREATE INDEX "Workshop_archivedAt_idx" ON "Workshop"("archivedAt");
