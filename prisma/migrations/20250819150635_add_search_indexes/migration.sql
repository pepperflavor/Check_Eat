-- prisma/migrations/XXXXXXXX_add_search_indexes/migration.sql

-- (제거) CREATE INDEX ... gin_trgm_ops  ← init.sql에서 생성하므로 여기선 제거

-- Basic B-tree indexes for location columns  
CREATE INDEX IF NOT EXISTS idx_store_latitude  ON "Store" (sto_latitude);
CREATE INDEX IF NOT EXISTS idx_store_longitude ON "Store" (sto_longitude);

-- Index for status filtering (most common filter)
CREATE INDEX IF NOT EXISTS idx_store_status ON "Store" (sto_status);

-- Composite index for status + location queries
CREATE INDEX IF NOT EXISTS idx_store_status_location
  ON "Store" (sto_status, sto_latitude, sto_longitude);