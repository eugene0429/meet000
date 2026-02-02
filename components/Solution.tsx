import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Timer, HeartHandshake, Lock, Sparkles, RefreshCcw, Users, ShieldCheck, Instagram } from 'lucide-react';
import { generateIceBreaker } from '../services/geminiService';

const Solution: React.FC = () => {
  const [iceBreaker, setIceBreaker] = useState<string>("버튼을 눌러 주제를 생성해보세요!");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const themes = ["여행", "음식", "취미", "연애관", "MBTI", "대학생활"];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const result = await generateIceBreaker(randomTheme);
    setIceBreaker(result);
    setLoading(false);
  };

  return (
    <section id="solution" className="py-24 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main Heading */}
        <div className="mb-20">
          <span className="text-brand-600 font-bold text-lg tracking-wide uppercase block mb-2">The 40-Min Rule</span>
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter leading-tight">
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
              <p className="text-lg text-gray-700 leading-relaxed font-medium">
                40분 후, 계속 만날지 말지는 비밀리에 선택하세요.
                서로 동의할 때만 2차로 이어집니다. 거절의 어색함도,
                불필요한 시간 낭비도 없습니다.
              </p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h3 className="text-3xl font-bold mb-4">가장 완벽한 타이밍, 40분</h3>
            <p className="text-gray-600 text-lg">
              너무 짧지도, 길지도 않은 시간. 서로의 호감을 확인하기에 충분한 시간입니다.
              meet000의 알람이 울리면, 선택의 시간이 찾아옵니다.
            </p>
          </div>
        </div>

        {/* Feature 1.5: Verified System */}
        <div className="my-64">
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              체계적인 <span className="text-brand-600">안심 시스템</span>
            </h3>
            <p className="text-gray-500 text-lg">
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

        {/* Feature 2: AI Ice Breaking */}
        <div className="bg-black rounded-[3rem] p-8 md:p-16 relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-500/20 rounded-full blur-[100px]" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full mb-6 backdrop-blur-md border border-white/10">
                <Sparkles size={18} className="text-yellow-400" />
                <span className="font-bold text-sm">Powered by Gemini AI</span>
              </div>
              <h3 className="text-3xl md:text-5xl font-bold mb-6">
                어색할 틈 없는<br />
                <span className="text-brand-400">Ice-Breaking</span>
              </h3>
              <p className="text-gray-400 text-lg mb-8">
                전문 진행자 없이도 텐션 UP! meet000만의 자체 콘텐츠와
                AI가 추천하는 대화 주제가 분위기를 자연스럽게 리드합니다.
              </p>
            </div>

            {/* Interactive AI Widget */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="text-center mb-6">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI Topic Generator</span>
              </div>

              <div className="bg-white/5 rounded-2xl p-6 mb-6 min-h-[120px] flex items-center justify-center">
                <p className="text-xl md:text-2xl font-bold text-center text-white leading-relaxed animate-pulse-once">
                  {loading ? "AI가 주제를 생각중입니다..." : `"${iceBreaker}"`}
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
                {loading ? "생성 중..." : "새로운 주제 받기"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Solution;