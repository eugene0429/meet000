import type { VercelRequest, VercelResponse } from '@vercel/node';

// 서버 전용 환경변수 (VITE_ 접두사 없음 = 브라우저에 노출되지 않음)
const getSolapiConfig = () => {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const pfId = process.env.SOLAPI_PF_ID;
    const sender = process.env.SOLAPI_SENDER;

    if (!apiKey || !apiSecret) {
        return null; // 테스트 모드
    }

    return { apiKey, apiSecret, pfId, sender };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { templateId, to, variables, scheduledTime } = req.body;

    if (!to || !templateId) {
        return res.status(400).json({ error: 'to and templateId required' });
    }

    const config = getSolapiConfig();
    const normalizedPhone = to.replace(/-/g, '');

    // 테스트 모드 (API 키가 없거나 템플릿 ID가 기본값인 경우)
    const isTestMode = !config || templateId.startsWith('template_');
    if (isTestMode) {
        console.log(`📨 [테스트모드] 알림톡 ${scheduledTime ? '예약 ' : ''}발송`);
        console.log(`📋 템플릿: ${templateId}`);
        console.log(`📱 수신자: ${normalizedPhone}`);
        console.log(`📝 변수:`, variables);
        if (scheduledTime) console.log(`⏰ 예약시간: ${scheduledTime}`);

        return res.status(200).json({
            success: true,
            message: '테스트 모드 - 로그 출력 완료',
            isTestMode: true,
            debug: {
                templateId,
                to: normalizedPhone,
                variables
            }
        });
    }

    // HMAC-SHA256 인증
    const crypto = await import('crypto');

    const messageObj = {
        to: normalizedPhone,
        from: config.sender,
        kakaoOptions: {
            pfId: config.pfId,
            templateId,
            variables,
        },
    };

    try {
        const getHeaders = () => {
            const date = new Date().toISOString();
            const salt = crypto.randomBytes(32).toString('hex');
            const signature = crypto.createHmac('sha256', config.apiSecret)
                .update(date + salt)
                .digest('hex');

            return {
                'Content-Type': 'application/json',
                'Authorization': `HMAC-SHA256 apiKey=${config.apiKey}, date=${date}, salt=${salt}, signature=${signature}`
            };
        };
        if (scheduledTime) {
            // 예약 발송: 그룹 API 사용
            console.log(`🗓️ 예약 발송 시도: ${scheduledTime}`);

            // 1. 그룹 생성
            const createGroupRes = await fetch('https://api.solapi.com/messages/v4/groups', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({}),
            });
            if (!createGroupRes.ok) throw new Error(`그룹 생성 실패: ${createGroupRes.statusText}`);
            const groupData = await createGroupRes.json();
            const groupId = groupData.groupId;

            // 2. 메시지 추가
            const addMsgRes = await fetch(`https://api.solapi.com/messages/v4/groups/${groupId}/messages`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ messages: [messageObj] }),
            });
            if (!addMsgRes.ok) throw new Error(`메시지 추가 실패: ${addMsgRes.statusText}`);

            // 3. 예약 설정
            const scheduleRes = await fetch(`https://api.solapi.com/messages/v4/groups/${groupId}/schedule`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ scheduledDate: scheduledTime }),
            });

            if (!scheduleRes.ok) {
                const errData = await scheduleRes.json();
                throw new Error(`예약 설정 실패: ${JSON.stringify(errData)}`);
            }

            console.log('⏰ 알림톡 예약 성공:', groupId);
            return res.status(200).json({ success: true, message: '예약 성공', groupId });

        } else {
            // 즉시 발송: Simple API
            const response = await fetch('https://api.solapi.com/messages/v4/send', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ message: messageObj }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ 알림톡 발송 실패:', errorData);
                return res.status(response.status).json({
                    success: false,
                    error: errorData.message || '발송 실패'
                });
            }

            console.log('📬 알림톡 발송 성공:', normalizedPhone);
            return res.status(200).json({ success: true, message: '발송 성공' });
        }
    } catch (error: any) {
        console.error('❌ 알림톡 발송 오류:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
