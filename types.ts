
export enum SlotStatus {
  AVAILABLE = 'AVAILABLE', // Empty and Open
  HOST_REGISTERED = 'HOST_REGISTERED', // 1 team registered, waiting for applicants
  FULL = 'FULL', // Max applicants reached
  CLOSED = 'CLOSED', // Admin closed
  FIRST_CONFIRMED = 'FIRST_CONFIRMED', // 1차 매칭 확정 (인스타 교환 진행중)
  MATCH_CONFIRMED = 'MATCH_CONFIRMED' // 최종 매칭 완료
}

export interface MeetingSlot {
  id: string; // YYYY-MM-DD-HH:MM
  time: string;
  status: SlotStatus;
  maxApplicants: number;
  hostTeam?: TeamInfo; // The first team (Host)
  guestTeams: TeamInfo[]; // Applicant teams
}

export interface TeamInfo {
  id: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  role?: 'HOST' | 'GUEST';
  gender: 'MALE' | 'FEMALE';
  headCount: number;
  avgAge: number;
  university: string;
  phone: string;
  isVerified: boolean;
  studentIdUrl: string;
  members: TeamMember[];
  createdAt: string;
  status?: string;
  intro?: string;
  representativeId?: string;
  // 정보 교환 프로세스 관련 필드
  wantsInfo?: boolean | null;      // 상대팀 정보 열람 희망 여부 (deprecated)
  sharesInfo?: boolean | null;     // 본인팀 정보 공개 여부 (deprecated)
  hasPaid?: boolean;               // 결제 완료 여부 (deprecated)
  hasConfirmed?: boolean | null;   // 정보 확인 후 진행 의사 (deprecated)
  // 프로세스 단계 (deprecated)
  processStep?: string | null;
  // 새로운 공개방/비공개방 시스템
  isPublicRoom?: boolean;          // 공개방 여부 (호스트만 설정)
  infoExchangeStatus?: 'PENDING' | 'PROCEED' | 'STOP' | null; // 공개방 응답 상태
}

export interface TeamMember {
  age: string;
  university: string;
  major: string;
  instagramId?: string;
}

export interface ReservationFormData {
  gender: 'MALE' | 'FEMALE';
  phone: string;
  members: TeamMember[];
  studentIdImage: File | null;
  intro: string;
  representativeId: string;
}

export type DetailTab = 'SERVICE' | 'PROCESS' | 'SPACE';

// Type for Admin Slot Configuration (날짜별 단일 row 방식)
export interface DailySlotConfig {
  date: string;              // Primary key: YYYY-MM-DD
  open_times: string[];      // 활성화된 시간 목록 예: ["18:00", "19:00", "20:00"]
  max_applicants: number;    // 해당 날짜 기본 max_applicants
  public_room_extra_price?: number; // 공개방 인당 추가금액 (기본 3000원)
}
