/*
  Warnings:

  - The `holi_regular` column on the `Holiday` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `holi_public` column on the `Holiday` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `_FoodToStore` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Holiday" DROP CONSTRAINT "Holiday_store_id_fkey";

-- DropForeignKey
ALTER TABLE "ReviewImage" DROP CONSTRAINT "ReviewImage_review_id_fkey";

-- DropForeignKey
ALTER TABLE "ReviewTranslateAR" DROP CONSTRAINT "ReviewTranslateAR_revi_id_fkey";

-- DropForeignKey
ALTER TABLE "ReviewTranslateEN" DROP CONSTRAINT "ReviewTranslateEN_revi_id_fkey";

-- DropForeignKey
ALTER TABLE "_FoodToStore" DROP CONSTRAINT "_FoodToStore_A_fkey";

-- DropForeignKey
ALTER TABLE "_FoodToStore" DROP CONSTRAINT "_FoodToStore_B_fkey";

-- AlterTable
ALTER TABLE "Food" ADD COLUMN     "foo_store_id" INTEGER,
ALTER COLUMN "foo_material" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Holiday" DROP COLUMN "holi_regular",
ADD COLUMN     "holi_regular" TEXT[],
DROP COLUMN "holi_public",
ADD COLUMN     "holi_public" TEXT[],
ALTER COLUMN "store_id" DROP NOT NULL;

-- DropTable
DROP TABLE "_FoodToStore";

-- CreateIndex
CREATE INDEX "FavoriteStore_user_id_idx" ON "FavoriteStore"("user_id");

-- CreateIndex
CREATE INDEX "FavoriteStore_sto_id_idx" ON "FavoriteStore"("sto_id");

-- CreateIndex
CREATE INDEX "Food_foo_sa_id_idx" ON "Food"("foo_sa_id");

-- CreateIndex
CREATE INDEX "Food_foo_store_id_idx" ON "Food"("foo_store_id");

-- CreateIndex
CREATE INDEX "Food_foo_sa_id_foo_store_id_idx" ON "Food"("foo_sa_id", "foo_store_id");

-- CreateIndex
CREATE INDEX "Review_user_id_idx" ON "Review"("user_id");

-- CreateIndex
CREATE INDEX "Review_store_id_idx" ON "Review"("store_id");

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_foo_store_id_fkey" FOREIGN KEY ("foo_store_id") REFERENCES "Store"("sto_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("sto_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewImage" ADD CONSTRAINT "ReviewImage_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("revi_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTranslateEN" ADD CONSTRAINT "ReviewTranslateEN_revi_id_fkey" FOREIGN KEY ("revi_id") REFERENCES "Review"("revi_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTranslateAR" ADD CONSTRAINT "ReviewTranslateAR_revi_id_fkey" FOREIGN KEY ("revi_id") REFERENCES "Review"("revi_id") ON DELETE CASCADE ON UPDATE CASCADE;
