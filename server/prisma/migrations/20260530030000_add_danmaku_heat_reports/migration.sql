CREATE TABLE "danmaku_heat_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "trigger_position_ms" INTEGER NOT NULL,
    "sample_contents_json" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "danmaku_heat_reports_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "danmaku_heat_reports_episode_id_created_at_idx" ON "danmaku_heat_reports"("episode_id", "created_at");
CREATE INDEX "danmaku_heat_reports_status_created_at_idx" ON "danmaku_heat_reports"("status", "created_at");
