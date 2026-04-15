// 데이터베이스 키 (localStorage)
const DB_USERS = 'biz_users'; // 가입된 사용자 목록
const DB_SESSION = 'biz_session'; // 현재 로그인된 사용자 정보
const STORAGE_KEY = 'biz_consult_companies';

document.addEventListener("DOMContentLoaded", function() {
    checkAuth(); // 접속 시 로그인 상태 체크

    // URL 파라미터 체크
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') || 'dashboard';
    showTab(tabParam, false);
});

/* =========================================
   1. 인증 시스템 (Auth)
========================================= */

function checkAuth() {
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    const authOverlay = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');

    if (session) {
        if(authOverlay) authOverlay.style.display = 'none';
        if(mainApp) mainApp.style.display = 'flex';
        loadUserProfile();
    } else {
        if(authOverlay) authOverlay.style.display = 'flex';
        if(mainApp) mainApp.style.display = 'none';
    }
}

function toggleAuthMode(mode) {
    document.getElementById('login-form-area').style.display = mode === 'login' ? 'block' : 'none';
    document.getElementById('signup-form-area').style.display = mode === 'signup' ? 'block' : 'none';
}

function handleSignup() {
    const email = document.getElementById('signup-email').value;
    const pw = document.getElementById('signup-pw').value;
    const name = document.getElementById('signup-name').value;

    if (!email || !pw || !name) { alert('모든 정보를 입력해주세요.'); return; }

    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    if (users.find(u => u.email === email)) { alert('이미 가입된 이메일입니다.'); return; }

    const newUser = { email, pw, name, dept: '솔루션빌더스', apiKey: '' };
    users.push(newUser);
    localStorage.setItem(DB_USERS, JSON.stringify(users));

    alert('회원가입이 완료되었습니다! 로그인해주세요.');
    toggleAuthMode('login');
}

function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pw = document.getElementById('login-pw').value;

    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    const user = users.find(u => u.email === email && u.pw === pw);

    if (user) {
        localStorage.setItem(DB_SESSION, JSON.stringify(user));
        checkAuth();
    } else {
        alert('이메일 또는 비밀번호가 일치하지 않습니다.');
    }
}

function handleLogout() {
    localStorage.removeItem(DB_SESSION);
    location.reload();
}

/* =========================================
   2. 설정 (Settings) 기능 - 분할 업데이트
========================================= */

function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem(DB_SESSION));
    if (!user) return;

    // 사이드바 표시
    if(document.getElementById('display-user-name')) document.getElementById('display-user-name').innerText = user.name;
    if(document.getElementById('display-user-dept')) document.getElementById('display-user-dept').innerText = user.dept || '솔루션빌더스';

    // 설정 탭 입력란 채우기
    if(document.getElementById('set-user-name')) {
        document.getElementById('set-user-name').value = user.name;
        document.getElementById('set-user-email').value = user.email;
        document.getElementById('set-user-dept').value = user.dept || '';
        document.getElementById('set-api-key').value = user.apiKey || '';
    }
}

// 헬퍼 함수: 세션과 유저 DB를 동시 업데이트
function updateUserDB(updatedUser) {
    let users = JSON.parse(localStorage.getItem(DB_USERS));
    const userIdx = users.findIndex(u => u.email === updatedUser.email);
    users[userIdx] = updatedUser;
    localStorage.setItem(DB_USERS, JSON.stringify(users));
    localStorage.setItem(DB_SESSION, JSON.stringify(updatedUser));
    loadUserProfile();
}

function saveProfileSettings() {
    let session = JSON.parse(localStorage.getItem(DB_SESSION));
    session.name = document.getElementById('set-user-name').value;
    session.dept = document.getElementById('set-user-dept').value;
    updateUserDB(session);
    alert('프로필 정보가 저장되었습니다.');
}

function saveApiSettings() {
    let session = JSON.parse(localStorage.getItem(DB_SESSION));
    session.apiKey = document.getElementById('set-api-key').value;
    updateUserDB(session);
    alert('API 키가 안전하게 저장되었습니다.');
}

function savePasswordSettings() {
    const curPw = document.getElementById('set-cur-pw').value;
    const newPw = document.getElementById('set-new-pw').value;
    let session = JSON.parse(localStorage.getItem(DB_SESSION));

    if (!curPw || !newPw) { alert('비밀번호를 모두 입력해주세요.'); return; }
    if (session.pw !== curPw) { alert('현재 비밀번호가 틀립니다.'); return; }
    
    session.pw = newPw;
    updateUserDB(session);
    
    // 입력창 초기화
    document.getElementById('set-cur-pw').value = '';
    document.getElementById('set-new-pw').value = '';
    alert('비밀번호가 성공적으로 변경되었습니다.');
}

