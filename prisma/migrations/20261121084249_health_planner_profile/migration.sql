-- CreateTable
CREATE TABLE `HealthCheckup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `intervalValue` INTEGER NOT NULL DEFAULT 6,
    `intervalUnit` ENUM('DAY', 'WEEK', 'MONTH', 'YEAR') NOT NULL DEFAULT 'MONTH',
    `bookLeadDays` INTEGER NOT NULL DEFAULT 21,
    `lastDoneDate` DATE NULL,
    `nextDueDate` DATE NULL,
    `place` VARCHAR(120) NULL,
    `note` VARCHAR(255) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HealthAppointment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(100) NOT NULL,
    `checkupId` INTEGER NULL,
    `date` DATE NOT NULL,
    `time` VARCHAR(5) NULL,
    `place` VARCHAR(120) NULL,
    `bookedVia` ENUM('MYSEJAHTERA', 'PHONE', 'WALK_IN', 'ONLINE', 'OTHER') NULL,
    `reference` VARCHAR(60) NULL,
    `note` VARCHAR(500) NULL,
    `status` ENUM('BOOKED', 'DONE') NOT NULL DEFAULT 'BOOKED',
    `outcome` TEXT NULL,
    `cost` INTEGER NULL,
    `transactionId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HealthAppointment_transactionId_key`(`transactionId`),
    INDEX `HealthAppointment_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HealthProfile` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `bloodType` VARCHAR(5) NULL,
    `allergies` VARCHAR(500) NULL,
    `medications` VARCHAR(500) NULL,
    `conditions` VARCHAR(500) NULL,
    `emergencyName` VARCHAR(80) NULL,
    `emergencyPhone` VARCHAR(30) NULL,
    `emergencyRelation` VARCHAR(40) NULL,
    `note` VARCHAR(500) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Task` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(160) NOT NULL,
    `dueDate` DATE NULL,
    `dueTime` VARCHAR(5) NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH') NOT NULL DEFAULT 'NORMAL',
    `done` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `note` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Task_done_dueDate_idx`(`done`, `dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlannerEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(160) NOT NULL,
    `date` DATE NOT NULL,
    `startTime` VARCHAR(5) NULL,
    `endTime` VARCHAR(5) NULL,
    `location` VARCHAR(160) NULL,
    `note` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlannerEvent_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JournalEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `content` MEDIUMTEXT NOT NULL,
    `mood` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `JournalEntry_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileInfo` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `fullName` VARCHAR(120) NULL,
    `preferredName` VARCHAR(60) NULL,
    `dateOfBirth` DATE NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(120) NULL,
    `address` VARCHAR(300) NULL,
    `about` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` ENUM('EDUCATION', 'WORK', 'SKILL', 'CERTIFICATION', 'ACHIEVEMENT') NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `organisation` VARCHAR(160) NULL,
    `detail` VARCHAR(120) NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `current` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProfileEntry_kind_idx`(`kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HealthAppointment` ADD CONSTRAINT `HealthAppointment_checkupId_fkey` FOREIGN KEY (`checkupId`) REFERENCES `HealthCheckup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HealthAppointment` ADD CONSTRAINT `HealthAppointment_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
