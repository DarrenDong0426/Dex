-- CreateTable
CREATE TABLE "SiteProfile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "displayName" TEXT NOT NULL DEFAULT 'ITAMI',
    "alias" TEXT NOT NULL DEFAULT 'NONAME',
    "avatarUrl" TEXT NOT NULL DEFAULT '/pfp.png',
    "bio" TEXT NOT NULL DEFAULT '',
    "instagramLabel" TEXT NOT NULL DEFAULT '',
    "instagramUrl" TEXT NOT NULL DEFAULT '',
    "discordLabel" TEXT NOT NULL DEFAULT '',
    "discordUrl" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteProfile_pkey" PRIMARY KEY ("id")
);

