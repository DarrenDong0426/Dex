-- CreateTable
CREATE TABLE "UserCharacter" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "characterRank" INTEGER NOT NULL,

    CONSTRAINT "UserCharacter_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserCharacter" ADD CONSTRAINT "UserCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
