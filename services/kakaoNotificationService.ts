/**
 * 카카오 알림톡 발송 서비스 (Solapi)
 * 
 * 테스트 모드: API 키가 없으면 터미널에 로그만 출력
 * 프로덕션: 실제 Solapi API 호출
 */

// ✅ 환경 변수에서 설정 로드
const SOLAPI_API_KEY = import.meta.env.VITE_SOLAPI_API_KEY || '';
const SOLAPI_API_SECRET = import.meta.env.VITE_SOLAPI_API_SECRET || '';
const SOLAPI_PF_ID = import.meta.env.VITE_SOLAPI_PF_ID || '';
const SOLAPI_SENDER = import.meta.env.VITE_SOLAPI_SENDER || '';

// 테스트 모드 확인
const IS_TEST_MODE = !SOLAPI_API_KEY || SOLAPI_API_KEY === 'your_api_key_here' || !SOLAPI_API_SECRET || SOLAPI_API_SECRET === 'your_api_secret_here';

// 알림톡 템플릿 ID (mutable for DB override)
export let TEMPLATES = {
    // 01~03: 예약/등록 단계
    HOST_REGISTERED: import.meta.env.VITE_TEMPLATE_HOST_REGISTERED || 'template_01',
    GUEST_APPLIED: import.meta.env.VITE_TEMPLATE_GUEST_APPLIED || 'template_02',
    HOST_NEW_APPLICANT: import.meta.env.VITE_TEMPLATE_HOST_NEW_APPLICANT || 'template_03',
    // 04~05: 1차 매칭 단계
    FIRST_MATCH_COMPLETE: import.meta.env.VITE_TEMPLATE_FIRST_MATCH_COMPLETE || 'template_04',
    NOT_SELECTED: import.meta.env.VITE_TEMPLATE_NOT_SELECTED || 'template_05',
    // 06~09: 정보 교환 단계
    PAYMENT_REQUEST: import.meta.env.VITE_TEMPLATE_PAYMENT_REQUEST || 'template_06',
    INFO_DELIVERED: import.meta.env.VITE_TEMPLATE_INFO_DELIVERED || 'template_07',
    INFO_DENIED_CONTINUE: import.meta.env.VITE_TEMPLATE_INFO_DENIED_CONTINUE || 'template_08',
    WAIT_OTHER_TEAM: import.meta.env.VITE_TEMPLATE_WAIT_OTHER_TEAM || 'template_09',
    // 10~11: 최종 매칭 단계
    FINAL_PAYMENT_REQUEST: import.meta.env.VITE_TEMPLATE_FINAL_PAYMENT_REQUEST || 'template_10',
    FINAL_MATCH_COMPLETE: import.meta.env.VITE_TEMPLATE_FINAL_MATCH_COMPLETE || 'template_11',
    // 12~17: 취소 단계
    PROCESS_CANCELLED: import.meta.env.VITE_TEMPLATE_PROCESS_CANCELLED || 'template_12',
    HOST_CANCELLED_ALL: import.meta.env.VITE_TEMPLATE_HOST_CANCELLED_ALL || 'template_13',
    GUEST_CANCELLED_AFTER_FIRST: import.meta.env.VITE_TEMPLATE_GUEST_CANCELLED_AFTER_FIRST || 'template_14',
    GUEST_CANCELLED_HOST_NOTIFY: import.meta.env.VITE_TEMPLATE_GUEST_CANCELLED_HOST_NOTIFY || 'template_15',
    GUEST_CANCELLED_BEFORE_FIRST: import.meta.env.VITE_TEMPLATE_GUEST_CANCELLED_BEFORE_FIRST || 'template_16',
    GUEST_CANCELLED_BEFORE_HOST_NOTIFY: import.meta.env.VITE_TEMPLATE_GUEST_CANCELLED_BEFORE_HOST_NOTIFY || 'template_17',
    // 18~19: 추가 알림
    REFUND_COMPLETE: import.meta.env.VITE_TEMPLATE_REFUND_COMPLETE || 'template_18',
    MATCH_REMINDER: import.meta.env.VITE_TEMPLATE_MATCH_REMINDER || 'template_19',
};

// Runtime update function for templates
export const updateNotificationTemplates = (newTemplates: Record<string, string>) => {
    TEMPLATES = { ...TEMPLATES, ...newTemplates };
    // Update debug names if necessary or just rely on IDs being correct
    // (TEMPLATE_NAMES is for test logging only, might risk being out of sync but acceptable)
};

