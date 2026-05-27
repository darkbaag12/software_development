/**
 * 음식점 예약 및 웨이팅 관리 시스템 - App Logic (Day 1)
 * 1일차 구현 범위: 웨이팅 등록 및 대기번호 자동 부여 (FR-01 ~ FR-04)
 */

// 1. 전역 상태 객체 (AppState) - 도메인 모델(docs/03_domain_model.md)을 준수합니다.
const AppState = {
    waitingList: [],        // 대기 등록 정보 리스트 (WaitingEntry)
    tables: [],             // 매장 테이블 상태 (RestaurantTable - 2일차 연동용)
    nextWaitingNumber: 1    // 자동 부여될 다음 대기 번호 (No. 1부터 개시)
};

let currentPartySize = 2; // 기본 등록 인원 설정

// 2. 초기 로드 및 설정
document.addEventListener('DOMContentLoaded', () => {
    loadStateFromStorage();
    setupPhoneInputFormatter();
    updateKioskStats();
    
    // 초기화 시 랜딩 페이지를 명시적으로 표시
    showScreen('landing-screen');
});

// 3. 화면 전환 라우팅 함수
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        if (screen.id === screenId) {
            screen.classList.remove('hidden');
        } else {
            screen.classList.add('hidden');
        }
    });

    // 화면이 켜질 때 필요한 실시간 데이터 리렌더링
    if (screenId === 'kiosk-screen') {
        updateKioskStats();
    } else if (screenId === 'dashboard-screen') {
        renderDashboardWaitingList();
    }
}

// 4. 연락처 자동 하이픈(-) 포맷터 설정 (사용성 개선 NFR-03)
function setupPhoneInputFormatter() {
    const phoneInput = document.getElementById('cust-phone');
    if (!phoneInput) return;

    phoneInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9]/g, ''); // 숫자 이외의 문자 제거
        
        if (val.length > 3 && val.length <= 7) {
            val = val.substring(0, 3) + '-' + val.substring(3);
        } else if (val.length > 7) {
            val = val.substring(0, 3) + '-' + val.substring(3, 7) + '-' + val.substring(7, 11);
        }
        e.target.value = val;
    });
}

// 5. 방문 인원 카운터 제어 함수 (FR-03 최소인원 검증 포함)
function adjustPartySize(amount) {
    const minSize = 1;
    const maxSize = 12; // 소규모 음식점 수용 최대치 (임의 지정)
    const partyError = document.getElementById('party-error');
    
    currentPartySize += amount;
    
    if (currentPartySize < minSize) {
        currentPartySize = minSize;
        partyError.style.display = 'block';
        partyError.textContent = `최소 인원은 ${minSize}명입니다.`;
    } else if (currentPartySize > maxSize) {
        currentPartySize = maxSize;
        partyError.style.display = 'block';
        partyError.textContent = `최대 예약 인원은 ${maxSize}명입니다. 그 이상의 인원은 매장으로 직접 문의 바랍니다.`;
    } else {
        partyError.style.display = 'none';
    }
    
    document.getElementById('party-size-val').textContent = currentPartySize;
}

// 6. 고객 웨이팅 등록 핸들러 (FR-01 ~ FR-04, TC-01 ~ TC-02)
function handleRegistrationSubmit() {
    // DOM 요소 조회
    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');
    const noteInput = document.getElementById('cust-note');
    
    const nameError = document.getElementById('name-error');
    const phoneError = document.getElementById('phone-error');
    const partyError = document.getElementById('party-error');
    
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const note = noteInput.value.trim();
    
    let hasError = false;

    // A. 대표자 성함 검증
    if (!name) {
        nameError.style.display = 'block';
        nameInput.classList.add('error-input');
        hasError = true;
    } else {
        nameError.style.display = 'none';
        nameInput.classList.remove('error-input');
    }

    // B. 연락처 유효성 검증 (010-XXXX-XXXX 양식 충족 여부 체크)
    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    if (!phone || !phoneRegex.test(phone)) {
        phoneError.style.display = 'block';
        phoneInput.classList.add('error-input');
        hasError = true;
    } else {
        phoneError.style.display = 'none';
        phoneInput.classList.remove('error-input');
    }

    // C. 인원수 검증 (FR-03)
    if (currentPartySize < 1) {
        partyError.style.display = 'block';
        hasError = true;
    } else {
        partyError.style.display = 'none';
    }

    // 검증 오류 발생 시 등록 차단
    if (hasError) return;

    // D. 대기 팀 계산 (내 앞에 대기 중인 active 상태 고객 수)
    // active 상태: waiting 또는 called 상태인 대기 명단
    const teamsAhead = AppState.waitingList.filter(entry => 
        entry.status === 'waiting' || entry.status === 'called'
    ).length;

    // E. 신규 WaitingEntry 객체 생성 (도메인 BR-01 충족: waiting 상태 개시)
    const newEntry = {
        id: 'W-' + Date.now(),
        waitingNumber: AppState.nextWaitingNumber,
        name: name,
        phone: phone,
        partySize: currentPartySize,
        requestNote: note || '',
        status: 'waiting', // BR-01: 초기 상태는 항상 'waiting'
        createdAt: new Date().toISOString()
    };

    // F. 상태 갱신 및 영속화
    AppState.waitingList.push(newEntry);
    AppState.nextWaitingNumber++; // 대기 번호 자동 증가 (FR-02)
    saveStateToStorage();

    // G. 성공 결과 모달 오픈
    showSuccessModal(newEntry, teamsAhead);

    // H. 폼 필드 리셋
    nameInput.value = '';
    phoneInput.value = '';
    noteInput.value = '';
    currentPartySize = 2;
    document.getElementById('party-size-val').textContent = currentPartySize;

    // I. 키오스크 통계 실시간 업데이트
    updateKioskStats();
}

