// ===== BizConsult AI 보고서 플랫폼 =====
const DB_USERS    = 'biz_users';
const DB_SESSION  = 'biz_session';
const STORAGE_KEY = 'biz_consult_companies';
const DB_REPORTS  = 'biz_reports';
let _currentReport = { company:'', type:'', contentAreaId:'', landscape:true };

// ===========================
// ★ PDF 직접 다운로드 (html2pdf.js)
// ===========================
window.printReport = function() {
  var company = _currentReport.company || '';
  var type    = _currentReport.type    || 'AI 보고서';
  var caid    = _currentReport.contentAreaId;

  if (!caid) {
    ['report-content-area','finance-content-area','aiBiz-content-area',
     'aiFund-content-area','aiTrade-content-area','aiMarketing-content-area'
    ].forEach(function(id) {
      if (!caid) { var e = document.getElementById(id); if (e && e.innerHTML.trim()) caid = id; }
    });
  }
  var el = document.getElementById(caid);
  if (!el || !el.innerHTML.trim()) { alert('출력할 보고서가 없습니다.'); return; }

  var fname = (company + '_' + type).replace(/\s+/g,'_').replace(/[()]/g,'') + '.pdf';
  var loadEl = document.getElementById('ai-loading-overlay');
  if (loadEl) loadEl.style.display = 'flex';

  var opt = {
    margin:      8,
    filename:    fname,
    image:       { type: 'jpeg', quality: 0.97 },
    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#e8eaed', allowTaint: true },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true },
    pagebreak:   { mode: 'css', before: '.tp-page', after: '.tp-cover' }
  };

  html2pdf().from(el).set(opt).save()
    .then(function() { if (loadEl) loadEl.style.display = 'none'; })
    .catch(function(e) {
      if (loadEl) loadEl.style.display = 'none';
      alert('PDF 생성 오류: ' + (e.message || e));
    });
};

document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  const urlParams = new URLSearchParams(window.location.search);
  showTab(urlParams.get('tab') || 'dashboard', false);
  window.toggleCorpNumber(); window.toggleRentInputs(); window.toggleExportInputs();
});

// ===========================
// ★ 인증
// ===========================
window.devBypassLogin = function() {
  const tu = { email:'test@biz.com', pw:'1234', name:'선지영', dept:'솔루션빌더스', apiKey:'' };
  let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
  if (!users.find(u => u.email === tu.email)) { users.push(tu); localStorage.setItem(DB_USERS, JSON.stringify(users)); }
  localStorage.setItem(DB_SESSION, JSON.stringify(tu));
  checkAuth();
};
function checkAuth() {
  const session = JSON.parse(localStorage.getItem(DB_SESSION));
  const authEl = document.getElementById('auth-container');
  const appEl  = document.getElementById('main-app');
  if (session) { authEl.style.display='none'; appEl.style.display='flex'; loadUserProfile(); updateDataLists(); initInputHandlers(); }
  else          { authEl.style.display='flex';  appEl.style.display='none'; }
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

// ===========================
// ★ 프로필
// ===========================
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

// ===========================
// ★ 탭 이동
// ===========================
window.showTab = function(tabId, updateUrl=true) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.menu li, .bottom-menu li').forEach(i=>i.classList.remove('active'));
  const target=document.getElementById(tabId); if(target) target.classList.add('active');
  const menu=document.getElementById('menu-'+tabId); if(menu) menu.classList.add('active');
  if(tabId==='settings') loadUserProfile();
  if(tabId==='company') showCompanyList();
  // 보고서 탭 → 항상 입력 화면
  ['report','finance','aiBiz','aiFund','aiTrade','aiMarketing'].forEach(rt=>{
    if(tabId===rt){
      const inp=document.getElementById(rt+'-input-step');
      const res=document.getElementById(rt+'-result-step');
      if(inp) inp.style.display='block';
      if(res) res.style.display='none';
    }
  });
  updateDataLists();
  if(updateUrl) history.pushState(null,'',`?tab=${tabId}`);
};
window.addEventListener('popstate',()=>{const p=new URLSearchParams(window.location.search);showTab(p.get('tab')||'dashboard',false);});

// ===========================
// ★ 업체 관리
// ===========================
window.showCompanyList = function() {
  document.getElementById('company-list-step').style.display = 'block';
  document.getElementById('company-form-step').style.display = 'none';
  renderCompanyCards();
  const ct = document.getElementById('company');
  if (!ct.classList.contains('active')) showTab('company');
};
window.showCompanyForm = function(editName=null) {
  document.getElementById('company-list-step').style.display = 'none';
  document.getElementById('company-form-step').style.display = 'block';
  const titleEl = document.getElementById('company-form-title');
  if (editName) {
    if(titleEl) titleEl.textContent = `기업 정보 수정 - ${editName}`;
    const comp = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]').find(c=>c.name===editName);
    if (comp?.rawData) {
      const els = document.querySelectorAll('#companyForm input,#companyForm select,#companyForm textarea');
      comp.rawData.forEach((d,i) => { if(els[i]){ if(els[i].type==='checkbox'||els[i].type==='radio') els[i].checked=d.checked; else els[i].value=d.value; } });
      calculateTotalDebt(); toggleCorpNumber(); toggleRentInputs(); toggleExportInputs();
    }
  } else {
    if(titleEl) titleEl.textContent = '기업 정보 등록';
  }
  const ct = document.getElementById('company');
  if (!ct.classList.contains('active')) {
    document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.menu li, .bottom-menu li').forEach(i=>i.classList.remove('active'));
    ct.classList.add('active');
    const m=document.getElementById('menu-company'); if(m) m.classList.add('active');
  }
};

window.renderCompanyCards = function() {
  const container = document.getElementById('company-cards-container'); if (!container) return;
  const companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  const keyword   = (document.getElementById('company-search-input')?.value||'').toLowerCase();
  const filtered  = companies.filter(c=>c.name.toLowerCase().includes(keyword)||(c.industry||'').toLowerCase().includes(keyword));
  if (!filtered.length) {
    container.innerHTML=`<div class="company-empty-state"><div class="empty-icon">🏢</div><p>${keyword?'검색 결과가 없습니다.':'등록된 업체가 없습니다.'}</p><button class="btn-add-company" onclick="showCompanyForm()">＋ 업체 등록하기</button></div>`;
    return;
  }
  container.innerHTML = filtered.map(c => {
    let address = '주소 미입력';
    if (c.rawData) {
      const addrEl = c.rawData.find(d=>d.type==='text'&&d.value&&d.value.length>3&&d.value!==c.name&&d.value!==c.rep&&d.value!==c.bizNum&&d.value!==c.industry&&d.value!==c.bizDate&&d.value!==c.empCount&&d.value!==c.coreItem&&!d.value.match(/^\d{2,3}-/)&&(d.value.includes('시')||d.value.includes('구')||d.value.includes('동')||d.value.includes('로')||d.value.includes('길')));
      if(addrEl) address = addrEl.value;
    }
    return `<div class="company-card"><div class="company-card-top"><div class="company-card-icon">🏢</div><div class="company-card-info"><div class="company-card-name">${c.name}</div><div class="company-card-rep">${c.rep&&c.rep!=='-'?c.rep+' 대표':'대표자 미입력'}</div></div><div class="company-card-actions"><button class="btn-card-detail" onclick="showCompanyForm('${c.name}')">›</button><button class="btn-card-delete" onclick="deleteCompany('${c.name}')">🗑</button></div></div><div class="company-card-body"><div class="company-card-row"><span class="company-card-label">업종</span><span class="company-card-value">${c.industry&&c.industry!=='-'?c.industry:'미입력'}</span></div><div class="company-card-row"><span class="company-card-label">주소</span><span class="company-card-value addr">${address}</span></div></div></div>`;
  }).join('');
};

window.deleteCompany = function(name) {
  if (!confirm(`[${name}]을 삭제하시겠습니까?`)) return;
  let companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  companies = companies.filter(c=>c.name!==name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
  updateDataLists(); renderCompanyCards();
};

// ===========================
// ★ 대시보드
// ===========================
function updateDashboardReports() {
  const listEl = document.getElementById('dashboard-report-list'); if (!listEl) return;
  const reports   = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
  const companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  const setNum=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  setNum('stat-companies',companies.length);
  setNum('stat-mgmt',reports.filter(r=>r.type==='경영진단').length);
  setNum('stat-biz',reports.filter(r=>r.type==='사업계획서').length);
  setNum('stat-total',reports.length);
  if (!reports.length) { listEl.innerHTML='<div class="empty-state">최근 생성된 보고서가 없습니다.</div>'; return; }
  const typeIcon=t=>({'경영진단':'📈','재무진단':'💰','사업계획서':'💡','정책자금매칭':'🎯','상권분석':'🏪','마케팅제안':'📢'}[t]||'📄');
  listEl.innerHTML=[...reports].reverse().slice(0,5).map(r=>`<div class="recent-report-item"><div class="report-type-icon">${typeIcon(r.type)}</div><div><div class="report-item-title">${r.title}</div><div class="report-item-company">${r.company}</div></div><div class="report-item-right"><span class="report-badge">${r.type}</span><span class="report-date">🕐 ${r.date}</span><button class="btn-small-outline" style="font-size:11px;padding:4px 8px;" onclick="viewReport('${r.id}')">보기</button></div></div>`).join('');
}

// ===========================
// ★ 데이터 목록 갱신
// ===========================
window.updateDataLists = function() {
  const companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  const reports   = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
  document.querySelectorAll('.company-dropdown').forEach(sel=>{
    sel.innerHTML='<option value="">기업을 선택하세요</option>';
    companies.forEach(c=>sel.innerHTML+=`<option value="${c.name}">${c.name}</option>`);
  });
  const cBody=document.getElementById('company-list-body');
  if(cBody){ const shown=companies.slice(0,5); cBody.innerHTML=shown.length?shown.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.rep||'-'}</td><td>${c.bizNum||'-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="showCompanyForm('${c.name}')">수정/보기</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">등록된 기업이 없습니다.</td></tr>'; }
  const rBody=document.getElementById('report-list-body');
  if(rBody){ const shown=[...reports].reverse().slice(0,5); rBody.innerHTML=shown.length?shown.map(r=>`<tr><td><span style="background:#eff6ff;color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${r.type}</span></td><td><strong>${r.company}</strong></td><td>${r.title}</td><td>${r.date}</td><td style="white-space:nowrap;"><button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button><button class="btn-delete" style="margin-left:6px;" onclick="deleteReport('${r.id}')">삭제</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">생성된 보고서가 없습니다.</td></tr>'; }
  const filterComp=document.getElementById('filter-company');
  if(filterComp){ filterComp.innerHTML='<option value="">전체 업체</option>'; companies.forEach(c=>filterComp.innerHTML+=`<option value="${c.name}">${c.name}</option>`); }
  updateDashboardReports(); renderCompanyCards();
};

// ===========================
// ★ 보고서 목록 서브뷰
// ===========================
window.showReportListSummary=function(){document.getElementById('rl-summary').style.display='block';document.getElementById('rl-companies').style.display='none';document.getElementById('rl-reports').style.display='none';updateDataLists();};
window.showFullCompanies=function(){document.getElementById('rl-summary').style.display='none';document.getElementById('rl-companies').style.display='block';document.getElementById('rl-reports').style.display='none';const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');const tbody=document.getElementById('company-full-body');if(tbody){tbody.innerHTML=companies.length?companies.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.rep||'-'}</td><td>${c.bizNum||'-'}</td><td>${c.industry||'-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="showCompanyForm('${c.name}')">수정/보기</button></td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">등록된 기업이 없습니다.</td></tr>';}};
window.showFullReports=function(){document.getElementById('rl-summary').style.display='none';document.getElementById('rl-companies').style.display='none';document.getElementById('rl-reports').style.display='block';const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');const filterComp=document.getElementById('filter-company');if(filterComp){filterComp.innerHTML='<option value="">전체 업체</option>';companies.forEach(c=>filterComp.innerHTML+=`<option value="${c.name}">${c.name}</option>`);}renderFullReports();};
window.renderFullReports=function(){const tf=document.getElementById('filter-type')?.value||'';const cf=document.getElementById('filter-company')?.value||'';const reports=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');const filtered=[...reports].reverse().filter(r=>(!tf||r.type===tf)&&(!cf||r.company===cf));const countEl=document.getElementById('filter-result-count');if(countEl)countEl.textContent=`총 ${filtered.length}건`;const tbody=document.getElementById('report-full-body');if(!tbody)return;tbody.innerHTML=filtered.length?filtered.map(r=>`<tr><td><span style="background:#eff6ff;color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${r.type}</span></td><td><strong>${r.company}</strong></td><td>${r.title}</td><td>${r.date}</td><td style="white-space:nowrap;"><button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button><button class="btn-delete" style="margin-left:6px;" onclick="deleteReportFull('${r.id}')">삭제</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">조건에 맞는 보고서가 없습니다.</td></tr>';};
window.deleteReportFull=function(id){if(!confirm('삭제하시겠습니까?'))return;let r=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');r=r.filter(x=>x.id!==id);localStorage.setItem(DB_REPORTS,JSON.stringify(r));renderFullReports();updateDashboardReports();};
window.deleteReport=function(id){if(!confirm('삭제하시겠습니까?'))return;let r=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');r=r.filter(x=>x.id!==id);localStorage.setItem(DB_REPORTS,JSON.stringify(r));updateDataLists();};

// ===========================
// ★ 기업 저장
// ===========================
window.clearCompanyForm=function(){if(confirm('초기화하시겠습니까?')){document.getElementById('companyForm').reset();calculateTotalDebt();toggleCorpNumber();toggleRentInputs();toggleExportInputs();}};
window.saveCompanyData=function(){
  const name=document.getElementById('comp_name')?.value; if(!name){alert('상호명을 입력해주세요.');return;}
  const rev={cur:parseInt(document.getElementById('rev_cur')?.value?.replace(/,/g,'')||0),y25:parseInt(document.getElementById('rev_25')?.value?.replace(/,/g,'')||0),y24:parseInt(document.getElementById('rev_24')?.value?.replace(/,/g,'')||0),y23:parseInt(document.getElementById('rev_23')?.value?.replace(/,/g,'')||0)};
  const needFund=parseInt(document.getElementById('need_fund')?.value?.replace(/,/g,'')||0)||0;
  const fundPlan=document.getElementById('fund_plan')?.value||'';
  const newC={name,rep:document.querySelector('input[placeholder="대표자명을 입력하세요"]')?.value||'-',bizNum:document.getElementById('biz_number')?.value||'-',industry:document.getElementById('comp_industry')?.value||'-',bizDate:document.getElementById('biz_date')?.value||'-',empCount:document.getElementById('emp_count')?.value||'-',coreItem:document.getElementById('core_item')?.value||'-',date:new Date().toISOString().split('T')[0],revenueData:rev,needFund,fundPlan,rawData:Array.from(document.querySelectorAll('#companyForm input,#companyForm select,#companyForm textarea')).map(el=>({type:el.type,value:el.value,checked:el.checked}))};
  let companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  const idx=companies.findIndex(c=>c.name===name);
  if(idx>-1) companies[idx]=newC; else companies.push(newC);
  localStorage.setItem(STORAGE_KEY,JSON.stringify(companies));
  alert('기업 정보가 저장되었습니다!');
  updateDataLists(); showCompanyList();
};
window.toggleExportInputs=function(){const isExp=[...document.getElementsByName('export')].some(r=>r.checked&&r.value==='수출중');document.querySelectorAll('.export-money').forEach(i=>{i.disabled=!isExp;if(!isExp)i.value='';});};
window.toggleCorpNumber=function(){const isC=[...document.getElementsByName('biz_type')].some(r=>r.checked&&r.value==='법인');const el=document.getElementById('corp_number');if(el){el.disabled=!isC;if(!isC)el.value='';}};
window.toggleRentInputs=function(){const isR=[...document.getElementsByName('rent_type')].some(r=>r.checked&&r.value==='임대');['rent_deposit','rent_monthly'].forEach(id=>{const el=document.getElementById(id);if(el){el.disabled=!isR;if(!isR)el.value='';}});};
window.calculateTotalDebt=function(){let tot=0;document.querySelectorAll('.debt-input').forEach(i=>{let v=i.value.replace(/[^0-9]/g,'');if(v)tot+=parseInt(v);});const el=document.getElementById('total-debt');if(el)el.innerText=tot.toLocaleString('ko-KR');};

// ===========================
// ★ 입력 포매터
// ===========================
function initInputHandlers(){
  document.querySelectorAll('.number-only').forEach(i=>i.addEventListener('input',function(){this.value=this.value.replace(/[^0-9]/g,'');}));
  document.querySelectorAll('.money-format').forEach(i=>i.addEventListener('input',function(){let v=this.value.replace(/[^0-9\-]/g,'');this.value=v.replace(/\B(?=(\d{3})+(?!\d))/g,',');}));
  document.querySelectorAll('.debt-input').forEach(i=>i.addEventListener('input',calculateTotalDebt));
  [['biz_number','biz'],['corp_number','corp'],['biz_date','date'],['rep_birth','date'],['write_date','date']].forEach(([id,fmt])=>{const el=document.getElementById(id);if(!el)return;el.addEventListener('input',function(){let v=this.value.replace(/[^0-9]/g,'');if(fmt==='corp'){this.value=v.length<7?v:v.slice(0,6)+'-'+v.slice(6,13);}else if(fmt==='biz'){if(v.length<4)this.value=v;else if(v.length<6)this.value=v.slice(0,3)+'-'+v.slice(3);else this.value=v.slice(0,3)+'-'+v.slice(3,5)+'-'+v.slice(5,10);}else{if(v.length<5)this.value=v;else if(v.length<7)this.value=v.slice(0,4)+'-'+v.slice(4);else this.value=v.slice(0,4)+'-'+v.slice(4,6)+'-'+v.slice(6,8);}});});
  ['biz_phone','rep_phone'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.addEventListener('input',function(){let v=this.value.replace(/[^0-9]/g,'');if(v.startsWith('02')){if(v.length<3)this.value=v;else if(v.length<6)this.value=v.slice(0,2)+'-'+v.slice(2);else if(v.length<10)this.value=v.slice(0,2)+'-'+v.slice(2,5)+'-'+v.slice(5);else this.value=v.slice(0,2)+'-'+v.slice(2,6)+'-'+v.slice(6,10);}else{if(v.length<4)this.value=v;else if(v.length<7)this.value=v.slice(0,3)+'-'+v.slice(3);else if(v.length<11)this.value=v.slice(0,3)+'-'+v.slice(3,6)+'-'+v.slice(6);else this.value=v.slice(0,3)+'-'+v.slice(3,7)+'-'+v.slice(7,11);}});});
}

// ===========================
// ★ 유틸리티

// ===========================
function fKRW(n){const num=parseInt(n,10);if(!num||isNaN(num))return'0원';const uk=Math.floor(num/10000),man=num%10000;if(uk>0)return uk.toLocaleString('ko-KR')+'억'+(man>0?' '+man.toLocaleString('ko-KR')+'만원':'원');return man.toLocaleString('ko-KR')+'만원';}
function fRevAI(cData,rev){const regMonth=parseInt((cData.date||'').split('-')[1])||1;const months=Math.max(regMonth-1,1);const expectedCur=Math.round(((rev.cur||0)/months)*12);return{금년매출_전월말기준:fKRW(rev.cur),금년예상연간매출:fKRW(expectedCur)+` (${months}개월 연간환산)`,매출_2025년:fKRW(rev.y25),매출_2024년:fKRW(rev.y24),매출_2023년:fKRW(rev.y23),_raw:rev,_expected:expectedCur,_months:months};}
function calcExpected(cData,rev){const regMonth=parseInt((cData.date||'').split('-')[1])||1;const months=Math.max(regMonth-1,1);return Math.round(((rev.cur||0)/months)*12);}
function tpList(items,color='#3b82f6'){return`<div class="tp-list">${items.map(i=>`<div class="tp-li"><div class="tp-dot" style="background:${color}"></div><span>${i}</span></div>`).join('')}</div>`;}
function tpHBar(label,value,display,color){return`<div class="hbr"><div class="hbl"><span>${label}</span><span style="color:${color};font-weight:500">${display}</span></div><div class="hbt"><div class="hbf" style="width:${Math.min(value,100)}%;background:${color}"></div></div></div>`;}
function tpCard(label,value,desc,color){return`<div class="mc"><div class="mc-l">${label}</div><div class="mc-v" style="color:${color}">${value}</div><div class="mc-d">${desc}</div></div>`;}
function tpFeedback(items,color='#f97316'){return`<div class="fb-box"><div class="fb-title">🔍 컨설턴트 피드백</div>${tpList(items,color)}</div>`;}

// ===========================
// ★ Gemini API
// ===========================
async function _callCore(prompt, maxTokens, maxRetries) {
  const session=JSON.parse(localStorage.getItem('biz_session'));
  const apiKey=session?.apiKey;
  if(!apiKey){alert('설정 탭에서 Gemini API 키를 등록해주세요.');showTab('settings');return null;}
  let lastError=null;
  for(let attempt=1;attempt<=maxRetries;attempt++){
    if(attempt>1) await new Promise(r=>setTimeout(r,attempt*2000));
    try{
      const controller=new AbortController();
      const tid=setTimeout(()=>controller.abort(),120000);
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.7,topK:40,topP:0.95,maxOutputTokens:maxTokens}})});
      clearTimeout(tid);
      const data=await res.json();
      if(res.status===400){lastError=new Error(`요청 오류(400): ${data.error?.message||''}`);continue;}
      if(res.status===429){lastError=new Error('요청 한도 초과(429)');await new Promise(r=>setTimeout(r,5000*attempt));continue;}
      if(res.status===503){lastError=new Error('서버 과부하(503)');continue;}
      if(!res.ok||data.error) throw new Error(data.error?.message||`HTTP ${res.status}`);
      const text=data.candidates?.[0]?.content?.parts?.[0]?.text;
      if(!text) throw new Error('AI 응답이 비어 있습니다.');
      return text;
    }catch(e){if(e.name==='AbortError')lastError=new Error('응답 시간 초과(120초)');else lastError=e;console.warn(`[Gemini] 오류 (${attempt}/${maxRetries}):`,e.message);}
  }
  alert(`AI 생성 실패 (${maxRetries}회 시도):\n${lastError?.message||'알 수 없는 오류'}`);
  return null;
}
async function callGeminiAPI(prompt){return _callCore(prompt,8192,3);}
async function callGeminiAPIBiz(prompt){return _callCore(prompt,65536,3);}
async function callGeminiJSON(prompt, maxTokens=8192){
  const fullPrompt=prompt+'\n\n[중요] 반드시 순수 JSON만 출력. 마크다운 코드블록(```), 설명 텍스트 없이 JSON 객체만 출력.';
  const raw=await _callCore(fullPrompt,maxTokens,3);
  if(!raw) return null;
  try{
    const clean=raw.replace(/```json|```/g,'').trim();
    const start=clean.indexOf('{');
    const end=clean.lastIndexOf('}');
    if(start>=0&&end>=0) return JSON.parse(clean.slice(start,end+1));
    return JSON.parse(clean);
  }catch(e){console.error('JSON 파싱 실패:',e,raw.slice(0,200));alert('AI 응답 파싱 오류. 다시 시도해주세요.');return null;}
}

