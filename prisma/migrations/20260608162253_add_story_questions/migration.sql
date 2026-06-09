-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "questionsApproved" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StoryQuestion" (
    "id" SERIAL NOT NULL,
    "storyId" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryAnswer" (
    "id" SERIAL NOT NULL,
    "storyId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "childId" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryAnswer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StoryQuestion" ADD CONSTRAINT "StoryQuestion_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAnswer" ADD CONSTRAINT "StoryAnswer_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAnswer" ADD CONSTRAINT "StoryAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "StoryQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAnswer" ADD CONSTRAINT "StoryAnswer_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
