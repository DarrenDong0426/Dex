-- CreateTable
CREATE TABLE "ClashRoyaleCard" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "maxLevel" INTEGER NOT NULL,
    "starLevel" INTEGER,
    "evolutionLevel" INTEGER,
    "maxEvolutionLevel" INTEGER,
    "rarity" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "elixirCost" INTEGER,
    "isSupport" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClashRoyaleCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrawlStarsBrawler" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "power" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "trophies" INTEGER NOT NULL,
    "highestTrophies" INTEGER NOT NULL,
    "gadgets" JSONB NOT NULL DEFAULT '[]',
    "starPowers" JSONB NOT NULL DEFAULT '[]',
    "gears" JSONB NOT NULL DEFAULT '[]',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrawlStarsBrawler_pkey" PRIMARY KEY ("id")
);
