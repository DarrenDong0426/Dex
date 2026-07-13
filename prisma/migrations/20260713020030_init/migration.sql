/*
  Warnings:

  - Added the required column `level` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "level" INTEGER NOT NULL;
