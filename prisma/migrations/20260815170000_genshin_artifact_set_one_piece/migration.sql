-- AlterTable
ALTER TABLE "GenshinArtifactSetMaster" ADD COLUMN     "onePiece" TEXT,
ALTER COLUMN "twoPiece" DROP NOT NULL,
ALTER COLUMN "fourPiece" DROP NOT NULL;
