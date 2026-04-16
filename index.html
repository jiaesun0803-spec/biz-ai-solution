const DB_USERS   = 'biz_users';
const DB_SESSION = 'biz_session';
const STORAGE_KEY = 'biz_consult_companies';
const DB_REPORTS  = 'biz_reports';

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    const urlParams = new URLSearchParams(window.location.search);
    showTab(urlParams.get('tab') || 'dashboard', false);
    window.toggleCorpNumber(); window.toggleRentInputs(); window.toggleExportInputs();
});

/* ===== 인증 ===== */
window.devBypassLogin = function() {
    const testUser = { email:'test@biz.com', pw:'1234', name:'선지영', dept:'솔루션빌더스', apiKey:'' };
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    if (!users.find(u => u.email === testUser.email)) { users.push(testUser); localStorage.setItem(DB_USERS, JSON.stringify(users)); }
    localStorage.setItem(DB_SESSION, JSON.stringify(testUser));
    checkAuth();
};
function checkAuth() {
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    const authEl = document.getElementById('auth-container');
    const appEl  = document.getElementById('main-app');
    if (session) { authEl.style.display='none'; appEl.style.display='flex'; loadUserProfile(); updateDataLists(); initInputHandlers(); }
    else          { authEl.style.display='flex'; appEl.style.display='none'; }
}
window.toggleAuthMode = function(mode) {
    document.getElementById('login-form-area').style.display  = mode==='login'  ? 'block' : 'none';
    document.getElementById('signup-form-area').style.display = mode==='signup' ? 'block' : 'none';
};
window.handleSignup = function() {
    const email=document.getElementById('signup-email').value, pw=document.getElementById('signup-pw').value, name=document.getElementById('signup-name').value;
    if (!email||!pw||!name) { alert('모든 정보를 입력해주세요.'); return; }
    let users=JSON.parse(localStorage.getItem(DB_USERS)||'[]');
    if (users.find(u=>u.email===email)) { alert('이미 가입된 이메일입니다.'); return; }
    users.push({email,pw,name,dept:'솔루션빌더스',apiKey:''}); localStorage.setItem(DB_USERS,JSON.stringify(users));
    alert('회원가입 완료!'); toggleAuthMode('login');
};
window.handleLogin = function() {
    const email=document.getElementById('login-email').value, pw=document.getElementById('login-pw').value;
    const user=JSON.parse(localStorage.getItem(DB_USERS)||'[]').find(u=>u.email===email&&u.pw===pw);
    if (user) { localStorage.setItem(DB_SESSION,JSON.stringify(user)); checkAuth(); }
    else alert('이메일 또는 비밀번호가 일치하지 않습니다.');
};
window.handleLogout = function() { localStorage.removeItem(DB_SESSION); location.reload(); };

/* ===== 프로필 ===== */
function loadUserProfile() {
    const user=JSON.parse(localStorage.getItem(DB_SESSION)); if (!user) return;
    const setEl=(id,val)=>{const el=document.getElementById(id);if(el)el[el.tagName==='INPUT'?'value':'innerText']=val;};
    setEl('display-user-name',user.name); setEl('display-user-dept',user.dept||'솔루션빌더스');
    if(document.getElementById('set-user-name')){
        document.getElementById('set-user-name').value=user.name;
        document.getElementById('set-user-email').value=user.email;
        document.getElementById('set-user-dept').value=user.dept||'';
        document.getElementById('set-api-key').value=user.apiKey||'';
    }
}
function updateUserDB(u){let users=JSON.parse(localStorage.getItem(DB_USERS));const i=users.findIndex(x=>x.email===u.email);users[i]=u;localStorage.setItem(DB_USERS,JSON.stringify(users));localStorage.setItem(DB_SESSION,JSON.stringify(u));loadUserProfile();}
window.saveProfileSettings=function(){let s=JSON.parse(localStorage.getItem(DB_SESSION));s.name=document.getElementById('set-user-name').value;s.dept=document.getElementById('set-user-dept').value;updateUserDB(s);alert('저장되었습니다.');};
window.saveApiSettings=function(){let s=JSON.parse(localStorage.getItem(DB_SESSION));s.apiKey=document.getElementById('set-api-key').value;updateUserDB(s);alert('API 키가 저장되었습니다.');};

/* ===== 탭 이동 ===== */
window.showTab = function(tabId, updateUrl=true) {
    document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.menu li, .bottom-menu li').forEach(i=>i.classList.remove('active'));
    const target=document.getElementById(tabId); if(target) target.classList.add('active');
    const menu=document.getElementById('menu-'+tabId); if(menu) menu.classList.add('active');
    if(tabId==='settings') loadUserProfile();
    // 업체 관리 탭은 항상 목록 화면으로
    if(tabId==='company') showCompanyList();
    updateDataLists();
    if(updateUrl) history.pushState(null,'',`?tab=${tabId}`);
};
window.addEventListener('popstate',()=>{const p=new URLSearchParams(window.location.search);showTab(p.get('tab')||'dashboard',false);});

