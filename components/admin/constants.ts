// 시간 슬롯 옵션
export const TIMES = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

// 관리자 비밀번호 (환경변수에서 가져오거나 기본값 사용)
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

// 기본 설정값
export const DEFAULT_MAX_APPLICANTS = 3;
export const DEFAULT_MALE_PRICE = 10000;
export const DEFAULT_FEMALE_PRICE = 5000;
