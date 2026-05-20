/*
  Warnings:

  - You are about to drop the column `childId` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `Conversation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_childId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_parentId_fkey";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "childId",
DROP COLUMN "parentId",
ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