/* ===== ★ 업체 관리 - 목록/폼 전환 ===== */
window.showCompanyList = function() {
    document.getElementById('company-list-step').style.display = 'block';
    document.getElementById('company-form-step').style.display = 'none';
    renderCompanyCards();
    // 탭이 company가 아니면 전환
    const companyTab = document.getElementById('company');
    if (!companyTab.classList.contains('active')) showTab('company');
};

window.showCompanyForm = function(editName=null) {
    document.getElementById('company-list-step').style.display = 'none';
    document.getElementById('company-form-step').style.display = 'block';
    const titleEl = document.getElementById('company-form-title');
    if (editName) {
        if(titleEl) titleEl.textContent = `기업 정보 수정 - ${editName}`;
        // 폼 데이터 불러오기
        const comp = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]').find(c=>c.name===editName);
        if (comp?.rawData) {
            const els = document.querySelectorAll('#companyForm input,#companyForm select,#companyForm textarea');
            comp.rawData.forEach((d,i) => {
                if (els[i]) {
                    if (els[i].type==='checkbox'||els[i].type==='radio') els[i].checked=d.checked;
                    else els[i].value=d.value;
                }
            });
            calculateTotalDebt(); toggleCorpNumber(); toggleRentInputs(); toggleExportInputs();
        }
    } else {
        if(titleEl) titleEl.textContent = '기업 정보 등록';
    }
    // 탭이 company가 아니면 전환
    const companyTab = document.getElementById('company');
    if (!companyTab.classList.contains('active')) {
        document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
        document.querySelectorAll('.menu li, .bottom-menu li').forEach(i=>i.classList.remove('active'));
        companyTab.classList.add('active');
        const menu = document.getElementById('menu-company');
        if(menu) menu.classList.add('active');
    }
};

/* ===== ★ 업체 카드 렌더링 ===== */
function formatSmallCurrency(n) {
    if (!n || n === 0) return '-';
    const num = parseInt(n, 10); if (isNaN(num) || num === 0) return '-';
    const uk = Math.floor(num / 10000), man = num % 10000;
    if (uk > 0) return uk + '억' + (man > 0 ? ' ' + man.toLocaleString() + '만원' : '원');
    return man.toLocaleString() + '만원';
}
function getGradeFromKCB(score) {
    const s = parseInt(score, 10);
    if (isNaN(s) || s === 0) return null;
    if (s >= 900) return '1등급'; if (s >= 850) return '2등급';
    if (s >= 800) return '3등급'; if (s >= 750) return '4등급';
    if (s >= 700) return '5등급'; return '6등급+';
}

