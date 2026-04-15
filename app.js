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

    if (session) {
        if(authOverlay) authOverlay.style.display = 'none';
        if(mainApp) mainApp.style.display = 'flex';
        loadUserProfile(); updateCompanyLists(); initInputHandlers();
    } else {
        if(authOverlay) authOverlay.style.display = 'flex';
        if(mainApp) mainApp.style.display = 'none';
    }
}

window.toggleAuthMode = function(mode) { document.getElementById('login-form-area').style.display = mode === 'login' ? 'block' : 'none'; document.getElementById('signup-form-area').style.display = mode === 'signup' ? 'block' : 'none'; }
window.handleSignup = function() {
    const email = document.getElementById('signup-email').value; const pw = document.getElementById('signup-pw').value; const name = document.getElementById('signup-name').value;
    if (!email || !pw || !name) { alert('모든 정보를 입력해주세요.'); return; }
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    if (users.find(u => u.email === email)) { alert('이미 가입된 이메일입니다.'); return; }
    const newUser = { email, pw, name, dept: '솔루션빌더스', apiKey: '' };
    users.push(newUser); localStorage.setItem(DB_USERS, JSON.stringify(users));
    alert('회원가입이 완료되었습니다! 로그인해주세요.'); toggleAuthMode('login');
}
window.handleLogin = function() {
    const email = document.getElementById('login-email').value; const pw = document.getElementById('login-pw').value;
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    const user = users.find(u => u.email === email && u.pw === pw);
    if (user) { localStorage.setItem(DB_SESSION, JSON.stringify(user)); checkAuth(); } else { alert('이메일 또는 비밀번호가 일치하지 않습니다.'); }
}
window.handleLogout = function() { localStorage.removeItem(DB_SESSION); location.reload(); }

