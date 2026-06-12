-- AlterTable
ALTER TABLE `activity_logs` MODIFY `metadata` TEXT NULL;

-- AlterTable
ALTER TABLE `applications` MODIFY `coverLetter` TEXT NOT NULL,
    MODIFY `portfolioIds` TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE `conversations` MODIFY `participants` TEXT NOT NULL,
    MODIFY `lastMessage` TEXT NULL;

-- AlterTable
ALTER TABLE `disputes` MODIFY `reason` TEXT NOT NULL,
    MODIFY `description` TEXT NOT NULL,
    MODIFY `evidence` TEXT NULL,
    MODIFY `resolution` TEXT NULL,
    MODIFY `messages` TEXT NULL;

-- AlterTable
ALTER TABLE `jobs` MODIFY `description` TEXT NOT NULL,
    MODIFY `skills` TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE `messages` MODIFY `content` TEXT NOT NULL,
    MODIFY `attachment` TEXT NULL;

-- AlterTable
ALTER TABLE `notifications` MODIFY `body` TEXT NOT NULL,
    MODIFY `data` TEXT NULL;

-- AlterTable
ALTER TABLE `orders` MODIFY `notes` TEXT NULL,
    MODIFY `deliveryAddress` TEXT NULL,
    MODIFY `cancellationReason` TEXT NULL,
    MODIFY `timeline` TEXT NOT NULL DEFAULT '[]',
    MODIFY `workProof` TEXT NULL,
    MODIFY `workNote` TEXT NULL,
    MODIFY `workSubmission` TEXT NULL,
    MODIFY `workRejectionReason` TEXT NULL,
    MODIFY `workSubmissionNote` TEXT NULL,
    MODIFY `workSubmissionFiles` TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE `platform_settings` MODIFY `value` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `portfolios` MODIFY `description` TEXT NULL,
    MODIFY `imageUrl` TEXT NULL,
    MODIFY `projectUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `reviews` MODIFY `comment` TEXT NOT NULL,
    MODIFY `images` TEXT NOT NULL DEFAULT '[]',
    MODIFY `reply` TEXT NULL;

-- AlterTable
ALTER TABLE `services` MODIFY `description` TEXT NOT NULL,
    MODIFY `images` TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE `users` MODIFY `ktpRejectedReason` TEXT NULL,
    MODIFY `bio` TEXT NULL,
    MODIFY `skills` TEXT NOT NULL DEFAULT '[]',
    MODIFY `bannedReason` TEXT NULL;
