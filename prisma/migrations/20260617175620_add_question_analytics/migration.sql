-- CreateTable
CREATE TABLE "QuestionAnalytics" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "category" TEXT,
    "subcategory" TEXT,
    "curiosityScore" INTEGER NOT NULL DEFAULT 0,
    "creativityScore" INTEGER NOT NULL DEFAULT 0,
    "analyticalScore" INTEGER NOT NULL DEFAULT 0,
    "emotionalSignal" TEXT,
    "skills" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildDailyReport" (
    "id" SERIAL NOT NULL,
    "childId" INTEGER NOT NULL,
    "topCategories" TEXT[],
    "topSubcategories" TEXT[],
    "curiosityAvg" DOUBLE PRECISION NOT NULL,
    "creativityAvg" DOUBLE PRECISION NOT NULL,
    "analyticalAvg" DOUBLE PRECISION NOT NULL,
    "emotionalSummary" TEXT,
    "insights" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildDailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAnalytics_questionId_key" ON "QuestionAnalytics"("questionId");

-- AddForeignKey
ALTER TABLE "QuestionAnalytics" ADD CONSTRAINT "QuestionAnalytics_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
