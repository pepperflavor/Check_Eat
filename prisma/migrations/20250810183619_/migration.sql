-- AlterTable
ALTER TABLE "FoodTranslateAR" ALTER COLUMN "ft_ar_mt" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "FoodTranslateEN" ALTER COLUMN "ft_en_mt" SET DEFAULT ARRAY[]::TEXT[];
