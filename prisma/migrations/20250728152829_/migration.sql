/*
  Warnings:

  - The primary key for the `ReviewTranslateEN` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `rt_id` on the `ReviewTranslateEN` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LoginData" ADD COLUMN     "ld_lang" TEXT NOT NULL DEFAULT 'ko';

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "revi_status" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ReviewTranslateEN" DROP CONSTRAINT "ReviewTranslateEN_pkey",
DROP COLUMN "rt_id",
ADD COLUMN     "rt_en_id" SERIAL NOT NULL,
ADD CONSTRAINT "ReviewTranslateEN_pkey" PRIMARY KEY ("rt_en_id");

-- CreateTable
CREATE TABLE "ReviewTranslateAR" (
    "rt_ar_id" SERIAL NOT NULL,

    CONSTRAINT "ReviewTranslateAR_pkey" PRIMARY KEY ("rt_ar_id")
);
