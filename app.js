// ===== BizConsult AI 보고서 플랫폼 =====
const DB_USERS       = 'biz_users';
const DB_SESSION     = 'biz_session';
const STORAGE_KEY    = 'biz_consult_companies';
const DB_REPORTS     = 'biz_reports';
const DB_SUPPORT_DOC = 'biz_support_documents';
const DB_NOTICES     = 'biz_dashboard_notices';
let _currentReport = { company:'', type:'', contentAreaId:'', landscape:true };

// ===========================
// ★ PDF 인쇄 (팝업창 → 인쇄 다이얼로그)
// ===========================
window.printReport = function() {
  var caid = _currentReport.contentAreaId;
  if (!caid) {
    var ids = ['report-content-area','finance-content-area','aiBiz-content-area','aiFund-content-area','aiTrade-content-area','aiMarketing-content-area'];
    for (var k=0; k<ids.length; k++) { var e=document.getElementById(ids[k]); if(e&&e.innerHTML.trim()){caid=ids[k];break;} }
  }
  var el = document.getElementById(caid);
  if (!el || !el.innerHTML.trim()) { alert('출력할 보고서가 없습니다.'); return; }

  var rev = {};
  try {
    var cs = JSON.parse(localStorage.getItem('biz_consult_companies')||'[]');
    var cm = cs.find(function(x){return x.name===_currentReport.company;});
    if (cm && cm.revenueData) rev = cm.revenueData;
  } catch(e){}
  var curM = new Date().getMonth();
  var avgM = rev.cur&&curM>0 ? Math.round(rev.cur/curM) : (rev.y25?Math.round(rev.y25/12):3000);

  var pw = window.open('','_blank','width=1400,height=900,scrollbars=yes');
  if (!pw) { alert('팝업이 차단되었습니다. 팝업을 허용해 주세요.'); return; }

  var printCSS = `
    @page { size: 297mm 210mm; margin: 8mm 10mm; }
    * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #e8eaed; font-family: "Malgun Gothic","Apple SD Gothic Neo",sans-serif; }
    .rp-wrap { background: #e8eaed !important; padding: 0 !important; }
    .rp-cover {
      background: white !important;
      page-break-after: always !important;
      break-after: page !important;
      margin: 0 !important;
      border-radius: 0 !important;
      padding: 20px 24px 18px 32px !important;
      min-height: 186mm !important;
      display: flex !important;
      flex-direction: column !important;
      page-break-inside: avoid !important;
    }
    .rp-page {
      background: white !important;
      page-break-before: always !important;
      break-before: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin: 0 !important;
      border-radius: 0 !important;
      padding: 14px 18px 14px !important;
      min-height: 186mm !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .rp-section { page-break-inside: avoid !important; break-inside: avoid !important; }
    .rp-cert, .rp-rank, .rp-chk, .rp-mc, .rp-hbr { page-break-inside: avoid !important; }
    @media print {
      body { background: white !important; }
      .rp-wrap { background: white !important; padding: 0 !important; }
      .rp-cover { border-radius: 0 !important; }
      .rp-page { border-radius: 0 !important; border: none !important; }
    }
  `;

  pw.document.write(`<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${_currentReport.type||'보고서'}</title>
<style>${printCSS}</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
</head><body>
${el.innerHTML}
<script>
var _curM=${curM}, _avgM=${avgM};
var _rev={y23:${rev.y23||0},y24:${rev.y24||0},y25:${rev.y25||0},cur:${rev.cur||0},exp:${rev.y25?Math.round(rev.y25/12*12):0}};
window.onload = function() {
  // 레이더 차트 (경영진단)
  var ra = document.getElementById('rp-radar');
  if(ra && ra.dataset && ra.dataset.scores){
    new Chart(ra.getContext('2d'),{type:'radar',data:{labels:['재무','전략/마케팅','인사','운영','IT'],datasets:[{data:ra.dataset.scores.split(',').map(Number),backgroundColor:'rgba(59,130,246,0.18)',borderColor:'#3b82f6',pointBackgroundColor:'#1e3a8a',pointRadius:5}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});
  }
  // 매출 라인 차트
  var li = document.getElementById('rp-linechart');
  if(li && li.dataset && li.dataset.y23 !== undefined){
    var d=li.dataset;
    new Chart(li.getContext('2d'),{type:'line',data:{labels:['2023년','2024년','2025년','금년(예)'],datasets:[{data:[+d.y23||0,+d.y24||0,+d.y25||0,+d.exp||0],borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.12)',borderWidth:2.5,pointRadius:5,fill:true,tension:0.25,label:'매출(만원)'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v>=10000?Math.floor(v/10000)+'억':v.toLocaleString()+'만';}}}}}});
  }
  // 재무진단 도넛
  var de = document.getElementById('fp-donut');
  if(de && de.dataset && de.dataset.names){
    new Chart(de.getContext('2d'),{type:'doughnut',data:{labels:de.dataset.names.split('|'),datasets:[{data:de.dataset.ratios.split(',').map(Number),backgroundColor:['#2563eb','#7c3aed','#06b6d4','#16a34a','#ea580c'],borderWidth:2,borderColor:'white'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'62%'}});
  }
  // 성장 라인
  var fg = document.getElementById('fp-growth-chart');
  if(fg){ new Chart(fg.getContext('2d'),{type:'line',data:{labels:['2026','2027','2028'],datasets:[{data:[14,24,35],borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,0.12)',borderWidth:2.5,pointRadius:5,fill:true,tension:0.25}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v+'억';}}}}}}); }
  // 상권 레이더
  var tr = document.getElementById('tp-radar');
  if(tr && tr.dataset && tr.dataset.scores){
    new Chart(tr.getContext('2d'),{type:'radar',data:{labels:['유동인구','접근성','성장성','경쟁강도','가시성'],datasets:[{data:tr.dataset.scores.split(',').map(Number),backgroundColor:'rgba(13,148,136,0.18)',borderColor:'#0d9488',pointBackgroundColor:'#0d9488',pointRadius:5}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});
  }
  // 상권 매출 라인
  var tl = document.getElementById('tp-linechart');
  if(tl && tl.dataset && tl.dataset.s0){
    var td=tl.dataset;
    new Chart(tl.getContext('2d'),{type:'line',data:{labels:['현재','6개월','1년','2년'],datasets:[{data:[+td.s0,+td.s1,+td.s2,+td.s3],borderColor:'#0d9488',backgroundColor:'rgba(13,148,136,0.12)',borderWidth:2.5,pointRadius:5,fill:true,tension:0.25}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return Math.round(v/100)*100+'만';}}}}}});
  }
  // 마케팅 도넛
  var md = document.getElementById('mp-donut');
  if(md && md.dataset && md.dataset.names){
    new Chart(md.getContext('2d'),{type:'doughnut',data:{labels:md.dataset.names.split('|'),datasets:[{data:md.dataset.ratios.split(',').map(Number),backgroundColor:['#db2777','#9d174d','#f4c0d1','#fdf2f8'],borderWidth:2,borderColor:'white'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'62%'}});
  }
  // 시장 성장
  var bm = document.getElementById('bp-market-chart');
  if(bm){ new Chart(bm.getContext('2d'),{type:'line',data:{labels:['2016','2017','2018','2019','2020','2021','2022'],datasets:[{data:[2,2.4,3,3.8,4.5,5.8,7],borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,0.12)',borderWidth:2.5,pointRadius:4,fill:true,tension:0.3}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v+'조';}}}}}}); }
  // 월별 매출 바
  var bc = document.getElementById('biz-monthly-chart');
  if(bc){
    var ac=[],fc=[];
    for(var i=0;i<12;i++){ if(i<_curM){ac.push(Math.round(_avgM*(0.88+i*0.025)));fc.push(null);}else{ac.push(null);fc.push(Math.round(_avgM*Math.pow(1.05,i-_curM+1)));} }
    new Chart(bc.getContext('2d'),{type:'bar',data:{labels:['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],datasets:[{label:'실적',data:ac,backgroundColor:'rgba(22,163,74,0.75)',borderColor:'#16a34a',borderWidth:1,borderRadius:4},{label:'예측',data:fc,backgroundColor:'rgba(59,130,246,0.5)',borderColor:'#3b82f6',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{font:{size:11}}}},scales:{y:{ticks:{callback:function(v){return v>=10000?Math.floor(v/10000)+'억':Math.round(v/1000)+'천만';}}}}}});
  }
  setTimeout(function(){ window.print(); }, 1800);
};
<\/script></body></html>`);
  pw.document.close();
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
// ★ 기업 관리
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
    container.innerHTML=`<div class="company-empty-state"><div class="empty-icon">🏢</div><p>${keyword?'검색 결과가 없습니다.':'등록된 기업이 없습니다.'}</p><button class="btn-add-company" onclick="showCompanyForm()">＋ 기업 등록하기</button></div>`;
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
  const supportDocs = JSON.parse(localStorage.getItem(DB_SUPPORT_DOC)||'[]');
  const notices = JSON.parse(localStorage.getItem(DB_NOTICES)||'[]');
  const setNum=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  const setText=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  setNum('stat-companies',companies.length);
  setNum('stat-mgmt',reports.filter(r=>r.type==='경영진단').length);
  setNum('stat-biz',reports.filter(r=>r.type==='사업계획서').length);
  setNum('stat-total',reports.length);
  setText('dashboard-recent-count', `${Math.min(reports.length,5)}건`);
  setText('dashboard-company-hint', `기업 ${companies.length}개`);
  setText('dashboard-support-count', `${supportDocs.length}건`);
  setText('dashboard-notice-count', `${notices.length}건`);

  const typeIcon=t=>({'경영진단':'📈','재무진단':'💰','사업계획서':'💡','정책자금매칭':'🎯','상권분석':'🏪','마케팅제안':'📢'}[t]||'📄');

  if (!reports.length) {
    listEl.innerHTML=`<div class="empty-state"><div class="empty-state-emoji">🗂️</div><div class="empty-state-title">최근 생성된 보고서가 없습니다.</div><div class="empty-state-desc">기업을 먼저 등록한 뒤 경영진단보고서 또는 AI 사업계획서를 생성해보세요.</div><button class="btn-add-small" onclick="showTab('report')">첫 보고서 만들기</button></div>`;
  } else {
    listEl.innerHTML=[...reports].reverse().slice(0,5).map(r=>`<div class="recent-report-item"><div class="report-type-icon">${typeIcon(r.type)}</div><div><div class="report-item-title">${r.title}</div><div class="report-item-company">${r.company}</div></div><div class="report-item-right"><span class="report-badge">${r.type}</span><span class="report-date">🕐 ${r.date}</span><button class="btn-small-outline" style="font-size:11px;padding:4px 8px;" onclick="viewReport('${r.id}')">보기</button></div></div>`).join('');
  }

  renderDashboardBoard('dashboard-support-docs', supportDocs, {
    emptyEmoji:'📄',
    emptyTitle:'등록된 지원사업 공문이 없습니다.',
    emptyDesc:'공문 등록 기능은 다음 단계에서 연결할 수 있습니다. 현재는 공간과 구조를 먼저 정리해두었습니다.',
    buttonText:'기능 준비 상태 보기',
    buttonAction:`dashboardFeatureSoon('지원사업 공문')`
  });

  renderDashboardBoard('dashboard-notice-list', notices, {
    emptyEmoji:'📢',
    emptyTitle:'등록된 공지사항이 없습니다.',
    emptyDesc:'운영 공지, 업무 알림, 배포 이력 등을 이 영역에 모아둘 수 있습니다.',
    buttonText:'기능 준비 상태 보기',
    buttonAction:`dashboardFeatureSoon('공지사항')`
  });
}

function renderDashboardBoard(targetId, items, options) {
  const el=document.getElementById(targetId); if(!el) return;
  if(!items.length){
    el.innerHTML=`<div class="bottom-empty"><div class="empty-state-emoji">${options.emptyEmoji||'📌'}</div><div class="empty-state-title">${options.emptyTitle||'등록된 데이터가 없습니다.'}</div><div class="empty-state-desc">${options.emptyDesc||''}</div>${options.buttonText?`<button class="btn-add-small" onclick="${options.buttonAction||''}">${options.buttonText}</button>`:''}</div>`;
    return;
  }
  el.innerHTML=`<div class="bottom-feed-list">${items.slice(0,3).map(item=>`<div class="bottom-feed-item"><div class="bottom-feed-top"><div class="bottom-feed-title">${item.title||'-'}</div><div class="bottom-feed-date">${item.date||''}</div></div><div class="bottom-feed-desc">${item.desc||item.description||''}</div></div>`).join('')}</div>`;
}

window.dashboardFeatureSoon = function(name){
  alert(`${name} 등록/관리 기능은 다음 단계에서 연결 가능합니다. 원하시면 이어서 구현해드릴게요.`);
};

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
  if(filterComp){ filterComp.innerHTML='<option value="">전체 기업</option>'; companies.forEach(c=>filterComp.innerHTML+=`<option value="${c.name}">${c.name}</option>`); }
  updateDashboardReports(); renderCompanyCards();
};

