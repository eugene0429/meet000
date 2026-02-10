import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'configure-server',
        configureServer(server) {
          server.middlewares.use('/api/admin', async (req, res, next) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const { createClient } = await import('@supabase/supabase-js');
                  const supabaseAdmin = createClient(
                    env.VITE_SUPABASE_URL,
                    env.SUPABASE_SERVICE_ROLE_KEY,
                    {
                      auth: {
                        autoRefreshToken: false,
                        persistSession: false
                      }
                    }
                  );
                  const { action, dateStr, teamId, updates, teamIds, slotConfigs, openTimes, maxApplicants } = JSON.parse(body);

                  let result: any = { success: false };

                  if (action === 'get-teams-by-date') {
                    const { data, error } = await supabaseAdmin.from('teams').select('*, members(*)').eq('date', dateStr);
                    result = { success: !error, data: data || [], error };
                  } else if (action === 'get-daily-config') {
                    const { data, error } = await supabaseAdmin.from('daily_config').select('*').eq('date', dateStr).maybeSingle();
                    result = { success: true, data: data || null, error };
                  } else if (action === 'update-team') {
                    const { data, error } = await supabaseAdmin.from('teams').update(updates).eq('id', teamId).select();
                    result = { success: !error, data, error };
                  } else if (action === 'update-teams-bulk') {
                    const { data, error } = await supabaseAdmin.from('teams').update(updates).in('id', teamIds).select();
                    result = { success: !error, data, error };
                  } else if (action === 'delete-team') {
                    const { error } = await supabaseAdmin.from('teams').delete().eq('id', teamId);
                    result = { success: !error, error };
                  } else if (action === 'delete-teams-bulk') {
                    const { error } = await supabaseAdmin.from('teams').delete().in('id', teamIds);
                    result = { success: !error, error };
                  } else if (action === 'upsert-daily-config') {
                    const { error } = await supabaseAdmin.from('daily_config').upsert({
                      date: dateStr,
                      slot_configs: slotConfigs || {},
                      open_times: openTimes || [],
                      max_applicants: maxApplicants || 3
                    }, { onConflict: 'date' });
                    result = { success: !error, error };
                  } else if (action === 'get-guest-notification-data') {
                    // 게스트 팀 정보 조회
                    const { data: guestTeam, error: guestError } = await supabaseAdmin
                      .from('teams')
                      .select('*')
                      .eq('id', teamId)
                      .single();

                    if (guestError || !guestTeam) {
                      result = { success: false, error: guestError?.message || 'Guest team not found' };
                    } else {
                      // 호스트 팀 정보 조회
                      const { data: hostTeam } = await supabaseAdmin
                        .from('teams')
                        .select('*')
                        .eq('date', guestTeam.date)
                        .eq('time', guestTeam.time)
                        .eq('role', 'HOST')
                        .maybeSingle();

                      // 게스트 멤버 정보 조회
                      const { data: guestMembers } = await supabaseAdmin
                        .from('members')
                        .select('*')
                        .eq('team_id', teamId);

                      // 게스트 수 계산
                      const { count } = await supabaseAdmin
                        .from('teams')
                        .select('*', { count: 'exact', head: true })
                        .eq('date', guestTeam.date)
                        .eq('time', guestTeam.time)
                        .eq('role', 'GUEST')
                        .neq('status', 'CANCELLED');

                      // daily_config 조회
                      const { data: dailyConfig } = await supabaseAdmin
                        .from('daily_config')
                        .select('max_applicants')
                        .eq('date', guestTeam.date)
                        .maybeSingle();

                      result = {
                        success: true,
                        data: {
                          hostTeam: hostTeam || null,
                          guestMembers: guestMembers || [],
                          guestCount: count || 0,
                          maxApplicants: dailyConfig?.max_applicants || 3
                        }
                      };
                    }
                  }

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(result));
                } catch (error: any) {
                  console.error('API Proxy Error:', error);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: error.message }));
                }
              });
            } else {
              next();
            }
          });

          // /api/notification 미들웨어 추가
          server.middlewares.use('/api/notification', async (req, res, next) => {
            if (req.method === 'OPTIONS') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.statusCode = 200;
              res.end();
              return;
            }

            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const { templateId, to, variables, scheduledTime } = JSON.parse(body);

                  if (!to || !templateId) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'to and templateId required' }));
                    return;
                  }

                  const apiKey = env.SOLAPI_API_KEY;
                  const apiSecret = env.SOLAPI_API_SECRET;
                  const pfId = env.SOLAPI_PF_ID;
                  const sender = env.SOLAPI_SENDER;
                  const normalizedPhone = to.replace(/-/g, '');

                  // 테스트 모드 (API 키가 없거나 템플릿 ID가 기본값인 경우)
                  const isTestMode = !apiKey || !apiSecret || templateId.startsWith('template_');
                  if (isTestMode) {
                    console.log(`\n📨 [테스트모드] 알림톡 ${scheduledTime ? '예약 ' : ''}발송`);
                    console.log(`📋 템플릿 ID: ${templateId}`);

                    // 1. 템플릿 파일 찾기 (로컬 환경에서만 가능)
                    try {
                      const fs = await import('fs');
                      const path = await import('path');

                      // 템플릿 ID에서 숫자 추출 (예: template_02 -> 02)
                      // _ 또는 - 뒤의 숫자 추출 (예: template_02, template-02)
                      const match = templateId.match(/[_\-](\d+)/);
                      const templateNum = match ? match[1] : null;

                      console.log(`🔢 템플릿 번호 추출 시도: ${templateId} -> ${templateNum}`);

                      if (templateNum) {
                        const templatesDir = path.resolve(__dirname, 'templates');
                        console.log(`📂 템플릿 디렉토리: ${templatesDir}`);

                        if (fs.existsSync(templatesDir)) {
                          const files = fs.readdirSync(templatesDir);
                          const templateFile = files.find(f => f.startsWith(templateNum));

                          if (templateFile) {
                            const content = fs.readFileSync(path.join(templatesDir, templateFile), 'utf-8');

                            // 2. 변수 치환
                            let processedContent = content;
                            Object.entries(variables).forEach(([key, value]) => {
                              // 정규식으로 특수문자 이스케이프 후 치환
                              const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                              const regex = new RegExp(safeKey, 'g');
                              processedContent = processedContent.replace(regex, String(value));
                            });

                            console.log('='.repeat(50));
                            console.log(`📄 내용 미리보기 (${templateFile}):`);
                            console.log('-'.repeat(50));
                            console.log(processedContent);
                            console.log('='.repeat(50));
                          } else {
                            console.log(`⚠️ 템플릿 파일을 찾을 수 없습니다. (패턴: ${templateNum}*)`);
                          }
                        } else {
                          console.log(`⚠️ templates 디렉토리가 존재하지 않습니다: ${templatesDir}`);
                        }
                      } else {
                        console.log(`⚠️ 템플릿 번호를 추출할 수 없습니다: ${templateId}`);
                      }
                    } catch (err) {
                      console.error('⚠️ 템플릿 로드 중 오류 발생:', err);
                    }

                    console.log(`📱 수신자: ${normalizedPhone}`);
                    console.log(`📝 변수:`, variables);
                    if (scheduledTime) console.log(`⏰ 예약시간: ${scheduledTime}`);

                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                      success: true,
                      message: '테스트 모드 - 로그 출력 완료',
                      isTestMode: true,
                      debug: {
                        templateId,
                        to: normalizedPhone,
                        variables
                      }
                    }));
                    return;
                  }

                  // 실제 발송 모드 - HMAC-SHA256 인증
                  const crypto = await import('crypto');
                  const date = new Date().toISOString();
                  const salt = crypto.randomBytes(32).toString('hex');
                  const signature = crypto.createHmac('sha256', apiSecret)
                    .update(date + salt)
                    .digest('hex');

                  const authHeader = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
                  const commonHeaders = {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                  };

                  const messageObj = {
                    to: normalizedPhone,
                    from: sender,
                    kakaoOptions: {
                      pfId,
                      templateId,
                      variables,
                    },
                  };

                  if (scheduledTime) {
                    // 예약 발송
                    console.log(`🗓️ 예약 발송 시도: ${scheduledTime}`);
                    const createGroupRes = await fetch('https://api.solapi.com/messages/v4/groups', {
                      method: 'POST',
                      headers: commonHeaders,
                      body: JSON.stringify({}),
                    });
                    if (!createGroupRes.ok) throw new Error(`그룹 생성 실패: ${createGroupRes.statusText}`);
                    const groupData = await createGroupRes.json();
                    const groupId = groupData.groupId;

                    const addMsgRes = await fetch(`https://api.solapi.com/messages/v4/groups/${groupId}/messages`, {
                      method: 'PUT',
                      headers: commonHeaders,
                      body: JSON.stringify({ messages: [messageObj] }),
                    });
                    if (!addMsgRes.ok) throw new Error(`메시지 추가 실패: ${addMsgRes.statusText}`);

                    const scheduleRes = await fetch(`https://api.solapi.com/messages/v4/groups/${groupId}/schedule`, {
                      method: 'POST',
                      headers: commonHeaders,
                      body: JSON.stringify({ scheduledDate: scheduledTime }),
                    });
                    if (!scheduleRes.ok) {
                      const errData = await scheduleRes.json();
                      throw new Error(`예약 설정 실패: ${JSON.stringify(errData)}`);
                    }

                    console.log('⏰ 알림톡 예약 성공:', groupId);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, message: '예약 성공', groupId }));
                  } else {
                    // 즉시 발송
                    const response = await fetch('https://api.solapi.com/messages/v4/send', {
                      method: 'POST',
                      headers: commonHeaders,
                      body: JSON.stringify({ message: messageObj }),
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      console.error('❌ 알림톡 발송 실패:', errorData);
                      res.statusCode = response.status;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({
                        success: false,
                        error: errorData.message || '발송 실패'
                      }));
                      return;
                    }

                    console.log('📬 알림톡 발송 성공:', normalizedPhone);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, message: '발송 성공' }));
                  }
                } catch (error: any) {
                  console.error('❌ 알림톡 발송 오류:', error);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: false,
                    error: error.message || 'Internal server error'
                  }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    define: {
      // 'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