window.renderCompanyCards = function() {
    const container = document.getElementById('company-cards-container'); if (!container) return;
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const reports   = JSON.parse(localStorage.getItem(DB_REPORTS)  || '[]');
    const keyword   = (document.getElementById('company-search-input')?.value || '').toLowerCase();

    const filtered = companies.filter(c =>
        c.name.toLowerCase().includes(keyword) || (c.industry||'').toLowerCase().includes(keyword)
    );

    if (!filtered.length) {
        container.innerHTML = `
            <div class="company-empty-state">
                <div class="empty-icon">🏢</div>
                <p>${keyword ? '검색 결과가 없습니다.' : '등록된 업체가 없습니다.'}</p>
                <button class="btn-add-company" onclick="showCompanyForm()">＋ 업체 등록하기</button>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(c => {
        // 주소 추출 (rawData에서 사업장 주소 텍스트)
        let address = '주소 미입력';
        if (c.rawData) {
            const addrEl = c.rawData.find(d =>
                d.type === 'text' && d.value && d.value.length > 3 &&
                d.value !== c.name && d.value !== c.rep && d.value !== c.bizNum &&
                d.value !== c.industry && d.value !== c.bizDate && d.value !== c.empCount &&
                d.value !== c.coreItem && !d.value.match(/^\d{2,3}-/) &&
                (d.value.includes('시') || d.value.includes('구') || d.value.includes('동') || d.value.includes('로') || d.value.includes('길'))
            );
            if (addrEl) address = addrEl.value;
        }

        return `
        <div class="company-card">
            <div class="company-card-top">
                <div class="company-card-icon">🏢</div>
                <div class="company-card-info">
                    <div class="company-card-name">${c.name}</div>
                    <div class="company-card-rep">${c.rep && c.rep !== '-' ? c.rep + ' 대표' : '대표자 미입력'}</div>
                </div>
                <div class="company-card-actions">
                    <button class="btn-card-detail" title="수정/상세보기" onclick="showCompanyForm('${c.name}')">›</button>
                    <button class="btn-card-delete" title="삭제" onclick="deleteCompany('${c.name}')">🗑</button>
                </div>
            </div>
            <div class="company-card-body">
                <div class="company-card-row">
                    <span class="company-card-label">업종</span>
                    <span class="company-card-value">${c.industry && c.industry !== '-' ? c.industry : '미입력'}</span>
                </div>
                <div class="company-card-row">
                    <span class="company-card-label">주소</span>
                    <span class="company-card-value addr">${address}</span>
                </div>
            </div>
        </div>`;
    }).join('');
};

/* ===== 업체 삭제 ===== */
window.deleteCompany = function(name) {
    if (!confirm(`[${name}]을 삭제하시겠습니까?\n관련 보고서는 삭제되지 않습니다.`)) return;
    let companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    companies = companies.filter(c => c.name !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    updateDataLists();
    renderCompanyCards();
};

/* ===== 대시보드 최근 보고서 ===== */
function updateDashboardReports() {
    const listEl = document.getElementById('dashboard-report-list'); if (!listEl) return;
    const reports   = JSON.parse(localStorage.getItem(DB_REPORTS)  || '[]');
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const setNum = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
    setNum('stat-companies', companies.length);
    setNum('stat-mgmt',  reports.filter(r=>r.type==='경영진단').length);
    setNum('stat-biz',   reports.filter(r=>r.type==='사업계획서').length);
    setNum('stat-total', reports.length);
    if (!reports.length) { listEl.innerHTML='<div class="empty-state">최근 생성된 보고서가 없습니다.</div>'; return; }
    const typeIcon = t => ({'경영진단':'📈','재무진단':'💰','사업계획서':'💡','정책자금매칭':'🎯','상권분석':'🏪','마케팅제안':'📢'}[t]||'📄');
    listEl.innerHTML = [...reports].reverse().slice(0,5).map(r=>`
        <div class="recent-report-item">
            <div class="report-type-icon">${typeIcon(r.type)}</div>
            <div>
                <div class="report-item-title">${r.title}</div>
                <div class="report-item-company">${r.company}</div>
            </div>
            <div class="report-item-right">
                <span class="report-badge">${r.type}</span>
                <span class="report-date">🕐 ${r.date}</span>
                <button class="btn-small-outline" style="font-size:11px;padding:4px 8px;" onclick="viewReport('${r.id}')">보기</button>
            </div>
        </div>`).join('');
}

/* ===== 데이터 목록 갱신 ===== */
window.updateDataLists = function() {
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const reports   = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
    document.querySelectorAll('.company-dropdown').forEach(sel=>{
        sel.innerHTML='<option value="">기업을 선택하세요</option>';
        companies.forEach(c=>sel.innerHTML+=`<option value="${c.name}">${c.name}</option>`);
    });
    const cBody=document.getElementById('company-list-body');
    if(cBody) cBody.innerHTML=companies.length?companies.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.rep||'-'}</td><td>${c.bizNum||'-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="showCompanyForm('${c.name}')">수정/보기</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">등록된 기업이 없습니다.</td></tr>';
    const rBody=document.getElementById('report-list-body');
    if(rBody) rBody.innerHTML=reports.length?reports.map(r=>`
        <tr>
            <td><span style="background:#eff6ff;color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${r.type}</span></td>
            <td><strong>${r.company}</strong></td><td>${r.title}</td><td>${r.date}</td>
            <td style="white-space:nowrap;">
                <button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button>
                <button class="btn-delete" style="margin-left:6px;" onclick="deleteReport('${r.id}')">삭제</button>
            </td>
        </tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">생성된 보고서가 없습니다.</td></tr>';
    updateDashboardReports();
    renderCompanyCards();
};

window.deleteReport = function(id) {
    if (!confirm('이 보고서를 삭제하시겠습니까?')) return;
    let reports = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
    reports = reports.filter(r=>r.id!==id);
    localStorage.setItem(DB_REPORTS,JSON.stringify(reports));
    updateDataLists();
};

/* ===== 기업 저장 ===== */
window.clearCompanyForm = function() { if(confirm('초기화하시겠습니까?')){ document.getElementById('companyForm').reset(); calculateTotalDebt(); toggleCorpNumber(); toggleRentInputs(); toggleExportInputs(); } };
window.saveCompanyData = function() {
    const name=document.getElementById('comp_name')?.value; if(!name){ alert('상호명을 입력해주세요.'); return; }
    const rev={
        cur:parseInt(document.getElementById('rev_cur')?.value?.replace(/,/g,'')||0),
        y25:parseInt(document.getElementById('rev_25')?.value?.replace(/,/g,'')||0),
        y24:parseInt(document.getElementById('rev_24')?.value?.replace(/,/g,'')||0),
        y23:parseInt(document.getElementById('rev_23')?.value?.replace(/,/g,'')||0)
    };
    const newC={
        name, rep:document.querySelector('input[placeholder="대표자명을 입력하세요"]')?.value||'-',
        bizNum:document.getElementById('biz_number')?.value||'-', industry:document.getElementById('comp_industry')?.value||'-',
        bizDate:document.getElementById('biz_date')?.value||'-', empCount:document.getElementById('emp_count')?.value||'-',
        coreItem:document.getElementById('core_item')?.value||'-', date:new Date().toISOString().split('T')[0],
        revenueData:rev,
        rawData:Array.from(document.querySelectorAll('#companyForm input,#companyForm select,#companyForm textarea')).map(el=>({type:el.type,value:el.value,checked:el.checked}))
    };
    let companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const idx=companies.findIndex(c=>c.name===name);
    if(idx>-1) companies[idx]=newC; else companies.push(newC);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(companies));
    alert('기업 정보가 저장되었습니다!');
    updateDataLists();
    showCompanyList(); // ★ 저장 후 목록으로 이동 ★
};

