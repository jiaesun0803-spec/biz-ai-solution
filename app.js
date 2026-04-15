// 데이터베이스 키 (localStorage)
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

// 개발용 프리패스
function devBypassLogin() {
    const testUser = { 
        email: 'test@biz.com', 
        pw: '1234', 
        name: '선지영', 
        dept: '솔루션빌더스(테스트)', 
        apiKey: '' 
    };
    
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    if(!users.find(u => u.email === testUser.email)) {
        users.push(testUser);
        localStorage.setItem(DB_USERS, JSON.stringify(users));
    }
    
    localStorage.setItem(DB_SESSION, JSON.stringify(testUser));
    checkAuth(); 
    alert('🛠️ 테스트 계정으로 강제 접속되었습니다!\n\n(※ AI 리포트 생성을 위해 설정 탭에서 API Key를 넣어주세요.)');
}

function checkAuth() {
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    const authOverlay = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');

    if (session) {
        if(authOverlay) authOverlay.style.display = 'none';
        if(mainApp) mainApp.style.display = 'flex';
        loadUserProfile();
        updateCompanyLists();
        initInputHandlers();
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
   4. 폼 동작 및 하이픈/콤마 로직
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
                    if (val.length < 4) this.value = val; else if (val.length < 6) this.value = val.slice(0,3) + '-' + val.slice(3); else this.value = val.slice(0,3) + '-' + val.slice(3,5) + '-' + val.slice(5,10);
                } else {
                     if (val.length < 5) this.value = val; else if (val.length < 7) this.value = val.slice(0,4) + '-' + val.slice(4); else this.value = val.slice(0,4) + '-' + val.slice(4,6) + '-' + val.slice(6,8);
                }
            });
        }
    });

    document.querySelectorAll('.fin-input').forEach(input => {
        input.addEventListener('input', function() { calcFinance('1'); calcFinance('2'); });
    });
}

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
    
    const debtInputs = document.querySelectorAll('.debt-input');
    if(debtInputs.length > 4) {
        debtInputs[0].value = "20,000"; 
        debtInputs[3].value = "10,000"; 
        debtInputs[4].value = "7,000";  
        window.calculateTotalDebt(); 
    }
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

function toggleCorpNumber() { /* 로직 생략 */ }
function toggleRentInputs() { /* 로직 생략 */ }
function toggleExportInputs() { /* 로직 생략 */ }


/* =========================================
   5. AI API 연동 및 리포트 생성 로직
========================================= */

async function callGeminiAPI(prompt) {
    const session = JSON.parse(localStorage.getItem('biz_session'));
    const apiKey = session ? session.apiKey : null;

    if (!apiKey) {
        alert("설정 탭에서 Gemini API 키를 먼저 등록해주세요.");
        showTab('settings');
        return null;
    }

    // ★ 구글 최신 규격 모델인 gemini-2.5-flash 로 업데이트 완료 ★
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
        
        // 오류 응답 처리 강화
        if (!response.ok || data.error) {
            const errorMsg = data.error ? data.error.message : '알 수 없는 API 에러';
            throw new Error(errorMsg);
        }
        
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

    let reportTitle = "경영진단보고서";
    let systemInstruction = `너는 20년 경력의 전문 경영컨설턴트야. 다음 데이터를 바탕으로 [1.개요, 2.현황분석, 3.재무진단, 4.전략, 5.운영, 6.IT활용, 7.리스크, 8.로드맵] 순서로 상세한 보고서를 작성해줘. 
    반드시 HTML 태그(h3, p, table, div class='alert-box blue' 또는 'alert-box green')만을 사용해서 시각적으로 구성해. 마크다운 기호(\`\`\`html)는 절대 쓰지 마.`;

    const fullPrompt = `${systemInstruction}\n\n[기업 데이터]\n${JSON.stringify(companyData)}\n\n출력 목적: ${version === 'client' ? '업체 전달용(격려 및 긍정적 분석 위주)' : '컨설턴트 내부 피드백용(냉정하고 날카로운 리스크 지적 위주)'}`;

    const aiResponse = await callGeminiAPI(fullPrompt);

    if (aiResponse) {
        btn.innerText = originalText;
        btn.disabled = false;

        const tabContent = event.target.closest('.tab-content');
        tabContent.querySelector('[id$="-input-step"]').style.display = 'none';
        tabContent.querySelector('[id$="-result-step"]').style.display = 'block';

        const contentArea = tabContent.querySelector('[id$="-content-area"]');
        const cleanHTML = aiResponse.replace(/```html|```/g, ''); 

        contentArea.innerHTML = `
            <div class="paper-inner">
                <h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">${reportTitle} (${version === 'client' ? '업체전달용' : '<span style="color:#ef4444;">컨설턴트용</span>'})</h1>
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
