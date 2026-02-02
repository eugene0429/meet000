import React from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DetailTab } from '../types';

interface HeaderProps {
  onBookClick?: () => void;
  onOpenDetail?: (tab: DetailTab) => void;
}

const Header: React.FC<HeaderProps> = ({ onBookClick, onOpenDetail }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const navLinks: { name: string; id: DetailTab }[] = [
    { name: '서비스 소개', id: 'SERVICE' },
    { name: '이용 방법', id: 'PROCESS' },
    { name: '공간 둘러보기', id: 'SPACE' },
  ];

  const handleNavClick = (id: DetailTab) => {
    onOpenDetail?.(id);
    setIsOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-nav transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="text-2xl font-black tracking-tighter text-brand-900">
              meet<span className="text-brand-500">000</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8 items-center">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link.id)}
                className="text-gray-600 hover:text-brand-600 font-medium transition-colors text-sm lg:text-base bg-transparent border-none cursor-pointer"
              >
                {link.name}
              </button>
            ))}
            <button 
              onClick={onBookClick}
              className="bg-black text-white px-6 py-2.5 rounded-full font-bold hover:bg-gray-800 transition-transform hover:scale-105 active:scale-95 shadow-lg"
            >
              예약하기
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-gray-800 hover:text-brand-600 focus:outline-none"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => handleNavClick(link.id)}
                  className="block w-full text-left px-3 py-3 text-base font-medium text-gray-700 hover:text-brand-600 hover:bg-gray-50 rounded-xl"
                >
                  {link.name}
                </button>
              ))}
              <div className="pt-4">
                 <button 
                   onClick={() => {
                     setIsOpen(false);
                     onBookClick?.();
                   }}
                   className="w-full bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-700 shadow-md"
                 >
                  지금 예약하기
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;