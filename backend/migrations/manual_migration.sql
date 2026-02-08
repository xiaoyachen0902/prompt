-- Step 0: Check and remove foreign key if exists (MySQL doesn't have IF EXISTS for FK in older versions)
-- We'll drop the step_runs table's FK first, then recreate everything

-- Step 1: Drop foreign key constraint on step_runs.runId
ALTER TABLE `step_runs` DROP FOREIGN KEY `step_runs_runId_fkey`;

-- Step 2: Drop foreign key constraint on step_runs.stepId
ALTER TABLE `step_runs` DROP FOREIGN KEY `step_runs_stepId_fkey`;

-- Step 3: Drop the old unique constraint
ALTER TABLE `step_runs` DROP INDEX `step_runs_runId_stepId_key`;

-- Step 4: Add new unique constraint on (runId, orderIndex)
ALTER TABLE `step_runs` ADD UNIQUE KEY `step_runs_runId_orderIndex_key` (`runId`, `orderIndex`);

-- Step 5: Add index on stepId
ALTER TABLE `step_runs` ADD INDEX `step_runs_stepId_idx` (`stepId`);

-- Step 6: Re-add foreign keys
ALTER TABLE `step_runs` ADD CONSTRAINT `step_runs_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `Run`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `step_runs` ADD CONSTRAINT `step_runs_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `Step`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Create Dataset table
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

-- Step 8: Add columns to Run table (ignore errors if they exist)
ALTER TABLE `Run` ADD COLUMN `dataset_id` VARCHAR(191) NULL;
ALTER TABLE `Run` ADD COLUMN `case_index` INT NULL;

-- Step 9: Add index and FK for dataset_id (ignore if exists)
ALTER TABLE `Run` ADD INDEX `Run_dataset_id_idx` (`dataset_id`);
ALTER TABLE `Run` ADD CONSTRAINT `Run_dataset_id_fkey` FOREIGN KEY (`dataset_id`) REFERENCES `Dataset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
