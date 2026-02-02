-- ============================================================
-- 팀 테이블에 정보 교환 프로세스 관련 컬럼 추가
-- 실행: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. 상대팀 정보 열람 희망 여부
ALTER TABLE teams ADD COLUMN IF NOT EXISTS wants_info BOOLEAN DEFAULT NULL;

-- 2. 본인팀 정보 공개 여부
ALTER TABLE teams ADD COLUMN IF NOT EXISTS shares_info BOOLEAN DEFAULT NULL;

-- 3. 결제 완료 여부
ALTER TABLE teams ADD COLUMN IF NOT EXISTS has_paid BOOLEAN DEFAULT FALSE;

-- 4. 정보 확인 후 진행 의사 (true=진행, false=취소, null=미응답)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS has_confirmed BOOLEAN DEFAULT NULL;

-- 5. 프로세스 단계 (SETTING, WAITING_PAYMENT, WAITING_CONFIRM, WAITING_OTHER, COMPLETED, CANCELLED)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS process_step TEXT DEFAULT NULL;

-- 확인
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'teams' 
AND column_name IN ('wants_info', 'shares_info', 'has_paid', 'has_confirmed', 'process_step');
