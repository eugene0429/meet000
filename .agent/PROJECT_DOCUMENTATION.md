# 🎯 meet000 프로젝트 문서

## 📋 프로젝트 개요

**meet000**은 대전 지역 대학생들을 위한 **N:N 소개팅/미팅 매칭 서비스** 웹 애플리케이션입니다.

### 핵심 콘셉트
- **40분 룰**: 40분간의 가벼운 만남 후, 비밀 투표로 2차 진행 여부 결정
- **Host/Guest 시스템**: 먼저 슬롯을 등록한 팀(Host)이 매칭 상대(Guest)를 선택하는 권한 보유
- **space000**: 미팅이 진행되는 프라이빗한 오프라인 공간

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| **Frontend Framework** | React 19 + TypeScript |
| **Build Tool** | Vite 6 |
| **Styling** | TailwindCSS (CDN) + Noto Sans KR 폰트 |
| **Animation** | Framer Motion |
| **Icons** | Lucide React |
| **Backend/DB** | Supabase (PostgreSQL) |
| **AI Service** | Google Gemini API (@google/genai) |

---

## 📁 프로젝트 구조

```
meet000/
├── App.tsx                    # 메인 앱 컴포넌트 (라우팅 & 상태 관리)
├── index.tsx                  # React 진입점
├── index.html                 # HTML 템플릿 (Tailwind 설정 포함)
├── types.ts                   # TypeScript 타입 정의
├── package.json               # 의존성 관리
├── vite.config.ts             # Vite 설정
├── tsconfig.json              # TypeScript 설정
├── .env.local                 # 환경변수 (GEMINI_API_KEY)
│
├── components/                # UI 컴포넌트
│   ├── Header.tsx             # 상단 네비게이션
│   ├── Hero.tsx               # 메인 히어로 섹션
│   ├── PainPoints.tsx         # 기존 미팅의 문제점 소개
│   ├── Solution.tsx           # meet000 솔루션 소개 + AI 대화주제 생성
│   ├── HowItWorks.tsx         # 이용 방법 안내
│   ├── SpaceIntro.tsx         # space000 공간 소개
│   ├── Footer.tsx             # 푸터 (관리자 접근 트리거 포함)
│   ├── ReservationSystem.tsx  # 📌 핵심: 예약 시스템 (캘린더 + 팀 등록 폼)
│   ├── AdminDashboard.tsx     # 📌 핵심: 관리자 대시보드
│   ├── DetailModal.tsx        # 서비스/프로세스/공간 상세 모달
│   └── BookingModal.tsx       # 예약 시간 선택 모달 (간단 버전)
│
├── services/
│   └── geminiService.ts       # Gemini AI 서비스 (아이스브레이킹 주제 생성)
│
└── lib/
    └── supabaseClient.ts      # Supabase 클라이언트 설정
```

---

## 📊 데이터 모델 (types.ts)

### SlotStatus (슬롯 상태)
```typescript
enum SlotStatus {
  AVAILABLE = 'AVAILABLE',           // 빈 슬롯
  HOST_REGISTERED = 'HOST_REGISTERED', // 호스트 팀 등록됨, 게스트 대기 중
  FULL = 'FULL',                     // 최대 신청자 도달
  CLOSED = 'CLOSED'                  // 관리자가 닫음
}
```

### MeetingSlot (미팅 슬롯)
```typescript
interface MeetingSlot {
  id: string;             // YYYY-MM-DD-HH:MM 형식
  time: string;
  status: SlotStatus;
  maxApplicants: number;
  hostTeam?: TeamInfo;    // 호스트 팀 정보
  guestTeams: TeamInfo[]; // 게스트 신청 팀 목록
}
```

### TeamInfo (팀 정보)
```typescript
interface TeamInfo {
  id: string;
  gender: 'MALE' | 'FEMALE';
  headCount: number;
  avgAge: number;
  university: string;
  phone: string;
  isVerified: boolean;    // 관리자 인증 여부
  studentIdUrl: string;   // 학생증 이미지 URL
  members: TeamMember[];
  createdAt: string;
  status?: string;
}
```

### TeamMember (팀원 정보)
```typescript
interface TeamMember {
  age: string;
  university: string;
  major: string;
  instagramId?: string;
}
```

### SlotConfig (관리자용 슬롯 설정)
```typescript
interface SlotConfig {
  id: string;           // YYYY-MM-DD-HH:MM
  date: string;
  time: string;
  is_open: boolean;     // 슬롯 오픈 여부
  max_applicants: number;
}
```

---

## 🔗 주요 컴포넌트 상세

### 1. App.tsx (메인 컴포넌트)
- 3개의 주요 모달 상태 관리:
  - `isReservationOpen`: 예약 시스템 모달
  - `isDetailOpen`: 상세 정보 모달 (SERVICE/PROCESS/SPACE 탭)
  - `isAdminOpen`: 관리자 대시보드

### 2. ReservationSystem.tsx (예약 시스템)
**핵심 기능:**
- 캘린더 기반 날짜 선택
- 시간 슬롯 (18:00~24:00, 1시간 단위)
- 팀 등록 폼 (성별, 연락처, 팀원 정보, 학생증 업로드)
- 이미지 압축 기능 (업로드 전 자동 압축)
- Supabase 연동하여 슬롯/팀 데이터 CRUD

**주요 함수:**
- `fetchSlots(date)`: 특정 날짜의 슬롯 정보 조회
- `handleSubmit()`: 팀 등록 제출
- `compressImage()`: 학생증 이미지 압축

### 3. AdminDashboard.tsx (관리자 대시보드)
**접근 방법:** Footer의 "meet000" 텍스트를 5번 클릭

