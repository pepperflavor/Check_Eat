-- CreateTable
CREATE TABLE "Favorites" (
    "fa_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "Favorites_pkey" PRIMARY KEY ("fa_id")
);

-- CreateTable
CREATE TABLE "_FavoritesStores" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FavoritesStores_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Favorites_user_id_key" ON "Favorites"("user_id");

-- CreateIndex
CREATE INDEX "_FavoritesStores_B_index" ON "_FavoritesStores"("B");

-- AddForeignKey
ALTER TABLE "Favorites" ADD CONSTRAINT "Favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FavoritesStores" ADD CONSTRAINT "_FavoritesStores_A_fkey" FOREIGN KEY ("A") REFERENCES "Favorites"("fa_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FavoritesStores" ADD CONSTRAINT "_FavoritesStores_B_fkey" FOREIGN KEY ("B") REFERENCES "Store"("sto_id") ON DELETE CASCADE ON UPDATE CASCADE;
