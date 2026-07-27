/*
  Warnings:

  - You are about to drop the column `playType` on the `UserMusicResult` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[musicId,difficulty]` on the table `UserMusicResult` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserMusicResult_musicId_difficulty_playType_key";

-- AlterTable
ALTER TABLE "UserMusicResult" DROP COLUMN "playType";

-- CreateIndex
CREATE UNIQUE INDEX "UserMusicResult_musicId_difficulty_key" ON "UserMusicResult"("musicId", "difficulty");
