# 06. 백엔드 확장 이슈 목록 (GitHub Issues)

본 문서는 현재 구축된 정적 웹 애플리케이션에서 백엔드 서버 및 데이터베이스(Database) 도입 시 비즈니스 실용성을 극대화하기 위해 추가해야 할 백엔드 기술 부문 확장 요소를 **깃허브 이슈(GitHub Issues) 포맷**으로 명세한 문서입니다.

---

## 🔗 [Issue #1] [Feature] WebSockets를 이용한 키오스크 및 관리자 대시보드 실시간 동기화
* **이슈 분류**: `✨ Feature (신규 기능)`
* **마일스톤**: `Phase 4 - Backend Core & Real-time Integration`
* **라벨**: `backend`, `real-time`, `high-priority`

### 📝 이슈 설명 (Context)
현재 시스템은 로컬 브라우저의 `localStorage`를 기반으로 구동되어, 입구의 키오스크 기기(iPad)에서 등록한 대기 정보가 카운터의 관리용 단말기(POS)에 실시간으로 반영되지 않습니다. 이를 해결하기 위해 중앙 백엔드 서버와 WebSockets 통신 채널을 개설하여 멀티 클라이언트 간의 대기 현황과 테이블 상태를 즉각 동기화해야 합니다.

### 🎯 요구사항 (Requirements)
1. **RESTful API 구축**:
   * 대기팀 등록(`POST /api/waiting`), 상태 수정(`PATCH /api/waiting/:id`), 테이블 CRUD APIs 개설.
2. **WebSocket (Socket.io 또는 WS) 채널 개설**:
   * **키오스크 대기 등록 시**: 관리자 대시보드 클라이언트에 즉시 `waiting:created` 브로드캐스트 전송 및 명단 리렌더링 트리거.
   * **관리자 호출/입장/노쇼 처리 시**: 모든 대시보드 및 키오스크 클라이언트에 실시간 상태 동기화 패킷 전송.
3. **재연결 및 예외 처리**:
   * 네트워크 일시 단절 후 재연결 시 상태 동기화를 위해 현재 활성화된 대기 및 테이블 정보를 다시 로드하는 핸드셰이크 프로토콜 설계.

### 🛠️ 추천 기술 스택 (Tech Stack)
* **Backend**: Node.js (Express 또는 NestJS)
* **Real-time**: Socket.io
* **DB**: Redis (실시간 소켓 세션 및 간단한 대기 메모리 관리용 cache)

---

## 🔗 [Issue #2] [Feature] 고객 스마트폰 알림용 SMS / 알림톡 발송 API 게이트웨이 연동
* **이슈 분류**: `✨ Feature (신규 기능)`
* **마일스톤**: `Phase 4 - Notification Integration`
* **라벨**: `backend`, `integration`, `must-have`

### 📝 이슈 설명 (Context)
실제 웨이팅 서비스에서 고객은 매장 앞에 머무르지 않고 외부에서 대기하는 경우가 많습니다. 직원이 대기 명단에서 `📢 호출` 버튼을 누르는 순간, 고객의 스마트폰으로 호출 문자가 자동으로 발송되어 5분 이내 입장을 안내할 수 있는 백엔드 프록시 및 알림 발송 모듈이 필요합니다.

### 🎯 요구사항 (Requirements)
1. **외부 SMS/알림톡 API (Twilio, Solapi, Aligo 등) 프록시 구축**:
   * 백엔드 환경변수(`dotenv`)에 API 보안 키를 저장하고 내부 호출 트리거에 대응하는 발송 컨트롤러 제작.
2. **이벤트 기반 자동 알림 처리**:
   * **웨이팅 등록 시**: "[매장명] No.{number} 대기표 발급 완료. 내 앞 {teams}팀 대기 중" 카카오 알림톡/문자 발송.
   * **직원 호출(called) 시**: "[매장명] 대기번호 No.{number} 고객님, 지금 바로 매장으로 입장해 주시기 바랍니다. (5분 미방문 시 노쇼 처리)" 문자 발송.
3. **요청 발송 이력 관리**:
   * 발송 실패 건에 대한 로깅 및 재시도(Retry) 큐 처리 시스템 설계.

