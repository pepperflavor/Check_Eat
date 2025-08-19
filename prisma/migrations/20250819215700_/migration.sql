-- DropIndex
DROP INDEX "idx_store_latitude";

-- DropIndex
DROP INDEX "idx_store_longitude";

-- DropIndex
DROP INDEX "idx_store_status";

-- DropIndex
DROP INDEX "idx_store_status_location";

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "location" geography(Point,4326);
