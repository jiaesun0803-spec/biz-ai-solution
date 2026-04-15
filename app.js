// 데이터베이스 키 (localStorage)
const DB_USERS = 'biz_users'; 
const DB_SESSION = 'biz_session'; 
const STORAGE_KEY = 'biz_consult_companies';

document.addEventListener("DOMContentLoaded", function() {
    checkAuth();

    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') || 'dashboard';
    showTab(tabParam, false);
});

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
    updateUserDB(session);
    alert('프로필 정보가 저장되었습니다.');
}

function saveApiSettings() {
    let session = JSON.parse(localStorage.getItem(DB_SESSION));
    session.apiKey = document.getElementById('set-api-key').value;
    updateUserDB(session);
    alert('API 키가 저장되었습니다.');
}

function savePasswordSettings() {
    const curPw = document.getElementById('set-cur-pw').value;
    const newPw = document.getElementById('set-new-pw').value;
    let session = JSON.parse(localStorage.getItem(DB_SESSION));

    if (!curPw || !newPw) { alert('비밀번호를 모두 입력해주세요.'); return; }
    if (session.pw !== curPw) { alert('현재 비밀번호가 틀립니다.'); return; }
    
    session.pw = newPw;
    updateUserDB(session);
    document.getElementById('set-cur-pw').value = '';
    document.getElementById('set-new-pw').value = '';
    alert('비밀번호가 변경되었습니다.');
}

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
        `).join('') : '<tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8;">등록된 업체가 없습니다.</td></tr>';
    }
}

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
    btn.innerText = "AI 심층 분석 중...";
    btn.disabled = true;

    // 분석 로딩 시뮬레이션
    setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
        
        document.getElementById('report-input-step').style.display = 'none';
        document.getElementById('report-result-step').style.display = 'block';
        renderReportContent(companyName, version);
    }, 1500);
}

// ★ PDF 스타일의 꽉 찬 텍스트 및 레이아웃 출력부 ★
function renderReportContent(name, version) {
    const area = document.getElementById('report-content-area');
    let titleAdd = version === 'client' ? "(업체전달용)" : "<span style='color:#ef4444;'>(컨설턴트 피드백용)</span>";
    
    // 현재 날짜 구하기
    const today = new Date().toISOString().split('T')[0];
    
    if (name.includes('대박컴퍼니') || name.includes('진에프앤비')) {
        // [1. 대박컴퍼니 또는 진에프앤비의 경우 풍성한 내용 출력]
        area.innerHTML = `
            <div class="paper-inner">
                <h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">경영진단보고서 ${titleAdd}</h1>
                
                <table class="simple-table">
                    <tr><th>기업명</th><td>${name}</td><th>사업자번호</th><td>732-86-03582</td></tr>
                    <tr><th>대표자</th><td>오가은</td><th>작성일</th><td>${today}</td></tr>
                    <tr><th>업종</th><td>제조업</td><th>상시근로자</th><td>4명</td></tr>
                </table>

                <h3>1. 경영진단 개요 [cite: 15, 16, 17]</h3>
                <p>본 기업은 신생 제조업 법인으로, 독창적인 아이템을 개발하여 HMR(가정간편식) 시장 및 온라인 유통 채널에 성공적으로 진입하였습니다. 본 진단은 제공된 기업 상세 데이터를 기반으로 재무, 전략, 마케팅, 운영/생산 영역을 종합적으로 분석하고, 지속 가능한 성장을 위한 실질적인 개선 방안 및 전략을 제시하는 데 목적이 있습니다. [cite: 19, 21]</p>

                <h3>2. 기업 현황 분석 [cite: 29]</h3>
                <p>현재 사업장은 자가 소유(또는 안정적 임대)로 초기 고정비 부담이 상대적으로 적은 강점을 보유하고 있습니다. [cite: 32] 대표자는 동종 업계의 풍부한 운영 경력을 보유하고 있으며, 특히 KCB 및 NICE 신용점수가 1등급(우수)에 해당하여 외부 자금 조달 및 정부 지원 사업 참여에 매우 유리한 조건을 갖추고 있습니다. [cite: 40, 41, 44]</p>

                <h3>3. 재무 현황 분석 [cite: 58]</h3>
                <p>사업 개시 후 단기간 내에 높은 매출 성과를 보이며 폭발적인 성장세를 기록 중입니다. 현재 부채 비율은 기보 등의 정책자금 위주로 구성되어 있어 재무 건전성이 비교적 양호한 상태입니다. [cite: 60, 65] 다만, 이번에 계획 중인 추가 4억 원의 자금 조달은 급격한 매출 성장에 따른 운전자본 확충 및 설비 투자를 위해 반드시 필요한 것으로 판단됩니다. [cite: 66, 67]</p>

                <h3>4. 전략 및 마케팅 분석 [cite: 86]</h3>
                <p>경쟁사와 차별화된 핵심 아이템을 바탕으로 니치마켓을 선점했으며, 주요 판매 루트를 온라인(스마트스토어, 자사몰 등)에 집중하여 초기 투자 비용 절감 및 전국 단위 고객 확보에 성공했습니다. [cite: 88, 89] 또한, 벤처기업 인증 및 2건의 특허, HACCP 인증 등 객관적인 기술/품질 경쟁력을 인정받고 있습니다. [cite: 94, 97]</p>

                <h3>5. 인사/조직 및 운영/생산 분석 [cite: 107]</h3>
                <p>현재 4명의 상시근로자로 구성된 소규모 조직이나 인당 생산성이 뛰어납니다. [cite: 109, 111] 하지만 예상되는 급격한 매출 증가(연간 환산 8억 이상)를 감당하기에는 현재의 인력 및 위생/생산 공정 체계만으로는 병목 현상이 발생할 우려가 큽니다. [cite: 119]</p>

                <h3>6. IT/디지털 및 정부지원 활용 [cite: 130]</h3>
                <p>온라인 판매 의존도가 높은 만큼 디지털 마케팅 역량 고도화가 필수적입니다. 또한, 정부지원 수혜 이력이 많지 않은 상태에서 우수한 신용도와 인증(벤처, 이노비즈 등)을 십분 활용한다면 기술 기반의 사업화 자금(R&D)을 충분히 노려볼 수 있습니다. [cite: 137, 138]</p>

                <h3>7. 핵심 문제점 및 리스크 [cite: 152]</h3>
                <p>매출의 가파른 성장은 긍정적이나, 이에 상응하는 설비, 물류, 재고 관리 등 <strong>'운영 역량의 부재'</strong>가 가장 큰 리스크입니다. [cite: 154] 아울러 조달 예정인 4억 원에 대한 구체적인 자재 구입 및 마케팅 예산 배분 계획이 수립되지 않으면 자금 집행의 비효율성을 초래할 수 있습니다. [cite: 160, 161]</p>

                <h3>8. 개선 방향 및 로드맵 [cite: 175]</h3>
                <p><strong>단기(3개월):</strong> 조달 자금 4억 원에 대한 세부 항목별 예산을 확정하고, 생산 라인 안정화를 위해 최소 1~2명의 전담 인력을 즉시 충원해야 합니다. [cite: 207, 208]<br>
                <strong>중기(6~1년):</strong> 온라인 채널 다각화(대형 플랫폼 입점) 및 특허를 활용한 신제품 기획, 그리고 벤처인증 기반의 정책 자금을 집중 공략해야 합니다. [cite: 213, 214, 215]<br>
                <strong>장기(1년~):</strong> 브랜드 인지도를 기반으로 B2B 대용량 납품 또는 오프라인 제휴를 추진하여 사업의 영속성을 확보해야 합니다. [cite: 217]</p>

                ${version === 'client' ? 
                    `<div class="alert-box blue">★ 총평 및 제언: 대표자님의 우수한 신용도와 보유 인증(HACCP, 벤처 등)은 훌륭한 자산입니다. [cite: 237] 추가 설비 확충을 위해 서둘러 기보/중진공에 '스케일업 및 시설자금' 명목으로 4억 원 조달 프로세스를 진행하시길 권고드립니다.</div>` 
                    : 
                    `<div class="alert-box green">★ 컨설턴트 액션 플랜: 현재 부채가 정책자금에 편중되어 있어 추가 4억 한도 심사가 매우 까다로울 수 있음. 일반 운영자금 신청보다는 <strong>[특허 기반 기술평가 보증]</strong>이나 <strong>[스마트공장 구축 연계 자금]</strong>으로 프레임을 전환하여 사업계획서를 재작성 후 제출할 것.</div>`
                }
            </div>
        `;
    } 
    else {
        // [2. 데이터가 덜 입력된 기타 업체의 경우]
        area.innerHTML = `
            <div class="paper-inner">
                <h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">경영진단보고서 ${titleAdd}</h1>
                <p style="text-align:center; padding: 100px 0; color:#64748b; line-height: 1.8;">
                    <strong>해당 업체(${name})의 데이터가 부족합니다.</strong><br>
                    정확한 AI 진단을 위해서는 '업체 관리' 탭에서 매출, 신용점수, 아이템 설명 등을 더 상세히 기입해주세요.
                </p>
            </div>
        `;
    }
}

function backToInput(tab) {
    document.getElementById(tab + '-input-step').style.display = 'block';
    document.getElementById(tab + '-result-step').style.display = 'none';
}
