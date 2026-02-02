
import React from 'react';
import { UserPlus, Users, MousePointerClick, ThumbsUp } from 'lucide-react';

const HowItWorks: React.FC = () => {
  const steps = [
    {
      id: "01",
      title: "팀 등록 (Host)",
      desc: "빈 슬롯을 선점하여 우리 팀을 등록하세요. 호스트가 되면 매칭 상대를 직접 고를 수 있는 권한을 가집니다.",
      icon: <UserPlus className="text-brand-600 w-8 h-8" />
    },
    {
      id: "02",
      title: "매칭 신청 (Guest)",
      desc: "이미 등록된 매력적인 팀이 있나요? 신청을 보내세요! 경쟁률이 높을수록 어필이 중요합니다.",
      icon: <Users className="text-brand-600 w-8 h-8" />
    },
    {
      id: "03",
      title: "상대 선택 & 확정",
      desc: "여러 신청 팀 중 가장 마음에 드는 팀을 호스트가 선택하면 매칭이 최종 확정됩니다.",
      icon: <MousePointerClick className="text-brand-600 w-8 h-8" />
    },
    {
      id: "04",
      title: "만남 & 투표",
      desc: "space000에서 40분간 만남 후, 비밀 투표를 통해 2차 이동 여부를 결정합니다.",
      icon: <ThumbsUp className="text-brand-600 w-8 h-8" />
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-gray-900 mb-4">How it works</h2>
          <p className="text-xl text-gray-500">먼저 등록하여 선택권을 가지거나, 원하는 팀에게 도전하세요.</p>
        </div>

        <div className="relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step) => (
              <div key={step.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 group">
                <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-6 group-hover:bg-brand-100 transition-colors">
                  {step.icon}
                </div>
                <div className="text-4xl font-black text-gray-100 absolute top-6 right-6 select-none group-hover:text-brand-50 transition-colors">
                  {step.id}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
