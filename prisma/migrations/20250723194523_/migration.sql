/*
  Warnings:

  - A unique constraint covering the columns `[coal_name]` on the table `CommonAl` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CommonAl_coal_name_key" ON "CommonAl"("coal_name");
