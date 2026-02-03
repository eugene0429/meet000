
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, Trash2, MousePointerClick, Users, FileText, AlertCircle, AlertTriangle } from 'lucide-react';
import { supabase, supabaseAdmin, isAdminModeEnabled } from '../lib/supabaseClient';
import { TeamInfo } from '../types';
import {
  formatDateForNotification,
  sendFinalMatchCompleteNotification,
  sendPaymentRequestNotification,
  sendInfoDeniedContinueNotification,
  sendWaitOtherTeamNotification,
  sendInfoDeliveredNotification,
  sendProcessCancelledNotification,
  sendGuestCancelledAfterFirstNotification,
  sendGuestCancelledHostNotifyNotification,
  sendHostCancelledAllNotification,
  sendFinalPaymentRequestNotification,
  sendFirstMatchCompleteNotification,
  sendGuestCancelledBeforeFirstNotification,
  sendGuestCancelledBeforeHostNotifyNotification,
  updateNotificationTemplates // Import update function
} from '../services/kakaoNotificationService';
import { fetchSystemConfig, SystemConfig } from '../services/configService';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdminSlot {
  id: string;
  time: string;
  date: string;
  status: string;
  is_open: boolean;
  max_applicants: number;
  malePrice?: number;
  femalePrice?: number;
  hostTeam?: TeamInfo;
  guestTeams: TeamInfo[];
}