// ===========================
// ★ 표지 HTML
// ===========================



// ===========================
// ★ 템플릿 CSS (A4 가로형 최적화, 큰 폰트, 풍성한 레이아웃)
// ===========================
function tplStyle(color) {
  return '<style>'
  + '* { box-sizing:border-box; }'
  // ── WRAP ──
  + '.tp-wrap { font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif; background:#e8eaed; padding:12px; }'
  + '.tp-wrap * { font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif; }'
  // ── 표지 ──
  + '.tp-cover { background:white; border-radius:6px; margin-bottom:12px; padding:24px 26px 20px 34px; position:relative; min-height:170px; display:flex; flex-direction:column; overflow:hidden; }'
  + '.tp-cbar  { position:absolute; left:0; top:0; bottom:0; width:10px; background:' + color + '; }'
  + '.tp-cbadge { font-size:11px; font-weight:700; padding:3px 10px; border-radius:4px; display:inline-block; margin-bottom:6px; letter-spacing:0.3px; }'
  + '.tp-ctitle { font-size:22px; font-weight:700; color:#0f172a; margin-bottom:3px; letter-spacing:-0.5px; line-height:1.2; }'
  + '.tp-csub   { font-size:12px; color:#64748b; margin-bottom:12px; }'
  + '.tp-cinfo  { margin-top:auto; }'
  + '.tp-ctbl   { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:8px; }'
  + '.tp-ctbl th { padding:5px 9px; text-align:left; font-weight:700; color:' + color + '; width:18%; border-bottom:1px solid #e2e8f0; background:#f8fafc; }'
  + '.tp-ctbl td { padding:5px 9px; color:#1e293b; border-bottom:1px solid #e2e8f0; font-weight:500; }'
  + '.tp-ctbl tr:last-child th, .tp-ctbl tr:last-child td { border-bottom:none; }'
  + '.tp-cfoot  { display:flex; justify-content:space-between; font-size:12px; color:#64748b; padding-top:8px; border-top:1px solid #e2e8f0; margin-top:8px; font-weight:500; }'
  // ── 페이지 ──
  + '.tp-page  { background:white; border-radius:6px; margin-bottom:12px; padding:16px 20px 18px; min-height:660px; display:flex; flex-direction:column; page-break-before:always; break-before:page; }'
  + '.tp-ph    { display:flex; align-items:center; gap:9px; margin-bottom:12px; padding-bottom:9px; border-bottom:2px solid #f1f5f9; flex-shrink:0; }'
  + '.tp-pnum  { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; }'
  + '.tp-ptitle { font-size:16px; font-weight:700; color:#1e293b; }'
  + '.tp-psub  { font-size:11px; color:#94a3b8; margin-left:auto; }'
  + '.tp-body  { flex:1; display:flex; flex-direction:column; gap:10px; }'
  // ── 2컬럼 레이아웃 ──
  + '.tp-2col  { display:flex; gap:14px; flex:1; }'
  + '.tp-col38 { width:38%; flex-shrink:0; }'
  + '.tp-col40 { width:40%; flex-shrink:0; }'
  + '.tp-col45 { width:45%; flex-shrink:0; }'
  + '.tp-col50 { width:50%; flex-shrink:0; }'
  + '.tp-colF  { flex:1; display:flex; flex-direction:column; gap:10px; }'
  // ── 3컬럼 ──
  + '.tp-3col  { display:flex; gap:12px; flex:1; }'
  + '.tp-3c    { flex:1; display:flex; flex-direction:column; gap:8px; }'
  // ── 그리드 ──
  + '.tp-g2  { display:grid; grid-template-columns:1fr 1fr; gap:10px; }'
  + '.tp-g3  { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }'
  + '.tp-g4  { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }'
  + '.tp-g5  { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }'
  // ── 섹션 박스 ──
  + '.tp-sb   { border-radius:7px; padding:12px 14px; border:1px solid #e2e8f0; background:#f8fafc; }'
  + '.tp-sb h4 { font-size:13px; font-weight:700; margin:0 0 8px 0; padding-bottom:6px; border-bottom:1px solid #e9ecef; }'
  // ── 등급 박스 ──
  + '.tp-grade { background:linear-gradient(135deg,#eff6ff,#dbeafe); border:1px solid #bfdbfe; border-radius:8px; padding:14px; text-align:center; }'
  + '.tp-grade-lbl { font-size:12px; color:#64748b; margin-bottom:4px; font-weight:500; }'
  + '.tp-grade-val { font-size:40px; font-weight:900; line-height:1; }'
  + '.tp-grade-desc { font-size:12px; color:#475569; margin-top:4px; font-weight:600; }'
  + '.tp-grade-sub  { font-size:11px; color:#94a3b8; margin-top:3px; }'
  // ── 지표 카드 ──
  + '.tp-mc   { background:white; border-radius:7px; padding:11px 10px; border:1px solid #e2e8f0; text-align:center; }'
  + '.tp-mcl  { font-size:11px; color:#94a3b8; margin-bottom:3px; font-weight:400; }'
  + '.tp-mcv  { font-size:19px; font-weight:700; line-height:1.2; }'
  + '.tp-mcd  { font-size:11px; color:#94a3b8; margin-top:3px; font-weight:400; }'
  // ── 리스트 ──
  + '.tp-lst  { display:flex; flex-direction:column; gap:6px; }'
  + '.tp-li   { display:flex; align-items:flex-start; gap:7px; font-size:13px; color:#334155; line-height:1.6; font-weight:400; }'
  + '.tp-d    { width:6px; height:6px; border-radius:50%; flex-shrink:0; margin-top:6px; }'
  // ── 수평 바 ──
  + '.tp-hbr  { margin-bottom:7px; }'
  + '.tp-hbl  { display:flex; justify-content:space-between; font-size:12px; margin-bottom:3px; font-weight:400; }'
  + '.tp-hbv  { font-weight:700; }'
  + '.tp-hbt  { height:8px; border-radius:4px; background:#e2e8f0; overflow:hidden; }'
  + '.tp-hbf  { height:100%; border-radius:4px; }'
  // ── 로드맵 3단 ──
  + '.tp-rm3  { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }'
  + '.tp-rmi  { border-radius:7px; padding:12px; background:white; border:1px solid #e2e8f0; }'
  + '.tp-rmph { font-size:13px; font-weight:700; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #f1f5f9; }'
  + '.tp-rmtk { font-size:12px; color:#475569; padding-left:10px; position:relative; margin-bottom:5px; line-height:1.5; font-weight:400; }'
  + '.tp-rmtk::before { content:"•"; position:absolute; left:0; font-weight:700; }'
  // ── 성장 단계 ──
  + '.tp-gph  { display:flex; gap:10px; align-items:flex-start; border-radius:7px; padding:10px 14px; margin-bottom:7px; }'
  + '.tp-gphs { background:#eff6ff; border:1px solid #93c5fd; }'
  + '.tp-gphm { background:#f0fdf4; border:1px solid #86efac; }'
  + '.tp-gphl { background:#fdf4ff; border:1px solid #d8b4fe; }'
  + '.tp-gphh { font-size:12px; font-weight:700; white-space:nowrap; min-width:90px; padding-top:2px; }'
  + '.tp-gphs .tp-gphh { color:#1d4ed8; }'
  + '.tp-gphm .tp-gphh { color:#15803d; }'
  + '.tp-gphl .tp-gphh { color:#7c3aed; }'
  + '.tp-gph ul { list-style:none; padding:0; margin:0; flex:1; display:flex; flex-wrap:wrap; gap:4px 16px; }'
  + '.tp-gph li { font-size:12px; padding-left:12px; position:relative; line-height:1.55; color:#334155; width:calc(50% - 8px); font-weight:400; }'
  + '.tp-gph li::before { content:"•"; position:absolute; left:0; font-weight:700; }'
  + '.tp-gphs li::before { color:#1d4ed8; }'
  + '.tp-gphm li::before { color:#15803d; }'
  + '.tp-gphl li::before { color:#7c3aed; }'
  // ── 차트 박스 ──
  + '.tp-ch  { background:white; border-radius:6px; border:1px solid #e2e8f0; padding:10px; }'
  // ── SWOT ──
  + '.tp-swot { display:grid; grid-template-columns:1fr 1fr; gap:9px; }'
  + '.tp-sws  { background:#f0fdf4; border:1px solid #86efac; border-radius:7px; padding:11px 12px; }'
  + '.tp-sww  { background:#fef2f2; border:1px solid #fca5a5; border-radius:7px; padding:11px 12px; }'
  + '.tp-swo  { background:#eff6ff; border:1px solid #93c5fd; border-radius:7px; padding:11px 12px; }'
  + '.tp-swt  { background:#fff7ed; border:1px solid #fdba74; border-radius:7px; padding:11px 12px; }'
  + '.tp-swl  { font-size:13px; font-weight:700; margin-bottom:7px; }'
  + '.tp-sws .tp-swl { color:#15803d; } .tp-sww .tp-swl { color:#dc2626; }'
  + '.tp-swo .tp-swl { color:#1d4ed8; } .tp-swt .tp-swl { color:#ea580c; }'
  + '.tp-sw ul { list-style:none; padding:0; margin:0; }'
  + '.tp-sw li { font-size:12px; padding-left:11px; position:relative; margin-bottom:5px; line-height:1.55; color:#334155; font-weight:400; }'
  + '.tp-sw li::before { content:"•"; position:absolute; left:0; font-weight:700; }'
  + '.tp-sws li::before { color:#15803d; } .tp-sww li::before { color:#dc2626; }'
  + '.tp-swo li::before { color:#1d4ed8; } .tp-swt li::before { color:#ea580c; }'
  // ── 비교표 ──
  + '.tp-ctb { width:100%; border-collapse:collapse; font-size:12px; }'
  + '.tp-ctb th { background:#1e3a8a; color:white; padding:8px 9px; text-align:center; border:1px solid #1e40af; font-size:12px; font-weight:700; }'
  + '.tp-ctb td { padding:7px 9px; text-align:center; border:1px solid #e2e8f0; color:#334155; font-size:12px; font-weight:400; }'
  + '.tp-ctb td:first-child { text-align:left; font-weight:700; } .tp-ctb td:nth-child(2) { background:#f0fdf4; color:#15803d; font-weight:700; }'
  + '.tp-ctb tr:nth-child(even) td { background:#f8fafc; }'
  // ── 자금표 ──
  + '.tp-ftb { width:100%; border-collapse:collapse; font-size:12px; }'
  + '.tp-ftb th { background:#f0fdf4; border:1px solid #bbf7d0; padding:8px 9px; color:#15803d; font-weight:700; text-align:center; }'
  + '.tp-ftb td { border:1px solid #e2e8f0; padding:7px 9px; color:#334155; font-size:12px; }'
  + '.tp-ftb tr:nth-child(even) td { background:#f8fafc; } .tp-ftb tfoot td { background:#f0fdf4; font-weight:700; color:#15803d; }'
  // ── 기업현황표 ──
  + '.tp-ovt { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:10px; border-top:2px solid #1e3a8a; }'
  + '.tp-ovt th { background:#eff6ff; border:1px solid #bfdbfe; padding:8px 10px; text-align:left; color:#1e40af; font-weight:700; white-space:nowrap; width:16%; }'
  + '.tp-ovt td { border:1px solid #e2e8f0; padding:8px 10px; color:#1e293b; font-weight:500; }'
  // ── 가점 카드 ──
  + '.tp-cert { display:flex; align-items:flex-start; gap:10px; background:white; border:1px solid #e2e8f0; border-radius:8px; padding:11px 13px; margin-bottom:8px; }'
  + '.tp-certi { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0; }'
  + '.tp-certb { flex:1; } .tp-certn { font-size:13px; font-weight:700; color:#1e293b; margin-bottom:2px; } .tp-certd { font-size:12px; color:#64748b; line-height:1.5; }'
  + '.tp-certa { text-align:right; flex-shrink:0; margin-left:8px; } .tp-certv { font-size:14px; font-weight:700; } .tp-certp { font-size:11px; color:#94a3b8; }'
  // ── 순위 카드 ──
  + '.tp-rank { background:white; border:1px solid #e2e8f0; border-radius:7px; padding:10px 13px; margin-bottom:7px; }'
  + '.tp-rh   { display:flex; align-items:center; gap:8px; margin-bottom:6px; }'
  + '.tp-rn   { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; color:white; }'
  + '.tp-rnm  { font-size:13px; font-weight:700; color:#1e293b; } .tp-rlm { font-size:13px; font-weight:700; margin-left:auto; }'
  + '.tp-rtgs { display:flex; gap:4px; flex-wrap:wrap; } .tp-rtg { font-size:11px; padding:2px 7px; border-radius:3px; font-weight:600; }'
  // ── 체크 ──
  + '.tp-chk  { display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:6px; background:white; border:1px solid #e2e8f0; margin-bottom:5px; }'
  + '.tp-chi  { width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; }'
  + '.tp-cht  { flex:1; font-size:12px; color:#334155; font-weight:400; } .tp-chb { font-size:11px; padding:2px 7px; border-radius:3px; font-weight:700; white-space:nowrap; }'
  // ── 컨설턴트 ──
  + '.tp-cons { border-radius:8px; padding:14px 16px; border:2px solid #f59e0b; border-left:5px solid #d97706; background:#fffbeb; }'
  + '.tp-cons h3 { font-size:14px; font-weight:700; color:#92400e; margin:0 0 12px 0; padding-bottom:8px; border-bottom:1px solid #fcd34d; }'
  + '.tp-inn  { border-radius:6px; padding:10px 12px; margin-bottom:8px; background:#fef9ec; border:1px solid #fcd34d; }'
  + '.tp-innt { font-size:12px; font-weight:700; color:#92400e; margin-bottom:6px; }'
  // ── 피드백 ──
  + '.tp-fb  { border-radius:6px; padding:10px 12px; border:1px solid #fed7aa; border-left:4px solid #f97316; background:#fff7ed; margin-top:10px; }'
  + '.tp-fbt { font-size:12px; font-weight:700; color:#c2410c; margin-bottom:6px; }'
  // ── 차별점 ──
  + '.tp-diff { border-radius:8px; padding:12px 16px; margin-bottom:9px; }'
  // ── 마무리 ──
  + '.tp-cls  { background:#f0fdf4; border-radius:8px; padding:16px 18px; border:1px solid #86efac; }'
  + '.tp-clst { font-size:13px; font-weight:700; color:#15803d; margin-bottom:9px; padding-bottom:7px; border-bottom:1px solid #bbf7d0; }'
  + '.tp-clstx { font-size:13px; color:#1e293b; line-height:1.85; font-weight:400; }'
  // ── 비교표(정책자금) ──
  + '.tp-cmpt { width:100%; border-collapse:collapse; font-size:12px; }'
  + '.tp-cmpt th { border:1px solid #fed7aa; padding:7px 8px; font-weight:700; background:#fff7ed; }'
  + '.tp-cmpt td { padding:7px 8px; border:1px solid #e2e8f0; color:#334155; text-align:center; font-size:12px; }'
  + '.tp-cmpt td:first-child { text-align:left; }'
  + '.tp-cmpt tr:nth-child(even) td { background:#f8fafc; }'
  // ── 도넛 범례 ──
  + '.tp-dleg { display:flex; flex-direction:column; gap:5px; }'
  + '.tp-dli  { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:400; }'
  + '.tp-ddt  { width:10px; height:10px; border-radius:2px; flex-shrink:0; }'
  // ── 강조 배너 ──
  + '.tp-banner { border-radius:8px; padding:13px 16px; margin-top:10px; }'
  // ── 인쇄 ──
  + '@media print {'
  + '  .tp-wrap { background:white!important; padding:0!important; }'
  + '  .tp-cover { border-radius:0!important; margin:0!important; page-break-after:always; break-after:page; }'
  + '  .tp-page  { border-radius:0!important; margin:0!important; border:none!important; page-break-before:always; break-before:page; padding:12mm 14mm!important; min-height:unset!important; }'
  + '}'
  + '</style>';
}

