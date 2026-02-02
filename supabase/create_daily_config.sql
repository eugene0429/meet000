-- ================================================================
-- daily_config 테이블 생성 스크립트
-- Supabase SQL Editor에서 실행하세요
-- ================================================================

-- 1. 기존 slots 테이블 백업 (필요시)
-- CREATE TABLE slots_backup AS SELECT * FROM slots;

-- 2. 새로운 daily_config 테이블 생성
CREATE TABLE IF NOT EXISTS daily_config (
  date DATE PRIMARY KEY,                    -- 날짜 (YYYY-MM-DD)
  open_times TEXT[] DEFAULT '{}',           -- 활성화된 시간 목록 (예: ["18:00", "19:00"])
  max_applicants INTEGER DEFAULT 3,         -- 해당 날짜 기본 최대 신청자 수
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS 정책 설정
ALTER TABLE daily_config ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "daily_config_select_policy" ON daily_config
  FOR SELECT USING (true);

-- Service Role만 수정/삽입/삭제 가능 (admin)
CREATE POLICY "daily_config_insert_policy" ON daily_config
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "daily_config_update_policy" ON daily_config
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "daily_config_delete_policy" ON daily_config
  FOR DELETE USING (auth.role() = 'service_role');

-- 4. 예시 데이터 삽입 (테스트용)
-- INSERT INTO daily_config (date, open_times, max_applicants) 
-- VALUES ('2026-02-02', ARRAY['18:00', '19:00', '20:00'], 3);

-- ================================================================
-- 기존 slots 테이블에서 데이터 마이그레이션 (선택사항)
-- ================================================================
-- 기존 slots 데이터가 있는 경우 아래 쿼리로 마이그레이션:
-- 
-- INSERT INTO daily_config (date, open_times, max_applicants)
-- SELECT 
--   date,
--   ARRAY_AGG(time ORDER BY time) FILTER (WHERE is_open = true),
--   COALESCE(MAX(max_applicants), 3)
-- FROM slots
-- GROUP BY date
-- ON CONFLICT (date) DO UPDATE 
-- SET open_times = EXCLUDED.open_times,
--     max_applicants = EXCLUDED.max_applicants;

COMMENT ON TABLE daily_config IS '날짜별 슬롯 설정 (효율적인 단일 row 방식)';
COMMENT ON COLUMN daily_config.open_times IS '활성화된 시간 목록 (예: ["18:00", "19:00", "20:00"])';
