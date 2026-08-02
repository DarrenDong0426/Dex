-- CreateTable
CREATE TABLE "MusicDifficulty" (
    "id" INTEGER NOT NULL,
    "musicId" INTEGER NOT NULL,
    "musicDifficulty" TEXT NOT NULL,
    "playLevel" INTEGER NOT NULL,
    "totalNoteCount" INTEGER NOT NULL,

    CONSTRAINT "MusicDifficulty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MusicDifficulty_musicId_musicDifficulty_key" ON "MusicDifficulty"("musicId", "musicDifficulty");
