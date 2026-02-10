import React from 'react';
import { Timer, Users, ShieldCheck, Instagram } from 'lucide-react';

const Solution: React.FC = () => {

  return (
    <section id="solution" className="py-24 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main Heading */}
        <div className="mb-20">
          <span className="text-brand-600 font-bold text-lg tracking-wide uppercase block mb-2">The 40-Min Rule</span>
          <h2 className="text-2xl sm:text-3xl md:text-6xl font-black text-gray-900 tracking-tighter leading-tight">
            딱 40분,<br />
            설렘은 채우고 <span className="text-brand-500">부담은 덜었습니다.</span>
          </h2>
        </div>

        {/* Feature 1: The Rule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-24 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="absolute inset-0 bg-brand-200 rounded-full blur-3xl opacity-30 transform -translate-x-10" />
            <div className="relative bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100">
              <div className="flex items-center gap-6 mb-8">
                <div className="bg-black text-white p-4 rounded-full">
                  <Timer size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Quick Decision</h3>
                  <p className="text-gray-500">비밀 투표 시스템</p>
                </div>
              </div>
              <p className="text-[14px] lg:text-lg text-gray-700 leading-relaxed font-medium">
                40분 후, 계속 만날지 말지는 비밀리에 선택하세요.
                서로 동의할 때만 2차로 이어집니다. 거절의 어색함도,
                불필요한 시간 낭비도 없습니다.
              </p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h3 className="text-2xl lg:text-3xl font-bold mb-4">가장 완벽한 타이밍, 40분</h3>
            <p className="text-[11.5px] lg:text-lg text-gray-600">
              너무 짧지도, 길지도 않은 시간. 서로의 호감을 확인하기에 충분한 시간입니다.
              meet000의 알람이 울리면, 선택의 시간이 찾아옵니다.
            </p>
          </div>
        </div>

        {/* Feature 1.5: Verified System */}
        <div className="my-64">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-4xl font-black text-gray-900 mb-4">
              체계적인 <span className="text-brand-600">안심 시스템</span>
            </h3>
            <p className="text-[13px] lg:text-lg text-gray-500">
              신원 인증부터 매칭까지, meet000이 확실하게 관리합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 1. Host & Guest */}
            <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-gray-100 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600 mb-6">
                <Users size={28} />
              </div>
              <h4 className="text-xl font-bold mb-3 text-gray-900">Host & Guest</h4>
              <p className="text-gray-600 leading-relaxed">
                원하는 시간에 팀을 등록하여 <strong>Host</strong>가 되거나,
                등록된 팀에 신청하여 <strong>Guest</strong>가 되어보세요.
                Host에게는 파트너 선택권이 주어집니다.
              </p>
            </div>

            {/* 2. University Verification */}
            <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-gray-100 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-6">
                <ShieldCheck size={28} />
              </div>
              <h4 className="text-xl font-bold mb-3 text-gray-900">철저한 학생증 인증</h4>
              <p className="text-gray-600 leading-relaxed">
                모든 참가자는 <strong>학생증 인증</strong>을 거쳐야만 합니다.
                확실한 대학생들끼리의 만남, 믿고 참여하세요.
              </p>
            </div>

            {/* 3. Instagram Exchange */}
            <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-gray-100 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
                <Instagram size={28} />
              </div>
              <h4 className="text-xl font-bold mb-3 text-gray-900">인스타그램 교환 옵션</h4>
              <p className="text-gray-600 leading-relaxed">
                만나기 전, 서로의 분위기가 궁금한가요?
                상호 동의 시 사전에 <strong>인스타그램 ID를 교환</strong>할 수 있는
                옵션을 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solution;