/* =========================================
   3. 기존 앱 기능 (Tab, Table 연동 등)
========================================= */

function showTab(tabId, updateUrl = true) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.menu li, .bottom-menu li').forEach(item => item.classList.remove('active'));

    const target = document.getElementById(tabId);
    if(target) target.classList.add('active');
    const menu = document.getElementById('menu-' + tabId);
    if(menu) menu.classList.add('active');

    if(tabId === 'settings') loadUserProfile();
    if(tabId === 'reportList') updateCompanyLists();

    if (updateUrl) history.pushState(null, '', `?tab=${tabId}`);
}

function updateCompanyLists() {
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const dropdowns = document.querySelectorAll('.company-dropdown');
    dropdowns.forEach(select => {
        select.innerHTML = '<option value="">업체를 선택하세요</option>';
        companies.forEach(c => select.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    });

    const body = document.getElementById('company-list-body');
    if(body) {
        body.innerHTML = companies.length ? companies.map(c => `
            <tr><td><strong>${c.name}</strong></td><td>${c.rep || '-'}</td><td>${c.bizNum || '-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="showTab('company')">수정</button></td></tr>
        `).join('') : '<tr><td colspan="5" style="text-align:center; padding:40px;">등록된 업체가 없습니다.</td></tr>';
    }
}

// 기존 입력 포맷 및 계산 함수들 모음
function initInputHandlers() {
    document.querySelectorAll('.number-only').forEach(input => {
        input.addEventListener('input', function() { this.value = this.value.replace(/[^0-9]/g, ''); });
    });
    document.querySelectorAll('.money-format').forEach(input => {
        input.addEventListener('input', function() {
            let val = this.value.replace(/[^0-9\-]/g, ''); 
            this.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        });
    });
    document.querySelectorAll('.debt-input').forEach(input => {
        input.addEventListener('input', calculateTotalDebt);
    });

    const formatInputs = [
        { id: 'biz_number', len: [4, 6], split: [3, 5, 10] },
        { id: 'corp_number', len: [7], split: [6, 13] },
        { id: 'biz_date', len: [5, 7], split: [4, 6, 8] },
        { id: 'rep_birth', len: [5, 7], split: [4, 6, 8] },
        { id: 'write_date', len: [5, 7], split: [4, 6, 8] }
    ];

    formatInputs.forEach(item => {
        const el = document.getElementById(item.id);
        if(el) {
            el.addEventListener('input', function() {
                let val = this.value.replace(/[^0-9]/g, '');
                if (item.id === 'corp_number') {
                    if (val.length < 7) this.value = val; else this.value = val.slice(0,6) + '-' + val.slice(6,13);
                } else if(item.id === 'biz_number') {
                    if (val.length < 4) this.value = val;
                    else if (val.length < 6) this.value = val.slice(0,3) + '-' + val.slice(3);
                    else this.value = val.slice(0,3) + '-' + val.slice(3,5) + '-' + val.slice(5,10);
                } else {
                     if (val.length < 5) this.value = val;
                     else if (val.length < 7) this.value = val.slice(0,4) + '-' + val.slice(4);
                     else this.value = val.slice(0,4) + '-' + val.slice(4,6) + '-' + val.slice(6,8);
                }
            });
        }
    });

    document.querySelectorAll('.fin-input').forEach(input => {
        input.addEventListener('input', function() { calcFinance('1'); calcFinance('2'); });
    });
}
initInputHandlers(); // 실행

function calcFinance(idx) {
    const ca = parseFloat(document.getElementById('ca_' + idx) ? document.getElementById('ca_' + idx).value.replace(/,/g, '') : 0) || 0;
    const cl = parseFloat(document.getElementById('cl_' + idx) ? document.getElementById('cl_' + idx).value.replace(/,/g, '') : 0) || 0;
    const cap = parseFloat(document.getElementById('cap_' + idx) ? document.getElementById('cap_' + idx).value.replace(/,/g, '') : 0) || 0;
    const eq = parseFloat(document.getElementById('eq_' + idx) ? document.getElementById('eq_' + idx).value.replace(/,/g, '') : 0) || 0;
    const resLiq = document.getElementById('res_liq_' + idx);
    const resImp = document.getElementById('res_imp_' + idx);

    if(!resLiq || !resImp) return;

    if (cl > 0) {
        let liqRatio = (ca / cl) * 100;
        resLiq.innerText = liqRatio.toFixed(1) + " %";
        resLiq.style.color = liqRatio >= 150 ? "#10b981" : (liqRatio < 100 ? "#ef4444" : "#f59e0b");
    } else { resLiq.innerText = "- %"; resLiq.style.color = "#64748b"; }

    if (cap > 0) {
        if (eq < 0) { resImp.innerText = "완전 자본잠식"; resImp.style.color = "#ef4444"; } 
        else {
            let impRatio = ((cap - eq) / cap) * 100;
            resImp.innerText = impRatio <= 0 ? "정상" : "부분 잠식 (" + impRatio.toFixed(1) + "%)";
            resImp.style.color = impRatio <= 0 ? "#10b981" : "#f59e0b";
        }
    } else { resImp.innerText = "- %"; resImp.style.color = "#64748b"; }
}

function loadCompanyData() {
    alert('테스트용 데이터(주식회사 대박컴퍼니)를 불러옵니다.');
    if(document.getElementById('comp_name')) document.getElementById('comp_name').value = "주식회사 대박컴퍼니";
    if(document.querySelector('input[value="법인"]')) document.querySelector('input[value="법인"]').checked = true;
    if(document.getElementById('biz_number')) document.getElementById('biz_number').value = "732-86-03582";
    if(document.getElementById('comp_industry')) document.getElementById('comp_industry').value = "제조업"; 
    // 기타 데이터 채우기 로직...
}

function saveCompanyData() {
    const name = document.getElementById('comp_name') ? document.getElementById('comp_name').value : "";
    const rep = document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0] ? document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0].value : "";
    const bizNum = document.getElementById('biz_number') ? document.getElementById('biz_number').value : "";
    const industry = document.getElementById('comp_industry') ? document.getElementById('comp_industry').value : "";
    
    if (!name) { alert('상호명을 입력해주세요.'); return; }

    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newCompany = {
        name: name, rep: rep || '-', bizNum: bizNum || '-', industry: industry || '-',
        date: new Date().toISOString().split('T')[0]
    };

    const existingIdx = companies.findIndex(c => c.name === name);
    if (existingIdx > -1) companies[existingIdx] = newCompany;
    else companies.push(newCompany);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    alert('업체 정보가 안전하게 저장되었습니다!');
    
    updateCompanyLists();
    showTab('reportList');
}

