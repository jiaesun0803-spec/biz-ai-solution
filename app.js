// ===== BizConsult 시스템 설정 및 상태 관리 =====
const DB_USERS    = 'biz_users';
const DB_SESSION  = 'biz_session';
const STORAGE_KEY = 'biz_consult_companies';
const DB_REPORTS  = 'biz_reports';
let _currentReport = { company:'', type:'', contentAreaId:'', landscape:true };

// 페이지 로드 시 즉시 초기화 실행
document.addEventListener('DOMContentLoaded', () => {
    initTestAccount(); // 테스트 계정 생성 확인
    checkAuth();       // 인증 상태 확인 및 UI 전환
    initFormatters();  // 숫자 및 금액 포맷터 설정
});

// 테스트 계정이 없을 경우 자동 생성 (test@biz.com / 1234)
function initTestAccount() {
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    if (!users.find(u => u.email === 'test@biz.com')) {
        users.push({ 
            email: 'test@biz.com', 
            pw: '1234', 
            name: '선지영', 
            dept: '솔루션빌더스', 
            apiKey: '' 
        });
        localStorage.setItem(DB_USERS, JSON.stringify(users));
    }
}

// ===========================
// ★ 인증 및 접속 제어 (로그인 해결 핵심)
// ===========================

// 테스트 계정으로 즉시 접속 기능
window.devBypassLogin = () => {
    const testUser = { 
        email: 'test@biz.com', 
        name: '선지영', 
        dept: '솔루션빌더스', 
        apiKey: '' 
    };
    localStorage.setItem(DB_SESSION, JSON.stringify(testUser));
    location.reload(); // 세션 저장 후 화면 새로고침으로 확실하게 진입
};

// 로그인 상태에 따른 화면 전환
function checkAuth() {
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    const authEl = document.getElementById('auth-container');
    const appEl  = document.getElementById('main-app');
    
    if (session) {
        if (authEl) authEl.style.display = 'none';
        if (appEl) appEl.style.display = 'flex';
        loadUserProfile(); // 사용자 정보 표시
        showTab('dashboard'); // 기본 탭 표시
    } else {
        if (authEl) authEl.style.display = 'flex';
        if (appEl) appEl.style.display = 'none';
    }
}

// 일반 로그인 처리
window.handleLogin = () => {
    const email = document.getElementById('login-email').value.trim();
    const pw = document.getElementById('login-pw').value;
    const users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    const user = users.find(u => u.email === email && u.pw === pw);
    
    if (user) {
        localStorage.setItem(DB_SESSION, JSON.stringify(user));
        location.reload(); // 로그인 성공 시 즉시 앱 화면으로 전환
    } else {
        alert('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
};

// 로그아웃 처리
window.handleLogout = () => {
    localStorage.removeItem(DB_SESSION);
    location.reload(); // 세션 삭제 후 로그인 화면으로 복귀
};

// 회원가입 전환 및 처리
window.toggleAuthMode = (mode) => {
    document.getElementById('login-form-area').style.display = (mode === 'login' ? 'block' : 'none');
    document.getElementById('signup-form-area').style.display = (mode === 'signup' ? 'block' : 'none');
};

window.handleSignup = () => {
    const email = document.getElementById('signup-email').value.trim();
    const pw = document.getElementById('signup-pw').value;
    const name = document.getElementById('signup-name').value.trim();
    
    if (!email || !pw || !name) { alert('모든 정보를 입력해 주세요.'); return; }
    
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    if (users.find(u => u.email === email)) { alert('이미 가입된 이메일입니다.'); return; }
    
    users.push({ email, pw, name, dept: '솔루션빌더스', apiKey: '' });
    localStorage.setItem(DB_USERS, JSON.stringify(users));
    alert('회원가입이 완료되었습니다! 로그인해 주세요.');
    window.toggleAuthMode('login');
};

// ===========================
// ★ 설정 관리 (프로필 및 API 키 잠금)
// ===========================

function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem(DB_SESSION));
    if (!user) return;
    
    // 상단 사이드바 이름 표시
    document.getElementById('display-user-name').innerText = user.name;
    document.getElementById('display-user-dept').innerText = user.dept || '경영컨설턴트';
    
    // 설정 페이지 값 채우기
    const nameInput = document.getElementById('set-user-name');
    if (nameInput) {
        nameInput.value = user.name;
        document.getElementById('set-user-email').value = user.email;
        document.getElementById('set-user-dept').value = user.dept || '';
        if (user.apiKey) {
            document.getElementById('set-api-key').value = user.apiKey;
            lockApiKeyUI(true);
        }
    }
}

