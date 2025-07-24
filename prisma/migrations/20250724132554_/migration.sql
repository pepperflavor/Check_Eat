/*
  Warnings:

  - You are about to drop the `_ReviewToStore` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `store_id` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_ReviewToStore" DROP CONSTRAINT "_ReviewToStore_A_fkey";

-- DropForeignKey
ALTER TABLE "_ReviewToStore" DROP CONSTRAINT "_ReviewToStore_B_fkey";

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "store_id" INTEGER NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "_ReviewToStore";

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("sto_id") ON DELETE RESTRICT ON UPDATE CASCADE;
