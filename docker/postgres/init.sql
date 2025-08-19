-- docker/postgres/init.sql (NO shadow DB)
\set ON_ERROR_STOP on

-- 1) 현재 DB(POSTGRES_DB)에 필요한 확장 생성
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) 텍스트 검색(트라이그램) 인덱스: 확장 의존 → 마이그레이션 대신 여기서 생성
CREATE INDEX IF NOT EXISTS idx_store_name_gin
  ON "Store" USING GIN (sto_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_store_name_en_gin
  ON "Store" USING GIN (sto_name_en gin_trgm_ops);

-- 3) 위치 최적화: PostGIS 생성열 + GIST 인덱스 (확장 의존 → 여기서 생성)
--    위/경도로부터 geography(Point,4326) 생성열을 만들고, GIST 인덱스를 건다.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Store' AND column_name = 'location'
  ) THEN
    EXECUTE '
      ALTER TABLE "Store"
      ADD COLUMN location geography(Point,4326)
      GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(sto_longitude, sto_latitude), 4326)::geography
      ) STORED
    ';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_store_location_gist
  ON "Store" USING GIST (location);

-- 4) (선택) 권한/환경
-- SET timezone = ''Asia/Seoul'';
GRANT ALL PRIVILEGES ON DATABASE :dbname TO postgres;

-- 5) 완료 로그
SELECT ''Initialized primary DB with PostGIS + pg_trgm + indexes'' AS status;