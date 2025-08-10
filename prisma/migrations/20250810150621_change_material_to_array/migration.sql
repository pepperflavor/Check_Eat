/*
  Warnings:

  - The `foo_material` column on the `Food` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Food" DROP COLUMN "foo_material",
ADD COLUMN     "foo_material" TEXT[],
ALTER COLUMN "foo_name" SET NOT NULL,
ALTER COLUMN "foo_name" SET DATA TYPE TEXT;
