import { useState, useCallback } from 'react';
import { updateTeamsBulk, deleteTeamsBulk } from '../../../lib/adminApiClient';
import {
    sendFirstMatchCompleteNotification,
    sendPublicRoomFirstMatchNotification,
    sendFinalMatchCompleteNotification,
    sendMatchReminderNotification,
    sendDecisionTimeNotification,
    sendFinalPaymentRequestNotification,
    sendNotSelectedNotification
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
    // 비공개방: 바로 최종 매칭으로 처리
    // 공개방: FIRST_CONFIRMED 상태로 변경 후 인스타 교환 프로세스 진행
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

            const isPublicRoom = slot.isPublicRoom || false;
            const dateStr = formatDateForNotification(selectedDate);
            const timeStr = slot.time;
            const hostId = slot.hostTeam.representativeId || '호스트';
            const guestId = selectedGuest.representativeId || '게스트';

            if (isPublicRoom) {
                // 🔓 공개방: 1차 매칭 -> 인스타 교환 프로세스
                const result = await updateTeamsBulk(
                    [slot.hostTeam.id!, selectedGuestId],
                    {
                        status: 'FIRST_CONFIRMED',
                        info_exchange_status: 'PENDING'  // 응답 대기 상태
                    }
                );

                if (!result.success) throw new Error(result.error);
                if (!result.data || result.data.length === 0) {
                    throw new Error("상태 업데이트 실패.");
                }

                // 상대팀 인스타그램 정보 생성
                const hostTeamInstaInfo = slot.hostTeam.members
                    .map((m, i) => `멤버${i + 1} (${m.university} ${m.major}) @${m.instagramId || '미입력'}`)
                    .join('\n');

                const guestTeamInstaInfo = selectedGuest.members
                    .map((m, i) => `멤버${i + 1} (${m.university} ${m.major}) @${m.instagramId || '미입력'}`)
                    .join('\n');

                // 공개방 1차 매칭 알림톡 발송 (상대팀 인스타 정보 포함)
                await sendPublicRoomFirstMatchNotification(
                    slot.hostTeam.phone,
                    dateStr,
                    timeStr,
                    hostId,
                    guestTeamInstaInfo  // 호스트에게는 게스트팀 인스타 정보
                );
                await sendPublicRoomFirstMatchNotification(
                    selectedGuest.phone,
                    dateStr,
                    timeStr,
                    guestId,
                    hostTeamInstaInfo  // 게스트에게는 호스트팀 인스타 정보
                );

                showAlert("📸 공개방 1차 매칭이 확정되었습니다.\n\n양팀에게 상대팀 인스타그램 정보가 발송되었습니다.\n양팀의 '진행/중단' 응답을 확인해주세요.");
            } else {
                // 🔒 비공개방: 1차 매칭 -> 최종 결제 요청 (Template 10)
                // 바로 최종 매칭(MATCH_CONFIRMED)으로 가지 않고, 결제 단계를 거침

                // 1. 상태 업데이트 (FIRST_CONFIRMED, READY_FOR_FINAL)
                const result = await updateTeamsBulk(
                    [slot.hostTeam.id!, selectedGuestId],
                    {
                        status: 'FIRST_CONFIRMED',
                        process_step: 'READY_FOR_FINAL', // 결제 대기 상태 (시스템상 READY_FOR_FINAL이 결제 요청 후 상태임)
                        wants_info: false, // 정보 교환 생략
                        shares_info: false
                    }
                );

                if (!result.success) throw new Error(result.error);
                if (!result.data || result.data.length === 0) {
                    throw new Error("상태 업데이트 실패.");
                }

                // 2. 나머지 게스트 삭제 및 탈락 알림 발송
                const otherGuests = slot.guestTeams.filter(g => g.id !== selectedGuestId);
                const otherGuestIds = otherGuests.map(g => g.id);

                // 탈락한 게스트들에게 알림 발송 (Template 05)
                await Promise.all(otherGuests.map(guest =>
                    sendNotSelectedNotification(
                        guest.phone,
                        dateStr,
                        timeStr
                    )
                ));

                if (otherGuestIds.length > 0) {
                    const deleteResult = await deleteTeamsBulk(otherGuestIds);
                    if (!deleteResult.success) {
                        console.error("Warning: Failed to delete other guests", deleteResult.error);
                    }
                }

                // 3. 최종 매칭 결제 안내 알림톡 발송 (Template 10)
                // 가격 계산 (기본값 5000원으로 수정)
                const hostPrice = slot.hostTeam.gender === 'MALE'
                    ? (slot.malePrice ?? 5000)
                    : (slot.femalePrice ?? 5000);

                const guestPrice = selectedGuest.gender === 'MALE'
                    ? (slot.malePrice ?? 5000)
                    : (slot.femalePrice ?? 5000);

                await sendFinalPaymentRequestNotification(
                    slot.hostTeam.phone,
                    dateStr,
                    timeStr,
                    hostPrice.toLocaleString(),
                    slot.hostTeam.headCount.toString(),
                    (hostPrice * slot.hostTeam.headCount).toLocaleString()
                );

                await sendFinalPaymentRequestNotification(
                    selectedGuest.phone,
                    dateStr,
                    timeStr,
                    guestPrice.toLocaleString(),
                    selectedGuest.headCount.toString(),
                    (guestPrice * selectedGuest.headCount).toLocaleString()
                );

                showAlert("🔒 비공개방 1차 매칭 완료!\n\n양팀에게 '최종 매칭 결제 안내' 알림톡(10)이 발송되었습니다.\n결제가 확인되면 최종 매칭을 확정해주세요.");
            }

            await onSuccess();
        } catch (err: any) {
            console.error("firstMatch Error:", err);
            showAlert(`매칭 확정 중 오류:\n${err.message}`);
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

            // 3. 알림톡 발송 (최종 매칭 완료 + 리마인더 예약)
            try {
                const selectedGuest = slot.guestTeams.find(g => g.id === selectedGuestId);
                if (selectedGuest) {
                    const dateStr = formatDateForNotification(new Date(slot.date));
                    const timeStr = slot.time;
                    const hostId = slot.hostTeam.representativeId || '호스트';
                    const guestId = selectedGuest.representativeId || '게스트';

                    // 11. 최종 매칭 완료 알림 (즉시 발송)
                    await sendFinalMatchCompleteNotification(
                        slot.hostTeam.phone,
                        dateStr,
                        timeStr,
                        hostId,
                        guestId
                    );
                    await sendFinalMatchCompleteNotification(
                        selectedGuest.phone,
                        dateStr,
                        timeStr,
                        hostId,
                        guestId
                    );

                    // 20. 리마인더 예약 (매칭 24시간 전)
                    const [year, month, day] = slot.date.split('-').map(Number);
                    const [hour, minute] = slot.time.split(':').map(Number);
                    // slot.date is YYYY-MM-DD. Date constructor with parts treats as local time (browser/server timezone)
                    const meetingDate = new Date(year, month - 1, day, hour, minute);
                    const reminderDate = new Date(meetingDate.getTime() - 24 * 60 * 60 * 1000);

                    // 22. 선택 시간 안내 예약 (매칭 시작 40분 후)
                    const decisionDate = new Date(meetingDate.getTime() + 40 * 60 * 1000);

                    let reminderScheduled = false;
                    let decisionScheduled = false;

                    // 현재 시간보다 10분 이상 미래일 경우에만 예약 발송
                    if (reminderDate.getTime() > Date.now() + 10 * 60 * 1000) {
                        const scheduledTime = reminderDate.toISOString();
                        const hostResult = await sendMatchReminderNotification(slot.hostTeam.phone, dateStr, timeStr, scheduledTime);
                        const guestResult = await sendMatchReminderNotification(selectedGuest.phone, dateStr, timeStr, scheduledTime);

                        if (hostResult.success && guestResult.success) {
                            reminderScheduled = true;
                        } else {
                            console.error("리마인더 예약 실패:", hostResult, guestResult);
                            const errorMsg = !hostResult.success ? hostResult.message : guestResult.message;
                            showAlert(`리마인더 예약 실패: ${errorMsg}`);
                            // 실패해도 계속 진행할지 여부는 상황에 따라 다르지만, 여기서는 알림을 띄우고 진행
                        }
                    }

                    // 22. 선택 시간 안내 예약 (매칭 시작 40분 후)
                    if (decisionDate.getTime() > Date.now() + 10 * 60 * 1000) {
                        const decisionScheduledTime = decisionDate.toISOString();
                        const hostResult = await sendDecisionTimeNotification(
                            slot.hostTeam.phone,
                            hostId,
                            slot.hostTeam.gender,
                            decisionScheduledTime
                        );
                        const guestResult = await sendDecisionTimeNotification(
                            selectedGuest.phone,
                            guestId,
                            selectedGuest.gender,
                            decisionScheduledTime
                        );

                        if (hostResult.success && guestResult.success) {
                            decisionScheduled = true;
                        } else {
                            console.error("선택 시간 안내 예약 실패:", hostResult, guestResult);
                            const errorMsg = !hostResult.success ? hostResult.message : guestResult.message;
                            showAlert(`선택 시간 안내 예약 실패: ${errorMsg}`);
                        }
                    }

                    // 알림 메시지 생성
                    let alertMsg = "🎉 최종 매칭이 완료되었습니다!\n(알림톡 발송 완료";
                    if (reminderScheduled && decisionScheduled) {
                        alertMsg += " + D-1 리마인더 + 40분 후 선택안내 예약 완료)";
                    } else if (reminderScheduled) {
                        alertMsg += " + D-1 리마인더 예약 완료, 선택안내는 시점이 지나 생략됨)";
                    } else if (decisionScheduled) {
                        alertMsg += " + 40분 후 선택안내 예약 완료, 리마인더는 시점이 지나 생략됨)";
                    } else {
                        alertMsg += ", 예약 알림은 시점이 지나 모두 생략됨)";
                    }
                    showAlert(alertMsg);
                }
            } catch (notiErr) {
                console.error("Notification Error:", notiErr);
                showAlert("매칭은 확정되었으나 알림톡 발송 중 오류가 발생했습니다.");
            }

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
