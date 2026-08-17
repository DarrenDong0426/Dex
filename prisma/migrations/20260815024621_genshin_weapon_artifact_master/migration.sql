-- CreateTable
CREATE TABLE "GenshinWeaponMaster" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL,
    "weaponType" TEXT NOT NULL,
    "goodKey" TEXT,

    CONSTRAINT "GenshinWeaponMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenshinArtifactSetMaster" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL,
    "twoPiece" TEXT NOT NULL,
    "fourPiece" TEXT NOT NULL,
    "goodKey" TEXT,

    CONSTRAINT "GenshinArtifactSetMaster_pkey" PRIMARY KEY ("id")
);
