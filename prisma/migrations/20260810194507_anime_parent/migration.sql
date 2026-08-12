-- AlterTable
ALTER TABLE "AnimeEntry" ADD COLUMN     "parentId" INTEGER;

-- AddForeignKey
ALTER TABLE "AnimeEntry" ADD CONSTRAINT "AnimeEntry_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AnimeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

