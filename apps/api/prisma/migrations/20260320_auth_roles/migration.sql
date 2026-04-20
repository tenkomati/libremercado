-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'OPS', 'ADMIN');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '$2b$12$yua8rrfQhV4lM6fW74Q34ub8kY1MXL0nS8m1d6L8nS0v8f7o9y2p6',
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
