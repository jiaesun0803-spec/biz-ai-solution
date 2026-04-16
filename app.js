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
    updateDataLists();
    if(updateUrl) history.pushState(null,'',`?tab=${tabId}`);
};
window.addEventListener('popstate',()=>{const p=new URLSearchParams(window.location.search);showTab(p.get('tab')||'dashboard',false);});

/* ===== 대시보드 최근 보고서 ===== */
function updateDashboardReports() {
    const listEl=document.getElementById('dashboard-report-list'); if(!listEl) return;
    const reports=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
    if(!reports.length){listEl.innerHTML='<li style="display:flex;justify-content:center;padding:40px 0;color:#94a3b8;">최근 생성된 보고서가 없습니다.</li>';return;}
    listEl.innerHTML=[...reports].reverse().slice(0,5).map(r=>`
        <li style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f1f5f9;">
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="background:#eff6ff;color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${r.type}</span>
                <span style="font-size:15px;color:#1e293b;font-weight:bold;">${r.company}</span>
                <span style="font-size:13px;color:#64748b;">${r.title}</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:13px;color:#94a3b8;">${r.date}</span>
                <button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button>
            </div>
        </li>`).join('');
}

/* ===== 데이터 목록 갱신 ===== */
window.updateDataLists = function() {
    const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const reports=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
    document.querySelectorAll('.company-dropdown').forEach(sel=>{
        sel.innerHTML='<option value="">기업을 선택하세요</option>';
        companies.forEach(c=>sel.innerHTML+=`<option value="${c.name}">${c.name}</option>`);
    });
    const loadSel=document.getElementById('load-company-select');
    if(loadSel){loadSel.innerHTML='<option value="">기존 기업 불러오기</option>';companies.forEach(c=>loadSel.innerHTML+=`<option value="${c.name}">${c.name}</option>`);}
    const cBody=document.getElementById('company-list-body');
    if(cBody) cBody.innerHTML=companies.length?companies.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.rep||'-'}</td><td>${c.bizNum||'-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="editCompany('${c.name}')">수정/보기</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">등록된 기업이 없습니다.</td></tr>';
    const rBody=document.getElementById('report-list-body');
    if(rBody) rBody.innerHTML=reports.length?reports.map(r=>`<tr><td><span style="background:#eff6ff;color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${r.type}</span></td><td><strong>${r.company}</strong></td><td>${r.title}</td><td>${r.date}</td><td><button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">생성된 보고서가 없습니다.</td></tr>';
    updateDashboardReports();
};

/* ===== 기업 저장/불러오기 ===== */
window.clearCompanyForm=function(){if(confirm('초기화하시겠습니까?')){document.getElementById('companyForm').reset();calculateTotalDebt();toggleCorpNumber();toggleRentInputs();toggleExportInputs();}};
window.loadSelectedCompany=function(name){if(!name)return;editCompany(name);document.getElementById('load-company-select').value='';};
window.saveCompanyData=function(){
    const name=document.getElementById('comp_name')?.value; if(!name){alert('상호명을 입력해주세요.');return;}
    const rev={cur:parseInt(document.getElementById('rev_cur')?.value?.replace(/,/g,'')||0),y25:parseInt(document.getElementById('rev_25')?.value?.replace(/,/g,'')||0),y24:parseInt(document.getElementById('rev_24')?.value?.replace(/,/g,'')||0),y23:parseInt(document.getElementById('rev_23')?.value?.replace(/,/g,'')||0)};
    const newC={name,rep:document.querySelector('input[placeholder="대표자명을 입력하세요"]')?.value||'-',bizNum:document.getElementById('biz_number')?.value||'-',industry:document.getElementById('comp_industry')?.value||'-',bizDate:document.getElementById('biz_date')?.value||'-',empCount:document.getElementById('emp_count')?.value||'-',coreItem:document.getElementById('core_item')?.value||'-',date:new Date().toISOString().split('T')[0],revenueData:rev,rawData:Array.from(document.querySelectorAll('#companyForm input,#companyForm select,#companyForm textarea')).map(el=>({type:el.type,value:el.value,checked:el.checked}))};
    let companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const idx=companies.findIndex(c=>c.name===name);
    if(idx>-1)companies[idx]=newC;else companies.push(newC);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(companies));alert('기업 정보가 저장되었습니다!');updateDataLists();showTab('reportList');
};
window.editCompany=function(name){
    const comp=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]').find(c=>c.name===name);
    if(comp?.rawData){const els=document.querySelectorAll('#companyForm input,#companyForm select,#companyForm textarea');comp.rawData.forEach((d,i)=>{if(els[i]){if(els[i].type==='checkbox'||els[i].type==='radio')els[i].checked=d.checked;else els[i].value=d.value;}});calculateTotalDebt();toggleCorpNumber();toggleRentInputs();toggleExportInputs();showTab('company');alert(`[${name}] 정보를 불러왔습니다.`);}else alert('저장된 데이터가 없습니다.');
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

/* =========================================
   ★ AI 응답 정리 함수
   - 마크다운/코드블록 제거
   - 인사말·소개문 등 섹션박스 앞 텍스트 완전 제거
========================================= */
function cleanAIResponse(raw) {
    // 1. 마크다운 코드블록 및 볼드 제거
    let html = raw.replace(/```html|```/g, '').replace(/\*\*/g, '');

    // 2. ★ 첫 번째 <div class="report-section-box"> 이전의 모든 텍스트 제거
    //    (AI가 생성하는 인사말, 소개문, <p>태그 등 모두 제거)
    const firstSectionIdx = html.indexOf('<div class="report-section-box">');
    if (firstSectionIdx > 0) {
        html = html.slice(firstSectionIdx);
    }

    // 3. 섹션박스 사이에 혹시 남은 단독 <p> 인사문 제거
    //    (섹션박스 닫힘 태그 이후, 다음 섹션박스 열림 태그 이전의 <p>태그 제거)
    html = html.replace(/<\/div>\s*<p[^>]*>[\s\S]*?<\/p>\s*(?=<div[^>]*report-section-box)/g, '</div>');

    return html;
}

/* ===== 표지 HTML ===== */
function buildCoverHTML(companyData,config,rev,dateStr){
    const session=JSON.parse(localStorage.getItem(DB_SESSION));
    const cName=session?.name||'담당자',cDept=session?.dept||'솔루션빌더스';
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
                <tr><th>전년도 매출</th><td>${formatKoreanCurrency(safeRev.y24)}</td><th>금년 예상 매출</th><td>${formatKoreanCurrency(expectedCur)}<span style="display:block;font-size:11px;color:#64748b;">(${months}개월 기준 연간 환산)</span></td></tr>
            </table></div>
        </div>
        <div class="cover-footer">
            <div>📅 작성일: ${dateStr}</div>
            <div>👤 담당자: ${cName}</div>
            <div>🏢 소속: ${cDept}</div>
        </div>
    </div>`;
}

/* ===== 기업현황표 ===== */
function buildCompanyOverviewTable(companyData,rev){
    const safeRev=rev||{};
    const months=Math.max((parseInt((companyData.date||'').split('-')[1])||1)-1,1);
    const exp=Math.round(((safeRev.cur||0)/months)*12);
    return`<table class="overview-company-table">
        <tr><th>기업명</th><td>${companyData.name}</td><th>업종</th><td>${companyData.industry||'-'}</td></tr>
        <tr><th>대표자</th><td>${companyData.rep||'-'}</td><th>설립일</th><td>${companyData.bizDate||'-'}</td></tr>
        <tr><th>사업자번호</th><td>${companyData.bizNum||'-'}</td><th>상시근로자</th><td>${companyData.empCount||'-'}명</td></tr>
        <tr><th>전년도 매출</th><td>${formatKoreanCurrency(safeRev.y24)}</td><th>금년 예상 매출</th><td>${formatKoreanCurrency(exp)}</td></tr>
    </table>`;
}

/* ===== 경영진단 보고서 렌더링 ===== */
function renderManagementReport(companyData,cleanHTML,version,rev,dateStr){
    const contentArea=document.getElementById('report-content-area');
    const safeRev=rev||{cur:0,y25:0,y24:0,y23:0};
    const months=Math.max((parseInt((companyData.date||dateStr).split('-')[1])||1)-1,1);
    const expectedCur=Math.round((safeRev.cur/months)*12);

    cleanHTML=cleanHTML.replace(/(<h3[^>]*>[^<]*경영진단[^<]*개요[^<]*<\/h3>)/,`$1\n${buildCompanyOverviewTable(companyData,safeRev)}`);
    const pos1=cleanHTML.indexOf('경영진단');
    if(pos1>-1){const ulClose=cleanHTML.indexOf('</ul>',pos1);if(ulClose>-1)cleanHTML=cleanHTML.slice(0,ulClose+5)+'\n<div class="chart-container"><div class="chart-box"><canvas id="report-radar-chart"></canvas></div></div>\n'+cleanHTML.slice(ulClose+5);}
    cleanHTML=cleanHTML.replace(/(<h3[^>]*>[^<]*재무[^<]*현황[^<]*<\/h3>)/,`$1\n<div class="chart-container"><div class="chart-box"><canvas id="report-bar-chart"></canvas></div></div>`);

    const vLabel=version==='client'?'기업의 현재 역량 분석 및 맞춤형 성장 전략 제안':'내부 리스크 진단 및 보완 액션 플랜';
    const coverCfg={title:'AI 경영진단보고서',reportKind:'AI 경영진단보고서 리포트',version,borderColor:'#3b82f6'};
    contentArea.innerHTML=`<div class="paper-inner">${buildCoverHTML(companyData,coverCfg,safeRev,dateStr)}${cleanHTML}<div class="alert-box ${version==='client'?'blue':'green'}">★ 본 리포트는 AI 컨설턴트가 분석한 ${vLabel} 자료입니다.</div></div>`;

    setTimeout(()=>{
        const radarEl=document.getElementById('report-radar-chart');
        if(radarEl)new Chart(radarEl.getContext('2d'),{type:'radar',data:{labels:['재무건전성','전략/마케팅','인사/조직','운영/생산','IT/디지털'],datasets:[{label:'기업 역량 진단',data:[65,80,72,68,55],backgroundColor:'rgba(59,130,246,0.2)',borderColor:'#3b82f6',pointBackgroundColor:'#1e3a8a',pointRadius:5}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false}});
        const lineEl=document.getElementById('report-bar-chart');
        if(lineEl)new Chart(lineEl.getContext('2d'),{type:'line',data:{labels:['23년도','24년도','25년도','금년(예상)'],datasets:[{label:'매출 추이',data:[safeRev.y23,safeRev.y24,safeRev.y25,expectedCur],borderColor:'rgba(22,163,74,1)',backgroundColor:'rgba(22,163,74,0.15)',borderWidth:2,pointRadius:5,fill:true,tension:0.1}]},options:{maintainAspectRatio:false,scales:{y:{ticks:{callback:v=>v>=10000?Math.floor(v/10000)+'억':v.toLocaleString('ko-KR')+'만'}}}}});
    },100);
}

/* ===== 일반 리포트 렌더링 ===== */
function renderGenericReport(contentAreaId,companyData,cleanHTML,config,rev,dateStr){
    const contentArea=document.getElementById(contentAreaId);if(!contentArea)return;
    const safeRev=rev||{cur:0,y25:0,y24:0,y23:0};
    const vLabel=config.version==='client'?'기업의 현황 분석 및 맞춤형 전략 제안':'내부 리스크 진단 및 보완 액션 플랜';
    contentArea.innerHTML=`<div class="paper-inner">${buildCoverHTML(companyData,config,safeRev,dateStr)}${cleanHTML}<div class="alert-box ${config.version==='client'?'blue':'green'}">★ 본 리포트는 AI 컨설턴트가 분석한 ${config.title} 자료입니다. (${vLabel})</div></div>`;
}

/* ===== 공통 프롬프트 규칙 (인사말 금지 포함) ===== */
const COMMON_RULES = `
[★ 출력 형식 규칙 - 절대 준수 ★]
- 각 목차 전체를 반드시 <div class="report-section-box"> 태그로 감싸서 출력할 것.
- 각 목차의 제목은 반드시 <h3> 태그를 사용할 것.
- 줄글(<p>) 대신 <ul>과 <li> 태그를 사용하여 불릿 기호로 정리할 것.
- 각 <li> 항목은 최소 30자 이상 상세히 작성할 것.
- 금액 표기 시 반드시 제공된 한글 금액 문자열을 그대로 사용할 것.
- 모든 문장은 '~함', '~임', '~수준임', '~필요함' 등의 개조식으로 맺을 것.
- 강조를 위한 별표(**) 등 마크다운 특수기호는 절대 사용하지 말 것.
- 표(Table)는 절대 그리지 말 것.
- ★ 첫 번째 목차(<div class="report-section-box">) 앞에 인사말, 소개 문구, 서론, <p> 태그 등 어떠한 텍스트도 절대 출력하지 말 것. 바로 첫 번째 목차부터 시작할 것.
`;

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

    const prompt=`너의 역할은 20년 경력의 경영 컨설턴트야. 대상 기업: '${companyData.name}'
[진단 가중치]
1. 경영진단 개요: 3~4항목
2. 재무 현황 분석: 가중치 15% → li 3~4개
3. 전략 및 마케팅 분석: 가중치 25% → li 6~8개 (가장 풍부하게)
4. 인사/조직: 가중치 20% → li 5~6개
5. 운영/생산: 가중치 20% → li 5~6개
6. IT/디지털 및 정부지원: 가중치 20% → li 각 2~3개
7. 개선 방향 및 로드맵: 5~6항목
${COMMON_RULES}
출력 목적: ${version==='client'?'긍정적/객관적 (기업전달용)':'리스크/단점 위주 (컨설턴트용)'}
[기업 데이터] ${JSON.stringify(promptData,null,2)}`;

    const aiResponse=await callGeminiAPI(prompt);
    document.getElementById('ai-loading-overlay').style.display='none';
    if(aiResponse){
        // ★ 인사말·소개문 제거 후 저장 ★
        let cleanHTML = cleanAIResponse(aiResponse);
        const todayStr=new Date().toISOString().split('T')[0];
        const reportObj={id:'rep_'+Date.now(),type:'경영진단',company:companyData.name,title:`AI 경영진단보고서 (${version==='client'?'기업전달용':'컨설턴트용'})`,date:todayStr,content:cleanHTML,version,revenueData:rev,reportType:'management'};
        const reports=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');reports.push(reportObj);localStorage.setItem(DB_REPORTS,JSON.stringify(reports));
        updateDataLists();
        tab.querySelector('[id$="-input-step"]').style.display='none';
        tab.querySelector('[id$="-result-step"]').style.display='block';
        renderManagementReport(companyData,cleanHTML,version,rev,todayStr);
    }
};

/* ===== AI 리포트 설정 (5종) ===== */
const REPORT_CONFIGS={
    finance:{typeLabel:'재무진단',title:'AI 상세 재무진단',reportKind:'AI 상세 재무진단 리포트',borderColor:'#2563eb',contentAreaId:'finance-content-area',
        buildPrompt:(cData,fRev,version)=>`너는 공인회계사급 재무 전문 컨설턴트야. 대상 기업: '${cData.name}'
5개 섹션: 1.재무개요(3~4항목) 2.수익성분석(5~6항목) 3.안정성분석(5~6항목) 4.성장성분석(4~5항목) 5.재무개선방향(5~6항목)
${COMMON_RULES}
출력목적: ${version==='client'?'기업전달용':'컨설턴트용'}
[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`},

    aiBiz:{typeLabel:'사업계획서',title:'AI 사업계획서',reportKind:'AI 맞춤형 사업계획서',borderColor:'#16a34a',contentAreaId:'aiBiz-content-area',
        buildPrompt:(cData,fRev,version)=>`너는 20년 경력의 창업·사업기획 전문 컨설턴트야. 대상 기업: '${cData.name}'
7개 섹션: 1.사업개요(3~4항목) 2.시장분석(5~6항목) 3.제품/서비스(5~6항목) 4.마케팅전략(6~7항목) 5.운영계획(4~5항목) 6.재무계획(4~5항목) 7.실행로드맵(4~5항목)
${COMMON_RULES}
출력목적: ${version==='client'?'정식 제출용':'초안/검토본'}
[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`},

    aiFund:{typeLabel:'정책자금매칭',title:'AI 정책자금매칭',reportKind:'AI 정책자금 매칭 리포트',borderColor:'#ea580c',contentAreaId:'aiFund-content-area',
        buildPrompt:(cData,fRev,version)=>`너는 중소기업 정책자금 전문 컨설턴트야. 대상 기업: '${cData.name}'
5개 섹션: 1.기업자격요건분석(4~5항목) 2.자금필요성및활용전략(3~4항목) 3.추천정책자금TOP5(각 3~4줄) 4.기관별신청전략(5~6항목) 5.신청준비체크리스트(6~8항목)
${COMMON_RULES}
출력목적: ${version==='client'?'기업전달용':'컨설턴트용(리스크포함)'}
[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`},

    aiTrade:{typeLabel:'상권분석',title:'AI 상권분석 리포트',reportKind:'AI 빅데이터 상권분석',borderColor:'#0d9488',contentAreaId:'aiTrade-content-area',
        buildPrompt:(cData,fRev,version)=>`너는 상권분석 전문 컨설턴트야. 대상 기업: '${cData.name}' (업종:${cData.industry||'미입력'})
5개 섹션: 1.상권개요및입지분석(4~5항목) 2.유동인구및타겟고객분석(5~6항목) 3.경쟁현황및포지셔닝전략(5~6항목) 4.상권성장성및리스크평가(4~5항목) 5.매출예측및운영전략(5~6항목)
${COMMON_RULES}
출력목적: ${version==='client'?'기업전달용':'컨설턴트용'}
[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`},

    aiMarketing:{typeLabel:'마케팅제안',title:'AI 마케팅 제안서',reportKind:'AI 맞춤형 마케팅 제안서',borderColor:'#db2777',contentAreaId:'aiMarketing-content-area',
        buildPrompt:(cData,fRev,version)=>`너는 디지털 마케팅 전문 컨설턴트야. 대상 기업: '${cData.name}'
6개 섹션: 1.마케팅현황진단(4~5항목) 2.타겟고객설정및페르소나(5~6항목) 3.채널별마케팅전략(6~8항목) 4.콘텐츠및브랜딩전략(5~6항목) 5.마케팅예산계획(4~5항목) 6.월별실행로드맵(6항목)
${COMMON_RULES}
출력목적: ${version==='client'?'기업전달용':'컨설턴트용'}
[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`}
};

/* ===== 통합 AI 리포트 생성 ===== */
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
        // ★ 인사말·소개문 제거 후 저장 ★
        let cleanHTML = cleanAIResponse(aiResponse);
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

/* ===== 보고서 보기 ===== */
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
