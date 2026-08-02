-- CreateTable
CREATE TABLE "MusicTag" (
    "id" INTEGER NOT NULL,
    "musicId" INTEGER NOT NULL,
    "musicTag" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,

    CONSTRAINT "MusicTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MusicTag_musicId_musicTag_key" ON "MusicTag"("musicId", "musicTag");