// ===========================
// ★ 헬퍼 함수들
// ===========================
function calcExp(cData,rev){
  var rm=parseInt((cData.date||'').split('-')[1])||1;
  return Math.round(((rev.cur||0)/Math.max(rm-1,1))*12);
}
function tpLst(items,color){
  color=color||'#3b82f6';
  return '<div class="tp-lst">'+(items||[]).map(function(i){
    return '<div class="tp-li"><div class="tp-d" style="background:'+color+'"></div><span>'+i+'</span></div>';
  }).join('')+'</div>';
}
function tpHB(label,value,display,color){
  return '<div class="tp-hbr"><div class="tp-hbl"><span>'+label+'</span><span class="tp-hbv" style="color:'+color+'">'+display+'</span></div><div class="tp-hbt"><div class="tp-hbf" style="width:'+Math.min(value||0,100)+'%;background:'+color+'"></div></div></div>';
}
function tpMC(label,value,desc,color){
  return '<div class="tp-mc"><div class="tp-mcl">'+label+'</div><div class="tp-mcv" style="color:'+color+'">'+value+'</div><div class="tp-mcd">'+desc+'</div></div>';
}
function tpFB(items,color){
  color=color||'#f97316';
  return '<div class="tp-fb"><div class="tp-fbt">🔍 컨설턴트 피드백</div>'+tpLst(items,color)+'</div>';
}
function tpPage(num,title,sub,color,content){
  var numBg=color==='#d97706'?'#fef3c7':'#eff6ff';
  var numTc=color==='#d97706'?'#d97706':color;
  return '<div class="tp-page">'
    +'<div class="tp-ph">'
    +'<div class="tp-pnum" style="background:'+numBg+';color:'+numTc+'">'+num+'</div>'
    +'<span class="tp-ptitle">'+title+'</span>'
    +'<span class="tp-psub">'+(sub||'')+'</span>'
    +'</div>'
    +'<div class="tp-body">'+content+'</div>'
    +'</div>';
}


// ===========================
// ★ 표지 HTML
// ===========================
function buildCoverHTML(cData, config, rev, dateStr) {
  var session=JSON.parse(localStorage.getItem(DB_SESSION)||'{}');
  var cName=session.name||'담당자', cDept=session.dept||'솔루션빌더스';
  var safeRev=rev||{cur:0,y25:0,y24:0,y23:0};
  var exp=calcExp(cData,safeRev);
  var color=config.borderColor||'#3b82f6';
  var badgeBg=color==='#16a34a'?'#f0fdf4':color==='#ea580c'?'#fff7ed':color==='#0d9488'?'#f0fdfa':color==='#db2777'?'#fdf2f8':color==='#1e293b'?'#f1f5f9':'#eff6ff';
  var badgeTc=color==='#16a34a'?'#15803d':color==='#ea580c'?'#c2410c':color==='#0d9488'?'#0f766e':color==='#db2777'?'#be185d':color==='#1e293b'?'#334155':'#1d4ed8';
  var vLabel=config.version==='consultant'?'컨설턴트용':config.version==='client'?'기업전달용':config.vLabel||'';
  return '<div class="tp-cover">'
    +'<div class="tp-cbar"></div>'
    +'<span class="tp-cbadge" style="background:'+badgeBg+';color:'+badgeTc+'">'+config.reportKind+'</span>'
    +'<div class="tp-ctitle">'+config.title+(vLabel?' <span style="font-size:14px;color:#94a3b8;font-weight:400">('+vLabel+')</span>':'')+'</div>'
    +'<div class="tp-csub">'+cData.name+' &nbsp;·&nbsp; '+(cData.industry||'-')+' &nbsp;·&nbsp; 작성일: '+dateStr+'</div>'
    +'<div class="tp-cinfo">'
    +'<table class="tp-ctbl">'
    +'<tr><th>기업명</th><td>'+cData.name+'</td><th>대표자</th><td>'+(cData.rep||'-')+'</td><th>업종</th><td>'+(cData.industry||'-')+'</td><th>설립일</th><td>'+(cData.bizDate||'-')+'</td></tr>'
    +'<tr><th>사업자번호</th><td>'+(cData.bizNum||'-')+'</td><th>상시근로자</th><td>'+(cData.empCount||'-')+'명</td><th>전년 매출</th><td>'+fKRW(safeRev.y25)+'</td><th>금년 예상</th><td>'+fKRW(exp)+'</td></tr>'
    +'</table>'
    +'<div class="tp-cfoot"><span>📅 보고서 작성일: '+dateStr+'</span><span>👤 담당 컨설턴트: '+cName+'</span><span>🏢 '+cDept+'</span></div>'
    +'</div></div>';
}

// ===========================
// ★ 경영진단 기업전달용 (표지+6P) — A4 풍성 레이아웃
// ===========================
function buildMgmtClientHTML(d, cData, rev, dateStr) {
  var color = '#3b82f6';
  var exp   = calcExp(cData, rev);
  var numBg = '#eff6ff', numTc = color;
  var cover = buildCoverHTML(cData,{title:'AI 경영진단보고서',reportKind:'AI 경영진단보고서',version:'client',borderColor:color},rev,dateStr);
  var radar = (d.radar||[65,80,68,70,55]).join(',');
  var bars  = d.marketing_bars||{finance:72,strategy:85,operation:68};
  var certs = d.certs||[
    {name:'벤처기업 인증',effect:'중진공·기보 우대금리 적용 — 추가 자금 한도 최대 2억원 확보 가능함',amount:'+2억',period:'6개월 내'},
    {name:'이노비즈 인증',effect:'기술혁신형 중소기업 인증 — 중진공 기술개발자금 신청 가능함',amount:'+3억',period:'1년 내'},
    {name:'기업부설연구소',effect:'R&D 세액공제 25% 적용 및 기보 기술보증 우대 적용 가능함',amount:'+1.5억',period:'세액공제 병행'},
    {name:'HACCP 인증',effect:'대형마트·급식 납품 채널 확대로 매출 직접 연결됨',amount:'채널↑',period:'매출 확대'}
  ];
  var cIcons=['🏆','📜','🔬','✅','💡'], cBgs=['#f0fdf4','#eff6ff','#fdf4ff','#fff7ed'];
  var totalC=certs.filter(function(c){return c.amount&&c.amount!=='채널↑';}).reduce(function(s,c){return s+(parseFloat(c.amount.replace(/[^0-9.]/g,''))||0);},0);

  // P1: 경영진단 개요 — 2컬럼 (기업표+등급 | 지표카드+개요)
  var p1 = tpPage(1,'경영진단 개요','기업현황 · 진단목적',color,
    '<div class="tp-2col">'
    +'<div class="tp-col38">'
    +'<table class="tp-ovt"><tr><th>기업명</th><td colspan="3">'+cData.name+'</td></tr>'
    +'<tr><th>대표자</th><td>'+( cData.rep||'-')+'</td><th>업종</th><td>'+(cData.industry||'-')+'</td></tr>'
    +'<tr><th>사업자번호</th><td>'+( cData.bizNum||'-')+'</td><th>상시근로자</th><td>'+(cData.empCount||'-')+'명</td></tr>'
    +'<tr><th>설립일</th><td>'+(cData.bizDate||'-')+'</td><th>핵심아이템</th><td>'+(cData.coreItem||'-')+'</td></tr>'
    +'<tr><th>전년 매출</th><td>'+fKRW(rev.y25)+'</td><th>금년 예상</th><td>'+fKRW(exp)+'</td></tr></table>'
    +'<div class="tp-grade">'
    +'<div class="tp-grade-lbl">종합 진단 등급</div>'
    +'<div class="tp-grade-val" style="color:'+color+'">'+(d.grade||'B+')+'</div>'
    +'<div class="tp-grade-desc">'+(d.grade_desc||'성장 유망 단계')+'</div>'
    +'<div class="tp-grade-sub">전체 진단 기업 중 상위 30% 수준</div>'
    +'</div>'
    +'</div>'
    +'<div class="tp-colF">'
    +'<div class="tp-g3" style="flex-shrink:0">'
    +tpMC('매출 성장률',(rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'+21%','전년 대비','#16a34a')
    +tpMC('금년 예상 매출',fKRW(exp),'연간 환산','#7c3aed')
    +tpMC('핵심 아이템',(cData.coreItem||'주력 제품').slice(0,8),'경쟁력 보유',color)
    +'</div>'
    +'<div class="tp-sb" style="flex:1">'
    +'<h4 style="color:'+color+'">진단 목적 및 방향</h4>'
    +tpLst(d.overview||[
      '기업의 현재 경영 상태를 종합적으로 진단하여 핵심 강점 및 개선 기회를 파악함',
      '재무 건전성과 성장 가능성을 다각도로 분석하여 정책자금 신청 전략을 수립함',
      '인사·조직·운영·IT 전반의 역량을 점검하고 중장기 발전 로드맵을 제시함',
      '시장 내 경쟁 우위 확보를 위한 전략적 포지셔닝 방향을 도출함',
      '인증 취득 및 가점 확보를 통한 정책자금 조달 가능성을 최대화함'
    ],color)
    +'</div>'
    +'</div>'
    +'</div>'
  );

  // P2: 재무 현황 — 2컬럼 (매출차트 | 강점+개선)
  var p2 = tpPage(2,'재무 현황 분석','매출 추이 · 수익성 · 안정성',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50">'
    +'<div class="tp-sb" style="margin-bottom:10px"><h4 style="color:'+color+'">연도별 매출 추이</h4>'
    +'<div class="tp-ch" style="height:190px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div></div>'
    +'<div class="tp-g2">'
    +tpMC('전년 매출',fKRW(rev.y25),'2025년',color)
    +tpMC('금년 예상',fKRW(exp),'연환산',color)
    +tpMC('성장률',(rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'분석중','YoY','#16a34a')
    +tpMC('2년 성장',(rev.y23>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y23)/rev.y23)*100)+'%':'분석중','2년누계','#16a34a')
    +'</div>'
    +'</div>'
    +'<div class="tp-colF">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">재무 강점 분석</h4>'
    +tpLst(d.finance_strengths||[
      '창업 초기임에도 불구하고 빠른 매출 성장세를 기록하며 시장 내 입지를 확보하고 있음',
      '핵심 제품의 독창성을 바탕으로 높은 마진율을 유지하며 수익성 기반을 구축하고 있음',
      '정책자금 활용을 통해 외부 차입 부담을 최소화하여 재무 안정성을 확보하고 있음',
      '영업이익률이 업종 평균을 상회하여 수익 구조의 건전성을 입증하고 있음'
    ],color)+'</div>'
    +'<div class="tp-sb"><h4 style="color:#f97316">개선 필요 포인트</h4>'
    +tpLst(d.finance_risks||[
      '단일 제품 의존도가 높아 포트폴리오 다각화를 통한 매출 안정성 강화가 필요함',
      '운전자본 확보를 위한 정책자금 조달 전략을 체계적으로 수립할 필요가 있음',
      '매출 급성장에 따른 현금흐름 관리 체계를 강화하여 유동성 위기를 예방해야 함'
    ],'#f97316')+'</div>'
    +'</div>'
    +'</div>'
  );

  // P3: 전략·마케팅 — 2컬럼 (레이더 | 마케팅분석+점수)
  var p3 = tpPage(3,'전략 및 마케팅 분석','역량 레이더 · 마케팅 포지셔닝',color,
    '<div class="tp-2col">'
    +'<div class="tp-col45">'
    +'<div class="tp-sb" style="margin-bottom:10px"><h4 style="color:'+color+'">경영 역량 진단 레이더</h4>'
    +'<div class="tp-ch" style="height:210px"><canvas id="rp-radar" data-scores="'+radar+'" style="width:100%;height:100%"></canvas></div></div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">영역별 점수</h4>'
    +tpHB('재무건전성',bars.finance,bars.finance+'점',color)
    +tpHB('전략/마케팅',bars.strategy,bars.strategy+'점',color)
    +tpHB('운영/생산',bars.operation,bars.operation+'점',color)
    +tpHB('인사/조직',Math.max(bars.finance-5,60),Math.max(bars.finance-5,60)+'점',color)
    +tpHB('IT/디지털',Math.max(bars.operation-8,55),Math.max(bars.operation-8,55)+'점',color)
    +'</div>'
    +'</div>'
    +'<div class="tp-colF">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">마케팅 현황 분석</h4>'
    +tpLst(d.marketing||[
      '주력 제품의 독창성과 품질 경쟁력이 입소문 마케팅의 핵심 동력으로 작용하고 있음',
      'SNS 중심의 디지털 마케팅 강화를 통해 비용 효율적인 고객 획득 전략이 필요함',
      '충성 고객층을 기반으로 한 재구매율 제고 전략 및 리뷰 마케팅 활성화가 요구됨',
      'B2B 납품 채널 확장을 통해 안정적 매출 기반을 조성할 수 있는 여건이 갖추어져 있음',
      '온라인 플랫폼(쿠팡, 스마트스토어 등) 입점 확대를 통한 유통 채널 다각화가 필요함'
    ],color)+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">전략 포지셔닝 방향</h4>'
    +tpLst(d.marketing_items||[
      '틈새시장(niche market) 선점 전략으로 경쟁사 대비 차별화된 포지션 구축 필요',
      '프리미엄 이미지 강화를 통한 가격 결정력(pricing power) 확보 전략 수립 권고'
    ],'#7c3aed')+'</div>'
    +'</div>'
    +'</div>'
  );

  // P4: 인사·운영·IT — 3컬럼 풍성
  var p4 = tpPage(4,'인사·조직 및 운영·생산·IT 분석','조직 역량 · 생산 효율 · 디지털 현황',color,
    '<div class="tp-3col">'
    +'<div class="tp-3c">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">인사·조직 현황</h4>'
    +tpLst(d.hr||[
      '소수 정예 팀 구성으로 핵심 역량에 집중 — 인당 생산성이 업종 평균 대비 우수함',
      '대표자 중심의 의사결정 구조로 빠른 실행력을 보유하고 있으나 권한 분산이 필요함',
      '핵심 인력 이탈 리스크를 관리하기 위한 성과 공유 체계 및 인센티브 제도가 필요함',
      '사업 성장에 따른 전문 인력(영업·마케팅·생산) 채용 계획을 조기 수립해야 함',
      '조직 문화 정립 및 업무 매뉴얼화를 통해 성장 기반 인프라를 구축해야 함'
    ],color)+'</div>'
    +'</div>'
    +'<div class="tp-3c">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">운영·생산 현황</h4>'
    +tpLst(d.ops||[
      '현재 생산 방식은 수작업 비중이 높아 자동화 설비 도입 시 원가 절감 여력이 큼',
      '품질관리 체계를 체계화하여 고객 불만율을 낮추고 재구매율을 높여야 함',
      '원재료 조달 프로세스를 최적화하여 재고 비용과 리드타임을 동시에 단축해야 함',
      '위탁 생산 및 자체 생산의 비율 최적화로 고정비 부담을 최소화할 필요가 있음',
      'ISO 품질인증 취득을 통해 B2B 납품 시 요구되는 품질 기준을 충족시킬 수 있음'
    ],color)+'</div>'
    +'</div>'
    +'<div class="tp-3c">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">IT·디지털 현황</h4>'
    +tpLst(d.it||[
      '기본적인 ERP 시스템 도입을 통해 재고·매출·회계 통합 관리 체계를 갖출 필요가 있음',
      '판매 채널 데이터를 통합 분석하는 CRM 시스템 도입으로 고객 관리 역량을 강화해야 함',
      'SNS 채널 운영 및 콘텐츠 마케팅을 통해 브랜드 인지도를 체계적으로 높여야 함',
      '자사몰 구축을 통해 플랫폼 수수료를 절감하고 고객 데이터 직접 확보가 가능함',
      '물류·배송 자동화 솔루션 도입으로 주문처리 시간 단축 및 고객 만족도 향상 가능'
    ],color)+'</div>'
    +'</div>'
    +'</div>'
  );

  // P5: 가점추천 — 2컬럼 (카드목록 | 총계+전략)
  var p5 = tpPage(5,'가점추천','인증 취득 시 정책자금 한도 최대화',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50">'
    +'<div style="margin-bottom:8px"><h4 style="font-size:13px;font-weight:700;color:'+color+';margin-bottom:10px">추천 인증 목록</h4>'
    +certs.map(function(c,i){return '<div class="tp-cert"><div class="tp-certi" style="background:'+cBgs[i%cBgs.length]+'">'+cIcons[i%cIcons.length]+'</div><div class="tp-certb"><div class="tp-certn">'+c.name+'</div><div class="tp-certd">'+c.effect+'</div></div><div class="tp-certa"><div class="tp-certv" style="color:'+color+'">'+c.amount+'</div><div class="tp-certp">'+c.period+'</div></div></div>';}).join('')
    +'</div>'
    +'</div>'
    +'<div class="tp-colF">'
    +'<div style="background:#eff6ff;border-radius:8px;padding:16px;border:1px solid #bfdbfe;text-align:center;margin-bottom:12px">'
    +'<div style="font-size:12px;font-weight:700;color:#1e40af;margin-bottom:4px">인증 완료 시 총 추가 조달 한도</div>'
    +'<div style="font-size:28px;font-weight:900;color:'+color+';line-height:1.2">최대 +'+(totalC>0?totalC+'억원':'6억 5천만원')+'</div>'
    +'<div style="font-size:12px;color:#64748b;margin-top:4px">현재 신청 가능 한도 + 인증 취득 후 추가 조달</div>'
    +'</div>'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">인증 취득 우선순위 전략</h4>'
    +tpLst([
      '1순위: 벤처인증 (약 6개월 소요) — 즉각적인 자금 한도 확대 효과가 가장 큼',
      '2순위: 이노비즈 인증 (1년 내) — 중진공 기술개발자금 신청 자격 부여',
      '3순위: 기업부설연구소 (중기) — R&D 세액공제 25% + 기보 기술보증 우대 적용',
      '4순위: HACCP 인증 (장기) — 대형마트·단체급식 납품 채널 직접 연결 가능',
      '인증 준비는 사업계획서 작성과 병행하여 효율적으로 진행할 것을 권고함'
    ],color)+'</div>'
    +'</div>'
    +'</div>'
  );

  // P6: 로드맵 — 3단 + 종합의견
  var p6 = tpPage(6,'개선 방향 및 성장 로드맵','단기·중기·장기 실행 계획',color,
    '<div class="tp-rm3" style="margin-bottom:12px">'
    +'<div class="tp-rmi" style="border-top:4px solid '+color+'">'
    +'<div class="tp-rmph" style="color:#1d4ed8">⚡ 단기 (6개월)</div>'
    +(d.roadmap_short||['벤처기업 인증 신청 및 추진','정책자금 신청서류 준비 완료','월별 매출 및 현금흐름 관리 시스템 구축','마케팅 채널 최적화 및 SNS 운영 강화']).map(function(t){return '<div class="tp-rmtk">'+t+'</div>';}).join('')
    +'</div>'
    +'<div class="tp-rmi" style="border-top:4px solid #16a34a">'
    +'<div class="tp-rmph" style="color:#15803d">📈 중기 (1년)</div>'
    +(d.roadmap_mid||['중진공·기보 정책자금 조달 완료','생산 설비 확충 및 원가 절감 실현','이노비즈 인증 취득 추진','B2B 납품 채널 2개 이상 확보']).map(function(t){return '<div class="tp-rmtk">'+t+'</div>';}).join('')
    +'</div>'
    +'<div class="tp-rmi" style="border-top:4px solid #7c3aed">'
    +'<div class="tp-rmph" style="color:#6d28d9">🌟 장기 (3년)</div>'
    +(d.roadmap_long||['매출 30억 달성 및 2호 제품 론칭','기업부설연구소 설립 및 R&D 투자','온라인 자사몰 구축 및 직판 체계 확립','해외 수출 타당성 검토 및 준비']).map(function(t){return '<div class="tp-rmtk">'+t+'</div>';}).join('')
    +'</div>'
    +'</div>'
    +'<div class="tp-sb" style="background:#eff6ff;border-color:#bfdbfe">'
    +'<h4 style="color:#1e40af">★ 종합 의견 및 컨설턴트 총평</h4>'
    +tpLst(d.summary||[
      '본 기업은 단기간의 폭발적 매출 성장과 독창적인 제품 기술력을 보유한 고성장 잠재력 기업으로 평가됨',
      '인증 취득 로드맵을 체계적으로 실행할 경우, 추가 정책자금 조달을 통한 성장 가속화가 기대됨',
      '전략적 채널 확대와 조직 역량 강화를 병행하여 3년 내 시장 리더십 확보가 가능한 상황임'
    ],color)+'</div>'
  );

  return tplStyle(color)+'<div class="tp-wrap">'+cover+p1+p2+p3+p4+p5+p6+'</div>';
}

