-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "assetbundleName" TEXT NOT NULL,
    "bgmAssetbundleName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEvent" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
