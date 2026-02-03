import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { DetailTab } from '../types';

interface SpaceIntroProps {
  onOpenDetail: (tab: DetailTab) => void;
}

const SpaceIntro: React.FC<SpaceIntroProps> = ({ onOpenDetail }) => {
  return (
    <section id="space" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 text-brand-600 mb-2 font-bold">
              <ShieldCheck size={20} />
              <span>검증된 공간</span>
            </div>
            <h2 className="text-2xl lg:text-4xl font-black text-gray-900">
              space000에서 <br />
              안전하고 프라이빗하게
            </h2>
          </div>
          <p className="text-[14px] lg:text-lg text-gray-600 max-w-md">
            이미 많은 대학생이 만족한 공간.<br />
            술집의 소음이나 어색한 조명 걱정 없이 대화에 집중하세요.
          </p>
        </div>

        {/* Bento Grid Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-4 h-[600px]">
          <div className="md:col-span-2 row-span-2 relative rounded-[2rem] overflow-hidden group">
            <img
              src="images/main_hall.jpeg"
              alt="Main Space"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8">
              <span className="text-white font-bold text-2xl">Main Hall</span>
              <span className="text-gray-200">편안한 분위기의 라운지</span>
            </div>
          </div>
          <div className="relative rounded-[2rem] overflow-hidden group">
            <img
              src="images/main_cover.jpeg"
              alt="Private Booth"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg text-sm font-bold">
              Private Booth
            </div>
          </div>

          {/* Replaced Ratings Card with Modal Button */}
          <button
            onClick={() => onOpenDetail('SPACE')}
            className="relative rounded-[2rem] overflow-hidden group bg-brand-600 hover:bg-brand-500 transition-colors flex flex-col items-center justify-center p-8 text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all"
          >
            <div className="text-center">
              <span className="block text-3xl font-black mb-2">공간 둘러보기</span>
              <p className="text-brand-100 text-sm mb-4">내부 인테리어와 후기 확인하기</p>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto group-hover:translate-x-1 transition-transform">
                <ArrowRight size={24} />
              </div>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};

export default SpaceIntro;