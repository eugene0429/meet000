import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock, X, Loader2, ChevronLeft, ChevronRight,
    Calendar as CalendarIcon, Users, Check, Trash2, FileText, AlertCircle, AlertTriangle
} from 'lucide-react';

import { AdminDashboardProps, AdminSlot, ModalConfig, DeleteContext } from './types';
import { TIMES } from './constants';

// Hooks
import { useAdminAuth } from './hooks/useAdminAuth';
import { useSlotData } from './hooks/useSlotData';
import { useSlotOperations } from './hooks/useSlotOperations';
import { useTeamOperations } from './hooks/useTeamOperations';
import { useMatchingFlow } from './hooks/useMatchingFlow';
import { useInfoExchange } from './hooks/useInfoExchange';

// Services & Types
import { supabase } from '../../lib/supabaseClient';
import { fetchSystemConfig, SystemConfig } from '../../services/configService';
import { TeamInfo } from '../../types';
import { formatDateForNotification } from './utils/mapTeamData';

// Inline TeamCard component
const TeamCard = ({ team, onVerify }: { team: TeamInfo; onVerify: () => void }) => {
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

export function AdminDashboard({ isOpen, onClose }: AdminDashboardProps) {
    // Local state
    const [loginLoading, setLoginLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'RESERVATIONS' | 'SLOTS'>('RESERVATIONS');
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    });
    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

    // Delete context for modal
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [deleteContext, setDeleteContext] = useState<DeleteContext>({
        teamId: null,
        teamType: 'GUEST',
        slot: null
    });
    const [rejectionReason, setRejectionReason] = useState('');

    // Modal state
    const [modalConfig, setModalConfig] = useState<ModalConfig>({
        isOpen: false,
        type: 'ALERT',
        message: '',
    });

    // Modal helpers
    const showAlert = useCallback((message: string) => {
        setModalConfig({ isOpen: true, type: 'ALERT', message });
    }, []);

    const showConfirm = useCallback((message: string, onConfirm: () => void) => {
        setModalConfig({ isOpen: true, type: 'CONFIRM', message, onConfirm });
    }, []);

    const handleModalClose = useCallback(() => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleModalConfirm = useCallback(() => {
        if (modalConfig.onConfirm) modalConfig.onConfirm();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    }, [modalConfig.onConfirm]);

    // Use custom hooks
    const { isAuthenticated, password, setPassword, setIsAuthenticated } = useAdminAuth();
    const { dailySlots, loading, fetchDailyData } = useSlotData();
    const { processing: slotProcessing, toggleSlotOpen, updateSlotPrice, updateMaxApplicants } = useSlotOperations(showAlert);
    const { processing: teamProcessing, executeVerify, confirmReject: teamConfirmReject } = useTeamOperations(showAlert);
    const { processing: matchProcessing, executeFirstMatch, executeFinalMatch, executeCancelFirstMatch } = useMatchingFlow(showAlert);
    const { processing: infoProcessing, updateTeamInfoPreference, handleNextStep, handlePaymentConfirm, handleConfirmDecision } = useInfoExchange(showAlert);

    const processing = slotProcessing || teamProcessing || matchProcessing || infoProcessing;

    // Custom login with DB validation
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

    // Load system config on mount
    useEffect(() => {
        fetchSystemConfig().then(config => {
            setSystemConfig(config);
        });
    }, []);

    // Fetch data when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            fetchDailyData(selectedDate);
        }
    }, [selectedDate, isAuthenticated, activeTab, fetchDailyData]);

    // Action wrappers with refresh
    const handleVerifyClick = useCallback((teamId: string) => {
        showConfirm("팀을 승인하시겠습니까?", async () => {
            await executeVerify(teamId, () => fetchDailyData(selectedDate));
        });
    }, [showConfirm, executeVerify, fetchDailyData, selectedDate]);

    const openRejectModal = useCallback((teamId: string, teamType: 'HOST' | 'GUEST', slot: AdminSlot) => {
        setDeleteContext({ teamId, teamType, slot });
        setRejectModalOpen(true);
    }, []);

    const confirmReject = useCallback(async () => {
        await teamConfirmReject(
            deleteContext.teamId,
            deleteContext.teamType,
            deleteContext.slot,
            selectedDate,
            () => fetchDailyData(selectedDate)
        );
        setRejectModalOpen(false);
    }, [teamConfirmReject, deleteContext, selectedDate, fetchDailyData]);

    const handleFirstMatchClick = useCallback((slot: AdminSlot, selectedGuestId: string) => {
        if (!slot.hostTeam) return;
        showConfirm(
            `선택한 게스트와 1차 매칭을 확정합니다.\n\n📋 인스타 교환 단계로 진입합니다.\n\n정보 교환 의사를 확인한 후 최종 매칭을 진행하세요.`,
            async () => {
                await executeFirstMatch(slot, selectedGuestId, selectedDate, () => fetchDailyData(selectedDate));
            }
        );
    }, [showConfirm, executeFirstMatch, selectedDate, fetchDailyData]);

    const handleFinalMatchClick = useCallback((slot: AdminSlot, selectedGuestId: string) => {
        if (!slot.hostTeam) return;
        showConfirm(
            "🎉 최종 매칭을 확정하시겠습니까?\n\n확정 시 선택되지 않은 다른 게스트들은 자동으로 삭제됩니다.",
            async () => {
                await executeFinalMatch(slot, selectedGuestId, () => fetchDailyData(selectedDate));
            }
        );
    }, [showConfirm, executeFinalMatch, fetchDailyData, selectedDate]);

    const handleCancelFirstMatch = useCallback((slot: AdminSlot) => {
        showConfirm(
            "⚠️ 1차 매칭을 취소하고 슬롯을 초기화하시겠습니까?\n\n모든 팀 데이터가 삭제됩니다.",
            async () => {
                await executeCancelFirstMatch(slot, () => fetchDailyData(selectedDate));
            }
        );
    }, [showConfirm, executeCancelFirstMatch, fetchDailyData, selectedDate]);

    const handleNextStepClick = useCallback((slot: AdminSlot) => {
        handleNextStep(slot, selectedDate, systemConfig, () => fetchDailyData(selectedDate));
    }, [handleNextStep, selectedDate, systemConfig, fetchDailyData]);

    const handlePaymentConfirmClick = useCallback((teamId: string, slot: AdminSlot) => {
        handlePaymentConfirm(teamId, slot, selectedDate, () => fetchDailyData(selectedDate));
    }, [handlePaymentConfirm, selectedDate, fetchDailyData]);

    const handleConfirmDecisionClick = useCallback((teamId: string, decision: boolean, slot: AdminSlot) => {
        handleConfirmDecision(teamId, decision, slot, selectedDate, systemConfig, () => fetchDailyData(selectedDate));
    }, [handleConfirmDecision, selectedDate, systemConfig, fetchDailyData]);

    const handleInfoPreferenceClick = useCallback((teamId: string, field: 'wants_info' | 'shares_info' | 'has_paid' | 'has_confirmed', value: boolean | null) => {
        updateTeamInfoPreference(teamId, field, value, () => fetchDailyData(selectedDate));
    }, [updateTeamInfoPreference, fetchDailyData, selectedDate]);

    // Helper: can final match
    const canFinalMatch = (slot: AdminSlot): boolean => {
        const host = slot.hostTeam;
        const guest = slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED');
        if (!host || !guest) return false;

        const hostReady = host.processStep === 'READY_FOR_FINAL';
        const guestReady = guest.processStep === 'READY_FOR_FINAL';

        if (host.processStep === 'CANCELLED' || guest.processStep === 'CANCELLED') return false;

        return hostReady && guestReady;
    };

    // Calendar helpers
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
                                                            <button onClick={() => toggleSlotOpen(slot, () => fetchDailyData(selectedDate))} disabled={processing} className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${slot.is_open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
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
                                                                            onChange={(e) => updateMaxApplicants(slot, parseInt(e.target.value), () => fetchDailyData(selectedDate))}
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
                                                                            onChange={(e) => updateSlotPrice(slot, 'male', parseInt(e.target.value), () => fetchDailyData(selectedDate))}
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
                                                                            onChange={(e) => updateSlotPrice(slot, 'female', parseInt(e.target.value), () => fetchDailyData(selectedDate))}
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
                                                                                    onClick={() => handleInfoPreferenceClick(slot.hostTeam!.id, 'wants_info', true)}
                                                                                    className={`px-3 py-1 text-xs rounded-l-lg border transition-all ${slot.hostTeam.wantsInfo === true
                                                                                        ? 'bg-brand-600 text-white border-brand-600'
                                                                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                                                        }`}
                                                                                >
                                                                                    예
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleInfoPreferenceClick(slot.hostTeam!.id, 'wants_info', false)}
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
                                                                                    onClick={() => handleInfoPreferenceClick(slot.hostTeam!.id, 'shares_info', true)}
                                                                                    className={`px-3 py-1 text-xs rounded-l-lg border transition-all ${slot.hostTeam.sharesInfo === true
                                                                                        ? 'bg-brand-600 text-white border-brand-600'
                                                                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                                                        }`}
                                                                                >
                                                                                    공개
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleInfoPreferenceClick(slot.hostTeam!.id, 'shares_info', false)}
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
                                                                                {slot.hostTeam.processStep === 'WAITING_PAYMENT' && (
                                                                                    <button
                                                                                        onClick={() => handlePaymentConfirmClick(slot.hostTeam!.id, slot)}
                                                                                        disabled={processing}
                                                                                        className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                                                                                    >
                                                                                        💰 결제 확인 완료
                                                                                    </button>
                                                                                )}
                                                                                {slot.hostTeam.processStep === 'WAITING_CONFIRM' && (
                                                                                    <div className="flex gap-2">
                                                                                        <button
                                                                                            onClick={() => handleConfirmDecisionClick(slot.hostTeam!.id, true, slot)}
                                                                                            disabled={processing}
                                                                                            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                                                                                        >
                                                                                            ✅ 진행
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleConfirmDecisionClick(slot.hostTeam!.id, false, slot)}
                                                                                            disabled={processing}
                                                                                            className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                                                                                        >
                                                                                            ❌ 취소
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                                {slot.hostTeam.processStep === 'WAITING_OTHER' && (
                                                                                    <div className="text-center text-xs text-gray-500 py-2">⏳ 게스트 프로세스 대기중...</div>
                                                                                )}
                                                                                {slot.hostTeam.processStep === 'COMPLETED' && (
                                                                                    <div className="text-center text-xs text-green-600 font-bold py-2">✅ 준비 완료</div>
                                                                                )}
                                                                                {slot.hostTeam.processStep === 'READY_FOR_FINAL' && (
                                                                                    <div className="text-center text-xs text-blue-600 font-bold py-2">💰 최종 결제 대기중</div>
                                                                                )}
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
                                                                                                onClick={() => handleInfoPreferenceClick(guest.id, 'wants_info', true)}
                                                                                                className={`px-3 py-1 text-xs rounded-l-lg border transition-all ${guest.wantsInfo === true
                                                                                                    ? 'bg-brand-600 text-white border-brand-600'
                                                                                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                                                                    }`}
                                                                                            >
                                                                                                예
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleInfoPreferenceClick(guest.id, 'wants_info', false)}
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
                                                                                                onClick={() => handleInfoPreferenceClick(guest.id, 'shares_info', true)}
                                                                                                className={`px-3 py-1 text-xs rounded-l-lg border transition-all ${guest.sharesInfo === true
                                                                                                    ? 'bg-brand-600 text-white border-brand-600'
                                                                                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                                                                    }`}
                                                                                            >
                                                                                                공개
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleInfoPreferenceClick(guest.id, 'shares_info', false)}
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
                                                                                            {guest.processStep === 'WAITING_PAYMENT' && (
                                                                                                <button
                                                                                                    onClick={() => handlePaymentConfirmClick(guest.id, slot)}
                                                                                                    disabled={processing}
                                                                                                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                                                                                                >
                                                                                                    💰 결제 확인 완료
                                                                                                </button>
                                                                                            )}
                                                                                            {guest.processStep === 'WAITING_CONFIRM' && (
                                                                                                <div className="flex gap-2">
                                                                                                    <button
                                                                                                        onClick={() => handleConfirmDecisionClick(guest.id, true, slot)}
                                                                                                        disabled={processing}
                                                                                                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                                                                                                    >
                                                                                                        ✅ 진행
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={() => handleConfirmDecisionClick(guest.id, false, slot)}
                                                                                                        disabled={processing}
                                                                                                        className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                                                                                                    >
                                                                                                        ❌ 취소
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                            {guest.processStep === 'WAITING_OTHER' && (
                                                                                                <div className="text-center text-xs text-gray-500 py-2">⏳ 호스트 프로세스 대기중...</div>
                                                                                            )}
                                                                                            {guest.processStep === 'COMPLETED' && (
                                                                                                <div className="text-center text-xs text-green-600 font-bold py-2">✅ 준비 완료</div>
                                                                                            )}
                                                                                            {guest.processStep === 'READY_FOR_FINAL' && (
                                                                                                <div className="text-center text-xs text-blue-600 font-bold py-2">💰 최종 결제 대기중</div>
                                                                                            )}
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

                                                {/* 다음 스텝 / 최종 매칭 버튼 (1차 매칭 상태일 때) */}
                                                {slot.status === 'FIRST_CONFIRMED' && (
                                                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                                        {/* 아직 다음 스텝 진행 전 */}
                                                        {!slot.hostTeam?.processStep && !slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED')?.processStep && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleNextStepClick(slot)}
                                                                disabled={processing}
                                                                className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm cursor-pointer"
                                                            >
                                                                {processing ? <Loader2 className="animate-spin" size={14} /> : <>▶️ 다음 스텝 진행</>}
                                                            </button>
                                                        )}

                                                        {/* 진행 중 상태 */}
                                                        {(slot.hostTeam?.processStep || slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED')?.processStep)
                                                            && !canFinalMatch(slot)
                                                            && (
                                                                <div className="text-center text-sm text-gray-500 py-3 bg-gray-50 rounded-lg">
                                                                    ⏳ 각 팀의 프로세스를 완료해주세요
                                                                </div>
                                                            )}

                                                        {/* 양팀 모두 READY_FOR_FINAL -> 최종 매칭 버튼 */}
                                                        {canFinalMatch(slot) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const guest = slot.guestTeams.find(g => g.status === 'FIRST_CONFIRMED');
                                                                    if (guest) handleFinalMatchClick(slot, guest.id);
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
            {rejectModalOpen && (
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
            )}

            {/* Custom Alert/Confirm Modal */}
            {modalConfig.isOpen && (
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
            )}
        </div>
    );
}
