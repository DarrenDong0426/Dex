/*
  Warnings:

  - You are about to drop the column `level` on the `Profile` table. All the data in the column will be lost.
  - Added the required column `rank` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "level",
ADD COLUMN     "rank" INTEGER NOT NULL;
