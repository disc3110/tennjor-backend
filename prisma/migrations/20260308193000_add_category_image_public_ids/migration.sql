-- Add Cloudinary public IDs for category web/mobile image slots.
ALTER TABLE "Category"
  ADD COLUMN "imageWebPublicId" TEXT,
  ADD COLUMN "imageMobilePublicId" TEXT;
