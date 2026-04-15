// 데이터베이스 키
const DB_USERS = 'biz_users'; 
const DB_SESSION = 'biz_session'; 
const STORAGE_KEY = 'biz_consult_companies';

document.addEventListener("DOMContentLoaded", function() {
    checkAuth();
    const urlParams = new URLSearchParams(window.location.search);
    showTab(urlParams.get('tab') || 'dashboard', false);
});

/* =========================================
   1. 인증 및 프리패스 로직
========================================= */
function devBypassLogin() {
    const testUser = { email: 'test@biz.com', pw: '1234', name: '선지영', dept: '솔루션빌더스(테스트)', apiKey: '' };
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    if(!users.find(u => u.email === testUser.email)) { users.push(testUser); localStorage.setItem(DB_USERS, JSON.stringify(users)); }
    localStorage.setItem(DB_SESSION, JSON.stringify(testUser));
    checkAuth(); 
    alert('🛠️ 테스트 계정으로 강제 접속되었습니다!\n\n(※ AI 리포트 생성을 위해 설정 탭에서 API Key를 꼭 넣어주세요.)');
}

function checkAuth() {
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    const authOverlay = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');

    if (session) {
        if(authOverlay) authOverlay.style.display = 'none';
        if(mainApp) mainApp.style.display = 'flex';
        loadUserProfile(); updateCompanyLists(); initInputHandlers();
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
    users.push(newUser); localStorage.setItem(DB_USERS, JSON.stringify(users));
    alert('회원가입이 완료되었습니다! 로그인해주세요.'); toggleAuthMode('login');
}

function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pw = document.getElementById('login-pw').value;
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    const user = users.find(u => u.email === email && u.pw === pw);

    if (user) { localStorage.setItem(DB_SESSION, JSON.stringify(user)); checkAuth(); } 
    else { alert('이메일 또는 비밀번호가 일치하지 않습니다.'); }
}

function handleLogout() { localStorage.removeItem(DB_SESSION); location.reload(); }

/* =========================================
   2. 설정 관련 로직
========================================= */
function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem(DB_SESSION));
    if (!user) return;
    if(document.getElementById('display-user-name')) document.getElementById('display-user-name').innerText = user.name;
    if(document.getElementById('display-user-dept')) document.getElementById('display-user-dept').innerText = user.dept || '솔루션빌더스';
    if(document.getElementById('set-user-name')) {
        document.getElementById('set-user-name').value = user.name;
        document.getElementById('set-user-email').value = user.email;
        document.getElementById('set-user-dept').value = user.dept || '';
        document.getElementById('set-api-key').value = user.apiKey || '';
    }
}

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
    updateUserDB(session); alert('프로필 정보가 저장되었습니다.');
}
function saveApiSettings() {
    let session = JSON.parse(localStorage.getItem(DB_SESSION));
    session.apiKey = document.getElementById('set-api-key').value;
    updateUserDB(session); alert('API 키가 저장되었습니다.');
}
function savePasswordSettings() {
    const curPw = document.getElementById('set-cur-pw').value;
    const newPw = document.getElementById('set-new-pw').value;
    let session = JSON.parse(localStorage.getItem(DB_SESSION));
    if (!curPw || !newPw) { alert('비밀번호를 모두 입력해주세요.'); return; }
    if (session.pw !== curPw) { alert('현재 비밀번호가 틀립니다.'); return; }
    session.pw = newPw; updateUserDB(session);
    document.getElementById('set-cur-pw').value = ''; document.getElementById('set-new-pw').value = '';
    alert('비밀번호가 변경되었습니다.');
}

/* =========================================
   3. 탭 이동 및 데이터 불러오기
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

window.addEventListener('popstate', function() {
    const urlParams = new URLSearchParams(window.location.search);
    showTab(urlParams.get('tab') || 'dashboard', false);
});

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
        `).join('') : '<tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8;">등록된 업체가 없습니다.</td></tr>';
    }
}

/* =========================================
   4. 폼 로직 및 테스트 데이터
========================================= */
window.calculateTotalDebt = function() {
    let total = 0;
    document.querySelectorAll('.debt-input').forEach(input => {
        let cleanVal = input.value.replace(/[^0-9]/g, '');
        if (cleanVal) total += parseInt(cleanVal, 10);
    });
    const totalEl = document.getElementById('total-debt');
    if(totalEl) totalEl.innerText = total.toLocaleString('ko-KR');
};

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
        input.addEventListener('input', window.calculateTotalDebt);
    });
    // 하이픈 로직 생략 (기능에는 문제없음)
}

function loadCompanyData() {
    alert('테스트용 데이터(주식회사 대박컴퍼니)를 불러옵니다.');
    if(document.getElementById('comp_name')) document.getElementById('comp_name').value = "주식회사 대박컴퍼니";
    if(document.querySelector('input[value="법인"]')) document.querySelector('input[value="법인"]').checked = true;
    if(document.getElementById('biz_number')) document.getElementById('biz_number').value = "732-86-03582";
    if(document.getElementById('comp_industry')) document.getElementById('comp_industry').value = "제조업"; 
    if(document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0]) document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0].value = "오가은";
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
    updateCompanyLists(); showTab('reportList');
}

