-- Create Dataset table
CREATE TABLE IF NOT EXISTS `Dataset` (
  `id` VARCHAR(191) NOT NULL,
  `agentId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `cases` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Dataset_agentId_idx` (`agentId`),
  CONSTRAINT `Dataset_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `Agent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add columns to Run table
ALTER TABLE `Run` ADD COLUMN `dataset_id` VARCHAR(191) NULL;
ALTER TABLE `Run` ADD COLUMN `case_index` INT NULL;

-- Add index and FK for dataset_id
ALTER TABLE `Run` ADD INDEX `Run_dataset_id_idx` (`dataset_id`);
ALTER TABLE `Run` ADD CONSTRAINT `Run_dataset_id_fkey` FOREIGN KEY (`dataset_id`) REFERENCES `Dataset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