/* ===== 입력 토글/계산 ===== */
window.toggleExportInputs=function(){const isExp=[...document.getElementsByName('export')].some(r=>r.checked&&r.value==='수출중');document.querySelectorAll('.export-money').forEach(i=>{i.disabled=!isExp;if(!isExp)i.value='';});};
window.toggleCorpNumber=function(){const isC=[...document.getElementsByName('biz_type')].some(r=>r.checked&&r.value==='법인');const el=document.getElementById('corp_number');if(el){el.disabled=!isC;if(!isC)el.value='';}};
window.toggleRentInputs=function(){const isR=[...document.getElementsByName('rent_type')].some(r=>r.checked&&r.value==='임대');['rent_deposit','rent_monthly'].forEach(id=>{const el=document.getElementById(id);if(el){el.disabled=!isR;if(!isR)el.value='';}});};
window.calculateTotalDebt=function(){let tot=0;document.querySelectorAll('.debt-input').forEach(i=>{let v=i.value.replace(/[^0-9]/g,'');if(v)tot+=parseInt(v);});const el=document.getElementById('total-debt');if(el)el.innerText=tot.toLocaleString('ko-KR');};

/* ===== 입력 포매터 ===== */
function initInputHandlers(){
    document.querySelectorAll('.number-only').forEach(i=>i.addEventListener('input',function(){this.value=this.value.replace(/[^0-9]/g,'');}));
    document.querySelectorAll('.money-format').forEach(i=>i.addEventListener('input',function(){let v=this.value.replace(/[^0-9\-]/g,'');this.value=v.replace(/\B(?=(\d{3})+(?!\d))/g,',');}));
    document.querySelectorAll('.debt-input').forEach(i=>i.addEventListener('input',calculateTotalDebt));
    [['biz_number','biz'],['corp_number','corp'],['biz_date','date'],['rep_birth','date'],['write_date','date']].forEach(([id,fmt])=>{
        const el=document.getElementById(id);if(!el)return;
        el.addEventListener('input',function(){let v=this.value.replace(/[^0-9]/g,'');
            if(fmt==='corp'){this.value=v.length<7?v:v.slice(0,6)+'-'+v.slice(6,13);}
            else if(fmt==='biz'){if(v.length<4)this.value=v;else if(v.length<6)this.value=v.slice(0,3)+'-'+v.slice(3);else this.value=v.slice(0,3)+'-'+v.slice(3,5)+'-'+v.slice(5,10);}
            else{if(v.length<5)this.value=v;else if(v.length<7)this.value=v.slice(0,4)+'-'+v.slice(4);else this.value=v.slice(0,4)+'-'+v.slice(4,6)+'-'+v.slice(6,8);}
        });
    });
    ['biz_phone','rep_phone'].forEach(id=>{
        const el=document.getElementById(id);if(!el)return;
        el.addEventListener('input',function(){let v=this.value.replace(/[^0-9]/g,'');
            if(v.startsWith('02')){if(v.length<3)this.value=v;else if(v.length<6)this.value=v.slice(0,2)+'-'+v.slice(2);else if(v.length<10)this.value=v.slice(0,2)+'-'+v.slice(2,5)+'-'+v.slice(5);else this.value=v.slice(0,2)+'-'+v.slice(2,6)+'-'+v.slice(6,10);}
            else{if(v.length<4)this.value=v;else if(v.length<7)this.value=v.slice(0,3)+'-'+v.slice(3);else if(v.length<11)this.value=v.slice(0,3)+'-'+v.slice(3,6)+'-'+v.slice(6);else this.value=v.slice(0,3)+'-'+v.slice(3,7)+'-'+v.slice(7,11);}
        });
    });
}

