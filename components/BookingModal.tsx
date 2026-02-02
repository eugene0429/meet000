
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6 md:p-8 overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-gray-900 mb-2">오늘의 미팅 라인업</h3>
              <p className="text-gray-500">원하는 시간대를 선택하여 예약을 진행하세요.</p>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {['18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'].map((time, idx) => (
                <div key={time} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:border-brand-500 hover:shadow-md transition-all cursor-pointer group bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-xl text-brand-600 shadow-sm">
                       <Calendar size={20} />
                    </div>
                    <div>
                      <span className="block font-bold text-lg text-gray-900">{time}</span>
                      <span className="text-xs text-gray-500 font-medium">실시간 현황 확인 가능</span>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-brand-600 text-white rounded-lg font-bold text-sm group-hover:bg-brand-700 transition-colors">
                    선택하기
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
               <p className="text-center text-xs text-gray-400 mb-4">
                 예약 확정 시 카카오톡으로 안내 메시지가 발송됩니다.
               </p>
               <button onClick={onClose} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800">
                 닫기
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BookingModal;
