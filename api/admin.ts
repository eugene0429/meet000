import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// 환경변수 로드 (로컬 개발용)
config({ path: '.env.local' });

// 서버 전용 환경변수 (VITE_ 접두사 없음 = 브라우저에 노출되지 않음)
// 로컬에서는 VITE_ 버전도 fallback으로 사용
const getSupabaseAdmin = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error('Supabase configuration missing');
    }

    return createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
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

    const { action, teamId, updates, teamIds, dateStr, slotConfigs, openTimes, maxApplicants } = req.body;

    try {
        const supabaseAdmin = getSupabaseAdmin();

        switch (action) {
            case 'update-team': {
                if (!teamId || !updates) {
                    return res.status(400).json({ error: 'teamId and updates required' });
                }
                const { data, error } = await supabaseAdmin
                    .from('teams')
                    .update(updates)
                    .eq('id', teamId)
                    .select();

                if (error) throw error;
                return res.status(200).json({ success: true, data });
            }

            case 'update-teams-bulk': {
                if (!teamIds || !updates) {
                    return res.status(400).json({ error: 'teamIds and updates required' });
                }
                const { data, error } = await supabaseAdmin
                    .from('teams')
                    .update(updates)
                    .in('id', teamIds)
                    .select();

                if (error) throw error;
                return res.status(200).json({ success: true, data });
            }

            case 'delete-team': {
                if (!teamId) {
                    return res.status(400).json({ error: 'teamId required' });
                }
                const { error } = await supabaseAdmin
                    .from('teams')
                    .delete()
                    .eq('id', teamId);

                if (error) throw error;
                return res.status(200).json({ success: true });
            }

            case 'delete-teams-bulk': {
                if (!teamIds || teamIds.length === 0) {
                    return res.status(400).json({ error: 'teamIds required' });
                }
                const { error } = await supabaseAdmin
                    .from('teams')
                    .delete()
                    .in('id', teamIds);

                if (error) throw error;
                return res.status(200).json({ success: true });
            }

            case 'upsert-daily-config': {
                if (!dateStr) {
                    return res.status(400).json({ error: 'dateStr required' });
                }
                const { error } = await supabaseAdmin
                    .from('daily_config')
                    .upsert({
                        date: dateStr,
                        slot_configs: slotConfigs || {},
                        open_times: openTimes || [],
                        max_applicants: maxApplicants || 3
                    }, { onConflict: 'date' });

                if (error) throw error;
                return res.status(200).json({ success: true });
            }

            case 'get-daily-config': {
                if (!dateStr) {
                    return res.status(400).json({ error: 'dateStr required' });
                }
                const { data, error } = await supabaseAdmin
                    .from('daily_config')
                    .select('*')
                    .eq('date', dateStr)
                    .maybeSingle();  // .maybeSingle() 사용 (데이터가 없을 수 있음)

                return res.status(200).json({ success: true, data: data || null });
            }

            case 'get-teams-by-date': {
                if (!dateStr) {
                    return res.status(400).json({ error: 'dateStr required' });
                }
                const { data, error } = await supabaseAdmin
                    .from('teams')
                    .select('*, members(*)')
                    .eq('date', dateStr);

                if (error) throw error;
                return res.status(200).json({ success: true, data: data || [] });
            }

            case 'get-guest-notification-data': {
                if (!teamId) {
                    return res.status(400).json({ error: 'teamId required' });
                }

                console.log('get-guest-notification-data called with teamId:', teamId);

                // 게스트 팀 정보 조회
                const { data: guestTeam, error: guestError } = await supabaseAdmin
                    .from('teams')
                    .select('*')
                    .eq('id', teamId)
                    .single();

                if (guestError) {
                    console.error('Guest team query error:', guestError);
                    return res.status(404).json({ error: `Guest team not found: ${guestError.message}` });
                }

                if (!guestTeam) {
                    console.error('Guest team is null for teamId:', teamId);
                    return res.status(404).json({ error: 'Guest team not found (null)' });
                }

                console.log('Guest team found:', guestTeam.id, guestTeam.date, guestTeam.time);

                // 호스트 팀 정보 조회
                const { data: hostTeam, error: hostError } = await supabaseAdmin
                    .from('teams')
                    .select('*')
                    .eq('date', guestTeam.date)
                    .eq('time', guestTeam.time)
                    .eq('role', 'HOST')
                    .maybeSingle();  // .single() 대신 .maybeSingle() 사용 (호스트가 없을 수 있음)


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
                    .maybeSingle();  // .single() 대신 .maybeSingle() 사용 (설정이 없을 수 있음)


                return res.status(200).json({
                    success: true,
                    data: {
                        hostTeam: hostTeam || null,
                        guestMembers: guestMembers || [],
                        guestCount: count || 0,
                        maxApplicants: dailyConfig?.max_applicants || 3
                    }
                });
            }

            default:
                return res.status(400).json({ error: `Unknown action: ${action}` });
        }
    } catch (error: any) {
        console.error('Admin API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
