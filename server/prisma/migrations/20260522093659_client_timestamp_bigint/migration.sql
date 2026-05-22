/*
  Warnings:

  - You are about to alter the column `client_timestamp` on the `interaction_events` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_interaction_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "drama_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "highlight_id" TEXT NOT NULL,
    "interaction_type" TEXT NOT NULL,
    "option_text" TEXT NOT NULL DEFAULT '',
    "client_timestamp" BIGINT NOT NULL,
    "server_timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interaction_events_drama_id_fkey" FOREIGN KEY ("drama_id") REFERENCES "dramas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "interaction_events_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "interaction_events_highlight_id_fkey" FOREIGN KEY ("highlight_id") REFERENCES "highlights" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_interaction_events" ("client_timestamp", "device_id", "drama_id", "episode_id", "highlight_id", "id", "interaction_type", "option_text", "server_timestamp", "user_id") SELECT "client_timestamp", "device_id", "drama_id", "episode_id", "highlight_id", "id", "interaction_type", "option_text", "server_timestamp", "user_id" FROM "interaction_events";
DROP TABLE "interaction_events";
ALTER TABLE "new_interaction_events" RENAME TO "interaction_events";
CREATE INDEX "interaction_events_highlight_id_server_timestamp_idx" ON "interaction_events"("highlight_id", "server_timestamp");
CREATE INDEX "interaction_events_device_id_highlight_id_idx" ON "interaction_events"("device_id", "highlight_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