// 7. 실시간 키오스크 상태판 업데이트
function updateKioskStats() {
    const teamsCountSpan = document.getElementById('kiosk-stat-teams');
    const timeSpan = document.getElementById('kiosk-stat-time');
    if (!teamsCountSpan || !timeSpan) return;

    // 현재 대기 리스트 중 활성화(waiting, called)된 대기열 필터링
    const activeWaitingTeams = AppState.waitingList.filter(entry => 
        entry.status === 'waiting' || entry.status === 'called'
    ).length;

    teamsCountSpan.textContent = `${activeWaitingTeams} 팀`;
    
    // 예상 대기 시간: 한 팀당 약 15분 소요 가정 (가정 값)
    const estimatedMinutes = activeWaitingTeams * 15;
    timeSpan.textContent = `${estimatedMinutes} 분`;
}

// 8. 성공 모달 및 정보 노출
function showSuccessModal(entry, teamsAhead) {
    const successOverlay = document.getElementById('success-overlay');
    
    document.getElementById('assigned-number').textContent = `No. ${entry.waitingNumber}`;
    document.getElementById('confirm-name').textContent = entry.name;
    document.getElementById('confirm-phone').textContent = entry.phone;
    document.getElementById('confirm-party').textContent = `${entry.partySize} 명`;
    document.getElementById('confirm-ahead').textContent = `${teamsAhead} 팀`;

    successOverlay.classList.add('active');
}

function closeSuccessModal() {
    const successOverlay = document.getElementById('success-overlay');
    successOverlay.classList.remove('active');
}

// 9. 대시보드 내 1일차 등록 데이터 렌더러 (협업용 연동 기능)
function renderDashboardWaitingList() {
    const listContainer = document.getElementById('dashboard-waiting-list');
    if (!listContainer) return;

    // 대기 명단 중 입장 완료(seated), 취소(cancelled), 노쇼(no-show)를 제외한 활성 대기 리스트 우선 조회
    const activeEntries = AppState.waitingList.filter(entry => 
        entry.status === 'waiting' || entry.status === 'called'
    );

    if (activeEntries.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-placeholder">
                <div class="empty-icon">👥</div>
                <p>현재 활성화된 대기팀이 없습니다.<br>고객 웨이팅 등록 화면에서 등록해주세요.</p>
            </div>
        `;
        return;
    }

    let html = `
        <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%; overflow-y: auto; max-height: 420px; padding-right: 0.25rem;">
    `;

    activeEntries.forEach(entry => {
        const time = new Date(entry.createdAt);
        const timeFormatted = time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;">
                <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                    <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary);">No. ${entry.waitingNumber}</div>
                    <div style="font-size: 0.95rem; font-weight: 600; color: white;">
                        ${entry.name} <span style="font-size: 0.85rem; font-weight: 400; color: var(--text-secondary);">(${entry.partySize}명)</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${entry.phone}</div>
                    ${entry.requestNote ? `<div style="font-size: 0.8rem; color: var(--warning); padding-top: 0.25rem; font-style: italic;">💬 ${entry.requestNote}</div>` : ''}
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                    <span style="display: inline-block; background: rgba(99, 102, 241, 0.15); color: #818cf8; padding: 0.25rem 0.6rem; border-radius: 8px; font-size: 0.75rem; font-weight: 600;">
                        ${entry.status === 'waiting' ? '대기중' : '호출됨'}
                    </span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${timeFormatted} 등록</span>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    listContainer.innerHTML = html;
}

// 10. LocalStorage 상태 동기화 함수 (영속화 제공)
function saveStateToStorage() {
    try {
        localStorage.setItem('restaurant_waiting_system_state', JSON.stringify(AppState));
    } catch(e) {
        console.error("LocalStorage 저장 중 실패하였습니다.", e);
    }
}

function loadStateFromStorage() {
    try {
        const saved = localStorage.getItem('restaurant_waiting_system_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            AppState.waitingList = parsed.waitingList || [];
            AppState.tables = parsed.tables || [];
            AppState.nextWaitingNumber = parsed.nextWaitingNumber || 1;
        }
    } catch(e) {
        console.error("LocalStorage 데이터를 불러오는 중 실패하였습니다.", e);
    }
}
