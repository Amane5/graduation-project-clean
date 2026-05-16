-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenBalance" INTEGER NOT NULL DEFAULT 100000,
ADD COLUMN     "usedTokens" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TokenUsage" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER NOT NULL,
    "childId" INTEGER NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenUsage_pkey" PRIMARY KEY ("id")
);