**핵심 기능:**
- 비밀번호 인증 로그인
- 일별 슬롯 관리 (오픈/마감, 최대 신청자 수 조절)
- 팀 인증 승인/거절
- 매칭 확정 (호스트가 게스트 선택)

**주요 함수:**
- `handleLogin()`: 관리자 인증
- `toggleSlotOpen()`: 슬롯 오픈/닫기 토글
- `executeVerify()`: 팀 인증 승인
- `confirmReject()`: 팀 거절 처리
- `executeFinalizeMatch()`: 매칭 확정

### 4. Solution.tsx (AI 서비스)
- Gemini AI를 활용한 아이스브레이킹 대화 주제 생성
- 테마: 여행, 음식, 취미, 연애관, MBTI, 대학생활 중 랜덤 선택

---

## 🗄️ 외부 서비스 연동

### Supabase
- **URL**: `https://gdafcpzbirddulavjjik.supabase.co`
- **용도**: 
  - 슬롯 구성 데이터 저장
  - 팀 등록 정보 저장
  - 학생증 이미지 스토리지

#### 테이블 구조

**`daily_config`** (날짜별 슬롯 설정)
| 컬럼 | 타입 | 설명 |
|------|-----|------|
| date | DATE (PK) | 날짜 |
| open_times | TEXT[] | 활성화된 시간 목록 (예: ["18:00", "19:00"]) |
| max_applicants | INTEGER | 슬롯당 최대 신청자 수 (기본: 3) |

**`teams`** (팀 정보)
| 컬럼 | 타입 | 설명 |
|------|-----|------|
| id | UUID (PK) | 팀 ID |
| date | DATE | 예약 날짜 |
| time | TEXT | 예약 시간 |
| gender | TEXT | 성별 (MALE/FEMALE) |
| phone | TEXT | 대표자 연락처 |
| status | TEXT | 상태 (PENDING/MATCH_CONFIRMED) |
| is_verified | BOOLEAN | 인증 여부 |
| student_id_url | TEXT | 학생증 이미지 URL |

**`members`** (팀원 정보)
| 컬럼 | 타입 | 설명 |
|------|-----|------|
| id | UUID (PK) | 멤버 ID |
| team_id | UUID (FK) | 팀 ID |
| age | INTEGER | 나이 |
| university | TEXT | 대학교 |
| major | TEXT | 전공 |
| instagram_id | TEXT | 인스타그램 ID |

### Gemini AI
- **모델**: `gemini-3-flash-preview`
- **용도**: 미팅 시 사용할 대화 주제 생성
- **API Key**: `.env.local`의 `GEMINI_API_KEY`

---

## 🎨 UI/UX 특징

### 디자인 시스템
- **Primary Color (brand)**: Teal 계열 (#14b8a6 ~ #134e4a)
- **Accent Colors**: Yellow, Orange, Blue, Purple
- **Font**: Noto Sans KR (300~900)
- **Border Radius**: 2rem~3rem의 큰 라운딩

### 애니메이션
- Framer Motion을 활용한 페이지 전환/모달 애니메이션
- 카드 호버 시 Y축 이동 효과
- Blob 배경 애니메이션 (Hero 섹션)

### 반응형
- 모바일/태블릿/데스크톱 대응
- 모바일 메뉴 (햄버거 메뉴)

---

## 🏃 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
# .env.local 파일에 GEMINI_API_KEY 설정

# 3. 개발 서버 실행
npm run dev

# 4. 빌드
npm run build
```

---

## 📌 주요 사용자 흐름

### 일반 사용자 (팀 등록)
1. 랜딩 페이지에서 "예약하기" 클릭
2. 캘린더에서 원하는 날짜 선택
3. 원하는 시간 슬롯 선택
   - 빈 슬롯: Host로 등록
   - 이미 Host 있는 슬롯: Guest로 신청
4. 팀 정보 입력 (성별, 인원수, 팀원 정보, 학생증)
5. 제출 후 관리자 인증 대기

### 관리자
1. Footer "meet000" 5회 클릭으로 관리자 모드 진입
2. 비밀번호 입력하여 로그인
3. 날짜별 슬롯 관리
4. 등록된 팀 인증 (학생증 확인)
5. 매칭 확정 (Host에게 Guest 배정)

---

## ⚠️ 주의사항 및 개발 메모

### 환경변수 관리 (.env.local)
프로젝트의 민감한 정보는 `.env.local` 파일에서 관리됩니다:

```bash
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # 관리자 기능용
```

### Supabase 클라이언트 구조
- **`supabase`**: 일반 사용자용 (RLS 정책 적용)
- **`supabaseAdmin`**: 관리자용 (Service Role Key로 RLS 우회)

### RLS(Row Level Security) 관련
- 관리자 삭제/수정 기능을 사용하려면 **Service Role Key**가 필수입니다
- Supabase Dashboard > Settings > API > `service_role` (secret)에서 확인 가능
- ⚠️ Service Role Key는 **절대 클라이언트 사이드에서 노출되면 안됩니다** (현재 구조는 프로토타입용)

### 기타 주의사항
1. **관리자 비밀번호**: Supabase `admin_settings` 테이블의 `admin_password` 키에 저장
2. **슬롯 시간**: 18:00~24:00 (7개 슬롯)
3. **관리자 접근**: Footer "meet000" 5회 클릭

---

## 🔄 향후 개발 고려사항

- [x] ~~환경변수 보안 강화~~ ✅ 완료 (2026-02-02)
- [ ] 카카오톡 알림 연동
- [ ] 비밀 투표 시스템 구현
- [ ] 매칭 성공률 통계
- [ ] 사용자 리뷰 시스템
- [ ] 서버사이드 API로 Service Role Key 보호 (프로덕션 필수)

---

*문서 최종 업데이트: 2026-02-02*

