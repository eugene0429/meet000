import { useState, useCallback } from 'react';
import { updateTeam, deleteTeam, deleteTeamsBulk } from '../../../lib/adminApiClient';
import {
    sendHostCancelledAllNotification,
    sendGuestCancelledAfterFirstNotification,
    sendGuestCancelledHostNotifyNotification,
    sendGuestCancelledBeforeFirstNotification,
    sendGuestCancelledBeforeHostNotifyNotification,
    sendStudentIdRejectedNotification,
    sendRefundGuideNotification,
    sendNoRefundNoticeNotification,
    sendGuestAppliedNotification,
    sendHostNewApplicantNotification
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
    rejectVerification: (teamId: string, phone: string, slot: AdminSlot, onSuccess: () => Promise<void>) => Promise<void>;
    processFinalMatchCancellation: (
        cancelledTeamId: string,
        slot: AdminSlot,
        hoursRemaining: number,
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

            const verifiedTeam = result.data[0];

            // 게스트인 경우, 학생증 승인 후 알림톡 발송 (템플릿 02, 03)
            if (verifiedTeam.role === 'GUEST') {
                // API를 통해 안전하게 데이터 조회 (RLS 우회)
                const { getGuestNotificationData } = await import('../../../lib/adminApiClient');
                const notificationDataResult = await getGuestNotificationData(teamId);

                if (!notificationDataResult.success || !notificationDataResult.data) {
                    const errorMsg = notificationDataResult.error || '알림 데이터 조회 실패';
                    throw new Error(`알림 데이터 조회 실패: ${errorMsg}`);
                }

                const { hostTeam, guestMembers, guestCount, maxApplicants } = notificationDataResult.data;

                if (hostTeam) {
                    const dateFormatted = formatDateForNotification(new Date(verifiedTeam.date));
                    const timeFormatted = verifiedTeam.time;
                    const hostId = hostTeam.representative_id || '알수없음';
                    const guestId = verifiedTeam.representative_id;

                    // 템플릿 02: 게스트 신청 완료 알림 (게스트 본인에게)
                    await sendGuestAppliedNotification(
                        verifiedTeam.phone,
                        dateFormatted,
                        timeFormatted,
                        hostId,
                        guestId
                    );

                    // 템플릿 03: 호스트에게 새 신청자 알림
                    if (hostTeam.phone) {
                        const guestInfoString = guestMembers
                            .map((m: any) => `${m.university} ${m.major} ${m.age}세`)
                            .join('\n') || '정보 없음';

                        await sendHostNewApplicantNotification(
                            hostTeam.phone,
                            dateFormatted,
                            timeFormatted,
                            hostId,
                            guestId,
                            guestInfoString,
                            verifiedTeam.intro || '소개 없음',
                            guestCount,
                            maxApplicants
                        );
                    }
                }
            }

            await onSuccess();
        } catch (err: any) {
            showAlert(`승인 처리 실패: ${err.message}`);
        }
    }, [showAlert]);

    // 학생증 반려 및 팀 삭제
    const rejectVerification = useCallback(async (
        teamId: string,
        phone: string,
        slot: AdminSlot,
        onSuccess: () => Promise<void>
    ) => {
        if (!teamId) return;
        if (!confirm('정말 학생증을 반려하고 팀 데이터를 삭제하시겠습니까?')) return;

        setProcessing(true);
        try {
            // 알림톡 발송
            const dateStr = formatDateForNotification(new Date(slot.date));
            const timeStr = slot.time;
            await sendStudentIdRejectedNotification(phone, dateStr, timeStr);

            // 팀 삭제
            const result = await deleteTeam(teamId);
            if (!result.success) throw new Error(result.error);

            showAlert('반려 처리 및 알림톡 발송이 완료되었습니다.');
            await onSuccess();
        } catch (err: any) {
            showAlert(`반려 처리 실패: ${err.message}`);
        } finally {
            setProcessing(false);
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
                        // 1차 매칭 전 삭제
                        const guestId = guestTeam.representativeId || '게스트';
                        await sendGuestCancelledBeforeFirstNotification(guestTeam.phone, dateStr, timeStr);
                        await sendGuestCancelledBeforeHostNotifyNotification(slot.hostTeam.phone, dateStr, timeStr, guestId);
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

    // 최종 매칭 취소 처리 (환불 로직 포함)
    const processFinalMatchCancellation = useCallback(async (
        cancelledTeamId: string,
        slot: AdminSlot,
        hoursRemaining: number,
        onSuccess: () => Promise<void>
    ) => {
        setProcessing(true);
        try {
            // 취소한 팀과 상대 팀 식별
            let cancelledTeamPhone = '';
            let otherTeamPhone = '';

            const isHostCancelled = slot.hostTeam?.id === cancelledTeamId;
            if (isHostCancelled) {
                cancelledTeamPhone = slot.hostTeam!.phone;
                const confirmedGuest = slot.guestTeams.find(g => g.status === 'MATCH_CONFIRMED');
                if (confirmedGuest) otherTeamPhone = confirmedGuest.phone;
            } else {
                const cancelledGuest = slot.guestTeams.find(g => g.id === cancelledTeamId);
                cancelledTeamPhone = cancelledGuest?.phone || '';
                otherTeamPhone = slot.hostTeam?.phone || '';
            }

            const dateStr = formatDateForNotification(new Date(slot.date));
            const timeStr = slot.time;

            if (hoursRemaining > 48) {
                // 48시간 이전: 모두 환불 안내
                if (cancelledTeamPhone) await sendRefundGuideNotification(cancelledTeamPhone, dateStr, timeStr);
                if (otherTeamPhone) await sendRefundGuideNotification(otherTeamPhone, dateStr, timeStr);
            } else {
                // 48시간 이내: 취소팀 환불 불가, 상대팀 환불 안내
                if (cancelledTeamPhone) await sendNoRefundNoticeNotification(cancelledTeamPhone, dateStr, timeStr);
                if (otherTeamPhone) await sendRefundGuideNotification(otherTeamPhone, dateStr, timeStr);
            }

            // 슬롯 내 모든 팀 삭제
            const allIds = [slot.hostTeam?.id, ...slot.guestTeams.map(g => g.id)].filter(Boolean) as string[];
            if (allIds.length > 0) {
                const result = await deleteTeamsBulk(allIds);
                if (!result.success) throw new Error(result.error);
            }

            showAlert('최종 매칭 취소 처리 및 알림톡 발송 완료');
            await onSuccess();
        } catch (err: any) {
            showAlert(`취소 처리 실패: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    }, [showAlert]);

    return {
        processing,
        executeVerify,
        confirmReject,
        rejectVerification,
        processFinalMatchCancellation,
    };
}
