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
