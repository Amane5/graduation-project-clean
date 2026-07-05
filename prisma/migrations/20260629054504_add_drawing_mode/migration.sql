-- CreateEnum
CREATE TYPE "StorySource" AS ENUM ('PROMPT', 'DRAWING');

-- CreateEnum
CREATE TYPE "DrawingStoryStatus" AS ENUM ('INTERVIEWING', 'READY', 'GENERATING', 'COMPLETED');

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "conversationId" INTEGER,
ADD COLUMN     "drawingAnalysis" JSONB,
ADD COLUMN     "drawingImageUrl" TEXT,
ADD COLUMN     "source" "StorySource" NOT NULL DEFAULT 'PROMPT';

-- CreateTable
CREATE TABLE "DrawingStorySession" (
    "id" SERIAL NOT NULL,
    "status" "DrawingStoryStatus" NOT NULL DEFAULT 'INTERVIEWING',
    "conversationId" INTEGER NOT NULL,
    "childId" INTEGER NOT NULL,
    "drawingImageUrl" TEXT NOT NULL,
    "drawingAnalysis" JSONB NOT NULL,
    "interviewFinished" BOOLEAN NOT NULL DEFAULT false,
    "storyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawingStorySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DrawingStorySession_conversationId_key" ON "DrawingStorySession"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingStorySession_storyId_key" ON "DrawingStorySession"("storyId");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingStorySession" ADD CONSTRAINT "DrawingStorySession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingStorySession" ADD CONSTRAINT "DrawingStorySession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingStorySession" ADD CONSTRAINT "DrawingStorySession_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;