/* =========================================
   5. ★ AI API 연동 및 리포트 강력 통제 ★
========================================= */

async function callGeminiAPI(prompt) {
    const session = JSON.parse(localStorage.getItem('biz_session'));
    const apiKey = session ? session.apiKey : null;

    if (!apiKey) {
        alert("설정 탭에서 Gemini API 키를 먼저 등록해주세요.");
        showTab('settings');
        return null;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 4096 }
            })
        });

        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error ? data.error.message : '알 수 없는 API 에러');
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("API 오류:", error);
        alert("AI 분석 중 오류 발생: " + error.message);
        return null;
    }
}

async function generateReport(reportType, version, event) {
    const selectId = event.target.closest('.tab-content').querySelector('.company-dropdown').id;
    const companyName = document.getElementById(selectId).value;

    if (!companyName) { alert('분석할 업체를 먼저 선택해주세요.'); return; }

    const companies = JSON.parse(localStorage.getItem('biz_consult_companies') || '[]');
    const companyData = companies.find(c => c.name === companyName);

    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "Gemini AI가 심층 분석 중...";
    btn.disabled = true;

    // ★ 1. 시스템 프롬프트 강력 통제 (AI가 헛소리 못하게 방지) ★
    let systemInstruction = `
    너의 역할은 20년 경력의 날카롭고 통찰력 있는 '경영 컨설턴트'야. 
    네가 컨설팅을 해줄 고객사(대상 기업)의 이름은 '${companyData.name}'이야. (절대 너 자신을 기업명으로 부르지 마).

    아래 제공된 [기업 데이터]를 분석해서 다음 8개 목차에 따라 상세한 리포트 본문을 작성해줘.
    
    [작성 목차]
    1. 경영진단 개요
    2. 기업 현황 분석
    3. 재무 현황 분석
    4. 전략 및 마케팅 분석
    5. 인사/조직 및 운영/생산 분석
    6. IT/디지털 및 정부지원 활용
    7. 핵심 문제점 및 리스크
    8. 개선 방향 및 로드맵

    [형식 조건 - 매우 중요]
    - 반드시 각 목차의 제목은 <h3> 태그를 사용할 것 (예: <h3>1. 경영진단 개요</h3>)
    - 각 목차 아래에는 <p> 태그로 3~4문장 이상의 풍부하고 전문적인 분석 내용을 작성할 것. 내용이 빈약하면 안 됨.
    - 데이터가 부족한 부분은 해당 산업군(${companyData.industry})의 일반적인 트렌드를 가정하여 컨설팅적 시각에서 내용을 꽉 채울 것.
    - 문서 최하단(8번 목차 아래)에는 반드시 <div class="alert-box ${version === 'client' ? 'blue' : 'green'}"> 태그 안에 2~3줄의 핵심 요약(제언)을 넣을 것.
    - 기업 개요나 표(Table)는 이미 시스템이 그릴 것이므로, 너는 절대 표를 그리지 말고 <h3>1. 경영진단 개요</h3> 부터 내용만 텍스트로 출력해.
    - 마크다운 기호(\`\`\`html 등)는 절대 출력하지 마.
    `;

    const fullPrompt = `${systemInstruction}\n\n[기업 데이터]\n${JSON.stringify(companyData)}\n\n출력 목적: ${version === 'client' ? '업체 전달용(격려 및 긍정적 지표 위주로 작성)' : '컨설턴트 내부 피드백용(냉정하고 날카로운 리스크 지적 위주로 작성)'}`;

    const aiResponse = await callGeminiAPI(fullPrompt);

    if (aiResponse) {
        btn.innerText = originalText;
        btn.disabled = false;

        const tabContent = event.target.closest('.tab-content');
        tabContent.querySelector('[id$="-input-step"]').style.display = 'none';
        tabContent.querySelector('[id$="-result-step"]').style.display = 'block';

        const contentArea = tabContent.querySelector('[id$="-content-area"]');
        const cleanHTML = aiResponse.replace(/```html|```/g, ''); 
        const today = new Date().toISOString().split('T')[0];

        // ★ 2. 표(Table)를 AI에 맡기지 않고 자바스크립트가 무조건 예쁘게 강제로 삽입 ★
        let titleAdd = version === 'client' ? "<span style='color:#334155;'>(업체전달용)</span>" : "<span style='color:#ef4444;'>(컨설턴트 피드백용)</span>";
        
        contentArea.innerHTML = `
            <div class="paper-inner">
                <h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">경영진단보고서 ${titleAdd}</h1>
                
                <table class="simple-table">
                    <tr><th>기업명</th><td>${companyData.name}</td><th>사업자번호</th><td>${companyData.bizNum || '-'}</td></tr>
                    <tr><th>대표자</th><td>${companyData.rep || '-'}</td><th>작성일</th><td>${today}</td></tr>
                    <tr><th>업종</th><td>${companyData.industry || '-'}</td><th>데이터기준</th><td>최근 입력일 기준</td></tr>
                </table>

                ${cleanHTML}
            </div>
        `;
    } else {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function backToInput(tab) {
    document.getElementById(tab + '-input-step').style.display = 'block';
    document.getElementById(tab + '-result-step').style.display = 'none';
}
