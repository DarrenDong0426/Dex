-- CreateTable
CREATE TABLE "UserMusicFavorite" (
    "id" SERIAL NOT NULL,
    "musicId" INTEGER NOT NULL,

    CONSTRAINT "UserMusicFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMusicFavorite_musicId_key" ON "UserMusicFavorite"("musicId");

-- AddForeignKey
ALTER TABLE "UserMusicFavorite" ADD CONSTRAINT "UserMusicFavorite_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

