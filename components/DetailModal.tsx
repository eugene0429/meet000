import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, MapPin, Star, UserCheck, MessageCircle, Lock, ArrowDown, Building2, Users2, Quote } from 'lucide-react';
import { DetailTab } from '../types';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab: DetailTab;
}

const DetailModal: React.FC<DetailModalProps> = ({ isOpen, onClose, initialTab }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);

  // Update active tab if prop changes while open
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'SERVICE', label: '서비스 소개' },
    { id: 'PROCESS', label: '이용 방법' },
    { id: 'SPACE', label: '공간 둘러보기' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'SERVICE':
        return <ServiceContent />;
      case 'PROCESS':
        return <ProcessContent />;
      case 'SPACE':
        return <SpaceContent />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center lg:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-6xl h-full lg:h-[90vh] lg:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-100 bg-white z-10">
              <div className="flex gap-1 lg:gap-2 bg-gray-100 p-1 rounded-full">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 lg:px-6 py-2 lg:py-2.5 rounded-full text-[11px] lg:text-sm font-bold transition-all ${activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-md'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
              {renderContent()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Sub-components for Content ---

const ServiceContent = () => (
  <div className="p-8 md:p-16 max-w-4xl mx-auto text-center">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-16"
    >
      <span className="text-brand-600 font-bold tracking-widest text-sm uppercase mb-4 block">Our Vision</span>
      <h2 className="text-2xl md:text-5xl font-black text-gray-900 mb-8 leading-tight">
        만남의 본질에 집중하는<br />
        <span className="text-brand-500">가장 캐주얼한 플랫폼</span>
      </h2>
      <p className="text-base md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto break-keep">
        meet000은 "오늘 바로 만날 수 없을까?"라는 단순한 물음에서 시작했습니다.
        복잡한 주선 과정, 부담스러운 비용, 어색한 분위기를 모두 덜어내고
        오직 '설렘'과 '대화'에만 집중할 수 있는 문화를 만들어갑니다.
      </p>
    </motion.div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[
        { title: "Casual", desc: "격식 없이 가볍게, 친구 만나듯 편안하게" },
        { title: "Efficient", desc: "40분의 룰로 시간 낭비 없는 확실한 의사결정" },
        { title: "Safe", desc: "철저한 신원 인증과 안전한 오프라인 공간" }
      ].map((item, i) => (
        <div key={i} className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-gray-100">
          <h3 className="text-xl md:text-2xl font-bold mb-3">{item.title}</h3>
          <p className="text-sm md:text-base text-gray-500 font-medium">{item.desc}</p>
        </div>
      ))}
    </div>
  </div>
);

const ProcessContent = () => {
  const steps = [
    {
      title: "팀 등록 및 매칭 신청",
      icon: <UserCheck />,
      content: (
        <div className="space-y-2">
          <p className="text-[11px] md:text-base">space000에서 정한 특정 날짜/시간의 빈 슬롯에 팀 정보를 입력합니다.</p>
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[10px] md:text-sm font-bold flex gap-2 items-start">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>필수: 대학생 신분 확인을 위해 대표자 1명의 학생증 사진을 반드시 업로드해야 합니다.</span>
          </div>
        </div>
      )
    },
    {
      title: "매칭 확정 및 정보 전달",
      icon: <MessageCircle />,
      content: (
        <div className="space-y-2">
          <p className="text-[11px] md:text-base">상대 팀이 신청을 수락하거나, 내가 보낸 신청이 수락되면 <strong>KakaoTalk</strong>으로 알림이 발송됩니다.</p>
          <p className="text-[11px] md:text-sm text-gray-500">space000 공식 채널을 통해 1차 매칭이 성사됩니다.</p>
        </div>
      )
    },
    {
      title: "옵션: 인스타 ID 교환 (선택)",
      icon: <Lock />,
      content: (
        <div className="space-y-3">
          <p className="text-[11px] md:text-base">1차 매칭 후, 바로 만나기 전 서로의 정보를 더 알고 싶으신가요?</p>
          <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
            <span className="font-bold text-brand-800 block mb-1 text-[11px] md:text-sm">🔍 사전 열람 옵션</span>
            <p className="text-[11px] md:text-sm text-brand-700">추가금을 지불하고 양 팀이 모두 동의하면 <strong>서로의 인스타그램 ID를 사전에 열람</strong>할 수 있습니다.</p>
          </div>
          <p className="text-[9px] md:text-xs text-gray-500">
            * 인스타 확인 후 한 팀이라도 거절 시 매칭은 파기됩니다. (이 경우 해당 슬롯은 자동 재등록되지 않습니다.)<br />
            * 이 과정을 생략하고 바로 만남을 진행할 수도 있습니다.
          </p>
        </div>
      )
    },
    {
      title: "Space000 방문 & 40분 미팅",
      icon: <Building2 />,
      content: (
        <div className="space-y-2">
          <p className="text-[11px] md:text-base">예약된 시간에 <strong>space000 1층 라운지</strong>로 방문합니다.</p>
          <p className="text-[9px] md:text-base">자체 제작된 아이스브레이킹 카드를 활용해 40분간 밀도 높은 대화를 나눕니다.</p>
        </div>
      )
    },
    {
      title: "운명의 40분: Go or Stop",
      icon: <CheckCircle2 />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-gray-900 text-white p-4 rounded-xl">
            <div className="text-xl md:text-2xl">🔔</div>
            <div className="text-[11px] md:text-sm font-medium">
              40분 후 알람이 울리면<br />
              <strong>남자팀은 지하(B1)</strong>로 이동, <strong>여자팀은 1층</strong> 대기
            </div>
          </div>
          <p className="text-[11px] md:text-sm">
            각 층에서 팀원끼리 상의 후 <strong>카카오톡 채널로 Go/Stop 투표</strong>를 진행합니다.
          </p>
          <ul className="list-disc pl-5 text-[10px] md:text-sm text-gray-600 space-y-1">
            <li><strong>Both GO:</strong> 2차 매칭 성공! (파티룸 할인권 지급)</li>
            <li><strong>One STOP:</strong> 매칭 종료. 여성팀은 그대로 귀가합니다.</li>
          </ul>
          <p className="text-[9px] md:text-xs text-gray-400 font-bold">* 누가 Stop을 했는지는 상대방에게 공개되지 않습니다.</p>
        </div>
      )
    }
  ];

  return (
    <div className="p-8 md:p-16 max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-black text-gray-900">상세 이용 프로세스</h2>
        <p className="text-sm md:text-base text-gray-500">투명하고 체계적인 meet000만의 시스템</p>
      </div>

      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 md:left-8 top-4 bottom-4 w-0.5 bg-gray-200" />

        <div className="space-y-12">
          {steps.map((step, idx) => (
            <div key={idx} className="relative pl-20 md:pl-24 group">
              {/* Icon Bubble */}
              <div className="absolute left-0 top-0 w-12 h-12 md:w-16 md:h-16 rounded-full bg-white border-2 border-brand-500 flex items-center justify-center text-brand-600 z-10 shadow-sm group-hover:scale-110 transition-transform">
                {React.cloneElement(step.icon as React.ReactElement<any>, { size: 24 })}
              </div>

              {/* Content Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <h3 className="text-[11px] md:text-xl font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                  <span className="text-brand-500">Step {idx + 1}.</span> {step.title}
                </h3>
                <div className="text-sm md:text-base text-gray-600 leading-relaxed">
                  {step.content}
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="absolute left-6 md:left-8 -bottom-8 transform -translate-x-1/2 text-gray-300">
                  <ArrowDown size={20} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SpaceContent = () => {
  const reviews = [
    { text: "공간이 너무 아늑하고 예쁘고, 가성비가 정말 좋은 것 같아요! 다시 방문 의사 너무너무 있습니다!", user: "**주0508" },
    { text: "카이스트나 충남대생들 소인원으로 놀려면 계룡산 엠티 갈바에 여기 빌려서 노는게 나은듯", user: "**바흐13" },
    { text: "분위기가 좋아요 ㅎㅎ 되게 잘 꾸며져 있고 친구들이랑 소소한 모임하기 좋아요 또 오고 싶네요!", user: "**홍홍" },
  ];

  return (
    <div className="p-0">
      {/* Hero Image Section */}
      <div className="h-[400px] relative">
        <img src="images/main_cover.jpeg" alt="Space000 Interior" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-center p-4">
          <h2 className="text-3xl md:text-5xl font-black mb-4">space000</h2>
          <p className="text-sm md:text-xl font-medium max-w-2xl px-4 break-keep">
            유성구 어은동에 위치한 프라이빗 파티룸 & 라운지<br />
            KAIST 학생들이 직접 기획하고 만든 공간입니다.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {[
            { label: "오픈", value: "2025.03" },
            { label: "누적 예약", value: "250+" },
            { label: "재방문율", value: "50%" },
            { label: "평점", value: "4.9/5.0" },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm text-center border border-gray-100">
              <div className="text-xl md:text-3xl font-black text-brand-600 mb-1">{stat.value}</div>
              <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Description Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 items-center">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2">
                <Building2 size={24} className="text-brand-500" /> 1F : Cafe & Meeting Lounge
              </h3>
              <p className="text-[12px] md:text-base text-gray-600">
                따뜻한 조명과 감각적인 가구로 꾸며진 라운지입니다.
                첫 만남의 어색함을 덜어줄 수 있는 편안한 분위기를 조성했습니다.
              </p>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2">
                <Users2 size={24} className="text-brand-500" /> B1 : Dining & Rest
              </h3>
              <p className="text-[12px] md:text-base text-gray-600">
                계단을 따라 내려가면 펼쳐지는 반전 매력의 공간.
                넓은 다이닝 테이블과 조리 시설, 편안한 소파가 준비되어 있어
                2차 모임이나 파티를 즐기기에 최적화되어 있습니다.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl">
              <p className="text-sm font-medium text-gray-700">
                "KAIST 학생들이 취미로 시작한 공간 공유 비즈니스입니다.
                직접 인테리어부터 운영까지 담당하며, 대학생들이 진정으로 원하는
                안전하고 힙한 놀이 문화를 만들어갑니다."
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src="images/interior_1.jpg" className="rounded-2xl w-full h-full object-cover mt-8" alt="Interior 1" />
            <img src="images/interior_2.jpg" className="rounded-2xl w-full h-full object-cover" alt="Interior 2" />
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-slate-50 rounded-[3rem] p-8 md:p-12">
          <h3 className="text-xl md:text-2xl font-bold text-center mb-10 flex items-center justify-center gap-2">
            <Star className="fill-yellow-400 text-yellow-400" />
            Real Reviews
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((review, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm relative">
                <Quote className="text-brand-100 absolute top-4 left-4" size={40} />
                <p className="text-[14px] lg:text-gray-700 font-medium mb-4 relative z-10 pt-4 leading-relaxed">
                  "{review.text}"
                </p>
                <div className="text-right">
                  <span className="text-[12px] font-bold text-gray-400">- {review.user}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a
              href="https://naver.me/5f5wQicI"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 underline hover:text-brand-600 transition-colors"
            >
              네이버 플레이스 후기 더 보러가기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;