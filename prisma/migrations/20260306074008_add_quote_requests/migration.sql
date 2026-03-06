-- CreateEnum
CREATE TYPE "QuoteRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuoteRequestSource" AS ENUM ('WEB_FORM', 'WHATSAPP');

-- DropForeignKey
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";

-- CreateTable
CREATE TABLE "quote_requests" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT NOT NULL,
    "customerCity" TEXT,
    "notes" TEXT,
    "status" "QuoteRequestStatus" NOT NULL DEFAULT 'NEW',
    "source" "QuoteRequestSource" NOT NULL DEFAULT 'WEB_FORM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_request_items" (
    "id" TEXT NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "productSlugSnapshot" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_request_items_quoteRequestId_idx" ON "quote_request_items"("quoteRequestId");

-- CreateIndex
CREATE INDEX "quote_request_items_productId_idx" ON "quote_request_items"("productId");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_request_items" ADD CONSTRAINT "quote_request_items_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_request_items" ADD CONSTRAINT "quote_request_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
