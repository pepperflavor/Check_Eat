/*
  Warnings:

  - You are about to drop the column `coal_img` on the `CommonAl` table. All the data in the column will be lost.
  - Added the required column `ft_id` to the `Food` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sto_address` to the `Store` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sto_latitude` to the `Store` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sto_longitude` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CommonAl" DROP COLUMN "coal_img";

-- AlterTable
ALTER TABLE "Food" ADD COLUMN     "ft_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "sto_address" TEXT NOT NULL,
ADD COLUMN     "sto_latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sto_longitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sto_phone" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "user_allergy_ar" TEXT,
ADD COLUMN     "user_allergy_en" TEXT;

-- CreateTable
CREATE TABLE "FoodTranslate" (
    "ft_id" SERIAL NOT NULL,
    "ft_name_en" TEXT,
    "ft_name_ab" TEXT,
    "ft_mt_en" TEXT,
    "ft_mt_ab" TEXT,
    "ft_price_en" TEXT,
    "ft_price_ab" TEXT,

    CONSTRAINT "FoodTranslate_pkey" PRIMARY KEY ("ft_id")
);

-- CreateTable
CREATE TABLE "ReviewTranslateEN" (
    "rt_id" SERIAL NOT NULL,

    CONSTRAINT "ReviewTranslateEN_pkey" PRIMARY KEY ("rt_id")
);

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_ft_id_fkey" FOREIGN KEY ("ft_id") REFERENCES "FoodTranslate"("ft_id") ON DELETE RESTRICT ON UPDATE CASCADE;
