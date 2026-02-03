
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Plus, Trash2, Instagram, Info, CheckCircle2, Upload, Loader2, Lock } from 'lucide-react';
import { MeetingSlot, ReservationFormData, SlotStatus, TeamMember, TeamInfo } from '../types';
import { supabase } from '../lib/supabaseClient';
import {
  sendHostRegisteredNotification,
  sendGuestAppliedNotification,
  sendHostNewApplicantNotification,
  formatDateForNotification,
  isSolapiConfigured
} from '../services/kakaoNotificationService';

interface ReservationSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

// Add price info to MeetingSlot if not changing global type
interface ExtendedMeetingSlot extends MeetingSlot {
  malePrice?: number;
  femalePrice?: number;
  isPast?: boolean;
}

const TIMES = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

// Helper: Image Compression
const compressImage = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Image compression failed'));
        }, 'image/jpeg', 0.7);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const ReservationSystem: React.FC<ReservationSystemProps> = ({ isOpen, onClose }) => {
  const [view, setView] = useState<'CALENDAR' | 'FORM' | 'SUCCESS'>('CALENDAR');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<MeetingSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dbSlots, setDbSlots] = useState<ExtendedMeetingSlot[]>([]);

  // Form State
  const [formData, setFormData] = useState<ReservationFormData>({
    gender: 'MALE',
    phone: '',
    members: [{ age: '', university: '', major: '', instagramId: '' }],
    studentIdImage: null,
    intro: ''
  });

  // Phone Parts State
  const [phoneParts, setPhoneParts] = useState({ p1: '010', p2: '', p3: '' });

  // Sync phoneParts to formData
  useEffect(() => {
    setFormData(prev => ({ ...prev, phone: `${phoneParts.p1}-${phoneParts.p2}-${phoneParts.p3}` }));
  }, [phoneParts]);

  const fetchSlots = async (date: Date) => {
    setLoadingSlots(true);
    // 로컬 시간대 기준으로 날짜 문자열 생성 (toISOString은 UTC로 변환되어 날짜가 달라질 수 있음)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    try {
      // 1. Fetch Teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*, members(*)')
        .eq('date', dateStr)
        .order('created_at', { ascending: true }); // Oldest first = Host

      if (teamsError) throw teamsError;

      // 2. Fetch Daily Config (날짜별 단일 row)
      const { data: dailyConfig, error: configError } = await supabase
        .from('daily_config')
        .select('*')
        .eq('date', dateStr)
        .single();

      // 설정이 없으면 기본값 사용
      const openTimes: string[] = dailyConfig?.open_times || [];
      const defaultMaxApplicants = dailyConfig?.max_applicants || 3;

      // 지난 날짜인지 확인 (한국 시간 기준)
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const isPastDate = dateStr < todayStr;

      // 3. Map to MeetingSlots
      const newSlots: ExtendedMeetingSlot[] = TIMES.map(time => {
        const teamsAtTimeRaw = teams?.filter(t => t.time === time) || [];

        // 지난 날짜는 무조건 닫힘, 아니면 open_times 배열 확인
        const isOpen = isPastDate ? false : openTimes.includes(time);

        // Parse slot config from JSON
        const slotConfig = dailyConfig?.slot_configs?.[time] || {};
        const maxApplicants = slotConfig.maxApplicants ?? defaultMaxApplicants;
        const malePrice = slotConfig.malePrice;
        const femalePrice = slotConfig.femalePrice;

        // Process Teams
        let hostTeam: TeamInfo | undefined;
        let guestTeams: TeamInfo[] = [];

        if (teamsAtTimeRaw.length > 0) {
          // The first team is the Host
          const hostRaw = teamsAtTimeRaw[0];
          hostTeam = mapTeamRawToInfo(hostRaw);

          // Rest are guests
          if (teamsAtTimeRaw.length > 1) {
            guestTeams = teamsAtTimeRaw.slice(1).map(mapTeamRawToInfo);
          }
        }

        // Determine Status
        let status = SlotStatus.AVAILABLE;

        // 매칭 상태 확인
        const isFirstConfirmed = teamsAtTimeRaw.some(t => t.status === 'FIRST_CONFIRMED');
        const isMatchConfirmed = teamsAtTimeRaw.some(t => t.status === 'MATCH_CONFIRMED');

        // 지난 날짜 처리: 매칭 완료된 것만 표시, 나머지는 마감
        if (isPastDate) {
          if (isMatchConfirmed) {
            status = SlotStatus.MATCH_CONFIRMED;
          } else if (isFirstConfirmed) {
            status = SlotStatus.FIRST_CONFIRMED;
          } else {
            status = SlotStatus.CLOSED; // 지난 날짜는 신규 등록/신청 불가
          }
        } else if (!isOpen) {
          status = SlotStatus.CLOSED;
        } else if (isMatchConfirmed) {
          status = SlotStatus.MATCH_CONFIRMED;
        } else if (isFirstConfirmed) {
          status = SlotStatus.FIRST_CONFIRMED;
        } else if (hostTeam) {
          if (guestTeams.length >= maxApplicants) {
            status = SlotStatus.FULL;
          } else {
            status = SlotStatus.HOST_REGISTERED;
          }
        }

        return {
          id: `${dateStr}-${time}`,
          time,
          status,
          maxApplicants,
          malePrice,
          femalePrice,
          isPast: isPastDate,
          hostTeam,
          guestTeams
        };
      });

      setDbSlots(newSlots);

    } catch (err) {
      console.error("Error fetching slots:", err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const mapTeamRawToInfo = (raw: any): TeamInfo => {
    const memberCount = raw.members?.length || 0;
    const totalAge = raw.members?.reduce((sum: number, m: any) => sum + (parseInt(m.age) || 0), 0) || 0;
    const avgAge = memberCount > 0 ? Math.round(totalAge / memberCount) : 0;

    return {
      id: raw.id,
      gender: raw.gender,
      headCount: memberCount,
      avgAge,
      university: raw.members?.[0]?.university || '대학생',
      phone: raw.phone,
      isVerified: raw.is_verified,
      studentIdUrl: raw.student_id_url,
      members: raw.members,
      createdAt: raw.created_at,
      status: raw.status,
      intro: raw.intro
    };
  };

  useEffect(() => {
    if (isOpen) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, isOpen]);

  // ... Calendar helpers (same as before)
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };
  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const handleDateClick = (day: number) => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  const { days, firstDay } = getDaysInMonth(currentMonth);
  const daysArray = Array.from({ length: days }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDay }, (_, i) => i);

  const handleSlotAction = (slot: MeetingSlot) => {
    if (slot.status === SlotStatus.FULL ||
      slot.status === SlotStatus.CLOSED ||
      slot.status === SlotStatus.MATCH_CONFIRMED ||
      slot.status === SlotStatus.FIRST_CONFIRMED) return;
    setSelectedSlot(slot);
    setView('FORM');
  };

  // ... Form helpers (same as before)
  const addMember = () => { if (formData.members.length < 4) setFormData({ ...formData, members: [...formData.members, { age: '', university: '', major: '', instagramId: '' }] }); };
  const removeMember = (index: number) => { if (formData.members.length > 1) { const newMembers = [...formData.members]; newMembers.splice(index, 1); setFormData({ ...formData, members: newMembers }); } };
  const updateMember = (index: number, field: keyof TeamMember, value: string) => { const newMembers = [...formData.members]; newMembers[index] = { ...newMembers[index], [field]: value }; setFormData({ ...formData, members: newMembers }); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { setFormData({ ...formData, studentIdImage: e.target.files[0] }); } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentIdImage) { alert("대표자 학생증 사진은 필수입니다."); return; }
    if (!selectedSlot) return;

    setSubmitting(true);
    try {
      // 로컬 시간대 기준으로 날짜 문자열 생성
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const timeStr = selectedSlot.time;

      const compressedImageBlob = await compressImage(formData.studentIdImage);
      const fileExt = 'jpg';
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('student-ids').upload(fileName, compressedImageBlob, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;

      const imageUrl = supabase.storage.from('student-ids').getPublicUrl(fileName).data.publicUrl;

      // Status determined by whether there is already a host
      const newStatus = selectedSlot.hostTeam ? 'MATCHING_REQUESTED' : 'HOST_REGISTERED';

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([{
          gender: formData.gender,
          phone: formData.phone,
          student_id_url: imageUrl,
          date: dateStr,
          time: timeStr,

          status: newStatus,
          intro: formData.intro
        }])
        .select();

      if (teamError) throw teamError;
      if (!teamData || teamData.length === 0) throw new Error("Failed to create team");

      const teamId = teamData[0].id;
      const membersToInsert = formData.members.map(m => ({
        team_id: teamId,
        age: m.age,
        university: m.university,
        major: m.major,
        instagram_id: m.instagramId
      }));

      const { error: memberError } = await supabase.from('members').insert(membersToInsert);
      if (memberError) throw memberError;

      // ✅ 알림톡 발송
      const dateFormatted = formatDateForNotification(selectedDate);
      const timeFormatted = selectedSlot.time;
      const isHost = !selectedSlot.hostTeam;

      if (isSolapiConfigured()) {
        if (isHost) {
          // 호스트 등록 완료 알림톡
          await sendHostRegisteredNotification(formData.phone, dateFormatted, timeFormatted);
        } else {
          // 게스트 신청 완료 알림톡
          await sendGuestAppliedNotification(
            formData.phone,
            dateFormatted,
            timeFormatted,
            selectedSlot.hostTeam?.university || ''
          );

          // 호스트에게 새 신청자 알림톡
          if (selectedSlot.hostTeam?.phone) {
            const guestInfo = {
              university: formData.members[0]?.university || '',
              gender: formData.gender,
              headCount: formData.members.length,
              avgAge: Math.round(
                formData.members.reduce((sum, m) => sum + (parseInt(m.age) || 0), 0) / formData.members.length
              ),
              phone: formData.phone,
            };
            await sendHostNewApplicantNotification(
              selectedSlot.hostTeam.phone,
              guestInfo,
              dateFormatted,
              timeFormatted
            );
          }
        }
      } else {
        console.log('📵 Solapi 미설정 - 알림톡 발송 건너뜀');
      }

      setView('SUCCESS');
      fetchSlots(selectedDate);
    } catch (error) {
      console.error("Submission error:", error);
      alert("예약 신청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setView('CALENDAR');
        setFormData({ gender: 'MALE', phone: '', members: [{ age: '', university: '', major: '', instagramId: '' }], studentIdImage: null, intro: '' });
        setPhoneParts({ p1: '010', p2: '', p3: '' }); // Reset phone parts
        setSubmitting(false);
      }, 300);
    }
  }, [isOpen]);

  // Render Logic
  const renderSlotButton = (slot: ExtendedMeetingSlot) => {
    if (slot.status === SlotStatus.CLOSED) {
      return (
        <button disabled className="w-full py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-400 cursor-not-allowed flex items-center justify-center gap-2">
          <Lock size={16} /> {slot.isPast ? '이미 지난 날짜' : '예약 오픈 전'}
        </button>
      );
    }
    if (slot.status === SlotStatus.MATCH_CONFIRMED) {
      return (
        <button disabled className="w-full py-3 rounded-xl font-bold text-sm bg-brand-100 text-brand-700 cursor-not-allowed flex items-center justify-center gap-2">
          ✅ 매칭 완료
        </button>
      );
    }
    if (slot.status === SlotStatus.FIRST_CONFIRMED) {
      return (
        <button disabled className="w-full py-3 rounded-xl font-bold text-sm bg-orange-100 text-orange-700 cursor-not-allowed flex items-center justify-center gap-2">
          ⏳ 매칭 진행중
        </button>
      );
    }
    if (slot.status === SlotStatus.FULL) {
      return (
        <button disabled className="w-full py-3 rounded-xl font-bold text-sm bg-gray-200 text-gray-400 cursor-not-allowed">
          신청 마감 (인원 초과)
        </button>
      );
    }
    if (slot.status === SlotStatus.HOST_REGISTERED) {
      return (
        <button onClick={() => handleSlotAction(slot)} className="w-full py-3 rounded-xl font-bold text-sm bg-brand-600 text-white hover:bg-brand-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
          <Plus size={16} /> 매칭 신청하기 ({slot.guestTeams.length}/{slot.maxApplicants})
        </button>
      );
    }
    // AVAILABLE
    return (
      <button onClick={() => handleSlotAction(slot)} className="w-full py-3 rounded-xl font-bold text-sm bg-gray-900 text-white hover:bg-gray-800 transition-all">
        이 시간에 팀 등록 (Host)
      </button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center lg:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md" />

          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative bg-white w-full max-w-5xl h-full lg:h-[90vh] lg:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
            <button onClick={onClose} className="absolute top-6 right-6 z-50 p-2 bg-white/50 backdrop-blur-sm rounded-full hover:bg-gray-100 transition-colors"><X size={24} /></button>

            {/* Left Panel */}
            <div className={`w-full md:w-1/2 lg:w-5/12 bg-slate-50 flex flex-col h-full border-r border-gray-100 ${view !== 'CALENDAR' ? 'hidden md:flex' : ''}`}>
              <div className="p-8 pb-4">
                <h2 className="text-3xl font-black text-gray-900 mb-2">예약하기</h2>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xl font-bold text-gray-700">{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</span>
                  <div className="flex gap-2">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronLeft /></button>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronRight /></button>
                  </div>
                </div>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                  {['일', '월', '화', '수', '목', '금', '토'].map(d => <span key={d} className="text-xs font-bold text-gray-400">{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {blanksArray.map(i => <div key={`blank-${i}`} />)}
                  {daysArray.map(day => {
                    const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth();
                    const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth();
                    return (
                      <button key={day} onClick={() => handleDateClick(day)} className={`relative aspect-square rounded-xl text-sm font-bold flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-brand-600 text-white shadow-lg scale-105' : 'bg-white text-gray-700 hover:bg-brand-50'} ${isToday ? 'border-2 border-brand-500' : ''}`}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slots */}
              <div className="flex-1 overflow-y-auto p-8 pt-0 custom-scrollbar">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 예약 현황</h3>
                {loadingSlots ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-500" /></div> : (
                  <div className="space-y-3">
                    {dbSlots.map(slot => (
                      <div key={slot.id} className={`group p-4 rounded-2xl border transition-all ${slot.status === SlotStatus.MATCH_CONFIRMED ? 'bg-brand-50 border-brand-200' :
                        slot.status === SlotStatus.FIRST_CONFIRMED ? 'bg-orange-50 border-orange-200' :
                          slot.status === SlotStatus.CLOSED ? 'bg-gray-50 border-gray-200 opacity-60' :
                            slot.hostTeam ? 'bg-white border-brand-100 hover:border-brand-300' :
                              'bg-white border-gray-100 hover:border-gray-300 border-dashed'
                        }`}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-400" />
                            <span className="font-bold text-lg">{slot.time}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-md text-xs font-bold ${slot.status === SlotStatus.MATCH_CONFIRMED ? 'bg-brand-600 text-white' :
                            slot.status === SlotStatus.FIRST_CONFIRMED ? 'bg-orange-500 text-white' :
                              slot.status === SlotStatus.CLOSED ? 'bg-gray-200 text-gray-500' :
                                slot.status === SlotStatus.FULL ? 'bg-red-100 text-red-600' :
                                  slot.hostTeam ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                            {slot.status === SlotStatus.MATCH_CONFIRMED ? '매칭완료' :
                              slot.status === SlotStatus.FIRST_CONFIRMED ? '매칭진행중' :
                                slot.status === SlotStatus.CLOSED ? (slot.isPast ? '기간만료' : '마감') :
                                  slot.status === SlotStatus.FULL ? '신청초과' :
                                    slot.hostTeam ? '신청가능' : '등록가능'}
                          </span>
                        </div>

                        {slot.hostTeam && slot.status !== SlotStatus.CLOSED && (
                          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded inline-block">
                            <span>남: {slot.malePrice ? `${(slot.malePrice / 10000).toFixed(1)}만원` : '0.5만원'}</span>
                            <span className="w-px h-3 bg-gray-300"></span>
                            <span>여: {slot.femalePrice ? `${(slot.femalePrice / 10000).toFixed(1)}만원` : '0.5만원'}</span>
                          </div>
                        )}

                        {slot.status === SlotStatus.MATCH_CONFIRMED && slot.hostTeam ? (
                          <div className="mb-3 p-3 bg-white rounded-xl border border-brand-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-brand-700">🎉 매칭 성사!</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {slot.hostTeam.university} ({slot.hostTeam.gender === 'MALE' ? '남' : '여'} {slot.hostTeam.headCount}명) 팀이 매칭되었습니다.
                            </p>
                          </div>
                        ) : slot.status === SlotStatus.FIRST_CONFIRMED && slot.hostTeam ? (
                          <div className="mb-3 p-3 bg-white rounded-xl border border-orange-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-orange-600">⏳ 매칭 진행중</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              현재 인스타그램 교환이 진행되고 있습니다.
                            </p>
                          </div>
                        ) : slot.hostTeam && slot.status !== SlotStatus.CLOSED ? (
                          <div className="mb-3 p-3 bg-brand-50 rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-gray-800">{slot.hostTeam.university}</span>
                              <span className="text-xs font-bold bg-white px-2 py-0.5 rounded text-gray-500">
                                {slot.hostTeam.gender === 'MALE' ? '남성' : '여성'} {slot.hostTeam.headCount}명
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">평균 나이: {slot.hostTeam.avgAge}세 | 현재 {slot.guestTeams.length}팀 도전 중 🔥</p>
                            {slot.hostTeam.intro && (
                              <p className="mt-2 text-xs text-gray-700 bg-white/50 p-2 rounded italic">" {slot.hostTeam.intro} "</p>
                            )}
                          </div>
                        ) : slot.status !== SlotStatus.CLOSED ? (
                          <div className="mb-3 py-2">
                            <p className="text-sm text-gray-400 mb-2">아직 등록된 팀이 없습니다.<br />Host가 되어 선택권을 가지세요!</p>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                              <span>참가비: 남 {slot.malePrice ? `${(slot.malePrice / 10000).toFixed(1)}만원` : '0.5만원'}</span>
                              <span className="w-px h-3 bg-gray-300"></span>
                              <span>여 {slot.femalePrice ? `${(slot.femalePrice / 10000).toFixed(1)}만원` : '0.5만원'}</span>
                            </div>
                          </div>
                        ) : null}

                        {renderSlotButton(slot)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Form */}
            <div className={`w-full md:w-1/2 lg:w-7/12 bg-white flex flex-col h-full ${view === 'CALENDAR' ? 'hidden md:flex bg-gray-50 items-center justify-center' : ''}`}>
              {view === 'CALENDAR' && (
                <div className="text-center p-8 opacity-40">
                  <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center"><CalendarIcon size={40} className="text-gray-400" /></div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">날짜와 시간을 선택해주세요</h3>
                  <p>좌측 캘린더에서 오픈된 일정을<br />클릭하여 예약을 진행하세요.</p>
                </div>
              )}

              {view === 'FORM' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full">
                  <div className="p-8 border-b border-gray-100 flex items-center gap-4">
                    <button onClick={() => setView('CALENDAR')} className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
                    <div>
                      <h3 className="text-xl font-black text-gray-900">
                        {selectedSlot?.hostTeam ? '매칭 신청 (Guest)' : '팀 등록 (Host)'}
                      </h3>
                      <p className="text-sm text-brand-600 font-bold">{selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 {selectedSlot?.time}</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Reuse existing form inputs for gender, phone, image, members... */}
                    {/* Basic Info */}
                    <section className="mb-10">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">1</span>
                        기본 정보
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">팀 성별</label>
                          <div className="flex gap-4">
                            <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.gender === 'MALE' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 hover:border-gray-200'}`}>
                              <input type="radio" name="gender" value="MALE" checked={formData.gender === 'MALE'} onChange={() => setFormData({ ...formData, gender: 'MALE' })} className="hidden" />
                              <div className="text-center font-bold">남성</div>
                            </label>
                            <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.gender === 'FEMALE' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 hover:border-gray-200'}`}>
                              <input type="radio" name="gender" value="FEMALE" checked={formData.gender === 'FEMALE'} onChange={() => setFormData({ ...formData, gender: 'FEMALE' })} className="hidden" />
                              <div className="text-center font-bold">여성</div>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">대표자 연락처</label>
                          <div className="flex gap-2 w-full">
                            <select
                              className="w-24 p-4 rounded-xl bg-white border border-gray-200 focus:border-brand-500 outline-none font-bold text-gray-900 text-center appearance-none"
                              value={phoneParts.p1}
                              onChange={(e) => setPhoneParts(prev => ({ ...prev, p1: e.target.value }))}
                            >
                              <option value="010">010</option>
                              <option value="011">011</option>
                              <option value="016">016</option>
                              <option value="017">017</option>
                              <option value="018">018</option>
                              <option value="019">019</option>
                            </select>
                            <input
                              type="tel"
                              maxLength={4}
                              placeholder="0000"
                              className="flex-1 min-w-0 p-4 rounded-xl bg-white border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all font-bold text-gray-900 text-center tracking-widest"
                              value={phoneParts.p2}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setPhoneParts(prev => ({ ...prev, p2: val }));
                              }}
                            />
                            <input
                              type="tel"
                              maxLength={4}
                              placeholder="0000"
                              className="flex-1 min-w-0 p-4 rounded-xl bg-white border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all font-bold text-gray-900 text-center tracking-widest"
                              value={phoneParts.p3}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setPhoneParts(prev => ({ ...prev, p3: val }));
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">우리 팀 한줄 소개</label>
                          <input type="text" placeholder="분위기 좋은 팀입니다! 즐겁게 놀아요 :)" className="w-full p-4 rounded-xl bg-white border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all font-medium text-gray-900" value={formData.intro} onChange={(e) => setFormData({ ...formData, intro: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">대표자 학생증 인증 <span className="text-red-500">*</span></label>
                          <div className="flex items-center justify-center w-full">
                            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 transition-colors ${formData.studentIdImage ? 'border-brand-500 bg-brand-50' : 'border-gray-300 bg-gray-50'}`}>
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {formData.studentIdImage ? (
                                  <>
                                    <CheckCircle2 className="w-8 h-8 text-brand-600 mb-2" />
                                    <p className="text-sm text-brand-700 font-bold">{formData.studentIdImage.name}</p>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500"><span className="font-bold">클릭하여 업로드</span></p>
                                  </>
                                )}
                              </div>
                              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Member Info */}
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">2</span>
                          멤버 상세 정보
                        </h4>
                        <button type="button" onClick={addMember} className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1"><Plus size={14} /> 멤버 추가</button>
                      </div>
                      <div className="space-y-6">
                        {formData.members.map((member, idx) => (
                          <div key={idx} className="p-6 bg-gray-50 rounded-2xl relative group">
                            {idx > 0 && <button type="button" onClick={() => removeMember(idx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div><label className="text-xs font-bold text-gray-500 mb-1 block">나이</label><input type="number" placeholder="22" className="w-full p-3 rounded-lg border border-gray-200 focus:border-brand-500 outline-none bg-white text-gray-900" value={member.age} onChange={(e) => updateMember(idx, 'age', e.target.value)} /></div>
                              <div><label className="text-xs font-bold text-gray-500 mb-1 block">대학교</label><input type="text" placeholder="한국대" className="w-full p-3 rounded-lg border border-gray-200 focus:border-brand-500 outline-none bg-white text-gray-900" value={member.university} onChange={(e) => updateMember(idx, 'university', e.target.value)} /></div>
                            </div>
                            <div className="mb-4"><label className="text-xs font-bold text-gray-500 mb-1 block">학과</label><input type="text" placeholder="경영학과" className="w-full p-3 rounded-lg border border-gray-200 focus:border-brand-500 outline-none bg-white text-gray-900" value={member.major} onChange={(e) => updateMember(idx, 'major', e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Instagram size={12} /> 인스타그램 ID (선택)</label><input type="text" placeholder="@insta_id" className="w-full p-3 rounded-lg border border-gray-200 focus:border-brand-500 outline-none bg-white text-gray-900" value={member.instagramId} onChange={(e) => updateMember(idx, 'instagramId', e.target.value)} /></div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <button type="submit" disabled={submitting} className="w-full bg-gray-900 text-white font-bold text-lg py-5 rounded-xl hover:bg-gray-800 transition-transform active:scale-[0.99] shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting && <Loader2 className="animate-spin" />}
                      {selectedSlot?.hostTeam ? '매칭 도전하기' : '호스트로 등록하기'}
                    </button>
                  </form>
                </motion.div>
              )}

              {view === 'SUCCESS' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600"><CheckCircle2 size={48} /></div>
                  <h3 className="text-3xl font-black text-gray-900 mb-4">신청 완료!</h3>
                  <p className="text-gray-600 mb-8 max-w-sm">
                    {selectedSlot?.hostTeam
                      ? '매칭 신청이 완료되었습니다. 호스트가 선택하면 매칭이 확정됩니다.'
                      : '호스트 등록이 완료되었습니다. 신청 팀이 들어오면 알림을 드립니다.'
                    }
                  </p>
                  <button onClick={onClose} className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700">확인</button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReservationSystem;
