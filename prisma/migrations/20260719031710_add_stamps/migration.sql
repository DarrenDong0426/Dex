-- CreateTable
CREATE TABLE "Stamp" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "assetbundleName" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "gameCharacterUnitId" INTEGER NOT NULL,

    CONSTRAINT "Stamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStamp" (
    "id" SERIAL NOT NULL,
    "stampId" INTEGER NOT NULL,

    CONSTRAINT "UserStamp_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserStamp" ADD CONSTRAINT "UserStamp_stampId_fkey" FOREIGN KEY ("stampId") REFERENCES "Stamp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
