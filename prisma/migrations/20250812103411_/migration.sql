/*
  Warnings:

  - A unique constraint covering the columns `[bs_no]` on the table `BusinessCerti` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BusinessCerti_bs_no_key" ON "BusinessCerti"("bs_no");

-- CreateIndex
CREATE INDEX "BusinessCerti_bs_sa_id_idx" ON "BusinessCerti"("bs_sa_id");
