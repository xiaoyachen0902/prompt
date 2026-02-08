-- 若已执行过可跳过。推荐直接用: npx prisma db push 同步 schema。
-- Add model config fields to Step table (Prisma 默认表名为 Step)
ALTER TABLE `Step` ADD COLUMN `model` VARCHAR(191) NULL DEFAULT 'gpt-4o-mini';
ALTER TABLE `Step` ADD COLUMN `temperature` DOUBLE NULL DEFAULT 0.7;
ALTER TABLE `Step` ADD COLUMN `max_tokens` INT NULL;
ALTER TABLE `Step` ADD COLUMN `config` TEXT NULL;

-- Add runtime config fields to StepRun table
ALTER TABLE `step_runs` ADD COLUMN `model` VARCHAR(191) NULL;
ALTER TABLE `step_runs` ADD COLUMN `temperature` DOUBLE NULL;
ALTER TABLE `step_runs` ADD COLUMN `max_tokens` INT NULL;
