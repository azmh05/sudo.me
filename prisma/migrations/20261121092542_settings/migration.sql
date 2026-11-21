-- AlterTable
ALTER TABLE `user` ADD COLUMN `idleLockMinutes` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(20) NOT NULL,
    `entity` VARCHAR(40) NOT NULL,
    `label` VARCHAR(160) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
