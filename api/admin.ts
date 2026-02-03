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
                    .single();

                // single()은 데이터가 없으면 에러를 던지므로 무시
                return res.status(200).json({ success: true, data: data || null });
            }

            default:
                return res.status(400).json({ error: `Unknown action: ${action}` });
        }
    } catch (error: any) {
        console.error('Admin API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
