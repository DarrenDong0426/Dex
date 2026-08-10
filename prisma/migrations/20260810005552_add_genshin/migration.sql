-- CreateTable
CREATE TABLE "GenshinCharacter" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "constellation" INTEGER NOT NULL,
    "friendship" INTEGER NOT NULL,
    "normalAttackLvl" INTEGER NOT NULL,
    "elementalSkillLvl" INTEGER NOT NULL,
    "elementalBurstLvl" INTEGER NOT NULL,
    "weaponId" INTEGER NOT NULL,
    "weaponName" TEXT NOT NULL,
    "weaponIcon" TEXT NOT NULL,
    "weaponRarity" INTEGER NOT NULL,
    "weaponLevel" INTEGER NOT NULL,
    "weaponRefinement" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenshinCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenshinArtifact" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "mainStatName" TEXT NOT NULL,
    "mainStatValue" TEXT NOT NULL,
    "substats" JSONB NOT NULL,

    CONSTRAINT "GenshinArtifact_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GenshinArtifact" ADD CONSTRAINT "GenshinArtifact_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "GenshinCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

