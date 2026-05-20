-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "parentId" INTEGER;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "tokenBalance" SET DEFAULT 100000;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
