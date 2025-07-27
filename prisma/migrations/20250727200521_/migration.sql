/*
  Warnings:

  - You are about to drop the column `foo_seed_ingre` on the `FoodMeterialSeed` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FoodMeterialSeed" DROP COLUMN "foo_seed_ingre",
ADD COLUMN     "foo_seed_ingredients" TEXT[];
