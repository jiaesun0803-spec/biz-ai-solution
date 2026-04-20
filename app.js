// ===== BizConsult 시스템 설정 =====
const DB_USERS    = 'biz_users';
const DB_SESSION  = 'biz_session';
const STORAGE_KEY = 'biz_consult_companies';
const DB_REPORTS  = 'biz_reports';
let _currentReport = { company:'', type:'', contentAreaId:'', landscape:true };

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    initTestAccount();
    checkAuth();
    initFormatters();
});

function initTestAccount() {
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    if (!users.find(u => u.email === 'test@biz.com')) {
        users.push({ email: 'test@biz.com', pw: '1234', name: '테스트사용자', dept: '솔루션빌더스', apiKey: '' });
        localStorage.setItem(DB_USERS, JSON.stringify(users));
    }
}

// ===========================
// ★ 인증 및 보안
// ===========================
window.devBypassLogin = () => {
    const testUser = { email: 'test@biz.com', name: '테스트사용자', dept: '솔루션빌더스', apiKey: '' };
    localStorage.setItem(DB_SESSION, JSON.stringify(testUser));
    location.reload();
};

function checkAuth() {
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    if (session) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        loadUserProfile();
        showTab('dashboard');
    } else {
        document.getElementById('auth-container').style.display = 'flex';
    }
}

window.handleLogin = () => {
    const email = document.getElementById('login-email').value;
    const pw = document.getElementById('login-pw').value;
    const users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    const user = users.find(u => u.email === email && u.pw === pw);
    if (user) {
        localStorage.setItem(DB_SESSION, JSON.stringify(user));
        location.reload();
    } else { alert('로그인 정보를 확인해 주세요.'); }
};

window.handleLogout = () => { localStorage.removeItem(DB_SESSION); location.reload(); };

// ===========================
// ★ 설정 (프로필 및 API 키 잠금)
// ===========================
function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem(DB_SESSION));
    if (!user) return;
    document.getElementById('display-user-name').innerText = user.name;
    document.getElementById('display-user-dept').innerText = user.dept || '경영컨설턴트';
    document.getElementById('set-user-name').value = user.name;
    document.getElementById('set-user-email').value = user.email;
    document.getElementById('set-user-dept').value = user.dept || '';
    if (user.apiKey) {
        document.getElementById('set-api-key').value = user.apiKey;
        lockApiKeyUI(true);
    }
}

window.saveApiSettings = () => {
    const key = document.getElementById('set-api-key').value.trim();
    if (!key) { alert('API 키를 입력하세요.'); return; }
    let session = JSON.parse(localStorage.getItem(DB_SESSION));
    session.apiKey = key;
    updateUserDB(session);
    lockApiKeyUI(true);
    alert('API 키가 안전하게 저장되었습니다.');
};

function lockApiKeyUI(isLocked) {
    document.getElementById('set-api-key').disabled = isLocked;
    document.getElementById('btn-api-save').style.display = isLocked ? 'none' : 'inline-block';
    document.getElementById('btn-api-edit').style.display = isLocked ? 'inline-block' : 'none';
}

window.unlockApiKey = () => lockApiKeyUI(false);

function updateUserDB(updatedUser) {
    localStorage.setItem(DB_SESSION, JSON.stringify(updatedUser));
    let users = JSON.parse(localStorage.getItem(DB_USERS));
    const idx = users.findIndex(u => u.email === updatedUser.email);
    if (idx > -1) { users[idx] = updatedUser; localStorage.setItem(DB_USERS, JSON.stringify(users)); }
}

// ===========================
// ★ 기업 관리 로직 (업체->기업 수정)
// ===========================
window.saveCompanyData = function() {
    const name = document.getElementById('comp_name').value;
    if (!name) { alert('기업명을 입력하세요.'); return; }
    const data = {
        name, 
        industry: document.getElementById('comp_industry').value,
        empCount: document.getElementById('emp_count').value,
        bizDate: document.getElementById('biz_date').value,
        revenueData: { cur: document.getElementById('rev_cur').value, y25: document.getElementById('rev_25').value }
    };
    let list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const idx = list.findIndex(c => c.name === name);
    if (idx > -1) list[idx] = data; else list.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    alert('기업 정보가 저장되었습니다.');
    showCompanyList();
};

window.renderCompanyCards = () => {
    const container = document.getElementById('company-cards-container');
    if (!container) return;
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    container.innerHTML = list.map(c => `
        <div class="company-card">
            <strong>${c.name}</strong>
            <p>분야: ${c.industry}</p>
            <p>상시근로자: ${c.empCount}명</p>
            <button class="btn-small-outline" style="margin-top:10px;" onclick="showCompanyForm('${c.name}')">수정</button>
        </div>
    `).join('');
};

