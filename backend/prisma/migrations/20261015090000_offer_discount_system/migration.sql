ALTER TABLE "products" ADD COLUMN "sellerId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders" ADD COLUMN "couponId" TEXT REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD COLUMN "campaignId" TEXT REFERENCES "marketplace_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD COLUMN "originalPrice" REAL;
ALTER TABLE "order_items" ADD COLUMN "sellerDiscount" REAL NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN "campaignDiscount" REAL NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN "couponDiscount" REAL NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN "sellerId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD COLUMN "offerId" TEXT REFERENCES "seller_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD COLUMN "campaignId" TEXT REFERENCES "marketplace_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "coupons" ADD COLUMN "perUserLimit" INTEGER;
ALTER TABLE "coupons" ADD COLUMN "startsAt" DATETIME;
ALTER TABLE "coupons" ADD COLUMN "stackingAllowed" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "seller_offers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "discountPercent" REAL,
  "salePrice" REAL,
  "startsAt" DATETIME NOT NULL,
  "endsAt" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  "rejectionReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "seller_offers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "seller_offers_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "seller_offers_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "offer_approval_history" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "offerId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offer_approval_history_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "seller_offers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "offer_approval_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "discount_policies" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
  "sellerOffersRequireApproval" BOOLEAN NOT NULL DEFAULT true,
  "maximumSellerDiscount" REAL NOT NULL DEFAULT 90,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "marketplace_campaigns" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "value" REAL NOT NULL,
  "minOrder" REAL,
  "maxDiscount" REAL,
  "startsAt" DATETIME NOT NULL,
  "endsAt" DATETIME NOT NULL,
  "usageLimit" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "perUserLimit" INTEGER,
  "stackingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "marketplace_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "campaign_products" (
  "campaignId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  PRIMARY KEY ("campaignId", "productId"),
  CONSTRAINT "campaign_products_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketplace_campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "campaign_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "campaign_categories" (
  "campaignId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  PRIMARY KEY ("campaignId", "categoryId"),
  CONSTRAINT "campaign_categories_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketplace_campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "campaign_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "coupon_products" (
  "couponId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  PRIMARY KEY ("couponId", "productId"),
  CONSTRAINT "coupon_products_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "coupon_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "coupon_categories" (
  "couponId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  PRIMARY KEY ("couponId", "categoryId"),
  CONSTRAINT "coupon_categories_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "coupon_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "coupon_usages" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "couponId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "discount" REAL NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coupon_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "coupon_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "coupon_usages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "campaign_usages" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "discount" REAL NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_usages_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketplace_campaigns" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "campaign_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "campaign_usages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "coupon_usages_orderId_key" ON "coupon_usages"("orderId");
CREATE UNIQUE INDEX "campaign_usages_orderId_key" ON "campaign_usages"("orderId");
CREATE UNIQUE INDEX "coupon_usages_couponId_userId_orderId_key" ON "coupon_usages"("couponId", "userId", "orderId");
CREATE UNIQUE INDEX "campaign_usages_campaignId_userId_orderId_key" ON "campaign_usages"("campaignId", "userId", "orderId");
CREATE INDEX "coupon_usages_couponId_userId_idx" ON "coupon_usages"("couponId", "userId");
CREATE INDEX "campaign_usages_campaignId_userId_idx" ON "campaign_usages"("campaignId", "userId");
CREATE INDEX "seller_offers_sellerId_status_idx" ON "seller_offers"("sellerId", "status");
CREATE INDEX "seller_offers_productId_status_idx" ON "seller_offers"("productId", "status");
CREATE INDEX "seller_offers_startsAt_endsAt_idx" ON "seller_offers"("startsAt", "endsAt");
CREATE INDEX "offer_approval_history_offerId_createdAt_idx" ON "offer_approval_history"("offerId", "createdAt");
CREATE INDEX "marketplace_campaigns_isActive_startsAt_endsAt_idx" ON "marketplace_campaigns"("isActive", "startsAt", "endsAt");
CREATE INDEX "products_sellerId_idx" ON "products"("sellerId");
CREATE INDEX "order_items_sellerId_idx" ON "order_items"("sellerId");
CREATE INDEX "order_items_offerId_idx" ON "order_items"("offerId");
CREATE INDEX "order_items_campaignId_idx" ON "order_items"("campaignId");
