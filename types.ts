
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
  // 정보 교환 프로세스 관련 필드
  wantsInfo?: boolean | null;      // 상대팀 정보 열람 희망 여부
  sharesInfo?: boolean | null;     // 본인팀 정보 공개 여부
  hasPaid?: boolean;               // 결제 완료 여부
  hasConfirmed?: boolean | null;   // 정보 확인 후 진행 의사 (true=진행, false=취소, null=미응답)
  // 프로세스 단계: 'SETTING' | 'WAITING_PAYMENT' | 'WAITING_CONFIRM' | 'WAITING_OTHER' | 'COMPLETED' | 'CANCELLED'
  processStep?: string | null;
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
}

export type DetailTab = 'SERVICE' | 'PROCESS' | 'SPACE';

// Type for Admin Slot Configuration (날짜별 단일 row 방식)
export interface DailySlotConfig {
  date: string;              // Primary key: YYYY-MM-DD
  open_times: string[];      // 활성화된 시간 목록 예: ["18:00", "19:00", "20:00"]
  max_applicants: number;    // 해당 날짜 기본 max_applicants
}
