-- AlterTable
ALTER TABLE "GenshinCharacter" ADD COLUMN     "image" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "stats" JSONB NOT NULL DEFAULT '[]';

