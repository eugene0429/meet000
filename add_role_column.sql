-- 1. teams 테이블에 role 컬럼 추가
ALTER TABLE teams 
ADD COLUMN role TEXT CHECK (role IN ('HOST', 'GUEST'));

-- 2. 기존 데이터 마이그레이션 (Backfill)
-- 날짜, 시간별로 가장 먼저 생성된 팀(created_at이 최소값)을 찾아 HOST로 설정
WITH FirstTeams AS (
  SELECT id
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY date, time ORDER BY created_at ASC) as rn
    FROM teams
  ) t
  WHERE rn = 1
)
UPDATE teams
SET role = CASE 
  WHEN id IN (SELECT id FROM FirstTeams) THEN 'HOST'
  ELSE 'GUEST'
END;

-- 3. 검증용 쿼리 (실행 결과 확인)
SELECT date, time, role, count(*) 
FROM teams 
GROUP BY date, time, role 
ORDER BY date, time;
