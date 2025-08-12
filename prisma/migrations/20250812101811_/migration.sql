/*
  Warnings:

  - You are about to drop the column `sajang_id` on the `IdentityVerification` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "IdentityVerification" DROP CONSTRAINT "IdentityVerification_sajang_id_fkey";

-- DropIndex
DROP INDEX "IdentityVerification_sajang_id_key";

-- AlterTable
ALTER TABLE "IdentityVerification" DROP COLUMN "sajang_id";

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "sto_bs_id" INTEGER;

-- CreateTable
CREATE TABLE "BusinessCerti" (
    "bs_id" SERIAL NOT NULL,
    "bs_no" TEXT NOT NULL,
    "bs_name" TEXT NOT NULL,
    "bs_type" TEXT NOT NULL,
    "bs_address" TEXT NOT NULL,
    "bs_sa_id" INTEGER NOT NULL,

    CONSTRAINT "BusinessCerti_pkey" PRIMARY KEY ("bs_id")
);

-- CreateIndex
CREATE INDEX "Store_sto_bs_id_idx" ON "Store"("sto_bs_id");

-- AddForeignKey
ALTER TABLE "BusinessCerti" ADD CONSTRAINT "BusinessCerti_bs_sa_id_fkey" FOREIGN KEY ("bs_sa_id") REFERENCES "Sajang"("sa_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_sto_bs_id_fkey" FOREIGN KEY ("sto_bs_id") REFERENCES "BusinessCerti"("bs_id") ON DELETE SET NULL ON UPDATE CASCADE;
