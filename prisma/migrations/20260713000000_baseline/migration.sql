-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'family',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "intervalLabel" TEXT NOT NULL,
    "parts" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "assignedTo" TEXT NOT NULL DEFAULT '',
    "lastCompletedAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedBy" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "partsUsed" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemStatus" (
    "id" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherData" (
    "id" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "airTemp" DOUBLE PRECISION,
    "apparentTemp" DOUBLE PRECISION,
    "humidity" INTEGER,
    "windDir" TEXT,
    "windSpdKmh" INTEGER,
    "gustKmh" INTEGER,
    "rainTrace" TEXT,
    "cloud" TEXT,
    "pressure" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FireDanger" (
    "id" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "dangerToday" TEXT NOT NULL,
    "dangerTomorrow" TEXT NOT NULL,
    "fireBanToday" BOOLEAN NOT NULL,
    "fireBanTomorrow" BOOLEAN NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FireDanger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PowerReading" (
    "id" TEXT NOT NULL,
    "batterySoc" DOUBLE PRECISION NOT NULL,
    "batteryW" DOUBLE PRECISION NOT NULL,
    "solarW" DOUBLE PRECISION NOT NULL,
    "loadW" DOUBLE PRECISION NOT NULL,
    "gridW" DOUBLE PRECISION NOT NULL,
    "genStatus" INTEGER NOT NULL,
    "solarKwhToday" DOUBLE PRECISION NOT NULL,
    "loadKwhToday" DOUBLE PRECISION NOT NULL,
    "batteryInKwhToday" DOUBLE PRECISION NOT NULL,
    "batteryOutKwhToday" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'select.live',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PowerReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarlinkStatus" (
    "id" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL,
    "obstructionAvg" DOUBLE PRECISION,
    "uptimeSeconds" INTEGER,
    "downlinkThroughputBps" DOUBLE PRECISION,
    "uplinkThroughputBps" DOUBLE PRECISION,
    "latencyMs" DOUBLE PRECISION,
    "firmwareVersion" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StarlinkStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestockItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'general',
    "addedBy" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "isResolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RestockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "visitorName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "bringing" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartPlug" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'tapo',
    "deviceId" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "room" TEXT NOT NULL DEFAULT '',
    "isOn" BOOLEAN NOT NULL DEFAULT false,
    "powerW" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "automation" TEXT NOT NULL DEFAULT '{}',
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmartPlug_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SystemStatus_system_recordedAt_idx" ON "SystemStatus"("system", "recordedAt");

-- CreateIndex
CREATE INDEX "WeatherData_station_recordedAt_idx" ON "WeatherData"("station", "recordedAt");

-- CreateIndex
CREATE INDEX "PowerReading_recordedAt_idx" ON "PowerReading"("recordedAt");

-- CreateIndex
CREATE INDEX "StarlinkStatus_recordedAt_idx" ON "StarlinkStatus"("recordedAt");

-- CreateIndex
CREATE INDEX "ReminderLog_itemId_type_sentAt_idx" ON "ReminderLog"("itemId", "type", "sentAt");

-- CreateIndex
CREATE INDEX "RestockItem_isResolved_addedAt_idx" ON "RestockItem"("isResolved", "addedAt");

-- CreateIndex
CREATE INDEX "Visit_startDate_endDate_idx" ON "Visit"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "SmartPlug_type_deviceId_idx" ON "SmartPlug"("type", "deviceId");

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MaintenanceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
