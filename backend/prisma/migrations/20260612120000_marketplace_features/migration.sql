-- Migration: fitur marketplace (work submission terstruktur, dual review,
-- urgency job, auto-resolve dispute, portfolio, dan user badge).
-- Dibuat manual karena environment tidak selalu memiliki MySQL aktif.

-- ====== JOB: kolom urgency ======
ALTER TABLE `jobs`
  ADD COLUMN `urgency` VARCHAR(191) NOT NULL DEFAULT 'NORMAL';

-- ====== ORDER: work submission terstruktur ======
ALTER TABLE `orders`
  ADD COLUMN `workSubmissionNote` VARCHAR(191) NULL,
  ADD COLUMN `workSubmissionFiles` VARCHAR(191) NOT NULL DEFAULT '[]',
  ADD COLUMN `workSubmissionDate` DATETIME(3) NULL,
  ADD COLUMN `workSubmissionStatus` ENUM('PENDING', 'APPROVED', 'REVISION_REQUESTED', 'DISPUTED') NULL;

-- ====== REVIEW: arah review (dual review) ======
ALTER TABLE `reviews`
  ADD COLUMN `reviewType` ENUM('BUYER_TO_SELLER', 'SELLER_TO_BUYER') NOT NULL DEFAULT 'BUYER_TO_SELLER';

-- Satu reviewer hanya boleh memberi satu review per order
CREATE UNIQUE INDEX `reviews_orderId_reviewerId_key` ON `reviews`(`orderId`, `reviewerId`);

-- ====== DISPUTE: jadwal auto-resolve ======
ALTER TABLE `disputes`
  ADD COLUMN `autoResolveAt` DATETIME(3) NULL;

-- ====== PORTFOLIO ======
CREATE TABLE `portfolios` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `imageUrl` VARCHAR(191) NULL,
  `projectUrl` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `portfolios_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `portfolios`
  ADD CONSTRAINT `portfolios_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ====== USER BADGE ======
CREATE TABLE `user_badges` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `badgeType` ENUM('TOP_RATED', 'FAST_DELIVERY', 'VERIFIED_PRO', 'RISING_TALENT', 'TRUSTED_BUYER', 'TOP_SELLER') NOT NULL,
  `earnedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `user_badges_userId_idx`(`userId`),
  UNIQUE INDEX `user_badges_userId_badgeType_key`(`userId`, `badgeType`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_badges`
  ADD CONSTRAINT `user_badges_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