/* ===== 한글 금액 변환 ===== */
function formatKoreanCurrency(n){
    const num=parseInt(n,10);if(!num||isNaN(num))return'0원';
    const uk=Math.floor(num/10000),man=num%10000;
    if(uk>0)return uk.toLocaleString('ko-KR')+'억'+(man>0?' '+man.toLocaleString('ko-KR')+'만원':'원');
    return man.toLocaleString('ko-KR')+'만원';
}
function formatRevenueForAI(companyData,rev){
    const regMonth=parseInt((companyData.date||'').split('-')[1])||1;
    const months=Math.max(regMonth-1,1);
    const expectedCur=Math.round(((rev.cur||0)/months)*12);
    return{금년매출_전월말기준:formatKoreanCurrency(rev.cur),금년예상연간매출:formatKoreanCurrency(expectedCur)+` (${months}개월 기준 연간 환산)`,매출_2025년:formatKoreanCurrency(rev.y25),매출_2024년:formatKoreanCurrency(rev.y24),매출_2023년:formatKoreanCurrency(rev.y23),_raw:rev,_expected:expectedCur,_months:months};
}

/* ===== Gemini API ===== */
async function callGeminiAPI(prompt){
    const session=JSON.parse(localStorage.getItem('biz_session'));
    const apiKey=session?.apiKey;
    if(!apiKey){alert('설정 탭에서 Gemini API 키를 등록해주세요.');showTab('settings');return null;}
    try{
        const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.7,topK:40,topP:0.95,maxOutputTokens:8192}})});
        const data=await res.json();
        if(!res.ok||data.error)throw new Error(data.error?.message||'API 에러');
        return data.candidates[0].content.parts[0].text;
    }catch(e){console.error(e);alert('오류: '+e.message);return null;}
}

function cleanAIResponse(raw){
    let html=raw.replace(/```html|```/g,'').replace(/\*\*/g,'');
    const firstSectionIdx=html.indexOf('<div class="report-section-box">');
    if(firstSectionIdx>0) html=html.slice(firstSectionIdx);
    return html;
}

const COMMON_RULES=`
[★ 출력 형식 규칙 ★]
- 각 목차는 <div class="report-section-box">로 감쌀 것
- 제목은 <h3>, 내용은 <ul><li>
- li 최소 30자, 금액은 한글로, 개조식 문체, 표/마크다운 금지
- 첫 번째 목차 앞에 인사말 등 어떠한 텍스트도 출력하지 말 것
`;

/* ===== 표지 HTML ===== */
function buildCoverHTML(companyData,config,rev,dateStr){
    const session=JSON.parse(localStorage.getItem(DB_SESSION));
    const cName=session?.name||'담당자', cDept=session?.dept||'솔루션빌더스';
    const safeRev=rev||{cur:0,y25:0,y24:0,y23:0};
    const regMonth=parseInt((companyData.date||dateStr).split('-')[1])||1;
    const months=Math.max(regMonth-1,1);
    const expectedCur=Math.round((safeRev.cur/months)*12);
    const vLabel=config.version==='client'?'기업전달용':'컨설턴트용';
    return`<div class="cover-page" style="border-left-color:${config.borderColor||'#3b82f6'};">
        <div class="cover-header">
            <h4 style="color:${config.borderColor||'#3b82f6'};border-bottom-color:${config.borderColor||'#3b82f6'};">${config.reportKind||'AI 리포트'}</h4>
            <h1>${config.title}</h1>
        </div>
        <div class="cover-middle">
            <h2>${companyData.name} <span style="font-size:18px;color:#94a3b8;">(${vLabel})</span></h2>
            <div class="cover-table"><table>
                <tr><th>사업자번호</th><td>${companyData.bizNum||'-'}</td><th>업종</th><td>${companyData.industry||'-'}</td></tr>
                <tr><th>대표자명</th><td>${companyData.rep||'-'}</td><th>핵심아이템</th><td>${companyData.coreItem||'-'}</td></tr>
                <tr><th>설립일</th><td>${companyData.bizDate||'-'}</td><th>상시근로자</th><td>${companyData.empCount||'-'}명</td></tr>
                <tr><th>전년도 매출</th><td>${formatKoreanCurrency(safeRev.y25)}</td><th>금년 예상 매출</th><td>${formatKoreanCurrency(expectedCur)}</td></tr>
            </table></div>
        </div>
        <div class="cover-footer">
            <div>📅 작성일: ${dateStr}</div><div>👤 담당자: ${cName}</div><div>🏢 소속: ${cDept}</div>
        </div>
    </div>`;
}

