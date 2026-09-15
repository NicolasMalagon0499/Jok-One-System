-- CreateEnum
CREATE TYPE "ProductUseType" AS ENUM ('SOLD', 'USED');

-- AlterTable
ALTER TABLE "ServiceProduct" ADD COLUMN     "type" "ProductUseType" NOT NULL DEFAULT 'SOLD';
