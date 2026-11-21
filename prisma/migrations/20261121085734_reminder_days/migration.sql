-- AlterTable
ALTER TABLE `bill` ADD COLUMN `remindDays` INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE `maintenanceitem` ADD COLUMN `remindDays` INTEGER NOT NULL DEFAULT 7;
