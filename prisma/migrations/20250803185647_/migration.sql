/*
  Warnings:

  - You are about to drop the column `revi_img` on the `Review` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Review" DROP COLUMN "revi_img",
ADD COLUMN     "revi_reco_vegan" INTEGER;

-- CreateTable
CREATE TABLE "ReviewImage" (
    "revi_img_id" SERIAL NOT NULL,
    "revi_img_url" TEXT NOT NULL,
    "review_id" INTEGER NOT NULL,

    CONSTRAINT "ReviewImage_pkey" PRIMARY KEY ("revi_img_id")
);

-- AddForeignKey
ALTER TABLE "ReviewImage" ADD CONSTRAINT "ReviewImage_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("revi_id") ON DELETE RESTRICT ON UPDATE CASCADE;
