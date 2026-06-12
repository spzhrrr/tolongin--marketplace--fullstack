-- AlterTable
ALTER TABLE `applications` ADD COLUMN `simulationApplicationCreatedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `jobs` ADD COLUMN `simulationOrderCreatedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `services` ADD COLUMN `simulationOrderCreatedAt` DATETIME(3) NULL;
