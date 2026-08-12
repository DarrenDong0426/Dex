-- CreateTable
CREATE TABLE "AnimeEntry" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "synopsis" TEXT,
    "url" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimeEntry_pkey" PRIMARY KEY ("id")
);

