-- CreateTable
CREATE TABLE "GenshinCharacterMaster" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,

    CONSTRAINT "GenshinCharacterMaster_pkey" PRIMARY KEY ("id")
);