window.saveProfileSettings = () => {
    let session = JSON.parse(localStorage.getItem(DB_SESSION));
    session.name = document.getElementById('set-user-name').value;
    session.dept = document.getElementById('set-user-dept').value;
    updateUserDatabase(session);
    alert('사용자 프로필이 저장되었습니다.');
    loadUserProfile();
};

window.saveApiSettings = () => {
    const key = document.getElementById('set-api-key').value.trim();
    if (!key) { alert('API 키를 입력하세요.'); return; }
    let session = JSON.parse(localStorage.getItem(DB_SESSION));
    session.apiKey = key;
    updateUserDatabase(session);
    lockApiKeyUI(true);
    alert('Gemini API 키가 저장 및 잠금되었습니다.');
};

function lockApiKeyUI(isLocked) {
    const keyEl = document.getElementById('set-api-key');
    const saveBtn = document.getElementById('btn-api-save');
    const editBtn = document.getElementById('btn-api-edit');
    if (keyEl) keyEl.disabled = isLocked;
    if (saveBtn) saveBtn.style.display = isLocked ? 'none' : 'inline-block';
    if (editBtn) editBtn.style.display = isLocked ? 'inline-block' : 'none';
}

window.unlockApiKey = () => lockApiKeyUI(false);

function updateUserDatabase(updatedUser) {
    localStorage.setItem(DB_SESSION, JSON.stringify(updatedUser));
    let users = JSON.parse(localStorage.getItem(DB_USERS));
    const idx = users.findIndex(u => u.email === updatedUser.email);
    if (idx > -1) { users[idx] = updatedUser; localStorage.setItem(DB_USERS, JSON.stringify(users)); }
}

// ===========================
// ★ 기업 관리 및 보고서 생성 (용어: 기업 통일)
// ===========================

window.renderCompanyCards = () => {
    const container = document.getElementById('company-cards-container');
    if (!container) return;
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (list.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px;">등록된 기업이 없습니다. 신규 기업을 등록해 주세요.</div>';
        return;
    }
    container.innerHTML = list.map(c => `
        <div class="company-card">
            <strong>${c.name}</strong>
            <p>업종: ${c.industry || '-'}</p>
            <p>근로자: ${c.empCount || '0'}명</p>
            <div style="margin-top:15px; text-align:right;">
                <button class="btn-small-outline" onclick="showCompanyForm('${c.name}')">정보 수정</button>
            </div>
        </div>
    `).join('');
};

window.saveCompanyData = () => {
    const name = document.getElementById('comp_name').value.trim();
    if (!name) { alert('기업명을 입력하세요.'); return; }
    const data = {
        name,
        industry: document.getElementById('comp_industry').value,
        empCount: document.getElementById('emp_count').value,
        bizDate: document.getElementById('biz_date').value,
        revenueData: {
            cur: document.getElementById('rev_cur').value,
            y25: document.getElementById('rev_25').value
        }
    };
    let list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const idx = list.findIndex(c => c.name === name);
    if (idx > -1) list[idx] = data; else list.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    alert('기업 정보가 성공적으로 저장되었습니다.');
    showCompanyList();
};

// ===========================
// ★ AI 보고서 생성 엔진 (가로/세로 제어 포함)
// ===========================

