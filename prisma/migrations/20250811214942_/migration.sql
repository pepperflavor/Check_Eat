-- CreateTable
CREATE TABLE "IdentityVerification" (
    "iv_id" TEXT NOT NULL,
    "iv_status" TEXT NOT NULL,
    "iv_method" TEXT,
    "iv_operator" TEXT,
    "iv_name" TEXT,
    "iv_phoneNumber" VARCHAR(20),
    "iv_birthDate" DATE,
    "iv_gender" TEXT,
    "iv_ci" TEXT,
    "iv_di" TEXT,
    "iv_verifiedAt" TIMESTAMP(3),
    "iv_payload" JSONB,
    "iv_pre_signup_key" TEXT,
    "login_data_id" INTEGER,
    "sajang_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("iv_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerification_iv_pre_signup_key_key" ON "IdentityVerification"("iv_pre_signup_key");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerification_login_data_id_key" ON "IdentityVerification"("login_data_id");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerification_sajang_id_key" ON "IdentityVerification"("sajang_id");

-- CreateIndex
CREATE INDEX "IdentityVerification_iv_phoneNumber_idx" ON "IdentityVerification"("iv_phoneNumber");

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_login_data_id_fkey" FOREIGN KEY ("login_data_id") REFERENCES "LoginData"("ld_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_sajang_id_fkey" FOREIGN KEY ("sajang_id") REFERENCES "Sajang"("sa_id") ON DELETE SET NULL ON UPDATE CASCADE;
