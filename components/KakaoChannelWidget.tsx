import React from 'react';
import { MessageCircle } from 'lucide-react';

const KakaoChannelWidget = () => {
    return (
        <a
            href="https://pf.kakao.com/_VxeaBn"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#fae100] rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
            aria-label="카카오톡 채널 문의하기"
        >
            <div className="relative">
                {/* Custom KakaoTalk Icon SVG since Lucide doesn't have the exact brand icon */}
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-[#371d1e]"
                >
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 3C7.029 3 3 6.134 3 10C3 12.483 4.606 14.678 7.025 15.932L6.152 19.387C6.069 19.717 6.452 19.967 6.726 19.782L10.975 16.924C11.31 16.953 11.652 16.968 12 16.968C16.971 16.968 21 13.834 21 10C21 6.134 16.971 3 12 3Z"
                        fill="currentColor"
                    />
                </svg>

                {/* Tooltip */}
                <span className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                    카카오톡 문의
                    <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-l-4 border-l-gray-900"></div>
                </span>
            </div>
        </a>
    );
};

export default KakaoChannelWidget;