// ===========================
// ★ 보고서 목록 서브뷰
// ===========================
window.showReportListSummary=function(){document.getElementById('rl-summary').style.display='block';document.getElementById('rl-companies').style.display='none';document.getElementById('rl-reports').style.display='none';updateDataLists();};
window.showFullCompanies=function(){document.getElementById('rl-summary').style.display='none';document.getElementById('rl-companies').style.display='block';document.getElementById('rl-reports').style.display='none';const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');const tbody=document.getElementById('company-full-body');if(tbody){tbody.innerHTML=companies.length?companies.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.rep||'-'}</td><td>${c.bizNum||'-'}</td><td>${c.industry||'-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="showCompanyForm('${c.name}')">수정/보기</button></td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">등록된 기업이 없습니다.</td></tr>';}};
window.showFullReports=function(){document.getElementById('rl-summary').style.display='none';document.getElementById('rl-companies').style.display='none';document.getElementById('rl-reports').style.display='block';const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');const filterComp=document.getElementById('filter-company');if(filterComp){filterComp.innerHTML='<option value="">전체 기업</option>';companies.forEach(c=>filterComp.innerHTML+=`<option value="${c.name}">${c.name}</option>`);}renderFullReports();};
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
// ★ 보고서 CSS (A4 가로형 최적화)
// ===========================
function tplStyle(color) {
  var c = color||'#3b82f6';
  return '<style>'
  + '* { box-sizing:border-box; }'
  + '.rp-wrap { font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif; background:#e8eaed; padding:14px; }'
  + '.rp-wrap * { font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif; }'

  // ── 표지 ──
  + '.rp-cover { background:white; border-radius:8px; margin-bottom:14px; padding:20px 24px 18px 32px; position:relative; min-height:480px; display:flex; flex-direction:column; overflow:hidden; }'
  + '.rp-cbar  { position:absolute; left:0; top:0; bottom:0; width:12px; background:'+c+'; }'
  + '.rp-cbadge{ font-size:12px; font-weight:700; padding:4px 12px; border-radius:4px; display:inline-block; margin-bottom:8px; letter-spacing:0.3px; }'
  + '.rp-ctitle{ font-size:24px; font-weight:700; color:#0f172a; margin-bottom:4px; letter-spacing:-0.5px; line-height:1.2; }'
  + '.rp-csub  { font-size:13px; color:#64748b; margin-bottom:14px; font-weight:500; }'
  + '.rp-cinfo { margin-top:auto; }'
  // 표지 기업정보 테이블 — 줄바꿈 없이
  + '.rp-cvtbl { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:10px; border-top:2px solid '+c+'; }'
  + '.rp-cvtbl th { background:#f8fafc; border:1px solid #e2e8f0; padding:8px 12px; text-align:left; font-weight:700; color:'+c+'; white-space:nowrap; }'
  + '.rp-cvtbl td { border:1px solid #e2e8f0; padding:8px 12px; color:#1e293b; font-weight:500; white-space:nowrap; }'
  + '.rp-cfoot { display:flex; justify-content:space-between; font-size:13px; color:#64748b; padding-top:10px; border-top:1px solid #e2e8f0; margin-top:10px; font-weight:500; }'

  // ── 페이지 (A4 landscape 기준) ──
  + '.rp-page { background:white; border-radius:8px; margin-bottom:14px; padding:16px 20px 18px; min-height:520px; display:flex; flex-direction:column; }'
  + '.rp-ph   { display:flex; align-items:center; gap:10px; margin-bottom:14px; padding-bottom:10px; border-bottom:2.5px solid #f1f5f9; flex-shrink:0; }'
  + '.rp-pnum { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }'
  + '.rp-ptitle{ font-size:17px; font-weight:700; color:#1e293b; }'
  + '.rp-psub  { font-size:12px; color:#94a3b8; margin-left:auto; white-space:nowrap; }'
  + '.rp-body  { flex:1; display:flex; flex-direction:column; gap:12px; }'

  // ── 레이아웃 ──
  + '.rp-2col  { display:flex; gap:16px; flex:1; }'
  + '.rp-col38 { width:38%; flex-shrink:0; display:flex; flex-direction:column; gap:10px; }'
  + '.rp-col40 { width:40%; flex-shrink:0; display:flex; flex-direction:column; gap:10px; }'
  + '.rp-col45 { width:45%; flex-shrink:0; display:flex; flex-direction:column; gap:10px; }'
  + '.rp-col50 { width:50%; flex-shrink:0; display:flex; flex-direction:column; gap:10px; }'
  + '.rp-colF  { flex:1; min-width:0; display:flex; flex-direction:column; gap:10px; }'
  + '.rp-3col  { display:flex; gap:12px; flex:1; }'
  + '.rp-3c    { flex:1; min-width:0; display:flex; flex-direction:column; gap:10px; }'
  + '.rp-g2   { display:grid; grid-template-columns:1fr 1fr; gap:10px; }'
  + '.rp-g3   { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }'
  + '.rp-g4   { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }'

  // ── 섹션 박스 (내부 줄바꿈 방지) ──
  + '.rp-section { border-radius:8px; padding:13px 15px; border:1px solid #e2e8f0; background:#f8fafc; page-break-inside:avoid; break-inside:avoid; }'
  + '.rp-section h4 { font-size:14px; font-weight:700; margin:0 0 10px 0; padding-bottom:7px; border-bottom:1px solid #e9ecef; }'

  // ── 등급 박스 ──
  + '.rp-grade { background:linear-gradient(135deg,#eff6ff,#dbeafe); border:1px solid #bfdbfe; border-radius:8px; padding:16px; text-align:center; page-break-inside:avoid; }'
  + '.rp-glbl  { font-size:13px; color:#64748b; margin-bottom:5px; font-weight:500; }'
  + '.rp-gval  { font-size:44px; font-weight:900; line-height:1; }'
  + '.rp-gdesc { font-size:13px; color:#475569; margin-top:6px; font-weight:600; }'
  + '.rp-gsub  { font-size:12px; color:#94a3b8; margin-top:3px; }'

  // ── 지표 카드 ──
  + '.rp-mc  { background:white; border-radius:8px; padding:12px 10px; border:1px solid #e2e8f0; text-align:center; page-break-inside:avoid; }'
  + '.rp-mcl { font-size:11px; color:#94a3b8; margin-bottom:4px; font-weight:400; }'
  + '.rp-mcv { font-size:20px; font-weight:700; line-height:1.2; }'
  + '.rp-mcd { font-size:11px; color:#94a3b8; margin-top:4px; font-weight:400; }'

  // ── 리스트 ──
  + '.rp-lst { display:flex; flex-direction:column; gap:7px; }'
  + '.rp-li  { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:#334155; line-height:1.65; font-weight:400; }'
  + '.rp-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:6px; }'

  // ── 수평 바 ──
  + '.rp-hbr { margin-bottom:8px; page-break-inside:avoid; }'
  + '.rp-hbl { display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px; font-weight:400; }'
  + '.rp-hbv { font-weight:700; }'
  + '.rp-hbt { height:9px; border-radius:5px; background:#e2e8f0; overflow:hidden; }'
  + '.rp-hbf { height:100%; border-radius:5px; }'

  // ── 로드맵 3단 ──
  + '.rp-rm3 { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }'
  + '.rp-rmi { border-radius:8px; padding:13px; background:white; border:1px solid #e2e8f0; page-break-inside:avoid; }'
  + '.rp-rmh { font-size:14px; font-weight:700; margin-bottom:10px; padding-bottom:7px; border-bottom:1px solid #f1f5f9; }'
  + '.rp-rmtk{ font-size:13px; color:#475569; padding-left:12px; position:relative; margin-bottom:6px; line-height:1.55; font-weight:400; }'
  + '.rp-rmtk::before { content:"•"; position:absolute; left:0; font-weight:700; }'

  // ── 성장 단계 ──
  + '.rp-gph  { display:flex; gap:12px; align-items:flex-start; border-radius:8px; padding:11px 15px; margin-bottom:8px; page-break-inside:avoid; }'
  + '.rp-gphs { background:#eff6ff; border:1px solid #93c5fd; }'
  + '.rp-gphm { background:#f0fdf4; border:1px solid #86efac; }'
  + '.rp-gphl { background:#fdf4ff; border:1px solid #d8b4fe; }'
  + '.rp-gphh { font-size:13px; font-weight:700; white-space:nowrap; min-width:92px; padding-top:2px; }'
  + '.rp-gphs .rp-gphh { color:#1d4ed8; }'
  + '.rp-gphm .rp-gphh { color:#15803d; }'
  + '.rp-gphl .rp-gphh { color:#7c3aed; }'
  + '.rp-gph ul { list-style:none; padding:0; margin:0; flex:1; display:flex; flex-wrap:wrap; gap:4px 18px; }'
  + '.rp-gph li { font-size:13px; padding-left:12px; position:relative; line-height:1.55; color:#334155; width:calc(50% - 9px); font-weight:400; }'
  + '.rp-gph li::before { content:"•"; position:absolute; left:0; font-weight:700; }'
  + '.rp-gphs li::before { color:#1d4ed8; } .rp-gphm li::before { color:#15803d; } .rp-gphl li::before { color:#7c3aed; }'

  // ── 차트 박스 ──
  + '.rp-ch  { background:white; border-radius:7px; border:1px solid #e2e8f0; padding:10px; }'

  // ── SWOT ──
  + '.rp-swot { display:grid; grid-template-columns:1fr 1fr; gap:10px; flex:1; }'
  + '.rp-sws { background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:12px 14px; page-break-inside:avoid; }'
  + '.rp-sww { background:#fef2f2; border:1px solid #fca5a5; border-radius:8px; padding:12px 14px; page-break-inside:avoid; }'
  + '.rp-swo { background:#eff6ff; border:1px solid #93c5fd; border-radius:8px; padding:12px 14px; page-break-inside:avoid; }'
  + '.rp-swt { background:#fff7ed; border:1px solid #fdba74; border-radius:8px; padding:12px 14px; page-break-inside:avoid; }'
  + '.rp-swl { font-size:14px; font-weight:700; margin-bottom:8px; }'
  + '.rp-sws .rp-swl{color:#15803d;} .rp-sww .rp-swl{color:#dc2626;} .rp-swo .rp-swl{color:#1d4ed8;} .rp-swt .rp-swl{color:#ea580c;}'
  + '.rp-sw ul { list-style:none; padding:0; margin:0; }'
  + '.rp-sw li { font-size:13px; padding-left:12px; position:relative; margin-bottom:6px; line-height:1.6; color:#334155; font-weight:400; }'
  + '.rp-sw li::before { content:"•"; position:absolute; left:0; font-weight:700; }'
  + '.rp-sws li::before{color:#15803d;} .rp-sww li::before{color:#dc2626;} .rp-swo li::before{color:#1d4ed8;} .rp-swt li::before{color:#ea580c;}'

  // ── 비교표 ──
  + '.rp-ctb { width:100%; border-collapse:collapse; font-size:13px; }'
  + '.rp-ctb th { background:#1e3a8a; color:white; padding:9px 10px; text-align:center; border:1px solid #1e40af; font-size:13px; font-weight:700; }'
  + '.rp-ctb td { padding:8px 10px; text-align:center; border:1px solid #e2e8f0; color:#334155; font-size:13px; font-weight:400; }'
  + '.rp-ctb td:first-child { text-align:left; font-weight:700; } .rp-ctb td:nth-child(2) { background:#f0fdf4; color:#15803d; font-weight:700; }'
  + '.rp-ctb tr:nth-child(even) td { background:#f8fafc; }'

  // ── 자금 표 ──
  + '.rp-ftb { width:100%; border-collapse:collapse; font-size:13px; }'
  + '.rp-ftb th { background:#f0fdf4; border:1px solid #bbf7d0; padding:9px 10px; color:#15803d; font-weight:700; text-align:center; }'
  + '.rp-ftb td { border:1px solid #e2e8f0; padding:8px 10px; color:#334155; font-size:13px; }'
  + '.rp-ftb tr:nth-child(even) td { background:#f8fafc; } .rp-ftb tfoot td { background:#f0fdf4; font-weight:700; color:#15803d; }'

  // ── 기업현황 테이블 ──
  + '.rp-ovt { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:12px; border-top:2px solid #1e3a8a; }'
  + '.rp-ovt th { background:#eff6ff; border:1px solid #bfdbfe; padding:8px 11px; text-align:left; color:#1e40af; font-weight:700; white-space:nowrap; }'
  + '.rp-ovt td { border:1px solid #e2e8f0; padding:8px 11px; color:#1e293b; font-weight:500; }'

  // ── 가점 카드 ──
  + '.rp-cert { display:flex; align-items:flex-start; gap:12px; background:white; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; margin-bottom:9px; page-break-inside:avoid; }'
  + '.rp-certi{ width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }'
  + '.rp-certb{ flex:1; } .rp-certn{ font-size:14px; font-weight:700; color:#1e293b; margin-bottom:3px; } .rp-certd{ font-size:13px; color:#64748b; line-height:1.5; }'
  + '.rp-certa{ text-align:right; flex-shrink:0; margin-left:8px; } .rp-certv{ font-size:15px; font-weight:700; } .rp-certp{ font-size:12px; color:#94a3b8; }'

  // ── 순위 카드 ──
  + '.rp-rank { background:white; border:1px solid #e2e8f0; border-radius:8px; padding:11px 14px; margin-bottom:8px; page-break-inside:avoid; }'
  + '.rp-rh   { display:flex; align-items:center; gap:9px; margin-bottom:7px; }'
  + '.rp-rn   { width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; color:white; }'
  + '.rp-rnm  { font-size:14px; font-weight:700; color:#1e293b; } .rp-rlm { font-size:14px; font-weight:700; margin-left:auto; }'
  + '.rp-rtgs { display:flex; gap:5px; flex-wrap:wrap; } .rp-rtg { font-size:12px; padding:3px 8px; border-radius:4px; font-weight:600; }'

  // ── 체크 ──
  + '.rp-chk { display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:6px; background:white; border:1px solid #e2e8f0; margin-bottom:6px; page-break-inside:avoid; }'
  + '.rp-chi { width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }'
  + '.rp-cht { flex:1; font-size:13px; color:#334155; font-weight:400; } .rp-chb { font-size:12px; padding:2px 8px; border-radius:4px; font-weight:700; white-space:nowrap; }'

  // ── 컨설턴트 박스 ──
  + '.rp-cons { border-radius:8px; padding:15px 18px; border:2px solid #f59e0b; border-left:5px solid #d97706; background:#fffbeb; }'
  + '.rp-cons h3 { font-size:15px; font-weight:700; color:#92400e; margin:0 0 13px 0; padding-bottom:9px; border-bottom:1px solid #fcd34d; }'
  + '.rp-inn  { border-radius:7px; padding:11px 13px; margin-bottom:10px; background:#fef9ec; border:1px solid #fcd34d; page-break-inside:avoid; }'
  + '.rp-innt { font-size:13px; font-weight:700; color:#92400e; margin-bottom:7px; }'

  // ── 피드백 ──
  + '.rp-fb  { border-radius:7px; padding:11px 13px; border:1px solid #fed7aa; border-left:5px solid #f97316; background:#fff7ed; page-break-inside:avoid; }'
  + '.rp-fbt { font-size:13px; font-weight:700; color:#c2410c; margin-bottom:7px; }'

  // ── 차별점 박스 ──
  + '.rp-diff { border-radius:8px; padding:13px 17px; margin-bottom:10px; page-break-inside:avoid; }'
  + '.rp-diff .rp-dt { font-size:14px; font-weight:700; margin-bottom:7px; }'
  + '.rp-diff .rp-dd { font-size:13px; color:#334155; line-height:1.65; font-weight:400; }'

  // ── 마무리 ──
  + '.rp-cls  { background:#f0fdf4; border-radius:8px; padding:18px 20px; border:1px solid #86efac; page-break-inside:avoid; }'
  + '.rp-clst { font-size:14px; font-weight:700; color:#15803d; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #bbf7d0; }'
  + '.rp-clstx{ font-size:13px; color:#1e293b; line-height:1.85; font-weight:400; }'

  // ── 비교표(정책자금) ──
  + '.rp-cmpt { width:100%; border-collapse:collapse; font-size:13px; }'
  + '.rp-cmpt th { border:1px solid #fed7aa; padding:8px 9px; font-weight:700; background:#fff7ed; }'
  + '.rp-cmpt td { padding:8px 9px; border:1px solid #e2e8f0; color:#334155; text-align:center; font-size:13px; }'
  + '.rp-cmpt td:first-child { text-align:left; } .rp-cmpt tr:nth-child(even) td { background:#f8fafc; }'

  // ── 도넛 범례 ──
  + '.rp-dleg{ display:flex; flex-direction:column; gap:6px; }'
  + '.rp-dli { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:400; }'
  + '.rp-ddt { width:11px; height:11px; border-radius:3px; flex-shrink:0; }'

  // ── 강조 배너 ──
  + '.rp-hi  { border-radius:8px; padding:14px 18px; margin:8px 0; page-break-inside:avoid; }'

  // ── 인쇄 ──
  + '@media print {'
  + '  * { -webkit-print-color-adjust:exact !important; color-adjust:exact !important; print-color-adjust:exact !important; }'
  + '  .rp-wrap { background:white !important; padding:0 !important; }'
  + '  .rp-cover { border-radius:0 !important; margin:0 !important; page-break-after:always; break-after:page; min-height:auto !important; }'
  + '  .rp-page  { border-radius:0 !important; margin:0 !important; border:none !important; page-break-before:always; break-before:page; page-break-inside:avoid; break-inside:avoid; }'
  + '}'
  + '</style>';
}

// ===========================
// ★ 헬퍼 함수들
// ===========================
function calcExp(cData, rev) {
  var rm = parseInt((cData.date||'').split('-')[1]) || 1;
  return Math.round(((rev.cur||0) / Math.max(rm-1, 1)) * 12);
}

function rpLst(items, color) {
  return '<div class="rp-lst">' + (items||[]).map(function(i) {
    return '<div class="rp-li"><div class="rp-dot" style="background:'+color+'"></div><span>'+i+'</span></div>';
  }).join('') + '</div>';
}

function rpHB(label, value, display, color) {
  return '<div class="rp-hbr"><div class="rp-hbl"><span>'+label+'</span><span class="rp-hbv" style="color:'+color+'">'+display+'</span></div><div class="rp-hbt"><div class="rp-hbf" style="width:'+Math.min(value||0,100)+'%;background:'+color+'"></div></div></div>';
}

function rpMC(label, value, desc, color) {
  return '<div class="rp-mc"><div class="rp-mcl">'+label+'</div><div class="rp-mcv" style="color:'+color+'">'+value+'</div><div class="rp-mcd">'+desc+'</div></div>';
}

function rpFB(items, color) {
  return '<div class="rp-fb"><div class="rp-fbt">🔍 컨설턴트 피드백</div>'+rpLst(items, color||'#f97316')+'</div>';
}

function rpPage(num, title, sub, color, content) {
  var numBg = (color==='#d97706'||color==='#92400e') ? '#fef3c7' : '#eff6ff';
  var numTc = (color==='#d97706'||color==='#92400e') ? '#d97706' : color;
  return '<div class="rp-page">'
    + '<div class="rp-ph">'
    + '<div class="rp-pnum" style="background:'+numBg+';color:'+numTc+'">'+num+'</div>'
    + '<span class="rp-ptitle">'+title+'</span>'
    + '<span class="rp-psub">'+(sub||'')+'</span>'
    + '</div>'
    + '<div class="rp-body">'+content+'</div>'
    + '</div>';
}

function rpSec(title, color, content) {
  return '<div class="rp-section">'
    + (title ? '<h4 style="color:'+color+'">'+title+'</h4>' : '')
    + content
    + '</div>';
}


// ===========================
// ★ 표지 HTML
// ===========================
function buildCoverHTML(cData, config, rev, dateStr) {
  var session = JSON.parse(localStorage.getItem(DB_SESSION)||'{}');
  var cName   = session.name||'담당 컨설턴트';
  var cDept   = session.dept||'솔루션빌더스';
  var safeRev = rev||{cur:0,y25:0,y24:0,y23:0};
  var exp     = calcExp(cData, safeRev);
  var color   = config.borderColor||'#3b82f6';
  var badgeBg = color==='#16a34a'?'#f0fdf4':color==='#ea580c'?'#fff7ed':color==='#0d9488'?'#f0fdfa':color==='#db2777'?'#fdf2f8':color==='#1e293b'?'#f1f5f9':'#eff6ff';
  var badgeTc = color==='#16a34a'?'#15803d':color==='#ea580c'?'#c2410c':color==='#0d9488'?'#0f766e':color==='#db2777'?'#be185d':color==='#1e293b'?'#334155':'#1d4ed8';
  var vLabel  = config.version==='consultant'?'컨설턴트용':config.version==='client'?'기업전달용':config.vLabel||'';

  return '<div class="rp-cover">'
    + '<div class="rp-cbar"></div>'
    + '<span class="rp-cbadge" style="background:'+badgeBg+';color:'+badgeTc+'">'+config.reportKind+'</span>'
    + '<div class="rp-ctitle">'+config.title
    + (vLabel ? ' <span style="font-size:15px;color:#94a3b8;font-weight:400">('+vLabel+')</span>' : '')
    + '</div>'
    + '<div class="rp-csub">'+cData.name+' &nbsp;·&nbsp; '+(cData.industry||'-')+'</div>'
    + '<div class="rp-cinfo">'
    + '<table class="rp-cvtbl">'
    + '<tr><th>기업명</th><td>'+cData.name+'</td><th>대표자</th><td>'+(cData.rep||'-')+'</td><th>업종</th><td>'+(cData.industry||'-')+'</td><th>설립일</th><td>'+(cData.bizDate||'-')+'</td></tr>'
    + '<tr><th>사업자번호</th><td>'+(cData.bizNum||'-')+'</td><th>상시근로자</th><td>'+(cData.empCount||'-')+'명</td><th>전년 매출</th><td>'+fKRW(safeRev.y25)+'</td><th>금년 예상</th><td>'+fKRW(exp)+'</td></tr>'
    + '</table>'
    + '<div class="rp-cfoot">'
    + '<span>📅 보고서 작성일: '+dateStr+'</span>'
    + '<span>👤 담당 컨설턴트: '+cName+'</span>'
    + '<span>🏢 '+cDept+'</span>'
    + '</div>'
    + '</div></div>';
}

// ===========================
// ★ 경영진단 기업전달용 (P1~P6)
// ===========================
function buildMgmtClientHTML(d, cData, rev, dateStr) {
  var color = '#3b82f6';
  var exp   = calcExp(cData, rev);
  var cover = buildCoverHTML(cData, {title:'경영진단보고서',reportKind:'경영진단보고서',version:'client',borderColor:color}, rev, dateStr);
  var radar = (d.radar||[65,80,68,70,55]).join(',');
  var bars  = d.marketing_bars||{finance:72,strategy:85,operation:68,hr:64,it:57};
  var certs = d.certs||[
    {name:'벤처기업 인증',effect:'중진공·기보 우대금리 적용 — 추가 자금 한도 최대 2억원 확보 가능',amount:'+2억',period:'6개월 내'},
    {name:'이노비즈 인증',effect:'기술혁신형 중소기업 인증 — 중진공 기술개발자금 신청 자격 부여',amount:'+3억',period:'1년 내'},
    {name:'기업부설연구소',effect:'R&D 세액공제 25% 적용 + 기보 기술보증 우대 동시 적용 가능',amount:'+1.5억',period:'세액공제 병행'},
    {name:'HACCP 인증',effect:'대형마트·단체급식 납품 채널 확대 — 매출 직접 연결 효과',amount:'채널↑',period:'매출 확대'}
  ];
  var cIcons = ['🏆','📜','🔬','✅'];
  var cBgs   = ['#f0fdf4','#eff6ff','#fdf4ff','#fff7ed'];
  var totalC = certs.reduce(function(s,c){ var n=parseFloat(c.amount.replace(/[^0-9.]/g,'')); return s+(isNaN(n)?0:n); }, 0);

  // P1: 경영진단 개요
  var p1 = rpPage(1,'경영진단 개요','기업현황 · 진단목적',color,
    '<div class="rp-2col">'
    +'<div class="rp-col38">'
    +rpSec('', color,
      '<table class="rp-ovt"><tr><th>기업명</th><td colspan="3">'+cData.name+'</td></tr>'
      +'<tr><th>대표자</th><td>'+(cData.rep||'-')+'</td><th>업종</th><td>'+(cData.industry||'-')+'</td></tr>'
      +'<tr><th>설립일</th><td>'+(cData.bizDate||'-')+'</td><th>상시근로자</th><td>'+(cData.empCount||'-')+'명</td></tr>'
      +'<tr><th>핵심아이템</th><td>'+(cData.coreItem||'-')+'</td><th>사업자번호</th><td>'+(cData.bizNum||'-')+'</td></tr>'
      +'<tr><th>전년 매출</th><td>'+fKRW(rev.y25)+'</td><th>금년 예상</th><td>'+fKRW(exp)+'</td></tr>'
      +'</table>'
      +'<div class="rp-grade"><div class="rp-glbl">AI 종합 진단 등급</div>'
      +'<div class="rp-gval" style="color:'+color+'">'+(d.grade||'B+')+'</div>'
      +'<div class="rp-gdesc">'+(d.grade_desc||'성장 유망 단계')+'</div>'
      +'<div class="rp-gsub">전체 진단 기업 기준 상위 30% 수준</div></div>'
    )
    +'</div>'
    +'<div class="rp-colF">'
    +'<div class="rp-g3">'
    +rpMC('매출 성장률',(rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'+21%','전년 대비','#16a34a')
    +rpMC('금년 예상 매출',fKRW(exp),'연간 환산','#7c3aed')
    +rpMC('핵심 아이템',(cData.coreItem||'주력 제품').slice(0,8),'경쟁력 보유',color)
    +'</div>'
    +rpSec('진단 목적 및 방향', color, rpLst(d.overview||[
      '기업의 현재 경영 상태를 재무·전략·인사·운영·IT 전 영역에 걸쳐 종합 진단하여 핵심 강점과 개선 기회를 파악함',
      '창업 이후 고성장 추이를 분석하고 시장 내 경쟁 우위 지속을 위한 전략적 포지셔닝 방향을 제시함',
      '중소기업 정책자금 지원 요건 충족 여부를 점검하고 신청 가능 자금 목록 및 조달 전략을 수립함',
      '인증 취득(벤처·이노비즈·HACCP 등)을 통한 가점 확보로 정책자금 조달 한도를 극대화하는 방안을 제안함',
      '단기·중기·장기 성장 로드맵을 기반으로 실행 가능한 경영 개선 우선순위 액션플랜을 수립함'
    ], color))
    +'</div>'
    +'</div>'
  );

  // P2: 재무 현황 분석
  var p2 = rpPage(2,'재무 현황 분석','매출 추이 · 수익성 · 안정성',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +rpSec('연도별 매출 추이', color,
      '<div class="rp-ch" style="height:190px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div>'
    )
    +'<div class="rp-g4">'
    +rpMC('전년 매출',fKRW(rev.y25),'2025년',color)
    +rpMC('금년 예상',fKRW(exp),'연환산',color)
    +rpMC('성장률',(rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'분석중','YoY','#16a34a')
    +rpMC('2년 성장',(rev.y23>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y23)/rev.y23)*100)+'%':'분석중','2년누계','#16a34a')
    +'</div>'
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('재무 강점 분석', color, rpLst(d.finance_strengths||[
      '창업 초기임에도 불구하고 매출 성장률이 업종 평균을 크게 상회하며 시장 내 빠른 입지 확보에 성공함',
      '핵심 제품의 독창성과 기술적 차별성을 바탕으로 높은 마진율을 유지하여 수익성 기반을 구축하고 있음',
      '정책자금을 활용한 저금리 차입 구조를 통해 금융 비용 부담을 최소화하고 재무 안정성을 확보하고 있음',
      '영업이익률이 동업종 평균을 상회하여 수익 구조의 건전성을 입증하고 있으며 향후 투자 여력이 충분함'
    ], color))
    +rpSec('개선 필요 포인트', '#f97316', rpLst(d.finance_risks||[
      '단일 제품 매출 의존도가 높아 포트폴리오 다각화를 통한 매출 안정성 강화가 시급히 요구됨',
      '급성장에 따른 운전자본 수요 증가에 대비하여 정책자금 조달 계획을 조기에 수립할 필요가 있음',
      '매출 고성장 구간에서 발생하는 현금흐름 미스매치를 예방하기 위한 유동성 관리 체계 구축이 필요함'
    ], '#f97316'))
    +'</div>'
    +'</div>'
  );

  // P3: 전략·마케팅 분석
  var p3 = rpPage(3,'전략 및 마케팅 분석','역량 레이더 · 마케팅 포지셔닝',color,
    '<div class="rp-2col">'
    +'<div class="rp-col45">'
    +rpSec('경영 역량 진단 레이더', color,
      '<div class="rp-ch" style="height:210px"><canvas id="rp-radar" data-scores="'+radar+'" style="width:100%;height:100%"></canvas></div>'
    )
    +rpSec('영역별 역량 점수', color,
      rpHB('재무 건전성', bars.finance||72, (bars.finance||72)+'점', color)
      +rpHB('전략 / 마케팅', bars.strategy||85, (bars.strategy||85)+'점', color)
      +rpHB('운영 / 생산', bars.operation||68, (bars.operation||68)+'점', color)
      +rpHB('인사 / 조직', bars.hr||64, (bars.hr||64)+'점', color)
      +rpHB('IT / 디지털', bars.it||57, (bars.it||57)+'점', color)
    )
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('마케팅 현황 분석', color, rpLst(d.marketing||[
      '주력 제품의 독창성과 품질 경쟁력이 구매자 사이에서 자연 입소문 마케팅의 핵심 동력으로 작용하고 있음',
      '인스타그램·유튜브 쇼츠 등 SNS 채널을 통한 콘텐츠 마케팅 강화로 브랜드 인지도를 집중 확산시킬 필요가 있음',
      '충성 고객층을 기반으로 한 재구매율 제고 전략과 리뷰 마케팅 활성화가 매출 안정성 확보에 중요한 역할을 함',
      'B2B 납품 채널 확장(대형마트·단체급식)을 통해 안정적 매출 기반을 조성할 수 있는 충분한 여건이 갖추어져 있음',
      '온라인 플랫폼(쿠팡·스마트스토어 등) 입점 확대와 자사몰 구축을 통해 유통 채널 다각화가 필요한 시점임'
    ], color))
    +rpSec('전략 포지셔닝 방향', '#7c3aed', rpLst(d.marketing_items||[
      '틈새시장(niche market) 선점 전략으로 경쟁사 대비 차별화된 프리미엄 포지션을 구축하여 가격 결정력을 확보함',
      '현재 보유한 기술 특허와 독창적 제품 스펙을 핵심 마케팅 메시지로 활용하여 브랜드 신뢰도를 높여야 함',
      '정기구독 모델 및 시즌성 프로모션 기획으로 재구매 사이클을 단축하고 고객 생애가치(LTV)를 극대화해야 함'
    ], '#7c3aed'))
    +'</div>'
    +'</div>'
  );

  // P4: 인사·운영·IT 분석
  var p4 = rpPage(4,'인사·조직 및 운영·생산·IT 분석','조직 역량 · 생산 효율 · 디지털 현황',color,
    '<div class="rp-3col">'
    +'<div class="rp-3c">'
    +rpSec('인사·조직 현황', color, rpLst(d.hr||[
      '소수 정예 팀 구성으로 핵심 역량에 집중하고 있으며 인당 생산성이 업종 평균 대비 우수한 수준임',
      '대표자 중심의 신속한 의사결정 구조로 시장 변화에 빠르게 대응하는 기민성(agility)을 보유하고 있음',
      '사업 성장에 따른 전문 인력(영업·마케팅·생산관리) 채용 계획을 조기 수립하여 준비해야 함',
      '핵심 인력 이탈 리스크를 관리하기 위한 성과 공유 제도(스톡옵션 등) 및 인센티브 체계가 필요함',
      '조직 문화 정립, 직무 기술서 작성, 업무 매뉴얼화를 통해 성장 기반의 운영 인프라를 구축해야 함'
    ], color))
    +'</div>'
    +'<div class="rp-3c">'
    +rpSec('운영·생산 현황', color, rpLst(d.ops||[
      '현재 생산 방식은 수작업 비중이 높아 반자동 설비 도입 시 원가율 20% 이상 절감 여력이 충분히 있음',
      '품질관리 체계를 HACCP 기준으로 고도화하여 고객 불만율을 낮추고 B2B 납품 가능성을 높여야 함',
      '원재료 조달 프로세스 최적화(선매입·재고 관리)를 통해 원가 변동성을 줄이고 공급 안정성을 확보해야 함',
      '위탁 생산과 자체 생산의 비율 최적화를 통해 고정비 부담을 최소화하고 수익성을 개선해야 함',
      'ISO 품질인증 취득을 단계적으로 추진하여 B2B 거래처가 요구하는 품질 기준을 충족시킬 수 있음'
    ], color))
    +'</div>'
    +'<div class="rp-3c">'
    +rpSec('IT·디지털 현황', color, rpLst(d.it||[
      'ERP 시스템 도입을 통해 재고·매출·회계 데이터를 통합 관리하여 의사결정 속도와 정확도를 높여야 함',
      '판매 채널 데이터 통합 분석 및 CRM 시스템 도입으로 고객 관리 역량을 체계화할 필요가 있음',
      'SNS 채널 운영 및 콘텐츠 마케팅 역량을 내재화하여 외부 의존도를 낮추고 마케팅 비용을 절감해야 함',
      '자사몰(쇼핑몰) 구축을 통해 플랫폼 수수료를 절감하고 고객 데이터를 직접 확보·활용할 수 있음',
      '물류·배송 자동화 솔루션 도입으로 주문처리 리드타임을 단축하고 고객 만족도를 높여야 함'
    ], color))
    +'</div>'
    +'</div>'
  );

  // P5: 가점추천
  var p5 = rpPage(5,'가점추천','인증 취득으로 정책자금 한도 최대화',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +'<div style="margin-bottom:6px"><h4 style="font-size:14px;font-weight:700;color:'+color+';margin-bottom:12px">📜 추천 인증 목록 (우선순위 순)</h4>'
    +certs.map(function(c,i){
      return '<div class="rp-cert"><div class="rp-certi" style="background:'+cBgs[i%cBgs.length]+'">'+cIcons[i%cIcons.length]+'</div>'
        +'<div class="rp-certb"><div class="rp-certn">'+c.name+'</div><div class="rp-certd">'+c.effect+'</div></div>'
        +'<div class="rp-certa"><div class="rp-certv" style="color:'+color+'">'+c.amount+'</div><div class="rp-certp">'+c.period+'</div></div></div>';
    }).join('')
    +'</div>'
    +'</div>'
    +'<div class="rp-colF">'
    +'<div style="background:#eff6ff;border-radius:8px;padding:18px;border:1px solid #bfdbfe;text-align:center;margin-bottom:12px">'
    +'<div style="font-size:13px;font-weight:700;color:#1e40af;margin-bottom:6px">인증 완료 시 총 추가 조달 가능 한도</div>'
    +'<div style="font-size:30px;font-weight:900;color:'+color+';line-height:1.2">최대 +'+(totalC>0?totalC+'억원':'6억5천만원')+'</div>'
    +'<div style="font-size:13px;color:#64748b;margin-top:6px">현재 신청 가능 한도 + 인증 취득 후 추가 조달 합계</div>'
    +'</div>'
    +rpSec('인증 취득 우선순위 전략', color, rpLst([
      '1순위: 벤처인증 (소요기간 약 6개월) — 즉각적인 자금 한도 확대 효과가 가장 크며 준비 난이도가 낮음',
      '2순위: 이노비즈 인증 (1년 내) — 중진공 기술개발자금 신청 자격 부여 + 기보 우대보증 적용 가능',
      '3순위: 기업부설연구소 (중기) — R&D 세액공제 25% 절세 효과 + 기보 기술보증 우대 동시 적용',
      '4순위: HACCP 인증 (장기) — 대형마트·단체급식 납품 채널 직접 연결 → 안정적 매출 확보 가능',
      '인증 준비는 사업계획서 작성과 병행하여 시너지 효과를 극대화하고 컨설턴트와 일정 조율 권고'
    ], color))
    +'</div>'
    +'</div>'
  );

  // P6: 성장 로드맵
  var p6 = rpPage(6,'개선 방향 및 성장 로드맵','단기·중기·장기 실행 계획',color,
    '<div class="rp-rm3" style="margin-bottom:14px">'
    +'<div class="rp-rmi" style="border-top:4px solid '+color+'">'
    +'<div class="rp-rmh" style="color:#1d4ed8">⚡ 단기 (6개월)</div>'
    +(d.roadmap_short||['벤처기업 인증 신청 착수 및 서류 준비 완료','중진공·기보 정책자금 신청서류 일괄 준비','월별 손익 현황 및 현금흐름 관리 체계 구축','SNS 채널 최적화 및 쿠팡 입점 준비 시작']).map(function(t){return '<div class="rp-rmtk">'+t+'</div>';}).join('')
    +'</div>'
    +'<div class="rp-rmi" style="border-top:4px solid #16a34a">'
    +'<div class="rp-rmh" style="color:#15803d">📈 중기 (1년)</div>'
    +(d.roadmap_mid||['정책자금 조달 완료 및 생산 설비 확충 실행','이노비즈 인증 취득 추진 및 기술 경쟁력 강화','B2B 납품 채널 2~3곳 확보 및 안정적 수익 기반 마련','마케팅 채널 다각화 및 월 매출 1.5억원 달성']).map(function(t){return '<div class="rp-rmtk">'+t+'</div>';}).join('')
    +'</div>'
    +'<div class="rp-rmi" style="border-top:4px solid #7c3aed">'
    +'<div class="rp-rmh" style="color:#6d28d9">🌟 장기 (3년)</div>'
    +(d.roadmap_long||['매출 30억 달성 및 신제품 라인업 확장 추진','기업부설연구소 설립 및 R&D 세액공제 활용','자사몰 구축 완료 및 정기구독 서비스 안착','해외 수출 타당성 검토 및 중장기 글로벌 계획 수립']).map(function(t){return '<div class="rp-rmtk">'+t+'</div>';}).join('')
    +'</div>'
    +'</div>'
    +'<div class="rp-section" style="background:#eff6ff;border-color:#bfdbfe">'
    +'<h4 style="color:#1e40af">★ 종합 의견 및 컨설턴트 총평</h4>'
    +rpLst(d.summary||[
      '본 기업은 단기간의 폭발적 매출 성장과 독창적 기술력을 보유한 고성장 잠재력 기업으로 전문가 그룹 내 최우선 지원 대상으로 평가됨',
      '인증 취득 로드맵을 체계적으로 실행할 경우, 추가 정책자금 조달을 통한 성장 가속화와 시장 내 독점적 포지션 강화가 충분히 기대됨',
      '전략적 채널 확대, 조직 역량 강화, 생산 자동화를 병행하여 3년 내 매출 30억 달성과 시장 리더십 확보가 현실적인 목표임을 컨설턴트로서 확신함'
    ], color)
    +'</div>'
  );

  return tplStyle(color, 'portrait') + '<div class="rp-wrap">' + cover + p1 + p2 + p3 + p4 + p5 + p6 + '</div>';
}

// ===========================
// ★ 경영진단 컨설턴트용 (P1~P7)
// ===========================
function buildMgmtConsultantHTML(d, cData, rev, dateStr) {
  var color = '#3b82f6';
  var exp   = calcExp(cData, rev);
  var cover = buildCoverHTML(cData, {title:'경영진단보고서',reportKind:'경영진단보고서',version:'consultant',borderColor:'#1e293b'}, rev, dateStr);
  var radar = (d.radar||[65,80,68,70,55]).join(',');
  var bars  = d.marketing_bars||{finance:72,strategy:85,operation:68,hr:64,it:57};
  var certs = d.certs||[{name:'벤처인증',effect:'중진공 우대금리 적용',amount:'+2억',period:'6개월'},{name:'이노비즈',effect:'기보 우대 보증',amount:'+3억',period:'1년'}];

  var p1 = rpPage(1,'경영진단 개요','기업현황 · 핵심 리스크',color,
    '<div class="rp-2col">'
    +'<div class="rp-col38">'
    +rpSec('', color,
      '<table class="rp-ovt"><tr><th>기업명</th><td colspan="3">'+cData.name+'</td></tr>'
      +'<tr><th>대표자</th><td>'+(cData.rep||'-')+'</td><th>업종</th><td>'+(cData.industry||'-')+'</td></tr>'
      +'<tr><th>전년 매출</th><td>'+fKRW(rev.y25)+'</td><th>금년 예상</th><td>'+fKRW(exp)+'</td></tr>'
      +'</table>'
      +'<div class="rp-grade"><div class="rp-glbl">종합 진단 등급</div>'
      +'<div class="rp-gval" style="color:'+color+'">'+(d.grade||'B+')+'</div>'
      +'<div class="rp-gdesc">'+(d.grade_desc||'성장 유망 단계')+'</div></div>'
    )
    +rpSec('진단 목적', color, rpLst(d.overview||['진단 목적 분석 중'], color))
    +'</div>'
    +'<div class="rp-colF">'
    +'<div class="rp-section" style="background:#fffbeb;border-color:#fcd34d;flex:1">'
    +'<h4 style="color:#92400e">🚨 핵심 리스크 요약 (내부용)</h4>'
    +rpLst(d.key_risks||[
      '매출 급성장에 따른 운전자본 부족 리스크 — 현금흐름 단기 경색 가능성을 사전에 차단해야 함',
      '단일 제품 의존 구조로 인한 수익 변동성 리스크 — 포트폴리오 다각화 전략 수립이 시급함',
      '핵심 인력 이탈 시 생산·운영 중단 리스크 — 업무 매뉴얼화 및 인력 분산 전략이 필요함',
      '경쟁사의 유사 제품 개발 리스크 — 특허 권리 강화 및 신규 특허 출원 계획 수립 필요'
    ], '#d97706')
    +'</div>'
    +'</div>'
    +'</div>'
  );

  var p2 = rpPage(2,'재무 현황 분석','리스크 중점 분석',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +rpSec('연도별 매출 추이', color,
      '<div class="rp-ch" style="height:190px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div>'
    )
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('재무 현황', color, rpLst(d.finance_strengths||['재무 분석 중'], color))
    +rpFB(d.fb_finance||[
      '매출 급성장 대비 현금흐름 관리 체계가 미흡하여 단기 유동성 위기 가능성에 선제적으로 대비해야 함',
      '매출이익률은 양호하나 원재료 가격 상승 리스크에 대한 헤지 전략과 재고 관리 최적화가 필요함',
      '정책자금 조달 후 원금 상환 스케줄을 사전에 시뮬레이션하여 현금흐름 안정성을 확보해야 함'
    ])
    +'</div>'
    +'</div>'
  );

  var p3 = rpPage(3,'전략 및 마케팅 분석','취약점 포함 종합',color,
    '<div class="rp-2col">'
    +'<div class="rp-col45">'
    +rpSec('역량 레이더', color, '<div class="rp-ch" style="height:205px"><canvas id="rp-radar" data-scores="'+radar+'" style="width:100%;height:100%"></canvas></div>')
    +rpSec('영역별 점수', color,
      rpHB('재무 건전성',bars.finance||72,(bars.finance||72)+'점',color)
      +rpHB('전략/마케팅',bars.strategy||85,(bars.strategy||85)+'점',color)
      +rpHB('운영/생산',bars.operation||68,(bars.operation||68)+'점',color)
      +rpHB('인사/조직',bars.hr||64,(bars.hr||64)+'점',color)
      +rpHB('IT/디지털',bars.it||57,(bars.it||57)+'점',color)
    )
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('마케팅 분석', color, rpLst(d.marketing||['마케팅 분석 중'], color))
    +rpFB(d.fb_marketing||[
      '현재 마케팅 채널이 단일화되어 있어 리스크가 집중됨 — 채널 다각화 및 예산 배분 최적화가 시급함',
      'SNS 팔로워 대비 구매 전환율이 낮아 구매 유도 콘텐츠 전략과 랜딩페이지 최적화가 필요함'
    ])
    +'</div>'
    +'</div>'
  );

  var p4 = rpPage(4,'인사·조직 및 운영·생산','리스크 중점 분석',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +rpSec('인사·조직', color, rpLst(d.hr||['인사 분석 중'], color))
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('운영·생산', color, rpLst(d.ops||['운영 분석 중'], color))
    +rpFB(d.fb_hr_ops||[
      '소수 인원 운영 구조에서 핵심 인력 부재 시 업무 단절 리스크가 매우 높음 — 멀티스킬 육성 및 권한 분산 필요',
      '생산 설비의 노후화 또는 단일 라인 운영으로 인한 생산 중단 리스크에 대비한 대응 계획이 부재함'
    ])
    +'</div>'
    +'</div>'
  );

  var p5 = rpPage(5,'IT·디지털 및 정부지원','개선 과제',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +rpSec('IT·디지털 현황', color, rpLst(d.it||['IT 분석 중'], color))
    +'</div>'
    +'<div class="rp-colF">'
    +rpFB(d.fb_it||[
      '디지털 전환 수준이 낮아 운영 효율성과 데이터 기반 의사결정 역량 강화가 시급히 요구됨',
      '온라인 채널 다변화 없이 단일 플랫폼에 의존하는 구조는 플랫폼 정책 변경 시 매출 급감 리스크가 있음',
      '고객 데이터 수집·분석 체계 부재로 재구매 유도 및 맞춤형 마케팅 실행이 구조적으로 어려운 상황임'
    ])
    +'</div>'
    +'</div>'
  );

  var p6 = rpPage(6,'개선 방향 및 성장 로드맵','우선순위별 실행 계획',color,
    '<div class="rp-rm3" style="margin-bottom:14px">'
    +'<div class="rp-rmi" style="border-top:4px solid '+color+'">'
    +'<div class="rp-rmh" style="color:#1d4ed8">⚡ 단기</div>'
    +(d.roadmap_short||['단기1','단기2','단기3','단기4']).map(function(t){return '<div class="rp-rmtk">'+t+'</div>';}).join('')
    +'</div>'
    +'<div class="rp-rmi" style="border-top:4px solid #16a34a">'
    +'<div class="rp-rmh" style="color:#15803d">📈 중기</div>'
    +(d.roadmap_mid||['중기1','중기2','중기3','중기4']).map(function(t){return '<div class="rp-rmtk">'+t+'</div>';}).join('')
    +'</div>'
    +'<div class="rp-rmi" style="border-top:4px solid #7c3aed">'
    +'<div class="rp-rmh" style="color:#6d28d9">🌟 장기</div>'
    +(d.roadmap_long||['장기1','장기2','장기3','장기4']).map(function(t){return '<div class="rp-rmtk">'+t+'</div>';}).join('')
    +'</div>'
    +'</div>'
    +rpFB(d.fb_roadmap||[
      '로드맵 실행 우선순위: 자금 조달 → 인증 취득 → 설비 투자 → 채널 확대 순으로 진행하여 성과 가시성을 극대화할 것',
      '각 단계별 KPI를 사전 설정하고 분기별 점검을 통해 계획 대비 실행률을 체계적으로 관리해야 함'
    ])
  );

  var p7 = rpPage('🔒','컨설턴트 실질 조언','내부 전용 — 대외비', '#d97706',
    '<div class="rp-cons">'
    +'<h3>🔒 컨설턴트 전용 자료 — 대외비 (기업 전달 금지)</h3>'
    +'<div class="rp-2col" style="gap:14px">'
    +'<div style="display:flex;flex-direction:column;gap:10px">'
    +'<div class="rp-inn"><div class="rp-innt">🚨 시급 해결 이슈 TOP 3</div>'
    +rpLst(d.consultant_issues||[
      '운전자본 부족으로 인한 매출 공백 발생 가능성 — 정책자금 신청을 최우선으로 진행하고 2개월 내 완료해야 함',
      '핵심 인력 1인 의존 구조의 취약성 — 백업 인력 육성 또는 아웃소싱 체계 구축이 즉시 필요한 상황임',
      '원재료 조달 단일화로 인한 공급망 리스크 — 대체 공급처 2곳 이상 사전 확보하여 리스크를 분산해야 함'
    ], '#d97706')+'</div>'
    +'<div class="rp-inn"><div class="rp-innt">💰 정책자금 신청 전략</div>'
    +rpLst(d.consultant_funds||[
      '1순위 중진공 소공인 특화자금(1억) 즉시 신청 — 서류 간소화로 빠른 승인 가능, 최우선 추진',
      '기보 기술보증(3억) 특허 우대 조건 활용 — 현재 보유 특허 1건으로 보증료 0.5% 우대 적용 가능',
      '소진공 성장촉진자금(1억) 병행 신청 — 창업 3년 이내 요건 충족 시 추가 1억 조달 가능',
      '벤처인증 취득 후 신보 특례보증(2억) 추가 신청으로 총 7억 조달 시나리오 수립 권고'
    ], '#d97706')+'</div>'
    +'</div>'
    +'<div style="display:flex;flex-direction:column;gap:10px">'
    +'<div class="rp-inn"><div class="rp-innt">📜 인증 취득 전략 + 가점추천</div>'
    +rpLst(d.consultant_certs||[
      '벤처인증 우선 취득 — 기술평가 방식 활용(현장 심사 불요), 기존 특허·매출 기준 즉시 신청 가능',
      '이노비즈 인증은 벤처인증 취득 후 1년 내 추진 — 기술 경쟁력 지표 사전 정비 필요',
      '기업부설연구소는 이노비즈 취득과 병행하여 세액공제 효과 극대화 전략으로 추진 권고'
    ], '#d97706')
    +certs.slice(0,2).map(function(c){return '<div class="rp-cert" style="background:white;border:1px solid #fcd34d;margin-top:5px"><div class="rp-certb"><div class="rp-certn">'+c.name+'</div><div class="rp-certd">'+c.effect+'</div></div><div class="rp-certa"><div class="rp-certv" style="color:#d97706">'+c.amount+'</div><div class="rp-certp">'+c.period+'</div></div></div>';}).join('')
    +'</div>'
    +'<div class="rp-g2" style="gap:8px">'
    +'<div class="rp-inn" style="margin-bottom:0"><div class="rp-innt">📈 마케팅 개선</div>'+rpLst(d.consultant_marketing||['SNS 채널 다각화 및 인플루언서 협업 우선 추진','쿠팡 입점 후 스마트스토어 연동으로 온라인 매출 확대'], '#d97706')+'</div>'
    +'<div class="rp-inn" style="margin-bottom:0"><div class="rp-innt">💳 신용 개선</div>'+rpLst(d.consultant_credit||['부가세 신고 누락 없이 성실 신고로 KCB 점수 유지','현재 3등급 신용 유지 시 정책자금 조달 조건 충분'], '#d97706')+'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
  );

  return tplStyle(color, 'portrait') + '<div class="rp-wrap">' + cover + p1 + p2 + p3 + p4 + p5 + p6 + p7 + '</div>';
}


// ===========================
// ★ 상세 재무진단 (표지+3P)
// ===========================
function buildFinanceHTML(d, cData, rev, dateStr) {
  var color = '#2563eb';
  var exp   = calcExp(cData, rev);
  var cover = buildCoverHTML(cData, {title:'상세 재무진단',reportKind:'상세 재무진단 리포트',vLabel:'리포트',borderColor:color}, rev, dateStr);
  var scores = d.scores||{profit:72,stable:80,growth:88};
  var scD    = d.score_descs||{profit:'매출이익률 양호',stable:'부채비율 안정적',growth:'매출 성장률 최우수'};
  var debtData  = d.debt||[{name:'중진공',ratio:54},{name:'기보',ratio:27},{name:'재단',ratio:19}];
  var dColors   = ['#2563eb','#7c3aed','#06b6d4','#16a34a','#ea580c'];
  var pbars = d.profit_bars||[{label:'매출 성장률(YoY)',value:85,display:'+21%'},{label:'매출이익률',value:62,display:'38%'},{label:'영업이익률',value:44,display:'22%'},{label:'현금흐름 안정성',value:70,display:'양호'}];

  function gauge(val, col, lbl, desc) {
    var da = Math.round((val/100)*126);
    return '<div class="rp-section" style="text-align:center">'
      +'<div style="font-size:14px;font-weight:700;color:'+col+';margin-bottom:8px">'+lbl+'</div>'
      +'<svg viewBox="0 0 100 56" width="95" height="58" style="display:block;margin:0 auto 5px">'
      +'<path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="#e2e8f0" stroke-width="10"/>'
      +'<path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="'+col+'" stroke-width="10" stroke-dasharray="'+da+' '+(126-da)+'" stroke-linecap="round"/>'
      +'<text x="50" y="47" text-anchor="middle" font-size="15" font-weight="700" fill="#1e293b">'+val+'</text>'
      +'</svg>'
      +'<div style="font-size:12px;color:#64748b;font-weight:500">'+desc+'</div>'
      +'</div>';
  }

  var p1 = rpPage(1,'재무 종합 현황','수익성·안정성·성장성',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +rpSec('연도별 매출 추이', color, '<div class="rp-ch" style="height:195px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div>')
    +'<div class="rp-g4">'
    +rpMC('전년 매출',fKRW(rev.y25),'2025년',color)
    +rpMC('금년 예상',fKRW(exp),'연환산',color)
    +rpMC('성장률',(rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'분석중','YoY','#16a34a')
    +rpMC('종합 점수',Math.round((scores.profit+scores.stable+scores.growth)/3)+'점','100점 만점',color)
    +'</div>'
    +'</div>'
    +'<div class="rp-colF">'
    +'<div class="rp-g3">'
    +gauge(scores.profit,color,'수익성',scD.profit)
    +gauge(scores.stable,'#16a34a','안정성',scD.stable)
    +gauge(scores.growth,'#7c3aed','성장성',scD.growth)
    +'</div>'
    +rpSec('종합 재무 진단 요약', color, rpLst([
      '3개 핵심 지표 종합 점수 '+Math.round((scores.profit+scores.stable+scores.growth)/3)+'점 — 업종 평균 대비 우수한 재무 건전성을 유지하고 있음',
      scD.profit+' — 매출 대비 이익 창출 능력이 동업종 평균을 상회하여 수익성 기반이 견고함',
      scD.stable+' — 외부 차입 의존도가 낮고 자체 자본 비율이 안정적으로 유지되고 있어 재무 위험이 낮음',
      scD.growth+' — 전년 대비 성장률이 업계 평균을 크게 상회하여 시장 내 성장 잠재력이 충분히 확인됨'
    ], color))
    +'</div>'
    +'</div>'
  );

  var p2 = rpPage(2,'수익성 및 안정성 분석','부채 구성 · 핵심 재무 지표',color,
    '<div class="rp-3col">'
    +'<div class="rp-3c">'
    +rpSec('수익성 분석', color, pbars.map(function(b){return rpHB(b.label,b.value,b.display,color);}).join(''))
    +rpSec('수익성 상세 분석', color, rpLst([
      '매출이익률이 업종 평균(25~30%)을 상회하여 단위당 수익성이 우수한 제품 구조를 보유하고 있음',
      '영업이익률이 안정적으로 유지되고 있어 판매관리비 통제 능력이 검증된 것으로 평가할 수 있음'
    ], color))
    +'</div>'
    +'<div class="rp-3c">'
    +rpSec('부채 구성 비율', color,
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">'
      +'<div class="rp-ch" style="width:110px;height:110px;flex-shrink:0;padding:4px;border:none"><canvas id="fp-donut" data-names="'+debtData.map(function(x){return x.name;}).join('|')+'" data-ratios="'+debtData.map(function(x){return x.ratio;}).join(',')+'" style="width:100%;height:100%"></canvas></div>'
      +'<div class="rp-dleg">'+debtData.map(function(dd,i){return '<div class="rp-dli"><div class="rp-ddt" style="background:'+dColors[i]+'"></div><span style="flex:1">'+dd.name+'</span><span style="font-weight:700">'+dd.ratio+'%</span></div>';}).join('')+'</div>'
      +'</div>'
    )
    +rpSec('부채 구조 분석', color, rpLst([
      '정책자금 비중이 높아 금리 부담이 낮고 장기 상환 구조로 안정적인 재무 구조를 유지하고 있음',
      '단기 차입금 비중이 낮아 만기 도래에 따른 유동성 위기 가능성이 매우 낮은 수준임'
    ], color))
    +'</div>'
    +'<div class="rp-3c">'
    +rpSec('안정성 핵심 지표', color,
      (d.stable_metrics||[{label:'부채비율',value:'낮음',desc:'전액 정책자금'},{label:'KCB 신용',value:'710점',desc:'3등급'},{label:'NICE 신용',value:'740점',desc:'3등급'},{label:'연체·체납',value:'없음',desc:'리스크 최저'}]).map(function(m){
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f1f5f9">'
          +'<span style="font-size:13px;color:#64748b">'+m.label+'</span>'
          +'<div style="text-align:right"><div style="font-size:15px;font-weight:700;color:'+color+'">'+m.value+'</div><div style="font-size:12px;color:#94a3b8">'+m.desc+'</div></div>'
          +'</div>';
      }).join('')
    )
    +rpSec('신용 개선 방향', color, rpLst([
      '현재 신용 3등급 유지 — 정책자금 신청 기준(3등급 이상) 충족 상태로 즉시 신청 가능한 조건임',
      '부가세·소득세 성실 신고 유지로 국세 체납 이력 발생을 원천 차단해야 함'
    ], color))
    +'</div>'
    +'</div>'
  );

  var p3 = rpPage(3,'성장성 분석 및 재무 개선 방향','목표 · 3개년 액션플랜',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +rpSec('성장성 분석', '#7c3aed', rpLst(d.growth_items||[
      '매출 성장세가 업종 평균을 크게 상회하며 시장 내 입지를 빠르게 확대하고 있어 성장 가속화 국면임',
      '신규 고객 유입율이 높아 시장 침투(penetration) 단계에서 확산(expansion) 단계로의 전환이 가시화됨',
      '핵심 제품 기술력을 기반으로 신제품 개발 및 라인업 확장 가능성이 충분하여 추가 성장 동력 확보 가능',
      '정책자금 조달 시 생산 설비 투자로 원가율 개선과 매출 성장이 동시에 가속화될 것으로 예상됨',
      '채널 다각화(쿠팡·B2B·자사몰)를 실현하면 현재 대비 2년 내 매출 2배 이상 달성이 현실적인 목표임'
    ], '#7c3aed'))
    +rpSec('3개년 매출 목표', '#7c3aed', '<div class="rp-ch" style="height:120px"><canvas id="fp-growth-chart" style="width:100%;height:100%"></canvas></div>')
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('재무 개선 우선순위 액션플랜', color,
      '<div class="rp-rm3">'
      +'<div class="rp-rmi" style="border-top:3px solid #ef4444"><div class="rp-rmh" style="color:#dc2626;font-size:13px">🔴 즉시 (1개월)</div><div style="font-size:13px;color:#64748b;line-height:1.65">'+(d.action_urgent||'월별 손익계산서 작성 체계 구축, 현금흐름표 정기 관리 시작, 정책자금 신청서류 목록 작성')+'</div></div>'
      +'<div class="rp-rmi" style="border-top:3px solid #f97316"><div class="rp-rmh" style="color:#ea580c;font-size:13px">🟠 단기 (3개월)</div><div style="font-size:13px;color:#64748b;line-height:1.65">'+(d.action_short||'정책자금 1~2개 기관 동시 신청, 벤처인증 추진 착수, 회계 ERP 시스템 도입 검토')+'</div></div>'
      +'<div class="rp-rmi" style="border-top:3px solid '+color+'"><div class="rp-rmh" style="color:#1d4ed8;font-size:13px">🔵 중기 (1년)</div><div style="font-size:13px;color:#64748b;line-height:1.65">'+(d.action_mid||'조달 자금으로 생산 설비 확충 및 원가율 개선 실현, 제2 매출 채널 확보, 이노비즈 인증 취득')+'</div></div>'
      +'</div>'
    )
    +'</div>'
    +'</div>'
  );

  return tplStyle(color, 'portrait') + '<div class="rp-wrap">' + cover + p1 + p2 + p3 + '</div>';
}

// ===========================
// ★ 상권분석 (표지+2P)
// ===========================
function buildTradeHTML(d, cData, rev, dateStr) {
  var color  = '#0d9488';
  var cover  = buildCoverHTML(cData, {title:'상권분석 리포트',reportKind:'빅데이터 상권분석',vLabel:'리포트',borderColor:color}, rev, dateStr);
  var radar  = (d.radar||[82,75,68,72,80]).join(',');
  var sim    = d.sim||{s0:9167,s1:12500,s2:16667,s3:25000};
  var target = d.target||{age:'30~40대',household:'1~2인',channel:'온라인',cycle:'월 2~3회'};

  var p1 = rpPage(1,'상권 현황 분석','핵심 입지 지표 · 경쟁 분석',color,
    '<div class="rp-3col">'
    +'<div class="rp-3c">'
    +'<div class="rp-g3" style="flex-shrink:0;margin-bottom:10px">'
    +rpMC('유동인구 (일평균)',d.traffic||'2,400명','일평균 유동량',color)
    +rpMC('반경1km 경쟁기업',(d.competitors||7)+'개','직접 경쟁',parseInt(d.competitors||7)>5?'#f97316':'#16a34a')
    +rpMC('입지 경쟁력 등급',d.grade||'B+','상위 30%',color)
    +'</div>'
    +rpSec('상권 특성 분석', color, rpLst(d.features||[
      '주변 1km 내 핵심 소비층인 30~40대 1~2인 가구의 밀집도가 높아 타겟 고객 접근성이 우수한 입지임',
      '대중교통 접근성(지하철·버스)이 양호하여 광역 고객 유입 가능성이 높고 주중·주말 유동량이 고른 편임',
      '상권 성장 단계가 성숙기에 진입하여 안정적인 수요는 확보되어 있으나 신규 경쟁자 진입 리스크도 존재함',
      '반경 내 유사 업종 경쟁기업 '+( d.comp_direct||7)+'개 중 강성 경쟁기업는 '+(d.comp_strong||3)+'개로 차별화 전략이 필수적임'
    ], color))
    +'</div>'
    +'<div class="rp-3c">'
    +rpSec('입지 경쟁력 레이더', color, '<div class="rp-ch" style="height:215px"><canvas id="tp-radar" data-scores="'+radar+'" style="width:100%;height:100%"></canvas></div>')
    +'</div>'
    +'<div class="rp-3c">'
    +rpSec('경쟁 현황 요약', color,
      '<div style="display:flex;justify-content:space-around;text-align:center;padding:10px 0;margin-bottom:10px">'
      +'<div><div style="font-size:26px;font-weight:700;color:'+color+'">'+(d.comp_direct||7)+'</div><div style="font-size:13px;color:#64748b;margin-top:3px">직접 경쟁</div></div>'
      +'<div><div style="font-size:26px;font-weight:700;color:#f97316">'+(d.comp_strong||3)+'</div><div style="font-size:13px;color:#64748b;margin-top:3px">강성 경쟁</div></div>'
      +'<div><div style="font-size:26px;font-weight:700;color:#16a34a">'+(d.diff_potential||'高')+'</div><div style="font-size:13px;color:#64748b;margin-top:3px">차별화 여지</div></div>'
      +'</div>'
    )
    +rpSec('운영 전략 포인트', color, rpLst(d.strategy||[
      '경쟁사 대비 차별화된 제품·서비스 강점을 명확히 하여 가격 경쟁이 아닌 가치 경쟁으로 포지셔닝해야 함',
      '네이버 스마트플레이스 최적화 및 SNS 위치 태그 활성화로 주변 고객 자연 유입을 극대화해야 함',
      '고객 재방문율 향상을 위한 포인트 적립, 정기 구독, 단골 혜택 프로그램을 조기에 도입해야 함',
      '피크타임(점심·저녁·주말) 운영 최적화와 비피크타임 프로모션으로 시간대별 매출을 균등화해야 함',
      '배달·픽업 서비스 도입으로 반경 3km 이내 비방문 고객까지 커버하여 잠재 시장을 확대해야 함'
    ], color))
    +'</div>'
    +'</div>'
  );

  var p2 = rpPage(2,'타겟 고객 및 매출 예측','고객 프로파일 · 시뮬레이션',color,
    '<div class="rp-2col">'
    +'<div class="rp-col40">'
    +rpSec('타겟 고객 프로파일', color,
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px">'
      +[['주 연령대',target.age],['가구 유형',target.household],['구매 채널',target.channel],['구매 주기',target.cycle]].map(function(pair){
        return '<div style="background:white;border-radius:8px;padding:11px 9px;border:1px solid #e2e8f0;text-align:center"><div style="font-size:12px;color:#64748b;margin-bottom:4px">'+pair[0]+'</div><div style="font-size:16px;font-weight:700;color:'+color+'">'+pair[1]+'</div></div>';
      }).join('')+'</div>'
    )
    +rpSec('고객 전략', color, rpLst([
      target.age+' 타겟층의 소비 패턴을 분석하여 선호하는 가격대·패키지·홍보 메시지를 최적화해야 함',
      target.household+' 가구 맞춤 소용량·편의성 제품 구성으로 구매 장벽을 낮추고 재구매율을 높여야 함',
      target.channel+' 채널 최적화를 통해 소비자 접점을 다각화하고 구매 전환율을 체계적으로 관리해야 함'
    ], color))
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('매출 잠재력 시뮬레이션 (만원/월)', color,
      '<div class="rp-ch" style="height:205px"><canvas id="tp-linechart" data-s0="'+sim.s0+'" data-s1="'+sim.s1+'" data-s2="'+sim.s2+'" data-s3="'+sim.s3+'" style="width:100%;height:100%"></canvas></div>'
    )
    +'<div class="rp-g4" style="margin-top:0">'
    +rpMC('현재',Math.round(sim.s0/100)*100+'만','/월',color)
    +rpMC('6개월',Math.round(sim.s1/100)*100+'만','+'+Math.round((sim.s1-sim.s0)/sim.s0*100)+'%',color)
    +rpMC('1년',Math.round(sim.s2/100)*100+'만','+'+Math.round((sim.s2-sim.s0)/sim.s0*100)+'%',color)
    +rpMC('2년',Math.round(sim.s3/100)*100+'만','+'+Math.round((sim.s3-sim.s0)/sim.s0*100)+'%',color)
    +'</div>'
    +'<div style="font-size:12px;color:#64748b;padding:9px;background:#f0fdfa;border-radius:7px;margin-top:6px">※ 업종 평균 성장률 달성 가정 시 추정값 (전제: 운영 전략 이행, 계절성 반영, 경쟁 환경 유사 수준 유지)</div>'
    +'</div>'
    +'</div>'
  );

  return tplStyle(color, 'portrait') + '<div class="rp-wrap">' + cover + p1 + p2 + '</div>';
}

// ===========================
// ★ 마케팅제안 (표지+2P)
// ===========================
function buildMarketingHTML(d, cData, rev, dateStr) {
  var color    = '#db2777';
  var cover    = buildCoverHTML(cData, {title:'마케팅 제안서',reportKind:'맞춤형 마케팅 제안서',vLabel:'제안서',borderColor:color}, rev, dateStr);
  var channels = d.channels||[{name:'SNS (인스타·유튜브 쇼츠)',score:88},{name:'네이버 검색·블로그 광고',score:75},{name:'인플루언서·리뷰 마케팅',score:72},{name:'쿠팡 상품 광고',score:65}];
  var budget   = d.budget||[{name:'SNS 광고',ratio:38},{name:'검색광고',ratio:25},{name:'콘텐츠제작',ratio:22},{name:'기타',ratio:15}];
  var bColors  = ['#db2777','#9d174d','#f4c0d1','#fdf2f8'];
  var kpi      = d.kpi||[{label:'SNS 팔로워',value:'+3,000',period:'3개월'},{label:'월 매출 증가',value:'+30%',period:'6개월'},{label:'재구매율',value:'40%',period:'목표'},{label:'리뷰 누적',value:'500건',period:'6개월'}];
  var roadmap  = d.roadmap||[{period:'1월',task:'SNS 채널 개설·브랜딩 확립',highlight:false},{period:'2월',task:'인플루언서·블로거 협업 시작',highlight:false},{period:'3월',task:'바이럴 캠페인 집행',highlight:false},{period:'4~5월',task:'성과 분석·채널 최적화',highlight:true},{period:'6월',task:'정기구독 서비스 론칭',highlight:false},{period:'7월~',task:'오프라인·B2B 진출 시작',highlight:false}];

  var p1 = rpPage(1,'채널별 마케팅 전략 및 예산','채널 효과 분석 · 예산 배분',color,
    '<div class="rp-3col">'
    +'<div class="rp-3c">'
    +rpSec('채널별 예상 효과 (점수/100)', color, channels.map(function(c,i){return rpHB(c.name,c.score,c.score+'점',i===0?color:i===1?'#be185d':'#9d174d');}).join(''))
    +'</div>'
    +'<div class="rp-3c">'
    +rpSec('핵심 마케팅 전략', color, rpLst(d.strategies||[
      '인스타그램·유튜브 쇼츠 중심의 콘텐츠 마케팅으로 브랜드 인지도를 비용 효율적으로 집중 확산함',
      '식품 전문 인플루언서(팔로워 1~10만 규모)와의 협업으로 신뢰도 높은 바이럴 마케팅을 실행함',
      '리뷰 이벤트 및 정기구독 할인 프로그램으로 재구매율을 40% 이상으로 높이는 것을 목표로 함',
      '네이버 스마트플레이스 최적화 및 블로그 협업으로 로컬 브랜드 노출을 극대화해야 함',
      '쿠팡·스마트스토어 상세페이지 A/B테스트로 구매 전환율을 체계적으로 최적화해야 함'
    ], color))
    +'</div>'
    +'<div class="rp-3c">'
    +rpSec('월 예산 배분 ('+(d.budget_total||'700만원/월')+')', color,
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">'
      +'<div class="rp-ch" style="width:115px;height:115px;flex-shrink:0;padding:4px;border:none"><canvas id="mp-donut" data-names="'+budget.map(function(b){return b.name;}).join('|')+'" data-ratios="'+budget.map(function(b){return b.ratio;}).join(',')+'" style="width:100%;height:100%"></canvas></div>'
      +'<div class="rp-dleg">'+budget.map(function(b,i){return '<div class="rp-dli"><div class="rp-ddt" style="background:'+bColors[i]+'"></div><span style="flex:1">'+b.name+'</span><span style="font-weight:700">'+b.ratio+'%</span></div>';}).join('')+'</div>'
      +'</div>'
    )
    +rpSec('예산 운영 원칙', color, rpLst(['초기 3개월: 디지털 채널 집중 투자로 브랜드 인지도 빠르게 구축','4개월차~: 성과 데이터 기반 채널별 비중 재조정 및 최적화','월별 ROI(광고 수익률) 분석 후 성과 낮은 채널 예산 즉시 이동'], color))
    +'</div>'
    +'</div>'
  );

  var p2 = rpPage(2,'KPI 목표 및 월별 실행 로드맵','성과 지표 · 실행 타임라인',color,
    '<div class="rp-g4" style="flex-shrink:0;margin-bottom:14px">'+kpi.map(function(k){return rpMC(k.label,k.value,k.period,color);}).join('')+'</div>'
    +rpSec('월별 실행 로드맵', color,
      '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin-bottom:14px">'
      +roadmap.map(function(r){
        return '<div style="border-radius:8px;background:'+(r.highlight?'#f4c0d1':'#fdf2f8')+';border:1px solid '+(r.highlight?color:'#f4c0d1')+';padding:11px 9px">'
          +'<div style="font-size:12px;font-weight:700;color:'+(r.highlight?'#9d174d':color)+';margin-bottom:6px">'+r.period+'</div>'
          +'<div style="font-size:13px;color:#64748b;line-height:1.5;font-weight:400">'+r.task+'</div>'
          +'</div>';
      }).join('')
      +'</div>'
      +'<div class="rp-g3">'
      +'<div style="background:#fdf2f8;border-radius:8px;padding:12px;border:1px solid #fbcfe8"><div style="font-size:13px;font-weight:700;color:#9d174d;margin-bottom:7px">📊 1~3개월 핵심 지표</div><div style="font-size:13px;color:#64748b;line-height:1.7">SNS 팔로워 +3,000명 달성<br>리뷰 100건 이상 확보<br>브랜드 검색량 200% 증가</div></div>'
      +'<div style="background:#fdf2f8;border-radius:8px;padding:12px;border:1px solid #fbcfe8"><div style="font-size:13px;font-weight:700;color:#9d174d;margin-bottom:7px">📈 4~6개월 핵심 지표</div><div style="font-size:13px;color:#64748b;line-height:1.7">월 매출 +30% 달성<br>재구매율 40% 이상 확보<br>정기구독 고객 200명 확보</div></div>'
      +'<div style="background:#fdf2f8;border-radius:8px;padding:12px;border:1px solid #fbcfe8"><div style="font-size:13px;font-weight:700;color:#9d174d;margin-bottom:7px">🎯 7개월~ 핵심 지표</div><div style="font-size:13px;color:#64748b;line-height:1.7">B2B 거래처 3건 이상 확보<br>리뷰 500건 누적 달성<br>오프라인 판매 채널 진출</div></div>'
      +'</div>'
    )
  );

  return tplStyle(color, 'portrait') + '<div class="rp-wrap">' + cover + p1 + p2 + '</div>';
}

// ===========================
// ★ 정책자금매칭 (표지+3P)
// ===========================
function buildFundHTML(d, cData, rev, dateStr) {
  var color  = '#ea580c';
  var cover  = buildCoverHTML(cData, {title:'정책자금매칭',reportKind:'정책자금 매칭 리포트',vLabel:'리포트',borderColor:color}, rev, dateStr);
  var checks = d.checks||[{text:'중소기업 해당 여부 확인',status:'pass'},{text:'국세·지방세 체납 없음',status:'pass'},{text:'금융 연체 이력 없음',status:'pass'},{text:'사업자 등록 유효',status:'pass'},{text:'업력 2년 이상 충족',status:'cond'},{text:'벤처·이노비즈 인증 보유',status:'fail'}];
  var score  = d.score||78;
  var gda    = Math.round((score/100)*151);
  var funds  = d.funds||[{rank:1,name:'중진공 소공인 특화자금',limit:'1억',tags:['금리 2.5%','즉시 신청 가능','제조업 우대']},{rank:2,name:'기보 기술보증 (특허 우대)',limit:'3억',tags:['보증료 0.5%','특허 1건 우대','90% 보증']},{rank:3,name:'소진공 성장촉진자금',limit:'1억',tags:['금리 3.0%','창업 3년 이내','온라인 신청']},{rank:4,name:'지역신보 소액보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤형','빠른 처리']},{rank:5,name:'신보 창업기업 특례보증',limit:'2억',tags:['보증료 0.5%','벤처인증 조건부','95% 보증']}];
  var rColors= [color,'#f97316','#fb923c','#94a3b8','#94a3b8'];
  var comp   = d.comparison||[{org:'중진공',limit:'1억',rate:'2.5%',period:'5년',diff:'easy'},{org:'기보',limit:'3억',rate:'0.5%',period:'7년',diff:'mid'},{org:'소진공',limit:'1억',rate:'3.0%',period:'5년',diff:'easy'},{org:'지역신보',limit:'5천만',rate:'0.8%',period:'3년',diff:'easy'}];
  var dMap   = {easy:{bg:'#dcfce7',tc:'#166534',l:'쉬움'},mid:{bg:'#fef9c3',tc:'#854d0e',l:'보통'},hard:{bg:'#fee2e2',tc:'#991b1b',l:'어려움'}};
  var cReady = d.checklist_ready||['사업자등록증 사본','부가세 신고서 (최근 2년)','국세납부증명서','신용정보 동의서'];
  var cNeed  = d.checklist_need||['사업계획서 (기보 필수)','벤처인증서 (취득 후 추가)'];

  function chkS(s){return s==='pass'?{bg:'#dcfce7',tc:'#16a34a',ic:'✓',bbc:'#dcfce7',btc:'#166534',bl:'통과'}:s==='cond'?{bg:'#fef9c3',tc:'#ca8a04',ic:'!',bbc:'#fef9c3',btc:'#854d0e',bl:'조건부'}:{bg:'#fee2e2',tc:'#dc2626',ic:'✗',bbc:'#fee2e2',btc:'#991b1b',bl:'미보유'};}

  var p1 = rpPage(1,'기업 자격요건 분석','신청 가능 여부 종합 체크',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +rpSec('기본 자격 체크리스트', color,
      checks.map(function(c){var s=chkS(c.status);return '<div class="rp-chk"><div class="rp-chi" style="background:'+s.bg+';color:'+s.tc+'">'+s.ic+'</div><div class="rp-cht">'+c.text+'</div><span class="rp-chb" style="background:'+s.bbc+';color:'+s.btc+'">'+s.bl+'</span></div>';}).join('')
    )
    +'</div>'
    +'<div class="rp-colF">'
    +'<div class="rp-section" style="text-align:center;margin-bottom:10px">'
    +'<div style="font-size:14px;font-weight:700;color:'+color+';margin-bottom:8px">신청 가능성 종합 점수</div>'
    +'<svg viewBox="0 0 130 72" width="130" height="72" style="display:block;margin:6px auto">'
    +'<path d="M14,62 A52,52 0 0,1 116,62" fill="none" stroke="#e2e8f0" stroke-width="16"/>'
    +'<path d="M14,62 A52,52 0 0,1 116,62" fill="none" stroke="'+color+'" stroke-width="16" stroke-dasharray="'+gda+' '+(151-gda)+'" stroke-linecap="round"/>'
    +'<text x="65" y="57" text-anchor="middle" font-size="24" font-weight="700" fill="#1e293b">'+score+'</text>'
    +'</svg>'
    +'<div style="font-size:16px;font-weight:700;color:'+color+'">'+(d.score_desc||'신청 가능')+'</div>'
    +'<div style="font-size:13px;color:#64748b;margin-top:4px">'+(d.match_count||5)+'개 기관 매칭 완료</div>'
    +'</div>'
    +rpSec('자격 분석 종합', color, rpLst(d.score_items||[
      '기본 자격요건 4개 충족 — 중진공·기보·소진공 등 주요 정책자금 즉시 신청 가능한 상태임',
      '벤처·이노비즈 인증 취득 시 추가 우대 한도 최대 3억원 이상 추가 확보 가능함',
      '현재 조건에서 신청 가능한 자금 총액: 중진공+기보+소진공 합계 최대 약 5억원 수준임'
    ], color))
    +'</div>'
    +'</div>'
  );

  var p2 = rpPage(2,'추천 정책자금 TOP 5','한도 · 금리 · 특징 · 신청 전략',color,
    '<div class="rp-2col">'
    +'<div class="rp-col55 rp-col50">'
    +funds.map(function(f,i){
      return '<div class="rp-rank" style="'+(i<3?'border-left:4px solid '+rColors[i]+';':'')+'">'
        +'<div class="rp-rh"><div class="rp-rn" style="background:'+rColors[i]+'">'+f.rank+'</div>'
        +'<span class="rp-rnm">'+f.name+'</span>'
        +'<span class="rp-rlm" style="color:'+rColors[i]+'">'+f.limit+'</span></div>'
        +'<div class="rp-rtgs">'+f.tags.map(function(t,j){return '<span class="rp-rtg" style="background:'+(j===0?'#fff7ed':'#f1f5f9')+';color:'+(j===0?'#c2410c':'#475569')+'">'+t+'</span>';}).join('')+'</div>'
        +'</div>';
    }).join('')
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('자금 신청 우선순위 전략', color, rpLst([
      '1순위: 중진공 소공인 특화자금(1억) — 신청 장벽이 가장 낮고 즉시 실행 가능한 최적 선택임',
      '2순위: 기보 기술보증(3억) — 특허 1건 보유로 우대 적용 가능, 한도가 가장 크고 효과도 큼',
      '3순위: 소진공 성장촉진자금(1억) — 창업 3년 이내 요건 충족 시 추가 신청으로 조달 극대화 가능',
      '4순위: 벤처인증 취득 후 신보 특례보증(2억) 추가 신청 — 총 7억+ 조달 시나리오 완성',
      '총 신청 가능 예상 한도: 기본 3억 ~ 최대 7억+ (인증 취득 및 병행 신청 전략 실행 시)'
    ], color))
    +'</div>'
    +'</div>'
  );

  var p3 = rpPage(3,'기관별 비교 및 신청 전략','비교표 · 서류 체크리스트',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +rpSec('기관별 조건 비교표', color,
      '<table class="rp-cmpt"><thead><tr style="background:#fff7ed">'
      +'<th style="color:'+color+'">기관</th><th style="color:'+color+'">한도</th><th style="color:'+color+'">금리/보증료</th><th style="color:'+color+'">기간</th><th style="color:'+color+'">난이도</th>'
      +'</tr></thead><tbody>'
      +comp.map(function(c,i){var dm=dMap[c.diff]||dMap.easy;return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'><td style="font-weight:700">'+c.org+'</td><td>'+c.limit+'</td><td style="color:#16a34a;font-weight:700">'+c.rate+'</td><td>'+c.period+'</td><td><span style="background:'+dm.bg+';color:'+dm.tc+';padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700">'+dm.l+'</span></td></tr>';}).join('')
      +'</tbody></table>'
    )
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('신청 준비 서류 체크리스트', color,
      '<div style="margin-bottom:8px;font-size:13px;font-weight:700;color:#15803d">✅ 준비 완료 서류</div>'
      +cReady.map(function(t){return '<div class="rp-chk"><div class="rp-chi" style="background:#dcfce7;color:#16a34a">✓</div><div class="rp-cht">'+t+'</div></div>';}).join('')
      +'<div style="margin:12px 0 8px;font-size:13px;font-weight:700;color:#dc2626">❌ 추가 준비 필요 서류</div>'
      +cNeed.map(function(t){return '<div class="rp-chk"><div class="rp-chi" style="background:#fee2e2;color:#dc2626">✗</div><div class="rp-cht">'+t+'</div></div>';}).join('')
    )
    +'</div>'
    +'</div>'
  );

  return tplStyle(color, 'portrait') + '<div class="rp-wrap">' + cover + p1 + p2 + p3 + '</div>';
}

// ===========================
// ★ AI 사업계획서 (표지+10P)
// ===========================
function buildBizPlanHTML(d, cData, rev, dateStr) {
  var color = '#16a34a';
  var exp   = calcExp(cData, rev);
  var cover = buildCoverHTML(cData, {title:'AI 사업계획서',reportKind:'AI 맞춤형 사업계획서',vLabel:'완성본',borderColor:color}, rev, dateStr);

  var swot = d.s2_swot||{strength:['창업 1년 만에 13억 8천만원 폭발적 매출 달성 — 시장성 검증 완료'],weakness:['상시근로자 4명의 소규모 인력으로 사업 확장 속도에 제약이 있음'],opportunity:['HMR 시장 연 18% 성장 — 돈육·육수 세그먼트 최우수 성장 구간'],threat:['대형 식품기업의 후발 진입 가능성 상시 존재 — 특허 방어 필수']};
  var compRows = d.s4_competitor||[{item:'제품 경쟁력',self:'★★★★★',a:'★★★★',b:'★★★'},{item:'기술력(특허)',self:'★★★★★',a:'★★★',b:'★★★'},{item:'가격 경쟁력',self:'★★★★',a:'★★★★★',b:'★★★★'},{item:'유통망',self:'★★★',a:'★★★★★',b:'★★★★'},{item:'성장성',self:'★★★★★',a:'★★★',b:'★★★'}];
  var diffs = d.s5_items||[{title:'기술 차별화',text:'돈육 사골 농축 압축 기술 특허 보유 — 경쟁사의 동일 제품 제조를 원천 차단하는 진입 장벽 구축',color:'#16a34a'},{title:'제품 차별화',text:'1회 분량 개별 포장으로 위생·편의성·보관성을 동시에 충족 — 소비자 불편을 해소한 혁신 제품',color:'#2563eb'},{title:'시장 포지셔닝',text:'HMR 내 돈육 특화 세그먼트 선점 — 틈새 독점 포지션 구축으로 경쟁 압력을 원천 최소화',color:'#7c3aed'},{title:'성장 증명력',text:'창업 1년 만에 11억 달성 — 투자·자금 심사 기관이 가장 신뢰하는 시장성 검증 완료 상태',color:'#ea580c'}];
  var bgMap = {'#16a34a':'#f0fdf4','#2563eb':'#eff6ff','#7c3aed':'#fdf4ff','#ea580c':'#fff7ed'};
  var bdMap = {'#16a34a':'#86efac','#2563eb':'#93c5fd','#7c3aed':'#d8b4fe','#ea580c':'#fdba74'};
  var bpCerts = d.s6_certs||[{name:'벤처기업 인증',effect:'중진공·기보 우대금리 적용 — 추가 자금 한도 최대 2억원 확보 가능',amount:'+2억',period:'6개월 내'},{name:'이노비즈 인증',effect:'기술혁신형 중소기업 인증 — 중진공 기술개발자금 신청 자격 부여',amount:'+3억',period:'1년 내'},{name:'기업부설연구소',effect:'R&D 세액공제 25% 적용 및 기보 기술보증 우대 적용 동시 가능',amount:'+1.5억',period:'세액공제 병행'},{name:'HACCP 인증',effect:'대형마트·단체급식 납품 채널 확대 — 매출 직접 연결 효과 확인',amount:'채널↑',period:'매출 확대'}];
  var bpIcons = ['🏆','📜','🔬','✅'];
  var bpBgs   = ['#f0fdf4','#eff6ff','#fdf4ff','#fff7ed'];
  var totalBp = bpCerts.reduce(function(s,c){var n=parseFloat(c.amount.replace(/[^0-9.]/g,'')); return s+(isNaN(n)?0:n);}, 0);
  var nf = cData.needFund>0 ? fKRW(cData.needFund) : '4억원';
  var fundRows = d.s7_rows||[{item:'원재료 구입',amount:'1억 5천만원',ratio:'37.5%',purpose:'돈육 사골 등 핵심 원재료 선매입 및 안정적 재고 확보'},{item:'생산 설비 투자',amount:'1억원',ratio:'25%',purpose:'반자동 생산설비 도입 — 원가율 20% 절감 목표'},{item:'마케팅·채널 확대',amount:'7천만원',ratio:'17.5%',purpose:'SNS 광고·쿠팡 입점·브랜드 마케팅 집행'},{item:'운전자금',amount:'8천만원',ratio:'20%',purpose:'인건비·공과금·운영 고정비 등'}];
  var kpi9 = d.s9_kpi||{y1:'18억',y2:'24억',ch:'5개↑',emp:'11명'};
  var rmYears = d.s9_roadmap||[{year:'2026',tasks:['정책자금 4억 조달 완료','생산 설비 확충 가동','쿠팡·스마트스토어 입점']},{year:'2027',tasks:['벤처인증 취득 완료','B2B 납품 채널 3곳','매출 24억 달성']},{year:'2028',tasks:['이노비즈 취득','매출 35억 달성','자동화 생산 완성']},{year:'2029~',tasks:['해외 수출 추진','기업부설연구소','매출 100억 목표']}];
  var rmColors = ['#16a34a','#2563eb','#7c3aed','#ea580c'];
  var conclusion = d.s10_conclusion||cData.name+'는 창업 이후 단기간에 폭발적인 매출 성장을 달성하며 HMR 시장의 핵심 플레이어로 부상하고 있음. 돈육 사골 농축 압축 기술 특허와 1회 분량 개별 포장이라는 독창적 제품력은 경쟁사가 쉽게 모방할 수 없는 진입 장벽을 구축하고 있음. 정책자금 4억원 조달 시 생산 설비 확충과 마케팅 채널 다각화를 통해 2년 내 매출 24억 달성이 충분히 가능한 성장 기반을 갖추고 있음. 인증 취득 로드맵을 체계적으로 실행하면 추가 자금 최대 6.5억원 확보와 함께 중장기 매출 100억 목표 달성 가능성이 충분히 있음.';

  var p1 = rpPage(1,'기업현황분석','기업정보 · 핵심 경쟁력',color,
    '<div class="rp-2col">'
    +'<div class="rp-col45">'
    +rpSec('', color,
      '<table class="rp-ovt" style="border-top-color:'+color+'">'
      +'<tr><th style="color:'+color+'">기업명</th><td colspan="3">'+cData.name+'</td></tr>'
      +'<tr><th style="color:'+color+'">대표자</th><td>'+(cData.rep||'-')+'</td><th style="color:'+color+'">업종</th><td>'+(cData.industry||'-')+'</td></tr>'
      +'<tr><th style="color:'+color+'">설립일</th><td>'+(cData.bizDate||'-')+'</td><th style="color:'+color+'">상시근로자</th><td>'+(cData.empCount||'-')+'명</td></tr>'
      +'<tr><th style="color:'+color+'">핵심아이템</th><td colspan="3">'+(cData.coreItem||'-')+'</td></tr>'
      +'<tr><th style="color:'+color+'">전년 매출</th><td>'+fKRW(rev.y25)+'</td><th style="color:'+color+'">금년 예상</th><td>'+fKRW(exp)+'</td></tr>'
      +'</table>'
    )
    +'<div class="rp-g4">'
    +rpMC('업력',cData.bizDate?Math.round((Date.now()-new Date(cData.bizDate))/31536000000)+'년':'2년','고성장 초기',color)
    +rpMC('매출 성장률',(rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'+21%','전년 대비',color)
    +rpMC('신용등급','3등급','KCB 710점','#2563eb')
    +rpMC('필요자금',cData.needFund>0?fKRW(cData.needFund):'4억원','조달 목표','#7c3aed')
    +'</div>'
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('기업 현황 분석', color, rpLst(d.s1_items||[
      '창업 1년 만에 11억 4천만원 달성 → 금년 14억원 예상 — 업종 내 최고 수준의 초고속 성장세를 기록 중임',
      '돈육 사골 농축 압축 기술 특허를 보유하여 경쟁사의 제품 모방 및 시장 진입을 원천 방어하고 있음',
      'HMR 시장 내 돈육 특화 세그먼트에서 독보적인 포지션을 구축하여 빠른 시장 침투를 성공적으로 실현함',
      '소수 정예 4인 팀 운영으로 인당 생산성이 업종 평균을 크게 상회하는 탁월한 운영 효율성을 보여줌',
      '정책자금 4억원 조달 시 생산 설비 확충 및 채널 다각화로 2년 내 매출 2배 이상 성장이 가능한 기반을 보유함'
    ], color))
    +'</div>'
    +'</div>'
  );

  var p2 = rpPage(2,'SWOT 분석','강점·약점·기회·위협 종합 분석',color,
    '<div class="rp-swot" style="flex:1">'
    +'<div class="rp-sws rp-sw" style="flex:1"><div class="rp-swl">💪 S — 강점 (Strength)</div><ul>'+(swot.strength||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +'<div class="rp-sww rp-sw" style="flex:1"><div class="rp-swl">⚠️ W — 약점 (Weakness)</div><ul>'+(swot.weakness||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +'<div class="rp-swo rp-sw" style="flex:1"><div class="rp-swl">🚀 O — 기회 (Opportunity)</div><ul>'+(swot.opportunity||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +'<div class="rp-swt rp-sw" style="flex:1"><div class="rp-swl">🛡️ T — 위협 (Threat)</div><ul>'+(swot.threat||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +'</div>'
  );

  var p3 = rpPage(3,'시장현황','시장 규모 · 트렌드 · 성장성',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +'<div class="rp-g3" style="flex-shrink:0;margin-bottom:10px">'
    +rpMC('HMR 시장','7조원','2022년 기준',color)
    +rpMC('연평균 성장률','18%','육수·국물 세그먼트',color)
    +rpMC('1~2인 가구','61%','핵심 소비층','#7c3aed')
    +'</div>'
    +rpSec('시장 성장 추이', color, '<div class="rp-ch" style="height:185px"><canvas id="bp-market-chart" style="width:100%;height:100%"></canvas></div>')
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('시장 트렌드 분석', color, rpLst(d.s3_items||[
      '1~2인 가구 비율 61%로 증가세 — 간편식 수요가 구조적으로 증가하며 HMR 시장 연 18% 성장 지속',
      '건강·프리미엄 간편식에 대한 소비자 선호도 급상승 — 고가 제품군의 성장이 업계 평균을 크게 상회',
      '쿠팡·마켓컬리 등 온라인 식품 채널 급성장 — 소규모 브랜드의 진입 장벽이 낮아져 성장 기회 확대됨',
      '육수·국물 세그먼트는 HMR 중 가장 빠른 성장 구간 — 대체 불가 필수 식품으로 소비 빈도가 높음',
      '식품 안전·품질 인증(HACCP 등)에 대한 소비자 요구 강화 — 인증 기업이 채널 확보에서 유리한 위치를 점함'
    ], color))
    +'</div>'
    +'</div>'
  );

  var p4 = rpPage(4,'경쟁력분석','경쟁사 비교표 · 시장 포지셔닝',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +rpSec('경쟁력 분석', color, rpLst(d.s4_items||[
      '특허 기술 보유로 동일 제품 제조가 불가능하여 직접적인 가격 경쟁에서 원천 차단됨',
      '1회 개별 포장 스펙으로 경쟁사 제품과 직접 비교가 어려운 독자적 카테고리를 형성하고 있음',
      '창업 초기에 검증된 시장 수요를 보유하여 경쟁사 대비 제품 신뢰도와 재구매율이 높음',
      '초기 시장 선점 효과로 충성 고객 확보 속도가 빨라 경쟁사의 후발 진입을 어렵게 만들고 있음'
    ], color))
    +rpSec('강점 종합', '#7c3aed', rpLst(['기술 특허 + 제품 차별화 + 성장 검증 = 경쟁사가 모방하기 어려운 압도적 경쟁 우위 구조를 보유하고 있음'], '#7c3aed'))
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('경쟁사 비교표', color,
      '<table class="rp-ctb"><thead><tr><th style="text-align:left">비교 항목</th><th>'+cData.name+'</th><th>경쟁사 A</th><th>경쟁사 B</th></tr></thead>'
      +'<tbody>'+compRows.map(function(r,i){return '<tr'+(i%2===0?'':' style="background:#f8fafc"')+'><td>'+r.item+'</td><td>'+r.self+'</td><td>'+r.a+'</td><td>'+r.b+'</td></tr>';}).join('')+'</tbody></table>'
    )
    +'</div>'
    +'</div>'
  );

  var p5 = rpPage(5,'차별점 및 핵심경쟁력','4대 핵심 강점',color,
    '<div class="rp-2col" style="flex:1">'
    +'<div style="display:flex;flex-direction:column;gap:11px">'
    +(Array.isArray(diffs)&&typeof diffs[0]==='object'?diffs:[]).slice(0,2).map(function(it){
      var bg=bgMap[it.color]||'#f0fdf4', bd=bdMap[it.color]||'#86efac';
      return '<div class="rp-diff" style="background:'+bg+';border:1px solid '+bd+';border-left:5px solid '+it.color+';flex:1">'
        +'<div class="rp-dt" style="color:'+it.color+'">🔹 '+it.title+'</div>'
        +'<div class="rp-dd">'+it.text+'</div>'
        +'</div>';
    }).join('')
    +'</div>'
    +'<div style="display:flex;flex-direction:column;gap:11px">'
    +(Array.isArray(diffs)&&typeof diffs[0]==='object'?diffs:[]).slice(2,4).map(function(it){
      var bg=bgMap[it.color]||'#f0fdf4', bd=bdMap[it.color]||'#86efac';
      return '<div class="rp-diff" style="background:'+bg+';border:1px solid '+bd+';border-left:5px solid '+it.color+';flex:1">'
        +'<div class="rp-dt" style="color:'+it.color+'">🔹 '+it.title+'</div>'
        +'<div class="rp-dd">'+it.text+'</div>'
        +'</div>';
    }).join('')
    +'</div>'
    +'</div>'
  );

  var p6 = rpPage(6,'가점추천','인증 취득으로 정책자금 한도 최대화',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +bpCerts.map(function(c,i){return '<div class="rp-cert"><div class="rp-certi" style="background:'+bpBgs[i%bpBgs.length]+'">'+bpIcons[i%bpIcons.length]+'</div><div class="rp-certb"><div class="rp-certn">'+c.name+'</div><div class="rp-certd">'+c.effect+'</div></div><div class="rp-certa"><div class="rp-certv" style="color:'+color+'">'+c.amount+'</div><div class="rp-certp">'+c.period+'</div></div></div>';}).join('')
    +'</div>'
    +'<div class="rp-colF">'
    +'<div style="background:#f0fdf4;border-radius:8px;padding:18px;border:1px solid #86efac;text-align:center;margin-bottom:12px">'
    +'<div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:6px">인증 완료 시 총 추가 조달 가능 한도</div>'
    +'<div style="font-size:30px;font-weight:900;color:'+color+';line-height:1.2">최대 +'+(totalBp>0?totalBp+'억원':'6억5천만원')+'</div>'
    +'<div style="font-size:13px;color:#64748b;margin-top:5px">현재 신청 한도 + 인증 취득 후 추가 조달 합계</div>'
    +'</div>'
    +rpSec('취득 우선순위 전략', color, rpLst([
      '1순위: 벤처인증 (약 6개월) — 즉각적 자금 한도 확대 + 기보 우대 적용 — 최우선 추진',
      '2순위: 이노비즈 인증 (1년) — 중진공 기술개발자금 신청 자격 + 기술보증 우대 적용',
      '3순위: 기업부설연구소 (중기) — R&D 세액공제 25% 절세 + 기보 기술보증 동시 우대',
      '4순위: HACCP (장기) — 대형마트·단체급식 채널 확보 → 안정적 B2B 매출 기반 마련'
    ], color))
    +'</div>'
    +'</div>'
  );

  var p7 = rpPage(7,'자금사용계획','총 '+nf+' 집행 계획',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +rpSec('자금 집행 계획표', color,
      '<table class="rp-ftb"><thead><tr><th style="text-align:left">항목</th><th>금액</th><th>비율</th><th>사용 목적</th></tr></thead>'
      +'<tbody>'+fundRows.map(function(r,i){return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'><td style="font-weight:700">'+r.item+'</td><td style="text-align:center">'+r.amount+'</td><td style="text-align:center;font-weight:700;color:'+color+'">'+r.ratio+'</td><td>'+r.purpose+'</td></tr>';}).join('')
      +'<tr style="background:#f0fdf4"><td style="font-weight:700">합계</td><td style="text-align:center;font-weight:700;color:'+color+'">'+nf+'</td><td style="text-align:center;font-weight:700;color:'+color+'">100%</td><td>-</td></tr>'
      +'</tbody></table>'
    )
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('자금 집행 전략 및 기대 효과', color, rpLst(d.s7_strategy||[
      '1단계: 원재료 선매입(1.5억)으로 공급망 안정성 확보 — 원가 변동성 해소 및 원가율 하락 기대',
      '2단계: 반자동 생산 설비 도입(1억)으로 원가율 20% 절감 — 매출이익률 즉각 개선 효과 발생',
      '3단계: 마케팅·채널 투자(0.7억)로 매출 2배 성장 가속 — SNS·쿠팡 동시 집행',
      '4단계: 운전자금(0.8억)으로 고성장 구간 현금흐름 안정 유지 — 리스크 최소화',
      '자금 집행 후 6개월 내 조달 자금 대비 ROI 200% 이상 달성 목표 — 컨설턴트 분기 점검 병행'
    ], color))
    +'</div>'
    +'</div>'
  );

  var p8 = rpPage(8,'매출 추이 및 1년 전망','월별 시뮬레이션 · 단중장기 전략',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +rpSec('월별 매출 시뮬레이션 (1년 전망)', color, '<div class="rp-ch" style="height:205px"><canvas id="biz-monthly-chart" style="width:100%;height:100%"></canvas></div>')
    +'</div>'
    +'<div class="rp-colF">'
    +'<div class="rp-gph rp-gphs" style="flex:1"><div class="rp-gphh">⚡ 단기 (1년)</div><ul>'+(d.s8_short||['정책자금 4억 조달 완료','쿠팡·스마트스토어 입점','생산 설비 교체 가동','월 매출 1.5억 달성']).map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'
    +'<div class="rp-gph rp-gphm" style="flex:1"><div class="rp-gphh">📈 중기 (3년)</div><ul>'+(d.s8_mid||['벤처인증 취득 완료','B2B 납품 3채널 확보','이노비즈 인증 추진','매출 24억 달성']).map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'
    +'<div class="rp-gph rp-gphl" style="flex:1"><div class="rp-gphh">🌟 장기 (5년)</div><ul>'+(d.s8_long||['자동화 생산 체계 완성','해외 수출 시장 진출','기업부설연구소 설립','매출 100억 달성']).map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'
    +'</div>'
    +'</div>'
  );

  var p9 = rpPage(9,'성장비전','향후 발전 가능성 · KPI · 로드맵',color,
    '<div class="rp-2col">'
    +'<div class="rp-col45">'
    +'<div class="rp-g4" style="flex-shrink:0;margin-bottom:12px">'
    +rpMC('1년후 매출',kpi9.y1,'+30%',color)
    +rpMC('2년후 매출',kpi9.y2,'+74%',color)
    +rpMC('목표 채널',kpi9.ch,'현재 1개','#2563eb')
    +rpMC('목표 인력',kpi9.emp,'2년 내','#7c3aed')
    +'</div>'
    +rpSec('핵심 성장 동력', color, rpLst(d.s9_items||[
      '특허 기반 기술력으로 경쟁사 진입을 방어하면서 HMR 시장 내 독점적 포지션을 장기적으로 유지 가능',
      'HMR 시장 연 18% 성장의 직접 수혜자로서 자연적 시장 성장만으로도 상당한 매출 증가가 보장됨',
      '정책자금 조달 후 설비 자동화로 원가율 개선과 매출 성장이 동시에 가속화되어 이익 레버리지 발생',
      '채널 다각화(쿠팡+B2B+자사몰) 완성 시 매출 안정성과 성장성을 동시에 확보하는 구조 완성'
    ], color))
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('앞으로의 계획 로드맵', color,
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px">'
      +rmYears.map(function(r,i){
        return '<div style="border-radius:8px;padding:11px;border:1px solid #e2e8f0;border-top:3px solid '+rmColors[i]+';background:white">'
          +'<div style="font-size:13px;font-weight:700;color:'+rmColors[i]+';margin-bottom:7px">'+r.year+'</div>'
          +r.tasks.map(function(t){return '<div style="font-size:13px;color:#64748b;padding-left:10px;position:relative;line-height:1.5;margin-bottom:4px"><span style="position:absolute;left:0;font-weight:700;color:'+rmColors[i]+'">·</span>'+t+'</div>';}).join('')
          +'</div>';
      }).join('')
      +'</div>'
    )
    +'</div>'
    +'</div>'
  );

  var p10 = rpPage('✦','마무리','종합 요약 · 컨설턴트 총평',color,
    '<div class="rp-2col">'
    +'<div class="rp-col50">'
    +'<div class="rp-cls" style="flex:1">'
    +'<div class="rp-clst">'+cData.name+' — 종합 의견 및 컨설턴트 총평</div>'
    +'<div class="rp-clstx">'+conclusion+'</div>'
    +'</div>'
    +'</div>'
    +'<div class="rp-colF">'
    +'<div class="rp-g4" style="flex-shrink:0;margin-bottom:12px">'
    +[{l:'시장성',v:'★★★★★',c:color},{l:'기술력',v:'★★★★★',c:'#2563eb'},{l:'성장성',v:'★★★★★',c:'#7c3aed'},{l:'안정성',v:'★★★★',c:'#ea580c'}].map(function(r){
      return '<div class="rp-mc" style="border-top:3px solid '+r.c+'"><div class="rp-mcl">'+r.l+'</div><div class="rp-mcv" style="color:'+r.c+';font-size:17px">'+r.v+'</div></div>';
    }).join('')
    +'</div>'
    +rpSec('★ 컨설턴트 핵심 메시지', color, rpLst([
      '특허 기술력 + 폭발적 매출 성장 = 정책자금 심사 기관이 최우선으로 지원하는 기업 프로파일에 완벽 부합함',
      '인증 취득 로드맵 실행 시 추가 자금 최대 6.5억원 확보 가능 — 성장 가속화를 위한 자금 기반 완성',
      '3년 내 매출 35억, 5년 내 매출 100억 달성 목표는 현재 성장 추이를 감안할 때 충분히 현실적인 수준임',
      '컨설턴트 밀착 지원 하에 인증·자금·채널을 동시 추진하는 종합 성장 전략 실행을 강력히 권고함'
    ], color))
    +'</div>'
    +'</div>'
  );

  return tplStyle(color, 'landscape') + '<div class="rp-wrap">' + cover + p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 + p10 + '</div>';
}


// ===========================
// ★ 차트 초기화 — 재사용 시 파괴 후 생성
// ===========================
function safeDestroyChart(canvas) {
  if (!canvas || typeof Chart === 'undefined') return;
  try { var e = Chart.getChart ? Chart.getChart(canvas) : null; if(e) e.destroy(); } catch(er) {}
}

function initReportCharts(rev) {
  if (typeof Chart === 'undefined') { console.warn('Chart.js 미로드'); return; }
  setTimeout(function() {
    // ─ 경영진단 레이더
    var ra = document.getElementById('rp-radar');
    if(ra && ra.dataset && ra.dataset.scores) {
      safeDestroyChart(ra);
      try { new Chart(ra.getContext('2d'),{type:'radar',data:{labels:['재무','전략/마케팅','인사','운영','IT'],datasets:[{data:ra.dataset.scores.split(',').map(Number),backgroundColor:'rgba(59,130,246,0.18)',borderColor:'#3b82f6',pointBackgroundColor:'#1e3a8a',pointRadius:5,pointHoverRadius:7}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20,font:{size:11}},pointLabels:{font:{size:12,weight:'bold'}}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}}); } catch(e){console.error('레이더 오류:',e);}
    }
    // ─ 매출 라인
    var li = document.getElementById('rp-linechart');
    if(li && li.dataset && li.dataset.y23 !== undefined) {
      safeDestroyChart(li);
      try { var ld=li.dataset; new Chart(li.getContext('2d'),{type:'line',data:{labels:['2023년','2024년','2025년','금년(예)'],datasets:[{data:[+ld.y23||0,+ld.y24||0,+ld.y25||0,+ld.exp||0],borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.12)',borderWidth:3,pointRadius:6,pointHoverRadius:8,fill:true,tension:0.3}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:11},callback:function(v){return v>=10000?Math.floor(v/10000)+'억':v.toLocaleString()+'만';}}}}}}); } catch(e){console.error('라인 오류:',e);}
    }
    // ─ 재무 도넛
    var de = document.getElementById('fp-donut');
    if(de && de.dataset && de.dataset.names) {
      safeDestroyChart(de);
      try { new Chart(de.getContext('2d'),{type:'doughnut',data:{labels:de.dataset.names.split('|'),datasets:[{data:de.dataset.ratios.split(',').map(Number),backgroundColor:['#2563eb','#7c3aed','#06b6d4','#16a34a','#ea580c'],borderWidth:3,borderColor:'white'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'65%'}}); } catch(e){}
    }
    // ─ 3개년 성장
    var fg = document.getElementById('fp-growth-chart');
    if(fg) { safeDestroyChart(fg); try { new Chart(fg.getContext('2d'),{type:'line',data:{labels:['2026','2027','2028'],datasets:[{data:[14,24,35],borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,0.15)',borderWidth:3,pointRadius:6,fill:true,tension:0.3}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:11},callback:function(v){return v+'억';}}}}}}); } catch(e){} }
    // ─ 상권 레이더
    var tr = document.getElementById('tp-radar');
    if(tr && tr.dataset && tr.dataset.scores) {
      safeDestroyChart(tr);
      try { new Chart(tr.getContext('2d'),{type:'radar',data:{labels:['유동인구','접근성','성장성','경쟁강도','가시성'],datasets:[{data:tr.dataset.scores.split(',').map(Number),backgroundColor:'rgba(13,148,136,0.18)',borderColor:'#0d9488',pointBackgroundColor:'#0d9488',pointRadius:5}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20,font:{size:11}},pointLabels:{font:{size:12}}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}}); } catch(e){}
    }
    // ─ 상권 매출 라인
    var tl = document.getElementById('tp-linechart');
    if(tl && tl.dataset && tl.dataset.s0) {
      safeDestroyChart(tl);
      try { var td=tl.dataset; new Chart(tl.getContext('2d'),{type:'line',data:{labels:['현재','6개월','1년','2년'],datasets:[{data:[+td.s0,+td.s1,+td.s2,+td.s3],borderColor:'#0d9488',backgroundColor:'rgba(13,148,136,0.12)',borderWidth:3,pointRadius:6,fill:true,tension:0.3}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:11},callback:function(v){return Math.round(v/100)*100+'만';}}}}}}); } catch(e){}
    }
    // ─ 마케팅 도넛
    var md = document.getElementById('mp-donut');
    if(md && md.dataset && md.dataset.names) {
      safeDestroyChart(md);
      try { new Chart(md.getContext('2d'),{type:'doughnut',data:{labels:md.dataset.names.split('|'),datasets:[{data:md.dataset.ratios.split(',').map(Number),backgroundColor:['#db2777','#9d174d','#f4c0d1','#fdf2f8'],borderWidth:3,borderColor:'white'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'65%'}}); } catch(e){}
    }
    // ─ HMR 시장 성장
    var bm = document.getElementById('bp-market-chart');
    if(bm) { safeDestroyChart(bm); try { new Chart(bm.getContext('2d'),{type:'line',data:{labels:['2016','2017','2018','2019','2020','2021','2022'],datasets:[{data:[2,2.4,3,3.8,4.5,5.8,7],borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,0.12)',borderWidth:3,pointRadius:5,fill:true,tension:0.35}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:11},callback:function(v){return v+'조';}}}}}}); } catch(e){} }
    // ─ 월별 매출 바
    var bc = document.getElementById('biz-monthly-chart');
    if(bc) {
      safeDestroyChart(bc);
      try {
        var curM=new Date().getMonth(), sr=rev||{};
        var avgM=sr.cur&&curM>0?Math.round(sr.cur/curM):sr.y25?Math.round(sr.y25/12):3000;
        var ac=[],fc=[];
        for(var i=0;i<12;i++){if(i<curM){ac.push(Math.round(avgM*(0.9+i*0.02)));fc.push(null);}else{ac.push(null);fc.push(Math.round(avgM*Math.pow(1.06,i-curM+1)));}}
        new Chart(bc.getContext('2d'),{type:'bar',data:{labels:['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],datasets:[{label:'실적',data:ac,backgroundColor:'rgba(22,163,74,0.75)',borderColor:'#16a34a',borderWidth:1,borderRadius:5},{label:'예측',data:fc,backgroundColor:'rgba(59,130,246,0.55)',borderColor:'#3b82f6',borderWidth:1,borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{font:{size:11}}}},scales:{y:{ticks:{font:{size:11},callback:function(v){return v>=10000?Math.floor(v/10000)+'억':Math.round(v/1000)+'천';}}}}}}); } catch(e){}
    }
  }, 400);
}

// ===========================
// ★ 프롬프트 — 기업명·수치 강제 반영
// ===========================
function buildMgmtClientPrompt(cData, fRev) {
  var nm=cData.name, ind=cData.industry||'제조업', itm=cData.coreItem||'주력제품', emp=cData.empCount||'4';
  var r25=fRev.매출_2025년||'0원', r24=fRev.매출_2024년||'0원', rExp=fRev.금년예상연간매출||'0원', rCur=fRev.금년매출_전월말기준||'0원';
  return '너는 대한민국 최고의 경영컨설턴트야. 아래 기업 데이터를 기반으로 \''+nm+'\' 기업전달용 경영진단보고서를 작성해.\n\n'
    +'【핵심 규칙】\n'
    +'- 반드시 기업명 \''+nm+'\'을 각 항목에 자연스럽게 포함\n'
    +'- 실제 수치(전년매출 '+r25+', 금년예상 '+rExp+', 핵심아이템: '+itm+')를 반드시 인용\n'
    +'- 각 항목은 반드시 60자 이상, 구체적이고 실질적인 내용\n'
    +'- 긍정적이고 전문적인 톤\n'
    +'- JSON만 출력 (마크다운, 설명 텍스트 없이)\n\n'
    +'JSON:\n'
    +'{"grade":"A-","grade_desc":"고성장 유망기업",'
    +'"overview":["'+nm+'는 '+r25+' 매출을 달성하며 5개항목 각60자이상"],'
    +'"finance_strengths":["'+nm+'의 '+r25+' 매출은 4개항목 각60자이상"],'
    +'"finance_risks":["'+nm+'가 주의해야 할 3개항목 각60자이상"],'
    +'"radar":[재무,전략,인사,운영,IT점수],'
    +'"marketing_bars":{"finance":점수,"strategy":점수,"operation":점수,"hr":점수,"it":점수},'
    +'"marketing":["'+nm+'의 '+itm+' 마케팅 5개항목 각60자이상"],'
    +'"marketing_items":["포지셔닝 전략 3개 각50자이상"],'
    +'"hr":["'+nm+' 인사조직 5개 각60자이상"],'
    +'"ops":["'+nm+' 운영생산 5개 각60자이상"],'
    +'"it":["'+nm+' IT디지털 5개 각60자이상"],'
    +'"certs":['
    +'{"name":"벤처기업 인증","effect":"'+nm+'의 '+itm+' 기술력 인정 — 중진공·기보 우대금리 적용으로 추가 자금 한도 2억원 확보 가능","amount":"+2억","period":"6개월 내"},'
    +'{"name":"이노비즈 인증","effect":"'+nm+'의 기술혁신형 기업 인증으로 중진공 기술개발자금 신청 자격 부여 및 기보 우대 보증 적용","amount":"+3억","period":"1년 내"},'
    +'{"name":"기업부설연구소","effect":"'+nm+'의 R&D 세액공제 25% 적용 및 기보 기술보증 우대 — 절세+보증 시너지","amount":"+1.5억","period":"세액공제 병행"},'
    +'{"name":"HACCP 인증","effect":"'+nm+' 제품의 대형마트·단체급식 납품 채널 확대 직접 연결","amount":"채널↑","period":"매출 확대"}],'
    +'"roadmap_short":["'+nm+' 단기 4개 각35자이상"],'
    +'"roadmap_mid":["'+nm+' 중기 4개 각35자이상"],'
    +'"roadmap_long":["'+nm+' 장기 4개 각35자이상"],'
    +'"summary":["'+nm+' 종합의견 3개 각80자이상"]}\n\n'
    +'[기업 데이터] 기업명:'+nm+', 업종:'+ind+', 핵심아이템:'+itm+', 상시근로자:'+emp+'명, 전년매출:'+r25+', 금년예상:'+rExp+', 금년현재:'+rCur+', 전전년:'+r24;
}

function buildMgmtConsultantPrompt(cData, fRev) {
  var nm=cData.name, ind=cData.industry||'제조업', itm=cData.coreItem||'주력제품', emp=cData.empCount||'4';
  var r25=fRev.매출_2025년||'0원', rExp=fRev.금년예상연간매출||'0원';
  return '너는 대한민국 최고의 경영컨설턴트야. \''+nm+'\' 컨설턴트 내부용 경영진단보고서를 작성해.\n\n'
    +'【핵심 규칙】\n'
    +'- 기업명 \''+nm+'\'을 각 항목에 포함, 실제 수치('+r25+', '+rExp+') 반드시 인용\n'
    +'- 컨설턴트 내부용: 리스크를 솔직하고 구체적으로 기술\n'
    +'- 각 항목 60자 이상, JSON만 출력\n\n'
    +'{"grade":"등급","grade_desc":"8자설명",'
    +'"overview":["'+nm+' 현황 5개 60자이상"],'
    +'"key_risks":["'+nm+' 리스크 4개 각70자이상"],'
    +'"finance_strengths":["'+nm+' 재무강점 4개 60자이상"],'
    +'"fb_finance":["재무 피드백 3개 70자이상"],'
    +'"radar":[재무,전략,인사,운영,IT],'
    +'"marketing_bars":{"finance":점수,"strategy":점수,"operation":점수,"hr":점수,"it":점수},'
    +'"marketing":["'+nm+' 마케팅 4개 60자이상"],'
    +'"fb_marketing":["마케팅 피드백 3개 70자이상"],'
    +'"hr":["'+nm+' 인사 5개 60자이상"],'
    +'"ops":["'+nm+' 운영 5개 60자이상"],'
    +'"fb_hr_ops":["인사운영 피드백 3개 70자이상"],'
    +'"it":["'+nm+' IT 5개 60자이상"],'
    +'"fb_it":["IT피드백 3개 70자이상"],'
    +'"roadmap_short":["단기 4개 35자이상"],"roadmap_mid":["중기 4개"],"roadmap_long":["장기 4개"],'
    +'"fb_roadmap":["로드맵피드백 2개 70자이상"],'
    +'"certs":[{"name":"인증명","effect":"'+nm+' 관련 효과 50자이상","amount":"+X억","period":"기간"},3개],'
    +'"consultant_issues":["'+nm+' 시급이슈 3개 80자이상"],'
    +'"consultant_funds":["'+nm+' 자금전략 4개 70자이상"],'
    +'"consultant_certs":["인증전략 3개 60자이상"],'
    +'"consultant_marketing":["마케팅 2개 60자이상"],'
    +'"consultant_credit":["신용개선 2개 60자이상"]}\n\n'
    +'[기업 데이터] 기업명:'+nm+', 업종:'+ind+', 핵심아이템:'+itm+', 상시근로자:'+emp+'명, 전년매출:'+r25+', 금년예상:'+rExp;
}

function buildFinancePrompt(cData, fRev) {
  var nm=cData.name, ind=cData.industry||'제조업';
  var r25=fRev.매출_2025년||'0원', rExp=fRev.금년예상연간매출||'0원';
  return '재무전문 컨설턴트. \''+nm+'\' 재무진단. 기업명과 실제 수치 반드시 포함. JSON만.\n\n'
    +'{"scores":{"profit":수익성점수,"stable":안정성점수,"growth":성장성점수},'
    +'"score_descs":{"profit":"'+nm+' 수익성 10자","stable":"'+nm+' 안정성 10자","growth":"'+nm+' 성장성 10자"},'
    +'"profit_bars":[{"label":"매출 성장률(YoY)","value":80,"display":"+21%"},{"label":"매출이익률","value":62,"display":"38%"},{"label":"영업이익률","value":45,"display":"23%"},{"label":"현금흐름 안정성","value":70,"display":"양호"}],'
    +'"debt":[{"name":"중진공","ratio":54},{"name":"기보","ratio":27},{"name":"재단","ratio":19}],'
    +'"stable_metrics":[{"label":"부채비율","value":"낮음","desc":"정책자금 중심"},{"label":"KCB신용","value":"710점","desc":"3등급"},{"label":"연체이력","value":"없음","desc":"청결"},{"label":"종합등급","value":"A-","desc":"우수"}],'
    +'"growth_items":["'+nm+'의 '+r25+' 매출은 5개 60자이상"],'
    +'"action_urgent":"'+nm+' 즉시실행 2문장",'
    +'"action_short":"'+nm+' 단기실행 2문장",'
    +'"action_mid":"'+nm+' 중기실행 2문장"}\n\n'
    +'[기업] 기업명:'+nm+', 업종:'+ind+', 전년매출:'+r25+', 금년예상:'+rExp;
}

function buildTradePrompt(cData, fRev) {
  var nm=cData.name, ind=cData.industry||'제조업', itm=cData.coreItem||'주력제품';
  var r25=fRev.매출_2025년||'0원';
  return '상권분석 전문가. \''+nm+'\' 상권분석. 기업명과 실제 데이터 반드시 반영. JSON만.\n\n'
    +'{"traffic":"2,400명","competitors":7,"grade":"B+","radar":[82,75,68,72,80],'
    +'"features":["'+nm+'의 '+itm+' 판매 상권 특성 5개 60자이상"],'
    +'"comp_direct":7,"comp_strong":3,"diff_potential":"高",'
    +'"target":{"age":"30~40대","household":"1~2인","channel":"온라인","cycle":"월 2~3회"},'
    +'"strategy":["'+nm+'의 '+itm+'을 활용한 차별화 전략 5개 60자이상"],'
    +'"sim":{"s0":9000,"s1":12000,"s2":16000,"s3":24000}}\n\n'
    +'[기업] 기업명:'+nm+', 업종:'+ind+', 핵심아이템:'+itm+', 전년매출:'+r25;
}

function buildMarketingPrompt(cData, fRev) {
  var nm=cData.name, itm=cData.coreItem||'주력제품';
  var r25=fRev.매출_2025년||'0원', rExp=fRev.금년예상연간매출||'0원';
  return '디지털마케팅 전문가. \''+nm+'\'의 \''+itm+'\' 마케팅 제안서. 기업명과 제품명 반드시 포함. JSON만.\n\n'
    +'{"channels":[{"name":"SNS (인스타·유튜브쇼츠)","score":88},{"name":"네이버 검색·블로그","score":75},{"name":"인플루언서·리뷰마케팅","score":72},{"name":"쿠팡 광고","score":65}],'
    +'"strategies":["'+nm+'의 '+itm+' SNS 전략 5개 60자이상"],'
    +'"budget_total":"700만원/월",'
    +'"budget":[{"name":"SNS광고","ratio":38},{"name":"검색광고","ratio":25},{"name":"콘텐츠제작","ratio":22},{"name":"기타","ratio":15}],'
    +'"kpi":[{"label":"SNS 팔로워","value":"+3,000","period":"3개월"},{"label":"월 매출 증가","value":"+30%","period":"6개월"},{"label":"재구매율","value":"40%","period":"목표"},{"label":"리뷰 누적","value":"500건","period":"6개월"}],'
    +'"roadmap":[{"period":"1월","task":"'+nm+' SNS채널 개설·브랜딩","highlight":false},{"period":"2월","task":"인플루언서 협업","highlight":false},{"period":"3월","task":"'+itm+' 바이럴캠페인","highlight":false},{"period":"4~5월","task":"성과분석·최적화","highlight":true},{"period":"6월","task":"정기구독 론칭","highlight":false},{"period":"7월~","task":"B2B채널 진출","highlight":false}]}\n\n'
    +'[기업] 기업명:'+nm+', 핵심아이템:'+itm+', 전년매출:'+r25+', 금년예상:'+rExp;
}

function buildFundPrompt(cData, fRev) {
  var nm=cData.name, ind=cData.industry||'제조업';
  var r25=fRev.매출_2025년||'0원', rExp=fRev.금년예상연간매출||'0원';
  var nf=cData.needFund>0?fKRW(cData.needFund):'4억원';
  return '정책자금 전문 컨설턴트. \''+nm+'\' 정책자금 매칭. 기업명 반드시 반영. JSON만.\n\n'
    +'{"checks":[{"text":"중소기업 해당 여부","status":"pass"},{"text":"국세·지방세 체납 없음","status":"pass"},{"text":"금융 연체 이력 없음","status":"pass"},{"text":"사업자 등록 유효","status":"pass"},{"text":"업력 조건 충족","status":"cond"},{"text":"벤처·이노비즈 인증","status":"fail"}],'
    +'"score":78,"score_desc":"'+nm+' 신청 가능","match_count":5,'
    +'"score_items":["'+nm+'는 기본요건 4개 충족 3개 60자이상"],'
    +'"funds":[{"rank":1,"name":"중진공 소공인 특화자금","limit":"1억","tags":["금리 2.5%","즉시신청가능","'+ind+' 우대"]},{"rank":2,"name":"기보 기술보증(특허우대)","limit":"3억","tags":["보증료 0.5%","특허 1건 우대","90% 보증"]},{"rank":3,"name":"소진공 성장촉진자금","limit":"1억","tags":["금리 3.0%","창업3년이내","온라인신청"]},{"rank":4,"name":"지역신보 소액보증","limit":"5천만","tags":["보증료 0.8%","지역맞춤","빠른처리"]},{"rank":5,"name":"신보 창업기업 특례보증","limit":"2억","tags":["보증료 0.5%","벤처인증조건부","95% 보증"]}],'
    +'"comparison":[{"org":"중진공","limit":"1억","rate":"2.5%","period":"5년","diff":"easy"},{"org":"기보","limit":"3억","rate":"0.5%","period":"7년","diff":"mid"},{"org":"소진공","limit":"1억","rate":"3.0%","period":"5년","diff":"easy"},{"org":"지역신보","limit":"5천만","rate":"0.8%","period":"3년","diff":"easy"}],'
    +'"checklist_ready":["사업자등록증 사본","부가세 신고서 2년","국세납부증명서","신용정보 동의서"],'
    +'"checklist_need":["사업계획서 (기보 필수)","벤처인증서 (취득 후)"]}\n\n'
    +'[기업] 기업명:'+nm+', 업종:'+ind+', 필요자금:'+nf+', 전년매출:'+r25+', 금년예상:'+rExp;
}

function buildBizPlanPrompt(cData, fRev) {
  var nm=cData.name, ind=cData.industry||'제조업', itm=cData.coreItem||'주력제품', emp=cData.empCount||'4', rep=cData.rep||'대표';
  var r25=fRev.매출_2025년||'0원', rExp=fRev.금년예상연간매출||'0원', r24=fRev.매출_2024년||'0원';
  var nf=cData.needFund>0?fKRW(cData.needFund):'4억원';
  return '사업계획서 전문가. \''+nm+'\' 완성형 AI 사업계획서. 기업명·제품명·실제수치를 모든 항목에 반드시 포함. JSON만.\n\n'
    +'{"s1_items":["'+nm+'는 '+itm+'을 통해 5개 70자이상"],'
    +'"s2_swot":{"strength":["'+nm+'의 강점 4개 50자이상"],"weakness":["'+nm+'의 약점 3개 50자이상"],"opportunity":["'+nm+'의 기회 4개 50자이상"],"threat":["'+nm+'의 위협 3개 50자이상"]},'
    +'"s3_items":["'+ind+' 시장 현황 5개 70자이상"],'
    +'"s4_items":["'+nm+'의 '+itm+' 경쟁력 4개 70자이상"],'
    +'"s4_competitor":[{"item":"제품경쟁력","self":"★★★★★","a":"★★★★","b":"★★★"},{"item":"기술력(특허)","self":"★★★★★","a":"★★★","b":"★★★"},{"item":"가격경쟁력","self":"★★★★","a":"★★★★★","b":"★★★★"},{"item":"유통망","self":"★★★","a":"★★★★★","b":"★★★★"},{"item":"성장성","self":"★★★★★","a":"★★★","b":"★★★"}],'
    +'"s5_items":[{"title":"기술 차별화","text":"'+nm+'의 '+itm+' 기술특허 보유로 70자이상","color":"#16a34a"},{"title":"제품 차별화","text":"'+nm+' 제품 독창적 특징 70자이상","color":"#2563eb"},{"title":"시장 포지셔닝","text":"'+nm+'의 '+ind+' 시장 내 포지션 70자이상","color":"#7c3aed"},{"title":"성장 증명력","text":"'+nm+'의 '+r25+' 매출 달성으로 70자이상","color":"#ea580c"}],'
    +'"s6_certs":[{"name":"벤처기업 인증","effect":"'+nm+'의 기술력 인정 — 중진공·기보 우대금리 + 추가 한도 2억","amount":"+2억","period":"6개월 내"},{"name":"이노비즈 인증","effect":"'+nm+'의 기술혁신기업 인증 — 중진공 기술개발자금 신청 자격","amount":"+3억","period":"1년 내"},{"name":"기업부설연구소","effect":"'+nm+'의 R&D 세액공제 25% + 기보 기술보증 우대","amount":"+1.5억","period":"세액공제 병행"},{"name":"HACCP 인증","effect":"'+nm+' '+itm+'의 대형마트·급식 납품 채널 확대","amount":"채널↑","period":"매출 확대"}],'
    +'"s7_rows":[{"item":"원재료 구입","amount":"1억5천만원","ratio":"37.5%","purpose":"'+nm+'의 핵심 원재료 선매입 및 안정적 재고 확보"},{"item":"생산 설비 투자","amount":"1억원","ratio":"25%","purpose":"'+nm+'의 생산 자동화로 원가율 20% 절감"},{"item":"마케팅·채널","amount":"7천만원","ratio":"17.5%","purpose":"'+nm+'의 SNS·쿠팡 입점·브랜드 마케팅 집행"},{"item":"운전자금","amount":"8천만원","ratio":"20%","purpose":"'+nm+'의 인건비·고정비 등 운영 비용"}],'
    +'"s7_strategy":["'+nm+' 자금 집행 전략 5개 50자이상"],'
    +'"s8_short":["'+nm+' 단기 4개 35자이상"],"s8_mid":["'+nm+' 중기 4개"],"s8_long":["'+nm+' 장기 4개"],'
    +'"s9_items":["'+nm+'의 핵심 성장 동력 4개 70자이상"],'
    +'"s9_kpi":{"y1":"18억","y2":"24억","ch":"5개↑","emp":"11명"},'
    +'"s9_roadmap":[{"year":"2026","tasks":["'+nm+' 3개 계획"]},{"year":"2027","tasks":["'+nm+' 3개 계획"]},{"year":"2028","tasks":["3개 계획"]},{"year":"2029~","tasks":["3개 계획"]}],'
    +'"s10_conclusion":"'+nm+'는 '+itm+'을 통해 5문장이상 종합의견(~있음으로끝)"}\n\n'
    +'[기업] 기업명:'+nm+', 대표:'+rep+', 업종:'+ind+', 핵심아이템:'+itm+', 상시근로자:'+emp+'명, 전년매출:'+r25+', 전전년:'+r24+', 금년예상:'+rExp+', 필요자금:'+nf;
}

// ===========================
// ★ REPORT_CONFIGS
// ===========================
var REPORT_CONFIGS = {
  finance:     {typeLabel:'재무진단',    title:'상세 재무진단',   contentAreaId:'finance-content-area',    landscape:false, buildPrompt:buildFinancePrompt,   buildHTML:buildFinanceHTML},
  aiTrade:     {typeLabel:'상권분석',    title:'상권분석 리포트', contentAreaId:'aiTrade-content-area',    landscape:false, buildPrompt:buildTradePrompt,     buildHTML:buildTradeHTML},
  aiMarketing: {typeLabel:'마케팅제안',  title:'마케팅 제안서',   contentAreaId:'aiMarketing-content-area',landscape:false, buildPrompt:buildMarketingPrompt, buildHTML:buildMarketingHTML},
  aiFund:      {typeLabel:'정책자금매칭',title:'정책자금매칭',    contentAreaId:'aiFund-content-area',     landscape:false, buildPrompt:buildFundPrompt,      buildHTML:buildFundHTML},
  aiBiz:       {typeLabel:'사업계획서',  title:'AI 사업계획서',      contentAreaId:'aiBiz-content-area',      landscape:true,  buildPrompt:buildBizPlanPrompt,   buildHTML:buildBizPlanHTML}
};

function resetContentArea(el) {
  if (!el) return;
  el.style.cssText = 'padding:0!important;background:transparent!important;box-shadow:none!important;min-height:unset!important;border-radius:0!important;';
}

// ===========================
// ★ 경영진단 생성 — try/finally 오버레이 보장
// ===========================
window.generateReport = async function(type, version, event) {
  var overlay = document.getElementById('ai-loading-overlay');
  var tab = event.target.closest('.tab-content');
  var cN  = tab.querySelector('.company-dropdown').value;
  if (!cN) { alert('기업을 선택해주세요.'); return; }
  var cs  = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  var cData = cs.find(function(c){return c.name===cN;});
  if (!cData) { alert('기업 정보를 찾을 수 없습니다.'); return; }
  var rev  = cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
  var fRev = fRevAI(cData, rev);
  var prompt = version==='client' ? buildMgmtClientPrompt(cData,fRev) : buildMgmtConsultantPrompt(cData,fRev);
  if (overlay) overlay.style.display = 'flex';
  var data = null;
  try {
    data = await callGeminiJSON(prompt, 8192);
  } catch(e) {
    console.error('보고서 생성 오류:', e);
    alert('보고서 생성 오류: ' + (e.message||'알 수 없는 오류'));
  } finally {
    if (overlay) overlay.style.display = 'none';
  }
  if (!data) return;
  var today = new Date().toISOString().split('T')[0];
  var vL = version==='client'?'기업전달용':'컨설턴트용';
  var rpt = {id:'rep_'+Date.now(),type:'경영진단',company:cData.name,title:'경영진단보고서 ('+vL+')',date:today,content:JSON.stringify(data),version:version,revenueData:rev,reportType:'management'};
  var rs = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]'); rs.push(rpt);
  localStorage.setItem(DB_REPORTS, JSON.stringify(rs)); updateDataLists();
  tab.querySelector('[id$="-input-step"]').style.display = 'none';
  tab.querySelector('[id$="-result-step"]').style.display = 'block';
  var ca = document.getElementById('report-content-area');
  resetContentArea(ca);
  ca.innerHTML = version==='client' ? buildMgmtClientHTML(data,cData,rev,today) : buildMgmtConsultantHTML(data,cData,rev,today);
  _currentReport = {company:cData.name, type:'경영진단보고서 ('+vL+')', contentAreaId:'report-content-area', landscape:false};
  initReportCharts(rev);
};

// ===========================
// ★ 기타 보고서 생성 — try/finally 오버레이 보장
// ===========================
window.generateAnyReport = async function(type, version, event) {
  var overlay = document.getElementById('ai-loading-overlay');
  var tab = event.target.closest('.tab-content');
  var cN  = tab.querySelector('.company-dropdown').value;
  if (!cN) { alert('기업을 선택해주세요.'); return; }
  var cs  = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  var cData = cs.find(function(c){return c.name===cN;});
  if (!cData) { alert('기업 정보를 찾을 수 없습니다.'); return; }
  var rev  = cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
  var fRev = fRevAI(cData, rev);
  var cfg  = REPORT_CONFIGS[type]; if (!cfg) return;
  if (overlay) overlay.style.display = 'flex';
  var data = null;
  try {
    var maxT = type==='aiBiz' ? 65536 : 8192;
    data = await callGeminiJSON(cfg.buildPrompt(cData, fRev, version), maxT);
  } catch(e) {
    console.error('보고서 생성 오류:', e);
    alert('보고서 생성 오류: ' + (e.message||'알 수 없는 오류'));
  } finally {
    if (overlay) overlay.style.display = 'none';
  }
  if (!data) return;
  var today = new Date().toISOString().split('T')[0];
  var vL = type==='aiBiz'?(version==='draft'?'초안':'완성본'):(version==='client'?'기업전달용':'컨설턴트용');
  var rpt = {id:'rep_'+Date.now(),type:cfg.typeLabel,company:cData.name,title:cfg.title+' ('+vL+')',date:today,content:JSON.stringify(data),version:version,revenueData:rev,reportType:type,contentAreaId:cfg.contentAreaId};
  var rs = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]'); rs.push(rpt);
  localStorage.setItem(DB_REPORTS, JSON.stringify(rs)); updateDataLists();
  tab.querySelector('[id$="-input-step"]').style.display = 'none';
  tab.querySelector('[id$="-result-step"]').style.display = 'block';
  var ca = document.getElementById(cfg.contentAreaId);
  resetContentArea(ca);
  ca.innerHTML = cfg.buildHTML(data, cData, rev, today);
  _currentReport = {company:cData.name, type:cfg.title+' ('+vL+')', contentAreaId:cfg.contentAreaId, landscape:cfg.landscape===true};
  initReportCharts(rev);
};

// ===========================
// ★ 보고서 보기 (showTab 리셋 후 setTimeout으로 복원)
// ===========================
window.viewReport = function(id) {
  var r = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]').find(function(x){return x.id===id;}); if(!r) return;
  var cs = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  var cData = cs.find(function(c){return c.name===r.company;})||{name:r.company,bizNum:'-',industry:'-',rep:'-',coreItem:'-',bizDate:'-',empCount:'-',date:r.date};
  var rev = r.revenueData||{cur:0,y25:0,y24:0,y23:0};
  var data; try{data=JSON.parse(r.content);}catch(e){data={};}
  var type = r.reportType||'management';
  if (type==='management') {
    showTab('report');
    setTimeout(function(){
      document.getElementById('report-input-step').style.display='none';
      document.getElementById('report-result-step').style.display='block';
      var ca = document.getElementById('report-content-area');
      resetContentArea(ca);
      ca.innerHTML = r.version==='client' ? buildMgmtClientHTML(data,cData,rev,r.date) : buildMgmtConsultantHTML(data,cData,rev,r.date);
      _currentReport = {company:cData.name, type:r.title, contentAreaId:'report-content-area', landscape:false};
      initReportCharts(rev);
    }, 50);
  } else {
    var cfg = REPORT_CONFIGS[type]; if(!cfg) return;
    var tabId = cfg.contentAreaId.replace('-content-area','');
    showTab(tabId);
    setTimeout(function(){
      document.getElementById(tabId+'-input-step').style.display='none';
      document.getElementById(tabId+'-result-step').style.display='block';
      var ca2 = document.getElementById(cfg.contentAreaId);
      resetContentArea(ca2);
      ca2.innerHTML = cfg.buildHTML(data,cData,rev,r.date);
      _currentReport = {company:cData.name, type:r.title, contentAreaId:cfg.contentAreaId, landscape:cfg.landscape===true};
      initReportCharts(rev);
    }, 50);
  }
};

window.backToInput = function(tab) {
  document.getElementById(tab+'-input-step').style.display='block';
  document.getElementById(tab+'-result-step').style.display='none';
};
