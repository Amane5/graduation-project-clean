-- CreateTable
CREATE TABLE "StoryEditMessage" (
    "id" SERIAL NOT NULL,
    "storyId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryEditMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StoryEditMessage" ADD CONSTRAINT "StoryEditMessage_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
