-- CreateTable
CREATE TABLE "GuaranteeDay" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "barberId" TEXT NOT NULL,

    CONSTRAINT "GuaranteeDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuaranteeDay_barberId_date_key" ON "GuaranteeDay"("barberId", "date");

-- AddForeignKey
ALTER TABLE "GuaranteeDay" ADD CONSTRAINT "GuaranteeDay_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
