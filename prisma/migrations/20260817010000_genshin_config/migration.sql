-- CreateTable
CREATE TABLE "GenshinConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "hoyolabCookie" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenshinConfig_pkey" PRIMARY KEY ("id")
);
