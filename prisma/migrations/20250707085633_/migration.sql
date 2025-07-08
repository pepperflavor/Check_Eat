-- AlterTable
ALTER TABLE "Sajang" ALTER COLUMN "sa_certification" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Holiday" (
    "holi_id" SERIAL NOT NULL,
    "holi_weekday" INTEGER NOT NULL,
    "holi_break" TEXT NOT NULL,
    "holi_runtime" TEXT NOT NULL,
    "holi_regular" TEXT,
    "holi_public" TEXT,
    "holi_sajang_id" INTEGER NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("holi_id")
);

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_holi_sajang_id_fkey" FOREIGN KEY ("holi_sajang_id") REFERENCES "Sajang"("sa_id") ON DELETE RESTRICT ON UPDATE CASCADE;
