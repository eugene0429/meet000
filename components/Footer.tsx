import React, { useState } from 'react';
import { X } from 'lucide-react';

interface FooterProps {
  onCtaClick: () => void;
  onAdminTrigger: () => void;
}

const PolicyModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; content: React.ReactNode }> = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
};

const Footer: React.FC<FooterProps> = ({ onCtaClick, onAdminTrigger }) => {
  const [clickCount, setClickCount] = useState(0);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSecretClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount === 5) {
      onAdminTrigger();
      setClickCount(0);
    }
  };

  const privacyContent = (
    <>
      <p className="mb-4">
        <strong>1. 개인정보의 수집 및 이용 목적</strong><br />
        meet000(이하 '서비스')은 대학생 미팅 매칭 서비스를 제공하기 위해 필요한 최소한의 개인정보를 수집하고 있습니다. 수집된 정보는 매칭 상대 찾기, 매칭 결과 통보, 본인 확인 및 서비스 이용에 따른 연락 목적으로만 사용됩니다.
      </p>
      <p className="mb-4">
        <strong>2. 수집하는 개인정보의 항목</strong><br />
        - 필수항목: 이름, 전화번호, 성별, 나이, 대학교, 학과, 학생증 이미지<br />
        - 선택항목: 인스타그램 ID, 팀 소개
      </p>
      <p className="mb-4">
        <strong>3. 개인정보의 보유 및 이용 기간</strong><br />
        이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체 없이 파기합니다. 단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 관계법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.
      </p>
      <p>
        <strong>4. 동의 거부 권리 및 불이익</strong><br />
        이용자는 개인정보 수집 및 이용에 대하여 동의를 거부할 수 있습니다. 단, 동의를 거부할 경우 매칭 서비스 이용이 제한될 수 있습니다.
      </p>
    </>
  );

  const termsContent = (
    <>
      <p className="mb-4">
        <strong>제1조 (목적)</strong><br />
        본 약관은 space000(이하 '회사')이 제공하는 meet000 서비스(이하 '서비스')의 이용조건 및 절차, 회사와 회원의 권리, 의무 및 책임사항 등을 규정함을 목적으로 합니다.
      </p>
      <p className="mb-4">
        <strong>제2조 (용어의 정의)</strong><br />
        '서비스'란 회사가 제공하는 대학생 미팅 매칭 플랫폼을 의미합니다. '이용자'란 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 자를 말합니다.
      </p>
      <p className="mb-4">
        <strong>제3조 (이용자의 의무)</strong><br />
        1. 이용자는 서비스를 이용함에 있어 허위 정보를 입력해서는 안 됩니다. 학생증 위조 등 부정행위 적발 시 서비스 이용이 영구 정지될 수 있으며 법적 책임을 물을 수 있습니다.<br />
        2. 타인의 정보를 도용하거나 부정한 목적으로 서비스를 이용하여서는 안 됩니다.<br />
        3. 매칭된 상대방에 대한 비매너 행위(욕설, 비방, 스토킹 등) 시 서비스 이용이 제한됩니다.
      </p>
      <p className="mb-4">
        <strong>제4조 (책임의 한계)</strong><br />
        회사는 매칭된 상대방과의 만남에서 발생하는 개인적인 문제나 분쟁에 대해서는 개입하지 않으며, 이에 대한 법적 책임을 지지 않습니다. 모든 만남의 책임은 이용자 당사자에게 있음을 안내드립니다.
      </p>
      <p>
        <strong>제5조 (환불 규정)</strong><br />
        매칭 확정 전 취소 시 전액 환불이 가능하며, 매칭 확정 통보 이후에는 환불이 불가능할 수 있습니다. 상세 환불 규정은 별도 공지사항을 따릅니다.
      </p>
    </>
  );

  return (
    <>
      <footer className="bg-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-brand-600 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden mb-20">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-10 left-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl" />
              <div className="absolute bottom-10 right-10 w-64 h-64 bg-accent-yellow opacity-20 rounded-full blur-3xl mix-blend-overlay" />
            </div>

            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
                새로운 설렘, <br />
                지금 바로 예약해보세요.
              </h2>
              <button
                onClick={onCtaClick}
                className="bg-white text-brand-600 px-10 py-5 rounded-full font-black text-xl hover:scale-105 transition-transform shadow-2xl"
              >
                오늘의 미팅 라인업 보기
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-12 flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
            <div className="mb-4 md:mb-0 select-none cursor-default" onClick={handleSecretClick}>
              <span className="font-bold text-gray-900 text-lg mr-2">meet000</span>
              © 2024 All rights reserved.
            </div>
            <div className="flex gap-6">
              <a href="https://www.instagram.com/space000.eoeun" target='_blank' rel='noopener noreferrer' className="hover:text-gray-900 transition-colors">Instagram</a>
              <button onClick={() => setShowPrivacy(true)} className="hover:text-gray-900 transition-colors">Privacy Policy</button>
              <button onClick={() => setShowTerms(true)} className="hover:text-gray-900 transition-colors">Terms of Service</button>
            </div>
          </div>
        </div>
      </footer>

      <PolicyModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="개인정보 처리방침"
        content={privacyContent}
      />

      <PolicyModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        title="이용약관"
        content={termsContent}
      />
    </>
  );
};

export default Footer;