DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Visit"
    WHERE "endDate" < "startDate"
  ) THEN
    RAISE EXCEPTION
      'Cannot add Visit date-order constraint: existing rows have endDate before startDate';
  END IF;
END $$;

ALTER TABLE "Visit"
ADD CONSTRAINT "Visit_endDate_gte_startDate"
CHECK ("endDate" >= "startDate");
