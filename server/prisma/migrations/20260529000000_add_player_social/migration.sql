-- CreateTable
CREATE TABLE "favorite_dramas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "drama_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorite_dramas_drama_id_fkey" FOREIGN KEY ("drama_id") REFERENCES "dramas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "player_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'visible',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "player_comments_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "danmaku_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "trigger_position_ms" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'visible',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "danmaku_messages_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "favorite_dramas_user_id_drama_id_key" ON "favorite_dramas"("user_id", "drama_id");

-- CreateIndex
CREATE INDEX "favorite_dramas_user_id_created_at_idx" ON "favorite_dramas"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "player_comments_episode_id_created_at_idx" ON "player_comments"("episode_id", "created_at");

-- CreateIndex
CREATE INDEX "player_comments_user_id_created_at_idx" ON "player_comments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "danmaku_messages_episode_id_created_at_idx" ON "danmaku_messages"("episode_id", "created_at");

-- CreateIndex
CREATE INDEX "danmaku_messages_user_id_created_at_idx" ON "danmaku_messages"("user_id", "created_at");
