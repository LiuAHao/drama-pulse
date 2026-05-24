-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_highlights" (
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
    "reason" TEXT NOT NULL DEFAULT '',
    "supporting_segment_ids_json" TEXT NOT NULL DEFAULT '[]',
    "speaker_guess" TEXT NOT NULL DEFAULT '',
    "target_character_guess" TEXT NOT NULL DEFAULT '',
    "mentioned_characters_json" TEXT NOT NULL DEFAULT '[]',
    "character_guess_confidence" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "highlights_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_highlights" ("confidence", "created_at", "description", "end_time_ms", "episode_id", "id", "intensity", "interaction_options_json", "source", "start_time_ms", "status", "template_id", "title", "type", "updated_at", "visual_effect_type") SELECT "confidence", "created_at", "description", "end_time_ms", "episode_id", "id", "intensity", "interaction_options_json", "source", "start_time_ms", "status", "template_id", "title", "type", "updated_at", "visual_effect_type" FROM "highlights";
DROP TABLE "highlights";
ALTER TABLE "new_highlights" RENAME TO "highlights";
CREATE INDEX "highlights_episode_id_start_time_ms_idx" ON "highlights"("episode_id", "start_time_ms");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