// ===========================
// ★ 경영진단 컨설턴트용 (표지+7P)
// ===========================
function buildMgmtConsultantHTML(d, cData, rev, dateStr) {
  var color = '#3b82f6';
  var exp   = calcExp(cData, rev);
  var cover = buildCoverHTML(cData,{title:'AI 경영진단보고서',reportKind:'AI 경영진단보고서',version:'consultant',borderColor:'#1e293b'},rev,dateStr);
  var radar = (d.radar||[65,80,68,70,55]).join(',');
  var bars  = d.marketing_bars||{finance:72,strategy:85,operation:68};
  var certs = d.certs||[{name:'벤처인증',effect:'중진공 우대금리 적용',amount:'+2억',period:'6개월'},{name:'이노비즈',effect:'기보 우대 보증',amount:'+3억',period:'1년'}];

  var p1 = tpPage(1,'경영진단 개요','기업현황 · 리스크 분석',color,
    '<div class="tp-2col">'
    +'<div class="tp-col38">'
    +'<table class="tp-ovt"><tr><th>기업명</th><td colspan="3">'+cData.name+'</td></tr>'
    +'<tr><th>대표자</th><td>'+(cData.rep||'-')+'</td><th>업종</th><td>'+(cData.industry||'-')+'</td></tr>'
    +'<tr><th>사업자번호</th><td>'+(cData.bizNum||'-')+'</td><th>상시근로자</th><td>'+(cData.empCount||'-')+'명</td></tr>'
    +'<tr><th>전년 매출</th><td>'+fKRW(rev.y25)+'</td><th>금년 예상</th><td>'+fKRW(exp)+'</td></tr></table>'
    +'<div class="tp-grade">'
    +'<div class="tp-grade-lbl">종합 진단 등급</div>'
    +'<div class="tp-grade-val" style="color:'+color+'">'+(d.grade||'B+')+'</div>'
    +'<div class="tp-grade-desc">'+(d.grade_desc||'성장 유망 단계')+'</div>'
    +'</div>'
    +'</div>'
    +'<div class="tp-colF">'
    +'<div class="tp-sb" style="margin-bottom:10px"><h4 style="color:'+color+'">진단 목적 및 방향</h4>'
    +tpLst(d.overview||['진단 목적 분석 중'],color)+'</div>'
    +'<div class="tp-sb" style="background:#fffbeb;border-color:#fcd34d;flex:1">'
    +'<h4 style="color:#92400e">🚨 핵심 리스크 요약</h4>'
    +tpLst(d.key_risks||['리스크 분석 중'],'#d97706')+'</div>'
    +'</div>'
    +'</div>'
  );

  var p2 = tpPage(2,'재무 현황 분석','리스크 중점 분석',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">연도별 매출 추이</h4>'
    +'<div class="tp-ch" style="height:185px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div></div>'
    +'</div>'
    +'<div class="tp-colF">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">재무 현황</h4>'
    +tpLst(d.finance_strengths||['재무 분석 중'],color)+'</div>'
    +tpFB(d.fb_finance||['재무 리스크 분석 중','현금흐름 관리 방안 수립 필요'])
    +'</div>'
    +'</div>'
  );

  var p3 = tpPage(3,'전략 및 마케팅 분석','취약점 포함 종합 분석',color,
    '<div class="tp-2col">'
    +'<div class="tp-col45">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">역량 레이더</h4>'
    +'<div class="tp-ch" style="height:200px"><canvas id="rp-radar" data-scores="'+radar+'" style="width:100%;height:100%"></canvas></div></div>'
    +'<div class="tp-sb" style="margin-top:10px"><h4 style="color:'+color+'">영역별 점수</h4>'
    +tpHB('재무건전성',bars.finance,bars.finance+'점',color)
    +tpHB('전략/마케팅',bars.strategy,bars.strategy+'점',color)
    +tpHB('운영/생산',bars.operation,bars.operation+'점',color)+'</div>'
    +'</div>'
    +'<div class="tp-colF">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">마케팅 분석</h4>'
    +tpLst(d.marketing||['마케팅 분석 중'],color)+'</div>'
    +tpFB(d.fb_marketing||['마케팅 리스크 분석 중'])
    +'</div>'
    +'</div>'
  );

  var p4 = tpPage(4,'인사·조직 및 운영·생산','리스크 중점',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">인사·조직</h4>'
    +tpLst(d.hr||['인사 분석 중'],color)+'</div>'
    +'</div>'
    +'<div class="tp-colF">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">운영·생산</h4>'
    +tpLst(d.ops||['운영 분석 중'],color)+'</div>'
    +tpFB(d.fb_hr_ops||['인사·운영 리스크 분석 중'])
    +'</div>'
    +'</div>'
  );

  var p5 = tpPage(5,'IT·디지털 및 정부지원','개선 과제',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50"><div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">IT·디지털 현황</h4>'
    +tpLst(d.it||['IT 분석 중'],color)+'</div></div>'
    +'<div class="tp-colF">'+tpFB(d.fb_it||['IT 개선 방향 분석 중'])+'</div>'
    +'</div>'
  );

  var p6 = tpPage(6,'개선 방향 및 성장 로드맵','우선순위별 실행',color,
    '<div class="tp-rm3" style="margin-bottom:12px">'
    +'<div class="tp-rmi" style="border-top:4px solid '+color+'">'
    +'<div class="tp-rmph" style="color:#1d4ed8">⚡ 단기</div>'
    +(d.roadmap_short||['단기1','단기2','단기3','단기4']).map(function(t){return '<div class="tp-rmtk">'+t+'</div>';}).join('')
    +'</div>'
    +'<div class="tp-rmi" style="border-top:4px solid #16a34a">'
    +'<div class="tp-rmph" style="color:#15803d">📈 중기</div>'
    +(d.roadmap_mid||['중기1','중기2','중기3','중기4']).map(function(t){return '<div class="tp-rmtk">'+t+'</div>';}).join('')
    +'</div>'
    +'<div class="tp-rmi" style="border-top:4px solid #7c3aed">'
    +'<div class="tp-rmph" style="color:#6d28d9">🌟 장기</div>'
    +(d.roadmap_long||['장기1','장기2','장기3','장기4']).map(function(t){return '<div class="tp-rmtk">'+t+'</div>';}).join('')
    +'</div>'
    +'</div>'
    +tpFB(d.fb_roadmap||['로드맵 우선순위 분석 중'])
  );

  var p7 = tpPage('🔒','컨설턴트 실질 조언','내부 전용 — 대외비','#d97706',
    '<div class="tp-cons">'
    +'<h3>🔒 컨설턴트 전용 자료 — 대외비</h3>'
    +'<div class="tp-2col" style="gap:12px">'
    +'<div style="display:flex;flex-direction:column;gap:8px">'
    +'<div class="tp-inn"><div class="tp-innt">🚨 시급 해결 이슈 TOP 3</div>'+tpLst(d.consultant_issues||['시급 이슈 분석 중'],'#d97706')+'</div>'
    +'<div class="tp-inn"><div class="tp-innt">💰 정책자금 신청 전략</div>'+tpLst(d.consultant_funds||['정책자금 전략 분석 중'],'#d97706')+'</div>'
    +'</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px">'
    +'<div class="tp-inn"><div class="tp-innt">📜 인증 취득 전략 + 가점추천</div>'
    +tpLst(d.consultant_certs||['인증 전략 분석 중'],'#d97706')
    +certs.slice(0,2).map(function(c){return '<div class="tp-cert" style="background:white;border:1px solid #fcd34d;margin-top:5px"><div class="tp-certb"><div class="tp-certn">'+c.name+'</div><div class="tp-certd">'+c.effect+'</div></div><div class="tp-certa"><div class="tp-certv" style="color:#d97706">'+c.amount+'</div><div class="tp-certp">'+c.period+'</div></div></div>';}).join('')
    +'</div>'
    +'<div class="tp-g2" style="gap:7px">'
    +'<div class="tp-inn" style="margin-bottom:0"><div class="tp-innt">📈 마케팅 개선</div>'+tpLst(d.consultant_marketing||['마케팅 분석 중'],'#d97706')+'</div>'
    +'<div class="tp-inn" style="margin-bottom:0"><div class="tp-innt">💳 신용 개선</div>'+tpLst(d.consultant_credit||['신용 개선 분석 중'],'#d97706')+'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
  );

  return tplStyle(color)+'<div class="tp-wrap">'+cover+p1+p2+p3+p4+p5+p6+p7+'</div>';
}


