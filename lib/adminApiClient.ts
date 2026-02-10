/**
 * Admin API 클라이언트
 * Vercel Serverless Functions를 통해 서버 측에서 민감한 작업을 수행합니다.
 */

const API_BASE = '/api';

interface AdminApiResponse {
    success: boolean;
    data?: any;
    error?: string;
}

// 팀 정보 업데이트
export async function updateTeam(teamId: string, updates: Record<string, any>): Promise<AdminApiResponse> {
    const response = await fetch(`${API_BASE}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-team', teamId, updates }),
    });
    return response.json();
}

// 여러 팀 일괄 업데이트
export async function updateTeamsBulk(teamIds: string[], updates: Record<string, any>): Promise<AdminApiResponse> {
    const response = await fetch(`${API_BASE}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-teams-bulk', teamIds, updates }),
    });
    return response.json();
}

// 팀 삭제
export async function deleteTeam(teamId: string): Promise<AdminApiResponse> {
    const response = await fetch(`${API_BASE}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-team', teamId }),
    });
    return response.json();
}

// 여러 팀 일괄 삭제
export async function deleteTeamsBulk(teamIds: string[]): Promise<AdminApiResponse> {
    const response = await fetch(`${API_BASE}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-teams-bulk', teamIds }),
    });
    return response.json();
}

// 일별 설정 업데이트
export async function upsertDailyConfig(
    dateStr: string,
    options: {
        slotConfigs?: Record<string, any>;
        openTimes?: string[];
        maxApplicants?: number;
    }
): Promise<AdminApiResponse> {
    const response = await fetch(`${API_BASE}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'upsert-daily-config',
            dateStr,
            ...options,
        }),
    });
    return response.json();
}

// 일별 설정 조회
export async function getDailyConfig(dateStr: string): Promise<AdminApiResponse> {
    const response = await fetch(`${API_BASE}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-daily-config', dateStr }),
    });
    return response.json();
}

// 일별 팀 데이터 조회 (RLS 우회)
export async function getTeamsByDate(dateStr: string): Promise<AdminApiResponse> {
    const response = await fetch(`${API_BASE}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-teams-by-date', dateStr }),
    });
    return response.json();
}

// 게스트 알림 발송을 위한 데이터 조회 (RLS 우회)
export async function getGuestNotificationData(teamId: string): Promise<AdminApiResponse> {
    try {
        const response = await fetch(`${API_BASE}/admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get-guest-notification-data', teamId }),
        });

        const result = await response.json();

        // HTTP 에러 상태인 경우 success: false 반환
        if (!response.ok) {
            return {
                success: false,
                error: result.error || `HTTP ${response.status} error`
            };
        }

        return result;
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Network error'
        };
    }
}
