DO $$
DECLARE
  col_udt text;
BEGIN
  SELECT c.udt_name
  INTO col_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'quote_requests'
    AND c.column_name = 'internalNotes';

  IF col_udt IS NULL THEN
    ALTER TABLE "quote_requests"
      ADD COLUMN "internalNotes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

  ELSIF col_udt = 'text' THEN
    ALTER TABLE "quote_requests"
      ALTER COLUMN "internalNotes" TYPE TEXT[]
      USING CASE
        WHEN "internalNotes" IS NULL OR btrim("internalNotes") = '' THEN ARRAY[]::TEXT[]
        ELSE ARRAY["internalNotes"]
      END;

    ALTER TABLE "quote_requests"
      ALTER COLUMN "internalNotes" SET DEFAULT ARRAY[]::TEXT[];

    UPDATE "quote_requests"
    SET "internalNotes" = ARRAY[]::TEXT[]
    WHERE "internalNotes" IS NULL;

    ALTER TABLE "quote_requests"
      ALTER COLUMN "internalNotes" SET NOT NULL;

  ELSIF col_udt = '_text' THEN
    ALTER TABLE "quote_requests"
      ALTER COLUMN "internalNotes" SET DEFAULT ARRAY[]::TEXT[];

    UPDATE "quote_requests"
    SET "internalNotes" = ARRAY[]::TEXT[]
    WHERE "internalNotes" IS NULL;

    ALTER TABLE "quote_requests"
      ALTER COLUMN "internalNotes" SET NOT NULL;

  ELSE
    RAISE EXCEPTION 'Unsupported type for quote_requests.internalNotes: %', col_udt;
  END IF;
END $$;
