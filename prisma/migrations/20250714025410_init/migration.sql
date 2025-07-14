-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "user_nick" TEXT NOT NULL,
    "user_allergy" TEXT,
    "user_pro_img" TEXT NOT NULL DEFAULT '0',
    "user_is_halal" INTEGER NOT NULL DEFAULT 0,
    "user_apple" INTEGER DEFAULT 0,
    "user_vegan" INTEGER DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "LoginData" (
    "ld_id" SERIAL NOT NULL,
    "ld_usergrade" INTEGER NOT NULL,
    "ld_log_id" TEXT NOT NULL,
    "ld_email" TEXT NOT NULL,
    "ld_pwd" TEXT NOT NULL,
    "ld_refresh_token" TEXT,
    "ld_status" INTEGER NOT NULL DEFAULT 0,
    "ld_user_id" INTEGER,
    "ld_sajang_id" INTEGER,

    CONSTRAINT "LoginData_pkey" PRIMARY KEY ("ld_id")
);

-- CreateTable
CREATE TABLE "Sajang" (
    "sa_id" SERIAL NOT NULL,
    "sa_img" TEXT,
    "sa_certification" INTEGER,
    "sa_certi_status" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Sajang_pkey" PRIMARY KEY ("sa_id")
);

-- CreateTable
CREATE TABLE "Food" (
    "foo_id" SERIAL NOT NULL,
    "foo_name" TEXT NOT NULL,
    "foo_material" TEXT,
    "foo_price" INTEGER NOT NULL,
    "foo_img" TEXT,
    "foo_status" INTEGER NOT NULL DEFAULT 0,
    "foo_allergy_common" INTEGER,
    "foo_sa_id" INTEGER NOT NULL,
    "foo_vegan" INTEGER,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("foo_id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "holi_id" SERIAL NOT NULL,
    "holi_weekday" INTEGER NOT NULL,
    "holi_break" TEXT NOT NULL,
    "holi_runtime_sun" TEXT,
    "holi_runtime_mon" TEXT,
    "holi_runtime_tue" TEXT,
    "holi_runtime_wed" TEXT,
    "holi_runtime_thu" TEXT,
    "holi_runtime_fri" TEXT,
    "holi_runtime_sat" TEXT,
    "holi_regular" TEXT,
    "holi_public" TEXT,
    "holi_sajang_id" INTEGER NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("holi_id")
);

-- CreateTable
CREATE TABLE "CommonAl" (
    "coal_id" SERIAL NOT NULL,
    "coal_name" TEXT NOT NULL,
    "coal_img" TEXT NOT NULL,

    CONSTRAINT "CommonAl_pkey" PRIMARY KEY ("coal_id")
);

-- CreateTable
CREATE TABLE "Vegan" (
    "veg_id" SERIAL NOT NULL,
    "veg_name" TEXT NOT NULL,

    CONSTRAINT "Vegan_pkey" PRIMARY KEY ("veg_id")
);

-- CreateTable
CREATE TABLE "Review" (
    "revi_id" SERIAL NOT NULL,
    "revi_img" TEXT,
    "revi_reco_step" INTEGER NOT NULL,
    "revi_content" TEXT,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("revi_id")
);

-- CreateTable
CREATE TABLE "Store" (
    "sto_id" SERIAL NOT NULL,
    "sto_name" TEXT NOT NULL,
    "sto_img" TEXT,
    "sto_halal" INTEGER NOT NULL DEFAULT 0,
    "sto_type" TEXT,
    "sto_sa_id" INTEGER NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("sto_id")
);

-- CreateTable
CREATE TABLE "_FoodToStore" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FoodToStore_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ReviewFoods" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ReviewFoods_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_HolidayToStore" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_HolidayToStore_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CommonAlFood" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CommonAlFood_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_UserAllergyCommon" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UserAllergyCommon_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ReviewToStore" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ReviewToStore_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoginData_ld_log_id_key" ON "LoginData"("ld_log_id");

-- CreateIndex
CREATE UNIQUE INDEX "LoginData_ld_email_key" ON "LoginData"("ld_email");

-- CreateIndex
CREATE INDEX "_FoodToStore_B_index" ON "_FoodToStore"("B");

-- CreateIndex
CREATE INDEX "_ReviewFoods_B_index" ON "_ReviewFoods"("B");

-- CreateIndex
CREATE INDEX "_HolidayToStore_B_index" ON "_HolidayToStore"("B");

-- CreateIndex
CREATE INDEX "_CommonAlFood_B_index" ON "_CommonAlFood"("B");

-- CreateIndex
CREATE INDEX "_UserAllergyCommon_B_index" ON "_UserAllergyCommon"("B");

-- CreateIndex
CREATE INDEX "_ReviewToStore_B_index" ON "_ReviewToStore"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_user_vegan_fkey" FOREIGN KEY ("user_vegan") REFERENCES "Vegan"("veg_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginData" ADD CONSTRAINT "LoginData_ld_user_id_fkey" FOREIGN KEY ("ld_user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginData" ADD CONSTRAINT "LoginData_ld_sajang_id_fkey" FOREIGN KEY ("ld_sajang_id") REFERENCES "Sajang"("sa_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_foo_sa_id_fkey" FOREIGN KEY ("foo_sa_id") REFERENCES "Sajang"("sa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_foo_vegan_fkey" FOREIGN KEY ("foo_vegan") REFERENCES "Vegan"("veg_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_sto_sa_id_fkey" FOREIGN KEY ("sto_sa_id") REFERENCES "Sajang"("sa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodToStore" ADD CONSTRAINT "_FoodToStore_A_fkey" FOREIGN KEY ("A") REFERENCES "Food"("foo_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodToStore" ADD CONSTRAINT "_FoodToStore_B_fkey" FOREIGN KEY ("B") REFERENCES "Store"("sto_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReviewFoods" ADD CONSTRAINT "_ReviewFoods_A_fkey" FOREIGN KEY ("A") REFERENCES "Food"("foo_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReviewFoods" ADD CONSTRAINT "_ReviewFoods_B_fkey" FOREIGN KEY ("B") REFERENCES "Review"("revi_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HolidayToStore" ADD CONSTRAINT "_HolidayToStore_A_fkey" FOREIGN KEY ("A") REFERENCES "Holiday"("holi_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HolidayToStore" ADD CONSTRAINT "_HolidayToStore_B_fkey" FOREIGN KEY ("B") REFERENCES "Store"("sto_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommonAlFood" ADD CONSTRAINT "_CommonAlFood_A_fkey" FOREIGN KEY ("A") REFERENCES "CommonAl"("coal_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommonAlFood" ADD CONSTRAINT "_CommonAlFood_B_fkey" FOREIGN KEY ("B") REFERENCES "Food"("foo_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserAllergyCommon" ADD CONSTRAINT "_UserAllergyCommon_A_fkey" FOREIGN KEY ("A") REFERENCES "CommonAl"("coal_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserAllergyCommon" ADD CONSTRAINT "_UserAllergyCommon_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReviewToStore" ADD CONSTRAINT "_ReviewToStore_A_fkey" FOREIGN KEY ("A") REFERENCES "Review"("revi_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReviewToStore" ADD CONSTRAINT "_ReviewToStore_B_fkey" FOREIGN KEY ("B") REFERENCES "Store"("sto_id") ON DELETE CASCADE ON UPDATE CASCADE;