window.generateReport = async function(type, version, event) {
    const cN = event.target.closest('.tab-content').querySelector('.company-dropdown').value;
    if (!cN) { alert('분석할 기업을 선택해 주세요.'); return; }
    
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    if (!session.apiKey) { alert('설정에서 API 키를 먼저 등록해 주세요.'); showTab('settings'); return; }

    const overlay = document.getElementById('ai-loading-overlay');
    overlay.style.display = 'flex';
    await new Promise(r => setTimeout(r, 600)); // 애니메이션 보장을 위한 지연

    try {
        const resultText = await callGeminiAPI(`기업 '${cN}'의 경영진단보고서를 작성해줘.`);
        const title = `경영진단보고서 (${version === 'client' ? '기업전달용' : '컨설턴트용'})`;
        
        document.getElementById('report-input-step').style.display = 'none';
        document.getElementById('report-result-step').style.display = 'block';
        
        // 경영진단은 세로형(Portrait)
        const ca = document.getElementById('report-content-area');
        ca.innerHTML = `<div class="report-paper"><h1>${title}</h1><hr><p>대상: ${cN}</p><div style="margin-top:25px; line-height:1.8;">${resultText.replace(/\n/g, '<br>')}</div></div>`;
        
        _currentReport = { company: cN, type: title, contentAreaId: 'report-content-area', landscape: false };
    } catch (e) {
        alert('보고서 생성 중 오류가 발생했습니다.');
    } finally {
        overlay.style.display = 'none';
    }
};

window.generateAnyReport = async function(type, version, event) {
    const tab = event.target.closest('.tab-content');
    const cN = tab.querySelector('.company-dropdown').value;
    if (!cN) { alert('기업을 선택하세요.'); return; }
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    if (!session.apiKey) { alert('API 키를 등록해 주세요.'); return; }

    const overlay = document.getElementById('ai-loading-overlay');
    overlay.style.display = 'flex';
    await new Promise(r => setTimeout(r, 600));

    try {
        const isL = (type === 'aiBiz'); // 사업계획서만 가로형(Landscape)
        const titles = { finance: '상세 재무진단', aiBiz: '사업계획서', aiFund: '정책자금매칭' };
        const title = titles[type] || '리포트';
        
        const resultText = await callGeminiAPI(`${title} 내용을 기업 ${cN}에 맞춰 작성해줘.`);
        
        tab.querySelector('[id$="-input-step"]').style.display = 'none';
        tab.querySelector('[id$="-result-step"]').style.display = 'block';
        
        const areaId = type + '-content-area';
        const paperClass = isL ? 'report-paper-landscape' : 'report-paper';
        document.getElementById(areaId).innerHTML = `<div class="${paperClass}"><h1>${title}</h1><p>기업명: ${cN}</p><div style="margin-top:20px;">${resultText.replace(/\n/g, '<br>')}</div></div>`;
        
        _currentReport = { company: cN, type: title, contentAreaId: areaId, landscape: isL };
    } catch (e) { alert('생성 오류'); }
    finally { overlay.style.display = 'none'; }
};

async function callGeminiAPI(prompt) {
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${session.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const json = await response.json();
    if (json.error) throw new Error(json.error.message);
    return json.candidates[0].content.parts[0].text;
}

// ===========================
// ★ UI 공통 제어
// ===========================

window.showTab = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    const menuLi = document.getElementById('menu-' + id);
    if(menuLi) menuLi.classList.add('active');
    
    if (id === 'company') renderCompanyCards();
    updateDataLists(); // 기업 선택 목록 갱신
};

window.updateDataLists = () => {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    document.querySelectorAll('.company-dropdown').forEach(sel => {
        sel.innerHTML = '<option value="">분석할 기업 선택</option>' + list.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    });
    const statComp = document.getElementById('stat-companies');
    if (statComp) statComp.innerText = list.length;
};

window.showCompanyList = () => {
    document.getElementById('company-list-step').style.display = 'block';
    document.getElementById('company-form-step').style.display = 'none';
    renderCompanyCards();
};

window.showCompanyForm = (editName = null) => {
    document.getElementById('company-list-step').style.display = 'none';
    document.getElementById('company-form-step').style.display = 'block';
    if (!editName) document.getElementById('companyForm').reset();
};

window.printReport = () => window.print();

window.backToInput = (id) => {
    document.getElementById(id + '-input-step').style.display = 'block';
    document.getElementById(id + '-result-step').style.display = 'none';
};

function initFormatters() {
    document.querySelectorAll('.money-format').forEach(i => i.addEventListener('input', e => {
        let v = e.target.value.replace(/[^0-9]/g,'');
        e.target.value = v.replace(/\B(?=(\d{3})+(?!\d))/g,',');
    }));
}

// 완료 로그
console.log("모든 수정 사항 반영 및 로그인 로직 보강 완료");