// 템플릿 이름 매핑 (테스트 모드용)
const TEMPLATE_NAMES: Record<string, string> = {
    [TEMPLATES.HOST_REGISTERED]: '01_호스트_등록완료',
    [TEMPLATES.GUEST_APPLIED]: '02_게스트_신청완료',
    [TEMPLATES.HOST_NEW_APPLICANT]: '03_호스트_새신청알림',
    [TEMPLATES.FIRST_MATCH_COMPLETE]: '04_1차매칭_완료안내',
    [TEMPLATES.NOT_SELECTED]: '05_매칭_미선택알림',
    [TEMPLATES.PAYMENT_REQUEST]: '06_정보열람_결제안내',
    [TEMPLATES.INFO_DELIVERED]: '07_정보전달_진행확인',
    [TEMPLATES.INFO_DENIED_CONTINUE]: '08_정보비공개_진행확인',
    [TEMPLATES.WAIT_OTHER_TEAM]: '09_상대팀_프로세스대기',
    [TEMPLATES.FINAL_PAYMENT_REQUEST]: '10_최종매칭_결제안내',
    [TEMPLATES.FINAL_MATCH_COMPLETE]: '11_최종매칭_완료',
    [TEMPLATES.PROCESS_CANCELLED]: '12_프로세스중_매칭취소',
    [TEMPLATES.HOST_CANCELLED_ALL]: '13_호스트_개인사정취소',
    [TEMPLATES.GUEST_CANCELLED_AFTER_FIRST]: '14_게스트_1차후취소_본인알림',
    [TEMPLATES.GUEST_CANCELLED_HOST_NOTIFY]: '15_게스트_1차후취소_호스트알림',
    [TEMPLATES.GUEST_CANCELLED_BEFORE_FIRST]: '16_게스트_1차전취소_본인알림',
    [TEMPLATES.GUEST_CANCELLED_BEFORE_HOST_NOTIFY]: '17_게스트_1차전취소_호스트알림',
    [TEMPLATES.REFUND_COMPLETE]: '18_환불완료_안내',
    [TEMPLATES.MATCH_REMINDER]: '19_매칭_리마인더_D-1',
};

interface TeamInfo {
    university: string;
    gender: 'MALE' | 'FEMALE';
    headCount: number;
    avgAge: number;
    phone: string;
}

interface NotificationResult {
    success: boolean;
    message: string;
    isTestMode?: boolean;
}

/**
 * Solapi API 호출을 위한 인증 헤더 생성
 */
function generateAuthHeader(): string {
    const credentials = btoa(`${SOLAPI_API_KEY}:${SOLAPI_API_SECRET}`);
    return `Basic ${credentials}`;
}

/**
 * 테스트 모드 로그 출력
 */
function logTestNotification(templateId: string, to: string, variables: Record<string, string>): void {
    const templateName = TEMPLATE_NAMES[templateId] || templateId;
    console.log('\n' + '='.repeat(60));
    console.log(`📨 [테스트모드] 알림톡 발송`);
    console.log('='.repeat(60));
    console.log(`📋 템플릿: ${templateName}`);
    console.log(`📱 수신자: ${to}`);
    console.log(`📝 변수:`);
    Object.entries(variables).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
    console.log('='.repeat(60) + '\n');
}

/**
 * 알림톡 발송 기본 함수
 */
async function sendKakaoNotification(
    to: string,
    templateId: string,
    variables: Record<string, string>
): Promise<NotificationResult> {
    // 전화번호 정규화 (하이픈 제거)
    const normalizedPhone = to.replace(/-/g, '');

    // 🧪 테스트 모드: 로그만 출력하고 성공 반환
    if (IS_TEST_MODE) {
        logTestNotification(templateId, normalizedPhone, variables);
        return { success: true, message: '테스트 모드 - 로그 출력 완료', isTestMode: true };
    }

    // 프로덕션 모드
    if (!templateId) {
        console.warn('⚠️ 템플릿 ID가 설정되지 않았습니다.');
        return { success: false, message: '템플릿 ID 누락' };
    }

    const payload = {
        message: {
            to: normalizedPhone,
            from: SOLAPI_SENDER,
            kakaoOptions: {
                pfId: SOLAPI_PF_ID,
                templateId: templateId,
                variables: variables,
            },
        },
    };

    try {
        const response = await fetch('https://api.solapi.com/messages/v4/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': generateAuthHeader(),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ 알림톡 발송 실패:', errorData);
            return { success: false, message: errorData.message || '발송 실패' };
        }

        console.log('📬 알림톡 발송 성공:', normalizedPhone);
        return { success: true, message: '발송 성공' };
    } catch (error) {
        console.error('❌ 알림톡 발송 오류:', error);
        return { success: false, message: String(error) };
    }
}

// ============================================================
// 알림톡 발송 함수들 (01~15)
// ============================================================

// 01. 호스트 등록 완료
export async function sendHostRegisteredNotification(
    phone: string,
    date: string,
    time: string,
    representativeId: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.HOST_REGISTERED, {
        '#{date}': date,
        '#{time}': time,
        '#{representative_id}': representativeId,
    });
}