function buildCompanyOverviewTable(companyData,rev){
    const safeRev=rev||{};
    const months=Math.max((parseInt((companyData.date||'').split('-')[1])||1)-1,1);
    const exp=Math.round(((safeRev.cur||0)/months)*12);
    return`<table class="overview-company-table">
        <tr><th>기업명</th><td>${companyData.name}</td><th>업종</th><td>${companyData.industry||'-'}</td></tr>
        <tr><th>대표자</th><td>${companyData.rep||'-'}</td><th>설립일</th><td>${companyData.bizDate||'-'}</td></tr>
        <tr><th>사업자번호</th><td>${companyData.bizNum||'-'}</td><th>상시근로자</th><td>${companyData.empCount||'-'}명</td></tr>
        <tr><th>전년도 매출 (25년)</th><td>${formatKoreanCurrency(safeRev.y25)}</td><th>금년 예상 매출</th><td>${formatKoreanCurrency(exp)}</td></tr>
    </table>`;
}

/* ===== 경영진단 렌더링 ===== */
function renderManagementReport(companyData,cleanHTML,version,rev,dateStr){
    const contentArea=document.getElementById('report-content-area');
    const safeRev=rev||{cur:0,y25:0,y24:0,y23:0};
    const months=Math.max((parseInt((companyData.date||dateStr).split('-')[1])||1)-1,1);
    const expectedCur=Math.round((safeRev.cur/months)*12);
    cleanHTML=cleanHTML.replace(/(<h3[^>]*>[^<]*경영진단[^<]*개요[^<]*<\/h3>)/,`$1\n${buildCompanyOverviewTable(companyData,safeRev)}`);
    const pos1=cleanHTML.indexOf('경영진단');
    if(pos1>-1){const ulClose=cleanHTML.indexOf('</ul>',pos1);if(ulClose>-1)cleanHTML=cleanHTML.slice(0,ulClose+5)+'\n<div class="chart-container"><div class="chart-box"><canvas id="report-radar-chart"></canvas></div></div>\n'+cleanHTML.slice(ulClose+5);}
    cleanHTML=cleanHTML.replace(/(<h3[^>]*>[^<]*재무[^<]*현황[^<]*<\/h3>)/,`$1\n<div class="chart-container"><div class="chart-box"><canvas id="report-bar-chart"></canvas></div></div>`);
    const vLabel=version==='client'?'기업의 현재 역량 분석 및 맞춤형 성장 전략 제안':'내부 리스크 진단 및 컨설턴트 피드백 포함 자료';
    const coverCfg={title:'AI 경영진단보고서',reportKind:'AI 경영진단보고서 리포트',version,borderColor:'#3b82f6'};
    contentArea.innerHTML=`<div class="paper-inner">${buildCoverHTML(companyData,coverCfg,safeRev,dateStr)}${cleanHTML}<div class="alert-box ${version==='client'?'blue':'green'}">★ 본 리포트는 AI 컨설턴트가 분석한 ${vLabel} 자료입니다.</div></div>`;
    setTimeout(()=>{
        const radarEl=document.getElementById('report-radar-chart');
        if(radarEl)new Chart(radarEl.getContext('2d'),{type:'radar',data:{labels:['재무건전성','전략/마케팅','인사/조직','운영/생산','IT/디지털'],datasets:[{label:'기업 역량 진단',data:[65,80,72,68,55],backgroundColor:'rgba(59,130,246,0.2)',borderColor:'#3b82f6',pointBackgroundColor:'#1e3a8a',pointRadius:4}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});
        const lineEl=document.getElementById('report-bar-chart');
        if(lineEl)new Chart(lineEl.getContext('2d'),{type:'line',data:{labels:['23년도','24년도','25년도','금년(예상)'],datasets:[{label:'매출 추이',data:[safeRev.y23,safeRev.y24,safeRev.y25,expectedCur],borderColor:'rgba(22,163,74,1)',backgroundColor:'rgba(22,163,74,0.15)',borderWidth:2,pointRadius:4,fill:true,tension:0.1}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>v>=10000?Math.floor(v/10000)+'억':v.toLocaleString('ko-KR')+'만'}}}}});
    },100);
}

function renderGenericReport(contentAreaId,companyData,cleanHTML,config,rev,dateStr){
    const contentArea=document.getElementById(contentAreaId);if(!contentArea)return;
    const safeRev=rev||{cur:0,y25:0,y24:0,y23:0};
    const vLabel=config.version==='client'?'기업의 현황 분석 및 맞춤형 전략 제안':'내부 리스크 진단 및 보완 액션 플랜';
    contentArea.innerHTML=`<div class="paper-inner">${buildCoverHTML(companyData,config,safeRev,dateStr)}${cleanHTML}<div class="alert-box ${config.version==='client'?'blue':'green'}">★ 본 리포트는 AI 컨설턴트가 분석한 ${config.title} 자료입니다. (${vLabel})</div></div>`;
}

