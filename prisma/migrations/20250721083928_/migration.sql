/*
  Warnings:

  - You are about to drop the column `ft_mt_ab` on the `FoodTranslate` table. All the data in the column will be lost.
  - You are about to drop the column `ft_name_ab` on the `FoodTranslate` table. All the data in the column will be lost.
  - You are about to drop the column `ft_price_ab` on the `FoodTranslate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FoodTranslate" DROP COLUMN "ft_mt_ab",
DROP COLUMN "ft_name_ab",
DROP COLUMN "ft_price_ab",
ADD COLUMN     "ft_mt_ar" TEXT,
ADD COLUMN     "ft_name_ar" TEXT,
ADD COLUMN     "ft_price_ar" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "revi_create" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "sto_name_en" TEXT,
ADD COLUMN     "sto_status" INTEGER NOT NULL DEFAULT 0;
