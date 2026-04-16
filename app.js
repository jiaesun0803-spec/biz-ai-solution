const DB_USERS = 'biz_users'; 
const DB_SESSION = 'biz_session'; 
const STORAGE_KEY = 'biz_consult_companies';
const DB_REPORTS = 'biz_reports'; 

document.addEventListener("DOMContentLoaded", function() {
    checkAuth();
    const urlParams = new URLSearchParams(window.location.search);
    showTab(urlParams.get('tab') || 'dashboard', false);
    window.toggleCorpNumber(); window.toggleRentInputs(); window.toggleExportInputs();
});

window.devBypassLogin = function() {
    const testUser = { email: 'test@biz.com', pw: '1234', name: '선지영', dept: '솔루션빌더스', apiKey: '' };
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    if(!users.find(u => u.email === testUser.email)) { users.push(testUser); localStorage.setItem(DB_USERS, JSON.stringify(users)); }
    localStorage.setItem(DB_SESSION, JSON.stringify(testUser));
    checkAuth(); 
}

function checkAuth() {
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    const authOverlay = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    if (session) { if(authOverlay) authOverlay.style.display = 'none'; if(mainApp) mainApp.style.display = 'flex'; loadUserProfile(); updateDataLists(); initInputHandlers(); } 
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
    if(tabId === 'settings') loadUserProfile(); 
    updateDataLists(); 
    if (updateUrl) history.pushState(null, '', `?tab=${tabId}`);
}
window.addEventListener('popstate', function() { const urlParams = new URLSearchParams(window.location.search); showTab(urlParams.get('tab') || 'dashboard', false); });

