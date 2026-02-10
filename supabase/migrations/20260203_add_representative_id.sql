-- ============================================================
-- ‘teams’ 테이블에 대표자 ID 컬럼 추가
-- ============================================================

ALTER TABLE teams ADD COLUMN IF NOT EXISTS representative_id TEXT;

-- 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teams' 
AND column_name = 'representative_id';
