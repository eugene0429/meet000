import React from 'react';
import { motion } from 'framer-motion';
import { Check, Users, MapPin } from 'lucide-react';
import { TeamInfo } from '../../../types';

interface TeamCardProps {
    team: TeamInfo;
    onVerify: () => void;
}

/**
 * 팀 정보 카드 컴포넌트
 */
export function TeamCard({ team, onVerify }: TeamCardProps) {
    const genderColor = team.gender === 'MALE' ? 'bg-blue-500' : 'bg-pink-500';
    const genderText = team.gender === 'MALE' ? '♂' : '♀';

    return (
        <div className="bg-gray-50 p-3 rounded-lg relative">
            {/* 인증 상태 배지 */}
            <div className="absolute -top-2 -right-2">
                {team.isVerified ? (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        인증됨
                    </span>
                ) : (
                    <button
                        onClick={onVerify}
                        className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full hover:bg-yellow-600 transition-colors"
                    >
                        인증하기
                    </button>
                )}
            </div>

            {/* 팀 정보 */}
            <div className="flex items-center gap-2 mb-2">
                <span className={`w-6 h-6 ${genderColor} text-white rounded-full flex items-center justify-center text-xs font-bold`}>
                    {genderText}
                </span>
                <span className="font-medium text-sm">{team.university}</span>
                <span className="text-gray-500 text-xs flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {team.headCount}명
                </span>
            </div>

            {/* 상세 정보 */}
            <div className="text-xs text-gray-600 space-y-1">
                <p>평균 {team.avgAge}세 | {team.phone}</p>
                {team.members && team.members.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                        {team.members.map((m, idx) => (
                            <p key={idx} className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {m.university} {m.major} ({m.age}세)
                                {m.instagramId && <span className="text-blue-500">@{m.instagramId}</span>}
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* 상태 표시 */}
            {team.status && team.status !== 'PENDING' && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className={`text-xs px-2 py-1 rounded-full ${team.status === 'MATCH_CONFIRMED' ? 'bg-green-100 text-green-700' :
                            team.status === 'FIRST_CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                        }`}>
                        {team.status === 'MATCH_CONFIRMED' ? '최종 매칭' :
                            team.status === 'FIRST_CONFIRMED' ? '1차 매칭' :
                                team.status}
                    </span>
                </div>
            )}
        </div>
    );
}
