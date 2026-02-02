import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 환경변수에서 Supabase 설정 읽기
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// URL이나 Key가 비어있는 경우 경고
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase 설정 오류: .env.local 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해주세요.");
}

// 일반 사용자용 클라이언트 (RLS 적용)
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL, 
  SUPABASE_ANON_KEY
);

// 관리자용 클라이언트 (RLS 우회 - Service Role Key 사용)
// Service Role Key가 설정되어 있으면 사용, 없으면 일반 클라이언트 반환
export const supabaseAdmin: SupabaseClient = SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY !== 'YOUR_SERVICE_ROLE_KEY_HERE'
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase; // fallback: Service Role Key가 없으면 일반 클라이언트 사용

// Service Role Key 사용 여부 확인
export const isAdminModeEnabled = (): boolean => {
  return SUPABASE_SERVICE_ROLE_KEY !== '' && SUPABASE_SERVICE_ROLE_KEY !== 'YOUR_SERVICE_ROLE_KEY_HERE';
};
