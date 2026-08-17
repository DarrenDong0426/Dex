-- CreateTable
CREATE TABLE "GenshinArtifactItem" (
    "id" SERIAL NOT NULL,
    "setId" INTEGER NOT NULL,
    "slotKey" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "rarity" INTEGER NOT NULL,
    "lock" BOOLEAN NOT NULL,
    "location" TEXT,
    "mainStatKey" TEXT NOT NULL,
    "substats" JSONB NOT NULL,

    CONSTRAINT "GenshinArtifactItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenshinWeaponItem" (
    "id" SERIAL NOT NULL,
    "weaponId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "ascension" INTEGER NOT NULL,
    "refinement" INTEGER NOT NULL,
    "lock" BOOLEAN NOT NULL,
    "location" TEXT,

    CONSTRAINT "GenshinWeaponItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GenshinArtifactSetMaster_goodKey_key" ON "GenshinArtifactSetMaster"("goodKey");

-- CreateIndex
CREATE UNIQUE INDEX "GenshinWeaponMaster_goodKey_key" ON "GenshinWeaponMaster"("goodKey");

-- AddForeignKey
ALTER TABLE "GenshinArtifactItem" ADD CONSTRAINT "GenshinArtifactItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "GenshinArtifactSetMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenshinWeaponItem" ADD CONSTRAINT "GenshinWeaponItem_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "GenshinWeaponMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
