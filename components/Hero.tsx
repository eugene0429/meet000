import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HeroProps {
  onCtaClick: () => void;
}

const Hero: React.FC<HeroProps> = ({ onCtaClick }) => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-100 rounded-full blur-3xl opacity-60 mix-blend-multiply filter animate-blob" />
        <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-accent-blue/20 rounded-full blur-3xl opacity-60 mix-blend-multiply filter animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] right-[20%] w-[600px] h-[600px] bg-accent-purple/20 rounded-full blur-3xl opacity-60 mix-blend-multiply filter animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
              <Sparkles size={16} className="text-brand-500 fill-brand-500" />
              <span className="text-sm font-bold text-gray-800 tracking-tight">대전 대학생들을 위한 N:N 매칭</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] mb-6 tracking-tighter text-balance">
              아는 인맥 총동원<br />
              <span className="text-gray-400">미팅은 그만,</span><br />
              <span className="bg-gradient-to-r from-brand-500 to-accent-blue bg-clip-text text-transparent">오늘 만날까요?</span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0 font-medium leading-relaxed">
              가장 가볍고 확실한 40분. <br className="hidden md:block" />
              meet000에서 새로운 인연을 부담없이 만나보세요.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={onCtaClick}
                className="group relative px-8 py-4 bg-gray-900 text-white text-lg font-bold rounded-full overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  지금 바로 빈 슬롯 확인하기
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>
          </motion.div>

          {/* Visual Content - Staggered Grid */}
          <div className="relative hidden lg:block h-[600px]">
            {/* Simulated bubbly layout similar to reference */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute top-10 right-10 w-72 h-80 rounded-[40px] overflow-hidden shadow-2xl border-4 border-white rotate-3 z-20"
            >
              <img src="images/hero2.png" alt="Student Life" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white font-bold text-lg">새로운 만남 👋</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="absolute top-40 left-10 w-64 h-64 rounded-full overflow-hidden shadow-2xl border-4 border-white -rotate-6 z-10"
            >
              <img src="images/hero1.png" alt="Party Vibe" className="w-full h-full object-cover" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="absolute bottom-10 right-32 bg-white p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-30 max-w-xs"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">✅</div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Status</p>
                  <p className="font-bold text-gray-900">매칭 성공률 92%</p>
                </div>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 w-[92%]" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;