/*
  Warnings:

  - You are about to drop the column `ft_id` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the `FoodTranslate` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[revi_id]` on the table `ReviewTranslateAR` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[revi_id]` on the table `ReviewTranslateEN` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `revi_id` to the `ReviewTranslateAR` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rt_ar_content` to the `ReviewTranslateAR` table without a default value. This is not possible if the table is not empty.
  - Added the required column `revi_id` to the `ReviewTranslateEN` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rt_content_en` to the `ReviewTranslateEN` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Food" DROP CONSTRAINT "Food_ft_id_fkey";

-- AlterTable
ALTER TABLE "Food" DROP COLUMN "ft_id";

-- AlterTable
ALTER TABLE "ReviewTranslateAR" ADD COLUMN     "revi_id" INTEGER NOT NULL,
ADD COLUMN     "rt_ar_content" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ReviewTranslateEN" ADD COLUMN     "revi_id" INTEGER NOT NULL,
ADD COLUMN     "rt_content_en" TEXT NOT NULL;

-- DropTable
DROP TABLE "FoodTranslate";

-- CreateTable
CREATE TABLE "FoodTranslateEN" (
    "ft_id" SERIAL NOT NULL,
    "ft_en_name" TEXT,
    "ft_en_mt" TEXT,
    "ft_en_price" TEXT,
    "food_id" INTEGER NOT NULL,

    CONSTRAINT "FoodTranslateEN_pkey" PRIMARY KEY ("ft_id")
);

-- CreateTable
CREATE TABLE "FoodTranslateAR" (
    "ft_ar_id" SERIAL NOT NULL,
    "ft_ar_mt" TEXT,
    "ft_ar_price" TEXT,
    "food_id" INTEGER NOT NULL,

    CONSTRAINT "FoodTranslateAR_pkey" PRIMARY KEY ("ft_ar_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodTranslateEN_food_id_key" ON "FoodTranslateEN"("food_id");

-- CreateIndex
CREATE UNIQUE INDEX "FoodTranslateAR_food_id_key" ON "FoodTranslateAR"("food_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewTranslateAR_revi_id_key" ON "ReviewTranslateAR"("revi_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewTranslateEN_revi_id_key" ON "ReviewTranslateEN"("revi_id");

-- AddForeignKey
ALTER TABLE "FoodTranslateEN" ADD CONSTRAINT "FoodTranslateEN_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "Food"("foo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodTranslateAR" ADD CONSTRAINT "FoodTranslateAR_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "Food"("foo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTranslateEN" ADD CONSTRAINT "ReviewTranslateEN_revi_id_fkey" FOREIGN KEY ("revi_id") REFERENCES "Review"("revi_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTranslateAR" ADD CONSTRAINT "ReviewTranslateAR_revi_id_fkey" FOREIGN KEY ("revi_id") REFERENCES "Review"("revi_id") ON DELETE RESTRICT ON UPDATE CASCADE;
