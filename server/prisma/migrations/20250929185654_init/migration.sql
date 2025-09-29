-- CreateTable
CREATE TABLE "public"."jobs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "originalName" TEXT,
    "preset" TEXT,
    "fileType" TEXT,
    "inputSize" INTEGER,
    "outputSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "downloadUrl" TEXT,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."metrics" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "successfulJobs" INTEGER NOT NULL DEFAULT 0,
    "failedJobs" INTEGER NOT NULL DEFAULT 0,
    "totalProcessingMs" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);
