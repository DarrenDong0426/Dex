-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
