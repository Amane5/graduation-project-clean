-- DropForeignKey
ALTER TABLE "ChallengeAnswer" DROP CONSTRAINT "ChallengeAnswer_challengeId_fkey";

-- AddForeignKey
ALTER TABLE "ChallengeAnswer" ADD CONSTRAINT "ChallengeAnswer_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
