-- AlterTable
ALTER TABLE `profileinfo` ADD COLUMN `photoId` INTEGER NULL;

-- CreateTable
CREATE TABLE `ProfilePhoto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mimeType` VARCHAR(50) NOT NULL,
    `size` INTEGER NOT NULL,
    `storageName` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProfilePhoto_storageName_key`(`storageName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
