-- DropForeignKey
ALTER TABLE "StoryScene" DROP CONSTRAINT "StoryScene_storyId_fkey";

-- AddForeignKey
ALTER TABLE "StoryScene" ADD CONSTRAINT "StoryScene_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