const TIMES = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'RESERVATIONS' | 'SLOTS'>('RESERVATIONS');

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [dailySlots, setDailySlots] = useState<AdminSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    // Load system config on mount
    fetchSystemConfig().then(config => {
      setSystemConfig(config);
      updateNotificationTemplates(config.templates);
    });
  }, []);

  // Action State
  const [processing, setProcessing] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [deleteContext, setDeleteContext] = useState<{
    teamId: string | null;
    teamType: 'HOST' | 'GUEST';
    slot: AdminSlot | null;
  }>({ teamId: null, teamType: 'GUEST', slot: null });
  const [rejectionReason, setRejectionReason] = useState('');

  // Custom Alert/Confirm Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'ALERT' | 'CONFIRM';
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'ALERT',
    message: '',
  });

  // Helper functions to replace window.alert and window.confirm
  const showAlert = (message: string) => {
    setModalConfig({ isOpen: true, type: 'ALERT', message });
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setModalConfig({ isOpen: true, type: 'CONFIRM', message, onConfirm });
  };

  const handleModalClose = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const handleModalConfirm = () => {
    if (modalConfig.onConfirm) {
      modalConfig.onConfirm();
    }
    handleModalClose();
  };

  const fetchDailyData = async (date: Date) => {
    setLoading(true);
    const dateStr = date.toISOString().split('T')[0];

    try {
      // 1. Fetch Teams
      const { data: teams, error } = await supabase
        .from('teams')
        .select(`*, members (*)`)
        .eq('date', dateStr)
        .order('created_at', { ascending: true }); // First created is Host

      if (error) throw error;

      // 2. Fetch Daily Config (날짜별 단일 row)
      const { data: dailyConfig, error: configError } = await supabase
        .from('daily_config')
        .select('*')
        .eq('date', dateStr)
        .single();

      // 설정이 없으면 기본값 사용
      const openTimes: string[] = dailyConfig?.open_times || [];
      const defaultMaxApplicants = dailyConfig?.max_applicants || 3;

      // 3. Group by Time Slot
      const slots: AdminSlot[] = TIMES.map(time => {
        const teamsAtTime = teams?.filter(t => t.time === time) || [];
        const isOpen = openTimes.includes(time);

        // Parse slot config
        const slotConfig = dailyConfig?.slot_configs?.[time] || {};
        const malePrice = slotConfig.malePrice; // undefined means use system default
        const femalePrice = slotConfig.femalePrice;
        // 슬롯별 최대 인원 (없으면 일별 기본값 사용)
        const slotMaxApplicants = slotConfig.maxApplicants ?? defaultMaxApplicants;

        let hostTeam: TeamInfo | undefined;
        let guestTeams: TeamInfo[] = [];

        if (teamsAtTime.length > 0) {
          hostTeam = mapTeamRawToInfo(teamsAtTime[0]);
          if (teamsAtTime.length > 1) {
            guestTeams = teamsAtTime.slice(1).map(mapTeamRawToInfo);
          }
        }

        // Determine Status string for Admin UI
        let status = 'AVAILABLE';
        if (hostTeam) status = 'HOST_WAITING';
        if (hostTeam && guestTeams.length > 0) status = 'MATCHING_READY';
        if (teamsAtTime.some(t => t.status === 'FIRST_CONFIRMED')) status = 'FIRST_CONFIRMED';
        if (teamsAtTime.some(t => t.status === 'MATCH_CONFIRMED')) status = 'MATCH_CONFIRMED';

        return {
          id: `${dateStr}-${time}`,
          date: dateStr,
          time: time,
          status,
          is_open: isOpen,
          max_applicants: slotMaxApplicants,
          malePrice,
          femalePrice,
          hostTeam,
          guestTeams
        };
      });

      setDailySlots(slots);
    } catch (err: any) {
      console.error(err);
      showAlert(`데이터 불러오기 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const mapTeamRawToInfo = (raw: any): TeamInfo => {
    return {
      id: raw.id,
      gender: raw.gender,
      headCount: raw.members?.length || 0,
      avgAge: 0, // Simplified for admin view
      university: raw.members?.[0]?.university || 'Unknown',
      phone: raw.phone,
      isVerified: raw.is_verified,
      studentIdUrl: raw.student_id_url,
      members: raw.members,
      createdAt: raw.created_at,
      status: raw.status,
      // 정보 교환 프로세스 필드
      wantsInfo: raw.wants_info,
      sharesInfo: raw.shares_info,
      hasPaid: raw.has_paid || false,
      hasConfirmed: raw.has_confirmed,
      processStep: raw.process_step || null
    };
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDailyData(selectedDate);
    }
  }, [selectedDate, isAuthenticated, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'admin_password')
        .single();

      if (error || !data) {
        showAlert("관리자 설정(admin_password)을 불러올 수 없습니다. DB 설정을 확인하세요.");
        return;
      }

      if (data.value === password) {
        setIsAuthenticated(true);
      } else {
        showAlert('비밀번호가 틀렸습니다.');
      }
    } catch (err: any) {
      console.error(err);
      showAlert(`로그인 오류: ${err.message}`);
    } finally {
      setLoginLoading(false);
    }
  };

  // --- Actions ---

  // 슬롯 활성화/비활성화 토글 (open_times 배열 조작)
  const toggleSlotOpen = async (slot: AdminSlot) => {
    if (processing) return;
    setProcessing(true);
    const dateStr = slot.date;

    try {
      // 현재 설정 가져오기
      const { data: currentConfig } = await supabaseAdmin
        .from('daily_config')
        .select('*')
        .eq('date', dateStr)
        .single();

      let openTimes: string[] = currentConfig?.open_times || [];
      const maxApplicants = currentConfig?.max_applicants || 3;

      // 토글: 존재하면 제거, 없으면 추가
      if (openTimes.includes(slot.time)) {
        openTimes = openTimes.filter(t => t !== slot.time);
      } else {
        openTimes = [...openTimes, slot.time].sort();
      }

      // Upsert
      const { error } = await supabaseAdmin
        .from('daily_config')
        .upsert({
          date: dateStr,
          open_times: openTimes,
          max_applicants: maxApplicants
        }, { onConflict: 'date' });

      if (error) throw error;
      await fetchDailyData(selectedDate);
    } catch (err: any) {
      showAlert(`설정 변경 실패: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const updateSlotPrice = async (slot: AdminSlot, gender: 'male' | 'female', price: number) => {
    if (processing) return;
    setProcessing(true);
    const dateStr = slot.date;

    try {
      // Fetch current config
      const { data: currentConfig } = await supabaseAdmin
        .from('daily_config')
        .select('*')
        .eq('date', dateStr)
        .single();

      const currentSlotConfigs = currentConfig?.slot_configs || {};
      const thisSlotConfig = currentSlotConfigs[slot.time] || {};

      // Update price
      if (gender === 'male') thisSlotConfig.malePrice = price;
      if (gender === 'female') thisSlotConfig.femalePrice = price;

      const newSlotConfigs = {
        ...currentSlotConfigs,
        [slot.time]: thisSlotConfig
      };

      const { error } = await supabaseAdmin
        .from('daily_config')
        .upsert({
          date: dateStr,
          slot_configs: newSlotConfigs,
          open_times: currentConfig?.open_times || [],
          max_applicants: currentConfig?.max_applicants || 3
        }, { onConflict: 'date' });

      if (error) throw error;
      await fetchDailyData(selectedDate);
    } catch (err: any) {
      console.error(err);
      showAlert(`가격 업데이트 실패: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // max_applicants 업데이트 (슬롯별 개별 적용)
  const updateMaxApplicants = async (slot: AdminSlot, newMax: number) => {
    const dateStr = slot.date;

    try {
      const { data: currentConfig } = await supabaseAdmin
        .from('daily_config')
        .select('*')
        .eq('date', dateStr)
        .single();

      const currentSlotConfigs = currentConfig?.slot_configs || {};
      const thisSlotConfig = currentSlotConfigs[slot.time] || {};

      // Update maxApplicants for this slot
      thisSlotConfig.maxApplicants = newMax;

      const newSlotConfigs = {
        ...currentSlotConfigs,
        [slot.time]: thisSlotConfig
      };

      const { error } = await supabaseAdmin
        .from('daily_config')
        .upsert({
          date: dateStr,
          slot_configs: newSlotConfigs,
          open_times: currentConfig?.open_times || [],
          max_applicants: currentConfig?.max_applicants || 3 // Keep daily default as fallback
        }, { onConflict: 'date' });

      if (error) showAlert(`인원 설정 실패: ${error.message}`);
      else fetchDailyData(selectedDate);
    } catch (err: any) {
      showAlert(`인원 설정 실패: ${err.message}`);
    }
  };

  // 1. Verify Logic Split
  const handleVerifyClick = (teamId: string) => {
    showConfirm("이 팀의 신원을 승인하시겠습니까?", () => executeVerify(teamId));
  };

  const executeVerify = async (teamId: string) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('teams')
        .update({ is_verified: true })
        .eq('id', teamId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("업데이트된 데이터가 없습니다. Service Role Key를 확인해주세요.");
      }
      fetchDailyData(selectedDate);
    } catch (err: any) {
      showAlert(`승인 처리 실패: ${err.message}`);
    }
  };

  // 삭제 모달 열기 - 호스트/게스트 구분
  const openRejectModal = (teamId: string, teamType: 'HOST' | 'GUEST', slot: AdminSlot) => {
    setDeleteContext({ teamId, teamType, slot });
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    const { teamId, teamType, slot } = deleteContext;
    if (!teamId || !slot) return;
    setProcessing(true);

    const dateStr = formatDateForNotification(selectedDate);
    const timeStr = slot.time;

    try {
      // Service Role Key가 설정되어 있는지 확인
      if (!isAdminModeEnabled()) {
        throw new Error("관리자 모드가 활성화되지 않았습니다. .env.local에 VITE_SUPABASE_SERVICE_ROLE_KEY를 설정해주세요.");
      }

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
          const { error } = await supabaseAdmin
            .from('teams')
            .delete()
            .in('id', allTeamIds);

          if (error) throw error;
        }

        setRejectModalOpen(false);
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
            // 1차 매칭 후 삭제 -> 게스트 본인 + 호스트에게 알림 (14, 15번)
            await sendGuestCancelledAfterFirstNotification(guestTeam.phone, dateStr, timeStr);
            await sendGuestCancelledHostNotifyNotification(slot.hostTeam.phone, dateStr, timeStr);
          } else {
            // 1차 매칭 전 삭제 -> 게스트 본인 + 호스트에게 알림 (16, 17번)
            await sendGuestCancelledBeforeFirstNotification(guestTeam.phone, dateStr, timeStr);
            await sendGuestCancelledBeforeHostNotifyNotification(slot.hostTeam.phone, dateStr, timeStr);
          }
        }

        // 게스트 삭제
        const { error: deleteError } = await supabaseAdmin
          .from('teams')
          .delete()
          .eq('id', teamId);

        if (deleteError) throw deleteError;

        // 매칭 완료 상태에서 매칭된 게스트를 삭제하면 호스트 상태 및 정보교환 필드 리셋
        if ((isMatchConfirmed || isFirstConfirmed) && isMatchedGuest && slot.hostTeam) {
          const { error: updateError } = await supabaseAdmin
            .from('teams')
            .update({
              status: 'PENDING',
              wants_info: null,
              shares_info: null,
              has_paid: false,
              has_confirmed: null,
              process_step: null
            })
            .eq('id', slot.hostTeam.id);

          if (updateError) {
            console.error("호스트 상태 리셋 실패:", updateError);
          }

          setRejectModalOpen(false);
          showAlert("매칭된 게스트가 삭제되었습니다.\n호스트는 다시 매칭 대기 상태로 변경되었습니다.\n알림톡이 발송되었습니다.");
        } else {
          setRejectModalOpen(false);
          showAlert("게스트 팀이 삭제되었습니다.\n알림톡이 발송되었습니다.");
        }
      }

      await fetchDailyData(selectedDate);
    } catch (err: any) {
      console.error(err);
      showAlert(`삭제 실패: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // 2. Match Logic - 단계별 매칭 프로세스

  // 2-1. 1차 매칭 확정 (인스타 교환 프로세스 시작)
  const handleFirstMatchClick = (slot: AdminSlot, selectedGuestId: string) => {
    if (!slot.hostTeam) return;
    showConfirm(
      "이 게스트를 1차 매칭 확정하시겠습니까?\n(인스타 교환 프로세스 진행 후 최종 확정 필요)",
      () => executeFirstMatch(slot, selectedGuestId)
    );
  };

  const executeFirstMatch = async (slot: AdminSlot, selectedGuestId: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      if (!slot.hostTeam) return;

      // 선택된 게스트 찾기
      const selectedGuest = slot.guestTeams.find(g => g.id === selectedGuestId);
      if (!selectedGuest) throw new Error("선택된 게스트를 찾을 수 없습니다.");

      // 호스트와 선택된 게스트만 FIRST_CONFIRMED 상태로 변경
      const { data: updatedData, error: updateError } = await supabaseAdmin
        .from('teams')
        .update({ status: 'FIRST_CONFIRMED' })
        .in('id', [slot.hostTeam.id, selectedGuestId])
        .select();

      if (updateError) throw updateError;

      if (!updatedData || updatedData.length === 0) {
        throw new Error("상태 업데이트 실패. Service Role Key를 확인해주세요.");
      }

      // 1차 매칭 완료 알림톡 발송 (04번 템플릿)
      const dateStr = formatDateForNotification(selectedDate);
      const timeStr = slot.time;

      // 호스트에게 알림 (상대팀: 게스트 정보)
      await sendFirstMatchCompleteNotification(
        slot.hostTeam.phone,
        dateStr,
        timeStr,
        selectedGuest.university
      );

      // 게스트에게 알림 (상대팀: 호스트 정보)
      await sendFirstMatchCompleteNotification(
        selectedGuest.phone,
        dateStr,
        timeStr,
        slot.hostTeam.university
      );

      showAlert("1차 매칭이 확정되었습니다.\n양팀에게 알림톡이 발송되었습니다.\n인스타 교환 후 최종 확정을 진행해주세요.");
      await fetchDailyData(selectedDate);
    } catch (err: any) {
      console.error("firstMatch Error:", err);
      showAlert(`1차 매칭 확정 중 오류:\n${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // 2-2. 최종 매칭 확정 (바로 확정 또는 1차 후 최종)
  const handleFinalMatchClick = (slot: AdminSlot, selectedGuestId: string, isDirect: boolean = false) => {
    if (!slot.hostTeam) return;
    const message = isDirect
      ? "이 게스트와 호스트를 바로 최종 매칭하시겠습니까?\n(인스타 교환 없이 바로 확정, 탈락자 삭제)"
      : "최종 매칭을 확정하시겠습니까?\n(매칭 완료 처리 및 탈락자 삭제)";

    showConfirm(message, () => executeFinalMatch(slot, selectedGuestId));
  };

  const executeFinalMatch = async (slot: AdminSlot, selectedGuestId: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      if (!slot.hostTeam) return;

      // 1. 호스트와 선택된 게스트 MATCH_CONFIRMED 상태로 변경
      const { data: updatedData, error: updateError } = await supabaseAdmin
        .from('teams')
        .update({ status: 'MATCH_CONFIRMED' })
        .in('id', [slot.hostTeam.id, selectedGuestId])
        .select();

      if (updateError) throw updateError;

      if (!updatedData || updatedData.length === 0) {
        throw new Error("상태 업데이트 실패. Service Role Key를 확인해주세요.");
      }

      // 2. 나머지 게스트 삭제
      const otherGuestIds = slot.guestTeams.filter(g => g.id !== selectedGuestId).map(g => g.id);
      if (otherGuestIds.length > 0) {
        const { error: deleteError } = await supabaseAdmin.from('teams').delete().in('id', otherGuestIds);
        if (deleteError) {
          console.error("Warning: Failed to delete other guests", deleteError);
          showAlert("매칭은 확정되었으나 탈락자 삭제 중 오류가 발생했습니다: " + deleteError.message);
        }
      }

      showAlert("🎉 최종 매칭이 완료되었습니다!");
      await fetchDailyData(selectedDate);
    } catch (err: any) {
      console.error("finalMatch Error:", err);
      showAlert(`최종 매칭 확정 중 오류:\n${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // 2-3. 1차 매칭 취소 (슬롯 데이터 전체 삭제)
  const handleCancelFirstMatch = (slot: AdminSlot) => {
    if (!slot.hostTeam) return;
    showConfirm(
      "1차 매칭을 취소하고 슬롯의 모든 데이터를 삭제하시겠습니까?\n(호스트 및 신청한 게스트 모두 삭제됨)",
      () => executeCancelFirstMatch(slot)
    );
  };

  const executeCancelFirstMatch = async (slot: AdminSlot) => {
    if (processing) return;
    setProcessing(true);
    try {
      // 해당 슬롯의 모든 팀 ID 수집 (호스트 + 게스트)
      const allTeamIds = [
        slot.hostTeam?.id,
        ...slot.guestTeams.map(g => g.id)
      ].filter(Boolean) as string[];

      if (allTeamIds.length > 0) {
        // 모든 팀 삭제
        const { error } = await supabaseAdmin
          .from('teams')
          .delete()
          .in('id', allTeamIds);

        if (error) throw error;
      }

      showAlert("1차 매칭이 취소되고 데이터가 초기화되었습니다.");
      await fetchDailyData(selectedDate);
    } catch (err: any) {
      showAlert(`초기화 실패: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // 3. 정보 교환 상태 업데이트 함수
  const updateTeamInfoPreference = async (
    teamId: string,
    field: 'wants_info' | 'shares_info' | 'has_paid' | 'has_confirmed',
    value: boolean | null
  ) => {
    try {
      const { error } = await supabaseAdmin
        .from('teams')
        .update({ [field]: value })
        .eq('id', teamId);

      if (error) throw error;
      await fetchDailyData(selectedDate);
    } catch (err: any) {
      showAlert(`업데이트 실패: ${err.message}`);
    }
  };

  // 4. 다음 스텝 진행 (정보 교환 상태에 따른 분기)
  const handleNextStep = async (slot: AdminSlot) => {
    if (!slot.hostTeam) return;
    const guest = slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED');
    if (!guest) return;

    const host = slot.hostTeam;
    const dateStr = formatDateForNotification(selectedDate);
    const timeStr = slot.time;

    // 모든 설정이 완료되었는지 확인
    if (host.wantsInfo === null || host.wantsInfo === undefined ||
      host.sharesInfo === null || host.sharesInfo === undefined ||
      guest.wantsInfo === null || guest.wantsInfo === undefined ||
      guest.sharesInfo === null || guest.sharesInfo === undefined) {
      showAlert("호스트와 게스트 모두 정보 원함 / 정보 공개 여부를 설정해주세요.");
      return;
    }

    // 양쪽 다 정보를 원하지 않으면 -> 바로 최종 결제 단계로
    if (!host.wantsInfo && !guest.wantsInfo) {
      setProcessing(true);
      try {
        // 양쪽에게 최종 매칭 결제 안내 발송
        await sendFinalPaymentRequestNotification(host.phone, dateStr, timeStr, '10000', 'https://pay.example.com/final');
        await sendFinalPaymentRequestNotification(guest.phone, dateStr, timeStr, '10000', 'https://pay.example.com/final');

        // 양팀을 READY_FOR_FINAL 상태로
        await supabaseAdmin.from('teams').update({ process_step: 'READY_FOR_FINAL' }).eq('id', host.id);
        await supabaseAdmin.from('teams').update({ process_step: 'READY_FOR_FINAL' }).eq('id', guest.id);

        showAlert("✅ 양쪽 팀 모두 정보 열람을 원하지 않습니다.\n최종 매칭 결제 안내 알림톡이 발송되었습니다.\n양팀 결제 확인 후 최종 매칭을 진행해주세요.");
        await fetchDailyData(selectedDate);
      } catch (err: any) {
        showAlert(`오류: ${err.message}`);
      } finally {
        setProcessing(false);
      }
      return;
    }

    // 복잡한 케이스 - 알림 발송 및 프로세스 단계 업데이트
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

      // DB 업데이트
      await supabaseAdmin.from('teams').update({ process_step: hostProcessStep }).eq('id', host.id);
      await supabaseAdmin.from('teams').update({ process_step: guestProcessStep }).eq('id', guest.id);

      showAlert(`✅ 다음 스텝 진행 완료!\n\n${actions.join('\n')}\n\n각 팀의 응답을 확인 후 아래 버튼으로 진행해주세요.`);
      await fetchDailyData(selectedDate);
    } catch (err: any) {
      showAlert(`오류: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // 5. 결제 확인 처리
  const handlePaymentConfirm = async (teamId: string, slot: AdminSlot) => {
    setProcessing(true);
    try {
      const host = slot.hostTeam;
      const guest = slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED');
      if (!host || !guest) return;

      const dateStr = formatDateForNotification(selectedDate);
      const timeStr = slot.time;

      const otherTeam = teamId === host.id ? guest : host;
      const memberInfo = otherTeam.members?.map(m => `${m.university} ${m.major} (${m.age}세, @${m.instagramId || '미입력'})`).join('\n') || '정보 없음';

      const team = teamId === host.id ? host : guest;
      await sendInfoDeliveredNotification(team.phone, dateStr, timeStr, memberInfo);

      await supabaseAdmin.from('teams').update({
        has_paid: true,
        process_step: 'WAITING_CONFIRM'
      }).eq('id', teamId);

      showAlert("✅ 결제 확인 및 정보 전달 완료!");
      await fetchDailyData(selectedDate);
    } catch (err: any) {
      showAlert(`오류: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // 6. 진행 의사 확인 처리
  const handleConfirmDecision = async (teamId: string, decision: boolean, slot: AdminSlot) => {
    setProcessing(true);
    try {
      const host = slot.hostTeam;
      const guest = slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED');
      if (!host || !guest) return;

      const dateStr = formatDateForNotification(selectedDate);
      const timeStr = slot.time;

      if (decision) {
        // 진행 선택 -> READY_FOR_FINAL로
        await supabaseAdmin.from('teams').update({
          has_confirmed: true,
          process_step: 'READY_FOR_FINAL'
        }).eq('id', teamId);

        // 상대팀도 READY_FOR_FINAL인지 확인
        const otherTeam = teamId === host.id ? guest : host;

        // 데이터 리프레시 후 확인
        await fetchDailyData(selectedDate);

        // 상대팀 상태 확인을 위해 다시 조회
        const { data: otherData } = await supabaseAdmin
          .from('teams')
          .select('process_step')
          .eq('id', otherTeam.id)
          .single();

        if (otherData?.process_step === 'READY_FOR_FINAL' || otherData?.process_step === 'WAITING_OTHER') {
          // 양팀 모두 준비됨 -> 최종 결제 안내 발송
          const amount = systemConfig?.paymentAmountFinal || '10000';
          const link = systemConfig?.paymentLinkFinal || 'https://pay.example.com/final';
          await sendFinalPaymentRequestNotification(host.phone, dateStr, timeStr, amount, link);
          await sendFinalPaymentRequestNotification(guest.phone, dateStr, timeStr, amount, link);
          showAlert("✅ 양팀 모두 진행에 동의하셨습니다!\n최종 매칭 결제 안내가 발송되었습니다.");
        } else {
          showAlert("✅ 진행 의사 확인 완료!\n상대팀의 결정을 기다리고 있습니다.");
        }
      } else {
        // 취소 처리 및 슬롯 초기화
        await sendProcessCancelledNotification(host.phone, dateStr, timeStr);
        await sendProcessCancelledNotification(guest.phone, dateStr, timeStr);

        // 해당 슬롯의 모든 팀(호스트 + 모든 게스트) 삭제
        const allTeamIds = [
          slot.hostTeam?.id,
          ...slot.guestTeams.map(g => g.id)
        ].filter(Boolean) as string[];

        if (allTeamIds.length > 0) {
          await supabaseAdmin.from('teams').delete().in('id', allTeamIds);
        }

        showAlert("❌ 매칭이 취소되고 슬롯이 초기화되었습니다.");
        await fetchDailyData(selectedDate);
      }
    } catch (err: any) {
      showAlert(`오류: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // 7. 최종 매칭 가능 여부 확인 (양팀 모두 READY_FOR_FINAL)
  const canFinalMatch = (slot: AdminSlot): boolean => {
    const host = slot.hostTeam;
    const guest = slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED');
    if (!host || !guest) return false;

    // 양팀 모두 READY_FOR_FINAL 상태여야 최종 매칭 가능
    const hostReady = host.processStep === 'READY_FOR_FINAL';
    const guestReady = guest.processStep === 'READY_FOR_FINAL';

    if (host.processStep === 'CANCELLED' || guest.processStep === 'CANCELLED') return false;

    return hostReady && guestReady;
  };

  // --- Calendar Helpers ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };
  const { days, firstDay } = getDaysInMonth(currentMonth);
  const daysArray = Array.from({ length: days }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDay }, (_, i) => i);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/90 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Login Screen */}
      {!isAuthenticated ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-brand-600" />
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="text-gray-600" /></div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Admin Access</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className="w-full p-3 border border-gray-300 rounded-xl mb-4 text-center text-lg tracking-widest focus:border-brand-500 outline-none bg-white text-gray-900"
              placeholder="PASSCODE"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button disabled={loginLoading} className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center">
              {loginLoading ? <Loader2 className="animate-spin" /> : "로그인"}
            </button>
            <button type="button" onClick={onClose} className="mt-4 text-sm text-gray-400 underline">나가기</button>
          </form>
        </motion.div>
      ) : (
        /* Dashboard Screen */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-50 w-full h-[95vh] rounded-[2rem] overflow-hidden flex flex-col max-w-7xl shadow-2xl">
          {/* Header */}
          <header className="bg-white px-6 py-4 flex justify-between items-center border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black shadow-lg">M</div>
              <div><span className="font-bold text-xl text-gray-900 block leading-none">meet000 Admin</span><span className="text-xs text-gray-400 font-medium">Administrator Dashboard</span></div>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab('RESERVATIONS')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'RESERVATIONS' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                예약 관리
              </button>
              <button onClick={() => setActiveTab('SLOTS')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'SLOTS' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                슬롯 설정
              </button>
            </div>

            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="text-gray-500" /></button>
          </header>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Calendar */}
            <aside className="w-80 bg-white border-r border-gray-200 flex flex-col hidden lg:flex">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg text-gray-800">{currentMonth.getFullYear()}. {currentMonth.getMonth() + 1}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={20} /></button>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={20} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="text-xs font-bold text-gray-400">{d}</span>)}</div>
                <div className="grid grid-cols-7 gap-1">
                  {blanksArray.map(i => <div key={`b-${i}`} />)}
                  {daysArray.map(day => {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const isSelected = selectedDate.toDateString() === date.toDateString();
                    return (
                      <button key={day} onClick={() => setSelectedDate(date)} className={`h-10 w-10 rounded-full text-sm font-medium flex items-center justify-center transition-all ${isSelected ? 'bg-brand-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-600'}`}>{day}</button>
                    )
                  })}
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-6 lg:p-10 bg-gray-50">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-3"><CalendarIcon className="text-brand-600" />{selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일</h2>
                <p className="text-gray-500 text-sm">{activeTab === 'SLOTS' ? '오픈할 시간대를 설정하세요.' : '예약 및 매칭 현황을 관리하세요.'}</p>
              </div>

              {loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-500" size={32} /></div> : (
                <div className="space-y-6">
                  {dailySlots.map((slot) => (
                    <div key={slot.id} className={`rounded-2xl p-6 shadow-sm border transition-all ${slot.is_open ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200 opacity-75'}`}>

                      {/* Slot Header */}
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                          <span className={`px-4 py-2 rounded-xl font-black text-xl ${slot.is_open ? 'bg-gray-900 text-white' : 'bg-gray-300 text-gray-500'}`}>{slot.time}</span>
                          {activeTab === 'SLOTS' ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleSlotOpen(slot)} disabled={processing} className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${slot.is_open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {slot.is_open ? 'OPEN' : 'CLOSED'}
                              </button>
                              {slot.is_open && (
                                <div className="flex items-center gap-4 ml-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 font-bold">최대 신청:</span>
                                    <input
                                      type="number"
                                      className="w-14 p-1 border border-gray-300 bg-white text-gray-900 rounded text-center text-xs focus:border-brand-500 outline-none"
                                      value={slot.max_applicants}
                                      onChange={(e) => updateMaxApplicants(slot, parseInt(e.target.value))}
                                    />
                                    <span className="text-xs text-gray-400">팀</span>
                                  </div>
                                  <div className="w-px h-6 bg-gray-300 mx-2"></div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-blue-600 font-bold">남:</span>
                                    <input
                                      type="number"
                                      step="1000"
                                      placeholder={systemConfig?.paymentAmountFirst || "5000"}
                                      className="w-20 p-1 border border-gray-300 bg-white text-gray-900 rounded text-center text-xs focus:border-brand-500 outline-none"
                                      value={slot.malePrice ?? ''}
                                      onChange={(e) => updateSlotPrice(slot, 'male', parseInt(e.target.value))}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-pink-600 font-bold">여:</span>
                                    <input
                                      type="number"
                                      step="1000"
                                      placeholder={systemConfig?.paymentAmountFirst || "5000"}
                                      className="w-20 p-1 border border-gray-300 bg-white text-gray-900 rounded text-center text-xs focus:border-brand-500 outline-none"
                                      value={slot.femalePrice ?? ''}
                                      onChange={(e) => updateSlotPrice(slot, 'female', parseInt(e.target.value))}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className={`text-sm font-bold mr-2 px-2 py-0.5 rounded ${slot.status === 'MATCH_CONFIRMED' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                                {slot.status === 'MATCH_CONFIRMED' ? '매칭 확정됨' : slot.status === 'MATCHING_READY' ? '매칭 가능' : slot.status}
                              </span>
                              <span className="text-xs text-gray-400">({slot.guestTeams.length} Guests)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reservation Management View */}
                      {activeTab === 'RESERVATIONS' && slot.is_open && (<>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                          {/* Host Column */}
                          <div className="border rounded-xl p-4 bg-gray-50/50">
                            <h4 className="font-bold text-gray-400 text-xs uppercase mb-3 flex justify-between">
                              <span>Host Team</span>
                              {slot.hostTeam && <button onClick={() => openRejectModal(slot.hostTeam!.id, 'HOST', slot)} className="text-red-400 hover:text-red-600 cursor-pointer"><Trash2 size={14} /></button>}
                            </h4>
                            {slot.hostTeam ? (
                              <>
                                <TeamCard team={slot.hostTeam} onVerify={() => handleVerifyClick(slot.hostTeam!.id)} />

                                {/* 1차 매칭 후 호스트 정보 교환 설정 */}
                                {slot.status === 'FIRST_CONFIRMED' && (
                                  <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-100 space-y-3">
                                    <div className="text-xs font-bold text-orange-700 mb-2">📋 호스트 설정</div>

                                    {/* 정보 열람 희망 토글 */}
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-600">상대팀 정보 열람 원함</span>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => updateTeamInfoPreference(slot.hostTeam!.id, 'wants_info', true)}
                                          className={`px-3 py-1 text-xs rounded-l-lg border transition-all ${slot.hostTeam.wantsInfo === true
                                            ? 'bg-brand-600 text-white border-brand-600'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                          예
                                        </button>
                                        <button
                                          onClick={() => updateTeamInfoPreference(slot.hostTeam!.id, 'wants_info', false)}
                                          className={`px-3 py-1 text-xs rounded-r-lg border transition-all ${slot.hostTeam.wantsInfo === false
                                            ? 'bg-gray-600 text-white border-gray-600'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                          아니오
                                        </button>
                                      </div>
                                    </div>

                                    {/* 정보 공개 여부 토글 */}
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-600">본인팀 정보 공개</span>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => updateTeamInfoPreference(slot.hostTeam!.id, 'shares_info', true)}
                                          className={`px-3 py-1 text-xs rounded-l-lg border transition-all ${slot.hostTeam.sharesInfo === true
                                            ? 'bg-brand-600 text-white border-brand-600'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                          공개
                                        </button>
                                        <button
                                          onClick={() => updateTeamInfoPreference(slot.hostTeam!.id, 'shares_info', false)}
                                          className={`px-3 py-1 text-xs rounded-r-lg border transition-all ${slot.hostTeam.sharesInfo === false
                                            ? 'bg-gray-600 text-white border-gray-600'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                          비공개
                                        </button>
                                      </div>
                                    </div>
                                    {/* 프로세스 단계별 액션 버튼 */}
                                    {slot.hostTeam.processStep && (
                                      <div className="mt-3 pt-3 border-t border-orange-200">
                                        {/* 결제 대기 */}
                                        {slot.hostTeam.processStep === 'WAITING_PAYMENT' && (
                                          <button
                                            onClick={() => handlePaymentConfirm(slot.hostTeam!.id, slot)}
                                            disabled={processing}
                                            className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                                          >
                                            💰 결제 확인 완료
                                          </button>
                                        )}

                                        {/* 진행 의사 확인 대기 */}
                                        {slot.hostTeam.processStep === 'WAITING_CONFIRM' && (
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => handleConfirmDecision(slot.hostTeam!.id, true, slot)}
                                              disabled={processing}
                                              className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                                            >
                                              ✅ 진행
                                            </button>
                                            <button
                                              onClick={() => handleConfirmDecision(slot.hostTeam!.id, false, slot)}
                                              disabled={processing}
                                              className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                                            >
                                              ❌ 취소
                                            </button>
                                          </div>
                                        )}

                                        {/* 상대팀 대기 */}
                                        {slot.hostTeam.processStep === 'WAITING_OTHER' && (
                                          <div className="text-center text-xs text-gray-500 py-2">⏳ 게스트 프로세스 대기중...</div>
                                        )}

                                        {/* 완료 */}
                                        {slot.hostTeam.processStep === 'COMPLETED' && (
                                          <div className="text-center text-xs text-green-600 font-bold py-2">✅ 준비 완료</div>
                                        )}

                                        {/* 최종 결제 대기 */}
                                        {slot.hostTeam.processStep === 'READY_FOR_FINAL' && (
                                          <div className="text-center text-xs text-blue-600 font-bold py-2">💰 최종 결제 대기중</div>
                                        )}

                                        {/* 취소됨 */}
                                        {slot.hostTeam.processStep === 'CANCELLED' && (
                                          <div className="text-center text-xs text-red-600 font-bold py-2">❌ 취소됨</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="h-32 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">등록 대기중</div>
                            )}
                          </div>

                          {/* Guest Column */}
                          <div className="border rounded-xl p-4 bg-gray-50/50">
                            <h4 className="font-bold text-gray-400 text-xs uppercase mb-3 flex justify-between">
                              <span>Guest Applicants</span>
                              {(() => {
                                const confirmedGuest = slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED' || g.status === 'MATCH_CONFIRMED');
                                if (confirmedGuest) {
                                  return (
                                    <button onClick={() => openRejectModal(confirmedGuest.id, 'GUEST', slot)} className="text-red-400 hover:text-red-600 cursor-pointer"><Trash2 size={14} /></button>
                                  );
                                }
                                return null;
                              })()}
                            </h4>
                            {slot.guestTeams.length > 0 ? (
                              <div className="space-y-3">
                                {slot.guestTeams.map(guest => {
                                  const isFirstConfirmed = guest.status === 'FIRST_CONFIRMED';
                                  const isMatchConfirmed = guest.status === 'MATCH_CONFIRMED';

                                  return (
                                    <div key={guest.id} className={`relative ${isFirstConfirmed ? 'ring-2 ring-orange-400 rounded-xl' : ''}`}>
                                      <TeamCard team={guest} onVerify={() => handleVerifyClick(guest.id)} />

                                      {/* 1차 매칭 확정된 게스트 - 정보 교환 설정 UI */}
                                      {isFirstConfirmed && !isMatchConfirmed && (
                                        <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-100 space-y-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="text-xs font-bold text-orange-700">📋 게스트 설정</div>
                                          </div>
                                          {/* 정보 열람 희망 토글 */}
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">상대팀 정보 열람 원함</span>
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => updateTeamInfoPreference(guest.id, 'wants_info', true)}
                                                className={`px-3 py-1 text-xs rounded-l-lg border transition-all ${guest.wantsInfo === true
                                                  ? 'bg-brand-600 text-white border-brand-600'
                                                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                  }`}
                                              >
                                                예
                                              </button>
                                              <button
                                                onClick={() => updateTeamInfoPreference(guest.id, 'wants_info', false)}
                                                className={`px-3 py-1 text-xs rounded-r-lg border transition-all ${guest.wantsInfo === false
                                                  ? 'bg-gray-600 text-white border-gray-600'
                                                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                  }`}
                                              >
                                                아니오
                                              </button>
                                            </div>
                                          </div>

                                          {/* 정보 공개 여부 토글 */}
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">본인팀 정보 공개</span>
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => updateTeamInfoPreference(guest.id, 'shares_info', true)}
                                                className={`px-3 py-1 text-xs rounded-l-lg border transition-all ${guest.sharesInfo === true
                                                  ? 'bg-brand-600 text-white border-brand-600'
                                                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                  }`}
                                              >
                                                공개
                                              </button>
                                              <button
                                                onClick={() => updateTeamInfoPreference(guest.id, 'shares_info', false)}
                                                className={`px-3 py-1 text-xs rounded-r-lg border transition-all ${guest.sharesInfo === false
                                                  ? 'bg-gray-600 text-white border-gray-600'
                                                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                  }`}
                                              >
                                                비공개
                                              </button>
                                            </div>
                                          </div>

                                          {/* 게스트 프로세스 단계별 액션 버튼 */}
                                          {guest.processStep && (
                                            <div className="mt-3 pt-3 border-t border-green-200">
                                              {/* 결제 대기 */}
                                              {guest.processStep === 'WAITING_PAYMENT' && (
                                                <button
                                                  onClick={() => handlePaymentConfirm(guest.id, slot)}
                                                  disabled={processing}
                                                  className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                  💰 결제 확인 완료
                                                </button>
                                              )}

                                              {/* 진행 의사 확인 대기 */}
                                              {guest.processStep === 'WAITING_CONFIRM' && (
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={() => handleConfirmDecision(guest.id, true, slot)}
                                                    disabled={processing}
                                                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                                                  >
                                                    ✅ 진행
                                                  </button>
                                                  <button
                                                    onClick={() => handleConfirmDecision(guest.id, false, slot)}
                                                    disabled={processing}
                                                    className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                                                  >
                                                    ❌ 취소
                                                  </button>
                                                </div>
                                              )}

                                              {/* 상대팀 대기 */}
                                              {guest.processStep === 'WAITING_OTHER' && (
                                                <div className="text-center text-xs text-gray-500 py-2">⏳ 호스트 프로세스 대기중...</div>
                                              )}

                                              {/* 완료 */}
                                              {guest.processStep === 'COMPLETED' && (
                                                <div className="text-center text-xs text-green-600 font-bold py-2">✅ 준비 완료</div>
                                              )}

                                              {/* 최종 결제 대기 */}
                                              {guest.processStep === 'READY_FOR_FINAL' && (
                                                <div className="text-center text-xs text-blue-600 font-bold py-2">💰 최종 결제 대기중</div>
                                              )}

                                              {/* 취소됨 */}
                                              {guest.processStep === 'CANCELLED' && (
                                                <div className="text-center text-xs text-red-600 font-bold py-2">❌ 취소됨</div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* 일반 게스트 - 1차 매칭 버튼만 표시 */}
                                      {!isFirstConfirmed && !isMatchConfirmed && slot.status !== 'MATCH_CONFIRMED' && slot.status !== 'FIRST_CONFIRMED' && (
                                        <div className="flex items-center gap-2 mt-3">
                                          <button
                                            type="button"
                                            onClick={() => handleFirstMatchClick(slot, guest.id)}
                                            disabled={processing}
                                            className="flex-1 bg-orange-500 text-white py-2 px-3 rounded-lg text-xs font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-1 disabled:opacity-50 shadow-sm cursor-pointer"
                                            title="1차 매칭 확정 (인스타 교환 단계)"
                                          >
                                            {processing ? <Loader2 className="animate-spin" size={12} /> : <>📋 1차 매칭 확정</>}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => openRejectModal(guest.id, 'GUEST', slot)}
                                            disabled={processing}
                                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                            title="삭제"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      )}

                                      {/* 최종 매칭 완료된 게스트 */}
                                      {isMatchConfirmed && (
                                        <div className="mt-2 flex items-center justify-between bg-brand-50 py-2 px-3 rounded">
                                          <span className="text-xs font-bold text-brand-600">✅ 매칭 완료</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="h-32 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">신청 내역 없음</div>
                            )}
                          </div>
                        </div>

                        {/* 다음 스텝 / 최종 매칭 버튼 (1차 매칭 상태일 때) - 호스트/게스트 박스 하단 중앙 */}
                        {slot.status === 'FIRST_CONFIRMED' && (
                          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                            {/* 아직 다음 스텝 진행 전 (processStep이 없을 때) */}
                            {!slot.hostTeam?.processStep && !slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED')?.processStep && (
                              <button
                                type="button"
                                onClick={() => handleNextStep(slot)}
                                disabled={processing}
                                className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm cursor-pointer"
                              >
                                {processing ? <Loader2 className="animate-spin" size={14} /> : <>▶️ 다음 스텝 진행</>}
                              </button>
                            )}

                            {/* 진행 중 상태 (버튼 없이 상태만 표시) */}
                            {(slot.hostTeam?.processStep || slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED')?.processStep)
                              && !canFinalMatch(slot)
                              && (
                                <div className="text-center text-sm text-gray-500 py-3 bg-gray-50 rounded-lg">
                                  ⏳ 각 팀의 프로세스를 완료해주세요
                                </div>
                              )}

                            {/* 양팀 모두 READY_FOR_FINAL -> 최종 매칭 결제 확인 버튼 */}
                            {canFinalMatch(slot) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const guest = slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED');
                                  if (guest) {
                                    showConfirm(
                                      "양팀 최종 결제가 확인되었습니까?\n최종 매칭을 진행합니다.",
                                      async () => {
                                        setProcessing(true);
                                        try {
                                          const dateStr = formatDateForNotification(selectedDate);
                                          const timeStr = slot.time;
                                          await sendFinalMatchCompleteNotification(slot.hostTeam!.phone, dateStr, timeStr, guest.university);
                                          await sendFinalMatchCompleteNotification(guest.phone, dateStr, timeStr, slot.hostTeam!.university);
                                          await executeFinalMatch(slot, guest.id);
                                        } catch (err: any) {
                                          showAlert(`오류: ${err.message}`);
                                          setProcessing(false);
                                        }
                                      }
                                    );
                                  }
                                }}
                                disabled={processing}
                                className="w-full bg-brand-600 text-white py-3 rounded-lg text-sm font-bold hover:bg-brand-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg cursor-pointer"
                              >
                                {processing ? <Loader2 className="animate-spin" size={14} /> : <>🎉 결제 확인 & 최종 매칭</>}
                              </button>
                            )}
                          </div>
                        )}
                      </>)}
                    </div>
                  ))}
                </div>
              )}
            </main>
          </div>
        </motion.div>
      )}

      {/* Reject Modal */}
      {
        rejectModalOpen && (
          <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-4">
                {deleteContext.teamType === 'HOST' ? '🚨 호스트 팀 삭제' : '팀 삭제'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {deleteContext.teamType === 'HOST' ? (
                  <>
                    <span className="text-red-600 font-bold">주의:</span> 호스트 팀을 삭제하면 해당 슬롯의 <span className="font-bold">모든 팀({(deleteContext.slot?.guestTeams.length || 0) + 1}개)</span>이 함께 삭제됩니다.
                  </>
                ) : deleteContext.slot?.status === 'MATCH_CONFIRMED' ? (
                  <>
                    매칭된 게스트를 삭제합니다.<br />
                    호스트는 그대로 남아있고 <span className="text-brand-600 font-bold">다시 매칭 대기 상태</span>로 전환됩니다.
                  </>
                ) : (
                  <>
                    해당 팀의 데이터를 DB에서 영구적으로 삭제합니다.
                  </>
                )}
              </p>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-xl mb-4 h-24 text-sm bg-white text-gray-900 focus:border-brand-500 outline-none resize-none"
                placeholder="반려 사유 입력 (예: 학생증 식별 불가)"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setRejectModalOpen(false)} disabled={processing} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200">취소</button>
                <button type="button" onClick={confirmReject} disabled={processing} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 flex items-center justify-center gap-2">
                  {processing && <Loader2 className="animate-spin" size={16} />}
                  {deleteContext.teamType === 'HOST' ? '전체 삭제' : '삭제하기'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Custom Alert/Confirm Modal */}
      {
        modalConfig.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="mb-4 flex justify-center">
                {modalConfig.type === 'CONFIRM' ? (
                  <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
                    <AlertCircle size={32} />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <AlertTriangle size={32} />
                  </div>
                )}
              </div>

              <p className="text-gray-900 font-bold text-lg mb-8 whitespace-pre-wrap leading-relaxed">
                {modalConfig.message}
              </p>

              <div className="flex gap-3 justify-center">
                {modalConfig.type === 'CONFIRM' ? (
                  <>
                    <button onClick={handleModalClose} className="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">취소</button>
                    <button onClick={handleModalConfirm} className="flex-1 py-3.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors">확인</button>
                  </>
                ) : (
                  <button onClick={handleModalClose} className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors">확인</button>
                )}
              </div>
            </motion.div>
          </div>
        )
      }
    </div >
  );
};

const TeamCard = ({ team, onVerify }: { team: TeamInfo, onVerify: () => void }) => {
  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm ${team.status === 'MATCH_CONFIRMED' ? 'border-brand-500 ring-2 ring-brand-100' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${team.gender === 'MALE' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>{team.gender}</span>
          <h4 className="font-bold text-sm mt-1">{team.university} ({team.headCount}명)</h4>
        </div>
        {team.isVerified ? (
          <div className="flex items-center text-green-600 text-xs font-bold gap-0.5">
            <Check size={14} /> 승인됨
          </div>
        ) : (
          <button onClick={onVerify} className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-md font-bold animate-pulse hover:bg-orange-200 cursor-pointer">승인필요</button>
        )}
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex items-center gap-1"><Users size={12} /> {team.phone}</div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1"><FileText size={12} /> 학생증</span>
          <a href={team.studentIdUrl} target="_blank" rel="noreferrer" className="underline text-blue-500 hover:text-blue-700">보기</a>
        </div>
        {team.members && team.members.length > 0 && (
          <div className="pt-2 mt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 mb-1">멤버 구성:</p>
            {team.members.map((m, idx) => (
              <div key={idx} className="flex justify-between text-[11px] text-gray-600">
                <span>{m.age}세 {m.major}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
