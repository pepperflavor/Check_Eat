/*
  Warnings:

  - You are about to drop the column `sa_halal` on the `Sajang` table. All the data in the column will be lost.
  - You are about to drop the column `sa_type` on the `Sajang` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Holiday" DROP CONSTRAINT "Holiday_holi_sajang_id_fkey";

-- AlterTable
ALTER TABLE "Sajang" DROP COLUMN "sa_halal",
DROP COLUMN "sa_type";

-- CreateTable
CREATE TABLE "Store" (
    "sto_id" SERIAL NOT NULL,
    "sto_name" TEXT NOT NULL,
    "sto_img" TEXT,
    "sto_halal" INTEGER NOT NULL DEFAULT 0,
    "sto_type" TEXT,
    "sto_sajang_id" INTEGER NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("sto_id")
);

-- CreateTable
CREATE TABLE "_FoodToStore" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FoodToStore_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_HolidayToStore" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_HolidayToStore_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ReviewToStore" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ReviewToStore_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_FoodToStore_B_index" ON "_FoodToStore"("B");

-- CreateIndex
CREATE INDEX "_HolidayToStore_B_index" ON "_HolidayToStore"("B");

-- CreateIndex
CREATE INDEX "_ReviewToStore_B_index" ON "_ReviewToStore"("B");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_sto_sajang_id_fkey" FOREIGN KEY ("sto_sajang_id") REFERENCES "Sajang"("sa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodToStore" ADD CONSTRAINT "_FoodToStore_A_fkey" FOREIGN KEY ("A") REFERENCES "Food"("foo_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodToStore" ADD CONSTRAINT "_FoodToStore_B_fkey" FOREIGN KEY ("B") REFERENCES "Store"("sto_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HolidayToStore" ADD CONSTRAINT "_HolidayToStore_A_fkey" FOREIGN KEY ("A") REFERENCES "Holiday"("holi_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HolidayToStore" ADD CONSTRAINT "_HolidayToStore_B_fkey" FOREIGN KEY ("B") REFERENCES "Store"("sto_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReviewToStore" ADD CONSTRAINT "_ReviewToStore_A_fkey" FOREIGN KEY ("A") REFERENCES "Review"("revi_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReviewToStore" ADD CONSTRAINT "_ReviewToStore_B_fkey" FOREIGN KEY ("B") REFERENCES "Store"("sto_id") ON DELETE CASCADE ON UPDATE CASCADE;
