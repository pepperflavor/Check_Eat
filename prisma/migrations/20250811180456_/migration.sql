/*
  Warnings:

  - You are about to drop the `_HolidayToStore` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[store_id]` on the table `Holiday` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `store_id` to the `Holiday` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_HolidayToStore" DROP CONSTRAINT "_HolidayToStore_A_fkey";

-- DropForeignKey
ALTER TABLE "_HolidayToStore" DROP CONSTRAINT "_HolidayToStore_B_fkey";

-- AlterTable
ALTER TABLE "Holiday" ADD COLUMN     "store_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "_HolidayToStore";

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_store_id_key" ON "Holiday"("store_id");

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("sto_id") ON DELETE RESTRICT ON UPDATE CASCADE;
