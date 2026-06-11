-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "journeyData" JSONB,
ADD COLUMN     "responseMode" TEXT NOT NULL DEFAULT 'normal';