// 02. 게스트 신청 완료
export async function sendGuestAppliedNotification(
    phone: string,
    date: string,
    time: string,
    hostUniversity: string,
    representativeId: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.GUEST_APPLIED, {
        '#{date}': date,
        '#{time}': time,
        '#{host_university}': hostUniversity,
        '#{representative_id}': representativeId,
    });
}

// 03. 호스트에게 새 신청자 알림
export async function sendHostNewApplicantNotification(
    hostPhone: string,
    guestInfo: TeamInfo & { representativeId?: string },
    date: string,
    time: string,
    hostRepresentativeId: string
): Promise<NotificationResult> {
    return sendKakaoNotification(hostPhone, TEMPLATES.HOST_NEW_APPLICANT, {
        '#{date}': date,
        '#{time}': time,
        '#{guest_university}': guestInfo.university,
        '#{guest_gender}': guestInfo.gender === 'MALE' ? '남성' : '여성',
        '#{guest_count}': guestInfo.headCount.toString(),
        '#{guest_avg_age}': guestInfo.avgAge.toString(),
        '#{guest_representative_id}': guestInfo.representativeId || '',
        '#{representative_id}': hostRepresentativeId,
    });
}

// 04. 1차 매칭 완료 (양팀에게)
export async function sendFirstMatchCompleteNotification(
    phone: string,
    date: string,
    time: string,
    otherTeamUniversity: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.FIRST_MATCH_COMPLETE, {
        '#{date}': date,
        '#{time}': time,
        '#{other_team_university}': otherTeamUniversity,
    });
}

// 05. 매칭 미선택 알림
export async function sendNotSelectedNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.NOT_SELECTED, {
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
    return sendKakaoNotification(phone, TEMPLATES.PAYMENT_REQUEST, {
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
    return sendKakaoNotification(phone, TEMPLATES.INFO_DELIVERED, {
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
    return sendKakaoNotification(phone, TEMPLATES.INFO_DENIED_CONTINUE, {
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
    return sendKakaoNotification(phone, TEMPLATES.WAIT_OTHER_TEAM, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 10. 최종 매칭 완료
export async function sendFinalMatchCompleteNotification(
    phone: string,
    date: string,
    time: string,
    otherTeamUniversity: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.FINAL_MATCH_COMPLETE, {
        '#{date}': date,
        '#{time}': time,
        '#{other_team_university}': otherTeamUniversity,
    });
}

// 11. 프로세스 중 매칭 취소
export async function sendProcessCancelledNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.PROCESS_CANCELLED, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 12. 호스트 개인 사정 취소
export async function sendHostCancelledAllNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.HOST_CANCELLED_ALL, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 13. 게스트 1차 후 취소 (본인)
export async function sendGuestCancelledAfterFirstNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.GUEST_CANCELLED_AFTER_FIRST, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 14. 게스트 1차 후 취소 (호스트에게)
export async function sendGuestCancelledHostNotifyNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.GUEST_CANCELLED_HOST_NOTIFY, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 15. 게스트 1차 전 취소 (본인)
export async function sendGuestCancelledBeforeFirstNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.GUEST_CANCELLED_BEFORE_FIRST, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 16. 최종 매칭 결제 안내 (양팀 진행 동의 후)
export async function sendFinalPaymentRequestNotification(
    phone: string,
    date: string,
    time: string,
    amount: string,
    paymentLink: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.FINAL_PAYMENT_REQUEST, {
        '#{date}': date,
        '#{time}': time,
        '#{amount}': amount,
        '#{paymentLink}': paymentLink,
    });
}

// 17. 게스트 1차 전 취소 (호스트 알림)
export async function sendGuestCancelledBeforeHostNotifyNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.GUEST_CANCELLED_BEFORE_HOST_NOTIFY, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 18. 환불 처리 안내
export async function sendRefundCompleteNotification(
    phone: string,
    date: string,
    time: string,
    amount: string,
    bank: string,
    account: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.REFUND_COMPLETE, {
        '#{date}': date,
        '#{time}': time,
        '#{amount}': amount,
        '#{bank}': bank,
        '#{account}': account,
    });
}

// 19. 매칭 D-1 리마인더
export async function sendMatchReminderNotification(
    phone: string,
    date: string,
    time: string
): Promise<NotificationResult> {
    return sendKakaoNotification(phone, TEMPLATES.MATCH_REMINDER, {
        '#{date}': date,
        '#{time}': time,
    });
}

// 유틸리티 함수
// ============================================================

export function formatDateForNotification(date: Date): string {
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function isSolapiConfigured(): boolean {
    return !IS_TEST_MODE;
}

export function isTestMode(): boolean {
    return IS_TEST_MODE;
}
