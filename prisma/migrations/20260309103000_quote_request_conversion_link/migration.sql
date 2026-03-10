-- QuoteRequest conversion linkage to InternalSaleQuote

-- Add CONVERTED to QuoteRequestStatus enum
ALTER TYPE "QuoteRequestStatus" ADD VALUE IF NOT EXISTS 'CONVERTED';

-- Add conversion timestamp on public quote requests
ALTER TABLE "quote_requests"
  ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);

-- Enforce one InternalSaleQuote per public QuoteRequest
DROP INDEX IF EXISTS "InternalSaleQuote_publicQuoteRequestId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "InternalSaleQuote_publicQuoteRequestId_key"
  ON "InternalSaleQuote"("publicQuoteRequestId");
