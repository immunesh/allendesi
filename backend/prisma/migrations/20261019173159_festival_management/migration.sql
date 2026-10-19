-- DropIndex
DROP INDEX "order_items_campaignId_idx";

-- DropIndex
DROP INDEX "order_items_offerId_idx";

-- DropIndex
DROP INDEX "order_items_sellerId_idx";

-- CreateTable
CREATE TABLE "festivals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "bannerImage" TEXT,
    "thumbnail" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "pageTitle" TEXT,
    "promotionalText" TEXT,
    "pageBanner" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "approvalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "festival_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "festivalId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "festivalPrice" REAL,
    "discountPercent" REAL,
    "stock" INTEGER,
    "promotionalDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "festival_products_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festivals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "festival_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "festival_products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDesc" TEXT,
    "categoryId" TEXT,
    "gender" TEXT NOT NULL,
    "basePrice" REAL NOT NULL,
    "salePrice" REAL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'Allendesi',
    "material" TEXT,
    "capSize" TEXT,
    "length" TEXT,
    "density" TEXT,
    "texture" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "rating" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sellerId" TEXT,
    CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_products" ("basePrice", "brand", "capSize", "categoryId", "color", "createdAt", "density", "description", "gender", "id", "isActive", "isBestSeller", "isFeatured", "isNewArrival", "length", "material", "name", "rating", "reviewCount", "salePrice", "sellerId", "shortDesc", "sku", "slug", "stock", "tags", "texture", "updatedAt") SELECT "basePrice", "brand", "capSize", "categoryId", "color", "createdAt", "density", "description", "gender", "id", "isActive", "isBestSeller", "isFeatured", "isNewArrival", "length", "material", "name", "rating", "reviewCount", "salePrice", "sellerId", "shortDesc", "sku", "slug", "stock", "tags", "texture", "updatedAt" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "festivals_slug_key" ON "festivals"("slug");

-- CreateIndex
CREATE INDEX "festivals_isActive_isPublished_startsAt_endsAt_idx" ON "festivals"("isActive", "isPublished", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "festival_products_sellerId_status_idx" ON "festival_products"("sellerId", "status");

-- CreateIndex
CREATE INDEX "festival_products_festivalId_status_idx" ON "festival_products"("festivalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "festival_products_festivalId_productId_key" ON "festival_products"("festivalId", "productId");
