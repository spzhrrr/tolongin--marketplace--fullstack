/*
  Warnings:

  - You are about to drop the column `simulationOrderCreatedAt` on the `jobs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `jobs` DROP COLUMN `simulationOrderCreatedAt`,
    ADD COLUMN `simulationApplicationCreatedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `jobId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `orders_jobId_idx` ON `orders`(`jobId`);