/* ===== 경영진단 생성 ===== */
window.generateReport=async function(type,version,event){
    const tab=event.target.closest('.tab-content');
    const companyName=tab.querySelector('.company-dropdown').value;
    if(!companyName){alert('기업을 선택해주세요.');return;}
    const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const companyData=companies.find(c=>c.name===companyName);
    const rev=companyData.revenueData||{y23:0,y24:0,y25:0,cur:0};
    const fRev=formatRevenueForAI(companyData,rev);
    document.getElementById('ai-loading-overlay').style.display='flex';
    const promptData={...companyData};delete promptData.rawData;delete promptData.revenueData;promptData.매출데이터=fRev;
    const consultantFeedbackRule=version==='consultant'?`
[★ 컨설턴트용 추가 규칙 ★]
각 섹션의 <ul> 작성 후 반드시 아래 피드백 박스를 추가:
<div class="consultant-feedback-box"><h4>🔍 컨설턴트 피드백</h4><ul>
<li>[문제점/리스크] 50자 이상 서술</li>
<li>[해결방안] 50자 이상 서술</li>
<li>[향후 방향] 50자 이상 서술</li>
</ul></div>`:'';
    const prompt=`너의 역할은 20년 경력의 경영 컨설턴트야. 대상: '${companyData.name}'
[진단 가중치] 1.경영진단개요(3~4) 2.재무현황(15%,3~4개) 3.전략마케팅(25%,6~8개) 4.인사조직(20%,5~6개) 5.운영생산(20%,5~6개) 6.IT/정부지원(20%,각2~3개) 7.개선방향(5~6개)
${COMMON_RULES}${consultantFeedbackRule}
출력목적: ${version==='client'?'긍정적/객관적(기업전달용)':'컨설턴트용-피드백포함'}
[기업데이터] ${JSON.stringify(promptData,null,2)}`;
    const aiResponse=await callGeminiAPI(prompt);
    document.getElementById('ai-loading-overlay').style.display='none';
    if(aiResponse){
        let cleanHTML=cleanAIResponse(aiResponse);
        const todayStr=new Date().toISOString().split('T')[0];
        const reportObj={id:'rep_'+Date.now(),type:'경영진단',company:companyData.name,title:`AI 경영진단보고서 (${version==='client'?'기업전달용':'컨설턴트용'})`,date:todayStr,content:cleanHTML,version,revenueData:rev,reportType:'management'};
        const reports=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');reports.push(reportObj);localStorage.setItem(DB_REPORTS,JSON.stringify(reports));
        updateDataLists();
        tab.querySelector('[id$="-input-step"]').style.display='none';
        tab.querySelector('[id$="-result-step"]').style.display='block';
        renderManagementReport(companyData,cleanHTML,version,rev,todayStr);
    }
};

