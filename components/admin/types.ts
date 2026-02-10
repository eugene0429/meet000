import { TeamInfo } from '../../types';

// AdminDashboard Props
export interface AdminDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

// 슬롯 정보
export interface AdminSlot {
    id: string;
    time: string;
    date: string;
    status: string;
    is_open: boolean;
    max_applicants: number;
    malePrice?: number;
    femalePrice?: number;
    isPublicRoom?: boolean;  // 공개방 여부 (호스트팀에서 가져옴)
    publicRoomExtraPrice?: number;  // 공개방 추가 금액 (슬롯 설정)
    hostTeam?: TeamInfo;
    guestTeams: TeamInfo[];
}

// 모달 설정
export interface ModalConfig {
    isOpen: boolean;
    type: 'ALERT' | 'CONFIRM';
    message: string;
    onConfirm?: () => void;
}

// 삭제 컨텍스트
export interface DeleteContext {
    teamId: string | null;
    teamType: 'HOST' | 'GUEST';
    slot: AdminSlot | null;
}

// 슬롯 설정 (daily_config.slot_configs)
export interface SlotConfig {
    malePrice?: number;
    femalePrice?: number;
    maxApplicants?: number;
    publicRoomExtraPrice?: number;  // 공개방 추가 금액
}
