-- CreateTable
CREATE TABLE "BondHonor" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "bondsGroupId" INTEGER NOT NULL,
    "characterId1" INTEGER NOT NULL,
    "characterId2" INTEGER NOT NULL,
    "honorRarity" TEXT NOT NULL,

    CONSTRAINT "BondHonor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBondHonors" (
    "id" SERIAL NOT NULL,
    "bondHonorId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "UserBondHonors_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserBondHonors" ADD CONSTRAINT "UserBondHonors_bondHonorId_fkey" FOREIGN KEY ("bondHonorId") REFERENCES "BondHonor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
