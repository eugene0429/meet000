# 승인 처리 실패 문제 해결

## 문제 상황
게스트 팀 등록 후 관리자 페이지에서 승인을 했을 때 "승인 처리 실패: 알림 데이터 조회 실패" 오류가 발생

## 원인 분석
`api/admin.ts`의 `get-guest-notification-data` 액션에서 호스트 팀 정보를 조회할 때 `.single()` 메서드를 사용했는데, 이 메서드는 결과가 없을 경우 에러를 발생시킵니다.

게스트가 먼저 등록하고 아직 호스트가 등록되지 않은 슬롯의 경우, 호스트 팀 데이터가 존재하지 않아 `.single()`이 에러를 던지고, 이로 인해 전체 API 호출이 실패했습니다.

### 문제가 있던 코드 (api/admin.ts, line 161-167)
```typescript
// 호스트 팀 정보 조회
const { data: hostTeam, error: hostError } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('date', guestTeam.date)
    .eq('time', guestTeam.time)
    .eq('role', 'HOST')
    .single();  // ❌ 호스트가 없으면 에러 발생
```

## 해결 방법
`.single()` 대신 `.maybeSingle()`을 사용하여 결과가 없을 경우 에러를 발생시키지 않고 `null`을 반환하도록 수정했습니다.

### 수정된 파일들

1. **api/admin.ts** (3곳 수정)
   - Line 125: `get-daily-config` 액션의 daily_config 조회
   - Line 167: `get-guest-notification-data` 액션의 호스트 팀 조회
   - Line 190: `get-guest-notification-data` 액션의 daily_config 조회

2. **components/admin/hooks/useTeamOperations.ts**
   - Line 67-69: 에러 메시지를 더 상세하게 표시하도록 개선

### 수정 후 코드
```typescript
// 호스트 팀 정보 조회
const { data: hostTeam, error: hostError } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('date', guestTeam.date)
    .eq('time', guestTeam.time)
    .eq('role', 'HOST')
    .maybeSingle();  // ✅ 호스트가 없어도 null 반환
```

## 테스트 방법
1. 새로운 날짜/시간 슬롯에 게스트 팀을 먼저 등록
2. 관리자 페이지에서 해당 게스트 팀 승인
3. 알림톡이 정상적으로 발송되는지 확인

## 예상 동작
- 호스트가 없는 경우: 게스트 본인에게만 알림톡 발송 (템플릿 02)
- 호스트가 있는 경우: 게스트 본인 + 호스트에게 알림톡 발송 (템플릿 02, 03)

## 추가 개선사항
- 에러 메시지를 더 상세하게 표시하여 향후 디버깅이 용이하도록 개선
- `.single()` vs `.maybeSingle()` 사용 기준을 명확히 하여 유사한 문제 방지