### 🛠️ 추천 기술 스택 (Tech Stack)
* **API Integration**: Solapi SDK / Twilio SDK
* **Queue**: BullMQ (Redis 기반 메시지 큐)

---

## 🔗 [Issue #3] [Enhancement] 데이터베이스 영속화 및 누적 대기 히스토리 비즈니스 분석 API 개발
* **이슈 분류**: `⚡ Enhancement (성능 및 기능 개선)`
* **마일스톤**: `Phase 5 - Persistent Storage & Analytics`
* **라벨**: `database`, `analytics`, `should-have`

### 📝 이슈 설명 (Context)
`localStorage`는 브라우저 캐시 삭제 시 데이터 유실 위험이 있고 5MB의 용량 제한이 있어 비즈니스 분석에 적합하지 않습니다. 안정적인 관계형 또는 비관계형 DB에 데이터를 보관하고, 누적 대기 데이터를 기반으로 매장의 병목 현상을 진단할 수 있는 통계 API를 구축해야 합니다.

### 🎯 요구사항 (Requirements)
1. **DB 스키마 모델링 및 마이그레이션**:
   * `WaitingEntry` 및 `RestaurantTable` 도메인 스키마 영구 보관용 RDB 테이블 모델 구축.
2. **비즈니스 인텔리전스 (BI) 분석 API**:
   * 요일별/시간대별 **평균 대기 시간 및 대기팀 수** 집계 API (`GET /api/analytics/wait-time`).
   * 고객 유형별(인원수 기준) 선호 테이블 점유율 통계 API.
   * 당일 **노쇼(No-Show) 및 취소(Cancelled) 비율** 분석 API (`GET /api/analytics/noshow-rate`).
3. **테이블 회전율 통계**:
   * 테이블이 `seated`에서 `cleaning` 상태를 거쳐 다시 `available`로 돌아오는 데 걸린 시간을 추적하여 매장 회전 효율 분석.

### 🛠️ 추천 기술 스택 (Tech Stack)
* **Database**: PostgreSQL 또는 MySQL
* **ORM**: Prisma 또는 Sequelize
* **Analytics Layer**: Prisma Aggregate/GroupBy queries

---

## 🔗 [Issue #4] [Security] 키오스크 부정 조작 방지를 위한 역할 기반 접근 제어 (RBAC) 및 속도 제한 (Rate Limiting)
* **이슈 분류**: `🔒 Security (보안 강화)`
* **마일스톤**: `Phase 5 - Security hardening`
* **라벨**: `security`, `authentication`

### 📝 이슈 설명 (Context)
현재는 키오스크 화면에서 브라우저 개발자 도구(F12) 등을 이용하여 JS 전역 상태나 API 호출 함수를 직접 변조할 수 있습니다. 대기자 배정, 취소, 노쇼, 테이블 강제 상태 전환 등은 관리자 계정만 제어할 수 있도록 강력한 보안(인증 및 인가) 조치를 취해야 합니다.

### 🎯 요구사항 (Requirements)
1. **관리자 인증 인프라**:
   * 대시보드 단말기 로그인을 위한 JWT 발급 API (`POST /api/auth/login`) 및 보안 HttpOnly 쿠키 처리.
2. **역할 기반 접근 인가 (RBAC)**:
   * **키오스크용 클라이언트 IP/API**: 오직 대기 등록 API(`POST /api/waiting`)만 접근 허용.
   * **관리자 POS용 API**: 테이블 조작 및 입장 관리 전 영역(`PATCH`, `DELETE`, `PUT`) 접근 권한 인가 필터링 적용.
3. **디도스/도배 방지 (Rate Limiting)**:
   * 동일한 키오스크 기기에서 짧은 시간(예: 30초 내 3회 이상)에 악의적으로 대기표를 중복해서 뽑아내지 못하도록 IP당 등록 횟수 제한(Rate Limiting) 미들웨어 장착.

### 🛠️ 추천 기술 스택 (Tech Stack)
* **Auth**: Passport.js, JWT (Json Web Token)
* **Middleware**: express-rate-limit

---

