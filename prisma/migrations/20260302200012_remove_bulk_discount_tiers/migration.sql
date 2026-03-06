/*
  Warnings:

  - You are about to drop the `BulkDiscountTier` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BulkDiscountTier" DROP CONSTRAINT "BulkDiscountTier_productId_fkey";

-- DropTable
DROP TABLE "BulkDiscountTier";
