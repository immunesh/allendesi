-- CreateIndex
CREATE INDEX "order_items_sellerId_idx" ON "order_items"("sellerId");

-- CreateIndex
CREATE INDEX "order_items_offerId_idx" ON "order_items"("offerId");

-- CreateIndex
CREATE INDEX "order_items_campaignId_idx" ON "order_items"("campaignId");
