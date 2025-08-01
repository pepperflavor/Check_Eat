/*
  Warnings:

  - Made the column `sto_name_en` on table `Store` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FoodTranslateAR" ADD COLUMN     "ft_ar_name" TEXT;

-- AlterTable
ALTER TABLE "Store" ALTER COLUMN "sto_name_en" SET NOT NULL;
