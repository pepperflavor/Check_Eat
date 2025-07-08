-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "user_nick" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
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
    "ld_pwd" TEXT NOT NULL,
    "ld_user_id" INTEGER,
    "ld_sajang_id" INTEGER,

    CONSTRAINT "LoginData_pkey" PRIMARY KEY ("ld_id")
);

-- CreateTable
CREATE TABLE "Sajang" (
    "sa_id" SERIAL NOT NULL,
    "sa_email" TEXT NOT NULL,
    "sa_signboard" TEXT NOT NULL,
    "sa_img" TEXT,
    "sa_certification" INTEGER NOT NULL,
    "sa_halal" INTEGER,

    CONSTRAINT "Sajang_pkey" PRIMARY KEY ("sa_id")
);

-- CreateTable
CREATE TABLE "Food" (
    "foo_id" SERIAL NOT NULL,
    "foo_name" TEXT NOT NULL,
    "foo_material" TEXT,
    "foo_price" INTEGER NOT NULL,
    "foo_img" TEXT,
    "foo_allergy_common" INTEGER,
    "foo_sa_id" INTEGER NOT NULL,
    "foo_vegan" INTEGER,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("foo_id")
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

-- CreateIndex
CREATE UNIQUE INDEX "User_user_email_key" ON "User"("user_email");

-- CreateIndex
CREATE UNIQUE INDEX "LoginData_ld_log_id_key" ON "LoginData"("ld_log_id");

-- CreateIndex
CREATE UNIQUE INDEX "Sajang_sa_email_key" ON "Sajang"("sa_email");

-- CreateIndex
CREATE INDEX "_CommonAlFood_B_index" ON "_CommonAlFood"("B");

-- CreateIndex
CREATE INDEX "_UserAllergyCommon_B_index" ON "_UserAllergyCommon"("B");

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
ALTER TABLE "_CommonAlFood" ADD CONSTRAINT "_CommonAlFood_A_fkey" FOREIGN KEY ("A") REFERENCES "CommonAl"("coal_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommonAlFood" ADD CONSTRAINT "_CommonAlFood_B_fkey" FOREIGN KEY ("B") REFERENCES "Food"("foo_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserAllergyCommon" ADD CONSTRAINT "_UserAllergyCommon_A_fkey" FOREIGN KEY ("A") REFERENCES "CommonAl"("coal_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserAllergyCommon" ADD CONSTRAINT "_UserAllergyCommon_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
