-- AlterTable
ALTER TABLE `plannerevent` ADD COLUMN `remindMinutes` INTEGER NULL;

-- AlterTable
ALTER TABLE `task` ADD COLUMN `remindMinutes` INTEGER NULL;

-- CreateTable
CREATE TABLE `PushSubscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `endpoint` VARCHAR(600) NOT NULL,
    `p256dh` VARCHAR(200) NOT NULL,
    `auth` VARCHAR(100) NOT NULL,
    `device` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSentAt` DATETIME(3) NULL,

    UNIQUE INDEX `PushSubscription_endpoint_key`(`endpoint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppSetting` (
    `key` VARCHAR(60) NOT NULL,
    `value` TEXT NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationPrefs` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `bills` BOOLEAN NOT NULL DEFAULT true,
    `upkeep` BOOLEAN NOT NULL DEFAULT true,
    `documents` BOOLEAN NOT NULL DEFAULT true,
    `health` BOOLEAN NOT NULL DEFAULT true,
    `planner` BOOLEAN NOT NULL DEFAULT true,
    `dailySummary` BOOLEAN NOT NULL DEFAULT true,
    `summaryTime` VARCHAR(5) NOT NULL DEFAULT '08:00',
    `overdueTasks` BOOLEAN NOT NULL DEFAULT true,
    `loginAlerts` BOOLEAN NOT NULL DEFAULT true,
    `showDetails` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationSent` (
    `key` VARCHAR(120) NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NotificationSent_sentAt_idx`(`sentAt`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
