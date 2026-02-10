-- ============================================================
-- 'teams' 테이블 기본값 설정
-- is_public_room 컬럼에 기본값 추가
-- ============================================================

-- is_public_room 컬럼 기본값을 false로 설정
ALTER TABLE teams ALTER COLUMN is_public_room SET DEFAULT false;

-- 기존 null 값들을 false로 업데이트
UPDATE teams SET is_public_room = false WHERE is_public_room IS NULL;

-- 확인
SELECT column_name, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'teams' 
AND column_name = 'is_public_room';

