-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('NEW', 'RETURNING');

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "clientType" "ClientType" NOT NULL DEFAULT 'RETURNING';
