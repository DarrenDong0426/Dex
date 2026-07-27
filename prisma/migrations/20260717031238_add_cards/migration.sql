-- CreateTable
CREATE TABLE "Card" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCard" (
    "id" SERIAL NOT NULL,
    "cardId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "masterRank" INTEGER NOT NULL,
    "skillLevel" INTEGER NOT NULL,
    "specialTraining" BOOLEAN NOT NULL,

    CONSTRAINT "UserCard_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserCard" ADD CONSTRAINT "UserCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
