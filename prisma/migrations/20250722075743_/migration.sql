/*
  Warnings:

  - A unique constraint covering the columns `[veg_name]` on the table `Vegan` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Vegan_veg_name_key" ON "Vegan"("veg_name");