const REPORT_CONFIGS={
    finance:{typeLabel:'재무진단',title:'AI 상세 재무진단',reportKind:'AI 상세 재무진단 리포트',borderColor:'#2563eb',contentAreaId:'finance-content-area',buildPrompt:(cData,fRev,version)=>`너는 공인회계사급 재무 전문 컨설턴트야. 대상: '${cData.name}'\n5개섹션: 1.재무개요(3~4) 2.수익성분석(5~6) 3.안정성분석(5~6) 4.성장성분석(4~5) 5.재무개선방향(5~6)\n${COMMON_RULES}출력목적: ${version==='client'?'기업전달용':'컨설턴트용'}\n[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`},
    aiBiz:{typeLabel:'사업계획서',title:'AI 사업계획서',reportKind:'AI 맞춤형 사업계획서',borderColor:'#16a34a',contentAreaId:'aiBiz-content-area',buildPrompt:(cData,fRev,version)=>`너는 창업·사업기획 전문 컨설턴트야. 대상: '${cData.name}'\n7개섹션: 1.사업개요(3~4) 2.시장분석(5~6) 3.제품/서비스(5~6) 4.마케팅전략(6~7) 5.운영계획(4~5) 6.재무계획(4~5) 7.실행로드맵(4~5)\n${COMMON_RULES}출력목적: ${version==='client'?'정식제출용':'초안/검토본'}\n[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`},
    aiFund:{typeLabel:'정책자금매칭',title:'AI 정책자금매칭',reportKind:'AI 정책자금 매칭 리포트',borderColor:'#ea580c',contentAreaId:'aiFund-content-area',buildPrompt:(cData,fRev,version)=>`너는 중소기업 정책자금 전문 컨설턴트야. 대상: '${cData.name}'\n5개섹션: 1.기업자격요건분석(4~5) 2.자금필요성(3~4) 3.추천정책자금TOP5(각3~4줄) 4.기관별신청전략(5~6) 5.신청준비체크리스트(6~8)\n${COMMON_RULES}출력목적: ${version==='client'?'기업전달용':'컨설턴트용'}\n[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`},
    aiTrade:{typeLabel:'상권분석',title:'AI 상권분석 리포트',reportKind:'AI 빅데이터 상권분석',borderColor:'#0d9488',contentAreaId:'aiTrade-content-area',buildPrompt:(cData,fRev,version)=>`너는 상권분석 전문 컨설턴트야. 대상: '${cData.name}' (업종:${cData.industry||'미입력'})\n5개섹션: 1.상권개요및입지분석(4~5) 2.유동인구및타겟(5~6) 3.경쟁현황및포지셔닝(5~6) 4.상권성장성및리스크(4~5) 5.매출예측및운영전략(5~6)\n${COMMON_RULES}출력목적: ${version==='client'?'기업전달용':'컨설턴트용'}\n[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`},
    aiMarketing:{typeLabel:'마케팅제안',title:'AI 마케팅 제안서',reportKind:'AI 맞춤형 마케팅 제안서',borderColor:'#db2777',contentAreaId:'aiMarketing-content-area',buildPrompt:(cData,fRev,version)=>`너는 디지털 마케팅 전문 컨설턴트야. 대상: '${cData.name}'\n6개섹션: 1.마케팅현황진단(4~5) 2.타겟고객설정(5~6) 3.채널별마케팅전략(6~8) 4.콘텐츠및브랜딩전략(5~6) 5.마케팅예산계획(4~5) 6.월별실행로드맵(6항목)\n${COMMON_RULES}출력목적: ${version==='client'?'기업전달용':'컨설턴트용'}\n[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`}
};

window.generateAnyReport=async function(type,version,event){
    const tab=event.target.closest('.tab-content');
    const companyName=tab.querySelector('.company-dropdown').value;
    if(!companyName){alert('기업을 선택해주세요.');return;}
    const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const companyData=companies.find(c=>c.name===companyName);
    const rev=companyData.revenueData||{y23:0,y24:0,y25:0,cur:0};
    const fRev=formatRevenueForAI(companyData,rev);
    const cfg=REPORT_CONFIGS[type];if(!cfg)return;
    document.getElementById('ai-loading-overlay').style.display='flex';
    const aiResponse=await callGeminiAPI(cfg.buildPrompt(companyData,fRev,version));
    document.getElementById('ai-loading-overlay').style.display='none';
    if(aiResponse){
        let cleanHTML=cleanAIResponse(aiResponse);
        const todayStr=new Date().toISOString().split('T')[0];
        const vLabel=version==='client'?'기업전달용':'컨설턴트용';
        const reportObj={id:'rep_'+Date.now(),type:cfg.typeLabel,company:companyData.name,title:`${cfg.title} (${vLabel})`,date:todayStr,content:cleanHTML,version,revenueData:rev,reportType:type,contentAreaId:cfg.contentAreaId};
        const reports=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');reports.push(reportObj);localStorage.setItem(DB_REPORTS,JSON.stringify(reports));
        updateDataLists();
        tab.querySelector('[id$="-input-step"]').style.display='none';
        tab.querySelector('[id$="-result-step"]').style.display='block';
        renderGenericReport(cfg.contentAreaId,companyData,cleanHTML,{...cfg,version},rev,todayStr);
    }
};

window.viewReport=function(id){
    const r=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]').find(x=>x.id===id);if(!r)return;
    const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const companyData=companies.find(c=>c.name===r.company)||{name:r.company};
    const rev=r.revenueData||{cur:0,y25:0,y24:0,y23:0};
    const type=r.reportType||'management';
    if(type==='management'){
        showTab('report');
        document.getElementById('report-input-step').style.display='none';
        document.getElementById('report-result-step').style.display='block';
        renderManagementReport(companyData,r.content,r.version,rev,r.date);
    }else{
        const cfg=REPORT_CONFIGS[type];if(!cfg)return;
        const tabId=cfg.contentAreaId.replace('-content-area','');
        showTab(tabId);
        document.getElementById(tabId+'-input-step').style.display='none';
        document.getElementById(tabId+'-result-step').style.display='block';
        renderGenericReport(cfg.contentAreaId,companyData,r.content,{...cfg,version:r.version},rev,r.date);
    }
};

window.backToInput=function(tab){
    document.getElementById(tab+'-input-step').style.display='block';
    document.getElementById(tab+'-result-step').style.display='none';
};
