const DB_USERS = 'biz_users'; 
const DB_SESSION = 'biz_session'; 
const STORAGE_KEY = 'biz_consult_companies';

document.addEventListener("DOMContentLoaded", function() {
    checkAuth();
    const urlParams = new URLSearchParams(window.location.search);
    showTab(urlParams.get('tab') || 'dashboard', false);
    window.toggleCorpNumber(); window.toggleRentInputs(); window.toggleExportInputs();
});

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
    if (session) { if(authOverlay) authOverlay.style.display = 'none'; if(mainApp) mainApp.style.display = 'flex'; loadUserProfile(); updateCompanyLists(); initInputHandlers(); } 
    else { if(authOverlay) authOverlay.style.display = 'flex'; if(mainApp) mainApp.style.display = 'none'; }
}

window.toggleAuthMode = function(mode) { document.getElementById('login-form-area').style.display = mode === 'login' ? 'block' : 'none'; document.getElementById('signup-form-area').style.display = mode === 'signup' ? 'block' : 'none'; }
window.handleSignup = function() { const email = document.getElementById('signup-email').value; const pw = document.getElementById('signup-pw').value; const name = document.getElementById('signup-name').value; if (!email || !pw || !name) { alert('모든 정보를 입력해주세요.'); return; } let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]'); if (users.find(u => u.email === email)) { alert('이미 가입된 이메일입니다.'); return; } const newUser = { email, pw, name, dept: '솔루션빌더스', apiKey: '' }; users.push(newUser); localStorage.setItem(DB_USERS, JSON.stringify(users)); alert('회원가입이 완료되었습니다! 로그인해주세요.'); toggleAuthMode('login'); }
window.handleLogin = function() { const email = document.getElementById('login-email').value; const pw = document.getElementById('login-pw').value; let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]'); const user = users.find(u => u.email === email && u.pw === pw); if (user) { localStorage.setItem(DB_SESSION, JSON.stringify(user)); checkAuth(); } else { alert('이메일 또는 비밀번호가 일치하지 않습니다.'); } }
window.handleLogout = function() { localStorage.removeItem(DB_SESSION); location.reload(); }

function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem(DB_SESSION)); if (!user) return;
    if(document.getElementById('display-user-name')) document.getElementById('display-user-name').innerText = user.name;
    if(document.getElementById('display-user-dept')) document.getElementById('display-user-dept').innerText = user.dept || '솔루션빌더스';
    if(document.getElementById('set-user-name')) { document.getElementById('set-user-name').value = user.name; document.getElementById('set-user-email').value = user.email; document.getElementById('set-user-dept').value = user.dept || ''; document.getElementById('set-api-key').value = user.apiKey || ''; }
}
function updateUserDB(updatedUser) { let users = JSON.parse(localStorage.getItem(DB_USERS)); const userIdx = users.findIndex(u => u.email === updatedUser.email); users[userIdx] = updatedUser; localStorage.setItem(DB_USERS, JSON.stringify(users)); localStorage.setItem(DB_SESSION, JSON.stringify(updatedUser)); loadUserProfile(); }
window.saveProfileSettings = function() { let session = JSON.parse(localStorage.getItem(DB_SESSION)); session.name = document.getElementById('set-user-name').value; session.dept = document.getElementById('set-user-dept').value; updateUserDB(session); alert('프로필 정보가 저장되었습니다.'); }
window.saveApiSettings = function() { let session = JSON.parse(localStorage.getItem(DB_SESSION)); session.apiKey = document.getElementById('set-api-key').value; updateUserDB(session); alert('API 키가 저장되었습니다.'); }
window.savePasswordSettings = function() { const curPw = document.getElementById('set-cur-pw').value; const newPw = document.getElementById('set-new-pw').value; let session = JSON.parse(localStorage.getItem(DB_SESSION)); if (!curPw || !newPw) { alert('비밀번호를 모두 입력해주세요.'); return; } if (session.pw !== curPw) { alert('현재 비밀번호가 틀립니다.'); return; } session.pw = newPw; updateUserDB(session); document.getElementById('set-cur-pw').value = ''; document.getElementById('set-new-pw').value = ''; alert('비밀번호가 변경되었습니다.'); }

window.showTab = function(tabId, updateUrl = true) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.menu li, .bottom-menu li').forEach(item => item.classList.remove('active'));
    const target = document.getElementById(tabId); if(target) target.classList.add('active');
    const menu = document.getElementById('menu-' + tabId); if(menu) menu.classList.add('active');
    if(tabId === 'settings') loadUserProfile(); if(tabId === 'reportList') updateCompanyLists();
    if (updateUrl) history.pushState(null, '', `?tab=${tabId}`);
}
window.addEventListener('popstate', function() { const urlParams = new URLSearchParams(window.location.search); showTab(urlParams.get('tab') || 'dashboard', false); });

