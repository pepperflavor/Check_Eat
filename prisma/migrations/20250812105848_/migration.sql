/*
  Warnings:

  - A unique constraint covering the columns `[sto_sa_id,sto_bs_id,sto_name,sto_latitude,sto_longitude]` on the table `Store` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Store_sto_sa_id_sto_bs_id_sto_name_sto_latitude_sto_longitu_key" ON "Store"("sto_sa_id", "sto_bs_id", "sto_name", "sto_latitude", "sto_longitude");
