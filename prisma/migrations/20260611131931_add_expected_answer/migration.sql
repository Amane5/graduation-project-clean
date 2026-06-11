/*
  Warnings:

  - Made the column `expectedAnswer` on table `StoryQuestion` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "StoryQuestion" ALTER COLUMN "expectedAnswer" SET NOT NULL;
