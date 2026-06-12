-- AlterTable
ALTER TABLE `applications` ADD COLUMN `simulationAcceptedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `simulationAcceptedAt` DATETIME(3) NULL,
    ADD COLUMN `simulationApprovedAt` DATETIME(3) NULL,
    ADD COLUMN `simulationWorkSubmittedAt` DATETIME(3) NULL;