## 🔗 [Issue #5] [Feature] 대시보드 내 '매장 분석 및 통계' 탭 구현 및 시각화 차트 도입
* **이슈 분류**: `✨ Feature (신규 기능)`
* **마일스톤**: `Phase 5 - Business Intelligence (BI)`
* **라벨**: `frontend`, `backend`, `analytics`, `visualization`

### 📝 이슈 설명 (Context)
매장의 운영 효율성을 극대화하기 위해, 직원이 대시보드 내에서 실시간 및 누적 매장 운영 데이터를 한눈에 파악할 수 있는 **'통계(Analytics) 탭'**을 관리자 화면 내에 신설합니다. 백엔드의 통계 API를 활용하여 직관적인 그래프와 수치 카드로 시각화함으로써 데이터 기반의 매장 관리(인력 배치, 식자재 사전 준비 등)를 가능케 합니다.

### 🎯 요구사항 (Requirements)
1. **대시보드 UI 확장 (프론트엔드)**:
   * 관리자 대시보드 화면 상단 필터 바 영역에 '대기/테이블 관리'와 별개로 선택 가능한 **'통계 및 분석'** 탭 버튼 추가.
   * 통계 페이지 내 기존 UI 테마를 준수하는 **글래스모피즘(Glassmorphism) 스타일의 데이터 카드** 배치.
   * 차트 라이브러리(Chart.js 또는 ApexCharts)를 연동하여 모바일 및 데스크톱에서 유연하게 반응하는 차트 컴포넌트 탑재.

2. **핵심 분석 통계 지표 구현**:
   * **평균 노쇼 및 취소 비율 (No-Show & Cancellation Rate)**:
     * 전체 종료된 웨이팅 건 중 `no-show` 및 `cancelled` 상태가 차지하는 비율을 **도넛 차트(Donut Chart)**로 표시.
     * 노쇼 및 직전 취소가 잦은 시간대나 요일을 분석하여 고객 알림톡 전송 간격을 조절하는 용도로 활용.
   * **인원수별 평균 대기 시간 및 비율 (Average Wait Time by Party Size)**:
     * 대기 등록 시점(`createdAt`)부터 입장 시점(`seatedAt`)까지 소요된 실제 대기 시간을 인원수별(1-2인석, 3-4인석, 5인 이상)로 그룹핑하여 **바 차트(Bar Chart)**로 비교.
     * 예: "3~4인 대기팀이 평균 45분으로 가장 오래 대기함" → 테이블 구성 조정을 위한 피드백 데이터 제공.
   * **시간대별 내방 고객 집중도 (Hourly Waiting Traffic)**:
     * 매장 영업시간 중 시간대별(예: 11시 ~ 22시) 신규 웨이팅 신청 발생 건수를 **라인 차트(Line Chart)**로 표시하여 Peak Hour 및 피크 데이 분석.
     * 주말 피크 타임 파트타이머 추가 배치 및 주방 사전 세팅 시간 수립에 기여.
   * **웨이팅 전환율 분석 (Waiting Conversion Funnel)**:
     * `등록 -> 호출 -> 입장(성공)`으로 이어지는 과정에서 각 단계별 유실율(깔때기 모형)을 시각적으로 구현.
   * **테이블 점유율 및 회전 효율 (Table Rotation Rate)**:
     * 각 등록된 테이블 번호별 하루 평균 이용 횟수 및 이용 완료(`occupied` → `cleaning` → `available`)에 걸리는 시간 집계.

3. **백엔드 집계 API 연동**:
   * 프론트엔드가 주간/월간/커스텀 기간 필터를 선택할 때 백엔드에서 데이터베이스의 대기 이력 테이블을 조회해 가볍게 정제한 통계 데이터를 제공 (`GET /api/analytics/summary?period=today|week|month`).

### 🛠️ 추천 기술 스택 (Tech Stack)
* **Frontend Chart Library**: Chart.js (차트 경량 라이브러리) 또는 ApexCharts.js
* **Backend DB Aggregation**: SQL Window Functions (PostgreSQL/MySQL) 또는 MongoDB Aggregation Pipeline
* **Design/CSS**: CSS Grid & Flexbox를 이용한 반응형 카드 레이아웃

