import { TeamInfo } from '../../../types';

/**
 * Supabase에서 가져온 raw 팀 데이터를 TeamInfo 타입으로 매핑
 */
export function mapTeamRawToInfo(raw: any): TeamInfo {
    const memberCount = raw.members?.length || 0;
    const totalAge = raw.members?.reduce((sum: number, m: any) => sum + (parseInt(m.age) || 0), 0) || 0;
    const avgAge = memberCount > 0 ? Math.round(totalAge / memberCount) : 0;

    return {
        id: raw.id,
        date: raw.date,
        time: raw.time,
        gender: raw.gender,
        headCount: memberCount,
        role: raw.role,
        phone: raw.phone,
        university: raw.members?.[0]?.university || '대학생',
        avgAge: avgAge,
        status: raw.status,
        isVerified: raw.is_verified,
        members: raw.members || [],
        createdAt: raw.created_at,
        studentIdUrl: raw.student_id_url,
        intro: raw.intro,
        representativeId: raw.representative_id,
        wantsInfo: raw.wants_info,
        sharesInfo: raw.shares_info,
        hasPaid: raw.has_paid,
        hasConfirmed: raw.has_confirmed,
        processStep: raw.process_step,
        isPublicRoom: raw.is_public_room || false,  // 공개방 여부
        infoExchangeStatus: raw.info_exchange_status || null,  // 정보 교환 상태
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