function toggleCorpNumber() { /* 로직 */ }
function toggleRentInputs() { /* 로직 */ }
function toggleExportInputs() { /* 로직 */ }
function calculateTotalDebt() { /* 로직 */ }

function generateReport(type, version, event) {
    const select = document.getElementById('report-company-select');
    const companyName = select ? select.value : "";
    if (!companyName) { alert('분석할 업체를 먼저 선택해주세요.'); return; }

    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "AI 분석 중...";
    btn.disabled = true;

    setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
        
        document.getElementById('report-input-step').style.display = 'none';
        document.getElementById('report-result-step').style.display = 'block';
        renderReportContent(companyName, version);
    }, 1500);
}

function renderReportContent(name, version) {
    const area = document.getElementById('report-content-area');
    let titleAdd = version === 'client' ? "(업체전달용)" : "<span style='color:#ef4444;'>(컨설턴트 피드백용)</span>";
    
    if (name.includes('대박컴퍼니')) {
        area.innerHTML = `<div class="paper-inner"><h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">경영진단보고서 ${titleAdd}</h1><table class="simple-table"><tr><th>기업명</th><td>주식회사 대박컴퍼니</td><th>업종</th><td>제조업</td></tr></table><h3>1. 진단 요약</h3><p>창업 1년 만에 13억 원 이상의 매출을 달성한 고성장 초기 기업입니다.</p></div>`;
    } else {
         area.innerHTML = `<div class="paper-inner"><h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">경영진단보고서 ${titleAdd}</h1><p style="text-align:center; padding: 100px 0; color:#64748b;">데이터를 분석 중입니다.</p></div>`;
    }
}
function backToInput(tab) {
    document.getElementById(tab + '-input-step').style.display = 'block';
    document.getElementById(tab + '-result-step').style.display = 'none';
}
