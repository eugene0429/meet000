import { useState, useCallback } from 'react';
import { updateTeam, deleteTeam, deleteTeamsBulk } from '../../../lib/adminApiClient';
import {
    sendHostCancelledAllNotification,
    sendGuestCancelledAfterFirstNotification,
    sendGuestCancelledHostNotifyNotification,
    sendGuestCancelledBeforeFirstNotification,
    sendGuestCancelledBeforeHostNotifyNotification,
} from '../../../lib/notificationApiClient';
import { AdminSlot } from '../types';
import { formatDateForNotification } from '../utils/mapTeamData';

interface UseTeamOperationsReturn {
    processing: boolean;
    executeVerify: (teamId: string, onSuccess: () => Promise<void>) => Promise<void>;
    confirmReject: (
        teamId: string | null,
        teamType: 'HOST' | 'GUEST',
        slot: AdminSlot | null,
        selectedDate: Date,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
}

/**
 * 팀 관리 작업을 담당하는 Hook
 * API 호출 (서버에서 Service Role Key 사용)
 */
export function useTeamOperations(
    showAlert: (message: string) => void
): UseTeamOperationsReturn {
    const [processing, setProcessing] = useState(false);

    // 팀 인증
    const executeVerify = useCallback(async (
        teamId: string,
        onSuccess: () => Promise<void>
    ) => {
        try {
            const result = await updateTeam(teamId, { is_verified: true });

            if (!result.success) throw new Error(result.error);
            if (!result.data || result.data.length === 0) {
                throw new Error("업데이트된 데이터가 없습니다.");
            }
            await onSuccess();
        } catch (err: any) {
            showAlert(`승인 처리 실패: ${err.message}`);
        }
    }, [showAlert]);

    // 팀 삭제 (호스트 또는 게스트)
    const confirmReject = useCallback(async (
        teamId: string | null,
        teamType: 'HOST' | 'GUEST',
        slot: AdminSlot | null,
        selectedDate: Date,
        onSuccess: () => Promise<void>
    ) => {
        if (!teamId || !slot) return;
        setProcessing(true);

        const dateStr = formatDateForNotification(selectedDate);
        const timeStr = slot.time;

        try {
            if (teamType === 'HOST') {
                // 호스트 삭제: 해당 슬롯의 모든 팀에게 알림톡 발송
                if (slot.hostTeam) {
                    await sendHostCancelledAllNotification(slot.hostTeam.phone, dateStr, timeStr);
                }
                for (const guest of slot.guestTeams) {
                    await sendHostCancelledAllNotification(guest.phone, dateStr, timeStr);
                }

                // 해당 슬롯의 모든 팀 삭제
                const allTeamIds = [slot.hostTeam?.id, ...slot.guestTeams.map(g => g.id)].filter(Boolean) as string[];

                if (allTeamIds.length > 0) {
                    const result = await deleteTeamsBulk(allTeamIds);
                    if (!result.success) throw new Error(result.error);
                }

                showAlert(`호스트 팀과 함께 해당 슬롯의 모든 팀(${allTeamIds.length}개)이 삭제되었습니다.\n알림톡이 발송되었습니다.`);
            } else {
                // 게스트 삭제
                const isMatchConfirmed = slot.status === 'MATCH_CONFIRMED';
                const isFirstConfirmed = slot.status === 'FIRST_CONFIRMED';
                const guestTeam = slot.guestTeams.find(g => g.id === teamId);
                const isMatchedGuest = guestTeam?.status === 'MATCH_CONFIRMED' || guestTeam?.status === 'FIRST_CONFIRMED';

                // 알림톡 발송
                if (guestTeam && slot.hostTeam) {
                    if (isMatchConfirmed || isFirstConfirmed || isMatchedGuest) {
                        // 1차 매칭 후 삭제
                        await sendGuestCancelledAfterFirstNotification(guestTeam.phone, dateStr, timeStr);
                        await sendGuestCancelledHostNotifyNotification(slot.hostTeam.phone, dateStr, timeStr);
                    } else {
                        // 1차 매칭 전 삭제
                        await sendGuestCancelledBeforeFirstNotification(guestTeam.phone, dateStr, timeStr);
                        await sendGuestCancelledBeforeHostNotifyNotification(slot.hostTeam.phone, dateStr, timeStr);
                    }
                }

                // 게스트 삭제
                const deleteResult = await deleteTeam(teamId);
                if (!deleteResult.success) throw new Error(deleteResult.error);

                // 매칭 완료 상태에서 매칭된 게스트를 삭제하면 호스트 상태 리셋
                if ((isMatchConfirmed || isFirstConfirmed) && isMatchedGuest && slot.hostTeam) {
                    const updateResult = await updateTeam(slot.hostTeam.id!, {
                        status: 'PENDING',
                        wants_info: null,
                        shares_info: null,
                        has_paid: false,
                        has_confirmed: null,
                        process_step: null
                    });

                    if (!updateResult.success) {
                        console.error("호스트 상태 리셋 실패:", updateResult.error);
                    }

                    showAlert("매칭된 게스트가 삭제되었습니다.\n호스트는 다시 매칭 대기 상태로 변경되었습니다.\n알림톡이 발송되었습니다.");
                } else {
                    showAlert("게스트 팀이 삭제되었습니다.\n알림톡이 발송되었습니다.");
                }
            }

            await onSuccess();
        } catch (err: any) {
            console.error(err);
            showAlert(`삭제 실패: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    }, [showAlert]);

    return {
        processing,
        executeVerify,
        confirmReject,
    };
}
