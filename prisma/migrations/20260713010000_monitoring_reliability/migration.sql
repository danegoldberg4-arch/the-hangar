-- Runs after 20260713000000_baseline. Defaults keep the migration compatible
-- with old application instances during a rolling deploy. Old writers receive
-- a receipt timestamp but remain untrusted and cannot be presented as live.
BEGIN;

ALTER TABLE "SystemStatus" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "SystemStatus" ADD COLUMN "contentHash" TEXT;
ALTER TABLE "SystemStatus" ADD COLUMN "observedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SystemStatus" ADD COLUMN "sourceTimestampTrusted" BOOLEAN NOT NULL DEFAULT false;
UPDATE "SystemStatus"
SET "sourceId" = "id",
    "contentHash" = 'legacy:' || "id",
    "observedAt" = "recordedAt";
ALTER TABLE "SystemStatus" ALTER COLUMN "observedAt" SET NOT NULL;

ALTER TABLE "WeatherData" ADD COLUMN "observedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WeatherData" ADD COLUMN "sourceTimestampTrusted" BOOLEAN NOT NULL DEFAULT false;
UPDATE "WeatherData" SET "observedAt" = "recordedAt";
ALTER TABLE "WeatherData" ALTER COLUMN "observedAt" SET NOT NULL;

WITH legacy_order AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "station" ORDER BY "recordedAt" DESC, "id" DESC
  ) AS row_number
  FROM "WeatherData"
)
UPDATE "WeatherData" AS target
SET "observedAt" = target."recordedAt"
  - legacy_order.row_number * INTERVAL '1 millisecond'
FROM legacy_order
WHERE target."id" = legacy_order."id";

ALTER TABLE "FireDanger" ADD COLUMN "reportDate" TEXT;
ALTER TABLE "FireDanger" ADD COLUMN "observedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FireDanger" ADD COLUMN "sourceTimestampTrusted" BOOLEAN NOT NULL DEFAULT false;
UPDATE "FireDanger" SET "observedAt" = "recordedAt";
ALTER TABLE "FireDanger" ALTER COLUMN "observedAt" SET NOT NULL;

ALTER TABLE "PowerReading" ADD COLUMN "faultCode" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PowerReading" ADD COLUMN "observedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PowerReading" ADD COLUMN "sourceTimestampTrusted" BOOLEAN NOT NULL DEFAULT false;
UPDATE "PowerReading"
SET "observedAt" = "recordedAt";
ALTER TABLE "PowerReading" ALTER COLUMN "observedAt" SET NOT NULL;

WITH legacy_order AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "source" ORDER BY "recordedAt" DESC, "id" DESC
  ) AS row_number
  FROM "PowerReading"
)
UPDATE "PowerReading" AS target
SET "observedAt" = target."recordedAt"
  - legacy_order.row_number * INTERVAL '1 millisecond'
FROM legacy_order
WHERE target."id" = legacy_order."id";

ALTER TABLE "StarlinkStatus" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "StarlinkStatus" ADD COLUMN "contentHash" TEXT;
ALTER TABLE "StarlinkStatus" ADD COLUMN "state" TEXT;
ALTER TABLE "StarlinkStatus" ADD COLUMN "observedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "StarlinkStatus" ADD COLUMN "sourceTimestampTrusted" BOOLEAN NOT NULL DEFAULT false;
UPDATE "StarlinkStatus"
SET "sourceId" = "id",
    "contentHash" = 'legacy:' || "id",
    "state" = CASE WHEN "connected" THEN 'CONNECTED' ELSE 'UNKNOWN' END,
    "observedAt" = "recordedAt";
ALTER TABLE "StarlinkStatus" ALTER COLUMN "observedAt" SET NOT NULL;

CREATE UNIQUE INDEX "SystemStatus_sourceId_key" ON "SystemStatus"("sourceId");
CREATE INDEX "SystemStatus_system_observedAt_idx" ON "SystemStatus"("system", "observedAt");
CREATE INDEX "WeatherData_station_observedAt_idx" ON "WeatherData"("station", "observedAt");
CREATE UNIQUE INDEX "WeatherData_station_observedAt_key" ON "WeatherData"("station", "observedAt");
CREATE INDEX "FireDanger_district_observedAt_idx" ON "FireDanger"("district", "observedAt");
CREATE UNIQUE INDEX "FireDanger_district_reportDate_key" ON "FireDanger"("district", "reportDate");
CREATE INDEX "PowerReading_observedAt_idx" ON "PowerReading"("observedAt");
CREATE UNIQUE INDEX "PowerReading_source_observedAt_key" ON "PowerReading"("source", "observedAt");
CREATE UNIQUE INDEX "StarlinkStatus_sourceId_key" ON "StarlinkStatus"("sourceId");
CREATE INDEX "StarlinkStatus_observedAt_idx" ON "StarlinkStatus"("observedAt");

-- Per-bank gas alerts replace the ambiguous legacy global alert.
UPDATE "Alert"
SET "isActive" = false,
    "resolvedAt" = COALESCE("resolvedAt", CURRENT_TIMESTAMP)
WHERE "id" = 'gas-reserve' AND "isActive" = true;

COMMIT;
