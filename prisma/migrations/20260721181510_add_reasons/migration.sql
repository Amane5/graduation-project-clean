-- AlterTable
ALTER TABLE "ChildDailyReport" ADD COLUMN     "analyticalExplanation" TEXT,
ADD COLUMN     "creativityExplanation" TEXT,
ADD COLUMN     "curiosityExplanation" TEXT;

-- AlterTable
ALTER TABLE "QuestionAnalytics" ADD COLUMN     "analyticalReason" TEXT,
ADD COLUMN     "creativityReason" TEXT,
ADD COLUMN     "curiosityReason" TEXT;
