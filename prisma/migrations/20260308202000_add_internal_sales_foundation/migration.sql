-- Internal sales domain foundation (schema only; no module CRUD yet)

-- Enums
CREATE TYPE "InternalSaleQuoteStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'COMPLETED'
);

CREATE TYPE "CompletedSaleStatus" AS ENUM (
  'COMPLETED',
  'CANCELLED',
  'REFUNDED'
);

CREATE TYPE "DiscountType" AS ENUM (
  'FIXED',
  'PERCENTAGE'
);

-- InternalSaleQuote
CREATE TABLE "InternalSaleQuote" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "status" "InternalSaleQuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "customerCity" TEXT,
  "notes" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'MXN',
  "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discountTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalProfit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "marginPct" DECIMAL(7,4),
  "publicQuoteRequestId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InternalSaleQuote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InternalSaleQuote_code_key" ON "InternalSaleQuote"("code");
CREATE INDEX "InternalSaleQuote_status_idx" ON "InternalSaleQuote"("status");
CREATE INDEX "InternalSaleQuote_createdByUserId_idx" ON "InternalSaleQuote"("createdByUserId");
CREATE INDEX "InternalSaleQuote_publicQuoteRequestId_idx" ON "InternalSaleQuote"("publicQuoteRequestId");

-- InternalSaleQuoteItem
CREATE TABLE "InternalSaleQuoteItem" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "productId" TEXT,
  "variantId" TEXT,
  "productNameSnapshot" TEXT NOT NULL,
  "productSlugSnapshot" TEXT NOT NULL,
  "sizeSnapshot" TEXT,
  "colorSnapshot" TEXT,
  "skuSnapshot" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitSalePrice" DECIMAL(12,2) NOT NULL,
  "unitCostSnapshot" DECIMAL(12,2) NOT NULL,
  "lineRevenue" DECIMAL(14,2) NOT NULL,
  "lineCost" DECIMAL(14,2) NOT NULL,
  "lineProfit" DECIMAL(14,2) NOT NULL,
  "discountType" "DiscountType",
  "discountValue" DECIMAL(12,2),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InternalSaleQuoteItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InternalSaleQuoteItem_quoteId_idx" ON "InternalSaleQuoteItem"("quoteId");
CREATE INDEX "InternalSaleQuoteItem_productId_idx" ON "InternalSaleQuoteItem"("productId");
CREATE INDEX "InternalSaleQuoteItem_variantId_idx" ON "InternalSaleQuoteItem"("variantId");

-- CompletedSale
CREATE TABLE "CompletedSale" (
  "id" TEXT NOT NULL,
  "saleNumber" TEXT NOT NULL,
  "quoteId" TEXT,
  "status" "CompletedSaleStatus" NOT NULL DEFAULT 'COMPLETED',
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "customerCity" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'MXN',
  "subtotal" DECIMAL(14,2) NOT NULL,
  "discountTotal" DECIMAL(14,2) NOT NULL,
  "totalRevenue" DECIMAL(14,2) NOT NULL,
  "totalCost" DECIMAL(14,2) NOT NULL,
  "totalProfit" DECIMAL(14,2) NOT NULL,
  "marginPct" DECIMAL(7,4),
  "notes" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompletedSale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompletedSale_saleNumber_key" ON "CompletedSale"("saleNumber");
CREATE UNIQUE INDEX "CompletedSale_quoteId_key" ON "CompletedSale"("quoteId");
CREATE INDEX "CompletedSale_status_idx" ON "CompletedSale"("status");
CREATE INDEX "CompletedSale_createdByUserId_idx" ON "CompletedSale"("createdByUserId");

-- CompletedSaleItem
CREATE TABLE "CompletedSaleItem" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "productId" TEXT,
  "variantId" TEXT,
  "productNameSnapshot" TEXT NOT NULL,
  "productSlugSnapshot" TEXT NOT NULL,
  "sizeSnapshot" TEXT,
  "colorSnapshot" TEXT,
  "skuSnapshot" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitSalePrice" DECIMAL(12,2) NOT NULL,
  "unitCostSnapshot" DECIMAL(12,2) NOT NULL,
  "lineRevenue" DECIMAL(14,2) NOT NULL,
  "lineCost" DECIMAL(14,2) NOT NULL,
  "lineProfit" DECIMAL(14,2) NOT NULL,
  "discountType" "DiscountType",
  "discountValue" DECIMAL(12,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompletedSaleItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompletedSaleItem_saleId_idx" ON "CompletedSaleItem"("saleId");
CREATE INDEX "CompletedSaleItem_productId_idx" ON "CompletedSaleItem"("productId");
CREATE INDEX "CompletedSaleItem_variantId_idx" ON "CompletedSaleItem"("variantId");

-- FKs
ALTER TABLE "InternalSaleQuote"
  ADD CONSTRAINT "InternalSaleQuote_publicQuoteRequestId_fkey"
    FOREIGN KEY ("publicQuoteRequestId") REFERENCES "quote_requests"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalSaleQuote"
  ADD CONSTRAINT "InternalSaleQuote_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InternalSaleQuoteItem"
  ADD CONSTRAINT "InternalSaleQuoteItem_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "InternalSaleQuote"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalSaleQuoteItem"
  ADD CONSTRAINT "InternalSaleQuoteItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalSaleQuoteItem"
  ADD CONSTRAINT "InternalSaleQuoteItem_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompletedSale"
  ADD CONSTRAINT "CompletedSale_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "InternalSaleQuote"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompletedSale"
  ADD CONSTRAINT "CompletedSale_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompletedSaleItem"
  ADD CONSTRAINT "CompletedSaleItem_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "CompletedSale"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompletedSaleItem"
  ADD CONSTRAINT "CompletedSaleItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompletedSaleItem"
  ADD CONSTRAINT "CompletedSaleItem_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
