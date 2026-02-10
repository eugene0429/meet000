import { useState, useCallback } from 'react';
import { getDailyConfig, upsertDailyConfig } from '../../../lib/adminApiClient';
import { AdminSlot } from '../types';

interface UseSlotOperationsReturn {
    processing: boolean;
    toggleSlotOpen: (slot: AdminSlot, onSuccess: () => Promise<void>) => Promise<void>;
    updateSlotPrice: (
        slot: AdminSlot,
        gender: 'male' | 'female',
        price: number,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
    updateMaxApplicants: (
        slot: AdminSlot,
        newMax: number,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
    updatePublicRoomExtraPrice: (
        slot: AdminSlot,
        price: number,
        onSuccess: () => Promise<void>
    ) => Promise<void>;
}

/**
 * 슬롯 설정 변경을 담당하는 Hook
 * API 호출 (서버에서 Service Role Key 사용)
 */
export function useSlotOperations(
    showAlert: (message: string) => void
): UseSlotOperationsReturn {
    const [processing, setProcessing] = useState(false);

    // 슬롯 활성화/비활성화 토글
    const toggleSlotOpen = useCallback(async (slot: AdminSlot, onSuccess: () => Promise<void>) => {
        if (processing) return;
        setProcessing(true);

        try {
            const configResult = await getDailyConfig(slot.date);
            const currentConfig = configResult.data;

            let openTimes: string[] = currentConfig?.open_times || [];
            const maxApplicants = currentConfig?.max_applicants || 3;

            // 토글: 존재하면 제거, 없으면 추가
            if (openTimes.includes(slot.time)) {
                openTimes = openTimes.filter(t => t !== slot.time);
            } else {
                openTimes = [...openTimes, slot.time].sort();
            }

            const result = await upsertDailyConfig(slot.date, {
                openTimes,
                maxApplicants,
                slotConfigs: currentConfig?.slot_configs || {}
            });

            if (!result.success) throw new Error(result.error);
            await onSuccess();
        } catch (err: any) {
            showAlert(`설정 변경 실패: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    }, [processing, showAlert]);

    // 슬롯 가격 업데이트
    const updateSlotPrice = useCallback(async (
        slot: AdminSlot,
        gender: 'male' | 'female',
        price: number,
        onSuccess: () => Promise<void>
    ) => {
        if (processing) return;
        setProcessing(true);

        try {
            const configResult = await getDailyConfig(slot.date);
            const currentConfig = configResult.data;

            const currentSlotConfigs = currentConfig?.slot_configs || {};
            const thisSlotConfig = currentSlotConfigs[slot.time] || {};

            if (gender === 'male') thisSlotConfig.malePrice = price;
            if (gender === 'female') thisSlotConfig.femalePrice = price;

            const newSlotConfigs = {
                ...currentSlotConfigs,
                [slot.time]: thisSlotConfig
            };

            const result = await upsertDailyConfig(slot.date, {
                slotConfigs: newSlotConfigs,
                openTimes: currentConfig?.open_times || [],
                maxApplicants: currentConfig?.max_applicants || 3
            });

            if (!result.success) throw new Error(result.error);
            await onSuccess();
        } catch (err: any) {
            showAlert(`가격 업데이트 실패: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    }, [processing, showAlert]);

    // 최대 신청자 수 업데이트
    const updateMaxApplicants = useCallback(async (
        slot: AdminSlot,
        newMax: number,
        onSuccess: () => Promise<void>
    ) => {
        try {
            const configResult = await getDailyConfig(slot.date);
            const currentConfig = configResult.data;

            const currentSlotConfigs = currentConfig?.slot_configs || {};
            const thisSlotConfig = currentSlotConfigs[slot.time] || {};

            thisSlotConfig.maxApplicants = newMax;

            const newSlotConfigs = {
                ...currentSlotConfigs,
                [slot.time]: thisSlotConfig
            };

            const result = await upsertDailyConfig(slot.date, {
                slotConfigs: newSlotConfigs,
                openTimes: currentConfig?.open_times || [],
                maxApplicants: currentConfig?.max_applicants || 3
            });

            if (!result.success) {
                showAlert(`인원 설정 실패: ${result.error}`);
            } else {
                await onSuccess();
            }
        } catch (err: any) {
            showAlert(`인원 설정 실패: ${err.message}`);
        }
    }, [showAlert]);

    // 공개방 추가 금액 업데이트
    const updatePublicRoomExtraPrice = useCallback(async (
        slot: AdminSlot,
        price: number,
        onSuccess: () => Promise<void>
    ) => {
        try {
            const configResult = await getDailyConfig(slot.date);
            const currentConfig = configResult.data;

            const currentSlotConfigs = currentConfig?.slot_configs || {};
            const thisSlotConfig = currentSlotConfigs[slot.time] || {};

            thisSlotConfig.publicRoomExtraPrice = price;

            const newSlotConfigs = {
                ...currentSlotConfigs,
                [slot.time]: thisSlotConfig
            };

            const result = await upsertDailyConfig(slot.date, {
                slotConfigs: newSlotConfigs,
                openTimes: currentConfig?.open_times || [],
                maxApplicants: currentConfig?.max_applicants || 3
            });

            if (!result.success) {
                showAlert(`공개방 추가금액 설정 실패: ${result.error}`);
            } else {
                await onSuccess();
            }
        } catch (err: any) {
            showAlert(`공개방 추가금액 설정 실패: ${err.message}`);
        }
    }, [showAlert]);

    return {
        processing,
        toggleSlotOpen,
        updateSlotPrice,
        updateMaxApplicants,
        updatePublicRoomExtraPrice,
    };
}