// ===========================
// ★ 상세 재무진단 (표지+3P)
// ===========================
function buildFinanceHTML(d, cData, rev, dateStr) {
  var color = '#2563eb';
  var exp   = calcExp(cData, rev);
  var cover = buildCoverHTML(cData,{title:'AI 상세 재무진단',reportKind:'AI 상세 재무진단 리포트',vLabel:'리포트',borderColor:color},rev,dateStr);
  var scores = d.scores||{profit:72,stable:80,growth:88};
  var scDescs = d.score_descs||{profit:'매출이익률 양호',stable:'부채비율 안정적',growth:'매출 성장률 최우수'};
  var debtData  = d.debt||[{name:'중진공',ratio:54},{name:'기보',ratio:27},{name:'재단',ratio:19}];
  var debtColors = ['#2563eb','#7c3aed','#06b6d4','#16a34a','#ea580c'];
  var profitBars = d.profit_bars||[{label:'매출 성장률(YoY)',value:85,display:'+21%'},{label:'매출이익률',value:62,display:'38%'},{label:'영업이익률',value:44,display:'22%'},{label:'현금흐름 안정성',value:70,display:'양호'}];

  function gauge(val,col,lbl,desc){
    var da=Math.round((val/100)*126);
    return '<div class="tp-sb" style="text-align:center">'
      +'<div style="font-size:13px;font-weight:700;color:'+col+';margin-bottom:6px">'+lbl+'</div>'
      +'<svg viewBox="0 0 100 56" width="90" height="56" style="display:block;margin:0 auto 4px">'
      +'<path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="#e2e8f0" stroke-width="10"/>'
      +'<path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="'+col+'" stroke-width="10" stroke-dasharray="'+da+' '+(126-da)+'" stroke-linecap="round"/>'
      +'<text x="50" y="47" text-anchor="middle" font-size="15" font-weight="700" fill="#1e293b">'+val+'</text>'
      +'</svg>'
      +'<div style="font-size:12px;color:#64748b;font-weight:500">'+desc+'</div>'
      +'</div>';
  }

  var p1 = tpPage(1,'재무 종합 현황','수익성·안정성·성장성',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50">'
    +'<div class="tp-sb" style="margin-bottom:10px"><h4 style="color:'+color+'">연도별 매출 추이</h4>'
    +'<div class="tp-ch" style="height:185px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div></div>'
    +'<div class="tp-g4">'
    +tpMC('전년 매출',fKRW(rev.y25),'2025년',color)
    +tpMC('금년 예상',fKRW(exp),'연환산',color)
    +tpMC('성장률',(rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'분석중','YoY','#16a34a')
    +tpMC('종합 점수',Math.round((scores.profit+scores.stable+scores.growth)/3)+'점','100점 만점',color)
    +'</div>'
    +'</div>'
    +'<div class="tp-colF">'
    +'<div class="tp-g3" style="flex-shrink:0">'
    +gauge(scores.profit,color,'수익성',scDescs.profit)
    +gauge(scores.stable,'#16a34a','안정성',scDescs.stable)
    +gauge(scores.growth,'#7c3aed','성장성',scDescs.growth)
    +'</div>'
    +'<div class="tp-sb" style="flex:1;margin-top:10px"><h4 style="color:'+color+'">재무 종합 진단 요약</h4>'
    +tpLst([
      '3개 핵심 지표(수익성·안정성·성장성) 종합 점수: '+Math.round((scores.profit+scores.stable+scores.growth)/3)+'점으로 업종 평균 대비 우수',
      scDescs.profit+' — 매출 대비 이익 창출 능력이 동업종 평균을 상회하고 있음',
      scDescs.stable+' — 외부 차입 의존도가 낮고 자체 자본 비율이 안정적으로 유지되고 있음',
      scDescs.growth+' — 전년 대비 성장률이 업계 평균을 크게 상회하여 성장 잠재력이 확인됨'
    ],color)+'</div>'
    +'</div>'
    +'</div>'
  );

  var p2 = tpPage(2,'수익성 및 안정성 분석','부채 구성 · 재무 지표',color,
    '<div class="tp-3col">'
    +'<div class="tp-3c">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">수익성 분석</h4>'
    +profitBars.map(function(b){return tpHB(b.label,b.value,b.display,color);}).join('')
    +'</div>'
    +'</div>'
    +'<div class="tp-3c">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">부채 구성 비율</h4>'
    +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">'
    +'<div class="tp-ch" style="width:100px;height:100px;flex-shrink:0;padding:3px;border:none"><canvas id="fp-donut" data-names="'+debtData.map(function(x){return x.name;}).join('|')+'" data-ratios="'+debtData.map(function(x){return x.ratio;}).join(',')+'" style="width:100%;height:100%"></canvas></div>'
    +'<div class="tp-dleg">'+debtData.map(function(dd,i){return '<div class="tp-dli"><div class="tp-ddt" style="background:'+debtColors[i]+'"></div><span style="flex:1">'+dd.name+'</span><span style="font-weight:700">'+dd.ratio+'%</span></div>';}).join('')+'</div>'
    +'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">부채 분석 요약</h4>'
    +tpLst(['정책자금 비중이 높아 금리 부담이 낮고 장기 상환 구조로 안정적임','단기 차입금 비중이 낮아 유동성 위기 가능성이 극히 낮은 수준임'],'#64748b')+'</div>'
    +'</div>'
    +'</div>'
    +'<div class="tp-3c">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">안정성 핵심 지표</h4>'
    +(d.stable_metrics||[{label:'부채비율',value:'낮음',desc:'전액 정책자금'},{label:'KCB 신용',value:'710점',desc:'3등급'},{label:'NICE 신용',value:'740점',desc:'3등급'},{label:'연체·체납',value:'없음',desc:'리스크 최저'}]).map(function(m){
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f1f5f9">'
        +'<span style="font-size:13px;color:#64748b">'+m.label+'</span>'
        +'<div style="text-align:right"><div style="font-size:14px;font-weight:700;color:'+color+'">'+m.value+'</div><div style="font-size:11px;color:#94a3b8">'+m.desc+'</div></div>'
        +'</div>';
    }).join('')
    +'</div>'
    +'</div>'
    +'</div>'
  );

  var p3 = tpPage(3,'성장성 분석 및 재무 개선 방향','목표 · 액션플랜',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50">'
    +'<div class="tp-sb" style="margin-bottom:10px"><h4 style="color:#7c3aed">성장성 분석</h4>'
    +tpLst(d.growth_items||['매출 성장세가 업종 평균을 크게 상회하며 시장 내 입지를 빠르게 확대하고 있음','신규 고객 유입율이 높아 시장 침투 단계에서 확산 단계로의 전환이 가시화되고 있음','핵심 제품 기술력을 기반으로 신제품 개발 및 라인업 확장 가능성이 충분함','정책자금 조달 시 생산 설비 투자로 추가적인 매출 성장 가속화가 가능함'],'#7c3aed')+'</div>'
    +'<div class="tp-sb"><h4 style="color:#7c3aed">3개년 목표 매출</h4>'
    +'<div class="tp-ch" style="height:110px"><canvas id="fp-growth-chart" style="width:100%;height:100%"></canvas></div>'
    +'</div>'
    +'</div>'
    +'<div class="tp-colF">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">재무 개선 우선순위 액션플랜</h4>'
    +'<div class="tp-rm3">'
    +'<div class="tp-rmi" style="border-top:3px solid #ef4444"><div class="tp-rmph" style="color:#dc2626;font-size:12px">🔴 즉시 (1개월)</div><div style="font-size:12px;color:#64748b;line-height:1.6">'+(d.action_urgent||'월별 손익계산서 작성 및 현금흐름표 정기 관리 체계 구축 필요')+'</div></div>'
    +'<div class="tp-rmi" style="border-top:3px solid #f97316"><div class="tp-rmph" style="color:#ea580c;font-size:12px">🟠 단기 (3개월)</div><div style="font-size:12px;color:#64748b;line-height:1.6">'+(d.action_short||'정책자금 신청서류 준비 및 벤처인증 추진으로 자금 조달 기반 마련 필요')+'</div></div>'
    +'<div class="tp-rmi" style="border-top:3px solid '+color+'"><div class="tp-rmph" style="color:#1d4ed8;font-size:12px">🔵 중기 (1년)</div><div style="font-size:12px;color:#64748b;line-height:1.6">'+(d.action_mid||'조달한 자금으로 생산 설비 확충 및 원가율 개선, 제2 매출 채널 확보 실현')+'</div></div>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
  );

  return tplStyle(color)+'<div class="tp-wrap">'+cover+p1+p2+p3+'</div>';
}

// ===========================
// ★ 상권분석 (표지+2P)
// ===========================
function buildTradeHTML(d, cData, rev, dateStr) {
  var color = '#0d9488';
  var cover = buildCoverHTML(cData,{title:'AI 상권분석 리포트',reportKind:'AI 빅데이터 상권분석',vLabel:'리포트',borderColor:color},rev,dateStr);
  var radar  = (d.radar||[82,75,68,72,80]).join(',');
  var sim    = d.sim||{s0:9167,s1:12500,s2:16667,s3:25000};
  var target = d.target||{age:'30~40대',household:'1~2인',channel:'온라인',cycle:'월 2~3회'};

  var p1 = tpPage(1,'상권 현황 분석','핵심 입지 지표 · 경쟁 분석',color,
    '<div class="tp-3col">'
    +'<div class="tp-3c">'
    +'<div class="tp-g3" style="flex-shrink:0;margin-bottom:10px">'
    +tpMC('유동인구 (일평균)',d.traffic||'2,400명','일평균 유동량',color)
    +tpMC('반경1km 경쟁업체',(d.competitors||7)+'개','직접 경쟁사',(parseInt(d.competitors||7)>5)?'#f97316':'#16a34a')
    +tpMC('입지 경쟁력 등급',d.grade||'B+','상위 30%',color)
    +'</div>'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">상권 특성 분석</h4>'
    +tpLst(d.features||['상권 특성 분석 중'],color)+'</div>'
    +'</div>'
    +'<div class="tp-3c">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">입지 경쟁력 레이더</h4>'
    +'<div class="tp-ch" style="height:200px"><canvas id="tp-radar" data-scores="'+radar+'" style="width:100%;height:100%"></canvas></div></div>'
    +'</div>'
    +'<div class="tp-3c">'
    +'<div class="tp-sb" style="margin-bottom:10px"><h4 style="color:'+color+'">경쟁 현황 요약</h4>'
    +'<div style="display:flex;justify-content:space-around;text-align:center;padding:8px 0">'
    +'<div><div style="font-size:24px;font-weight:700;color:'+color+'">'+(d.comp_direct||7)+'</div><div style="font-size:12px;color:#64748b;margin-top:2px">직접 경쟁</div></div>'
    +'<div><div style="font-size:24px;font-weight:700;color:#f97316">'+(d.comp_strong||3)+'</div><div style="font-size:12px;color:#64748b;margin-top:2px">강성 경쟁</div></div>'
    +'<div><div style="font-size:24px;font-weight:700;color:#16a34a">'+(d.diff_potential||'高')+'</div><div style="font-size:12px;color:#64748b;margin-top:2px">차별화 여지</div></div>'
    +'</div></div>'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">운영 전략 포인트</h4>'
    +tpLst(d.strategy||['운영 전략 분석 중'],color)+'</div>'
    +'</div>'
    +'</div>'
  );

  var p2 = tpPage(2,'타겟 고객 및 매출 예측','고객 프로파일 · 시뮬레이션',color,
    '<div class="tp-2col">'
    +'<div class="tp-col40">'
    +'<div class="tp-sb" style="margin-bottom:10px"><h4 style="color:'+color+'">타겟 고객 프로파일</h4>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +[['주 연령대',target.age],['가구 유형',target.household],['구매 채널',target.channel],['구매 주기',target.cycle]].map(function(pair){return '<div style="background:white;border-radius:7px;padding:10px 8px;border:1px solid #e2e8f0;text-align:center"><div style="font-size:11px;color:#64748b;margin-bottom:3px">'+pair[0]+'</div><div style="font-size:15px;font-weight:700;color:'+color+'">'+pair[1]+'</div></div>';}).join('')
    +'</div></div>'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">마케팅 전략 방향</h4>'
    +tpLst(d.strategy||['전략 분석 중'],color)+'</div>'
    +'</div>'
    +'<div class="tp-colF">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">매출 잠재력 시뮬레이션 (만원/월)</h4>'
    +'<div class="tp-ch" style="height:200px"><canvas id="tp-linechart" data-s0="'+sim.s0+'" data-s1="'+sim.s1+'" data-s2="'+sim.s2+'" data-s3="'+sim.s3+'" style="width:100%;height:100%"></canvas></div>'
    +'<div class="tp-g4" style="margin-top:10px">'
    +tpMC('현재',Math.round(sim.s0/100)*100+'만','/월',color)
    +tpMC('6개월',Math.round(sim.s1/100)*100+'만','+'+Math.round((sim.s1-sim.s0)/sim.s0*100)+'%',color)
    +tpMC('1년',Math.round(sim.s2/100)*100+'만','+'+Math.round((sim.s2-sim.s0)/sim.s0*100)+'%',color)
    +tpMC('2년',Math.round(sim.s3/100)*100+'만','+'+Math.round((sim.s3-sim.s0)/sim.s0*100)+'%',color)
    +'</div>'
    +'<div style="font-size:12px;color:#64748b;margin-top:6px;padding:8px;background:#f0fdfa;border-radius:6px">※ 업종 평균 성장률 달성 시 추정값 (전제: 운영 전략 이행, 경쟁 환경 유사 수준 유지)</div>'
    +'</div>'
    +'</div>'
    +'</div>'
  );

  return tplStyle(color)+'<div class="tp-wrap">'+cover+p1+p2+'</div>';
}

// ===========================
// ★ 마케팅제안 (표지+2P)
// ===========================
function buildMarketingHTML(d, cData, rev, dateStr) {
  var color    = '#db2777';
  var cover    = buildCoverHTML(cData,{title:'AI 마케팅 제안서',reportKind:'AI 맞춤형 마케팅 제안서',vLabel:'제안서',borderColor:color},rev,dateStr);
  var channels = d.channels||[{name:'SNS (인스타·유튜브)',score:88},{name:'네이버 검색광고',score:75},{name:'블로그·리뷰 마케팅',score:70},{name:'오프라인 판촉',score:42}];
  var budget   = d.budget||[{name:'SNS 광고',ratio:40},{name:'검색광고',ratio:25},{name:'콘텐츠제작',ratio:20},{name:'기타',ratio:15}];
  var bColors  = ['#db2777','#9d174d','#f4c0d1','#fdf2f8'];
  var kpi      = d.kpi||[{label:'SNS 팔로워',value:'+3,000',period:'3개월'},{label:'월 매출 증가',value:'+30%',period:'6개월'},{label:'재구매율',value:'40%',period:'목표'},{label:'리뷰 누적',value:'500건',period:'6개월'}];
  var roadmap  = d.roadmap||[{period:'1월',task:'SNS 채널 개설·브랜딩',highlight:false},{period:'2월',task:'인플루언서·블로거 협업',highlight:false},{period:'3월',task:'바이럴 캠페인 집행',highlight:false},{period:'4~5월',task:'성과 분석·최적화',highlight:true},{period:'6월',task:'정기구독 서비스 론칭',highlight:false},{period:'7월~',task:'오프라인·B2B 진출',highlight:false}];

  var p1 = tpPage(1,'채널별 마케팅 전략 및 예산','채널 효과 · 예산 배분',color,
    '<div class="tp-3col">'
    +'<div class="tp-3c">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">채널별 예상 효과 (점수/100)</h4>'
    +channels.map(function(c,i){return tpHB(c.name,c.score,c.score+'점',i===0?color:i===1?'#be185d':'#9d174d');}).join('')
    +'</div>'
    +'</div>'
    +'<div class="tp-3c">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">핵심 마케팅 전략</h4>'
    +tpLst(d.strategies||[
      '인스타그램·유튜브 쇼츠 중심의 콘텐츠 마케팅으로 브랜드 인지도를 집중 확산함',
      '음식 전문 인플루언서와의 협업을 통해 신뢰도 높은 바이럴 마케팅을 실행함',
      '리뷰 이벤트 및 정기구독 할인 프로그램으로 재구매율과 고객 충성도를 높임',
      '네이버 스마트플레이스 최적화로 지역 내 브랜드 노출을 극대화함',
      '쿠팡·스마트스토어 상세페이지 최적화로 구매 전환율을 높임'
    ],color)+'</div>'
    +'</div>'
    +'<div class="tp-3c">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">예산 배분 ('+(d.budget_total||'700만원/월')+')</h4>'
    +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">'
    +'<div class="tp-ch" style="width:110px;height:110px;flex-shrink:0;padding:4px;border:none"><canvas id="mp-donut" data-names="'+budget.map(function(b){return b.name;}).join('|')+'" data-ratios="'+budget.map(function(b){return b.ratio;}).join(',')+'" style="width:100%;height:100%"></canvas></div>'
    +'<div class="tp-dleg">'+budget.map(function(b,i){return '<div class="tp-dli"><div class="tp-ddt" style="background:'+bColors[i]+'"></div><span style="flex:1">'+b.name+'</span><span style="font-weight:700">'+b.ratio+'%</span></div>';}).join('')+'</div>'
    +'</div>'
    +'<div class="tp-sb" style="background:#fdf2f8;border-color:#fbcfe8">'
    +'<div style="font-size:11px;color:#9d174d;font-weight:700;margin-bottom:4px">예산 운영 원칙</div>'
    +tpLst(['초기 3개월 디지털 채널 집중 투자','4개월차부터 성과 데이터 기반 최적화','월별 ROI 분석 후 채널 비중 재조정'],'#db2777')+'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
  );

  var p2 = tpPage(2,'KPI 목표 및 월별 실행 로드맵','목표 수치 · 실행 타임라인',color,
    '<div style="flex:1;display:flex;flex-direction:column;gap:12px">'
    +'<div class="tp-g4" style="flex-shrink:0">'+kpi.map(function(k){return tpMC(k.label,k.value,k.period,color);}).join('')+'</div>'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">월별 실행 로드맵</h4>'
    +'<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:12px">'
    +roadmap.map(function(r){return '<div style="border-radius:7px;background:'+(r.highlight?'#f4c0d1':'#fdf2f8')+';border:1px solid '+(r.highlight?color:'#f4c0d1')+';padding:10px 8px;"><div style="font-size:12px;font-weight:700;color:'+(r.highlight?'#9d174d':color)+';margin-bottom:5px">'+r.period+'</div><div style="font-size:12px;color:#64748b;line-height:1.45;font-weight:400">'+r.task+'</div></div>';}).join('')
    +'</div>'
    +'<div class="tp-g3">'
    +'<div style="background:#fdf2f8;border-radius:7px;padding:10px 12px;border:1px solid #fbcfe8"><div style="font-size:12px;font-weight:700;color:#9d174d;margin-bottom:5px">📊 1~3개월 핵심 지표</div><div style="font-size:12px;color:#64748b">SNS 팔로워 3,000명<br>리뷰 100건 확보<br>브랜드 검색량 200% ↑</div></div>'
    +'<div style="background:#fdf2f8;border-radius:7px;padding:10px 12px;border:1px solid #fbcfe8"><div style="font-size:12px;font-weight:700;color:#9d174d;margin-bottom:5px">📈 4~6개월 핵심 지표</div><div style="font-size:12px;color:#64748b">월 매출 +30% 달성<br>재구매율 40% 확보<br>구독 고객 200명</div></div>'
    +'<div style="background:#fdf2f8;border-radius:7px;padding:10px 12px;border:1px solid #fbcfe8"><div style="font-size:12px;font-weight:700;color:#9d174d;margin-bottom:5px">🎯 7개월~ 핵심 지표</div><div style="font-size:12px;color:#64748b">B2B 거래처 3건<br>리뷰 500건 누적<br>오프라인 채널 확보</div></div>'
    +'</div>'
    +'</div>'
    +'</div>'
  );

  return tplStyle(color)+'<div class="tp-wrap">'+cover+p1+p2+'</div>';
}

// ===========================
// ★ 정책자금매칭 (표지+3P)
// ===========================
function buildFundHTML(d, cData, rev, dateStr) {
  var color = '#ea580c';
  var cover = buildCoverHTML(cData,{title:'AI 정책자금매칭',reportKind:'AI 정책자금 매칭 리포트',vLabel:'리포트',borderColor:color},rev,dateStr);
  var checks    = d.checks||[{text:'중소기업 해당 여부',status:'pass'},{text:'국세·지방세 체납 없음',status:'pass'},{text:'금융연체 이력 없음',status:'pass'},{text:'사업자 등록 유효',status:'pass'},{text:'업력 2년 이상',status:'cond'},{text:'벤처·이노비즈 인증',status:'fail'}];
  var score     = d.score||78;
  var gda       = Math.round((score/100)*151);
  var funds     = d.funds||[{rank:1,name:'중진공 소공인 특화자금',limit:'1억',tags:['금리 2.5%','즉시 신청 가능','제조업 우대']},{rank:2,name:'기보 기술보증 (특허 우대)',limit:'3억',tags:['보증료 0.5%','특허 1건 우대','90% 보증']},{rank:3,name:'소진공 성장촉진자금',limit:'1억',tags:['금리 3.0%','창업 3년 이내','온라인 신청']},{rank:4,name:'지역신보 소액보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤','빠른 처리']},{rank:5,name:'신보 창업기업 특례보증',limit:'2억',tags:['보증료 0.5%','벤처인증 조건부','95% 보증']}];
  var rankColors= [color,'#f97316','#fb923c','#94a3b8','#94a3b8'];
  var comp      = d.comparison||[{org:'중진공',limit:'1억',rate:'2.5%',period:'5년',diff:'easy'},{org:'기보',limit:'3억',rate:'0.5%',period:'7년',diff:'mid'},{org:'소진공',limit:'1억',rate:'3.0%',period:'5년',diff:'easy'},{org:'지역신보',limit:'5천만',rate:'0.8%',period:'3년',diff:'easy'}];
  var diffMap   = {easy:{bg:'#dcfce7',tc:'#166534',l:'쉬움'},mid:{bg:'#fef9c3',tc:'#854d0e',l:'보통'},hard:{bg:'#fee2e2',tc:'#991b1b',l:'어려움'}};
  var chkReady  = d.checklist_ready||['사업자등록증 사본','부가세 신고서 (최근 2년)','국세납부증명서','신용정보 동의서'];
  var chkNeed   = d.checklist_need||['사업계획서 (기보 필수)','벤처인증서 (취득 후)'];

  function chkS(s){return s==='pass'?{bg:'#dcfce7',tc:'#16a34a',ic:'✓',bbc:'#dcfce7',btc:'#166534',bl:'통과'}:s==='cond'?{bg:'#fef9c3',tc:'#ca8a04',ic:'!',bbc:'#fef9c3',btc:'#854d0e',bl:'조건부'}:{bg:'#fee2e2',tc:'#dc2626',ic:'✗',bbc:'#fee2e2',btc:'#991b1b',bl:'미보유'};}

  var p1 = tpPage(1,'기업 자격요건 분석','신청 가능 여부 종합 체크',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50"><div class="tp-sb"><h4 style="color:'+color+'">기본 자격 체크리스트</h4>'
    +checks.map(function(c){var s=chkS(c.status);return '<div class="tp-chk"><div class="tp-chi" style="background:'+s.bg+';color:'+s.tc+'">'+s.ic+'</div><div class="tp-cht">'+c.text+'</div><span class="tp-chb" style="background:'+s.bbc+';color:'+s.btc+'">'+s.bl+'</span></div>';}).join('')
    +'</div></div>'
    +'<div class="tp-colF">'
    +'<div class="tp-sb" style="text-align:center;margin-bottom:10px"><h4 style="color:'+color+'">신청 가능성 종합 점수</h4>'
    +'<svg viewBox="0 0 130 72" width="130" height="72" style="display:block;margin:6px auto">'
    +'<path d="M14,62 A52,52 0 0,1 116,62" fill="none" stroke="#e2e8f0" stroke-width="16"/>'
    +'<path d="M14,62 A52,52 0 0,1 116,62" fill="none" stroke="'+color+'" stroke-width="16" stroke-dasharray="'+gda+' '+(151-gda)+'" stroke-linecap="round"/>'
    +'<text x="65" y="57" text-anchor="middle" font-size="22" font-weight="700" fill="#1e293b">'+score+'</text>'
    +'</svg>'
    +'<div style="font-size:15px;font-weight:700;color:'+color+'">'+(d.score_desc||'신청 가능')+'</div>'
    +'<div style="font-size:12px;color:#64748b;margin-top:3px">'+(d.match_count||5)+'개 기관 매칭 완료</div>'
    +'</div>'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">자격 분석 종합</h4>'
    +tpLst(d.score_items||['기본 자격요건 4개 충족 — 주요 정책자금 즉시 신청 가능한 수준임','벤처·이노비즈 인증 취득 시 추가 우대 한도 1~2억원 확보 가능함','현재 조건으로 신청 가능한 자금 총액: 중진공·기보·소진공 합계 약 5억원'],color)+'</div>'
    +'</div>'
    +'</div>'
  );

  var p2 = tpPage(2,'추천 정책자금 TOP 5','한도 · 금리 · 특징 · 신청 전략',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50">'
    +funds.map(function(f,i){return '<div class="tp-rank" style="'+(i<3?'border-left:4px solid '+rankColors[i]:'')+'">'
      +'<div class="tp-rh"><div class="tp-rn" style="background:'+rankColors[i]+'">'+f.rank+'</div><span class="tp-rnm">'+f.name+'</span><span class="tp-rlm" style="color:'+rankColors[i]+'">'+f.limit+'</span></div>'
      +'<div class="tp-rtgs">'+f.tags.map(function(t,j){return '<span class="tp-rtg" style="background:'+(j===0?'#fff7ed':'#f1f5f9')+';color:'+(j===0?'#c2410c':'#475569')+'">'+t+'</span>';}).join('')+'</div>'
      +'</div>';}).join('')
    +'</div>'
    +'<div class="tp-colF">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">자금 신청 우선순위 전략</h4>'
    +tpLst([
      '1순위: 중진공 소공인 특화자금 — 신청 장벽이 낮고 즉시 실행 가능한 최적 선택',
      '2순위: 기보 기술보증 — 특허 1건 보유로 우대 적용 가능, 한도가 가장 큼',
      '3순위: 소진공 성장촉진자금 — 창업 3년 이내 요건 충족 시 추가 신청 가능',
      '병행 전략: 벤처인증 추진 후 신보 특례보증 추가 신청으로 조달 극대화',
      '총 신청 가능 예상 한도: 최소 3억 ~ 최대 5억+ (인증 취득 시)'
    ],color)+'</div>'
    +'</div>'
    +'</div>'
  );

  var p3 = tpPage(3,'기관별 비교 및 신청 전략','비교표 · 준비 서류 체크리스트',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">기관별 조건 비교표</h4>'
    +'<table class="tp-cmpt"><thead><tr style="background:#fff7ed">'
    +'<th style="color:'+color+'">기관</th><th style="color:'+color+'">한도</th><th style="color:'+color+'">금리/보증료</th><th style="color:'+color+'">기간</th><th style="color:'+color+'">난이도</th>'
    +'</tr></thead><tbody>'
    +comp.map(function(c,i){var dm=diffMap[c.diff]||diffMap.easy;return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'><td style="font-weight:700">'+c.org+'</td><td>'+c.limit+'</td><td style="color:#16a34a;font-weight:700">'+c.rate+'</td><td>'+c.period+'</td><td><span style="background:'+dm.bg+';color:'+dm.tc+';padding:2px 7px;border-radius:3px;font-size:11px;font-weight:700">'+dm.l+'</span></td></tr>';}).join('')
    +'</tbody></table>'
    +'</div>'
    +'</div>'
    +'<div class="tp-colF">'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">신청 준비 체크리스트</h4>'
    +'<div style="margin-bottom:6px;font-size:12px;font-weight:700;color:#15803d">✅ 준비 완료 서류</div>'
    +chkReady.map(function(t){return '<div class="tp-chk"><div class="tp-chi" style="background:#dcfce7;color:#16a34a">✓</div><div class="tp-cht">'+t+'</div></div>';}).join('')
    +'<div style="margin:10px 0 6px;font-size:12px;font-weight:700;color:#dc2626">❌ 추가 준비 필요 서류</div>'
    +chkNeed.map(function(t){return '<div class="tp-chk"><div class="tp-chi" style="background:#fee2e2;color:#dc2626">✗</div><div class="tp-cht">'+t+'</div></div>';}).join('')
    +'</div>'
    +'</div>'
    +'</div>'
  );

  return tplStyle(color)+'<div class="tp-wrap">'+cover+p1+p2+p3+'</div>';
}

