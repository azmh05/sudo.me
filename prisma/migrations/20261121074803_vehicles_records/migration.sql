-- CreateTable
CREATE TABLE `Vehicle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `plate` VARCHAR(20) NULL,
    `odometer` INTEGER NOT NULL DEFAULT 0,
    `odometerDate` DATE NULL,
    `note` VARCHAR(255) NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicleId` INTEGER NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `intervalKm` INTEGER NULL,
    `lastDoneKm` INTEGER NULL,
    `lastDoneDate` DATE NULL,
    `nextDueKm` INTEGER NULL,
    `note` VARCHAR(255) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VehicleItem_vehicleId_idx`(`vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleServiceLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemId` INTEGER NOT NULL,
    `doneDate` DATE NOT NULL,
    `odometer` INTEGER NOT NULL,
    `cost` INTEGER NULL,
    `note` VARCHAR(255) NULL,
    `transactionId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `VehicleServiceLog_transactionId_key`(`transactionId`),
    INDEX `VehicleServiceLog_itemId_doneDate_idx`(`itemId`, `doneDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PersonalRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(100) NOT NULL,
    `category` ENUM('IDENTITY', 'VEHICLE', 'INSURANCE', 'EDUCATION', 'FINANCE', 'WORK', 'HEALTH', 'PURCHASE', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `numberEnc` TEXT NULL,
    `numberLast4` VARCHAR(4) NULL,
    `issuer` VARCHAR(100) NULL,
    `issueDate` DATE NULL,
    `expiryDate` DATE NULL,
    `remindDays` INTEGER NOT NULL DEFAULT 30,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PersonalRecord_expiryDate_idx`(`expiryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecordFile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recordId` INTEGER NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(50) NOT NULL,
    `size` INTEGER NOT NULL,
    `storageName` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RecordFile_storageName_key`(`storageName`),
    INDEX `RecordFile_recordId_idx`(`recordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VehicleItem` ADD CONSTRAINT `VehicleItem_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleServiceLog` ADD CONSTRAINT `VehicleServiceLog_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `VehicleItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleServiceLog` ADD CONSTRAINT `VehicleServiceLog_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordFile` ADD CONSTRAINT `RecordFile_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `PersonalRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
