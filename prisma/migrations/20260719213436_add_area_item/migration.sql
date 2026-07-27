-- CreateTable
CREATE TABLE "AreaItem" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "areaId" INTEGER NOT NULL,
    "assetbundleName" TEXT NOT NULL,

    CONSTRAINT "AreaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAreaItem" (
    "id" SERIAL NOT NULL,
    "areaItemId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "UserAreaItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserAreaItem" ADD CONSTRAINT "UserAreaItem_areaItemId_fkey" FOREIGN KEY ("areaItemId") REFERENCES "AreaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
