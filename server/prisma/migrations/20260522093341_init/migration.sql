-- CreateTable
CREATE TABLE "dramas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "cover_path" TEXT NOT NULL,
    "tags_json" TEXT NOT NULL DEFAULT '[]',
    "main_genre" TEXT NOT NULL DEFAULT '',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "drama_id" TEXT NOT NULL,
    "episode_no" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "video_path" TEXT NOT NULL DEFAULT '',
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL DEFAULT '',
    "is_final_episode" BOOLEAN NOT NULL DEFAULT false,
    "has_branch" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "episodes_drama_id_fkey" FOREIGN KEY ("drama_id") REFERENCES "dramas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "highlights" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episode_id" TEXT NOT NULL,
    "start_time_ms" INTEGER NOT NULL,
    "end_time_ms" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "intensity" INTEGER NOT NULL DEFAULT 3,
    "template_id" TEXT NOT NULL,
    "interaction_options_json" TEXT NOT NULL DEFAULT '[]',
    "visual_effect_type" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "highlights_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interaction_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "drama_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "highlight_id" TEXT NOT NULL,
    "interaction_type" TEXT NOT NULL,
    "option_text" TEXT NOT NULL DEFAULT '',
    "client_timestamp" INTEGER NOT NULL,
    "server_timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interaction_events_drama_id_fkey" FOREIGN KEY ("drama_id") REFERENCES "dramas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "interaction_events_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "interaction_events_highlight_id_fkey" FOREIGN KEY ("highlight_id") REFERENCES "highlights" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "highlight_stats" (
    "highlight_id" TEXT NOT NULL PRIMARY KEY,
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "unique_device_count" INTEGER NOT NULL DEFAULT 0,
    "heat_level" INTEGER NOT NULL DEFAULT 0,
    "top_option" TEXT NOT NULL DEFAULT '',
    "option_stats_json" TEXT NOT NULL DEFAULT '{}',
    "recent_texts_json" TEXT NOT NULL DEFAULT '[]',
    "last_event_at" DATETIME,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "highlight_stats_highlight_id_fkey" FOREIGN KEY ("highlight_id") REFERENCES "highlights" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "branch_options" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episode_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "result_type" TEXT NOT NULL DEFAULT 'video',
    "result_content_path" TEXT NOT NULL DEFAULT '',
    "cover_path" TEXT NOT NULL DEFAULT '',
    "sort_index" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "branch_options_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "branch_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "user_prompt" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result_title" TEXT NOT NULL DEFAULT '',
    "result_hook" TEXT NOT NULL DEFAULT '',
    "result_story" TEXT NOT NULL DEFAULT '',
    "storyboard_json" TEXT NOT NULL DEFAULT '[]',
    "result_tags_json" TEXT NOT NULL DEFAULT '[]',
    "result_interaction_options_json" TEXT NOT NULL DEFAULT '[]',
    "result_source" TEXT NOT NULL DEFAULT 'llm',
    "fail_reason" TEXT NOT NULL DEFAULT '',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" DATETIME,
    "finished_at" DATETIME,
    CONSTRAINT "branch_tasks_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "branch_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branch_task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'visible',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "branch_comments_branch_task_id_fkey" FOREIGN KEY ("branch_task_id") REFERENCES "branch_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "branch_likes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branch_task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "branch_likes_branch_task_id_fkey" FOREIGN KEY ("branch_task_id") REFERENCES "branch_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "watch_progresses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "drama_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "progress_ms" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "watch_progresses_drama_id_fkey" FOREIGN KEY ("drama_id") REFERENCES "dramas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "watch_progresses_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "dramas_title_key" ON "dramas"("title");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_drama_id_episode_no_key" ON "episodes"("drama_id", "episode_no");

-- CreateIndex
CREATE INDEX "highlights_episode_id_start_time_ms_idx" ON "highlights"("episode_id", "start_time_ms");

-- CreateIndex
CREATE INDEX "interaction_events_highlight_id_server_timestamp_idx" ON "interaction_events"("highlight_id", "server_timestamp");

-- CreateIndex
CREATE INDEX "interaction_events_device_id_highlight_id_idx" ON "interaction_events"("device_id", "highlight_id");

-- CreateIndex
CREATE INDEX "branch_options_episode_id_sort_index_idx" ON "branch_options"("episode_id", "sort_index");

-- CreateIndex
CREATE INDEX "branch_tasks_episode_id_created_at_idx" ON "branch_tasks"("episode_id", "created_at");

-- CreateIndex
CREATE INDEX "branch_comments_branch_task_id_created_at_idx" ON "branch_comments"("branch_task_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "branch_likes_branch_task_id_user_id_key" ON "branch_likes"("branch_task_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "watch_progresses_user_id_drama_id_key" ON "watch_progresses"("user_id", "drama_id");
