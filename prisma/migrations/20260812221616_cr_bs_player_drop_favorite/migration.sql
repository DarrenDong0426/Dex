-- AlterTable
ALTER TABLE "BrawlStarsBrawler" DROP COLUMN "isFavorite";

-- AlterTable
ALTER TABLE "ClashRoyaleCard" DROP COLUMN "isFavorite";

-- CreateTable
CREATE TABLE "ClashRoyalePlayer" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "expLevel" INTEGER NOT NULL,
    "trophies" INTEGER NOT NULL,
    "bestTrophies" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "battleCount" INTEGER NOT NULL,
    "clanName" TEXT,
    "arenaName" TEXT,
    "favoriteCardIconUrl" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClashRoyalePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrawlStarsPlayer" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "expLevel" INTEGER NOT NULL,
    "trophies" INTEGER NOT NULL,
    "highestTrophies" INTEGER NOT NULL,
    "victories3v3" INTEGER NOT NULL,
    "soloVictories" INTEGER NOT NULL,
    "duoVictories" INTEGER NOT NULL,
    "clubName" TEXT,
    "iconId" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrawlStarsPlayer_pkey" PRIMARY KEY ("id")
);
