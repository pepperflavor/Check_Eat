/*
  Warnings:

  - The primary key for the `FavoriteStore` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `added_at` on the `FavoriteStore` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `FavoriteStore` table. All the data in the column will be lost.
  - You are about to drop the column `order_index` on the `FavoriteStore` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FavoriteStore" DROP CONSTRAINT "FavoriteStore_pkey",
DROP COLUMN "added_at",
DROP COLUMN "id",
DROP COLUMN "order_index",
ADD COLUMN     "fav_added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fav_id" SERIAL NOT NULL,
ADD COLUMN     "fav_order_index" INTEGER,
ADD CONSTRAINT "FavoriteStore_pkey" PRIMARY KEY ("fav_id");

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "revi_status" SET DEFAULT 1;
