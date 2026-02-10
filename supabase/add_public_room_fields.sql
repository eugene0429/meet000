-- ================================================================================
-- Migration: Add Public Room Fields
-- Created: 2026-02-09
-- Description: 인스타 교환 시스템 대개편 - 공개방/비공개방 지원
-- ================================================================================

-- 1. teams 테이블에 is_public_room 컬럼 추가 (호스트만 사용)
-- 호스트가 슬롯 등록 시 공개방/비공개방 선택
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS is_public_room BOOLEAN DEFAULT false;

-- 2. teams 테이블에 info_exchange_status 컬럼 추가
-- 공개방에서 1차 매칭 후 각 팀의 진행/그만 응답 상태
-- PENDING: 응답 대기중
-- PROCEED: 진행 원함
-- STOP: 그만 원함 (매칭 취소)
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS info_exchange_status TEXT 
CHECK (info_exchange_status IS NULL OR info_exchange_status IN ('PENDING', 'PROCEED', 'STOP'));

-- 3. daily_config 테이블에 public_room_extra_price 컬럼 추가
-- 공개방 인당 추가금액 (전역 기본값)
ALTER TABLE daily_config 
ADD COLUMN IF NOT EXISTS public_room_extra_price INTEGER DEFAULT 3000;

-- ================================================================================
-- 컬럼 설명:
-- 
-- teams.is_public_room:
--   - true: 공개방 (인스타 사전 공개, 양팀 동의 후 최종매칭)
--   - false: 비공개방 (인스타 미공개, 호스트 선택 즉시 최종매칭)
--   - 호스트 팀에만 의미 있음, 게스트는 호스트의 설정을 따름
--
-- teams.info_exchange_status:
--   - NULL: 아직 1차 매칭 전이거나 비공개방
--   - 'PENDING': 공개방에서 1차 매칭 후 응답 대기중
--   - 'PROCEED': 진행 원함
--   - 'STOP': 그만 원함 (매칭 자동 취소)
--
-- daily_config.public_room_extra_price:
--   - 공개방 선택 시 인당 추가되는 금액 (기본 3000원)
-- ================================================================================
