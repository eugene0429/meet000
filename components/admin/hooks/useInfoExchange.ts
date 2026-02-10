import { useState, useCallback } from 'react';
import { updateTeam, deleteTeamsBulk } from '../../../lib/adminApiClient';
import {
    sendPaymentRequestNotification,
    sendInfoDeliveredNotification,
    sendInfoDeniedContinueNotification,
    sendWaitOtherTeamNotification,
    sendFinalPaymentRequestNotification,
    sendProcessCancelledNotification,
} from '../../../lib/notificationApiClient';
import { AdminSlot } from '../types';
import { formatDateForNotification } from '../utils/mapTeamData';
import { SystemConfig } from '../../../services/configService';

interface UseInfoExchangeReturn {
    processing: boolean;
    updateTeamInfoPreference: (
        teamId: string,
        field: 'wants_info' | 'shares_info' | 'has_paid' | 'has_confirmed',
        value: boolean | null,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
    handleNextStep: (
        slot: AdminSlot,
        selectedDate: Date,
        systemConfig: SystemConfig | null,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
    handlePaymentConfirm: (
        teamId: string,
        slot: AdminSlot,
        selectedDate: Date,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
    handleConfirmDecision: (
        teamId: string,
        decision: boolean,
        slot: AdminSlot,
        selectedDate: Date,
        systemConfig: SystemConfig | null,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
    // 공개방 전용 함수
    updateInfoExchangeStatus: (
        teamId: string,
        status: 'PENDING' | 'PROCEED' | 'STOP' | null,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
    handlePublicRoomCancelMatch: (
        slot: AdminSlot,
        selectedDate: Date,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
}

/**
 * 정보 교환 및 결제 프로세스를 담당하는 Hook
 * API 호출 (서버에서 Service Role Key 사용)
 */
export function useInfoExchange(
    showAlert: (message: string) => void
): UseInfoExchangeReturn {
    const [processing, setProcessing] = useState(false);

    // 팀 정보 선호도 업데이트
    const updateTeamInfoPreference = useCallback(async (
        teamId: string,
        field: 'wants_info' | 'shares_info' | 'has_paid' | 'has_confirmed',
        value: boolean | null,
        onSuccess: () => Promise<void>
    ) => {
        try {
            const result = await updateTeam(teamId, { [field]: value });
            if (!result.success) throw new Error(result.error);
            await onSuccess();
        } catch (err: any) {
            showAlert(`업데이트 실패: ${err.message}`);
        }
    }, [showAlert]);

    // 다음 스텝 진행
    const handleNextStep = useCallback(async (
        slot: AdminSlot,
        selectedDate: Date,
        systemConfig: SystemConfig | null,
        onSuccess: () => Promise<void>
    ) => {
        if (!slot.hostTeam) return;
        const guest = slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED');
        if (!guest) return;

        const host = slot.hostTeam;
        const dateStr = formatDateForNotification(selectedDate);
        const timeStr = slot.time;

        // 설정 확인
        if (host.wantsInfo === null || host.wantsInfo === undefined ||
            host.sharesInfo === null || host.sharesInfo === undefined ||
            guest.wantsInfo === null || guest.wantsInfo === undefined ||
            guest.sharesInfo === null || guest.sharesInfo === undefined) {
            showAlert("호스트와 게스트 모두 정보 원함 / 정보 공개 여부를 설정해주세요.");
            return;
        }

        // 양쪽 다 정보를 원하지 않으면 바로 최종 결제 단계로
        if (!host.wantsInfo && !guest.wantsInfo) {
            setProcessing(true);
            try {
                const hostPrice = host.gender === 'MALE' ? (slot.malePrice ?? 10000) : (slot.femalePrice ?? 10000);
                const guestPrice = guest.gender === 'MALE' ? (slot.malePrice ?? 10000) : (slot.femalePrice ?? 10000);

                await sendFinalPaymentRequestNotification(
                    host.phone,
                    dateStr,
                    timeStr,
                    hostPrice.toLocaleString(),
                    host.headCount.toString(),
                    (hostPrice * host.headCount).toLocaleString()
                );
                await sendFinalPaymentRequestNotification(
                    guest.phone,
                    dateStr,
                    timeStr,
                    guestPrice.toLocaleString(),
                    guest.headCount.toString(),
                    (guestPrice * guest.headCount).toLocaleString()
                );

                await updateTeam(host.id!, { process_step: 'READY_FOR_FINAL' });
                await updateTeam(guest.id!, { process_step: 'READY_FOR_FINAL' });

                showAlert("✅ 양쪽 팀 모두 정보 열람을 원하지 않습니다.\n최종 매칭 결제 안내 알림톡이 발송되었습니다.\n양팀 결제 확인 후 최종 매칭을 진행해주세요.");
                await onSuccess();
            } catch (err: any) {
                showAlert(`오류: ${err.message}`);
            } finally {
                setProcessing(false);
            }
            return;
        }

        // 복잡한 케이스
        setProcessing(true);
        try {
            let actions: string[] = [];

            // 호스트 프로세스 단계 결정
            let hostProcessStep = 'WAITING_OTHER';
            if (host.wantsInfo) {
                if (guest.sharesInfo) {
                    const amount = systemConfig?.paymentAmountFirst || '5000';
                    const link = systemConfig?.paymentLinkFirst || 'https://pay.example.com';
                    await sendPaymentRequestNotification(host.phone, dateStr, timeStr, amount, link);
                    actions.push('호스트에게 결제 안내 발송 (06)');
                    hostProcessStep = 'WAITING_PAYMENT';
                } else {
                    await sendInfoDeniedContinueNotification(host.phone, dateStr, timeStr);
                    actions.push('호스트에게 비공개 확인 발송 (08)');
                    hostProcessStep = 'WAITING_CONFIRM';
                }
            } else {
                if (guest.wantsInfo) {
                    await sendWaitOtherTeamNotification(host.phone, dateStr, timeStr);
                    actions.push('호스트에게 대기 안내 발송 (09)');
                } else {
                    hostProcessStep = 'COMPLETED';
                }
            }

            // 게스트 프로세스 단계 결정
            let guestProcessStep = 'WAITING_OTHER';
            if (guest.wantsInfo) {
                if (host.sharesInfo) {
                    const amount = systemConfig?.paymentAmountFirst || '5000';
                    const link = systemConfig?.paymentLinkFirst || 'https://pay.example.com';
                    await sendPaymentRequestNotification(guest.phone, dateStr, timeStr, amount, link);
                    actions.push('게스트에게 결제 안내 발송 (06)');
                    guestProcessStep = 'WAITING_PAYMENT';
                } else {
                    await sendInfoDeniedContinueNotification(guest.phone, dateStr, timeStr);
                    actions.push('게스트에게 비공개 확인 발송 (08)');
                    guestProcessStep = 'WAITING_CONFIRM';
                }
            } else {
                if (host.wantsInfo) {
                    await sendWaitOtherTeamNotification(guest.phone, dateStr, timeStr);
                    actions.push('게스트에게 대기 안내 발송 (09)');
                } else {
                    guestProcessStep = 'COMPLETED';
                }
            }

            await updateTeam(host.id!, { process_step: hostProcessStep });
            await updateTeam(guest.id!, { process_step: guestProcessStep });

            showAlert(`✅ 다음 스텝 진행 완료!\n\n${actions.join('\n')}\n\n각 팀의 응답을 확인 후 아래 버튼으로 진행해주세요.`);
            await onSuccess();
        } catch (err: any) {
            showAlert(`오류: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    }, [showAlert]);

    // 결제 확인 처리
    const handlePaymentConfirm = useCallback(async (
        teamId: string,
        slot: AdminSlot,
        selectedDate: Date,
        onSuccess: () => Promise<void>
    ) => {
        setProcessing(true);
        try {
            const host = slot.hostTeam;
            const guest = slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED');
            if (!host || !guest) return;

            const dateStr = formatDateForNotification(selectedDate);
            const timeStr = slot.time;

            const otherTeam = teamId === host.id ? guest : host;
            const memberInfo = otherTeam.members?.map(m =>
                `${m.university} ${m.major} (${m.age}세, @${m.instagramId || '미입력'})`
            ).join('\n') || '정보 없음';

            const team = teamId === host.id ? host : guest;
            await sendInfoDeliveredNotification(team.phone, dateStr, timeStr, memberInfo);

            await updateTeam(teamId, {
                has_paid: true,
                process_step: 'WAITING_CONFIRM'
            });

            showAlert("✅ 결제 확인 및 정보 전달 완료!");
            await onSuccess();
        } catch (err: any) {
            showAlert(`오류: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    }, [showAlert]);

    // 진행 의사 확인 처리
    const handleConfirmDecision = useCallback(async (
        teamId: string,
        decision: boolean,
        slot: AdminSlot,
        selectedDate: Date,
        systemConfig: SystemConfig | null,
        onSuccess: () => Promise<void>
    ) => {
        setProcessing(true);
        try {
            const host = slot.hostTeam;
            const guest = slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED');
            if (!host || !guest) return;

            const dateStr = formatDateForNotification(selectedDate);
            const timeStr = slot.time;

            if (decision) {
                // 진행 선택
                await updateTeam(teamId, {
                    has_confirmed: true,
                    process_step: 'READY_FOR_FINAL'
                });

                // 상대팀도 READY_FOR_FINAL인지 확인
                const otherTeam = teamId === host.id ? guest : host;

                await onSuccess();

                // 상대팀 상태에 따라 최종 결제 안내
                if (otherTeam.processStep === 'READY_FOR_FINAL' || otherTeam.processStep === 'WAITING_OTHER') {
                    const hostPrice = host.gender === 'MALE' ? (slot.malePrice ?? 10000) : (slot.femalePrice ?? 10000);
                    const guestPrice = guest.gender === 'MALE' ? (slot.malePrice ?? 10000) : (slot.femalePrice ?? 10000);

                    await sendFinalPaymentRequestNotification(
                        host.phone,
                        dateStr,
                        timeStr,
                        hostPrice.toLocaleString(),
                        host.headCount.toString(),
                        (hostPrice * host.headCount).toLocaleString()
                    );
                    await sendFinalPaymentRequestNotification(
                        guest.phone,
                        dateStr,
                        timeStr,
                        guestPrice.toLocaleString(),
                        guest.headCount.toString(),
                        (guestPrice * guest.headCount).toLocaleString()
                    );
                    showAlert("✅ 양팀 모두 진행에 동의하셨습니다!\n최종 매칭 결제 안내가 발송되었습니다.");
                } else {
                    showAlert("✅ 진행 의사 확인 완료!\n상대팀의 결정을 기다리고 있습니다.");
                }
            } else {
                // 취소 처리 및 슬롯 초기화
                await sendProcessCancelledNotification(host.phone, dateStr, timeStr);
                await sendProcessCancelledNotification(guest.phone, dateStr, timeStr);

                // 해당 슬롯의 모든 팀 삭제
                const allTeamIds = [
                    slot.hostTeam?.id,
                    ...slot.guestTeams.map(g => g.id)
                ].filter(Boolean) as string[];

                if (allTeamIds.length > 0) {
                    await deleteTeamsBulk(allTeamIds);
                }

                showAlert("❌ 매칭이 취소되고 슬롯이 초기화되었습니다.");
                await onSuccess();
            }
        } catch (err: any) {
            showAlert(`오류: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    }, [showAlert]);

    // 공개방 전용: 정보 교환 상태 업데이트
    const updateInfoExchangeStatus = useCallback(async (
        teamId: string,
        status: 'PENDING' | 'PROCEED' | 'STOP' | null,
        onSuccess: () => Promise<void>
    ) => {
        try {
            const result = await updateTeam(teamId, { info_exchange_status: status });
            if (!result.success) throw new Error(result.error);
            await onSuccess();
        } catch (err: any) {
            showAlert(`상태 업데이트 실패: ${err.message}`);
        }
    }, [showAlert]);

    // 공개방 전용: 한쪽이 STOP 선택 시 매칭 취소 처리
    const handlePublicRoomCancelMatch = useCallback(async (
        slot: AdminSlot,
        selectedDate: Date,
        onSuccess: () => Promise<void>
    ) => {
        setProcessing(true);
        try {
            const host = slot.hostTeam;
            const guest = slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED');
            if (!host || !guest) return;

            const dateStr = formatDateForNotification(selectedDate);
            const timeStr = slot.time;

            // 양팀에게 취소 알림 발송
            await sendProcessCancelledNotification(host.phone, dateStr, timeStr);
            await sendProcessCancelledNotification(guest.phone, dateStr, timeStr);

            // 해당 슬롯의 모든 팀 삭제
            const allTeamIds = [
                slot.hostTeam?.id,
                ...slot.guestTeams.map(g => g.id)
            ].filter(Boolean) as string[];

            if (allTeamIds.length > 0) {
                await deleteTeamsBulk(allTeamIds);
            }

            showAlert("❌ 한쪽이 중단을 선택하여 매칭이 취소되었습니다.\n슬롯이 초기화되었습니다.");
            await onSuccess();
        } catch (err: any) {
            showAlert(`취소 처리 실패: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    }, [showAlert]);

    return {
        processing,
        updateTeamInfoPreference,
        handleNextStep,
        handlePaymentConfirm,
        handleConfirmDecision,
        updateInfoExchangeStatus,
        handlePublicRoomCancelMatch,
    };
}
