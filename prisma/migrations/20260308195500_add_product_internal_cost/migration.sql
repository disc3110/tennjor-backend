-- Add internal cost tracking fields for admin-only product cost management.
ALTER TABLE "Product"
  ADD COLUMN "baseCost" DECIMAL(12, 2),
  ADD COLUMN "costCurrency" TEXT NOT NULL DEFAULT 'MXN';
