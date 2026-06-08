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
        renderDashboardTables();
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
    
    // TC-02 인원수 검증 오류 테스트를 위해 0 이하로 내려갈 수 있도록 허용하되, 최소 0으로 제한
    if (currentPartySize < 0) {
        currentPartySize = 0;
    }
    
    if (currentPartySize < minSize) {
        partyError.style.display = 'block';
        partyError.textContent = '인원수는 최소 1명 이상이어야 합니다.';
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
        partyError.textContent = '인원수는 최소 1명 이상이어야 합니다.';
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

// 9. 대시보드 상태 필터 및 리스트 렌더러
let currentDashboardFilter = 'active'; // 기본 필터: 대기/호출 ('active', 'waiting', 'called', 'finished')

function setDashboardFilter(filterType) {
    currentDashboardFilter = filterType;
    
    // 필터 탭 활성화 클래스 조절
    const filterTabs = ['active', 'waiting', 'called', 'finished'];
    filterTabs.forEach(type => {
        const tabEl = document.getElementById(`filter-tab-${type}`);
        if (tabEl) {
            if (type === filterType) {
                tabEl.classList.add('active');
            } else {
                tabEl.classList.remove('active');
            }
        }
    });
    
    renderDashboardWaitingList();
}

function renderDashboardWaitingList() {
    const listContainer = document.getElementById('dashboard-waiting-list');
    if (!listContainer) return;

    // 통계 요약 갱신
    renderAnalyticsSummary();

    // 필터 조건에 따른 리스트 추출
    let filteredEntries = [];
    if (currentDashboardFilter === 'active') {
        filteredEntries = AppState.waitingList.filter(entry => 
            entry.status === 'waiting' || entry.status === 'called'
        );
    } else if (currentDashboardFilter === 'waiting') {
        filteredEntries = AppState.waitingList.filter(entry => entry.status === 'waiting');
    } else if (currentDashboardFilter === 'called') {
        filteredEntries = AppState.waitingList.filter(entry => entry.status === 'called');
    } else if (currentDashboardFilter === 'finished') {
        filteredEntries = AppState.waitingList.filter(entry => 
            entry.status === 'cancelled' || entry.status === 'no-show' || entry.status === 'seated'
        );
    }

    // 대기 번호 오름차순(등록 순서) 정렬 (FR-05)
    filteredEntries.sort((a, b) => a.waitingNumber - b.waitingNumber);

    if (filteredEntries.length === 0) {
        let emptyMessage = '현재 조건에 해당하는 대기팀이 없습니다.';
        let emptyIcon = '👥';
        if (currentDashboardFilter === 'waiting') {
            emptyMessage = '대기 중인 팀이 없습니다.';
            emptyIcon = '⏳';
        } else if (currentDashboardFilter === 'called') {
            emptyMessage = '호출 상태인 팀이 없습니다.';
            emptyIcon = '📢';
        } else if (currentDashboardFilter === 'finished') {
            emptyMessage = '취소되거나 종료된 팀이 없습니다.';
            emptyIcon = '🗑️';
        }

        listContainer.innerHTML = `
            <div class="empty-placeholder">
                <div class="empty-icon">${emptyIcon}</div>
                <p>${emptyMessage}</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="waiting-list-scroll">
    `;

    filteredEntries.forEach(entry => {
        const time = new Date(entry.createdAt);
        const timeFormatted = time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        
        // 상태별 배지 텍스트 및 클래스 매칭
        let statusBadgeHtml = '';
        if (entry.status === 'waiting') {
            statusBadgeHtml = `<span class="badge waiting">대기중</span>`;
        } else if (entry.status === 'called') {
            statusBadgeHtml = `<span class="badge called">호출됨</span>`;
        } else if (entry.status === 'cancelled') {
            statusBadgeHtml = `<span class="badge cancelled">취소됨</span>`;
        } else if (entry.status === 'no-show') {
            statusBadgeHtml = `<span class="badge noshow">노쇼</span>`;
        } else if (entry.status === 'seated') {
            statusBadgeHtml = `<span class="badge seated">입장완료</span>`;
        }

        // 상태에 따른 액션 버튼 그룹 구성
        let actionButtonsHtml = '';
        if (entry.status === 'waiting') {
            actionButtonsHtml = `
                <div class="action-btn-group">
                    <button class="btn-action call" onclick="callCustomer('${entry.id}')">📢 호출</button>
                    <button class="btn-action cancel" onclick="cancelWaiting('${entry.id}')">🗑️ 취소</button>
                </div>
            `;
        } else if (entry.status === 'called') {
            actionButtonsHtml = `
                <div class="action-btn-group">
                    <button class="btn-action seat" onclick="openSeatingModal('${entry.id}')">🔑 입장 배정</button>
                    <button class="btn-action noshow" onclick="noShowCustomer('${entry.id}')">⚠️ 노쇼</button>
                    <button class="btn-action cancel" onclick="cancelWaiting('${entry.id}')">🗑️ 취소</button>
                </div>
            `;
        }

        html += `
            <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;">
                <div style="display: flex; flex-direction: column; gap: 0.35rem; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.25rem; font-weight: 800; color: var(--primary);">No. ${entry.waitingNumber}</span>
                        ${statusBadgeHtml}
                    </div>
                    <div style="font-size: 0.95rem; font-weight: 600; color: white;">
                        ${entry.name} <span style="font-size: 0.85rem; font-weight: 400; color: var(--text-secondary);">(${entry.partySize}명)</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${entry.phone}</div>
                    ${entry.requestNote ? `<div style="font-size: 0.8rem; color: var(--warning); padding-top: 0.25rem; font-style: italic;">💬 ${entry.requestNote}</div>` : ''}
                    
                    <!-- 액션 버튼들 -->
                    ${actionButtonsHtml}
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end; justify-content: center;">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${timeFormatted} 등록</span>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    listContainer.innerHTML = html;
}

// 9.5 대기 고객 상태 변경 핸들러 (FR-06, FR-07, FR-08)
function callCustomer(id) {
    const entry = AppState.waitingList.find(e => e.id === id);
    if (!entry) return;

    // BR-02 검증: waiting 상태 고객만 호출 가능
    if (entry.status !== 'waiting') {
        alert('대기중인 고객만 호출할 수 있습니다.');
        return;
    }

    entry.status = 'called';
    entry.calledAt = new Date().toISOString();
    
    saveStateToStorage();
    updateKioskStats();
    renderDashboardWaitingList();
}

function cancelWaiting(id) {
    const entry = AppState.waitingList.find(e => e.id === id);
    if (!entry) return;

    // waiting 또는 called 상태일 때만 취소 가능
    if (entry.status !== 'waiting' && entry.status !== 'called') {
        alert('이미 완료되거나 종료된 예약은 취소할 수 없습니다.');
        return;
    }

    if (confirm(`${entry.name} 고객님의 웨이팅을 취소하시겠습니까?`)) {
        entry.status = 'cancelled';
        entry.cancelledAt = new Date().toISOString();
        
        saveStateToStorage();
        updateKioskStats();
        renderDashboardWaitingList();
    }
}

function noShowCustomer(id) {
    const entry = AppState.waitingList.find(e => e.id === id);
    if (!entry) return;

    // BR-05 / BR-02 간접 검증: called 상태 고객만 노쇼 처리 가능
    if (entry.status !== 'called') {
        alert('호출된 고객만 노쇼 처리할 수 있습니다.');
        return;
    }

    if (confirm(`${entry.name} 고객님을 노쇼 처리하시겠습니까?`)) {
        entry.status = 'no-show';
        entry.noShowAt = new Date().toISOString();
        
        saveStateToStorage();
        updateKioskStats();
        renderDashboardWaitingList();
    }
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

// 11. 매장 테이블 관리 핸들러 (FR-09, FR-13)
function handleTableRegistrationSubmit() {
    const tableNumInput = document.getElementById('table-number');
    const tableCapInput = document.getElementById('table-capacity');
    const tableError = document.getElementById('table-error');

    if (!tableNumInput || !tableCapInput || !tableError) return;

    const tableNumber = tableNumInput.value.trim();
    const capacity = parseInt(tableCapInput.value.trim(), 10);

    tableError.textContent = '';
    tableError.style.display = 'none';

    // A. 테이블 번호 공백 검증
    if (!tableNumber) {
        tableError.textContent = '테이블 번호를 입력해주세요.';
        tableError.style.display = 'block';
        return;
    }

    // B. 수용 인원 검증 (1명 이상)
    if (isNaN(capacity) || capacity < 1) {
        tableError.textContent = '수용 인원은 최소 1명 이상이어야 합니다.';
        tableError.style.display = 'block';
        return;
    }

    // C. 테이블 번호 중복 등록 검증 (대소문자 구분 없이)
    const isDuplicate = AppState.tables.some(
        t => t.tableNumber.trim().toLowerCase() === tableNumber.toLowerCase()
    );
    if (isDuplicate) {
        tableError.textContent = '이미 등록된 테이블 번호입니다.';
        tableError.style.display = 'block';
        return;
    }

    // D. 신규 RestaurantTable 객체 생성
    const newTable = {
        id: 'T-' + Date.now(),
        tableNumber: tableNumber,
        capacity: capacity,
        status: 'available' // 초기 상태는 항상 'available'
    };

    // E. 상태 업데이트 및 영속화
    AppState.tables.push(newTable);
    saveStateToStorage();

    // F. 테이블 목록 그리드 재렌더링
    renderDashboardTables();

    // G. 입력 폼 초기화
    tableNumInput.value = '';
    tableCapInput.value = '';
}

function renderDashboardTables() {
    const container = document.getElementById('dashboard-tables-container');
    if (!container) return;

    if (!AppState.tables || AppState.tables.length === 0) {
        container.innerHTML = `
            <div class="empty-placeholder" style="height: 200px;">
                <div class="empty-icon">🍽️</div>
                <p>등록된 매장 테이블이 없습니다.<br>위 폼에서 테이블 번호와 인원수를 입력해 등록하세요.</p>
            </div>
        `;
        return;
    }

    let html = `<div class="tables-list-scroll">`;

    AppState.tables.forEach(table => {
        const statusClass = `status-${table.status}`;
        
        html += `
            <div class="table-card ${statusClass}">
                <button type="button" class="btn-delete-table" onclick="deleteTable('${table.id}')" title="테이블 삭제">✕</button>
                <div class="table-card-header">
                    <span class="table-card-num">${escapeHtml(table.tableNumber)}</span>
                    <span class="table-card-capacity">${table.capacity}인석</span>
                </div>
                <div>
                    <select class="table-status-select" onchange="changeTableStatus('${table.id}', this.value)">
                        <option value="available" ${table.status === 'available' ? 'selected' : ''}>이용 가능</option>
                        <option value="occupied" ${table.status === 'occupied' ? 'selected' : ''}>식사 중</option>
                        <option value="cleaning" ${table.status === 'cleaning' ? 'selected' : ''}>정리 중</option>
                    </select>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function changeTableStatus(tableId, newStatus) {
    const table = AppState.tables.find(t => t.id === tableId);
    if (!table) return;

    // 상태값 유효성 검증
    if (newStatus === 'available' || newStatus === 'occupied' || newStatus === 'cleaning') {
        table.status = newStatus;
        saveStateToStorage();
        renderDashboardTables();
    }
}

function deleteTable(tableId) {
    const table = AppState.tables.find(t => t.id === tableId);
    if (!table) return;

    if (confirm(`테이블 ${table.tableNumber}을(를) 삭제하시겠습니까?`)) {
        AppState.tables = AppState.tables.filter(t => t.id !== tableId);
        saveStateToStorage();
        renderDashboardTables();
    }
}

// 12. 테이블 배정 및 입장 처리 모달 기능 (Phase 3)
let currentSeatingEntryId = null;
let selectedSeatingTableId = null;

function openSeatingModal(entryId) {
    currentSeatingEntryId = entryId;
    selectedSeatingTableId = null;
    
    // 확정 버튼 비활성화 초기화
    const confirmBtn = document.getElementById('btn-confirm-seating');
    if (confirmBtn) {
        confirmBtn.disabled = true;
    }

    const entry = AppState.waitingList.find(e => e.id === entryId);
    if (!entry) return;

    // 모달 내 고객 정보 렌더링
    document.getElementById('seat-cust-number').textContent = entry.waitingNumber;
    document.getElementById('seat-cust-name').textContent = entry.name;
    document.getElementById('seat-cust-party').textContent = `${entry.partySize}명`;
    
    const noteEl = document.getElementById('seat-cust-note');
    if (noteEl) {
        noteEl.textContent = entry.requestNote ? `💬 요청사항: ${entry.requestNote}` : '💬 요청사항: 없음';
    }

    // 추천 테이블 목록 빌드 및 렌더링
    const tablesListContainer = document.getElementById('seating-tables-list');
    if (tablesListContainer) {
        const recommended = recommendTables(entry.partySize);

        if (recommended.length === 0) {
            tablesListContainer.innerHTML = `
                <div class="no-tables-msg">
                    ⚠️ 현재 인원(${entry.partySize}명)을 수용할 수 있는 이용 가능한 테이블이 없습니다.<br>
                    식사 중이거나 정리 중인 테이블의 상태를 확인해 주세요.
                </div>
            `;
        } else {
            let html = '';
            
            // capacity 오름차순으로 정렬되었으므로 첫 번째 요소를 최적 추천으로 함
            recommended.forEach((table, index) => {
                const isBest = (index === 0);
                const bestClass = isBest ? 'best-recommend' : '';
                const bestBadge = isBest ? '<span class="best-recommend-badge">최적 추천</span>' : '';
                
                html += `
                    <div class="seating-table-card ${bestClass}" onclick="selectSeatingTable('${table.id}', this)">
                        ${bestBadge}
                        <div class="seating-table-card-num">${escapeHtml(table.tableNumber)}</div>
                        <div class="seating-table-card-capacity">${table.capacity}인석</div>
                        <div class="seating-table-card-status">이용 가능</div>
                    </div>
                `;
            });
            tablesListContainer.innerHTML = html;
        }
    }

    // 모달 활성화
    const overlay = document.getElementById('seating-overlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

function selectSeatingTable(tableId, element) {
    selectedSeatingTableId = tableId;

    // 모든 테이블 카드의 선택 스타일 제거
    const cards = document.querySelectorAll('.seating-table-card');
    cards.forEach(card => card.classList.remove('selected'));

    // 클릭된 카드에 선택 스타일 부여
    if (element) {
        element.classList.add('selected');
    }

    // 배정 확정 버튼 활성화
    const confirmBtn = document.getElementById('btn-confirm-seating');
    if (confirmBtn) {
        confirmBtn.disabled = false;
    }
}

function recommendTables(partySize) {
    // 이용 가능(available) 상태이면서 고객의 인원수 이상 수용 가능한 테이블 필터링
    const suitableTables = AppState.tables.filter(t => 
        t.status === 'available' && t.capacity >= partySize
    );

    // 수용 인원 기준 오름차순 정렬 (가장 적당하고 작은 테이블 추천)
    suitableTables.sort((a, b) => a.capacity - b.capacity);

    return suitableTables;
}

function closeSeatingModal() {
    const overlay = document.getElementById('seating-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    currentSeatingEntryId = null;
    selectedSeatingTableId = null;
}

function submitSeatingAssignment() {
    if (!currentSeatingEntryId || !selectedSeatingTableId) return;

    const entry = AppState.waitingList.find(e => e.id === currentSeatingEntryId);
    const table = AppState.tables.find(t => t.id === selectedSeatingTableId);

    if (!entry || !table) {
        alert('배정 정보를 찾을 수 없습니다.');
        return;
    }

    // 고객 상태 변경: seated
    entry.status = 'seated';
    entry.seatedAt = new Date().toISOString();

    // 테이블 상태 변경: occupied
    table.status = 'occupied';

    // 로컬 스토리지 데이터 영속화
    saveStateToStorage();

    // 모달 닫기
    closeSeatingModal();

    // UI 동기화
    renderDashboardWaitingList();
    renderDashboardTables();
    updateKioskStats();
}

// HTML 이스케이프 유틸리티 함수
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 13. 운영 통계 계산 및 렌더링 함수 (Issue #8)
function calculateAnalyticsSummary() {
    const list = AppState.waitingList || [];
    
    // 1. 평균 노쇼 및 취소 비율
    const totalCount = list.length;
    let waitingCount = 0;
    let seatedCount = 0;
    let noShowCount = 0;
    let cancelledCount = 0;
    
    list.forEach(entry => {
        if (entry.status === 'waiting') waitingCount++;
        else if (entry.status === 'seated') seatedCount++;
        else if (entry.status === 'no-show') noShowCount++;
        else if (entry.status === 'cancelled') cancelledCount++;
    });
    
    const noShowAndCancelled = noShowCount + cancelledCount;
    const rate = totalCount > 0 ? (noShowAndCancelled / totalCount) * 100 : 0;
    
    // 2. 인원수 그룹별 평균 대기 시간 (seated 상태 고객만 대상)
    let smallWaitSum = 0, smallCount = 0;
    let mediumWaitSum = 0, mediumCount = 0;
    let largeWaitSum = 0, largeCount = 0;
    
    list.forEach(entry => {
        if (entry.status === 'seated') {
            if (entry.seatedAt && entry.createdAt) {
                const seatTime = new Date(entry.seatedAt);
                const createTime = new Date(entry.createdAt);
                
                if (!isNaN(seatTime.getTime()) && !isNaN(createTime.getTime())) {
                    const diffMs = seatTime.getTime() - createTime.getTime();
                    const diffMins = Math.max(0, diffMs / 1000 / 60);
                    
                    const party = entry.partySize || 0;
                    if (party >= 1 && party <= 2) {
                        smallWaitSum += diffMins;
                        smallCount++;
                    } else if (party >= 3 && party <= 4) {
                        mediumWaitSum += diffMins;
                        mediumCount++;
                    } else if (party >= 5) {
                        largeWaitSum += diffMins;
                        largeCount++;
                    }
                }
            }
        }
    });
    
    const avgWaitSmall = smallCount > 0 ? (smallWaitSum / smallCount) : null;
    const avgWaitMedium = mediumCount > 0 ? (mediumWaitSum / mediumCount) : null;
    const avgWaitLarge = largeCount > 0 ? (largeWaitSum / largeCount) : null;
    
    // 3. 시간대별 내방 고객 집중도 (11시~22시 범위 기본)
    const hourlyCounts = {};
    for (let h = 11; h <= 22; h++) {
        hourlyCounts[h] = 0;
    }
    
    list.forEach(entry => {
        if (entry.createdAt) {
            const createTime = new Date(entry.createdAt);
            if (!isNaN(createTime.getTime())) {
                const hour = createTime.getHours();
                if (hour >= 11 && hour <= 22) {
                    hourlyCounts[hour]++;
                }
            }
        }
    });
    
    return {
        counts: {
            total: totalCount,
            waiting: waitingCount,
            seated: seatedCount,
            noshow: noShowCount,
            cancelled: cancelledCount
        },
        rate: rate,
        avgWaitTimes: {
            small: avgWaitSmall,
            medium: avgWaitMedium,
            large: avgWaitLarge
        },
        hourlyCounts: hourlyCounts
    };
}

function renderAnalyticsSummary() {
    const summary = calculateAnalyticsSummary();
    
    // A. 평균 노쇼 및 취소 비율 업데이트
    const noShowRing = document.getElementById('no-show-rate-ring');
    const noShowRateText = document.getElementById('no-show-rate-text');
    if (noShowRateText) {
        noShowRateText.textContent = `${summary.rate.toFixed(1)}%`;
    }
    if (noShowRing) {
        const radius = 34;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (summary.rate / 100) * circumference;
        noShowRing.style.strokeDashoffset = isNaN(offset) ? circumference : offset;
    }
    
    // 개별 숫자 노출
    const statTotal = document.getElementById('stat-total');
    const statWaiting = document.getElementById('stat-waiting');
    const statSeated = document.getElementById('stat-seated');
    const statNoshow = document.getElementById('stat-noshow');
    const statCancelled = document.getElementById('stat-cancelled');
    
    if (statTotal) statTotal.textContent = `${summary.counts.total}건`;
    if (statWaiting) statWaiting.textContent = `${summary.counts.waiting}건`;
    if (statSeated) statSeated.textContent = `${summary.counts.seated}건`;
    if (statNoshow) statNoshow.textContent = `${summary.counts.noshow}건`;
    if (statCancelled) statCancelled.textContent = `${summary.counts.cancelled}건`;
    
    // B. 그룹별 평균 대기 시간 업데이트
    const waitSmall = document.getElementById('wait-group-small');
    const waitMedium = document.getElementById('wait-group-medium');
    const waitLarge = document.getElementById('wait-group-large');
    
    const formatWaitTime = (val) => {
        if (val === null || val === undefined) return '데이터 없음';
        return `${val.toFixed(1)}분`;
    };
    
    if (waitSmall) waitSmall.textContent = formatWaitTime(summary.avgWaitTimes.small);
    if (waitMedium) waitMedium.textContent = formatWaitTime(summary.avgWaitTimes.medium);
    if (waitLarge) waitLarge.textContent = formatWaitTime(summary.avgWaitTimes.large);
    
    // C. 시간대별 내방 집중도 차트 그리기
    const hourlyChart = document.getElementById('hourly-chart');
    if (hourlyChart) {
        let maxCount = 0;
        for (let h = 11; h <= 22; h++) {
            if (summary.hourlyCounts[h] > maxCount) {
                maxCount = summary.hourlyCounts[h];
            }
        }
        
        let html = '';
        for (let h = 11; h <= 22; h++) {
            const count = summary.hourlyCounts[h];
            const heightPercent = maxCount > 0 ? (count / maxCount) * 80 : 0;
            
            html += `
                <div class="chart-bar-wrapper">
                    <div class="chart-tooltip">${h}시: ${count}건 등록</div>
                    <div class="chart-bar" style="height: calc(${heightPercent}% + 2px);"></div>
                    <span class="chart-bar-label">${h}시</span>
                </div>
            `;
        }
        hourlyChart.innerHTML = html;
    }
}

// 14. 통계 시연용 샘플 데이터 생성/삭제 기능 (Issue #8)
function generateSampleData() {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 샘플 템플릿 정의
    const samples = [
        { name: "김철수", phone: "010-1111-2222", partySize: 2, status: "seated", hour: 11, min: 15, seatDiff: 12 },
        { name: "이영희", phone: "010-2222-3333", partySize: 4, status: "seated", hour: 12, min: 0, seatDiff: 24 },
        { name: "박민수", phone: "010-3333-4444", partySize: 6, status: "seated", hour: 13, min: 30, seatDiff: 45 },
        { name: "최정우", phone: "010-4444-5555", partySize: 1, status: "no-show", hour: 14, min: 10 },
        { name: "정다은", phone: "010-5555-6666", partySize: 2, status: "cancelled", hour: 15, min: 45 },
        { name: "홍길동", phone: "010-6666-7777", partySize: 3, status: "waiting", hour: 17, min: 0 },
        { name: "송지은", phone: "010-7777-8888", partySize: 5, status: "called", hour: 18, min: 15 },
        { name: "강동우", phone: "010-8888-9999", partySize: 2, status: "seated", hour: 19, min: 30, seatDiff: 18 },
        { name: "윤서연", phone: "010-9999-0000", partySize: 4, status: "seated", hour: 20, min: 0, seatDiff: 32 },
        { name: "조현우", phone: "010-1234-5678", partySize: 2, status: "waiting", hour: 21, min: 10 },
        { name: "한미경", phone: "010-8765-4321", partySize: 3, status: "cancelled", hour: 22, min: 0 }
    ];

    samples.forEach((sample, idx) => {
        const createTime = new Date(`${todayStr}T${String(sample.hour).padStart(2, '0')}:${String(sample.min).padStart(2, '0')}:00`);
        let seatTime = null;
        if (sample.status === 'seated' && sample.seatDiff) {
            seatTime = new Date(createTime.getTime() + sample.seatDiff * 60 * 1000);
        }

        const newEntry = {
            id: 'W-SAMPLE-' + idx + '-' + Date.now(),
            waitingNumber: AppState.nextWaitingNumber++,
            name: sample.name + "(샘플)",
            phone: sample.phone,
            partySize: sample.partySize,
            requestNote: sample.status === 'seated' ? '샘플 입장 데이터' : '샘플 데이터',
            status: sample.status,
            createdAt: createTime.toISOString(),
            seatedAt: seatTime ? seatTime.toISOString() : null,
            calledAt: (sample.status === 'called' || sample.status === 'seated' || sample.status === 'no-show') ? new Date(createTime.getTime() + 5 * 60 * 1000).toISOString() : null,
            noShowAt: sample.status === 'no-show' ? new Date(createTime.getTime() + 15 * 60 * 1000).toISOString() : null,
            cancelledAt: sample.status === 'cancelled' ? new Date(createTime.getTime() + 10 * 60 * 1000).toISOString() : null,
            isSample: true
        };
        AppState.waitingList.push(newEntry);
    });

    saveStateToStorage();
    renderDashboardWaitingList();
    renderAnalyticsSummary();
    updateKioskStats();
    
    alert('시연용 샘플 데이터 11건이 생성되었습니다!');
}

function deleteSampleData() {
    const originalLength = AppState.waitingList.length;
    AppState.waitingList = AppState.waitingList.filter(entry => !entry.isSample);
    const deletedCount = originalLength - AppState.waitingList.length;

    if (deletedCount === 0) {
        alert('삭제할 샘플 데이터가 없습니다.');
        return;
    }

    saveStateToStorage();
    renderDashboardWaitingList();
    renderAnalyticsSummary();
    updateKioskStats();

    alert(`총 ${deletedCount}건의 샘플 데이터가 삭제되었습니다.`);
}

