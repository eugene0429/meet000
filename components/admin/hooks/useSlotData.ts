import { useState, useCallback } from 'react';
import { getTeamsByDate, getDailyConfig } from '../../../lib/adminApiClient';
import { AdminSlot, SlotConfig } from '../types';
import { TIMES, DEFAULT_MAX_APPLICANTS } from '../constants';
import { mapTeamRawToInfo, formatDateToString } from '../utils/mapTeamData';
import { TeamInfo } from '../../../types';

interface UseSlotDataReturn {
    dailySlots: AdminSlot[];
    loading: boolean;
    fetchDailyData: (date: Date) => Promise<void>;
}

/**
 * 슬롯 데이터 페칭을 담당하는 Hook
 * 읽기 전용 - supabase (anon key) 사용
 */
export function useSlotData(): UseSlotDataReturn {
    const [dailySlots, setDailySlots] = useState<AdminSlot[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchDailyData = useCallback(async (date: Date) => {
        setLoading(true);
        const dateStr = formatDateToString(date);

        try {
            // 해당 날짜의 팀 데이터 조회 (Admin API 사용)
            const teamsResult = await getTeamsByDate(dateStr);
            if (!teamsResult.success) throw new Error(teamsResult.error);
            const teamsRaw = teamsResult.data;

            // 해당 날짜의 설정 조회 (Admin API 사용)
            const configResult = await getDailyConfig(dateStr);
            const dailyConfig = configResult.data;

            const openTimes: string[] = dailyConfig?.open_times || [];
            const slotConfigs: Record<string, SlotConfig> = dailyConfig?.slot_configs || {};
            const defaultMaxApplicants = dailyConfig?.max_applicants || DEFAULT_MAX_APPLICANTS;

            // 팀 데이터 매핑
            const teams: TeamInfo[] = (teamsRaw || []).map(mapTeamRawToInfo);

            // 슬롯 구성
            const slots: AdminSlot[] = TIMES.map((time) => {
                const thisSlotConfig = slotConfigs[time] || {};

                const hostTeam = teams.find((t) => t.time === time && t.role === 'HOST');
                const guestTeams = teams.filter((t) => t.time === time && t.role === 'GUEST');

                // 슬롯 상태 결정
                let status = 'EMPTY';
                if (hostTeam) {
                    const confirmedGuest = guestTeams.find(
                        (g) => g.status === 'MATCH_CONFIRMED' || g.status === 'FIRST_CONFIRMED'
                    );
                    if (confirmedGuest) {
                        status = confirmedGuest.status;
                    } else if (guestTeams.length > 0) {
                        status = 'PENDING';
                    } else {
                        status = 'HOST_ONLY';
                    }
                }

                return {
                    id: `${dateStr}-${time}`,
                    time,
                    date: dateStr,
                    status,
                    is_open: openTimes.includes(time),
                    max_applicants: thisSlotConfig.maxApplicants ?? defaultMaxApplicants,
                    malePrice: thisSlotConfig.malePrice,
                    femalePrice: thisSlotConfig.femalePrice,
                    publicRoomExtraPrice: thisSlotConfig.publicRoomExtraPrice,  // 슬롯별 공개방 추가금액
                    isPublicRoom: hostTeam?.isPublicRoom || false,  // 호스트의 공개방 설정
                    hostTeam,
                    guestTeams,
                };
            });

            setDailySlots(slots);
        } catch (err) {
            console.error('Failed to fetch daily data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        dailySlots,
        loading,
        fetchDailyData,
    };
}
