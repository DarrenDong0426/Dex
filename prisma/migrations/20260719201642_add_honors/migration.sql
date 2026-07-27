-- CreateTable
CREATE TABLE "Honor" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "assetbundleName" TEXT NOT NULL,
    "honorRarity" TEXT NOT NULL,

    CONSTRAINT "Honor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserHonor" (
    "id" SERIAL NOT NULL,
    "honorId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "UserHonor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserHonor" ADD CONSTRAINT "UserHonor_honorId_fkey" FOREIGN KEY ("honorId") REFERENCES "Honor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
