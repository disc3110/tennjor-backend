-- Internal sale quote note model + quote request item cost snapshots

-- QuoteRequestItem snapshots
ALTER TABLE "quote_request_items"
  ADD COLUMN IF NOT EXISTS "baseCostSnapshot" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "costCurrencySnapshot" TEXT;

-- InternalSaleQuoteNote
CREATE TABLE "InternalSaleQuoteNote" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InternalSaleQuoteNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InternalSaleQuoteNote_quoteId_idx" ON "InternalSaleQuoteNote"("quoteId");
CREATE INDEX "InternalSaleQuoteNote_authorUserId_idx" ON "InternalSaleQuoteNote"("authorUserId");

ALTER TABLE "InternalSaleQuoteNote"
  ADD CONSTRAINT "InternalSaleQuoteNote_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "InternalSaleQuote"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalSaleQuoteNote"
  ADD CONSTRAINT "InternalSaleQuoteNote_authorUserId_fkey"
    FOREIGN KEY ("authorUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
