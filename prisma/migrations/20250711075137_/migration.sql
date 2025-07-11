/*
  Warnings:

  - You are about to drop the column `holi_runtime` on the `Holiday` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Food" ADD COLUMN     "foo_status" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Holiday" DROP COLUMN "holi_runtime",
ADD COLUMN     "holi_runtime_fri" TEXT,
ADD COLUMN     "holi_runtime_mon" TEXT,
ADD COLUMN     "holi_runtime_sat" TEXT,
ADD COLUMN     "holi_runtime_sun" TEXT,
ADD COLUMN     "holi_runtime_thu" TEXT,
ADD COLUMN     "holi_runtime_tue" TEXT,
ADD COLUMN     "holi_runtime_wed" TEXT;

-- AlterTable
ALTER TABLE "LoginData" ADD COLUMN     "ld_status" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Sajang" ADD COLUMN     "sa_certi_status" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sa_type" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "Review" (
    "revi_id" SERIAL NOT NULL,
    "revi_content" TEXT NOT NULL,
    "revi_img" TEXT,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("revi_id")
);