// ===========================
// ★ AI 사업계획서 (표지+10P)
// ===========================
function buildBizPlanHTML(d, cData, rev, dateStr) {
  var color = '#16a34a';
  var exp   = calcExp(cData, rev);
  var cover = buildCoverHTML(cData,{title:'AI 사업계획서',reportKind:'AI 맞춤형 사업계획서',vLabel:'완성본',borderColor:color},rev,dateStr);

  var swot = d.s2_swot||{strength:['창업 1년 만에 13억 8천만원 폭발적 매출 달성'],weakness:['소규모 인력(4명) 운영으로 사업 확장 속도 제약'],opportunity:['HMR 시장 연 18% 성장 — 육수·국물 세그먼트 최우수'],threat:['대형 식품기업 후발 진입 가능성 상시 존재']};
  var compRows = d.s4_competitor||[{item:'제품경쟁력',self:'★★★★★',a:'★★★★',b:'★★★'},{item:'기술력(특허)',self:'★★★★★',a:'★★★',b:'★★★'},{item:'가격경쟁력',self:'★★★★',a:'★★★★★',b:'★★★★'},{item:'유통망',self:'★★★',a:'★★★★★',b:'★★★★'},{item:'성장성',self:'★★★★★',a:'★★★',b:'★★★'}];
  var diffs = d.s5_items||[{title:'기술 차별화',text:'돈육 사골 농축 압축 기술 특허 보유 — 진입 장벽 구축으로 경쟁사 모방 방어 가능',color:'#16a34a'},{title:'제품 차별화',text:'1회 분량 개별 포장으로 위생·편의성·보관성을 동시에 충족 — 차별화된 고객 경험 제공',color:'#2563eb'},{title:'시장 포지셔닝',text:'HMR 내 돈육 특화 세그먼트 선점 — 틈새 독점 포지션 구축으로 경쟁 압력 최소화',color:'#7c3aed'},{title:'성장 증명력',text:'창업 1년 만에 11억 4천만원 달성 — 시장성 검증 완료, 투자·자금 신뢰도 최고 수준',color:'#ea580c'}];
  var bgMap = {'#16a34a':'#f0fdf4','#2563eb':'#eff6ff','#7c3aed':'#fdf4ff','#ea580c':'#fff7ed'};
  var bdMap = {'#16a34a':'#86efac','#2563eb':'#93c5fd','#7c3aed':'#d8b4fe','#ea580c':'#fdba74'};
  var bpCerts = d.s6_certs||[{name:'벤처기업 인증',effect:'중진공·기보 우대금리 적용 — 추가 자금 한도 최대 2억원 확보 가능함',amount:'+2억',period:'6개월 내'},{name:'이노비즈 인증',effect:'기술혁신형 중소기업 인증 — 기술개발자금 신청 가능함',amount:'+3억',period:'1년 내'},{name:'기업부설연구소',effect:'R&D 세액공제 25% 적용 및 기보 기술보증 우대 적용 가능함',amount:'+1.5억',period:'세액공제 병행'},{name:'HACCP 인증',effect:'대형마트·급식 납품 채널 확대로 매출 직접 연결됨',amount:'채널↑',period:'매출 확대'}];
  var bpIcons = ['🏆','📜','🔬','✅'];
  var bpBgs   = ['#f0fdf4','#eff6ff','#fdf4ff','#fff7ed'];
  var totalBp = bpCerts.filter(function(c){return c.amount&&c.amount!=='채널↑';}).reduce(function(s,c){return s+(parseFloat(c.amount.replace(/[^0-9.]/g,''))||0);},0);
  var needFundStr = cData.needFund>0?fKRW(cData.needFund):'4억원';
  var fundRows = d.s7_rows||[{item:'원재료 구입',amount:'1억 5천만원',ratio:'37.5%',purpose:'돈육 사골 등 핵심 원재료 선매입 및 안정적 재고 확보'},{item:'생산 설비 투자',amount:'1억원',ratio:'25%',purpose:'반자동 생산설비 도입으로 원가율 20% 절감 목표'},{item:'마케팅·채널 확대',amount:'7천만원',ratio:'17.5%',purpose:'SNS 광고·쿠팡 입점·브랜드 마케팅 집행'},{item:'운전자금',amount:'8천만원',ratio:'20%',purpose:'인건비·공과금·사무실 유지비 등 운영 비용'}];
  var kpi9 = d.s9_kpi||{y1:'18억',y2:'24억',ch:'5개↑',emp:'11명'};
  var rmYears = d.s9_roadmap||[{year:'2026',tasks:['정책자금 4억 조달 완료','생산 설비 확충 가동','쿠팡·스마트스토어 입점']},{year:'2027',tasks:['벤처인증 취득','B2B 납품 채널 3곳','매출 24억 달성']},{year:'2028',tasks:['이노비즈 취득','매출 35억 달성','자동화 생산 완성']},{year:'2029~',tasks:['해외 수출 추진','기업부설연구소','매출 100억 목표']}];
  var rmColors = ['#16a34a','#2563eb','#7c3aed','#ea580c'];
  var conclusion = d.s10_conclusion||cData.name+'는 창업 이후 단기간에 폭발적인 매출 성장을 달성하며 시장 내 핵심 플레이어로 부상하고 있음. 돈육 사골 농축 압축 기술 특허와 1회 분량 개별 포장이라는 독창적인 제품력을 보유하고 있어 경쟁사 진입 방어 가능성이 높음. 정책자금 4억원 조달 시 생산 설비 확충과 마케팅 채널 다각화를 통해 2년 내 매출 24억 달성이 충분히 가능한 성장 기반을 갖추고 있음. 인증 취득 로드맵을 체계적으로 실행하면 추가 자금 최대 6.5억원 확보와 함께 중장기 매출 100억 목표 달성 가능성이 충분히 있음.';

  var p1 = tpPage(1,'기업현황분석','기업정보 · 핵심 경쟁력',color,
    '<div class="tp-2col">'
    +'<div class="tp-col45">'
    +'<table class="tp-ovt" style="border-top-color:'+color+'">'
    +'<tr><th style="color:'+color+'">기업명</th><td colspan="3">'+cData.name+'</td></tr>'
    +'<tr><th style="color:'+color+'">대표자</th><td>'+(cData.rep||'-')+'</td><th style="color:'+color+'">업종</th><td>'+(cData.industry||'-')+'</td></tr>'
    +'<tr><th style="color:'+color+'">설립일</th><td>'+(cData.bizDate||'-')+'</td><th style="color:'+color+'">상시근로자</th><td>'+(cData.empCount||'-')+'명</td></tr>'
    +'<tr><th style="color:'+color+'">핵심아이템</th><td colspan="3">'+(cData.coreItem||'-')+'</td></tr>'
    +'<tr><th style="color:'+color+'">전년 매출</th><td>'+fKRW(rev.y25)+'</td><th style="color:'+color+'">금년 예상</th><td>'+fKRW(exp)+'</td></tr>'
    +'</table>'
    +'<div class="tp-g2">'
    +tpMC('업력',cData.bizDate?Math.round((Date.now()-new Date(cData.bizDate))/31536000000)+'년':'2년','고성장 초기',color)
    +tpMC('매출 성장률',(rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'+21%','전년 대비',color)
    +tpMC('신용등급','3등급','KCB 710점','#2563eb')
    +tpMC('필요자금',cData.needFund>0?fKRW(cData.needFund):'4억원','조달 목표','#7c3aed')
    +'</div>'
    +'</div>'
    +'<div class="tp-colF"><div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">기업 현황 분석</h4>'
    +tpLst(d.s1_items||[
      '창업 1년 만에 11억 4천만원을 달성, 금년 14억원 예상으로 초고속 성장세를 기록하고 있음',
      '돈육 사골 농축 압축 기술 특허를 보유하여 경쟁사의 제품 모방 및 시장 진입을 방어하고 있음',
      'HMR 시장 내 돈육 특화 세그먼트에서 독보적인 포지션을 구축하여 빠른 시장 침투를 실현함',
      '소수 정예 4인 팀 운영으로 인당 생산성이 업종 평균을 크게 상회하는 운영 효율성을 보여줌',
      '정책자금 4억원 조달 시 생산 설비 확충 및 채널 다각화로 매출 2배 이상 성장이 가능한 상황임'
    ],color)+'</div></div>'
    +'</div>'
  );

  var p2 = tpPage(2,'SWOT 분석','강점·약점·기회·위협 종합 분석',color,
    '<div class="tp-swot" style="flex:1">'
    +'<div class="tp-sws tp-sw" style="flex:1"><div class="tp-swl">💪 S — 강점 (Strength)</div><ul>'+(swot.strength||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +'<div class="tp-sww tp-sw" style="flex:1"><div class="tp-swl">⚠️ W — 약점 (Weakness)</div><ul>'+(swot.weakness||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +'<div class="tp-swo tp-sw" style="flex:1"><div class="tp-swl">🚀 O — 기회 (Opportunity)</div><ul>'+(swot.opportunity||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +'<div class="tp-swt tp-sw" style="flex:1"><div class="tp-swl">🛡️ T — 위협 (Threat)</div><ul>'+(swot.threat||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +'</div>'
  );

  var p3 = tpPage(3,'시장현황','시장 규모 · 트렌드 · 성장성',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50">'
    +'<div class="tp-g3" style="flex-shrink:0;margin-bottom:10px">'
    +tpMC('HMR 시장','7조원','2022년 기준',color)
    +tpMC('연평균 성장률','18%','육수·국물 세그먼트',color)
    +tpMC('1~2인 가구','61%','핵심 소비층','#7c3aed')
    +'</div>'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">시장 성장 추이</h4>'
    +'<div class="tp-ch" style="height:180px"><canvas id="bp-market-chart" style="width:100%;height:100%"></canvas></div>'
    +'</div>'
    +'</div>'
    +'<div class="tp-colF"><div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">시장 트렌드 분석</h4>'
    +tpLst(d.s3_items||[
      '1~2인 가구 비율 61%로 간편식 수요 증가세가 지속되고 있으며 HMR 시장은 연 18% 성장세를 보임',
      '건강·프리미엄 간편식에 대한 소비자 선호도가 높아지며 고가 제품군의 성장이 두드러지고 있음',
      '온라인 식품 채널(쿠팡·마켓컬리 등) 확대로 진입 장벽이 낮아지고 소규모 브랜드의 성장 기회가 확대됨',
      '육수·국물 세그먼트는 HMR 중에서도 가장 빠른 성장세를 보이며 대체 불가능한 필수 식품으로 자리잡음',
      '식품 안전·품질 인증에 대한 소비자 요구가 높아져 HACCP 등 인증 취득 기업이 채널 확보에 유리함'
    ],color)+'</div></div>'
    +'</div>'
  );

  var p4 = tpPage(4,'경쟁력분석','경쟁사 비교 · 시장 내 포지셔닝',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50">'
    +'<div class="tp-sb" style="margin-bottom:10px"><h4 style="color:'+color+'">경쟁력 분석</h4>'
    +tpLst(d.s4_items||[
      '특허 기술 보유로 동일 제품 제조가 불가능하여 직접적인 가격 경쟁에서 원천 차단됨',
      '창업 초기임에도 검증된 시장 수요를 보유하여 경쟁사 대비 제품 신뢰도가 높음',
      '1회 개별 포장이라는 차별화된 제품 스펙으로 경쟁사 제품과 직접 비교가 어려움',
      '초기 시장 선점 효과로 구매 고객의 재구매율이 높아 충성 고객 확보 속도가 빠름'
    ],color)+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">강점 요인 종합</h4>'
    +tpLst(['기술 특허 + 제품 차별화 + 성장 검증 = 압도적 경쟁 우위 구조 확보'],'#7c3aed')+'</div>'
    +'</div>'
    +'<div class="tp-colF"><div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">경쟁사 비교표</h4>'
    +'<table class="tp-ctb"><thead><tr><th style="text-align:left">비교 항목</th><th>'+cData.name+'</th><th>경쟁사 A</th><th>경쟁사 B</th></tr></thead>'
    +'<tbody>'+compRows.map(function(r,i){return '<tr'+(i%2===0?'':' style="background:#f8fafc"')+'><td>'+r.item+'</td><td>'+r.self+'</td><td>'+r.a+'</td><td>'+r.b+'</td></tr>';}).join('')+'</tbody></table>'
    +'</div></div>'
    +'</div>'
  );

  var p5 = tpPage(5,'차별점 및 핵심경쟁력','4대 핵심 강점',color,
    '<div class="tp-2col" style="flex:1">'
    +'<div style="display:flex;flex-direction:column;gap:9px">'
    +(Array.isArray(diffs)&&typeof diffs[0]==='object'&&diffs[0].title?diffs:diffs.map(function(t,i){var cs=['#16a34a','#2563eb','#7c3aed','#ea580c'];return{title:'차별점'+(i+1),text:String(t),color:cs[i%cs.length]};}))
    .slice(0,2).map(function(it){var bg=bgMap[it.color]||'#f0fdf4',bd=bdMap[it.color]||'#86efac';return '<div class="tp-diff" style="background:'+bg+';border:1px solid '+bd+';border-left:5px solid '+it.color+';flex:1"><div style="font-size:13px;font-weight:700;color:'+it.color+';margin-bottom:6px">🔹 '+it.title+'</div><div style="font-size:13px;color:#334155;line-height:1.6;font-weight:400">'+it.text+'</div></div>';}).join('')
    +'</div>'
    +'<div style="display:flex;flex-direction:column;gap:9px">'
    +(Array.isArray(diffs)&&typeof diffs[0]==='object'&&diffs[0].title?diffs:diffs.map(function(t,i){var cs=['#16a34a','#2563eb','#7c3aed','#ea580c'];return{title:'차별점'+(i+1),text:String(t),color:cs[i%cs.length]};}))
    .slice(2,4).map(function(it){var bg=bgMap[it.color]||'#f0fdf4',bd=bdMap[it.color]||'#86efac';return '<div class="tp-diff" style="background:'+bg+';border:1px solid '+bd+';border-left:5px solid '+it.color+';flex:1"><div style="font-size:13px;font-weight:700;color:'+it.color+';margin-bottom:6px">🔹 '+it.title+'</div><div style="font-size:13px;color:#334155;line-height:1.6;font-weight:400">'+it.text+'</div></div>';}).join('')
    +'</div>'
    +'</div>'
  );

  var p6 = tpPage(6,'가점추천','인증 취득 시 정책자금 한도 최대화',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50">'
    +bpCerts.map(function(c,i){return '<div class="tp-cert"><div class="tp-certi" style="background:'+bpBgs[i%bpBgs.length]+'">'+bpIcons[i%bpIcons.length]+'</div><div class="tp-certb"><div class="tp-certn">'+c.name+'</div><div class="tp-certd">'+c.effect+'</div></div><div class="tp-certa"><div class="tp-certv" style="color:'+color+'">'+c.amount+'</div><div class="tp-certp">'+c.period+'</div></div></div>';}).join('')
    +'</div>'
    +'<div class="tp-colF">'
    +'<div style="background:#f0fdf4;border-radius:8px;padding:16px;border:1px solid #86efac;text-align:center;margin-bottom:10px">'
    +'<div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:5px">인증 완료 시 총 추가 조달 한도</div>'
    +'<div style="font-size:28px;font-weight:900;color:'+color+';line-height:1.2">최대 +'+(totalBp>0?totalBp+'억원':'6억 5천만원')+'</div>'
    +'<div style="font-size:12px;color:#64748b;margin-top:4px">현재 신청 한도 + 인증 취득 후 추가 조달 합계</div>'
    +'</div>'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">취득 우선순위 전략</h4>'
    +tpLst(['1순위: 벤처인증 (약 6개월) — 즉각적인 자금 한도 확대 효과가 가장 큼','2순위: 이노비즈 인증 (1년) — 중진공 기술개발자금 신청 자격 부여','3순위: 기업부설연구소 (중기) — R&D 세액공제 25% + 기보 기술보증 우대','4순위: HACCP (장기) — 대형마트·단체급식 납품 채널 직접 연결'],color)+'</div>'
    +'</div>'
    +'</div>'
  );

  var p7 = tpPage(7,'자금사용계획','총 '+needFundStr+' 집행 계획',color,
    '<div class="tp-2col">'
    +'<div class="tp-col55 tp-col50">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">자금 집행 계획표</h4>'
    +'<table class="tp-ftb"><thead><tr><th style="text-align:left">항목</th><th>금액</th><th>비율</th><th>사용 목적</th></tr></thead>'
    +'<tbody>'+fundRows.map(function(r,i){return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'><td style="font-weight:700">'+r.item+'</td><td style="text-align:center">'+r.amount+'</td><td style="text-align:center;font-weight:700;color:'+color+'">'+r.ratio+'</td><td>'+r.purpose+'</td></tr>';}).join('')
    +'<tr style="background:#f0fdf4"><td style="font-weight:700">합계</td><td style="text-align:center;font-weight:700;color:'+color+'">'+needFundStr+'</td><td style="text-align:center;font-weight:700;color:'+color+'">100%</td><td>-</td></tr>'
    +'</tbody></table>'
    +'</div>'
    +'</div>'
    +'<div class="tp-colF"><div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">자금 집행 전략 및 효과</h4>'
    +tpLst(d.s7_strategy||[
      '1단계: 원재료 선매입으로 생산 안정성 확보 — 공급망 리스크 해소 및 원가 하락 효과',
      '2단계: 생산 설비 자동화로 원가율 20% 절감 — 매출이익률 즉각 개선 기대',
      '3단계: 마케팅·채널 집중 투자로 매출 2배 성장 가속 — SNS·쿠팡 입점 집행',
      '자금 집행 후 6개월 내 조달 자금 대비 ROI 200% 이상 달성 목표',
      '매 분기 자금 집행 현황 및 성과 지표를 컨설턴트와 공유하여 계획 수정 병행'
    ],color)+'</div></div>'
    +'</div>'
  );

  var p8 = tpPage(8,'매출 추이 및 1년 전망','실적 · 예측 · 단중장기 성장 전략',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50"><div class="tp-sb" style="flex:1"><div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:7px">「1년 전망」 월별 매출 시뮬레이션</div>'
    +'<div class="tp-ch" style="height:200px"><canvas id="biz-monthly-chart" style="width:100%;height:100%"></canvas></div>'
    +'</div></div>'
    +'<div class="tp-colF">'
    +'<div class="tp-gph tp-gphs" style="flex:1"><div class="tp-gphh">⚡ 단기 (1년)</div><ul>'+(d.s8_short||['정책자금 4억 조달 완료','쿠팡·스마트스토어 입점','생산 설비 교체 가동','월 매출 1.5억 달성']).map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'
    +'<div class="tp-gph tp-gphm" style="flex:1"><div class="tp-gphh">📈 중기 (3년)</div><ul>'+(d.s8_mid||['벤처인증 취득','B2B 납품 3채널 확보','이노비즈 인증 추진','매출 24억 달성']).map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'
    +'<div class="tp-gph tp-gphl" style="flex:1"><div class="tp-gphh">🌟 장기 (5년)</div><ul>'+(d.s8_long||['자동화 생산 체계 완성','해외 수출 시장 진출','기업부설연구소 설립','매출 100억 달성']).map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'
    +'</div>'
    +'</div>'
  );

  var p9 = tpPage(9,'성장비전','향후 발전 가능성 · KPI · 로드맵',color,
    '<div class="tp-2col">'
    +'<div class="tp-col45">'
    +'<div class="tp-g4" style="flex-shrink:0;margin-bottom:10px">'
    +tpMC('1년후 매출',kpi9.y1,'+30%',color)
    +tpMC('2년후 매출',kpi9.y2,'+74%',color)
    +tpMC('목표 채널',kpi9.ch,'현재 1개','#2563eb')
    +tpMC('목표 인력',kpi9.emp,'2년 내','#7c3aed')
    +'</div>'
    +'<div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">핵심 성장 동력</h4>'
    +tpLst(d.s9_items||['특허 기반 기술력으로 경쟁사 진입을 방어하며 시장 독점적 포지션 유지','HMR 시장 연 18% 성장의 핵심 수혜자로서 자연적 시장 성장의 혜택 직접 향유','정책자금 조달 후 설비 자동화로 원가율 개선과 매출 성장이 동시에 가속화됨','채널 다각화(쿠팡·B2B·자사몰)로 매출 안정성과 성장성을 동시에 확보 가능'],color)+'</div>'
    +'</div>'
    +'<div class="tp-colF"><div class="tp-sb" style="flex:1"><h4 style="color:'+color+'">앞으로의 계획 로드맵</h4>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'
    +rmYears.map(function(r,i){return '<div style="border-radius:7px;padding:10px;border:1px solid #e2e8f0;border-top:3px solid '+rmColors[i]+';background:white"><div style="font-size:12px;font-weight:700;color:'+rmColors[i]+';margin-bottom:6px">'+r.year+'</div>'+r.tasks.map(function(t){return '<div style="font-size:12px;color:#64748b;padding-left:9px;position:relative;line-height:1.5;margin-bottom:3px"><span style="position:absolute;left:0;font-weight:700;color:'+rmColors[i]+'">·</span>'+t+'</div>';}).join('')+'</div>';}).join('')
    +'</div></div></div>'
    +'</div>'
  );

  var p10 = tpPage('✦','마무리','종합 요약 · 컨설턴트 총평',color,
    '<div class="tp-2col">'
    +'<div class="tp-col50"><div class="tp-cls" style="flex:1"><div class="tp-clst">'+cData.name+' — 종합 의견 및 총평</div><div class="tp-clstx">'+conclusion+'</div></div></div>'
    +'<div class="tp-colF">'
    +'<div class="tp-g4" style="flex-shrink:0;margin-bottom:10px">'
    +[{l:'시장성',v:'★★★★★',c:color},{l:'기술력',v:'★★★★★',c:'#2563eb'},{l:'성장성',v:'★★★★★',c:'#7c3aed'},{l:'안정성',v:'★★★★',c:'#ea580c'}].map(function(r){return '<div class="tp-mc" style="border-top:3px solid '+r.c+'"><div class="tp-mcl">'+r.l+'</div><div class="tp-mcv" style="color:'+r.c+';font-size:16px">'+r.v+'</div></div>';}).join('')
    +'</div>'
    +'<div class="tp-sb" style="flex:1;background:#f0fdf4;border-color:#86efac">'
    +'<h4 style="color:#15803d">★ 컨설턴트 핵심 메시지</h4>'
    +tpLst([
      '특허 기술력 + 폭발적 매출 성장 = 정책자금 최우선 지원 대상으로 추천 가능',
      '인증 취득 로드맵 실행 시 추가 자금 한도 최대 6.5억원 확보 — 성장 가속화 가능',
      '3년 내 매출 35억, 5년 내 100억 달성 목표는 현실적이며 충분히 달성 가능한 수준임',
      '컨설턴트 밀착 지원 하에 인증·자금·채널을 동시 추진할 것을 강력 권고함'
    ],color)+'</div>'
    +'</div>'
    +'</div>'
  );

  return tplStyle(color)+'<div class="tp-wrap">'+cover+p1+p2+p3+p4+p5+p6+p7+p8+p9+p10+'</div>';
}


// ===========================
// ★ 차트 초기화
// ===========================
function initReportCharts(rev) {
  setTimeout(function(){
    var r=document.getElementById('rp-radar');
    if(r&&r.dataset.scores){var sc=r.dataset.scores.split(',').map(Number);new Chart(r.getContext('2d'),{type:'radar',data:{labels:['재무','전략/마케팅','인사','운영','IT'],datasets:[{data:sc,backgroundColor:'rgba(59,130,246,0.18)',borderColor:'#3b82f6',pointBackgroundColor:'#1e3a8a',pointRadius:5,pointHoverRadius:7}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20,font:{size:11}},pointLabels:{font:{size:12}}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});}
    var li=document.getElementById('rp-linechart');
    if(li&&li.dataset.y23!==undefined){var ld=li.dataset;new Chart(li.getContext('2d'),{type:'line',data:{labels:['23년','24년','25년','금년(예)'],datasets:[{data:[+ld.y23||0,+ld.y24||0,+ld.y25||0,+ld.exp||0],borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.12)',borderWidth:2.5,pointRadius:5,fill:true,tension:0.25}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:11},callback:function(v){return v>=10000?Math.floor(v/10000)+'억':v.toLocaleString()+'만';}}}}}});}
    var de=document.getElementById('fp-donut');
    if(de&&de.dataset.names){var dn=de.dataset.names.split('|');var dr=de.dataset.ratios.split(',').map(Number);new Chart(de.getContext('2d'),{type:'doughnut',data:{labels:dn,datasets:[{data:dr,backgroundColor:['#2563eb','#7c3aed','#06b6d4','#16a34a','#ea580c'],borderWidth:2.5,borderColor:'white'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'62%'}});}
    var fg=document.getElementById('fp-growth-chart');
    if(fg){new Chart(fg.getContext('2d'),{type:'line',data:{labels:['2026','2027','2028'],datasets:[{data:[14,24,35],borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,0.12)',borderWidth:2.5,pointRadius:5,fill:true,tension:0.25,label:'목표 매출(억)'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:11},callback:function(v){return v+'억';}}}}}})}
    var tr=document.getElementById('tp-radar');
    if(tr&&tr.dataset.scores){var ts=tr.dataset.scores.split(',').map(Number);new Chart(tr.getContext('2d'),{type:'radar',data:{labels:['유동인구','접근성','성장성','경쟁강도','가시성'],datasets:[{data:ts,backgroundColor:'rgba(13,148,136,0.18)',borderColor:'#0d9488',pointBackgroundColor:'#0d9488',pointRadius:5}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20,font:{size:11}},pointLabels:{font:{size:12}}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});}
    var tl=document.getElementById('tp-linechart');
    if(tl&&tl.dataset.s0){var td=tl.dataset;new Chart(tl.getContext('2d'),{type:'line',data:{labels:['현재','6개월','1년','2년'],datasets:[{data:[+td.s0,+td.s1,+td.s2,+td.s3],borderColor:'#0d9488',backgroundColor:'rgba(13,148,136,0.12)',borderWidth:2.5,pointRadius:5,fill:true,tension:0.25}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:11},callback:function(v){return Math.round(v/100)*100+'만';}}}}}});}
    var md=document.getElementById('mp-donut');
    if(md&&md.dataset.names){var mn=md.dataset.names.split('|');var mr=md.dataset.ratios.split(',').map(Number);new Chart(md.getContext('2d'),{type:'doughnut',data:{labels:mn,datasets:[{data:mr,backgroundColor:['#db2777','#9d174d','#f4c0d1','#fdf2f8'],borderWidth:2.5,borderColor:'white'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'62%'}});}
    var bm=document.getElementById('bp-market-chart');
    if(bm){new Chart(bm.getContext('2d'),{type:'line',data:{labels:['2016','2017','2018','2019','2020','2021','2022'],datasets:[{data:[2,2.4,3,3.8,4.5,5.8,7],borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,0.12)',borderWidth:2.5,pointRadius:4,fill:true,tension:0.3}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:11},callback:function(v){return v+'조';}}}}}});}
    var bc=document.getElementById('biz-monthly-chart');
    if(bc){var curM=new Date().getMonth();var safeRev=rev||{};var avgM=safeRev.cur&&curM>0?Math.round(safeRev.cur/curM):safeRev.y25?Math.round(safeRev.y25/12):3000;var ac=[],fc=[];for(var i=0;i<12;i++){if(i<curM){ac.push(Math.round(avgM*(0.88+i*0.025)));fc.push(null);}else{ac.push(null);fc.push(Math.round(avgM*Math.pow(1.05,i-curM+1)));}}new Chart(bc.getContext('2d'),{type:'bar',data:{labels:['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],datasets:[{label:'실적',data:ac,backgroundColor:'rgba(22,163,74,0.75)',borderColor:'#16a34a',borderWidth:1,borderRadius:4},{label:'예측',data:fc,backgroundColor:'rgba(59,130,246,0.5)',borderColor:'#3b82f6',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{font:{size:11}}}},scales:{y:{ticks:{font:{size:11},callback:function(v){return v>=10000?Math.floor(v/10000)+'억':Math.round(v/1000)+'천만';}}}}}});}
  },250);
}

// ===========================
// ★ JSON 프롬프트 함수들
// ===========================
function buildMgmtClientPrompt(cData, fRev) {
  var pd={name:cData.name,rep:cData.rep,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,bizNum:cData.bizNum,매출데이터:fRev};
  return '너는 20년 경력의 경영컨설턴트야. 대상: \''+cData.name+'\'. 기업전달용 — 긍정적 톤.\n아래 JSON 형식으로만 응답해. 각 항목 충분히 구체적으로(40자 이상).\n\n'
    +'{"grade":"등급(예:A-)","grade_desc":"설명(8자)","overview":["현황5개(각50자이상)"],"finance_strengths":["강점4개(각50자이상)"],"finance_risks":["개선3개(각50자이상)"],"radar":[재무,전략,인사,운영,IT점수],"marketing_bars":{"finance":점수,"strategy":점수,"operation":점수},"marketing":["마케팅5개(각50자이상)"],"marketing_items":["포지셔닝2개(각40자이상)"],"hr":["인사5개(각50자이상)"],"ops":["운영5개(각50자이상)"],"it":["IT5개(각50자이상)"],"certs":[{"name":"인증명","effect":"효과(50자이상)","amount":"+X억또는채널↑","period":"기간"}],"roadmap_short":["단기4개(각25자이상)"],"roadmap_mid":["중기4개(각25자이상)"],"roadmap_long":["장기4개(각25자이상)"],"summary":["종합3개(각60자이상)"]}\n\n[기업] '+JSON.stringify(pd);
}
function buildMgmtConsultantPrompt(cData, fRev) {
  var pd={name:cData.name,rep:cData.rep,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,bizNum:cData.bizNum,매출데이터:fRev};
  return '너는 20년 경력 경영컨설턴트야. 대상: \''+cData.name+'\'. 내부용 — 리스크 솔직하게.\n\n'
    +'{"grade":"등급","grade_desc":"설명","overview":["현황5개(리스크포함,각50자이상)"],"key_risks":["리스크4개(각50자이상)"],"finance_strengths":["재무4개(각50자이상)"],"fb_finance":["피드백3개(각60자이상)"],"radar":[재무,전략,인사,운영,IT],"marketing_bars":{"finance":점수,"strategy":점수,"operation":점수},"marketing":["마케팅4개(각50자이상)"],"fb_marketing":["피드백3개(각60자이상)"],"hr":["인사5개(각50자이상)"],"ops":["운영5개(각50자이상)"],"fb_hr_ops":["피드백3개(각60자이상)"],"it":["IT5개(각50자이상)"],"fb_it":["피드백3개(각60자이상)"],"roadmap_short":["단기4개"],"roadmap_mid":["중기4개"],"roadmap_long":["장기4개"],"fb_roadmap":["피드백3개(각60자이상)"],"certs":[{"name":"인증명","effect":"효과","amount":"+X억","period":"기간"}],"consultant_issues":["시급이슈3개(각70자이상)"],"consultant_funds":["자금전략4개(각60자이상)"],"consultant_certs":["인증전략4개(각50자이상)"],"consultant_marketing":["마케팅4개(각50자이상)"],"consultant_credit":["신용개선4개(각50자이상)"]}\n\n[기업] '+JSON.stringify(pd);
}
function buildFinancePrompt(cData, fRev) {
  return '재무 전문 컨설턴트. 대상: \''+cData.name+'\'. JSON만 출력.\n\n'
    +'{"scores":{"profit":수익성,"stable":안정성,"growth":성장성},"score_descs":{"profit":"10자","stable":"10자","growth":"10자"},"profit_bars":[{"label":"지표명","value":0-100,"display":"표시값"},x4],"debt":[{"name":"기관","ratio":비율},...],"stable_metrics":[{"label":"지표","value":"값","desc":"설명"},x4],"growth_items":["성장4개(각50자이상)"],"action_urgent":"즉시2줄","action_short":"단기2줄","action_mid":"중기2줄"}\n\n[기업] '+JSON.stringify({name:cData.name,industry:cData.industry,empCount:cData.empCount,bizDate:cData.bizDate,매출데이터:fRev});
}
function buildTradePrompt(cData, fRev) {
  return '상권분석 전문가. 대상: \''+cData.name+'\'. JSON만 출력.\n\n'
    +'{"traffic":"X명","competitors":숫자,"grade":"등급","radar":[5개0-100],"features":["특성5개(각50자이상)"],"comp_direct":숫자,"comp_strong":숫자,"diff_potential":"高/中/低","target":{"age":"연령","household":"가구유형","channel":"채널","cycle":"주기"},"strategy":["전략5개(각50자이상)"],"sim":{"s0":현재만원,"s1":6개월,"s2":1년,"s3":2년}}\n\n[기업] '+JSON.stringify({name:cData.name,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,매출데이터:fRev});
}
function buildMarketingPrompt(cData, fRev) {
  return '디지털 마케팅 전문가. 대상: \''+cData.name+'\'. JSON만 출력.\n\n'
    +'{"channels":[{"name":"채널","score":0-100},x4],"strategies":["전략5개(각50자이상)"],"budget_total":"월예산","budget":[{"name":"항목","ratio":비율},x4],"kpi":[{"label":"지표","value":"목표","period":"기간"},x4],"roadmap":[{"period":"월","task":"과제","highlight":false},x6]}\n\n[기업] '+JSON.stringify({name:cData.name,industry:cData.industry,coreItem:cData.coreItem,empCount:cData.empCount,매출데이터:fRev});
}
function buildFundPrompt(cData, fRev) {
  return '정책자금 전문 컨설턴트. 대상: \''+cData.name+'\'. JSON만 출력.\n\n'
    +'{"checks":[{"text":"자격요건","status":"pass/cond/fail"},x6],"score":0-100,"score_desc":"설명","match_count":숫자,"score_items":["분석3개(각50자이상)"],"funds":[{"rank":1,"name":"자금명","limit":"한도","tags":["태그1","태그2","태그3"]},x5],"comparison":[{"org":"기관","limit":"한도","rate":"금리","period":"기간","diff":"easy/mid/hard"},x4],"checklist_ready":["서류4개"],"checklist_need":["서류2개"]}\n\n[기업] '+JSON.stringify({name:cData.name,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,needFund:cData.needFund,매출데이터:fRev});
}
function buildBizPlanPrompt(cData, fRev) {
  var nf=cData.needFund>0?fKRW(cData.needFund):'4억원';
  return '사업계획서 전문가. 대상: \''+cData.name+'\'. 기업데이터 기반 구체적 내용. JSON만 출력.\n\n'
    +'{"s1_items":["현황5개(각60자이상)"],"s2_swot":{"strength":["강점4개(각40자이상)"],"weakness":["약점3개(각40자이상)"],"opportunity":["기회4개(각40자이상)"],"threat":["위협3개(각40자이상)"]},"s3_items":["시장5개(각60자이상)"],"s4_items":["경쟁4개(각60자이상)"],"s4_competitor":[{"item":"항목","self":"★점수","a":"★점수","b":"★점수"},x5-7],"s5_items":[{"title":"제목","text":"설명(60자이상)","color":"#색상"},x4 (#16a34a/#2563eb/#7c3aed/#ea580c)],"s6_certs":[{"name":"인증","effect":"효과(60자이상)","amount":"+X억또는채널↑","period":"기간"},x4],"s7_rows":[{"item":"항목","amount":"금액","ratio":"X%","purpose":"목적(40자이상)"},총합='+nf+'],"s7_strategy":["전략5개(각40자이상)"],"s8_short":["단기4개(각30자이상)"],"s8_mid":["중기4개(각30자이상)"],"s8_long":["장기4개(각30자이상)"],"s9_items":["동력4개(각60자이상)"],"s9_kpi":{"y1":"1년후","y2":"2년후","ch":"채널","emp":"인원"},"s9_roadmap":[{"year":"2026","tasks":["3개"]},{"year":"2027","tasks":["3개"]},{"year":"2028","tasks":["3개"]},{"year":"2029~","tasks":["3개"]}],"s10_conclusion":"마무리5문장이상(~있음으로끝)"}\n\n[기업] '+JSON.stringify({name:cData.name,rep:cData.rep,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,필요자금:nf,자금사용계획:cData.fundPlan||'',매출데이터:fRev});
}

// ===========================
// ★ REPORT_CONFIGS (전체 가로형)
// ===========================
var REPORT_CONFIGS = {
  finance:     {typeLabel:'재무진단',    title:'AI 상세 재무진단',   contentAreaId:'finance-content-area',    landscape:true, buildPrompt:buildFinancePrompt,   buildHTML:buildFinanceHTML},
  aiTrade:     {typeLabel:'상권분석',    title:'AI 상권분석 리포트', contentAreaId:'aiTrade-content-area',    landscape:true, buildPrompt:buildTradePrompt,     buildHTML:buildTradeHTML},
  aiMarketing: {typeLabel:'마케팅제안',  title:'AI 마케팅 제안서',   contentAreaId:'aiMarketing-content-area',landscape:true, buildPrompt:buildMarketingPrompt, buildHTML:buildMarketingHTML},
  aiFund:      {typeLabel:'정책자금매칭',title:'AI 정책자금매칭',    contentAreaId:'aiFund-content-area',     landscape:true, buildPrompt:buildFundPrompt,      buildHTML:buildFundHTML},
  aiBiz:       {typeLabel:'사업계획서',  title:'AI 사업계획서',      contentAreaId:'aiBiz-content-area',      landscape:true, buildPrompt:buildBizPlanPrompt,   buildHTML:buildBizPlanHTML}
};

function resetContentArea(el) {
  if (!el) return;
  el.style.cssText = 'padding:0!important;background:transparent!important;box-shadow:none!important;min-height:unset!important;border-radius:0!important;';
}

// ===========================
// ★ 경영진단 생성
// ===========================
window.generateReport = async function(type, version, event) {
  var tab = event.target.closest('.tab-content');
  var companyName = tab.querySelector('.company-dropdown').value;
  if (!companyName) { alert('기업을 선택해주세요.'); return; }
  var companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  var cData = companies.find(function(c){return c.name===companyName;});
  if (!cData) { alert('기업 정보를 찾을 수 없습니다.'); return; }
  var rev  = cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
  var fRev = fRevAI(cData, rev);
  var prompt = version==='client' ? buildMgmtClientPrompt(cData,fRev) : buildMgmtConsultantPrompt(cData,fRev);
  document.getElementById('ai-loading-overlay').style.display = 'flex';
  var data = await callGeminiJSON(prompt, 8192);
  document.getElementById('ai-loading-overlay').style.display = 'none';
  if (!data) return;
  var todayStr = new Date().toISOString().split('T')[0];
  var vLabel = version==='client'?'기업전달용':'컨설턴트용';
  var rpt = {id:'rep_'+Date.now(),type:'경영진단',company:cData.name,title:'AI 경영진단보고서 ('+vLabel+')',date:todayStr,content:JSON.stringify(data),version:version,revenueData:rev,reportType:'management'};
  var reports = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]'); reports.push(rpt);
  localStorage.setItem(DB_REPORTS, JSON.stringify(reports)); updateDataLists();
  tab.querySelector('[id$="-input-step"]').style.display = 'none';
  tab.querySelector('[id$="-result-step"]').style.display = 'block';
  var ca = document.getElementById('report-content-area');
  resetContentArea(ca);
  ca.innerHTML = version==='client' ? buildMgmtClientHTML(data,cData,rev,todayStr) : buildMgmtConsultantHTML(data,cData,rev,todayStr);
  _currentReport = {company:cData.name, type:'AI 경영진단보고서 ('+vLabel+')', contentAreaId:'report-content-area', landscape:true};
  initReportCharts(rev);
};

// ===========================
// ★ 기타 보고서 생성
// ===========================
window.generateAnyReport = async function(type, version, event) {
  var tab = event.target.closest('.tab-content');
  var companyName = tab.querySelector('.company-dropdown').value;
  if (!companyName) { alert('기업을 선택해주세요.'); return; }
  var companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  var cData = companies.find(function(c){return c.name===companyName;});
  if (!cData) { alert('기업 정보를 찾을 수 없습니다.'); return; }
  var rev  = cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
  var fRev = fRevAI(cData, rev);
  var cfg  = REPORT_CONFIGS[type]; if (!cfg) return;
  document.getElementById('ai-loading-overlay').style.display = 'flex';
  var maxT = type==='aiBiz' ? 65536 : 8192;
  var data = await callGeminiJSON(cfg.buildPrompt(cData,fRev,version), maxT);
  document.getElementById('ai-loading-overlay').style.display = 'none';
  if (!data) return;
  var todayStr = new Date().toISOString().split('T')[0];
  var vLabel = type==='aiBiz'?(version==='draft'?'초안':'완성본'):(version==='client'?'기업전달용':'컨설턴트용');
  var rpt = {id:'rep_'+Date.now(),type:cfg.typeLabel,company:cData.name,title:cfg.title+' ('+vLabel+')',date:todayStr,content:JSON.stringify(data),version:version,revenueData:rev,reportType:type,contentAreaId:cfg.contentAreaId};
  var reports = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]'); reports.push(rpt);
  localStorage.setItem(DB_REPORTS, JSON.stringify(reports)); updateDataLists();
  tab.querySelector('[id$="-input-step"]').style.display = 'none';
  tab.querySelector('[id$="-result-step"]').style.display = 'block';
  var ca = document.getElementById(cfg.contentAreaId);
  resetContentArea(ca); ca.innerHTML = cfg.buildHTML(data, cData, rev, todayStr);
  _currentReport = {company:cData.name, type:cfg.title+' ('+vLabel+')', contentAreaId:cfg.contentAreaId, landscape:true};
  initReportCharts(rev);
};

// ===========================
// ★ 보고서 보기
// ===========================
window.viewReport = function(id) {
  var r = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]').find(function(x){return x.id===id;});
  if (!r) return;
  var companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  var cData = companies.find(function(c){return c.name===r.company;})||{name:r.company,bizNum:'-',industry:'-',rep:'-',coreItem:'-',bizDate:'-',empCount:'-',date:r.date};
  var rev = r.revenueData||{cur:0,y25:0,y24:0,y23:0};
  var data; try { data = JSON.parse(r.content); } catch(e) { data = {}; }
  var type = r.reportType||'management';
  if (type==='management') {
    showTab('report');
    document.getElementById('report-input-step').style.display = 'none';
    document.getElementById('report-result-step').style.display = 'block';
    var ca = document.getElementById('report-content-area');
    resetContentArea(ca);
    ca.innerHTML = r.version==='client' ? buildMgmtClientHTML(data,cData,rev,r.date) : buildMgmtConsultantHTML(data,cData,rev,r.date);
    _currentReport = {company:cData.name, type:r.title, contentAreaId:'report-content-area', landscape:true};
    initReportCharts(rev);
  } else {
    var cfg = REPORT_CONFIGS[type]; if (!cfg) return;
    var tabId = cfg.contentAreaId.replace('-content-area','');
    showTab(tabId);
    document.getElementById(tabId+'-input-step').style.display = 'none';
    document.getElementById(tabId+'-result-step').style.display = 'block';
    var ca2 = document.getElementById(cfg.contentAreaId);
    resetContentArea(ca2); ca2.innerHTML = cfg.buildHTML(data, cData, rev, r.date);
    _currentReport = {company:cData.name, type:r.title, contentAreaId:cfg.contentAreaId, landscape:true};
    initReportCharts(rev);
  }
};

window.backToInput = function(tab) {
  document.getElementById(tab+'-input-step').style.display = 'block';
  document.getElementById(tab+'-result-step').style.display = 'none';
};
