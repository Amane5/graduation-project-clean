/*
  Warnings:

  - You are about to drop the column `childId` on the `Question` table. All the data in the column will be lost.
  - Made the column `userId` on table `Conversation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "childId";
