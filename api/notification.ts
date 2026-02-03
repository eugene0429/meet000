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

    const { templateId, to, variables } = req.body;

    if (!to || !templateId) {
        return res.status(400).json({ error: 'to and templateId required' });
    }

    const config = getSolapiConfig();

    // 테스트 모드: API 키가 없으면 로그만 출력
    if (!config) {
        console.log('📨 [테스트모드] 알림톡 발송');
        console.log(`📋 템플릿: ${templateId}`);
        console.log(`📱 수신자: ${to}`);
        console.log(`📝 변수:`, variables);
        return res.status(200).json({
            success: true,
            message: '테스트 모드 - 로그 출력 완료',
            isTestMode: true
        });
    }

    // 프로덕션 모드: 실제 Solapi API 호출
    const credentials = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
    const normalizedPhone = to.replace(/-/g, '');

    try {
        const response = await fetch('https://api.solapi.com/messages/v4/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify({
                message: {
                    to: normalizedPhone,
                    from: config.sender,
                    kakaoOptions: {
                        pfId: config.pfId,
                        templateId,
                        variables,
                    },
                },
            }),
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
    } catch (error: any) {
        console.error('❌ 알림톡 발송 오류:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
