-- CreateTable
CREATE TABLE "FoodMeterialSeed" (
    "foo_seed_id" SERIAL NOT NULL,
    "foo_seed_name" TEXT NOT NULL,
    "foo_seed_ingre" TEXT[],

    CONSTRAINT "FoodMeterialSeed_pkey" PRIMARY KEY ("foo_seed_id")
);
