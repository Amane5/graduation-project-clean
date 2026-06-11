/*
  Warnings:

  - Added the required column `expectedAnswer` to the `StoryQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StoryQuestion" ADD COLUMN     "expectedAnswer" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "StoryAnswerEvaluation" (
    "id" SERIAL NOT NULL,
    "answerId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryAnswerEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryReport" (
    "id" SERIAL NOT NULL,
    "storyId" INTEGER NOT NULL,
    "childId" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "goalAchievement" INTEGER NOT NULL,
    "strengths" TEXT[],
    "improvements" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryAnswerEvaluation_answerId_key" ON "StoryAnswerEvaluation"("answerId");

-- AddForeignKey
ALTER TABLE "StoryAnswerEvaluation" ADD CONSTRAINT "StoryAnswerEvaluation_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "StoryAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReport" ADD CONSTRAINT "StoryReport_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReport" ADD CONSTRAINT "StoryReport_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
