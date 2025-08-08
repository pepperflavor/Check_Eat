/*
  Warnings:

  - You are about to drop the `Favorites` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_FavoritesStores` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Favorites" DROP CONSTRAINT "Favorites_user_id_fkey";

-- DropForeignKey
ALTER TABLE "_FavoritesStores" DROP CONSTRAINT "_FavoritesStores_A_fkey";

-- DropForeignKey
ALTER TABLE "_FavoritesStores" DROP CONSTRAINT "_FavoritesStores_B_fkey";

-- DropTable
DROP TABLE "Favorites";

-- DropTable
DROP TABLE "_FavoritesStores";

-- CreateTable
CREATE TABLE "FavoriteStore" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sto_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order_index" INTEGER,

    CONSTRAINT "FavoriteStore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteStore_user_id_sto_id_key" ON "FavoriteStore"("user_id", "sto_id");

-- AddForeignKey
ALTER TABLE "FavoriteStore" ADD CONSTRAINT "FavoriteStore_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteStore" ADD CONSTRAINT "FavoriteStore_sto_id_fkey" FOREIGN KEY ("sto_id") REFERENCES "Store"("sto_id") ON DELETE RESTRICT ON UPDATE CASCADE;
