/*
  Warnings:

  - You are about to drop the column `sa_img` on the `Sajang` table. All the data in the column will be lost.
  - Added the required column `sa_phone` to the `Sajang` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sajang" DROP COLUMN "sa_img",
ADD COLUMN     "sa_phone" TEXT NOT NULL;
