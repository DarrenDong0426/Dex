-- CreateTable
CREATE TABLE "Music" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "assetbundleName" TEXT NOT NULL,

    CONSTRAINT "Music_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMusicResult" (
    "id" SERIAL NOT NULL,
    "musicId" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "playType" TEXT NOT NULL,
    "playResult" TEXT NOT NULL,

    CONSTRAINT "UserMusicResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMusicResult_musicId_difficulty_playType_key" ON "UserMusicResult"("musicId", "difficulty", "playType");

-- AddForeignKey
ALTER TABLE "UserMusicResult" ADD CONSTRAINT "UserMusicResult_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
