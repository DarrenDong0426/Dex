-- CreateTable
CREATE TABLE "UserChallengeStage" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "challengeLevel" INTEGER NOT NULL,

    CONSTRAINT "UserChallengeStage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserChallengeStage" ADD CONSTRAINT "UserChallengeStage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
