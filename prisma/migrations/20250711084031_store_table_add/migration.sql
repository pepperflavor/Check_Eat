/*
  Warnings:

  - You are about to drop the column `sto_sajang_id` on the `Store` table. All the data in the column will be lost.
  - Added the required column `revi_reco_step` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sto_sa_id` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Store" DROP CONSTRAINT "Store_sto_sajang_id_fkey";

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "revi_reco_step" INTEGER NOT NULL,
ALTER COLUMN "revi_content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Store" DROP COLUMN "sto_sajang_id",
ADD COLUMN     "sto_sa_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "_ReviewFoods" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ReviewFoods_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ReviewFoods_B_index" ON "_ReviewFoods"("B");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_sto_sa_id_fkey" FOREIGN KEY ("sto_sa_id") REFERENCES "Sajang"("sa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReviewFoods" ADD CONSTRAINT "_ReviewFoods_A_fkey" FOREIGN KEY ("A") REFERENCES "Food"("foo_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReviewFoods" ADD CONSTRAINT "_ReviewFoods_B_fkey" FOREIGN KEY ("B") REFERENCES "Review"("revi_id") ON DELETE CASCADE ON UPDATE CASCADE;
