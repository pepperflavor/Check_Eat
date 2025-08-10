/*
  Warnings:

  - The `foo_name` column on the `Food` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `ft_ar_mt` column on the `FoodTranslateAR` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `ft_en_mt` column on the `FoodTranslateEN` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Food" DROP COLUMN "foo_name",
ADD COLUMN     "foo_name" TEXT[];

-- AlterTable
ALTER TABLE "FoodTranslateAR" DROP COLUMN "ft_ar_mt",
ADD COLUMN     "ft_ar_mt" TEXT[];

-- AlterTable
ALTER TABLE "FoodTranslateEN" DROP COLUMN "ft_en_mt",
ADD COLUMN     "ft_en_mt" TEXT[];
