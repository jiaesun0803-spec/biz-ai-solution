const DB_USERS = 'biz_users'; 
const DB_SESSION = 'biz_session'; 
const STORAGE_KEY = 'biz_consult_companies';

document.addEventListener("DOMContentLoaded", function() {
    checkAuth();
    const urlParams = new URLSearchParams(window.location.search);
    showTab(urlParams.get('tab') || 'dashboard', false);
    
    window.toggleCorpNumber();
    window.toggleRentInputs();
    window.toggleExportInputs();
});

/* =========================================
   1. 인증 및 설정 로직
========================================= */
window.devBypassLogin = function() {
    const testUser = { email: 'test@biz.com', pw: '1234', name: '선지영', dept: '솔루션빌더스(테스트)', apiKey: '' };
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    if(!users.find(u => u.email === testUser.email)) { users.push(testUser); localStorage.setItem(DB_USERS, JSON.stringify(users)); }
    localStorage.setItem(DB_SESSION, JSON.stringify(testUser));
    checkAuth(); 
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

window.toggleAuthMode = function(mode) {
    document.getElementById('login-form-area').style.display = mode === 'login' ? 'block' : 'none';
    document.getElementById('signup-form-area').style.display = mode === 'signup' ? 'block' : 'none';
}

window.handleSignup = function() {
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

window.handleLogin = function() {
    const email = document.getElementById('login-email').value;
    const pw = document.getElementById('login-pw').value;
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    const user = users.find(u => u.email === email && u.pw === pw);
    if (user) { localStorage.setItem(DB_SESSION, JSON.stringify(user)); checkAuth(); } 
    else { alert('이메일 또는 비밀번호가 일치하지 않습니다.'); }
}

window.handleLogout = function() { localStorage.removeItem(DB_SESSION); location.reload(); }

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

window.saveProfileSettings = function() { let session = JSON.parse(localStorage.getItem(DB_SESSION)); session.name = document.getElementById('set-user-name').value; session.dept = document.getElementById('set-user-dept').value; updateUserDB(session); alert('프로필 정보가 저장되었습니다.'); }
window.saveApiSettings = function() { let session = JSON.parse(localStorage.getItem(DB_SESSION)); session.apiKey = document.getElementById('set-api-key').value; updateUserDB(session); alert('API 키가 저장되었습니다.'); }
window.savePasswordSettings = function() { const curPw = document.getElementById('set-cur-pw').value; const newPw = document.getElementById('set-new-pw').value; let session = JSON.parse(localStorage.getItem(DB_SESSION)); if (!curPw || !newPw) { alert('비밀번호를 모두 입력해주세요.'); return; } if (session.pw !== curPw) { alert('현재 비밀번호가 틀립니다.'); return; } session.pw = newPw; updateUserDB(session); document.getElementById('set-cur-pw').value = ''; document.getElementById('set-new-pw').value = ''; alert('비밀번호가 변경되었습니다.'); }

/* =========================================
   2. 화면 탭 및 업체 목록 연동
========================================= */
window.showTab = function(tabId, updateUrl = true) {
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
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.rep || '-'}</td>
                <td>${c.bizNum || '-'}</td>
                <td>${c.date}</td>
                <td><button class="btn-small-outline" onclick="editCompany('${c.name}')">수정/보기</button></td>
            </tr>
        `).join('') : '<tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8;">등록된 업체가 없습니다.</td></tr>';
    }
}

/* =========================================
   3. 완벽한 업체 저장 및 불러오기 로직
========================================= */
window.clearCompanyForm = function() {
    if(confirm('작성 중인 내용을 모두 초기화하시겠습니까?')) {
        document.getElementById('companyForm').reset();
        window.calculateTotalDebt(); window.toggleCorpNumber(); window.toggleRentInputs(); window.toggleExportInputs();
    }
}

window.loadCompanyData = function() {
    alert('테스트용 샘플 데이터(주식회사 대박컴퍼니)를 불러옵니다.');
    if(document.getElementById('comp_name')) document.getElementById('comp_name').value = "주식회사 대박컴퍼니";
    if(document.querySelector('input[value="법인"]')) document.querySelector('input[value="법인"]').checked = true;
    if(document.getElementById('biz_number')) document.getElementById('biz_number').value = "732-86-03582";
    if(document.getElementById('comp_industry')) document.getElementById('comp_industry').value = "제조업"; 
    
    const debtInputs = document.querySelectorAll('.debt-input');
    if(debtInputs.length > 4) { debtInputs[0].value = "20,000"; debtInputs[3].value = "10,000"; debtInputs[4].value = "7,000"; }
    window.calculateTotalDebt(); window.toggleCorpNumber(); window.toggleExportInputs();
}

window.saveCompanyData = function() {
    const name = document.getElementById('comp_name') ? document.getElementById('comp_name').value : "";
    if (!name) { alert('상호명을 반드시 입력해주세요.'); return; }

    const rep = document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0] ? document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0].value : "";
    const bizNum = document.getElementById('biz_number') ? document.getElementById('biz_number').value : "";
    const industry = document.getElementById('comp_industry') ? document.getElementById('comp_industry').value : "";
    
    const formElements = document.querySelectorAll('#companyForm input, #companyForm select, #companyForm textarea');
    const rawData = Array.from(formElements).map(el => ({ type: el.type, value: el.value, checked: el.checked }));

    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newCompany = { name: name, rep: rep || '-', bizNum: bizNum || '-', industry: industry || '-', date: new Date().toISOString().split('T')[0], rawData: rawData };

    const existingIdx = companies.findIndex(c => c.name === name);
    if (existingIdx > -1) companies[existingIdx] = newCompany;
    else companies.push(newCompany);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    alert('업체의 모든 세부 정보가 성공적으로 저장되었습니다!');
    updateCompanyLists(); showTab('reportList');
}

window.editCompany = function(name) {
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const comp = companies.find(c => c.name === name);
    if(comp && comp.rawData) {
        const formElements = document.querySelectorAll('#companyForm input, #companyForm select, #companyForm textarea');
        comp.rawData.forEach((data, idx) => {
            if(formElements[idx]) {
                if (formElements[idx].type === 'checkbox' || formElements[idx].type === 'radio') { formElements[idx].checked = data.checked; } 
                else { formElements[idx].value = data.value; }
            }
        });
        window.calculateTotalDebt(); window.toggleCorpNumber(); window.toggleRentInputs(); window.toggleExportInputs();
        showTab('company'); alert(`[${name}]의 상세 정보를 불러왔습니다. 내용을 수정하실 수 있습니다.`);
    } else { alert('저장된 상세 데이터가 없습니다.'); }
};

/* =========================================
   4. 입력칸 잠금(Toggle) 및 자동계산 로직
========================================= */
window.toggleExportInputs = function() {
    const radios = document.getElementsByName('export');
    const exportInputs = document.querySelectorAll('.export-money');
    let isExporting = false;
    for(let r of radios) { if(r.checked && r.value === '수출중') { isExporting = true; break; } }
    exportInputs.forEach(input => { input.disabled = !isExporting; if(!isExporting) input.value = ''; });
};

window.toggleCorpNumber = function() {
    const radios = document.getElementsByName('biz_type');
    const corpInput = document.getElementById('corp_number');
    let isCorp = false;
    for(let r of radios) { if(r.checked && r.value === '법인') { isCorp = true; break; } }
    if(corpInput) { corpInput.disabled = !isCorp; if(!isCorp) corpInput.value = ''; }
};

window.toggleRentInputs = function() {
    const radios = document.getElementsByName('rent_type');
    const depositInput = document.getElementById('rent_deposit');
    const monthlyInput = document.getElementById('rent_monthly');
    let isRent = false;
    for(let r of radios) { if(r.checked && r.value === '임대') { isRent = true; break; } }
    if(depositInput) { depositInput.disabled = !isRent; if(!isRent) depositInput.value = ''; }
    if(monthlyInput) { monthlyInput.disabled = !isRent; if(!isRent) monthlyInput.value = ''; }
};

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
    document.querySelectorAll('.number-only').forEach(input => { input.addEventListener('input', function() { this.value = this.value.replace(/[^0-9]/g, ''); }); });
    document.querySelectorAll('.money-format').forEach(input => { input.addEventListener('input', function() { let val = this.value.replace(/[^0-9\-]/g, ''); this.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ","); }); });
    document.querySelectorAll('.debt-input').forEach(input => { input.addEventListener('input', window.calculateTotalDebt); });
}

/* =========================================
   5. ★ AI API 연동, 문체 제어 및 그래프 생성 ★
========================================= */

async function callGeminiAPI(prompt) {
    const session = JSON.parse(localStorage.getItem('biz_session'));
    const apiKey = session ? session.apiKey : null;
    if (!apiKey) { alert("설정 탭에서 Gemini API 키를 먼저 등록해주세요."); showTab('settings'); return null; }

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

window.generateReport = async function(reportType, version, event) {
    const selectId = event.target.closest('.tab-content').querySelector('.company-dropdown').id;
    const companyName = document.getElementById(selectId).value;

    if (!companyName) { alert('분석할 업체를 먼저 선택해주세요.'); return; }

    const companies = JSON.parse(localStorage.getItem('biz_consult_companies') || '[]');
    const companyData = companies.find(c => c.name === companyName);

    const loadingOverlay = document.getElementById('ai-loading-overlay');
    loadingOverlay.style.display = 'flex';

    // ★ 프롬프트: 서술형(줄글) 금지, 불릿(ul, li) 사용, 개조식 종결어미 강제 ★
    let reportTitle = "경영진단보고서";
    let systemInstruction = `
    너의 역할은 20년 경력의 날카롭고 통찰력 있는 '경영 컨설턴트'야. 
    네가 컨설팅을 해줄 대상 기업명은 '${companyData.name}'이야. 

    제공된 [기업 데이터]를 바탕으로 1부터 8까지의 목차에 따라 아주 전문적이고 풍성한 리포트 본문을 작성해.
    
    [작성 목차]
    1. 경영진단 개요
    2. 기업 현황 분석
    3. 재무 현황 분석
    4. 전략 및 마케팅 분석
    5. 인사/조직 및 운영/생산 분석
    6. IT/디지털 및 정부지원 활용
    7. 핵심 문제점 및 리스크
    8. 개선 방향 및 로드맵

    [★형식 조건 - 매우 중요★]
    - 각 목차의 제목은 <h3> 태그를 사용할 것.
    - 절대 서술형 줄글(<p>)로 길게 쓰지 마. 반드시 <ul>과 <li> 태그를 사용하여 글머리 기호(불릿) 형태로 요점을 정리할 것.
    - 모든 문장의 끝맺음은 '~함', '~임', '~있음', '~됨' 등 간결한 개조식(음/슴체)으로 마무리할 것 (예: "매출이 상승함.", "리스크가 존재함.").
    - 각 목차별로 최소 3개 이상의 <li> 항목을 작성하여 내용이 풍성해 보이게 할 것.
    - 문서 최하단에는 반드시 <div class="alert-box ${version === 'client' ? 'blue' : 'green'}"> 태그 안에 2~3줄의 핵심 요약(제언)을 넣을 것.
    - 표(Table)는 시스템이 그릴 것이므로, 너는 표를 그리지 마.
    - 마크다운 기호(\`\`\`html 등)는 절대 출력하지 마.
    `;

    const promptData = { ...companyData };
    delete promptData.rawData; 

    const fullPrompt = `${systemInstruction}\n\n[기업 데이터]\n${JSON.stringify(promptData)}\n\n출력 목적: ${version === 'client' ? '업체 전달용(격려 및 긍정적 지표 위주로 작성)' : '컨설턴트 내부 피드백용(냉정하고 날카로운 리스크 지적 위주로 작성)'}`;

    const aiResponse = await callGeminiAPI(fullPrompt);

    loadingOverlay.style.display = 'none';

    if (aiResponse) {
        const tabContent = event.target.closest('.tab-content');
        tabContent.querySelector('[id$="-input-step"]').style.display = 'none';
        tabContent.querySelector('[id$="-result-step"]').style.display = 'block';

        const contentArea = tabContent.querySelector('[id$="-content-area"]');
        const cleanHTML = aiResponse.replace(/```html|```/g, ''); 
        const today = new Date().toISOString().split('T')[0];

        let titleAdd = version === 'client' ? "<span style='color:#334155;'>(업체전달용)</span>" : "<span style='color:#ef4444;'>(컨설턴트 피드백용)</span>";
        
        // ★ HTML에 차트(Canvas) 영역 추가 ★
        contentArea.innerHTML = `
            <div class="paper-inner">
                <h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">경영진단보고서 ${titleAdd}</h1>
                
                <table class="simple-table">
                    <tr><th>기업명</th><td>${companyData.name}</td><th>사업자번호</th><td>${companyData.bizNum || '-'}</td></tr>
                    <tr><th>대표자</th><td>${companyData.rep || '-'}</td><th>작성일</th><td>${today}</td></tr>
                    <tr><th>업종</th><td>${companyData.industry || '-'}</td><th>데이터기준</th><td>최근 입력일 기준</td></tr>
                </table>

                <div class="chart-container">
                    <div class="chart-box"><canvas id="report-radar-chart"></canvas></div>
                    <div class="chart-box"><canvas id="report-bar-chart"></canvas></div>
                </div>

                ${cleanHTML}
            </div>
        `;

        // ★ Chart.js를 이용해 그래프 그리기 ★
        setTimeout(() => {
            // 1. 역량 진단 레이더 차트
            const radarCtx = document.getElementById('report-radar-chart').getContext('2d');
            new Chart(radarCtx, {
                type: 'radar',
                data: {
                    labels: ['재무건전성', '성장성', '기술력', '운영효율', '시장성'],
                    datasets: [{
                        label: '기업 역량 진단 스코어',
                        data: [75, 90, 85, 65, 80], // 임의의 예시 데이터
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderColor: '#3b82f6',
                        pointBackgroundColor: '#1e3a8a'
                    }]
                },
                options: { scales: { r: { min: 0, max: 100 } }, maintainAspectRatio: false }
            });

            // 2. 매출 추이 막대 그래프
            const barCtx = document.getElementById('report-bar-chart').getContext('2d');
            new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: ['23년도', '24년도', '25년도', '금년(예상)'],
                    datasets: [{
                        label: '매출 추이 (만원)',
                        data: [10000, 35000, 78000, 120000], // 임의의 예시 데이터
                        backgroundColor: 'rgba(22, 163, 74, 0.7)',
                        borderRadius: 4
                    }]
                },
                options: { maintainAspectRatio: false }
            });
        }, 100);
    }
}

window.backToInput = function(tab) {
    document.getElementById(tab + '-input-step').style.display = 'block';
    document.getElementById(tab + '-result-step').style.display = 'none';
}