function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem(DB_SESSION)); if (!user) return;
    if(document.getElementById('display-user-name')) document.getElementById('display-user-name').innerText = user.name;
    if(document.getElementById('display-user-dept')) document.getElementById('display-user-dept').innerText = user.dept || '솔루션빌더스';
    if(document.getElementById('set-user-name')) { document.getElementById('set-user-name').value = user.name; document.getElementById('set-user-email').value = user.email; document.getElementById('set-user-dept').value = user.dept || ''; document.getElementById('set-api-key').value = user.apiKey || ''; }
}
function updateUserDB(updatedUser) {
    let users = JSON.parse(localStorage.getItem(DB_USERS));
    const userIdx = users.findIndex(u => u.email === updatedUser.email);
    users[userIdx] = updatedUser; localStorage.setItem(DB_USERS, JSON.stringify(users)); localStorage.setItem(DB_SESSION, JSON.stringify(updatedUser)); loadUserProfile();
}
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
    if(body) {
        body.innerHTML = companies.length ? companies.map(c => `<tr><td><strong>${c.name}</strong></td><td>${c.rep || '-'}</td><td>${c.bizNum || '-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="editCompany('${c.name}')">수정/보기</button></td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8;">등록된 업체가 없습니다.</td></tr>';
    }
}

window.clearCompanyForm = function() {
    if(confirm('작성 중인 내용을 모두 초기화하시겠습니까?')) { document.getElementById('companyForm').reset(); window.calculateTotalDebt(); window.toggleCorpNumber(); window.toggleRentInputs(); window.toggleExportInputs(); }
}

window.loadCompanyData = function() {
    alert('테스트용 샘플 데이터(주식회사 대박컴퍼니)를 불러옵니다.');
    if(document.getElementById('comp_name')) document.getElementById('comp_name').value = "주식회사 대박컴퍼니";
    if(document.querySelector('input[value="법인"]')) document.querySelector('input[value="법인"]').checked = true;
    if(document.getElementById('biz_number')) document.getElementById('biz_number').value = "732-86-03582";
    if(document.getElementById('comp_industry')) document.getElementById('comp_industry').value = "제조업"; 
    
    // 매출 샘플 데이터 할당
    const moneyInputs = document.querySelectorAll('.money-format');
    if(moneyInputs.length > 3) {
        moneyInputs[0].value = "11,000"; // 금년매출
        moneyInputs[1].value = "138,000"; // 25년매출
        moneyInputs[2].value = "114,000"; // 24년매출
        moneyInputs[3].value = "50,000"; // 23년매출
    }

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
    
    // ★ 실제 매출 데이터 추출 (차트용) ★
    const moneyInputs = document.querySelectorAll('.money-format');
    let realRevenue = {
        cur: parseInt(moneyInputs[0].value.replace(/,/g, '')) || 0,
        y25: parseInt(moneyInputs[1].value.replace(/,/g, '')) || 0,
        y24: parseInt(moneyInputs[2].value.replace(/,/g, '')) || 0,
        y23: parseInt(moneyInputs[3].value.replace(/,/g, '')) || 0
    };

    const formElements = document.querySelectorAll('#companyForm input, #companyForm select, #companyForm textarea');
    const rawData = Array.from(formElements).map(el => ({ type: el.type, value: el.value, checked: el.checked }));
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newCompany = { name: name, rep: rep || '-', bizNum: bizNum || '-', industry: industry || '-', date: new Date().toISOString().split('T')[0], revenueData: realRevenue, rawData: rawData };

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
   5. ★ AI API 연동 및 실제 데이터 기반 차트 생성 ★
========================================= */

async function callGeminiAPI(prompt) {
    const session = JSON.parse(localStorage.getItem('biz_session'));
    const apiKey = session ? session.apiKey : null;
    if (!apiKey) { alert("설정 탭에서 Gemini API 키를 등록해주세요."); showTab('settings'); return null; }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 4096 } })
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error ? data.error.message : 'API 에러');
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("API 오류:", error); alert("오류 발생: " + error.message); return null;
    }
}

window.generateReport = async function(reportType, version, event) {
    const selectId = event.target.closest('.tab-content').querySelector('.company-dropdown').id;
    const companyName = document.getElementById(selectId).value;
    if (!companyName) { alert('업체를 선택해주세요.'); return; }

    const companies = JSON.parse(localStorage.getItem('biz_consult_companies') || '[]');
    const companyData = companies.find(c => c.name === companyName);
    
    // 차트용 실제 매출 데이터 확보 (기본값 0)
    const rev = companyData.revenueData || { y23: 0, y24: 0, y25: 0, cur: 0 };

    const loadingOverlay = document.getElementById('ai-loading-overlay');
    loadingOverlay.style.display = 'flex';

    // ★ 프롬프트: 개조식(~함/~임) 강제, 제공된 수치 인용, 표 금지 ★
    let systemInstruction = `
    너의 역할은 20년 경력의 '경영 컨설턴트'야. 대상 기업명은 '${companyData.name}'이야. 

    [기업 데이터]를 분석해서 다음 8개 목차를 반드시 작성해.
    1. 경영진단 개요
    2. 기업 현황 분석
    3. 재무 현황 분석
    4. 전략 및 마케팅 분석
    5. 인사/조직 및 운영/생산 분석
    6. IT/디지털 및 정부지원 활용
    7. 핵심 문제점 및 리스크
    8. 개선 방향 및 로드맵

    [★작성 규칙 - 절대 준수★]
    - 제공된 [기업 데이터]의 수치(매출, 부채 등)를 절대 임의로 변경하거나 지어내지 말고 있는 그대로 인용할 것.
    - 각 목차의 제목은 <h3> 태그를 사용할 것. (예: <h3>1. 경영진단 개요</h3>) - 이 목차명을 정확히 출력해야 시스템이 차트를 삽입할 수 있음.
    - 줄글(<p>) 대신 <ul>과 <li> 태그를 사용하여 불릿 기호로 깔끔하게 정리할 것.
    - 모든 문장은 '~함', '~임', '~수준임', '~필요함' 등의 간결한 개조식(음/슴체)으로 맺을 것. 서술형(~습니다) 금지.
    - 표(Table)는 절대 그리지 말 것.
    - 마크다운 기호(\`\`\`html 등)는 절대 출력하지 말 것.
    `;

    const promptData = { ...companyData };
    delete promptData.rawData; 

    const fullPrompt = `${systemInstruction}\n\n[기업 데이터]\n${JSON.stringify(promptData)}\n\n출력 목적: ${version === 'client' ? '긍정적/객관적 분석' : '리스크/단점 지적 위주'}`;

    const aiResponse = await callGeminiAPI(fullPrompt);

    loadingOverlay.style.display = 'none';

    if (aiResponse) {
        const tabContent = event.target.closest('.tab-content');
        tabContent.querySelector('[id$="-input-step"]').style.display = 'none';
        tabContent.querySelector('[id$="-result-step"]').style.display = 'block';

        let cleanHTML = aiResponse.replace(/```html|```/g, ''); 
        
        // ★ 중간 차트 삽입 로직: AI가 생성한 특정 목차 <h3> 아래에 캔버스를 꽂아 넣습니다 ★
        cleanHTML = cleanHTML.replace('<h3>2. 기업 현황 분석</h3>', '<h3>2. 기업 현황 분석</h3>\n<div class="chart-container"><div class="chart-box"><canvas id="report-radar-chart"></canvas></div></div>');
        cleanHTML = cleanHTML.replace('<h3>3. 재무 현황 분석</h3>', '<h3>3. 재무 현황 분석</h3>\n<div class="chart-container"><div class="chart-box"><canvas id="report-bar-chart"></canvas></div></div>');

        const contentArea = tabContent.querySelector('[id$="-content-area"]');
        const today = new Date().toISOString().split('T')[0];
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

        // 차트 렌더링 (DOM 요소가 생긴 후 그려야 하므로 setTimeout 사용)
        setTimeout(() => {
            const radarEl = document.getElementById('report-radar-chart');
            if (radarEl) {
                new Chart(radarEl.getContext('2d'), {
                    type: 'radar',
                    data: {
                        labels: ['재무건전성', '성장성', '기술력', '운영효율', '시장성'],
                        datasets: [{
                            label: '기업 역량 진단 스코어',
                            data: [75, 90, 85, 65, 80], // 역량 스코어는 샘플 유지
                            backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', pointBackgroundColor: '#1e3a8a'
                        }]
                    },
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
                            // ★ 폼에서 긁어온 실제 매출 데이터 반영 ★
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
