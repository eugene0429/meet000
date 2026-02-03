import { TeamInfo, Member } from '../../types';

/**
 * Supabase에서 가져온 raw 팀 데이터를 TeamInfo 타입으로 매핑
 */
export function mapTeamRawToInfo(raw: any): TeamInfo {
    return {
        id: raw.id,
        date: raw.date,
        time: raw.time,
        gender: raw.gender,
        headCount: raw.head_count,
        role: raw.role,
        phone: raw.phone,
        university: raw.university,
        avgAge: raw.avg_age,
        status: raw.status,
        isVerified: raw.is_verified,
        members: raw.members as Member[],
        createdAt: raw.created_at,
        wantsInfo: raw.wants_info,
        sharesInfo: raw.shares_info,
        hasPaid: raw.has_paid,
        hasConfirmed: raw.has_confirmed,
        processStep: raw.process_step,
    };
}

/**
 * 날짜를 알림톡용 포맷으로 변환 (예: "2월 3일")
 */
export function formatDateForNotification(date: Date): string {
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 */
export function formatDateToString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