window.updateDataLists = function() {
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const reports = JSON.parse(localStorage.getItem(DB_REPORTS) || '[]');
    const dropdowns = document.querySelectorAll('.company-dropdown');
    dropdowns.forEach(select => {
        select.innerHTML = '<option value="">기업을 선택하세요</option>';
        companies.forEach(c => select.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    });
    const loadSelect = document.getElementById('load-company-select');
    if(loadSelect) { 
        loadSelect.innerHTML = '<option value="">기존 기업 불러오기</option>'; 
        companies.forEach(c => loadSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`); 
    }
    const cBody = document.getElementById('company-list-body');
    if(cBody) { cBody.innerHTML = companies.length ? companies.map(c => `<tr><td><strong>${c.name}</strong></td><td>${c.rep || '-'}</td><td>${c.bizNum || '-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="editCompany('${c.name}')">수정/보기</button></td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8;">등록된 기업이 없습니다.</td></tr>'; }
    const rBody = document.getElementById('report-list-body');
    if(rBody) { rBody.innerHTML = reports.length ? reports.map(r => `<tr><td><span style="background:#eff6ff; color:#3b82f6; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:bold;">${r.type}</span></td><td><strong>${r.company}</strong></td><td>${r.title}</td><td>${r.date}</td><td><button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button></td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8;">생성된 보고서가 없습니다.</td></tr>'; }
}

window.clearCompanyForm = function() { if(confirm('작성 중인 내용을 모두 초기화하시겠습니까?')) { document.getElementById('companyForm').reset(); window.calculateTotalDebt(); window.toggleCorpNumber(); window.toggleRentInputs(); window.toggleExportInputs(); } }
window.loadSelectedCompany = function(name) { if(!name) return; window.editCompany(name); document.getElementById('load-company-select').value = ''; }

window.saveCompanyData = function() {
    const name = document.getElementById('comp_name') ? document.getElementById('comp_name').value : "";
    if (!name) { alert('상호명을 반드시 입력해주세요.'); return; }
    
    // ★ 콤마(,) 완벽 제거 후 숫자로 변환 (11400 에러 해결) ★
    let realRevenue = {
        cur: parseInt((document.getElementById('rev_cur') || {}).value?.replace(/,/g, '')) || 0,
        y25: parseInt((document.getElementById('rev_25') || {}).value?.replace(/,/g, '')) || 0,
        y24: parseInt((document.getElementById('rev_24') || {}).value?.replace(/,/g, '')) || 0,
        y23: parseInt((document.getElementById('rev_23') || {}).value?.replace(/,/g, '')) || 0
    };
    
    const newCompany = { 
        name: name, rep: document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0]?.value || '-', 
        bizNum: document.getElementById('biz_number')?.value || '-', industry: document.getElementById('comp_industry')?.value || '-', 
        bizDate: document.getElementById('biz_date')?.value || '-', empCount: document.getElementById('emp_count')?.value || '-', 
        coreItem: document.getElementById('core_item')?.value || '-', date: new Date().toISOString().split('T')[0], 
        revenueData: realRevenue,
        rawData: Array.from(document.querySelectorAll('#companyForm input, #companyForm select, #companyForm textarea')).map(el => ({ type: el.type, value: el.value, checked: el.checked }))
    };

    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const existingIdx = companies.findIndex(c => c.name === name);
    if (existingIdx > -1) companies[existingIdx] = newCompany; else companies.push(newCompany);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies)); alert('기업의 모든 세부 정보가 성공적으로 저장되었습니다!'); updateDataLists(); showTab('reportList');
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

function initInputHandlers() { 
    document.querySelectorAll('.number-only').forEach(i => { i.addEventListener('input', function() { this.value = this.value.replace(/[^0-9]/g, ''); }); }); 
    document.querySelectorAll('.money-format').forEach(i => { i.addEventListener('input', function() { let v = this.value.replace(/[^0-9\-]/g, ''); this.value = v.replace(/\B(?=(\d{3})+(?!\d))/g, ","); }); }); 
    document.querySelectorAll('.debt-input').forEach(i => { i.addEventListener('input', window.calculateTotalDebt); }); 

    const formatInputs = [
        { id: 'biz_number', len: [4, 6], split: [3, 5, 10] }, { id: 'corp_number', len: [7], split: [6, 13] },
        { id: 'biz_date', len: [5, 7], split: [4, 6, 8] }, { id: 'rep_birth', len: [5, 7], split: [4, 6, 8] }, { id: 'write_date', len: [5, 7], split: [4, 6, 8] }
    ];
    formatInputs.forEach(item => {
        const el = document.getElementById(item.id);
        if(el) {
            el.addEventListener('input', function() {
                let val = this.value.replace(/[^0-9]/g, '');
                if (item.id === 'corp_number') { if (val.length < 7) this.value = val; else this.value = val.slice(0,6) + '-' + val.slice(6,13); } 
                else if(item.id === 'biz_number') { if (val.length < 4) this.value = val; else if (val.length < 6) this.value = val.slice(0,3) + '-' + val.slice(3); else this.value = val.slice(0,3) + '-' + val.slice(3,5) + '-' + val.slice(5,10); } 
                else { if (val.length < 5) this.value = val; else if (val.length < 7) this.value = val.slice(0,4) + '-' + val.slice(4); else this.value = val.slice(0,4) + '-' + val.slice(4,6) + '-' + val.slice(6,8); }
            });
        }
    });

    const phoneInputs = ['biz_phone', 'rep_phone'];
    phoneInputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', function() {
                let val = this.value.replace(/[^0-9]/g, '');
                if(val.startsWith('02')) { if(val.length < 3) this.value = val; else if(val.length < 6) this.value = val.slice(0,2) + '-' + val.slice(2); else if(val.length < 10) this.value = val.slice(0,2) + '-' + val.slice(2,5) + '-' + val.slice(5); else this.value = val.slice(0,2) + '-' + val.slice(2,6) + '-' + val.slice(6,10); } 
                else { if(val.length < 4) this.value = val; else if(val.length < 7) this.value = val.slice(0,3) + '-' + val.slice(3); else if(val.length < 11) this.value = val.slice(0,3) + '-' + val.slice(3,6) + '-' + val.slice(6); else this.value = val.slice(0,3) + '-' + val.slice(3,7) + '-' + val.slice(7,11); }
            });
        }
    });
}

/* =========================================
   5. ★ 스마트 금액 포매터 & AI 차트 및 표지 로직 ★
========================================= */

// ★ 완벽한 한글 금액 변환기 (11400 -> 1억 1,400만원) ★
function formatKoreanCurrency(amountInManwon) {
    if (!amountInManwon || amountInManwon === 0) return '0원';
    const uk = Math.floor(amountInManwon / 10000);
    const man = amountInManwon % 10000;
    let res = '';
    if (uk > 0) {
        res += uk.toLocaleString() + '억';
        if (man > 0) res += ' ' + man.toLocaleString() + '만원';
        else res += '원'; // 140000 -> 14억원
    } else {
        res += man.toLocaleString() + '만원';
    }
    return res.trim();
}

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

function renderReportToScreen(companyData, cleanHTML, version, rev, dateStr) {
    const contentArea = document.getElementById('report-content-area');
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    const consultantName = session ? session.name : "담당자";
    const consultantDept = session ? session.dept : "솔루션빌더스";

    const regDate = companyData.date || dateStr;
    const regMonth = parseInt(regDate.split('-')[1], 10) || 1;
    let passedMonths = regMonth - 1; 
    if (passedMonths <= 0) passedMonths = 1; 
    const expectedCurRev = Math.round((rev.cur / passedMonths) * 12); 

    let titleAdd = version === 'client' ? "기업전달용" : "컨설턴트용";
    let subAdd = version === 'client' ? "기업의 현재 역량 분석 및 맞춤형 성장 전략 제안" : "내부 리스크 진단 및 보완 액션 플랜";
    
    // ★ H1 제목의 <br>을 완전히 제거하고 한 줄로 유지 ★
    contentArea.innerHTML = `
        <div class="paper-inner">
            <div class="cover-page cover-theme-blue">
                <div class="cover-header">
                    <h4>AI 경영진단보고서 리포트</h4>
                    <h1>AI 경영진단보고서</h1>
                </div>
                <div class="cover-middle">
                    <h2>${companyData.name} <span style="font-size:18px; color:#94a3b8;">(${titleAdd})</span></h2>
                    <div class="cover-table">
                        <table>
                            <tr><th>사업자번호</th><td>${companyData.bizNum || '-'}</td><th>업종</th><td>${companyData.industry || '-'}</td></tr>
                            <tr><th>대표자명</th><td>${companyData.rep || '-'}</td><th>핵심아이템</th><td>${companyData.coreItem || '-'}</td></tr>
                            <tr>
                                <th>전년도매출</th><td>${formatKoreanCurrency(rev.y24)}</td>
                                <th>금년예상매출</th><td>${formatKoreanCurrency(expectedCurRev)} <span style="display:block; font-size:12px; color:#64748b; margin-top:4px;">(${passedMonths}개월 기준 연간 환산)</span></td>
                            </tr>
                        </table>
                    </div>
                    <div class="cover-chart-area"><canvas id="cover-bar-chart"></canvas></div>
                </div>
                <div class="cover-footer">
                    <div>작성일: ${dateStr}</div>
                    <div>담당자: ${consultantName}</div>
                    <div>소속: ${consultantDept}</div>
                </div>
            </div>
            ${cleanHTML}
            <div class="alert-box ${version === 'client' ? 'blue' : 'green'}">
                ★ 본 리포트는 입력된 경영 데이터를 바탕으로 AI 컨설턴트가 분석한 ${subAdd} 자료입니다.
            </div>
        </div>
    `;

    setTimeout(() => {
        const radarEl = document.getElementById('report-radar-chart');
        if (radarEl) {
            new Chart(radarEl.getContext('2d'), { type: 'radar', data: { labels: ['재무건전성', '성장성', '기술력', '운영효율', '시장성'], datasets: [{ label: '기업 역량 진단 스코어', data: [75, 90, 85, 65, 80], backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', pointBackgroundColor: '#1e3a8a' }] }, options: { scales: { r: { min: 0, max: 100 } }, maintainAspectRatio: false } });
        }
        
        // ★ 본문 차트: 라인 차트로 변경 & Y축 억단위 포맷 강제 적용 ★
        const lineEl = document.getElementById('report-bar-chart'); 
        if (lineEl) {
            new Chart(lineEl.getContext('2d'), { 
                type: 'line', 
                data: { 
                    labels: ['23년도', '24년도', '25년도', '금년(예상)'], 
                    datasets: [{ 
                        label: '매출 추이', 
                        data: [rev.y23, rev.y24, rev.y25, expectedCurRev], 
                        borderColor: 'rgba(22, 163, 74, 1)', backgroundColor: 'rgba(22, 163, 74, 0.2)', 
                        borderWidth: 2, pointBackgroundColor: 'rgba(22, 163, 74, 1)', pointRadius: 4, 
                        fill: true, tension: 0.1 
                    }] 
                }, 
                options: { 
                    maintainAspectRatio: false,
                    scales: { y: { ticks: { callback: function(val) { return val >= 10000 ? Math.floor(val / 10000) + '억' : val.toLocaleString(); } } } }
                } 
            });
        }
        
        // ★ 표지 차트: X축 텍스트 심플화, Y축 억단위 포맷 강제 적용 ★
        const coverBarEl = document.getElementById('cover-bar-chart');
        if (coverBarEl) {
            new Chart(coverBarEl.getContext('2d'), { 
                type: 'bar', 
                data: { 
                    labels: ['23년도', '24년도', '금년(예상)'], 
                    datasets: [{ 
                        label: '매출 현황', 
                        data: [rev.y23, rev.y24, expectedCurRev], 
                        backgroundColor: 'rgba(59, 130, 246, 0.7)', borderRadius: 4, barThickness: 40 
                    }] 
                }, 
                options: { 
                    maintainAspectRatio: false, 
                    plugins: { legend: { display: false } },
                    scales: { y: { ticks: { callback: function(val) { return val >= 10000 ? Math.floor(val / 10000) + '억' : val.toLocaleString(); } } } }
                } 
            });
        }
    }, 100);
}

window.generateReport = async function(reportType, version, event) {
    const selectId = event.target.closest('.tab-content').querySelector('.company-dropdown').id;
    const companyName = document.getElementById(selectId).value;
    if (!companyName) { alert('기업을 선택해주세요.'); return; }

    const companies = JSON.parse(localStorage.getItem('biz_consult_companies') || '[]');
    const companyData = companies.find(c => c.name === companyName);
    const rev = companyData.revenueData || { y23: 0, y24: 0, y25: 0, cur: 0 };

    document.getElementById('ai-loading-overlay').style.display = 'flex';

    // ★ 프롬프트 강화: 30자 이상 길게 작성 요구 추가 ★
    let systemInstruction = `
    너의 역할은 20년 경력의 '경영 컨설턴트'야. 대상 기업명은 '${companyData.name}'이야. 
    제공된 [기업 데이터]를 바탕으로 다음 7개 목차를 작성해. 
    1. 경영진단 개요
    2. 재무 현황 분석
    3. 전략 및 마케팅 분석
    4. 인사/조직 및 운영/생산 분석
    5. IT/디지털 및 정부지원 활용
    6. 핵심 문제점 및 리스크
    7. 개선 방향 및 로드맵

    [★작성 규칙 - 절대 준수★]
    - 각 목차 전체를 반드시 <div class="report-section-box"> 태그로 감싸서 출력할 것.
    - 각 목차의 제목은 반드시 <h3> 태그를 사용할 것.
    - 줄글(<p>) 대신 <ul>과 <li> 태그를 사용하여 불릿 기호로 정리할 것.
    - 각 <li> 항목은 분석 내용이 충분히 풍부하게 담기도록 최소 30자 이상으로 길고 상세하게 작성할 것. 절대 빈약하게 쓰지 마.
    - 모든 문장은 '~함', '~임', '~수준임', '~필요함' 등의 간결한 개조식으로 맺을 것.
    - 강조를 위한 별표(**) 등 마크다운 특수기호는 절대 사용하지 말 것.
    - 표(Table)는 절대 그리지 말 것.
    `;

    const promptData = { ...companyData }; delete promptData.rawData; 
    const fullPrompt = `${systemInstruction}\n\n[기업 데이터]\n${JSON.stringify(promptData)}\n\n출력 목적: ${version === 'client' ? '긍정적/객관적 분석' : '리스크/단점 지적 위주'}`;
    const aiResponse = await callGeminiAPI(fullPrompt);

    document.getElementById('ai-loading-overlay').style.display = 'none';

    if (aiResponse) {
        let cleanHTML = aiResponse.replace(/```html|```/g, '').replace(/\*\*/g, ''); 
        cleanHTML = cleanHTML.replace(/(<h3[^>]*>.*?경영진단 개요.*?<\/h3>)/, '$1\n<div class="chart-container"><div class="chart-box"><canvas id="report-radar-chart"></canvas></div></div>');
        cleanHTML = cleanHTML.replace(/(<h3[^>]*>.*?재무 현황 분석.*?<\/h3>)/, '$1\n<div class="chart-container"><div class="chart-box"><canvas id="report-bar-chart"></canvas></div></div>');

        const todayStr = new Date().toISOString().split('T')[0];

        const reportObj = {
            id: 'rep_' + Date.now(), type: '경영진단', company: companyData.name,
            title: `AI 경영진단보고서 (${version === 'client' ? '기업전달용' : '컨설턴트용'})`,
            date: todayStr, content: cleanHTML, version: version, revenueData: rev
        };
        const reports = JSON.parse(localStorage.getItem(DB_REPORTS) || '[]');
        reports.push(reportObj);
        localStorage.setItem(DB_REPORTS, JSON.stringify(reports));

        updateDataLists(); 

        const tabContent = event.target.closest('.tab-content');
        tabContent.querySelector('[id$="-input-step"]').style.display = 'none';
        tabContent.querySelector('[id$="-result-step"]').style.display = 'block';

        renderReportToScreen(companyData, cleanHTML, version, rev, todayStr);
    }
}

window.viewReport = function(id) {
    const reports = JSON.parse(localStorage.getItem(DB_REPORTS) || '[]');
    const r = reports.find(x => x.id === id);
    if(!r) return;
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const companyData = companies.find(c => c.name === r.company) || { name: r.company };

    showTab('report');
    document.getElementById('report-input-step').style.display = 'none';
    document.getElementById('report-result-step').style.display = 'block';

    renderReportToScreen(companyData, r.content, r.version, r.revenueData, r.date);
};

window.backToInput = function(tab) {
    document.getElementById(tab + '-input-step').style.display = 'block';
    document.getElementById(tab + '-result-step').style.display = 'none';
}