// ===========================
// ★ 보고서 생성 (애니메이션 및 가로/세로 제어)
// ===========================
window.generateReport = async function(type, version, event) {
    const cN = event.target.closest('.tab-content').querySelector('.company-dropdown').value;
    if (!cN) { alert('분석할 기업을 선택해 주세요.'); return; }
    
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    if (!session.apiKey) { alert('설정에서 API 키를 먼저 저장해 주세요.'); showTab('settings'); return; }

    const overlay = document.getElementById('ai-loading-overlay');
    overlay.style.display = 'flex';
    await new Promise(r => setTimeout(r, 600)); // 애니메이션 체감 시간

    try {
        const text = await callGemini(`기업 '${cN}'의 경영진단보고서를 전문적으로 작성해줘.`);
        const title = `경영진단보고서 (${version === 'client' ? '기업전달용' : '컨설턴트용'})`;
        
        document.getElementById('report-input-step').style.display = 'none';
        document.getElementById('report-result-step').style.display = 'block';
        
        // 경영진단은 세로형(Landscape: false)
        const html = `<div class="rp-wrap" style="padding:40px;"><div class="report-paper"><h1>${title}</h1><hr><p style="font-size:18px; color:#666;">대상: ${cN}</p><div style="margin-top:30px; line-height:1.8;">${text.replace(/\n/g, '<br>')}</div></div></div>`;
        document.getElementById('report-content-area').innerHTML = html;
        
        _currentReport = { company: cN, type: title, contentAreaId: 'report-content-area', landscape: false };
    } catch (e) { alert('AI 통신 오류가 발생했습니다.'); } 
    finally { overlay.style.display = 'none'; }
};

window.generateAnyReport = async function(type, version, event) {
    const tab = event.target.closest('.tab-content');
    const cN = tab.querySelector('.company-dropdown').value;
    if (!cN) { alert('기업을 선택하세요.'); return; }
    
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    if (!session.apiKey) { alert('설정에서 API 키를 저장해 주세요.'); return; }

    const overlay = document.getElementById('ai-loading-overlay');
    overlay.style.display = 'flex';
    await new Promise(r => setTimeout(r, 600));

    try {
        const isL = (type === 'aiBiz'); // 사업계획서만 가로형(Landscape)
        const config = { finance: '상세 재무진단', aiBiz: '사업계획서', aiFund: '정책자금매칭' };
        const title = config[type] || '리포트';
        const text = await callGemini(`${title} 내용을 작성해줘. 기업명: ${cN}`);

        tab.querySelector('[id$="-input-step"]').style.display = 'none';
        tab.querySelector('[id$="-result-step"]').style.display = 'block';
        
        const areaId = type + '-content-area';
        const paperClass = isL ? 'report-paper-landscape' : 'report-paper';
        document.getElementById(areaId).innerHTML = `<div class="rp-wrap"><div class="${paperClass}"><h1>${title}</h1><p>대상 기업: ${cN}</p><div style="margin-top:20px;">${text.replace(/\n/g, '<br>')}</div></div></div>`;
        
        _currentReport = { company: cN, type: title, contentAreaId: areaId, landscape: isL };
    } catch (e) { alert('생성 오류'); }
    finally { overlay.style.display = 'none'; }
};

async function callGemini(prompt) {
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${session.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const json = await res.json();
    return json.candidates[0].content.parts[0].text;
}

// ===========================
// ★ 기타 UI 기능
// ===========================
window.showTab = function(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const m = document.getElementById('menu-' + id); if (m) m.classList.add('active');
    if (id === 'company') renderCompanyCards();
    updateDataLists();
};

window.updateDataLists = () => {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    document.querySelectorAll('.company-dropdown').forEach(sel => {
        sel.innerHTML = '<option value="">기업 선택</option>' + list.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    });
    document.getElementById('stat-companies').innerText = list.length;
};

window.printReport = () => window.print();
window.backToInput = (id) => { document.getElementById(id + '-input-step').style.display = 'block'; document.getElementById(id + '-result-step').style.display = 'none'; };
window.toggleAuthMode = (m) => { document.getElementById('login-form-area').style.display = (m==='login'?'block':'none'); document.getElementById('signup-form-area').style.display = (m==='signup'?'block':'none'); };

function initFormatters() {
    document.querySelectorAll('.money-format').forEach(i => i.addEventListener('input', e => {
        let v = e.target.value.replace(/[^0-9]/g,''); e.target.value = v.replace(/\B(?=(\d{3})+(?!\d))/g,',');
    }));
}

console.log("수정완료 및 모든 기능 복구됨");
