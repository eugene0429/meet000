import React from 'react';
import { motion } from 'framer-motion';
import { Frown, Clock, MessageSquareOff } from 'lucide-react';

const PainPoints: React.FC = () => {
  const cards = [
    {
      id: 1,
      icon: <Frown size={40} className="text-white" />,
      title: "아쉬운 소리 하기 싫죠?",
      desc: "주변에 미팅 시켜달라고 부탁하기 눈치 보이고\n자존심 상했던 경험, 이제 그만.",
      color: "bg-accent-orange",
      rotate: "-rotate-2"
    },
    {
      id: 2,
      icon: <Clock size={40} className="text-white" />,
      title: "시간 낭비는 질색",
      desc: "마음에 안 들어도 억지로 3~4시간 앉아있기\n곤혹스러우셨죠? 시간은 금입니다.",
      color: "bg-brand-500",
      rotate: "rotate-1"
    },
    {
      id: 3,
      icon: <MessageSquareOff size={40} className="text-gray-900" />,
      title: "어색한 침묵, NO",
      desc: "누군가 분위기 좀 띄워줬으면 싶으신 적 없나요?\nMC 역할은 이제 내려놓으세요.",
      color: "bg-accent-yellow",
      textColor: "text-gray-900",
      rotate: "-rotate-1"
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-6">
            기존 미팅, <br />
            <span className="text-gray-400 decoration-4 decoration-accent-orange underline-offset-4">이런 점이 힘들지 않았나요?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
              className={`p-8 rounded-[2.5rem] ${card.color} ${card.rotate} shadow-lg hover:shadow-2xl transition-all duration-300 min-h-[320px] flex flex-col justify-between`}
            >
              <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                {card.icon}
              </div>
              <div>
                <h3 className={`text-[27px] lg:text-2xl font-bold mb-4 tracking-tight ${card.textColor || 'text-white'}`}>
                  {card.title}
                </h3>
                <p className={`text-[14px] lg:text-[15px] font-medium leading-relaxed whitespace-pre-wrap ${card.textColor || 'text-white/90'}`}>
                  {card.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PainPoints;