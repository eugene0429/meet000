/**
 * 알림톡 API 클라이언트
 * Vercel Serverless Functions를 통해 서버 측에서 알림톡을 발송합니다.
 */

const API_BASE = '/api';

interface NotificationResult {
    success: boolean;
    message: string;
    isTestMode?: boolean;
    error?: string;
}

// ✅ 템플릿 ID 하드코딩 (배포 환경 JSON 로딩 이슈 방지)
export const TEMPLATES = {
    // 01~03: 예약/등록 단계
    HOST_REGISTERED: 'KA01TP260205121622835SdhrNAmQjD9', // template_01
    GUEST_APPLIED: 'KA01TP2602051219035259JoyIRCbUZk', // template_02
    HOST_NEW_APPLICANT: 'KA01TP260205122411681cgxZpajPFnB', // template_03

    // 04~05: 1차 매칭 단계
    FIRST_MATCH_COMPLETE: 'template_id_first_match_complete',
    PUBLIC_ROOM_FIRST_MATCH: 'template_id_public_room_first_match',
    NOT_SELECTED: 'KA01TP260205123430718vrcZz3nVRxn',

    // 06~09: 정보 교환 단계
    PAYMENT_REQUEST: 'template_id_payment_request',
    INFO_DELIVERED: 'template_id_info_delivered',
    INFO_DENIED_CONTINUE: 'template_id_info_denied_continue',
    WAIT_OTHER_TEAM: 'template_id_wait_other_team',

    // 10~11: 최종 매칭 단계
    FINAL_PAYMENT_REQUEST: 'KA01TP260205125155326kniFNsFqF0X',
    FINAL_MATCH_COMPLETE: 'KA01TP260205125605522sxe38scKItk',

    // 12~17: 취소 단계
    PROCESS_CANCELLED: 'template_id_process_cancelled',
    HOST_CANCELLED_ALL: 'template_id_host_cancelled_all',
    GUEST_CANCELLED_AFTER_FIRST: 'template_id_guest_cancelled_after_first',
    GUEST_CANCELLED_HOST_NOTIFY: 'template_id_guest_cancelled_host_notify',
    GUEST_CANCELLED_BEFORE_FIRST: 'KA01TP260205130143472wcOZ3TRJrXH',
    GUEST_CANCELLED_BEFORE_HOST_NOTIFY: 'KA01TP260205132335506AI9gaUZmhtf',

    // 18~19: 추가 알림
    REFUND_GUIDE: 'KA01TP260205132504827NMVOoXngPL4',
    NO_REFUND_NOTICE: 'KA01TP260205132558755knWzJj1U9VP',
    MATCH_REMINDER: 'KA01TP260205132709880JObhynrFvDV', // template_20 (D-1)
    STUDENT_ID_REJECTED: 'KA01TP260205133627591qRDjVgE6Krp', // template_21

    // 22: 선택 시간 안내
    DECISION_TIME: 'template_id_decision_time',
};

// ... (omitted sendNotification)

// 18. 취소 및 환불 안내 (전액 환불 대상)
export async function sendRefundGuideNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.REFUND_GUIDE, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 19. 취소 및 환불 불가 안내 (48시간 이내 취소 페널티)
export async function sendNoRefundNoticeNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.NO_REFUND_NOTICE, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 20. 매칭 리마인더 D-1 (예약 발송용)
export async function sendMatchReminderNotification(
    phone: string,
    date: string,
    time: string,
    scheduledTime: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.MATCH_REMINDER, {
        '#{date}': date,
        '#{time}': time,
    }, scheduledTime);
}

// 21. 학생증 승인 반려 알림
export async function sendStudentIdRejectedNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.STUDENT_ID_REJECTED, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 22. 선택 시간 안내 (예약 발송용 - 매칭 시작 40분 후)
export async function sendDecisionTimeNotification(
    phone: string,
    id: string,
    gender: 'MALE' | 'FEMALE',
    scheduledTime: string
): Promise<NotificationResult> {
    // 성별에 따른 위치 안내 문구
    const positionGuide = gender === 'FEMALE'
        ? '현재 위치에서 대기해주세요.'
        : '지금 지하로 내려가주세요!';

    return sendNotification(phone, TEMPLATES.DECISION_TIME, {
        '#{id}': id,
        '#{position_guide}': positionGuide,
    }, scheduledTime);
}

