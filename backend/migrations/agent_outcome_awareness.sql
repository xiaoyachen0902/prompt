-- Agent Outcome Awareness + Reflection + Branch
-- Step: stepType, decisionPrompt, onCompleteDefault, condition
-- StepRun: evaluation, nextAction, decisionOutput, nextStepIndex
-- Run once; if columns exist, comment out the lines that fail.

-- Step (Prisma default table name)
ALTER TABLE `Step` ADD COLUMN `step_type` VARCHAR(191) NULL DEFAULT 'action';
ALTER TABLE `Step` ADD COLUMN `decision_prompt` TEXT NULL;
ALTER TABLE `Step` ADD COLUMN `on_complete_default` VARCHAR(191) NULL DEFAULT 'continue';
ALTER TABLE `Step` ADD COLUMN `condition` JSON NULL;

-- step_runs
ALTER TABLE `step_runs` ADD COLUMN `evaluation` TEXT NULL;
ALTER TABLE `step_runs` ADD COLUMN `next_action` VARCHAR(191) NULL;
ALTER TABLE `step_runs` ADD COLUMN `decision_output` TEXT NULL;
ALTER TABLE `step_runs` ADD COLUMN `next_step_index` INT NULL;
