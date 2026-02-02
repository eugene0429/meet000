import React, { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import PainPoints from './components/PainPoints';
import Solution from './components/Solution';
import HowItWorks from './components/HowItWorks';
import SpaceIntro from './components/SpaceIntro';
import Footer from './components/Footer';
import ReservationSystem from './components/ReservationSystem';
import DetailModal from './components/DetailModal';
import AdminDashboard from './components/AdminDashboard';
import { DetailTab } from './types';

const App: React.FC = () => {
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('SERVICE');

  const openReservation = () => setIsReservationOpen(true);
  const closeReservation = () => setIsReservationOpen(false);

  const openDetail = (tab: DetailTab) => {
    setDetailTab(tab);
    setIsDetailOpen(true);
  };
  const closeDetail = () => setIsDetailOpen(false);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-brand-200 selection:text-brand-900">
      <Header onBookClick={openReservation} onOpenDetail={openDetail} />
      
      <main>
        <Hero onCtaClick={openReservation} />
        <PainPoints />
        <Solution />
        <HowItWorks />
        <SpaceIntro />
      </main>

      <Footer 
        onCtaClick={openReservation} 
        onAdminTrigger={() => setIsAdminOpen(true)}
      />
      
      <ReservationSystem 
        isOpen={isReservationOpen} 
        onClose={closeReservation} 
      />

      <DetailModal 
        isOpen={isDetailOpen}
        onClose={closeDetail}
        initialTab={detailTab}
      />

      <AdminDashboard 
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />
    </div>
  );
};

export default App;