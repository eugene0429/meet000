import { useState, useCallback } from 'react';
import { updateTeamsBulk, deleteTeamsBulk } from '../../../lib/adminApiClient';
import {
    sendFirstMatchCompleteNotification,
} from '../../../lib/notificationApiClient';
import { AdminSlot } from '../types';
import { formatDateForNotification } from '../utils/mapTeamData';

interface UseMatchingFlowReturn {
    processing: boolean;
    executeFirstMatch: (
        slot: AdminSlot,
        selectedGuestId: string,
        selectedDate: Date,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
    executeFinalMatch: (
        slot: AdminSlot,
        selectedGuestId: string,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
    executeCancelFirstMatch: (
        slot: AdminSlot,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
}

/**
 * 매칭 프로세스를 담당하는 Hook
 * API 호출 (서버에서 Service Role Key 사용)
 */
export function useMatchingFlow(
    showAlert: (message: string) => void
): UseMatchingFlowReturn {
    const [processing, setProcessing] = useState(false);

    // 1차 매칭 확정
    const executeFirstMatch = useCallback(async (
        slot: AdminSlot,
        selectedGuestId: string,
        selectedDate: Date,
        onSuccess: () => Promise<void>
    ) => {
        if (processing) return;
        setProcessing(true);

        try {
            if (!slot.hostTeam) return;

            // 선택된 게스트 찾기
            const selectedGuest = slot.guestTeams.find(g => g.id === selectedGuestId);
            if (!selectedGuest) throw new Error("선택된 게스트를 찾을 수 없습니다.");

            // 호스트와 선택된 게스트만 FIRST_CONFIRMED 상태로 변경
            const result = await updateTeamsBulk(
                [slot.hostTeam.id!, selectedGuestId],
                { status: 'FIRST_CONFIRMED' }
            );

            if (!result.success) throw new Error(result.error);
            if (!result.data || result.data.length === 0) {
                throw new Error("상태 업데이트 실패.");
            }

            // 1차 매칭 완료 알림톡 발송
            const dateStr = formatDateForNotification(selectedDate);
            const timeStr = slot.time;

            await sendFirstMatchCompleteNotification(
                slot.hostTeam.phone,
                dateStr,
                timeStr,
                selectedGuest.university
            );

            await sendFirstMatchCompleteNotification(
                selectedGuest.phone,
                dateStr,
                timeStr,
                slot.hostTeam.university
            );

            showAlert("1차 매칭이 확정되었습니다.\n양팀에게 알림톡이 발송되었습니다.\n인스타 교환 후 최종 확정을 진행해주세요.");
            await onSuccess();
        } catch (err: any) {
            console.error("firstMatch Error:", err);
            showAlert(`1차 매칭 확정 중 오류:\n${err.message}`);
        } finally {
            setProcessing(false);
        }
    }, [processing, showAlert]);

    // 최종 매칭 확정
    const executeFinalMatch = useCallback(async (
        slot: AdminSlot,
        selectedGuestId: string,
        onSuccess: () => Promise<void>
    ) => {
        if (processing) return;
        setProcessing(true);

        try {
            if (!slot.hostTeam) return;

            // 1. 호스트와 선택된 게스트 MATCH_CONFIRMED 상태로 변경
            const result = await updateTeamsBulk(
                [slot.hostTeam.id!, selectedGuestId],
                { status: 'MATCH_CONFIRMED' }
            );

            if (!result.success) throw new Error(result.error);
            if (!result.data || result.data.length === 0) {
                throw new Error("상태 업데이트 실패.");
            }

            // 2. 나머지 게스트 삭제
            const otherGuestIds = slot.guestTeams
                .filter(g => g.id !== selectedGuestId)
                .map(g => g.id);

            if (otherGuestIds.length > 0) {
                const deleteResult = await deleteTeamsBulk(otherGuestIds);
                if (!deleteResult.success) {
                    console.error("Warning: Failed to delete other guests", deleteResult.error);
                    showAlert("매칭은 확정되었으나 탈락자 삭제 중 오류가 발생했습니다: " + deleteResult.error);
                }
            }

            showAlert("🎉 최종 매칭이 완료되었습니다!");
            await onSuccess();
        } catch (err: any) {
            console.error("finalMatch Error:", err);
            showAlert(`최종 매칭 확정 중 오류:\n${err.message}`);
        } finally {
            setProcessing(false);
        }
    }, [processing, showAlert]);

    // 1차 매칭 취소 (슬롯 데이터 전체 삭제)
    const executeCancelFirstMatch = useCallback(async (
        slot: AdminSlot,
        onSuccess: () => Promise<void>
    ) => {
        if (processing) return;
        setProcessing(true);

        try {
            // 해당 슬롯의 모든 팀 ID 수집
            const allTeamIds = [
                slot.hostTeam?.id,
                ...slot.guestTeams.map(g => g.id)
            ].filter(Boolean) as string[];

            if (allTeamIds.length > 0) {
                const result = await deleteTeamsBulk(allTeamIds);
                if (!result.success) throw new Error(result.error);
            }

            showAlert("1차 매칭이 취소되고 데이터가 초기화되었습니다.");
            await onSuccess();
        } catch (err: any) {
            showAlert(`초기화 실패: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    }, [processing, showAlert]);

    return {
        processing,
        executeFirstMatch,
        executeFinalMatch,
        executeCancelFirstMatch,
    };
}