// 기본 발송 함수
async function sendNotification(
    to: string,
    templateId: string,
    variables: Record<string, string>,
    scheduledTime?: string
): Promise<NotificationResult> {
    try {
        const response = await fetch(`${API_BASE}/notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId, to, variables, scheduledTime }),
        });


        const result = await response.json();

        if (result.debug) {
            console.group('📝 Notification Details');
            console.log('Template ID:', result.debug.templateId);
            console.log('Recipient:', result.debug.to);
            console.log('Variables:', result.debug.variables);
            console.groupEnd();
        }

        if (!response.ok) {
            return {
                success: false,
                message: result.error || '발송 실패'
            };
        }

        return result;
    } catch (error: any) {
        console.error('Notification API Error:', error);
        return {
            success: false,
            message: error.message || '네트워크 오류'
        };
    }
}

// ============================================================
// 알림톡 발송 함수들 (01~17)
// ============================================================

// 01. 호스트 등록 완료
export async function sendHostRegisteredNotification(
    phone: string,
    date: string,
    time: string,
    representativeId: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.HOST_REGISTERED, {
        '#{date}': date,
        '#{time}': time,
        '#{host_id}': representativeId, // 템플릿의 host_id 변수에 매핑
    });
}

// 02. 게스트 신청 완료
export async function sendGuestAppliedNotification(
    phone: string,
    date: string,
    time: string,
    hostId: string, // 호스트 아이디
    guestId: string // 게스트 아이디
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.GUEST_APPLIED, {
        '#{date}': date,
        '#{time}': time,
        '#{host_id}': hostId,
        '#{guest_id}': guestId,
    });
}

// 03. 호스트에게 새 신청자 알림
export async function sendHostNewApplicantNotification(
    hostPhone: string,
    date: string,
    time: string,
    hostId: string,
    guestId: string,
    guestInfo: string, // "서울대 기계과 23세\n..."
    guestIntro: string, // 게스트 팀 소개
    currGuestNum: number,
    maxGuestNum: number
): Promise<NotificationResult> {
    return sendNotification(hostPhone, TEMPLATES.HOST_NEW_APPLICANT, {
        '#{host_id}': hostId,
        '#{date}': date,
        '#{time}': time,
        '#{guest_id}': guestId,
        '#{guest_info}': guestInfo,
        '#{guest_intro}': guestIntro,
        '#{curr_guest_num}': currGuestNum.toString(),
        '#{max_guest_num}': maxGuestNum.toString(),
    });
}

// 04. 1차 매칭 완료
export async function sendFirstMatchCompleteNotification(
    phone: string,
    date: string,
    time: string,
    hostId: string,
    guestId: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.FIRST_MATCH_COMPLETE, {
        '#{date}': date,
        '#{time}': time,
        '#{host_id}': hostId,
        '#{guest_id}': guestId,
    });
}

// 04-공개방. 공개방 1차 매칭 (인스타 정보 포함)
export async function sendPublicRoomFirstMatchNotification(
    phone: string,
    date: string,
    time: string,
    myId: string,
    otherTeamInstaInfo: string  // "홍길동 @hong123\n김철수 @kim456" 형식
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.PUBLIC_ROOM_FIRST_MATCH, {
        '#{date}': date,
        '#{time}': time,
        '#{id}': myId,
        '#{other_team_insta_info}': otherTeamInstaInfo,
    });
}

// 05. 매칭 미선택 알림
export async function sendNotSelectedNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.NOT_SELECTED, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 06. 정보 열람 결제 안내
export async function sendPaymentRequestNotification(
    phone: string,
    date: string,
    time: string,
    fee: string,
    paymentLink: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.PAYMENT_REQUEST, {
        '#{date}': date,
        '#{time}': time,
        '#{fee}': fee,
        '#{payment_link}': paymentLink,
    });
}

// 07. 정보 전달 및 진행 확인
export async function sendInfoDeliveredNotification(
    phone: string,
    date: string,
    time: string,
    memberInfo: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.INFO_DELIVERED, {
        '#{date}': date,
        '#{time}': time,
        '#{member_info}': memberInfo,
    });
}

// 08. 정보 비공개 진행 확인
export async function sendInfoDeniedContinueNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.INFO_DENIED_CONTINUE, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 09. 상대팀 프로세스 대기
export async function sendWaitOtherTeamNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.WAIT_OTHER_TEAM, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 10. 최종 매칭 결제 안내
export async function sendFinalPaymentRequestNotification(
    phone: string,
    date: string,
    time: string,
    amount: string,
    numPeople: string,
    totalAmount: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.FINAL_PAYMENT_REQUEST, {
        '#{date}': date,
        '#{time}': time,
        '#{amount}': amount,
        '#{num_people}': numPeople,
        '#{total_amount}': totalAmount,
    });
}

// 11. 최종 매칭 완료
export async function sendFinalMatchCompleteNotification(
    phone: string,
    date: string,
    time: string,
    hostId: string,
    guestId: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.FINAL_MATCH_COMPLETE, {
        '#{date}': date,
        '#{time}': time,
        '#{host_id}': hostId,
        '#{guest_id}': guestId,
    });
}

// 12. 프로세스 중 매칭 취소
export async function sendProcessCancelledNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.PROCESS_CANCELLED, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 13. 호스트 개인 사정 취소
export async function sendHostCancelledAllNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.HOST_CANCELLED_ALL, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 14. 게스트 1차 후 취소 (본인 알림)
export async function sendGuestCancelledAfterFirstNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.GUEST_CANCELLED_AFTER_FIRST, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 15. 게스트 1차 후 취소 (호스트 알림)
export async function sendGuestCancelledHostNotifyNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.GUEST_CANCELLED_HOST_NOTIFY, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 16. 게스트 1차 전 취소 (본인 알림)
export async function sendGuestCancelledBeforeFirstNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.GUEST_CANCELLED_BEFORE_FIRST, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 17. 게스트 1차 전 취소 (호스트 알림)
export async function sendGuestCancelledBeforeHostNotifyNotification(
    phone: string,
    date: string,
    time: string,
    guestId: string
): Promise<NotificationResult> {
    return sendNotification(phone, TEMPLATES.GUEST_CANCELLED_BEFORE_HOST_NOTIFY, {
        '#{date}': date,
        '#{time}': time,
        '#{guest_id}': guestId,
    });
}

// 유틸리티 함수
export function formatDateForNotification(date: Date): string {
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
