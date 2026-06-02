-- AlterTable
ALTER TABLE "branch_tasks" ADD COLUMN "branch_type" TEXT NOT NULL DEFAULT '';
ALTER TABLE "branch_tasks" ADD COLUMN "pipeline_stage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "branch_tasks" ADD COLUMN "prompt_package_json" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "branch_tasks" ADD COLUMN "story_expansion_json" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "branch_tasks" ADD COLUMN "shot_prompt_json" TEXT NOT NULL DEFAULT '[]';
