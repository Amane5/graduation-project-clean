-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_conversationId_fkey";

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