function updateCompanyLists() {
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const dropdowns = document.querySelectorAll('.company-dropdown');
    dropdowns.forEach(select => {
        select.innerHTML = '<option value="">업체를 선택하세요</option>';
        companies.forEach(c => select.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    });
    const body = document.getElementById('company-list-body');
    if(body) { body.innerHTML = companies.length ? companies.map(c => `<tr><td><strong>${c.name}</strong></td><td>${c.rep || '-'}</td><td>${c.bizNum || '-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="editCompany('${c.name}')">수정/보기</button></td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8;">등록된 업체가 없습니다.</td></tr>'; }
}

/* =========================================
   3. 업체 저장 및 불러오기 (ID 기반 완벽 매칭)
========================================= */
window.clearCompanyForm = function() { if(confirm('작성 중인 내용을 모두 초기화하시겠습니까?')) { document.getElementById('companyForm').reset(); window.calculateTotalDebt(); window.toggleCorpNumber(); window.toggleRentInputs(); window.toggleExportInputs(); } }

window.loadCompanyData = function() {
    alert('테스트용 샘플 데이터(주식회사 대박컴퍼니)를 불러옵니다.');
    if(document.getElementById('comp_name')) document.getElementById('comp_name').value = "주식회사 대박컴퍼니";
    if(document.querySelector('input[value="법인"]')) document.querySelector('input[value="법인"]').checked = true;
    if(document.getElementById('biz_number')) document.getElementById('biz_number').value = "732-86-03582";
    if(document.getElementById('comp_industry')) document.getElementById('comp_industry').value = "제조업"; 
    
    // ★ 지정된 ID에 직접 값 꽂아넣기 ★
    if(document.getElementById('rev_cur')) document.getElementById('rev_cur').value = "11,000";
    if(document.getElementById('rev_25')) document.getElementById('rev_25').value = "138,000";
    if(document.getElementById('rev_24')) document.getElementById('rev_24').value = "114,000";
    if(document.getElementById('rev_23')) document.getElementById('rev_23').value = "50,000";
    if(document.getElementById('emp_count')) document.getElementById('emp_count').value = "15";
    if(document.getElementById('core_item')) document.getElementById('core_item').value = "HMR 가정간편식 제조 및 판매";

    const debtInputs = document.querySelectorAll('.debt-input');
    if(debtInputs.length > 4) { debtInputs[0].value = "20,000"; debtInputs[3].value = "10,000"; debtInputs[4].value = "7,000"; }
    window.calculateTotalDebt(); window.toggleCorpNumber(); window.toggleExportInputs();
}

window.saveCompanyData = function() {
    const name = document.getElementById('comp_name') ? document.getElementById('comp_name').value : "";
    if (!name) { alert('상호명을 반드시 입력해주세요.'); return; }
    
    // ★ 명시적 ID를 통해 값 추출 (오류 원천 차단) ★
    let realRevenue = {
        cur: parseInt((document.getElementById('rev_cur') || {}).value?.replace(/,/g, '')) || 0,
        y25: parseInt((document.getElementById('rev_25') || {}).value?.replace(/,/g, '')) || 0,
        y24: parseInt((document.getElementById('rev_24') || {}).value?.replace(/,/g, '')) || 0,
        y23: parseInt((document.getElementById('rev_23') || {}).value?.replace(/,/g, '')) || 0
    };
    
    const newCompany = { 
        name: name, 
        rep: document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0]?.value || '-', 
        bizNum: document.getElementById('biz_number')?.value || '-', 
        industry: document.getElementById('comp_industry')?.value || '-', 
        bizDate: document.getElementById('biz_date')?.value || '-',  // ★ 추가
        empCount: document.getElementById('emp_count')?.value || '-', // ★ 추가
        coreItem: document.getElementById('core_item')?.value || '-', // ★ 추가
        date: new Date().toISOString().split('T')[0], 
        revenueData: realRevenue,
        rawData: Array.from(document.querySelectorAll('#companyForm input, #companyForm select, #companyForm textarea')).map(el => ({ type: el.type, value: el.value, checked: el.checked }))
    };

    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const existingIdx = companies.findIndex(c => c.name === name);
    if (existingIdx > -1) companies[existingIdx] = newCompany; else companies.push(newCompany);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies)); alert('업체의 모든 세부 정보가 성공적으로 저장되었습니다!'); updateCompanyLists(); showTab('reportList');
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
        showTab('company'); alert(`[${name}]의 상세 정보를 불러왔습니다.`);
    } else { alert('저장된 상세 데이터가 없습니다.'); }
};

window.toggleExportInputs = function() { const radios = document.getElementsByName('export'); const exportInputs = document.querySelectorAll('.export-money'); let isExp = false; for(let r of radios) { if(r.checked && r.value === '수출중') { isExp = true; break; } } exportInputs.forEach(i => { i.disabled = !isExp; if(!isExp) i.value = ''; }); };
window.toggleCorpNumber = function() { const radios = document.getElementsByName('biz_type'); const cInput = document.getElementById('corp_number'); let isC = false; for(let r of radios) { if(r.checked && r.value === '법인') { isC = true; break; } } if(cInput) { cInput.disabled = !isC; if(!isC) cInput.value = ''; } };
window.toggleRentInputs = function() { const radios = document.getElementsByName('rent_type'); const dInput = document.getElementById('rent_deposit'); const mInput = document.getElementById('rent_monthly'); let isR = false; for(let r of radios) { if(r.checked && r.value === '임대') { isR = true; break; } } if(dInput) { dInput.disabled = !isR; if(!isR) dInput.value = ''; } if(mInput) { mInput.disabled = !isR; if(!isR) mInput.value = ''; } };
window.calculateTotalDebt = function() { let tot = 0; document.querySelectorAll('.debt-input').forEach(i => { let v = i.value.replace(/[^0-9]/g, ''); if (v) tot += parseInt(v, 10); }); const tEl = document.getElementById('total-debt'); if(tEl) tEl.innerText = tot.toLocaleString('ko-KR'); };
function initInputHandlers() { document.querySelectorAll('.number-only').forEach(i => { i.addEventListener('input', function() { this.value = this.value.replace(/[^0-9]/g, ''); }); }); document.querySelectorAll('.money-format').forEach(i => { i.addEventListener('input', function() { let v = this.value.replace(/[^0-9\-]/g, ''); this.value = v.replace(/\B(?=(\d{3})+(?!\d))/g, ","); }); }); document.querySelectorAll('.debt-input').forEach(i => { i.addEventListener('input', window.calculateTotalDebt); }); }


/* =========================================
   5. ★ AI API 연동 및 소박스 랩핑 통제 ★
========================================= */

async function callGeminiAPI(prompt) {
    const session = JSON.parse(localStorage.getItem('biz_session'));
    const apiKey = session ? session.apiKey : null;
    if (!apiKey) { alert("설정 탭에서 Gemini API 키를 등록해주세요."); showTab('settings'); return null; }
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 4096 } }) });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error ? data.error.message : 'API 에러');
        return data.candidates[0].content.parts[0].text;
    } catch (error) { console.error("API 오류:", error); alert("오류 발생: " + error.message); return null; }
}

window.generateReport = async function(reportType, version, event) {
    const selectId = event.target.closest('.tab-content').querySelector('.company-dropdown').id;
    const companyName = document.getElementById(selectId).value;
    if (!companyName) { alert('업체를 선택해주세요.'); return; }

    const companies = JSON.parse(localStorage.getItem('biz_consult_companies') || '[]');
    const companyData = companies.find(c => c.name === companyName);
    const rev = companyData.revenueData || { y23: 0, y24: 0, y25: 0, cur: 0 };

    document.getElementById('ai-loading-overlay').style.display = 'flex';

    // ★ 프롬프트 통제: 기업현황분석 삭제 & 파스텔 소박스 태그 강제 삽입 ★
    let systemInstruction = `
    너의 역할은 20년 경력의 '경영 컨설턴트'야. 대상 기업명은 '${companyData.name}'이야. 

    제공된 [기업 데이터]를 바탕으로 다음 7개 목차를 반드시 작성해. (기업의 기초 정보는 이미 최상단 표에 있으니 중복으로 언급하지 마.)
    1. 경영진단 개요
    2. 재무 현황 분석
    3. 전략 및 마케팅 분석
    4. 인사/조직 및 운영/생산 분석
    5. IT/디지털 및 정부지원 활용
    6. 핵심 문제점 및 리스크
    7. 개선 방향 및 로드맵

    [★작성 규칙 - 절대 준수★]
    - 제공된 수치(매출, 부채 등)를 절대 임의로 변경하지 마.
    - 각 목차 전체(제목 <h3>부터 내용 <ul>까지)를 반드시 <div class="report-section-box"> 태그로 감싸서 출력할 것.
      예시: <div class="report-section-box"><h3>1. 경영진단 개요</h3><ul><li>내용...</li></ul></div>
    - 각 목차의 제목은 반드시 <h3> 태그를 사용할 것.
    - 줄글(<p>) 대신 <ul>과 <li> 태그를 사용하여 불릿 기호로 정리할 것.
    - 모든 문장은 '~함', '~임', '~수준임', '~필요함' 등의 간결한 개조식(음/슴체)으로 맺을 것.
    - 강조를 위한 별표(**) 등 마크다운 특수기호는 절대 사용하지 말 것.
    - 표(Table)는 절대 그리지 말 것.
    `;

    const promptData = { ...companyData }; delete promptData.rawData; 
    const fullPrompt = `${systemInstruction}\n\n[기업 데이터]\n${JSON.stringify(promptData)}\n\n출력 목적: ${version === 'client' ? '긍정적/객관적 분석' : '리스크/단점 지적 위주'}`;
    const aiResponse = await callGeminiAPI(fullPrompt);

    document.getElementById('ai-loading-overlay').style.display = 'none';

    if (aiResponse) {
        const tabContent = event.target.closest('.tab-content');
        tabContent.querySelector('[id$="-input-step"]').style.display = 'none';
        tabContent.querySelector('[id$="-result-step"]').style.display = 'block';

        let cleanHTML = aiResponse.replace(/```html|```/g, '').replace(/\*\*/g, ''); 
        
        // ★ 소박스 안에 차트 컨테이너 꽂아넣기 (정규식 활용으로 더 안전하게) ★
        cleanHTML = cleanHTML.replace(/(<h3[^>]*>.*?경영진단 개요.*?<\/h3>)/, '$1\n<div class="chart-container"><div class="chart-box"><canvas id="report-radar-chart"></canvas></div></div>');
        cleanHTML = cleanHTML.replace(/(<h3[^>]*>.*?재무 현황 분석.*?<\/h3>)/, '$1\n<div class="chart-container"><div class="chart-box"><canvas id="report-bar-chart"></canvas></div></div>');

        const contentArea = tabContent.querySelector('[id$="-content-area"]');
        const today = new Date().toISOString().split('T')[0];
        let titleAdd = version === 'client' ? "<span style='color:#334155;'>(업체전달용)</span>" : "<span style='color:#ef4444;'>(컨설턴트 피드백용)</span>";
        
        // ★ 상단 표 통합 확장 (기업현황) ★
        contentArea.innerHTML = `
            <div class="paper-inner">
                <h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">경영진단보고서 ${titleAdd}</h1>
                <table class="simple-table">
                    <tr><th>기업명</th><td>${companyData.name}</td><th>사업자번호</th><td>${companyData.bizNum || '-'}</td></tr>
                    <tr><th>대표자</th><td>${companyData.rep || '-'}</td><th>설립(개시)일</th><td>${companyData.bizDate || '-'}</td></tr>
                    <tr><th>업종</th><td>${companyData.industry || '-'}</td><th>상시근로자</th><td>${companyData.empCount || '-'} 명</td></tr>
                    <tr><th>핵심아이템</th><td colspan="3">${companyData.coreItem || '-'}</td></tr>
                </table>
                ${cleanHTML}
                <div class="alert-box ${version === 'client' ? 'blue' : 'green'}">
                    ★ 본 리포트는 입력된 경영 데이터를 바탕으로 AI 컨설턴트가 분석한 ${version === 'client' ? '제언' : '내부 검토용'} 자료입니다.
                </div>
            </div>
        `;

        setTimeout(() => {
            const radarEl = document.getElementById('report-radar-chart');
            if (radarEl) {
                new Chart(radarEl.getContext('2d'), {
                    type: 'radar',
                    data: { labels: ['재무건전성', '성장성', '기술력', '운영효율', '시장성'], datasets: [{ label: '기업 역량 진단 스코어', data: [75, 90, 85, 65, 80], backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', pointBackgroundColor: '#1e3a8a' }] },
                    options: { scales: { r: { min: 0, max: 100 } }, maintainAspectRatio: false }
                });
            }

            const barEl = document.getElementById('report-bar-chart');
            if (barEl) {
                new Chart(barEl.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['23년도', '24년도', '25년도', '금년(현재)'],
                        datasets: [{
                            label: '매출 현황 (단위: 만원)',
                            // ★ 폼에서 긁어온 실제 매출 데이터가 여기에 꽂힙니다! ★
                            data: [rev.y23, rev.y24, rev.y25, rev.cur], 
                            backgroundColor: 'rgba(22, 163, 74, 0.7)', borderRadius: 4
                        }]
                    },
                    options: { maintainAspectRatio: false }
                });
            }
        }, 100);
    }
}

window.backToInput = function(tab) {
    document.getElementById(tab + '-input-step').style.display = 'block';
    document.getElementById(tab + '-result-step').style.display = 'none';
}
