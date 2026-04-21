// ===== BizConsult AI 보고서 플랫폼 =====
const DB_USERS       = 'biz_users';
const DB_SESSION     = 'biz_session';
const STORAGE_KEY    = 'biz_consult_companies';
const DB_REPORTS     = 'biz_reports';
const DB_SUPPORT_DOC = 'biz_support_documents';
const DB_NOTICES     = 'biz_dashboard_notices';
let _currentReport = { company:'', type:'', contentAreaId:'', landscape:true };
const ADMIN_BOOTSTRAP = {
  email:'admin@bizconsult.com',
  pw:'Admin1234!',
  name:'시스템 관리자',
  dept:'BizConsult Admin',
  phone:'',
  apiKey:'',
  isAdmin:true,
  approved:true
};

function normalizeUser(u) {
  if (!u) return null;
  var nu = Object.assign({
    name:'',
    dept:'',
    phone:'',
    apiKey:'',
    isAdmin:false,
    approved:true,
    createdAt:'',
    approvedAt:''
  }, u);
  if (nu.isAdmin) nu.approved = true;
  if (typeof u.approved === 'undefined' && !u.isAdmin) nu.approved = true;
  return nu;
}
function getUsers() {
  return (JSON.parse(localStorage.getItem(DB_USERS)||'[]')||[]).map(function(u){ return normalizeUser(u); });
}
function saveUsers(users) {
  localStorage.setItem(DB_USERS, JSON.stringify((users||[]).map(function(u){ return normalizeUser(u); })));
}
function ensureAdminAccount() {
  var raw = JSON.parse(localStorage.getItem(DB_USERS)||'[]') || [];
  var normalized = raw.map(function(u){ return normalizeUser(u); });
  var changed = JSON.stringify(raw) !== JSON.stringify(normalized);
  if (!normalized.some(function(u){ return u.isAdmin === true; })) {
    var admin = normalizeUser(ADMIN_BOOTSTRAP);
    admin.createdAt = new Date().toISOString();
    admin.approvedAt = admin.createdAt;
    normalized.push(admin);
    changed = true;
  }
  if (changed) saveUsers(normalized);
}

function getReportLayoutConfig(orientation) {
  var isLandscape = (orientation === true || orientation === 'landscape');
  return {
    isLandscape: isLandscape,
    pageSize: isLandscape ? '297mm 210mm' : '210mm 297mm',
    printMargin: isLandscape ? '8mm 10mm' : '10mm 12mm',
    contentWidth: isLandscape ? '277mm' : '186mm',
    contentHeight: isLandscape ? '194mm' : '277mm',
    wrapPadding: isLandscape ? '10px' : '12px',
    coverPadding: '20px 24px 18px 32px',
    pagePadding: '14px 18px 14px'
  };
}

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
  if (!el || !el.innerHTML.trim()) { alert('출력할 보고서가 없음.'); return; }

  var rev = {};
  try {
    var cs = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    var cm = cs.find(function(x){return x.name===_currentReport.company;});
    if (cm && cm.revenueData) rev = cm.revenueData;
  } catch(e){}

  var layout = getReportLayoutConfig(_currentReport.landscape === true);
  var pw = window.open('','_blank','width=1600,height=1000,scrollbars=yes');
  if (!pw) { alert('팝업이 차단되었음. 팝업을 허용해 주세요.'); return; }

  var printCSS = `
    @page { size: ${layout.pageSize}; margin: ${layout.printMargin}; }
    html, body { margin:0; padding:0; background:#e8eaed; }
    * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    body {
      font-family: "Malgun Gothic","Apple SD Gothic Neo",sans-serif;
      min-width: ${layout.contentWidth};
    }
    .pdf-shell {
      width: ${layout.contentWidth};
      margin: 0 auto;
      padding: ${layout.wrapPadding} 0;
      background: #e8eaed;
    }
    .pdf-shell > * { width: 100%; }
    .rp-wrap {
      width: 100% !important;
      max-width: none !important;
      background: #e8eaed !important;
      padding: ${layout.wrapPadding} !important;
    }
    .rp-cover {
      background: white !important;
      border-radius: 8px !important;
      margin: 0 0 14px 0 !important;
      padding: ${layout.coverPadding} !important;
      height: ${layout.contentHeight} !important;
      min-height: ${layout.contentHeight} !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      box-shadow: none !important;
    }
    .rp-page {
      background: white !important;
      border-radius: 8px !important;
      margin: 0 0 14px 0 !important;
      padding: ${layout.pagePadding} !important;
      height: ${layout.contentHeight} !important;
      min-height: ${layout.contentHeight} !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      page-break-before: always !important;
      break-before: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-shadow: none !important;
    }
    .rp-section, .rp-cert, .rp-rank, .rp-chk, .rp-mc, .rp-hbr, .rp-rmi, .rp-gph, .rp-sws, .rp-sww, .rp-swo, .rp-swt {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    @media print {
      html, body { background: white !important; }
      .pdf-shell { width: 100% !important; padding: 0 !important; background: white !important; }
      .rp-wrap { width: 100% !important; padding: 0 !important; background: white !important; }
      .rp-cover, .rp-page { border-radius: 0 !important; margin: 0 !important; }
    }
  `;

  pw.document.write(`<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${_currentReport.type||'보고서'}</title>
<style>${printCSS}</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
</head><body>
<div class="pdf-shell">${el.innerHTML}</div>
<script>
${safeDestroyChart.toString()}
${initReportCharts.toString()}
var _popupRev = ${JSON.stringify(rev || {})};
window.onload = function() {
  initReportCharts(_popupRev);
  setTimeout(function(){ window.print(); }, 900);
};
<\/script></body></html>`);
  pw.document.close();
};

document.addEventListener('DOMContentLoaded', function() {
  ensureAdminAccount();
  checkAuth();
  const urlParams = new URLSearchParams(window.location.search);
  showTab(urlParams.get('tab') || 'dashboard', false);
  window.toggleCorpNumber(); window.toggleRentInputs(); window.toggleExportInputs();
});

// ===========================
// ★ 인증
// ===========================
window.devBypassLogin = function() {
  alert('배포 모드에서는 테스트 계정 바로 접속 기능을 사용하지 않음.');
};
function checkAuth() {
  ensureAdminAccount();
  const session = JSON.parse(localStorage.getItem(DB_SESSION)||'null');
  const authEl = document.getElementById('auth-container');
  const appEl  = document.getElementById('main-app');
  if (session) {
    const user = getUsers().find(function(u){ return u.email === session.email; });
    if (!user) {
      localStorage.removeItem(DB_SESSION);
      authEl.style.display='flex';
      appEl.style.display='none';
      return;
    }
    if (!user.isAdmin && !user.approved) {
      localStorage.removeItem(DB_SESSION);
      alert('현재 계정은 관리자 승인 대기 상태임. 승인 후 로그인할 수 있음.');
      authEl.style.display='flex';
      appEl.style.display='none';
      return;
    }
    localStorage.setItem(DB_SESSION, JSON.stringify(user));
    authEl.style.display='none';
    appEl.style.display='flex';
    loadUserProfile();
    updateDataLists();
    initInputHandlers();
  } else {
    authEl.style.display='flex';
    appEl.style.display='none';
  }
}
window.toggleAuthMode = function(mode) {
  document.getElementById('login-form-area').style.display  = mode==='login'  ? 'block' : 'none';
  document.getElementById('signup-form-area').style.display = mode==='signup' ? 'block' : 'none';
};
window.handleSignup = function() {
  const email=(document.getElementById('signup-email').value||'').trim();
  const pw=(document.getElementById('signup-pw').value||'').trim();
  const name=(document.getElementById('signup-name').value||'').trim();
  const dept=(document.getElementById('signup-dept').value||'').trim();
  const phone=(document.getElementById('signup-phone').value||'').trim();
  if (!email||!pw||!name) { alert('이메일, 비밀번호, 사용자명은 필수 입력 항목임.'); return; }
  let users=getUsers();
  if (users.find(function(u){ return u.email===email; })) { alert('이미 가입된 이메일임.'); return; }
  users.push(normalizeUser({
    email:email,
    pw:pw,
    name:name,
    dept:dept,
    phone:phone,
    apiKey:'',
    isAdmin:false,
    approved:false,
    createdAt:new Date().toISOString(),
    approvedAt:''
  }));
  saveUsers(users);
  ['signup-email','signup-pw','signup-name','signup-dept','signup-phone'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  alert('회원가입 신청이 접수되었음. 관리자 승인 후 로그인할 수 있음.');
  toggleAuthMode('login');
};
window.handleLogin = function() {
  const email=(document.getElementById('login-email').value||'').trim();
  const pw=(document.getElementById('login-pw').value||'').trim();
  const user=getUsers().find(function(u){ return u.email===email && u.pw===pw; });
  if (!user) { alert('이메일 또는 비밀번호가 일치하지 않음.'); return; }
  if (!user.isAdmin && !user.approved) { alert('현재 계정은 관리자 승인 대기 상태임.'); return; }
  localStorage.setItem(DB_SESSION, JSON.stringify(user));
  checkAuth();
};
window.handleLogout = function() { localStorage.removeItem(DB_SESSION); location.reload(); };

// ===========================
// ★ 프로필
// ===========================
function loadUserProfile() {
  const user=normalizeUser(JSON.parse(localStorage.getItem(DB_SESSION)||'null')); if (!user) return;
  const setEl=(id,val)=>{const el=document.getElementById(id);if(el)el[el.tagName==='INPUT'?'value':'innerText']=val;};
  setEl('display-user-name', user.name||'사용자');
  setEl('display-user-dept', user.isAdmin ? '시스템 관리자' : ((user.dept||'소속 미입력') + (user.approved ? '' : ' · 승인대기')));
  if(document.getElementById('set-user-name')){
    document.getElementById('set-user-name').value=user.name||'';
    document.getElementById('set-user-email').value=user.email||'';
    document.getElementById('set-user-dept').value=user.dept||'';
    document.getElementById('set-user-phone').value=user.phone||'';
    document.getElementById('set-api-key').value=user.apiKey||'';
    ['set-current-pw','set-new-pw','set-confirm-pw'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  }
  var roleBadge=document.getElementById('user-role-badge');
  if(roleBadge){
    roleBadge.textContent = user.isAdmin ? '관리자 계정' : '일반 사용자';
    roleBadge.className = 'status-badge ' + (user.isAdmin ? 'admin' : 'soft');
  }
  var approvalBadge=document.getElementById('user-approval-badge');
  if(approvalBadge){
    var approved = !!(user.approved || user.isAdmin);
    approvalBadge.textContent = user.isAdmin ? '관리자 승인 완료' : (approved ? '승인 완료' : '승인 대기');
    approvalBadge.className = 'status-badge ' + (approved ? 'success' : 'warning');
  }
  var adminPanel=document.getElementById('admin-settings-panel');
  if(adminPanel) adminPanel.style.display = user.isAdmin ? 'block' : 'none';
  if(user.isAdmin) renderAdminApprovalList();
}
function updateUserDB(u, prevEmail){
  let users=getUsers();
  const lookup = prevEmail || u.email;
  const i=users.findIndex(function(x){ return x.email===lookup; });
  if(i<0){ alert('사용자 정보를 찾지 못했음. 다시 로그인해 주세요.'); return false; }
  users[i]=normalizeUser(u);
  saveUsers(users);
  localStorage.setItem(DB_SESSION, JSON.stringify(users[i]));
  loadUserProfile();
  return true;
}
window.saveProfileSettings=function(){
  let s=normalizeUser(JSON.parse(localStorage.getItem(DB_SESSION)||'null')); if(!s) return;
  const prevEmail=s.email;
  const nextEmail=(document.getElementById('set-user-email').value||'').trim();
  const users=getUsers();
  if(!nextEmail){ alert('이메일은 필수 입력 항목임.'); return; }
  if(nextEmail!==prevEmail && users.some(function(u){ return u.email===nextEmail; })){ alert('이미 사용 중인 이메일임.'); return; }
  s.name=(document.getElementById('set-user-name').value||'').trim();
  s.dept=(document.getElementById('set-user-dept').value||'').trim();
  s.phone=(document.getElementById('set-user-phone').value||'').trim();
  s.email=nextEmail;
  if(updateUserDB(s, prevEmail)) alert('계정 정보가 저장되었음.');
};
window.savePasswordSettings=function(){
  let s=normalizeUser(JSON.parse(localStorage.getItem(DB_SESSION)||'null')); if(!s) return;
  const currentPw=(document.getElementById('set-current-pw').value||'').trim();
  const nextPw=(document.getElementById('set-new-pw').value||'').trim();
  const confirmPw=(document.getElementById('set-confirm-pw').value||'').trim();
  if(!currentPw||!nextPw||!confirmPw){ alert('비밀번호 변경 항목을 모두 입력해주세요.'); return; }
  if(currentPw!==s.pw){ alert('현재 비밀번호가 일치하지 않음.'); return; }
  if(nextPw.length<4){ alert('새 비밀번호는 4자 이상으로 입력해주세요.'); return; }
  if(nextPw!==confirmPw){ alert('새 비밀번호 확인이 일치하지 않음.'); return; }
  s.pw=nextPw;
  if(updateUserDB(s)){
    ['set-current-pw','set-new-pw','set-confirm-pw'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
    alert('비밀번호가 변경되었음.');
  }
};
window.saveApiSettings=function(){
  let s=normalizeUser(JSON.parse(localStorage.getItem(DB_SESSION)||'null')); if(!s) return;
  s.apiKey=document.getElementById('set-api-key').value||'';
  if(updateUserDB(s)) alert('API 키가 저장되었음.');
};
function renderAdminApprovalList(){
  const panel=document.getElementById('admin-settings-panel');
  const listEl=document.getElementById('admin-pending-list');
  const countEl=document.getElementById('admin-pending-count');
  const session=normalizeUser(JSON.parse(localStorage.getItem(DB_SESSION)||'null'));
  if(!panel||!listEl||!countEl) return;
  if(!session||!session.isAdmin){ panel.style.display='none'; return; }
  panel.style.display='block';
  const pending=getUsers().filter(function(u){ return !u.isAdmin && !u.approved; });
  countEl.textContent='승인 대기 ' + pending.length + '명';
  if(!pending.length){
    listEl.innerHTML='<div class="empty-state"><div class="empty-state-emoji">✅</div><div class="empty-state-title">승인 대기 중인 사용자가 없음.</div><div class="empty-state-desc">새 회원가입이 들어오면 이 영역에서 바로 승인할 수 있음.</div></div>';
    return;
  }
  listEl.innerHTML=pending.map(function(u){
    return '<div class="admin-user-card">'
      + '<div class="admin-user-head">'
      +   '<div>'
      +     '<div class="admin-user-name">'+(u.name||'이름 미입력')+'</div>'
      +     '<div class="admin-user-meta">'+(u.email||'-')+' · '+(u.dept||'소속 미입력')+(u.phone?' · '+u.phone:'')+'</div>'
      +   '</div>'
      +   '<span class="status-badge warning">승인 대기</span>'
      + '</div>'
      + '<div class="admin-user-actions">'
      +   '<button class="btn-primary" style="padding:8px 14px;font-size:13px;" onclick="approveUser(\''+u.email+'\')">승인</button>'
      +   '<button class="btn-delete" onclick="rejectUser(\''+u.email+'\')">삭제</button>'
      + '</div>'
      + '</div>';
  }).join('');
}
window.approveUser=function(email){
  let users=getUsers();
  const idx=users.findIndex(function(u){ return u.email===email; });
  if(idx<0){ alert('대상 사용자를 찾지 못했음.'); return; }
  users[idx].approved=true;
  users[idx].approvedAt=new Date().toISOString();
  saveUsers(users);
  renderAdminApprovalList();
  alert('사용자 승인이 완료되었음.');
};
window.rejectUser=function(email){
  if(!confirm('승인 대기 사용자를 삭제하시겠습니까?')) return;
  let users=getUsers().filter(function(u){ return u.email!==email; });
  saveUsers(users);
  renderAdminApprovalList();
  alert('승인 대기 사용자가 삭제되었음.');
};

// ===========================
// ★ 탭 이동
// ===========================
window.showTab = function(tabId, updateUrl=true) {
  // 탭 전환 로딩바 애니메이션
  var bar = document.getElementById('tab-loading-bar');
  if (bar) {
    bar.style.display = 'block';
    bar.style.animation = 'none';
    void bar.offsetWidth; // reflow
    bar.style.animation = 'tabLoadBar 0.6s ease-out forwards';
    setTimeout(function(){ bar.style.display='none'; }, 650);
  }
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
    container.innerHTML=`<div class="company-empty-state"><div class="empty-icon">🏢</div><p>${keyword?'검색 결과가 없음.':'등록된 업체가 없음.'}</p><button class="btn-add-company" onclick="showCompanyForm()">＋ 업체 등록하기</button></div>`;
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
  setText('dashboard-recent-count', `${Math.min(reports.length,3)}건`);
  setText('dashboard-company-hint', `업체 ${companies.length}개`);
  setText('dashboard-support-count', `${supportDocs.length}건`);
  setText('dashboard-notice-count', `${notices.length}건`);

  const typeIcon=t=>({'경영진단':'📈','재무진단':'💰','사업계획서':'💡','정책자금매칭':'🎯','상권분석':'🏪','마케팅제안':'📢'}[t]||'📄');

  if (!reports.length) {
    listEl.innerHTML=`<div class="empty-state"><div class="empty-state-emoji">🗂️</div><div class="empty-state-title">최근 생성된 보고서가 없음.</div><div class="empty-state-desc">기업을 먼저 등록한 뒤 경영진단보고서 또는 AI 사업계획서를 생성해보세요.</div><button class="btn-add-small" onclick="showTab('report')">첫 보고서 만들기</button></div>`;
  } else {
    listEl.innerHTML=[...reports].reverse().slice(0,3).map(r=>`<div class="recent-report-item"><div class="report-type-icon">${typeIcon(r.type)}</div><div><div class="report-item-title">${r.title}</div><div class="report-item-company">${r.company}</div></div><div class="report-item-right"><span class="report-badge">${r.type}</span><span class="report-date">🕐 ${r.date}</span><button class="btn-small-outline" style="font-size:11px;padding:4px 8px;" onclick="viewReport('${r.id}')">보기</button></div></div>`).join('');
  }

  renderDashboardBoard('dashboard-support-docs', supportDocs, {
    emptyEmoji:'📄',
    emptyTitle:'등록된 지원사업 공문이 없음.',
    emptyDesc:'공문 등록 기능은 다음 단계에서 연결할 수 있음. 현재는 공간과 구조를 먼저 정리해두었음.',
    buttonText:'기능 준비 상태 보기',
    buttonAction:`dashboardFeatureSoon('지원사업 공문')`
  });

  renderDashboardBoard('dashboard-notice-list', notices, {
    emptyEmoji:'📢',
    emptyTitle:'등록된 공지사항이 없음.',
    emptyDesc:'운영 공지, 업무 알림, 배포 이력 등을 이 영역에 모아둘 수 있음.',
    buttonText:'기능 준비 상태 보기',
    buttonAction:`dashboardFeatureSoon('공지사항')`
  });
}

function renderDashboardBoard(targetId, items, options) {
  const el=document.getElementById(targetId); if(!el) return;
  if(!items.length){
    el.innerHTML=`<div class="bottom-empty"><div class="empty-state-emoji">${options.emptyEmoji||'📌'}</div><div class="empty-state-title">${options.emptyTitle||'등록된 데이터가 없음.'}</div><div class="empty-state-desc">${options.emptyDesc||''}</div>${options.buttonText?`<button class="btn-add-small" onclick="${options.buttonAction||''}">${options.buttonText}</button>`:''}</div>`;
    return;
  }
  el.innerHTML=`<div class="bottom-feed-list">${items.slice(0,3).map(item=>`<div class="bottom-feed-item"><div class="bottom-feed-top"><div class="bottom-feed-title">${item.title||'-'}</div><div class="bottom-feed-date">${item.date||''}</div></div><div class="bottom-feed-desc">${item.desc||item.description||''}</div></div>`).join('')}</div>`;
}

window.dashboardFeatureSoon = function(name){
  alert(`${name} 등록/관리 기능은 다음 단계에서 연결 가능함. 원하시면 이어서 구현해드릴게요.`);
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
  if(cBody){ const shown=companies.slice(0,3); cBody.innerHTML=shown.length?shown.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.rep||'-'}</td><td>${c.bizNum||'-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="showCompanyForm('${c.name}')">수정/보기</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">등록된 기업이 없음.</td></tr>'; }
  const rBody=document.getElementById('report-list-body');
  if(rBody){ const shown=[...reports].reverse().slice(0,3); rBody.innerHTML=shown.length?shown.map(r=>`<tr><td><span style="background:#eff6ff;color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${r.type}</span></td><td><strong>${r.company}</strong></td><td>${r.title}</td><td>${r.date}</td><td style="white-space:nowrap;"><button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button><button class="btn-delete" style="margin-left:6px;" onclick="deleteReport('${r.id}')">삭제</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">생성된 보고서가 없음.</td></tr>'; }
  const filterComp=document.getElementById('filter-company');
  if(filterComp){ filterComp.innerHTML='<option value="">전체 업체</option>'; companies.forEach(c=>filterComp.innerHTML+=`<option value="${c.name}">${c.name}</option>`); }
  updateDashboardReports(); renderCompanyCards();
};

// ===========================
// ★ 보고서 목록 서브뷰
// ===========================
window.showReportListSummary=function(){document.getElementById('rl-summary').style.display='block';document.getElementById('rl-companies').style.display='none';document.getElementById('rl-reports').style.display='none';updateDataLists();};
window.showFullCompanies=function(){document.getElementById('rl-summary').style.display='none';document.getElementById('rl-companies').style.display='block';document.getElementById('rl-reports').style.display='none';const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');const tbody=document.getElementById('company-full-body');if(tbody){tbody.innerHTML=companies.length?companies.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.rep||'-'}</td><td>${c.bizNum||'-'}</td><td>${c.industry||'-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="showCompanyForm('${c.name}')">수정/보기</button></td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">등록된 기업이 없음.</td></tr>';}};
window.showFullReports=function(){document.getElementById('rl-summary').style.display='none';document.getElementById('rl-companies').style.display='none';document.getElementById('rl-reports').style.display='block';const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');const filterComp=document.getElementById('filter-company');if(filterComp){filterComp.innerHTML='<option value="">전체 업체</option>';companies.forEach(c=>filterComp.innerHTML+=`<option value="${c.name}">${c.name}</option>`);}renderFullReports();};
window.renderFullReports=function(){const tf=document.getElementById('filter-type')?.value||'';const cf=document.getElementById('filter-company')?.value||'';const reports=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');const filtered=[...reports].reverse().filter(r=>(!tf||r.type===tf)&&(!cf||r.company===cf));const countEl=document.getElementById('filter-result-count');if(countEl)countEl.textContent=`총 ${filtered.length}건`;const tbody=document.getElementById('report-full-body');if(!tbody)return;tbody.innerHTML=filtered.length?filtered.map(r=>`<tr><td><span style="background:#eff6ff;color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${r.type}</span></td><td><strong>${r.company}</strong></td><td>${r.title}</td><td>${r.date}</td><td style="white-space:nowrap;"><button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button><button class="btn-delete" style="margin-left:6px;" onclick="deleteReportFull('${r.id}')">삭제</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">조건에 맞는 보고서가 없음.</td></tr>';};
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
  alert('기업 정보가 저장되었음!');
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
  if(!apiKey){
    alert('⚠️ Gemini API 키가 설정되지 않았음.\n\n설정 방법:\n1. 왼쪽 메뉴 하단 [설정] 탭 클릭\n2. API 키 항목에 Gemini API 키 입력\n3. 저장 후 다시 시도');
    showTab('settings');
    return null;
  }
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
      if(!text) throw new Error('AI 응답이 비어 있음.');
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
    var parsed;
    if(start>=0&&end>=0) parsed=JSON.parse(clean.slice(start,end+1));
    else parsed=JSON.parse(clean);
    return normalizeKoreanEndings(parsed);
  }catch(e){console.error('JSON 파싱 실패:',e,raw.slice(0,200));alert('AI 응답 파싱 오류. 다시 시도해주세요.');return null;}
}


// ===========================
// ★ 보고서 CSS (A4 가로형 최적화)
// ===========================
function tplStyle(color, orientation) {
  var c = color||'#3b82f6';
  var layout = getReportLayoutConfig(orientation === 'landscape');
  return '<style>'
  + '* { box-sizing:border-box; }'
  + '.rp-wrap { font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif; background:#e8eaed; padding:'+layout.wrapPadding+'; width:100%; max-width:none; }'
  + '.rp-wrap * { font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif; }'

  // ── 표지 ──
  + '.rp-cover { background:white; border-radius:8px; margin-bottom:14px; padding:'+layout.coverPadding+'; position:relative; height:'+layout.contentHeight+'; min-height:'+layout.contentHeight+'; display:flex; flex-direction:column; overflow:hidden; }'
  + '.rp-cbar  { position:absolute; left:0; top:0; bottom:0; width:12px; background:'+c+'; }'
  + '.rp-cbadge{ font-size:12px; font-weight:700; padding:4px 12px; border-radius:4px; display:inline-block; margin-bottom:8px; letter-spacing:0.3px; }'
  + '.rp-ctitle{ font-size:24px; font-weight:700; color:#0f172a; margin-bottom:4px; letter-spacing:-0.5px; line-height:1.2; }'
  + '.rp-csub  { font-size:13px; color:#64748b; margin-bottom:14px; font-weight:500; }'
  + '.rp-cinfo { margin-top:auto; }'
  // 표지 기업정보 테이블 — 줄바꿈 없이
  + '.rp-cvtbl { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:10px; border-top:2px solid '+c+'; }'
  + '.rp-cvtbl th { background:#f8fafc; border:1px solid #e2e8f0; padding:8px 12px; text-align:left; font-weight:700; color:'+c+'; white-space:nowrap; }'
  + '.rp-cvtbl td { border:1px solid #e2e8f0; padding:8px 12px; color:#1e293b; font-weight:500; }'
  + '.rp-cfoot { display:flex; justify-content:space-between; font-size:13px; color:#64748b; padding-top:10px; border-top:1px solid #e2e8f0; margin-top:10px; font-weight:500; }'
  + '.rp-cover-unified { padding:0; justify-content:space-between; background:#ffffff; }'
  + '.rp-cover-unified::before { content:""; position:absolute; left:34px; right:34px; top:34px; height:8px; background:'+c+'; }'
  + '.rp-cover-unified::after { content:""; position:absolute; left:48px; top:42px; bottom:34px; width:1px; background:#e5e7eb; }'
  + '.rp-cover-top { padding:86px 62px 0 62px; flex:0 0 auto; position:relative; z-index:1; }'
  + '.rp-cover-main { flex:1 1 auto; min-height:0; display:flex; align-items:flex-start; justify-content:center; padding:54px 56px 0 56px; position:relative; z-index:1; }'
  + '.rp-cover-main-inner { width:100%; text-align:center; }'
  + '.rp-cover-kicker { display:none; }'
  + '.rp-cover-title { font-size:54px; font-weight:900; color:#3f3f46; letter-spacing:-2.2px; line-height:1.1; text-align:center; margin:0; }'
  + '.rp-cover-sub { display:none; }'
  + '.rp-cover-divider { width:82%; height:1px; border-radius:0; background:#cbd5e1; margin:28px auto 30px; opacity:1; }'
  + '.rp-cover-company-label { font-size:18px; font-weight:700; color:#3f3f46; line-height:1.5; text-align:center; }'
  + '.rp-cover-company-name { font-size:24px; font-weight:700; color:#111827; line-height:1.5; text-align:center; }'
  + '.rp-cover-year { font-size:22px; font-weight:500; color:#111827; line-height:1.5; text-align:center; }'
  + '.rp-cover-bottom { flex:0 0 auto; padding:0 56px 34px 56px; position:relative; z-index:1; }'
  + '.rp-cover-meta { display:flex; justify-content:space-between; gap:18px; padding:14px 8px; border-top:1px solid #d1d5db; border-bottom:1px solid #d1d5db; font-size:11px; color:#3f3f46; font-weight:700; white-space:nowrap; }'
  + '.rp-cover-brand { text-align:center; padding-top:20px; }'
  + '.rp-cover-brand-name { font-size:34px; font-weight:900; color:'+c+'; letter-spacing:-1px; line-height:1.1; }'
  + '.rp-cover-brand-contact { margin-top:8px; font-size:10px; color:#52525b; line-height:1.5; }'

  // ── 페이지 (A4 landscape 기준) ──
  + '.rp-page { background:white; border-radius:8px; margin-bottom:14px; padding:'+layout.pagePadding+'; height:'+layout.contentHeight+'; min-height:'+layout.contentHeight+'; display:flex; flex-direction:column; overflow:hidden; }'
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
  + '.rp-cat { background:white; border-radius:8px; margin-bottom:12px; padding:18px 20px; page-break-inside:avoid; break-inside:avoid; }'
  + '.rp-flow { background:#e8eaed; }'
  + '.rp-flow-tight .rp-cat { margin-bottom:8px; page-break-inside:auto; break-inside:auto; }'
  + '.rp-flow-tight .rp-section, .rp-flow-tight .rp-fb, .rp-flow-tight .rp-rank, .rp-flow-tight .rp-cert, .rp-flow-tight .rp-chk { page-break-inside:avoid; break-inside:avoid; }'
  + '@media print { .rp-flow .rp-cat { border-radius:0 !important; margin:0 !important; page-break-inside:avoid !important; break-inside:avoid !important; } .rp-flow-tight .rp-cat { page-break-inside:auto !important; break-inside:auto !important; } }'
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

// ═══════════════════════════════════════
// ★ 한국어 끝맺음 후처리 (JSON 파싱 후)
// ═══════════════════════════════════════
function normalizeKoreanEndings(obj) {
  if (typeof obj === 'string') {
    return obj
      .replace(/겠습니다/g, '겠음')
      .replace(/있습니다/g, '있음')
      .replace(/없습니다/g, '없음')
      .replace(/됩니다/g, '됨')
      .replace(/합니다/g, '함')
      .replace(/입니다/g, '임')
      .replace(/습니다/g, '음')
      .replace(/십니다/g, '심')
      .replace(/니다/g, '음');
  }
  if (Array.isArray(obj)) return obj.map(normalizeKoreanEndings);
  if (obj && typeof obj === 'object') {
    var r = {};
    Object.keys(obj).forEach(function(k){ r[k] = normalizeKoreanEndings(obj[k]); });
    return r;
  }
  return obj;
}


// ── 섹션 박스 생성기
function mgmtSec(title, icon, color, items, extraCSS) {
  var bg = extraCSS||'background:#f8fafc';
  return '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:13px 16px;'+bg+'">'
    +'<div style="font-size:13px;font-weight:700;color:'+color+';margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e9ecef">'+icon+' '+title+'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +items.map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#334155;line-height:1.6"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:'+color+'"></div><span>'+t+'</span></div>';}).join('')
    +'</div></div>';
}

function mgmtWideSec(title, icon, color, items, extraCSS) {
  var bg = extraCSS||'background:#f8fafc';
  return '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;'+bg+'">'
    +'<div style="font-size:14px;font-weight:800;color:'+color+';margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(148,163,184,0.25)">'+icon+' '+title+'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 18px">'
    +items.map(function(t){return '<div style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#334155;line-height:1.7"><div style="width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:6px;background:'+color+'"></div><span>'+t+'</span></div>';}).join('')
    +'</div></div>';
}

// ── 컨설턴트 피드백 박스
function mgmtFB(items) {
  return '<div style="border-radius:8px;padding:12px 15px;border:1px solid #fed7aa;border-left:4px solid #f97316;background:#fff7ed">'
    +'<div style="font-size:13px;font-weight:700;color:#c2410c;margin-bottom:8px">🔍 컨설턴트 피드백</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +items.map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#334155;line-height:1.6"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#f97316"></div><span>'+t+'</span></div>';}).join('')
    +'</div></div>';
}

// ── 로드맵 단계 박스
function mgmtRoadmapPhase(phaseLabel, bgColor, borderColor, textColor, items) {
  return '<div style="border-radius:10px;padding:13px 16px;background:white;border:1px solid #e2e8f0;border-top:4px solid '+borderColor+'">'
    +'<div style="font-size:13px;font-weight:800;color:'+textColor+';margin-bottom:10px;display:flex;align-items:center;gap:8px">'
    +'<span style="background:'+bgColor+';border-radius:20px;padding:3px 12px">'+phaseLabel+'</span>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +items.map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#334155;line-height:1.6"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:'+borderColor+'"></div><span>'+t+'</span></div>';}).join('')
    +'</div></div>';
}

// ── 페이지 래퍼 (컨설턴트용 등 페이지 단위 보고서용)
function mgmtPage(num, title, sub, accentColor, content) {
  var numBg = accentColor==='#1e293b'?'#f1f5f9':'#eff6ff';
  var numTc = accentColor==='#1e293b'?'#475569':accentColor;
  return '<div class="rp-page">'
    +'<div class="rp-ph">'
    +'<div class="rp-pnum" style="background:'+numBg+';color:'+numTc+'">'+num+'</div>'
    +'<span class="rp-ptitle">'+title+'</span>'
    +'<span class="rp-psub">'+sub+'</span>'
    +'</div>'
    +'<div class="rp-body">'+content+'</div>'
    +'</div>';
}

// ═══════════════════════════════════════
// ★ 통합 표지 — 모든 보고서 공통
//   두 번째 시안 기준의 정중앙 표지 레이아웃
// ═══════════════════════════════════════
function buildUnifiedCover(reportTitle, versionLabel, cData, dateStr, accentColor) {
  var session = JSON.parse(localStorage.getItem(DB_SESSION)||'{}');
  var cName = session.name||'담당 컨설턴트';
  var cDept = session.dept||'솔루션빌더스';
  var safeTitle = String(reportTitle||'보고서').replace(/^AI\s*/,'').trim();
  var companyName = (cData && cData.name) ? cData.name : '기업명 미입력';
  var dateObj = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(dateObj.getTime())) dateObj = new Date();
  var yyyy = dateObj.getFullYear();
  var mm = dateObj.getMonth() + 1;
  var issueMonth = yyyy + '년 ' + mm + '월';

  return '<div class="rp-cover rp-cover-unified" style="background:white;position:relative">'
    +'<div class="rp-cover-top"></div>'
    +'<div class="rp-cover-main">'
    +'<div class="rp-cover-main-inner">'
    +'<div class="rp-cover-title">'+safeTitle+'</div>'
    +'<div class="rp-cover-divider"></div>'
    +'<div class="rp-cover-company-name">'+companyName+'</div>'
    +'</div>'
    +'</div>'
    +'<div class="rp-cover-bottom">'
    +'<div class="rp-cover-meta">'
    +'<span>작성일: '+issueMonth+'</span>'
    +'<span>담당자: '+cName+'</span>'
    +'</div>'
    +'<div class="rp-cover-brand">'
    +'<div class="rp-cover-brand-name">'+cDept+'</div>'
    +'</div>'
    +'</div>'
    +'</div>';
}


function buildCoverHTML(cData, config, rev, dateStr) {
  var color = config.borderColor||'#3b82f6';
  var vLabel = config.version==='consultant'?'컨설턴트용':config.version==='client'?'기업전달용':(config.vLabel||'');
  return buildUnifiedCover(config.title||config.reportKind||'보고서', vLabel, cData, dateStr, color);
}

function mgmtCover(cData, rev, exp, dateStr, version) {
  var isConsultant = (version === 'consultant');
  var color = isConsultant ? '#334155' : '#2563eb';
  var vLabel = isConsultant ? '컨설턴트용' : '기업전달용';
  return buildUnifiedCover('AI 경영진단보고서', vLabel, cData, dateStr, color);
}


// ═══════════════════════════════════════
// ★ 경영진단 기업전달용 — 자연 흐름 레이아웃
//   페이지 강제 없음, 카테고리 단위 break-inside:avoid
// ═══════════════════════════════════════
function buildMgmtClientHTML(d, cData, rev, dateStr) {
  var C = '#2563eb';
  var exp = calcExp(cData, rev);
  var radar = (d.radar||[72,80,68,70,58]).join(',');
  var bars  = d.marketing_bars||{finance:82,strategy:80,operation:68,hr:64,it:55};
  var nm = cData.name;
  var gradeVal = (d.grade||'A-').replace(/등급/g,'').trim();
  var growRate = (rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'-';
  var certs = d.certs||[
    {name:'벤처기업 인증',effect:nm+'의 기술력 인정 — 중진공·기보 우대금리 + 추가 자금 한도 2억 확보 가능',amount:'+2억',period:'6개월 내'},
    {name:'이노비즈 인증',effect:nm+'의 기술혁신형 기업 인증 — 중진공 기술개발자금 신청 자격 부여',amount:'+3억',period:'1년 내'},
    {name:'기업부설연구소',effect:nm+'의 R&D 세액공제 25% + 기보 기술보증 우대 동시 적용 가능',amount:'+1.5억',period:'세액공제 병행'},
    {name:'HACCP 인증',effect:nm+' 제품의 대형마트·단체급식 납품 채널 확대 직접 연결',amount:'채널↑',period:'매출 확대'}
  ];
  var certBgs=['#f0fdf4','#eff6ff','#fdf4ff','#fff7ed'];
  var certIcons=['🏆','📜','🔬','✅'];
  var totalC = certs.reduce(function(s,c){var n=parseFloat(c.amount.replace(/[^0-9.]/g,''));return s+(isNaN(n)?0:n);},0);

  // 카테고리 헬퍼 — page-break-inside:avoid
  function cat(numLabel, title, sub, content) {
    return '<div class="rp-cat">'
      +'<div class="rp-ph">'
      +'<div class="rp-pnum" style="background:#eff6ff;color:'+C+'">'+numLabel+'</div>'
      +'<span class="rp-ptitle">'+title+'</span>'
      +'<span class="rp-psub">'+sub+'</span>'
      +'</div>'
      +'<div class="rp-body">'+content+'</div>'
      +'</div>';
  }

  var cover = mgmtCover(cData, rev, exp, dateStr, 'client');

  // ── CAT1: 경영진단 개요 ──────────────────
  var _nw = 'white-space:nowrap;';
  var _th = 'background:#eff6ff;padding:10px 14px;color:'+C+';font-weight:700;'+_nw+'text-align:left;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;';
  var _td = 'padding:10px 14px;font-weight:600;'+_nw+'border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;';
  var _thb= 'background:#eff6ff;padding:10px 14px;color:'+C+';font-weight:700;'+_nw+'text-align:left;border-right:1px solid #e2e8f0;';
  var _tdb= 'padding:10px 14px;font-weight:600;'+_nw+'border-right:1px solid #e2e8f0;';

  var infoTbl = '<div style="border:1.5px solid #bfdbfe;border-radius:10px;overflow:hidden;margin-bottom:12px">'
    +'<table style="width:100%;border-collapse:collapse;font-size:13px">'
    +'<tr><th style="'+_th+'width:13%">기업명</th><td style="'+_td+'">'+nm+'</td><th style="'+_th+'width:10%">대표자</th><td style="'+_td+'">'+(cData.rep||'-')+'</td><th style="'+_th+'width:10%">업종</th><td style="padding:10px 14px;font-weight:600;'+_nw+'border-bottom:1px solid #e2e8f0">'+(cData.industry||'-')+'</td></tr>'
    +'<tr><th style="'+_th+'">설립일</th><td style="'+_td+'">'+(cData.bizDate||'-')+'</td><th style="'+_th+'">사업자번호</th><td style="'+_td+'">'+(cData.bizNum||'-')+'</td><th style="'+_th+'">상시근로자</th><td style="padding:10px 14px;font-weight:600;'+_nw+'border-bottom:1px solid #e2e8f0">'+(cData.empCount||'-')+'명</td></tr>'
    +'<tr><th style="'+_thb+'">전년 매출</th><td style="'+_tdb+'">'+fKRW(rev.y25)+'</td><th style="'+_thb+'">금년 예상</th><td style="'+_tdb+'">'+fKRW(exp)+'</td><th style="'+_thb+'">핵심아이템</th><td style="padding:10px 14px;font-weight:600;'+_nw+'">'+(cData.coreItem||'-')+'</td></tr>'
    +'</table></div>';

  var gradeCards = '<div style="display:flex;gap:10px;margin-bottom:12px;align-items:stretch">'
    +'<div style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:10px;padding:16px 20px;min-width:160px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center">'
    +'<div style="font-size:11px;color:#64748b;margin-bottom:6px">AI 종합 진단 등급</div>'
    +'<div style="font-size:34px;font-weight:900;color:'+C+';line-height:1;margin-bottom:5px">'+(gradeVal)+'&nbsp;등급</div>'
    +'<div style="font-size:12px;color:#1e40af;font-weight:700">'+(d.grade_desc||'고성장 유망기업')+'</div>'
    +'</div>'
    +'<div style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:10px">'
    +[['📈',growRate,'매출성장률','#16a34a'],['💰',fKRW(exp),'금년예상',C],['👥',(cData.empCount||'0')+'명','상시근로자','#7c3aed'],['🏆',(gradeVal)+'등급','종합등급',C]].map(function(v){
      return '<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:12px 8px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:20px;margin-bottom:5px">'+v[0]+'</div><div style="font-size:14px;font-weight:800;color:'+v[3]+';margin-bottom:3px">'+v[1]+'</div><div style="font-size:11px;color:#64748b">'+v[2]+'</div></div>';
    }).join('')
    +'</div></div>';

  var cat1 = cat(1,'경영진단 개요','기업현황 · 종합등급 · 진단목적',
    infoTbl + gradeCards
    + mgmtSec('진단 목적 및 방향','📌',C, d.overview||[
        nm+'는 핵심 사업을 주력으로 영위하며 최근 괄목할 만한 매출 성장을 기록하며 시장 내 입지를 빠르게 확대하고 있음',
        '전년 대비 폭발적 매출 성장 추이를 분석하고 시장 내 경쟁 우위 지속을 위한 전략적 포지셔닝 방향을 제시함',
        nm+'의 공급망 확보와 국내 유통 채널 다변화를 통해 경쟁 우위를 확보하고 있으며 향후 사업 다각화 가능성이 높음',
        '중소기업 정책자금 지원 요건을 점검하고 신청 가능 자금 목록 및 최적 조달 전략을 수립함',
        '벤처·이노비즈·HACCP 인증 취득을 통한 가점 확보로 정책자금 조달 한도를 극대화하는 방안을 제안함',
        '단기·중기·장기 성장 로드맵을 기반으로 실행 가능한 경영 개선 우선순위 액션플랜을 수립함'
      ])
    +'<div style="height:10px"></div>'
    +'<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 15px">'
    +'<div style="font-size:13px;font-weight:700;color:#1e40af;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #dbeafe">✅ 진단 결과 요약</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +(d.summary||[
      nm+'는 단기간의 폭발적 매출 성장과 독창적 사업 역량을 보유한 고성장 잠재력 기업으로 평가됨',
      '인증 취득 로드맵 실행 시 추가 정책자금 조달로 성장 가속화와 시장 내 독점적 포지션 강화가 기대됨',
      '전략적 채널 확대와 조직 역량 강화 병행으로 3년 내 시장 리더십 확보가 현실적인 목표임',
      '컨설턴트 밀착 지원 하에 인증·자금·채널 동시 추진으로 종합 성장 전략 실행을 강력히 권고함'
    ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#1e40af;line-height:1.6"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:'+C+'"></div><span>'+t+'</span></div>';}).join('')
    +'</div></div>'
  );

  // ── CAT2: 재무 현황 ────────────────────────
  var cat2 = cat(2,'재무 현황 분석','매출 추이 · 수익성 · 개선 방향',
    '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 15px;background:#f8fafc;margin-bottom:10px">'
    +'<div style="font-size:13px;font-weight:700;color:'+C+';margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e9ecef">📈 연도별 매출 추이</div>'
    +'<div class="rp-ch" style="height:140px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px">'
    +[['전년 매출',fKRW(rev.y25),'2025년','#475569'],['금년 예상',fKRW(exp),'연환산',C],['YoY 성장',growRate,'전년 대비','#16a34a'],['2년 성장',(rev.y23>0&&rev.y25>0?'+'+Math.round(((rev.y25-rev.y23)/rev.y23)*100)+'%':'분석중'),'2년누계','#16a34a']].map(function(v){
      return '<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:9px;text-align:center"><div style="font-size:11px;color:#94a3b8;margin-bottom:2px">'+v[0]+'</div><div style="font-size:16px;font-weight:800;color:'+v[3]+'">'+v[1]+'</div><div style="font-size:10px;color:#94a3b8;margin-top:1px">'+v[2]+'</div></div>';
    }).join('')
    +'</div></div>'
    +'<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:10px">'
    + mgmtWideSec('재무 강점 분석','💪','#16a34a', d.finance_strengths||[
        nm+'는 단기간에 폭발적 매출 성장을 달성하며 시장성을 완벽히 검증, 투자·자금 심사 신뢰도가 매우 높음',
        '핵심 아이템의 독창성과 차별성을 바탕으로 높은 마진율을 유지하며 수익성 기반을 안정적으로 구축함',
        '정책자금 중심 저금리 차입 구조로 금융 비용 부담을 최소화하고 재무 건전성을 유지하고 있음',
        '영업이익률이 동업종 평균을 상회하여 수익 구조 건전성이 입증되며 향후 투자 여력이 충분함',
        '빠른 매출 성장 대비 비용 구조가 효율적으로 관리되어 이익 레버리지 효과가 극대화되고 있음',
        '안정적인 공급처 확보로 원가 경쟁력을 유지하며 수익 극대화에 기여하는 구조를 보유함'
      ], 'background:#f0fdf4;border-color:#86efac')
    + mgmtWideSec('개선 필요 포인트','⚠️','#f97316', d.finance_risks||[
        nm+'의 단일 아이템 매출 의존도가 높아 포트폴리오 다각화를 통한 매출 안정성 강화가 시급히 요구됨',
        '급성장에 따른 운전자본 수요 증가에 대비하여 정책자금 조달 계획을 조기에 수립하고 실행해야 함',
        '현금흐름 관리 체계가 미흡하여 월별 손익계산서 작성 및 현금흐름표 정기 관리 시스템 구축이 필요함',
        '원재료/상품 조달의 단일 공급처 의존은 공급망 리스크를 높이므로 대체 공급처 확보가 필요함'
      ], 'background:#fff7ed;border-color:#fed7aa')
    +'</div>'
    +'<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 15px;background:#f8fafc">'
    +'<div style="font-size:13px;font-weight:700;color:'+C+';margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e9ecef">📊 영역별 재무 지표</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +[['매출 성장률',bars.finance||82],['매출이익률',Math.max((bars.finance||82)-8,65)],['현금흐름 안정성',Math.max((bars.finance||82)-20,55)],['부채 안정성',Math.min((bars.finance||82)+5,90)]].map(function(b){
      var bc=b[1]<60?'#f97316':C;
      return '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>'+b[0]+'</span><span style="font-weight:700;color:'+bc+'">'+b[1]+'점</span></div><div style="height:7px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;border-radius:4px;width:'+b[1]+'%;background:'+bc+'"></div></div></div>';
    }).join('')
    +'</div></div>'
  );

  // ── CAT3: 전략·마케팅 ───────────────────────
  var cat3 = cat(3,'전략 및 마케팅 분석','역량 레이더 · 마케팅 포지셔닝',
    '<div style="display:grid;grid-template-columns:1.18fr 0.82fr;gap:12px;margin-bottom:10px">'
    +'<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 15px;background:#f8fafc">'
    +'<div style="font-size:13px;font-weight:700;color:'+C+';margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e9ecef">🎯 경영 역량 진단 레이더</div>'
    +'<div class="rp-ch" style="height:235px;padding:14px 12px 10px"><canvas id="rp-radar" data-scores="'+radar+'" style="width:100%;height:100%"></canvas></div>'
    +'</div>'
    +'<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 15px;background:#f8fafc">'
    +'<div style="font-size:13px;font-weight:700;color:'+C+';margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e9ecef">📊 영역별 역량 점수</div>'
    +[['재무 건전성',bars.finance||82],['전략 / 마케팅',bars.strategy||80],['운영 / 생산',bars.operation||68],['인사 / 조직',bars.hr||64],['IT / 디지털',bars.it||55]].map(function(b){
      var warn=b[1]<65,bc=warn?'#f97316':C;
      return '<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>'+b[0]+'</span><span style="font-weight:700;color:'+bc+'">'+b[1]+'점</span></div><div style="height:7px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;border-radius:4px;width:'+b[1]+'%;background:'+bc+'"></div></div></div>';
    }).join('')
    +'</div></div>'
    + mgmtSec('마케팅 현황 분석','📣',C, d.marketing||[
        nm+'의 핵심 아이템은 독창성과 품질로 구매자 사이에서 자연 입소문 마케팅의 강력한 동력으로 작용함',
        'SNS·유튜브 쇼츠 등 콘텐츠 마케팅 강화로 브랜드 인지도를 집중 확산시킬 필요가 있음',
        '충성 고객층 기반의 재구매율 제고 전략과 리뷰 마케팅 활성화가 매출 안정성 확보에 핵심 역할을 함',
        'B2B 납품 채널 확장을 통해 안정적 매출 기반 조성이 가능한 충분한 여건이 갖추어져 있음',
        '온라인 플랫폼 입점 확대와 자사몰 구축을 통한 유통 채널 다각화가 필요한 시점임',
        '전문 박람회 참가 및 업계 네트워크 활용으로 신규 B2B 거래처 발굴을 확대해야 함'
      ])
    +'<div style="height:10px"></div>'
    + mgmtSec('전략 포지셔닝 방향','🔷','#7c3aed', d.marketing_items||[
        '틈새시장 선점 전략으로 경쟁사 대비 차별화된 프리미엄 포지션을 구축하여 가격 결정력을 확보해야 함',
        '핵심 경쟁력을 마케팅 메시지 전면에 배치하여 브랜드 신뢰도와 시장 내 인지도를 높여야 함',
        '정기구독 모델 도입으로 재구매 사이클을 단축하고 고객 생애가치(LTV)를 극대화해야 함',
        'B2B 영업 역량 강화: 기존 거래처 관리 효율화 및 신규 거래처 발굴 영업 프로세스 체계화 필요'
      ], 'background:#fdf4ff;border-color:#d8b4fe')
  );

  // ── CAT4: 인사·운영·IT ──────────────────────
  var cat4 = cat(4,'인사·조직 및 운영·생산·IT 분석','조직 역량 · 생산 효율 · 디지털 현황',
    mgmtSec('인사·조직 현황','👥',C, d.hr||[
      nm+'는 소수 정예 팀 구성으로 핵심 역량에 집중하며 인당 생산성이 업종 평균 대비 우수한 수준임',
      '대표자 중심의 신속한 의사결정 구조로 시장 변화에 빠르게 대응하는 기민성(Agility)을 보유하고 있음',
      '핵심 인력 이탈 리스크를 관리하기 위한 성과 공유 제도 및 인센티브 체계 도입이 필요한 시점임',
      '사업 성장에 따른 영업·마케팅·운영 전문 인력 채용 계획을 조기에 수립해야 함',
      '직무 기술서 및 업무 매뉴얼화를 통해 성장 기반의 운영 인프라를 구축해야 함',
      '초기 멤버로 합류할 인재에게 성과급·스톡옵션 등 강력한 인센티브 제도를 마련하여 동기 부여가 필요함'
    ])
    +'<div style="height:10px"></div>'
    + mgmtSec('운영·생산 현황','🏭',C, d.ops||[
      nm+'의 운영 방식은 초기 비용 효율을 극대화하는 구조로 고정비 부담을 최소화하고 있음',
      '핵심 아이템의 안정적인 공급처 발굴 및 계약을 통해 공급망 리스크를 최소화하고 있음',
      '품질관리 체계를 고도화하여 고객 불만율을 낮추고 B2B 납품 가능성을 높여야 함',
      '원재료 조달 프로세스 최적화(선매입·재고 관리)를 통해 원가 변동성을 줄이고 공급 안정성을 확보해야 함',
      '물류 및 배송 프로세스 표준화를 통해 서비스 품질을 일관되게 유지할 체계를 구축해야 함',
      '증가하는 수요에 대응하기 위한 창고 확보 및 물류 시스템 고도화 계획을 조기 수립해야 함'
    ])
    +'<div style="height:10px"></div>'
    + mgmtSec('IT·디지털 현황','💻',C, d.it||[
      'ERP 시스템 도입으로 재고·매출·회계 데이터를 통합 관리하여 의사결정 속도와 정확도를 높여야 함',
      'CRM 시스템 도입으로 고객 데이터를 통합 분석하고 재구매 유도 및 타겟 마케팅을 체계화해야 함',
      'SNS 채널 운영 역량을 내재화하여 외부 의존도를 낮추고 마케팅 비용을 절감하는 구조를 만들어야 함',
      '자사몰 구축을 통해 플랫폼 수수료를 절감하고 고객 데이터를 직접 확보·활용할 수 있음',
      '온라인 B2B 플랫폼 구축을 통해 고객 편의성을 높이고 신규 유입 채널을 다각화해야 함',
      '클라우드 기반 데이터 관리 및 백업 시스템을 구축하여 중요 사업 정보를 안전하게 보호해야 함'
    ])
  );

  // ── CAT5: 가점추천 ──────────────────────────
  var totalC2 = certs.reduce(function(s,c){var n=parseFloat(c.amount.replace(/[^0-9.]/g,''));return s+(isNaN(n)?0:n);},0);
  var cat5 = cat(5,'가점추천','인증 취득으로 정책자금 한도 최대화',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">'
    +'<div>'
    +'<div style="font-size:13px;font-weight:700;color:'+C+';margin-bottom:10px">📜 추천 인증 목록 (우선순위 순)</div>'
    +certs.map(function(c,i){
      return '<div style="display:flex;align-items:flex-start;gap:10px;background:white;border:1px solid #e2e8f0;border-radius:9px;padding:11px 13px;margin-bottom:9px">'
        +'<div style="width:32px;height:32px;border-radius:7px;background:'+certBgs[i%4]+';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">'+certIcons[i%4]+'</div>'
        +'<div style="flex:1"><div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:2px">'+c.name+'</div><div style="font-size:12px;color:#64748b;line-height:1.5">'+c.effect+'</div></div>'
        +'<div style="text-align:right;flex-shrink:0;margin-left:8px"><div style="font-size:13px;font-weight:800;color:'+C+'">'+c.amount+'</div><div style="font-size:11px;color:#94a3b8">'+c.period+'</div></div>'
        +'</div>';
    }).join('')
    +'</div>'
    +'<div style="display:flex;flex-direction:column;gap:10px">'
    +'<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:16px;text-align:center">'
    +'<div style="font-size:13px;font-weight:700;color:#1e40af;margin-bottom:5px">인증 완료 시 총 추가 조달 가능 한도</div>'
    +'<div style="font-size:28px;font-weight:900;color:'+C+';line-height:1.2">최대 +'+(totalC2>0?totalC2+'억원':'6.5억원')+'</div>'
    +'<div style="font-size:12px;color:#64748b;margin-top:5px">현재 신청 가능 한도 + 인증 취득 후 추가 조달 합계</div>'
    +'</div>'
    + mgmtSec('취득 우선순위 전략','🗓',C,[
        '1순위: 벤처인증 (약 6개월) — 즉각적 자금 한도 확대 효과 최대, 준비 난이도 낮음. 현재 매출로 충분히 취득 가능',
        '2순위: 이노비즈 (1년 내) — 벤처인증 후 연속 추진. 중진공 기술개발자금 자격 + 기보 우대보증 동시 적용',
        '3순위: 기업부설연구소 (중기) — 이노비즈와 병행, R&D 세액공제 25% 절세 효과 극대화 전략으로 추진',
        '4순위: HACCP (장기) — 대형마트·단체급식 채널 확보 후 안정적 B2B 매출 기반 마련 및 신뢰도 강화',
        '인증 준비는 사업계획서 작성과 병행하여 시너지를 극대화하고 컨설턴트와 일정 조율 강력 권고',
        '인증별 담당 기관 사전 접촉 및 예비 상담을 통해 요건 충족 여부를 조기에 점검하고 준비 착수 필요'
      ])
    +'</div></div>'
  );

  // ── CAT6: 성장 로드맵 ───────────────────────
  var rm_s = d.roadmap_short||['벤처기업 인증 신청 착수 및 서류 준비 완료','정책자금 신청서류 일괄 준비 및 착수','월별 현금흐름 관리 체계 즉시 구축','SNS 채널 최적화 및 온라인 입점 준비','핵심 인력 채용 계획 수립 및 공고 시작','주요 고객사 만족도 조사 실시 및 피드백 수집'];
  var rm_m = d.roadmap_mid||['정책자금 조달 완료 및 운영 기반 확충','이노비즈 인증 취득 추진 및 기술 역량 강화','B2B 납품 채널 2~3곳 확보 및 수익 기반 마련','자사몰 구축 및 정기구독 서비스 론칭 완료','ERP·CRM 도입 및 데이터 기반 경영 체계 구축','마케팅 전담 인력 채용 완료 및 SNS 채널 확장'];
  var rm_l = d.roadmap_long||['매출 목표 달성 및 신제품 라인업 확장 추진','기업부설연구소 설립 및 R&D 세액공제 활용','HACCP 인증 완료 및 대형마트 납품 채널 확보','해외 수출 타당성 검토 및 글로벌 진출 준비','자동화 운영 체계 완성 및 원가율 최적화 실현','상시근로자 10인 이상 규모 성장 및 조직 체계화'];

  var cat6 = cat(6,'개선 방향 및 성장 로드맵','단기·중기·장기 실행 계획',
    mgmtRoadmapPhase('⚡ 단기 (6개월)','#eff6ff','#3b82f6','#1d4ed8', rm_s)
    +'<div style="height:10px"></div>'
    + mgmtRoadmapPhase('📈 중기 (1년)','#f0fdf4','#16a34a','#15803d', rm_m)
    +'<div style="height:10px"></div>'
    + mgmtRoadmapPhase('🌟 장기 (3년)','#fdf4ff','#7c3aed','#6d28d9', rm_l)
    +'<div style="height:10px"></div>'
    +'<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 15px">'
    +'<div style="font-size:13px;font-weight:700;color:#1e40af;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #dbeafe">★ 종합 의견 및 컨설턴트 총평</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +(d.summary||[
      nm+'는 단기간의 폭발적 매출 성장과 독창적 사업 역량을 보유한 고성장 잠재력 기업으로 평가됨',
      '인증 취득 로드맵 실행 시 추가 정책자금 조달로 성장 가속화와 시장 내 독점적 포지션 강화가 기대됨',
      '전략적 채널 확대와 조직 역량 강화 병행으로 3년 내 시장 리더십 확보가 현실적인 목표임',
      '컨설턴트 밀착 지원 하에 인증·자금·채널 동시 추진으로 종합 성장 전략 실행을 강력히 권고함'
    ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#1e40af;line-height:1.6"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:'+C+'"></div><span>'+t+'</span></div>';}).join('')
    +'</div></div>'
  );

  return tplStyle(C,'portrait') + '<div class="rp-wrap rp-flow">' + cover + cat1 + cat2 + cat3 + cat4 + cat5 + cat6 + '</div>';
}


// ═══════════════════════════════════════════════
// ★ 경영진단 컨설턴트용 — 자연 흐름 레이아웃 (기업전달용 동일 구조)
// ═══════════════════════════════════════════════
function buildMgmtConsultantHTML(d, cData, rev, dateStr) {
  var C = '#1e293b';   // dark accent
  var CB= '#3b82f6';   // chart/indicator blue
  var exp = calcExp(cData, rev);
  var radar = (d.radar||[72,75,50,55,45]).join(',');
  var bars  = d.marketing_bars||{finance:82,strategy:75,operation:50,hr:30,it:45};
  var nm = cData.name;
  var gradeVal = (d.grade||'A-').replace(/등급/g,'').trim();
  var growRate = (rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'-';
  var certs = d.certs||[
    {name:'벤처기업 인증',effect:nm+'의 기술력 인정 — 중진공·기보 우대금리 + 추가 자금 한도 2억 확보 가능',amount:'+2억',period:'4개월 내'},
    {name:'이노비즈 인증',effect:nm+'의 기술혁신형 기업 인증 — 중진공 기술개발자금 신청 자격 부여',amount:'+3억',period:'1년 내'}
  ];

  var cover = mgmtCover(cData, rev, exp, dateStr, 'consultant');

  // 카테고리 헬퍼 (flow - no page break forced)
  function cat(numLabel, title, sub, content) {
    return '<div class="rp-cat">'
      +'<div class="rp-ph">'
      +'<div class="rp-pnum" style="background:#f1f5f9;color:#475569">'+numLabel+'</div>'
      +'<span class="rp-ptitle">'+title+'</span>'
      +'<span class="rp-psub">'+sub+'</span>'
      +'</div>'
      +'<div class="rp-body">'+content+'</div>'
      +'</div>';
  }

  // 리스크/피드백 색상 섹션
  function riskSec(title, items) {
    return '<div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:12px 15px;margin-top:10px">'
      +'<div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #fcd34d">'+title+'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      +items.map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#92400e;line-height:1.6"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#d97706"></div><span>'+t+'</span></div>';}).join('')
      +'</div></div>';
  }

  // ── CAT1: 경영진단 개요 ──────────────────
  var _nw = 'white-space:nowrap;';
  var _th = 'background:#f8fafc;padding:10px 14px;color:#475569;font-weight:700;'+_nw+'text-align:left;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;';
  var _td = 'padding:10px 14px;font-weight:600;'+_nw+'border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;';
  var _thb= 'background:#f8fafc;padding:10px 14px;color:#475569;font-weight:700;'+_nw+'text-align:left;border-right:1px solid #e2e8f0;';
  var _tdb= 'padding:10px 14px;font-weight:600;'+_nw+'border-right:1px solid #e2e8f0;';

  var infoTbl = '<div style="border:1.5px solid #cbd5e1;border-radius:10px;overflow:hidden;margin-bottom:12px">'
    +'<table style="width:100%;border-collapse:collapse;font-size:13px">'
    +'<tr><th style="'+_th+'width:13%">기업명</th><td style="'+_td+'">'+nm+'</td><th style="'+_th+'width:10%">대표자</th><td style="'+_td+'">'+(cData.rep||'-')+'</td><th style="'+_th+'width:10%">업종</th><td style="padding:10px 14px;font-weight:600;'+_nw+'border-bottom:1px solid #e2e8f0">'+(cData.industry||'-')+'</td></tr>'
    +'<tr><th style="'+_th+'">설립일</th><td style="'+_td+'">'+(cData.bizDate||'-')+'</td><th style="'+_th+'">사업자번호</th><td style="'+_td+'">'+(cData.bizNum||'-')+'</td><th style="'+_th+'">상시근로자</th><td style="padding:10px 14px;font-weight:600;'+_nw+'border-bottom:1px solid #e2e8f0">'+(cData.empCount||'-')+'명</td></tr>'
    +'<tr><th style="'+_thb+'">전년 매출</th><td style="'+_tdb+'">'+fKRW(rev.y25)+'</td><th style="'+_thb+'">금년 예상</th><td style="'+_tdb+'">'+fKRW(exp)+'</td><th style="'+_thb+'">핵심아이템</th><td style="padding:10px 14px;font-weight:600;'+_nw+'">'+(cData.coreItem||'-')+'</td></tr>'
    +'</table></div>';

  var gradeCards = '<div style="display:flex;gap:10px;margin-bottom:12px;align-items:stretch">'
    +'<div style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:10px;padding:16px 20px;min-width:160px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center">'
    +'<div style="font-size:11px;color:#64748b;margin-bottom:5px">종합 진단 등급</div>'
    +'<div style="font-size:34px;font-weight:900;color:#334155;line-height:1;margin-bottom:5px">'+gradeVal+'</div>'
    +'<div style="font-size:12px;color:#475569;font-weight:700">'+(d.grade_desc||'고성장 잠재력 보유')+'</div>'
    +'</div>'
    +'<div style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:10px">'
    +[['📈',growRate,'매출성장률','#16a34a'],['🚨','4건','핵심리스크','#dc2626'],['💰',fKRW(exp),'금년예상','#475569'],['🏦','+6.5억','추가조달가능','#475569']].map(function(v){
      return '<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:12px 8px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:20px;margin-bottom:5px">'+v[0]+'</div><div style="font-size:14px;font-weight:800;color:'+v[3]+';margin-bottom:3px">'+v[1]+'</div><div style="font-size:11px;color:#64748b">'+v[2]+'</div></div>';
    }).join('')
    +'</div></div>';

  var cat1 = cat(1,'경영진단 개요','기업현황 · 종합등급 · 핵심 리스크',
    infoTbl + gradeCards
    + mgmtSec('진단 목적','📌','#475569', d.overview||[
        nm+'의 재무·전략·인사·운영·IT 전 영역을 리스크 중심으로 종합 진단하여 컨설턴트 개입 포인트를 명확히 파악함',
        '폭발적 매출 성장의 지속 가능성을 검증하고 성장 가속화를 위한 정책자금 조달 전략을 수립함',
        '기업 전달용 대비 취약점·리스크를 솔직하게 기술하여 실질적인 개선 방향을 제시하는 것이 목적임',
        '인증 취득 로드맵과 신용 개선 전략을 통해 정책자금 조달 한도를 최대화하는 방안을 도출함',
        '단기·중기·장기 실행 계획과 KPI를 수립하여 컨설턴트 밀착 지원의 근거 자료로 활용함',
        nm+'의 내부 구조적 취약점을 파악하고 즉각적인 개선이 필요한 시급 이슈 TOP 3을 도출함'
      ])
    + riskSec('🚨 핵심 리스크 요약 (내부용)', d.key_risks||[
        nm+'는 대표 1인 의존도가 극도로 높아 사업 연속성 리스크가 매우 큼 — 인력 분산 체계 즉시 구축 필요',
        '현재 조직 구조로는 급증하는 매출에 상응하는 운영 및 관리 역량 강화에 명확한 한계가 있음',
        '대표 1인이 모든 업무를 총괄하여 업무 과중 및 전문성 분산으로 인한 효율 저하가 우려됨',
        '내부 통제 시스템 및 체계적 프로세스 부재는 사업 규모 확장에 따른 법률·규제 리스크를 증대시킴'
      ])
  );

  // ── CAT2: 재무 현황 ────────────────────────
  var cat2 = cat(2,'재무 현황 분석','리스크 중점 분석',
    '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 15px;background:#f8fafc;margin-bottom:10px">'
    +'<div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e9ecef">📈 연도별 매출 추이</div>'
    +'<div class="rp-ch" style="height:140px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px">'
    +[['전년 매출',fKRW(rev.y25),'2025년','#475569'],['금년 예상',fKRW(exp),'연환산','#475569'],['YoY 성장',growRate,'전년 대비','#16a34a'],['현금흐름','주의','관리 필요','#f97316']].map(function(v){
      return '<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:9px;text-align:center"><div style="font-size:11px;color:#94a3b8;margin-bottom:2px">'+v[0]+'</div><div style="font-size:15px;font-weight:800;color:'+v[3]+'">'+v[1]+'</div><div style="font-size:10px;color:#94a3b8;margin-top:1px">'+v[2]+'</div></div>';
    }).join('')
    +'</div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    +'<div style="border:1px solid #e2e8f0;border-radius:10px;padding:13px 16px;background:#f8fafc">'
    +'<div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0">💡 재무 현황 분석</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px">'
    +(d.finance_strengths||[
        nm+'는 전년 대비 금년 예상 매출이 80% 이상 급증하며 매우 강력한 성장세를 시현하고 있음',
        '화장품 원료 유통업의 특성상 상대적으로 높은 마진율을 유지하며 수익성 측면에서 긍정적인 구조를 보유함',
        '고정비 최소화를 통해 재무 건전성 및 유동성 확보에 유리한 입지를 점하고 있음',
        '안정적인 공급처 확보로 원가 경쟁력을 유지하며 수익 극대화에 기여하는 구조를 보유함'
      ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#334155;line-height:1.6"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#475569"></div><span>'+t+'</span></div>';}).join('')
    +'</div></div>'
    +'<div style="border:1px solid #fed7aa;border-radius:10px;padding:13px 16px;background:#fff7ed">'
    +'<div style="font-size:13px;font-weight:700;color:#f97316;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #fed7aa">⚠️ 재무 리스크</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px">'
    +(d.finance_risks||[
        '운전자본 부족 리스크 — 급성장에 따른 현금흐름 단기 경색 가능성을 사전에 차단해야 함',
        '단일 아이템 의존 구조 — 포트폴리오 다각화를 통한 매출 안정성 강화가 시급함',
        '대표 의존도 높은 재무 운영 구조 — 핵심 인력 이탈 시 사업 연속성에 심각한 영향이 있음',
        '내부 통제 및 재무 관리 시스템 미흡 — 규모 확장에 따른 잠재적 리스크 증대 가능성 있음'
      ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#334155;line-height:1.6"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#f97316"></div><span>'+t+'</span></div>';}).join('')
    +'</div></div>'
    +'</div>'
    +'<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 15px;background:#f8fafc;margin-bottom:10px">'
    +'<div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e9ecef">📊 영역별 재무 지표</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +[['매출 성장률',bars.finance||82],['매출이익률',Math.max((bars.finance||82)-8,62)],['현금흐름 안정성',Math.max((bars.finance||82)-25,45)],['부채 안정성',Math.min((bars.finance||82)+3,88)]].map(function(b){
      var bc=b[1]<60?'#f97316':'#475569';
      return '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>'+b[0]+'</span><span style="font-weight:700;color:'+bc+'">'+b[1]+'점</span></div><div style="height:7px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;border-radius:4px;width:'+b[1]+'%;background:'+bc+'"></div></div></div>';
    }).join('')
    +'</div></div>'
    + mgmtFB(d.fb_finance||[
        nm+'의 현금흐름 관리 체계 부재가 가장 시급한 문제 — 매출이 높아도 현금 부족 시 흑자 도산 가능성 존재함',
        '정책자금 신청을 위한 재무 서류(부가세 신고서, 손익계산서) 정비가 선행되어야 빠른 조달이 가능함',
        '원재료 선매입 전략으로 원가 변동성을 줄이는 것을 정책자금 집행 1순위 항목으로 설정 권고함',
        '월별 현금흐름 시뮬레이션 의무화로 미래 자금 수요를 3개월 전에 예측하는 체계 구축이 필요함'
      ])
  );

  // ── CAT3: 전략·마케팅 ───────────────────────
  var cat3 = cat(3,'전략 및 마케팅 분석','취약점 포함 종합',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">'
    +'<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 15px;background:#f8fafc">'
    +'<div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e9ecef">🎯 역량 레이더</div>'
    +'<div class="rp-ch" style="height:185px"><canvas id="rp-radar" data-scores="'+radar+'" style="width:100%;height:100%"></canvas></div>'
    +'</div>'
    +'<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 15px;background:#f8fafc">'
    +'<div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e9ecef">📊 영역별 점수</div>'
    +[['재무 건전성',bars.finance||82],['전략/마케팅',bars.strategy||75],['운영/생산',bars.operation||50],['인사/조직',bars.hr||30],['IT/디지털',bars.it||45]].map(function(b){
      var warn=b[1]<60,bc=warn?'#f97316':'#475569';
      return '<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>'+b[0]+'</span><span style="font-weight:700;color:'+bc+'">'+b[1]+'점'+(warn?' ⚠':'')+'</span></div><div style="height:7px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;border-radius:4px;width:'+b[1]+'%;background:'+bc+'"></div></div></div>';
    }).join('')
    +'</div></div>'
    + mgmtSec('마케팅 현황 분석','📣','#475569', d.marketing||[
        nm+'는 특정 시장에서 전문성을 기반으로 한 니치 마케팅 전략을 효과적으로 구사하고 있음',
        '기존 거래처와의 신뢰 관계를 통해 안정적인 매출을 확보하고 있으며 강력한 B2B 채널로 작용함',
        '산업 트렌드에 발맞춰 신규 아이템 발굴 및 공급을 통해 시장 점유율을 지속 확대하고 있음',
        '온라인 채널 활용을 통한 잠재 고객 발굴 및 정보 제공으로 확장 가능성을 높일 수 있음',
        '단일 플랫폼(쿠팡) 의존 구조는 알고리즘 변경 시 매출이 30~50% 급감할 수 있어 자사몰 구축이 필요함',
        '고객 데이터 수집·분석 체계 부재로 재구매 유도 및 맞춤형 마케팅 실행이 구조적으로 불가능한 상태임'
      ])
    +'<div style="height:10px"></div>'
    + mgmtFB(d.fb_marketing||[
        nm+'의 마케팅 채널이 사실상 무체계 — 빠른 성장 지속을 위해 마케팅 담당 인력 채용이 3개월 내 선행되어야 함',
        '단일 플랫폼 의존 구조는 플랫폼 정책 변경 시 즉각적인 매출 급감 위험이 있어 자사몰 구축이 반드시 필요함',
        '전문 박람회 참가 계획을 즉시 수립하고 업계 네트워크를 통한 B2B 거래처 확보를 본격 추진해야 함',
        '리뷰·UGC 마케팅 전략 수립으로 기존 고객의 재구매율을 높이고 자연 유입을 극대화해야 함'
      ])
  );

  // ── CAT4: 인사·운영·IT ──────────────────────
  var cat4 = cat(4,'인사·조직 및 운영·생산 분석','리스크 중점',
    '<div style="page-break-inside:avoid;break-inside:avoid">'+mgmtSec('인사·조직','👥','#475569', d.hr||[
      nm+'는 현재 대표 1인이 모든 인사업무를 직접 수행하는 단일 의사결정 구조로 병목 리스크가 매우 높음',
      '공식적인 채용 프로세스 및 인력 관리 시스템이 부재하여 사업 확장 시 병목 현상이 심각해질 것임',
      '직무 정의 및 역할 분담이 불명확하여 업무 효율성 저하와 대표의 과도한 업무 부담이 발생함',
      '직원 복리후생 및 경력 개발 프로그램 전무로 미래 인재 유치에 심각한 장애 요인으로 작용함',
      '성과에 따른 인센티브 및 스톡옵션 제도가 없어 우수 인재 동기 부여 및 장기 재직 유도가 어려움',
      '조직 문화 형성에 대한 고민이 부족하여 향후 핵심 가치 공유에 어려움을 줄 수 있음'
    ])
    +'</div>'
    +'<div style="height:10px"></div>'
    +'<div style="page-break-inside:avoid;break-inside:avoid">'+mgmtSec('운영·생산','🏭','#475569', d.ops||[
      nm+'는 대표 1인이 해외 소싱부터 국내 유통까지 전 운영 과정을 직접 통제하여 리스크가 집중되어 있음',
      '체계적인 재고 관리 시스템 부재로 과잉 재고 또는 품절 리스크에 대한 노출도가 매우 높음',
      '물류 및 배송은 외부 업체에 전적으로 의존하여 서비스 품질 및 비용 통제에 한계가 명확함',
      '운영 프로세스에 대한 표준화된 문서화가 부족하여 업무 인수인계 및 효율성 개선이 어려움',
      '공급처 단일화에 따른 리스크가 높아 대체 공급처 2곳 이상을 즉시 확보해야 함',
      '품질 관리 및 고객 불만 처리 시스템이 대표 개별 판단에 의존하여 일관성 확보에 취약함'
    ])
    +'</div>'
    +'<div style="height:10px"></div>'
    + mgmtFB(d.fb_hr_ops||[
        nm+'의 인력 구조가 현재 최대 취약점 — 정책자금 조달 후 설비보다 인력에 먼저 투자해야 추가 매출 성장이 가능함',
        '운영 매뉴얼 문서화는 이번 달 안에 완료해야 할 긴급 과제 — 핵심 담당자 이탈 시 재현 불가 상황 방지 필수',
        '생산·운영 데이터를 엑셀에서 전용 시스템으로 이전하는 것이 단기적으로 가장 높은 ROI를 가져다 줄 것임',
        '원재료 공급처 다변화는 리스크 분산뿐만 아니라 가격 협상력 강화로 원가 절감 효과도 동시에 거둘 수 있음'
      ])
  );

  // ── CAT5: IT·디지털 및 정부지원 ────────────
  var cat5 = cat(5,'IT·디지털 및 정부지원','개선 과제',
    mgmtSec('IT·디지털 현황','💻','#475569', d.it||[
      nm+'는 기본적인 개인용 컴퓨터 및 사무용 소프트웨어에만 의존하여 비즈니스를 운영하고 있음',
      '핵심 데이터·고객 정보는 개인 디바이스에 분산 저장되어 있어 보안 취약성이 매우 높음',
      'ERP, CRM 등 통합 비즈니스 관리 시스템 부재로 효율적인 데이터 활용이 어려운 상태임',
      '디지털 마케팅 및 온라인 판매 채널 구축을 위한 IT 인프라 투자가 전무하여 시장 확대에 제약이 있음',
      '내부 협업 도구 및 클라우드 기반 솔루션 활용이 미흡하여 업무 생산성 향상에 개선의 여지가 많음',
      '데이터 백업 체계 미구축으로 중요 사업 정보 유실 시 복구가 불가능한 위험 상태에 놓여 있음'
    ])
    +'<div style="height:10px"></div>'
    + mgmtSec('정부지원 활용 현황','🏛','#475569', [
        nm+'의 현재 정부지원 활용도 매우 낮음 — 신청 가능 자금이 5개 이상임에도 미신청 상태로 즉시 착수가 필요함',
        '벤처인증 미취득 — 현재 매출·사업 역량으로 충분히 취득 가능하며 취득 시 자금 한도 2억 즉시 추가 확보 가능',
        '중진공 소공인 특화자금 즉시 신청 가능 — 서류 간소화로 빠른 승인 가능하여 이번 달 안에 신청 착수를 권고함',
        '기보 기술보증 신청 가능 — 현재 보유 역량 기반으로 보증료 우대 적용 가능하며 최대 3억 조달이 가능함',
        '소진공 성장촉진자금(1억) 병행 신청 검토 — 창업 초기 요건 충족 시 추가 1억 조달로 총 조달 극대화 가능',
        '벤처인증 취득 후 신보 특례보증 추가 신청으로 총 6억+ 조달 시나리오 완성이 가능하므로 인증 준비 병행 권고'
      ])
    +'<div style="height:10px"></div>'
    + mgmtFB(d.fb_it||[
        'IT 투자 우선순위: ①기초 ERP(무료/저가) → ②자사몰 → ③CRM 순 단계적 도입 권고 — 한번에 다 하려다 실패하는 경우가 많음',
        '정책자금 신청은 올해 안에 반드시 완료해야 함 — 매출 급증 후 내년 심사 기준이 더 까다로워질 수 있음',
        '클라우드 기반 데이터 관리(구글 드라이브 등) 도입은 비용이 거의 없으므로 이번 주 안에 즉시 전환이 가능함',
        '디지털 마케팅 채널 구축은 외주(에이전시)로 시작하되 6개월 내 인하우스 전환 계획을 병행해야 함'
      ])
  );

  // ── CAT6: 성장 로드맵 ───────────────────────
  var rm_s = d.roadmap_short||['핵심 인력 1인 신규 채용 (영업/관리)','사업 계획서 고도화 및 정책자금 신청','재고 관리 시스템 초도 구축','온라인 마케팅 채널 구축 착수','벤처기업 인증 서류 준비 완료','주요 고객사 만족도 조사 실시 및 개선'];
  var rm_m = d.roadmap_mid||['통합 ERP/CRM 시스템 구축 완료','수출 시장 진출 전략 수립 및 파일럿','연구 개발 전담 부서 설립 검토','브랜드 포트폴리오 확장 및 신규 아이템','마케팅 전담 인력 채용 완료','이노비즈 인증 취득 추진 착수'];
  var rm_l = d.roadmap_long||['상장 추진 및 전략적 투자 유치','글로벌 시장 거점 확보 및 수출 확대','자체 원료/제품 생산 시설 구축','화장품 완제품 등 사업 다각화 진출','상시근로자 10인 이상 규모 성장','기업부설연구소 설립 및 R&D 투자'];

  var cat6 = cat(6,'개선 방향 및 성장 로드맵','우선순위별 실행 계획',
    mgmtRoadmapPhase('⚡ 단기','#f1f5f9','#334155','#1e293b', rm_s)
    +'<div style="height:10px"></div>'
    + mgmtRoadmapPhase('📈 중기','#f0fdf4','#16a34a','#15803d', rm_m)
    +'<div style="height:10px"></div>'
    + mgmtRoadmapPhase('🌟 장기','#fdf4ff','#7c3aed','#6d28d9', rm_l)
    +'<div style="height:10px"></div>'
    + mgmtFB(d.fb_roadmap||[
        '단기 로드맵은 '+nm+'의 현 인력 부족 문제 해소와 기본 시스템 구축에 집중해야 함',
        '중장기 로드맵은 시장 확대·사업 다각화를 목표로 하되 단계별 면밀한 시장 분석과 자원 배분 계획이 수반되어야 함',
        '각 로드맵 단계별 KPI를 사전 설정하고 월별 점검으로 계획 대비 실행률을 체계적으로 관리해야 함',
        '로드맵 실행 우선순위: 자금 조달 → 인력 채용 → 시스템 구축 → 채널 확대 순으로 진행해야 성과가 가시화됨'
      ])
  );

  // ── CAT7: 컨설턴트 전용 (대외비) ────────────
  var cat7 = '<div class="rp-cat" style="background:#fffbeb;border:2px solid #f59e0b">'
    +'<div class="rp-ph">'
    +'<div class="rp-pnum" style="background:#fef3c7;color:#d97706">🔒</div>'
    +'<span class="rp-ptitle">컨설턴트 실질 조언</span>'
    +'<span class="rp-psub" style="color:#dc2626;font-weight:600">내부 전용 — 대외비</span>'
    +'</div>'
    +'<div class="rp-body">'
    +'<div style="border-bottom:2px solid #fcd34d;padding-bottom:10px;margin-bottom:14px;font-size:13px;font-weight:700;color:#92400e">🔒 컨설턴트 전용 자료 (기업 전달 금지)</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
    +'<div style="display:flex;flex-direction:column;gap:10px">'
    +'<div style="background:#fef9ec;border:1px solid #fcd34d;border-radius:8px;padding:12px 14px">'
    +'<div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px">🚨 시급 해결 이슈 TOP 3</div>'
    +(d.consultant_issues||[
      nm+'의 대표 1인 의존도를 낮추기 위한 핵심 인력 채용과 업무 분담 체계 구축이 가장 시급한 과제임',
      '급성장하는 매출에 상응하는 내부 통제·운영 효율성 확보를 위해 체계적인 관리 시스템 도입이 절실함',
      '미래 성장을 위한 전략적 투자 재원 마련과 효과적인 정책자금 조달 계획 수립이 당면 핵심 과제임'
    ]).map(function(t,i){return '<div style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#92400e;line-height:1.6;margin-bottom:6px"><div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700;flex-shrink:0">TOP'+(i+1)+'</div><span>'+t+'</span></div>';}).join('')
    +'</div>'
    +'<div style="background:#fef9ec;border:1px solid #fcd34d;border-radius:8px;padding:12px 14px">'
    +'<div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px">💰 정책자금 신청 전략</div>'
    +(d.consultant_funds||[
      '1순위: 중진공 소공인 특화자금(1억) — 이번 달 신청 착수, 약 30일 내 승인 가능한 가장 빠른 루트임',
      '2순위: 기보 기술보증(3억) — 현재 역량 기반 우대 적용, 사업계획서 준비 후 병행 신청 권고',
      '3순위: 벤처인증 취득 후 신보 특례보증(2억) — 총 6억+ 조달 시나리오 실행이 가능함',
      '병행 전략: 소진공 성장촉진자금(1억) 추가 신청으로 최대 7억+ 조달 극대화가 가능함'
    ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#92400e;line-height:1.6;margin-bottom:5px"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#d97706"></div><span>'+t+'</span></div>';}).join('')
    +'</div>'
    +'</div>'
    +'<div style="display:flex;flex-direction:column;gap:10px">'
    +'<div style="background:#fef9ec;border:1px solid #fcd34d;border-radius:8px;padding:12px 14px">'
    +'<div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px">📜 인증 취득 전략 + 가점추천</div>'
    +(d.consultant_certs||[
      '벤처인증 우선 취득 — 기술평가 방식 활용(현장 심사 불요), 현재 매출·역량으로 즉시 신청이 가능함',
      '이노비즈 인증은 벤처인증 취득 후 1년 내 추진 — 기술 경쟁력 지표 사전 정비가 필요함'
    ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#92400e;line-height:1.6;margin-bottom:5px"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#d97706"></div><span>'+t+'</span></div>';}).join('')
    +certs.map(function(c,i){
      return '<div style="background:white;border:1px solid #fcd34d;border-radius:8px;padding:9px 11px;margin-top:6px;display:flex;align-items:flex-start;gap:9px">'
        +'<div style="flex:1"><div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:2px">'+c.name+'</div><div style="font-size:11px;color:#64748b;line-height:1.5">'+c.effect+'</div></div>'
        +'<div style="text-align:right;flex-shrink:0"><div style="font-size:13px;font-weight:800;color:#d97706">'+c.amount+'</div><div style="font-size:10px;color:#94a3b8">'+c.period+'</div></div>'
        +'</div>';
    }).join('')
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +'<div style="background:#fef9ec;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px">'
    +'<div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:6px">📈 마케팅 개선</div>'
    +(d.consultant_marketing||[
      '디지털 마케팅: '+nm+'를 위한 SNS·블로그·온라인 채널을 활용한 홍보 및 잠재 고객 발굴 전략을 수립함',
      'B2B 영업 강화: 기존 거래처 관리 효율화 및 신규 거래처 발굴을 위한 영업 프로세스 개선 방안을 제안함'
    ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:6px;font-size:11px;color:#92400e;line-height:1.6;margin-bottom:4px"><div style="width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-top:5px;background:#d97706"></div><span>'+t+'</span></div>';}).join('')
    +'</div>'
    +'<div style="background:#fef9ec;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px">'
    +'<div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:6px">💳 신용 개선</div>'
    +(d.consultant_credit||[
      '재무제표 개선: '+nm+'의 회계 처리 투명성을 높이고 재무 건전성을 강화하여 신용 평가에 긍정적 영향을 줌',
      '정책 자금 활용 상환 계획: 안정적인 자금 흐름으로 부채 비율을 관리하며 신용도를 지속 향상시킴'
    ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:6px;font-size:11px;color:#92400e;line-height:1.6;margin-bottom:4px"><div style="width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-top:5px;background:#d97706"></div><span>'+t+'</span></div>';}).join('')
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>';

  return tplStyle(C,'portrait') + '<div class="rp-wrap rp-flow">' + cover + cat1 + cat2 + cat3 + cat4 + cat5 + cat6 + cat7 + '</div>';
}


// ===========================
// ★ 상세 재무진단 (표지+3P)
// ===========================
function buildFinanceHTML(d, cData, rev, dateStr) {
  var color = '#2563eb';
  var exp   = calcExp(cData, rev);
  var scores = d.scores||{profit:72,stable:80,growth:88};
  var scD    = d.score_descs||{profit:'매출이익률 양호',stable:'부채비율 안정적',growth:'매출 성장률 최우수'};
  var debtData  = d.debt||[{name:'중진공',ratio:54},{name:'기보',ratio:27},{name:'재단',ratio:19}];
  var dColors   = ['#2563eb','#7c3aed','#06b6d4','#16a34a','#ea580c'];
  var pbars = d.profit_bars||[{label:'매출 성장률(YoY)',value:85,display:'+21%'},{label:'매출이익률',value:62,display:'38%'},{label:'영업이익률',value:44,display:'22%'},{label:'현금흐름 안정성',value:70,display:'양호'}];
  var totalScore = Math.round((scores.profit+scores.stable+scores.growth)/3);
  var yoy = (rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'분석중';
  var session = JSON.parse(localStorage.getItem(DB_SESSION)||'{}');
  var managerName = session.name || '담당자 미등록';
  var brandName = session.dept || '솔루션빌더스';
  var issueDateObj = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(issueDateObj.getTime())) issueDateObj = new Date();
  var issueYear = issueDateObj.getFullYear();
  var issueMonth = issueDateObj.getMonth() + 1;
  var issueMonthText = issueYear + '년 ' + issueMonth + '월';
  var companyName = (cData && cData.name) ? cData.name : '기업명 미입력';
  var growthTargets = Array.isArray(d.growth_targets) && d.growth_targets.length >= 3
    ? d.growth_targets.slice(0,3)
    : [Math.max(exp, 10000), Math.round(Math.max(exp, 10000) * 1.45), Math.round(Math.max(exp, 10000) * 1.95)];
  var growthNarrative = Array.isArray(d.growth_items) && d.growth_items.length
    ? d.growth_items.slice(0,2)
    : [
        companyName+'의 최근 매출 성장세는 업종 평균을 크게 상회하며 향후 3개년 동안 안정적인 외형 확대 가능성을 보여주고 있음',
        '신규 거래처 확보, 채널 다각화, 운영 효율 개선이 병행될 경우 성장성과 재무 건전성을 동시에 강화할 수 있음'
      ];
  var stableMetrics = d.stable_metrics||[
    {label:'부채비율',value:'낮음',desc:'정책자금 중심'},
    {label:'연체이력',value:'없음',desc:'건전'},
    {label:'KCB신용',value:'710점',desc:'3등급'},
    {label:'종합등급',value:'A-',desc:'우수'}
  ];

  function buildFinanceCover() {
    return '<div class="rp-cover" style="background:white;padding:0 28px 30px;position:relative;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden">'
      +'<div style="position:absolute;left:40px;top:40px;bottom:78px;width:1px;background:#e5e7eb"></div>'
      +'<div style="padding-top:34px">'
      +'<div style="height:8px;background:'+color+';border-radius:0;margin:0 0 88px 0"></div>'
      +'<div style="text-align:center;padding:0 34px">'
      +'<div style="font-size:56px;font-weight:900;color:#3f3f46;letter-spacing:-2.1px;line-height:1.08;margin-bottom:28px">상세 재무진단</div>'
      +'<div style="width:64%;height:1px;background:#d1d5db;margin:0 auto 30px"></div>'
      +'<div style="font-size:28px;font-weight:800;color:#111827;line-height:1.4">'+companyName+'</div>'
      +'</div>'
      +'</div>'
      +'<div style="padding:0 22px">'
      +'<div style="border-top:1px solid #d1d5db"></div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 8px 11px;font-size:12px;font-weight:700;color:#3f3f46">'
      +'<span>작성일: '+issueMonthText+'</span>'
      +'<span>담당자: '+managerName+'</span>'
      +'</div>'
      +'<div style="border-top:1px solid #d1d5db;padding-top:12px;text-align:center">'
      +'<div style="font-size:30px;font-weight:900;color:'+color+';letter-spacing:-1px;line-height:1.1">'+brandName+'</div>'
      +'</div>'
      +'</div>'
      +'</div>';
  }

  function financeMetricCard(label, value, desc, valueColor) {
    return '<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;min-height:122px;display:flex;flex-direction:column;justify-content:center;text-align:center">'
      +'<div style="font-size:12px;color:#94a3b8;margin-bottom:8px;font-weight:700">'+label+'</div>'
      +'<div style="font-size:20px;font-weight:900;color:'+(valueColor||color)+';line-height:1.28;letter-spacing:-0.5px">'+value+'</div>'
      +'<div style="font-size:11px;color:#94a3b8;margin-top:8px;line-height:1.4">'+desc+'</div>'
      +'</div>';
  }

  function financeGaugeCard(label, val, col, desc) {
    var dash = Math.max(0, Math.min(126, Math.round((val/100)*126)));
    return '<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:14px 14px 12px;min-height:188px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center">'
      +'<div style="font-size:14px;font-weight:800;color:'+col+';margin-bottom:8px">'+label+'</div>'
      +'<svg viewBox="0 0 100 58" width="112" height="66" style="display:block;margin:0 auto 4px">'
      +'<path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="#e2e8f0" stroke-width="10"/>'
      +'<path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="'+col+'" stroke-width="10" stroke-dasharray="'+dash+' '+(126-dash)+'" stroke-linecap="round"/>'
      +'<text x="50" y="47" text-anchor="middle" font-size="16" font-weight="800" fill="#1e293b">'+val+'</text>'
      +'</svg>'
      +'<div style="font-size:12px;color:#334155;line-height:1.65">'+desc+'</div>'
      +'</div>';
  }

  function financeKeyMetricCard(metric) {
    return '<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:14px 12px;min-height:104px;display:flex;flex-direction:column;justify-content:center;text-align:center">'
      +'<div style="font-size:12px;color:#64748b;margin-bottom:10px;font-weight:700">'+metric.label+'</div>'
      +'<div style="font-size:24px;font-weight:900;color:'+color+';line-height:1.1;margin-bottom:6px">'+metric.value+'</div>'
      +'<div style="font-size:12px;color:#94a3b8;line-height:1.45">'+metric.desc+'</div>'
      +'</div>';
  }

  function financeActionCard(topColor, title, body) {
    return '<div class="rp-rmi" style="border-top:4px solid '+topColor+';display:flex;flex-direction:column;min-height:262px;height:100%;padding:16px 15px">'
      +'<div class="rp-rmh" style="color:'+topColor+';font-size:14px">'+title+'</div>'
      +'<div style="font-size:13px;color:#475569;line-height:1.82;white-space:pre-line">'+body+'</div>'
      +'</div>';
  }

  var cover = buildFinanceCover();

  var p1 = rpPage(1,'재무 종합 현황','수익성·안정성·성장성',color,
    '<div style="display:flex;flex-direction:column;gap:14px">'
    +'<div style="display:grid;grid-template-columns:1.45fr 1fr;gap:14px;align-items:stretch">'
    +rpSec('연도별 매출 추이', color, '<div class="rp-ch" style="height:198px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div>')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +financeMetricCard('전년 매출', fKRW(rev.y25), '2025년', color)
    +financeMetricCard('금년 예상', fKRW(exp), '연환산', color)
    +financeMetricCard('성장률', yoy, 'YoY', '#16a34a')
    +financeMetricCard('종합 점수', totalScore+'점', '100점 만점', color)
    +'</div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'
    +financeGaugeCard('수익성', scores.profit, color, scD.profit)
    +financeGaugeCard('안정성', scores.stable, '#16a34a', scD.stable)
    +financeGaugeCard('성장성', scores.growth, '#7c3aed', scD.growth)
    +'</div>'
    +rpSec('종합 재무 진단 요약', color, rpLst([
      '3개 핵심 지표 종합 점수 '+totalScore+'점 — 업종 평균 대비 우수한 재무 건전성을 유지하고 있음',
      scD.profit+' — 매출 대비 이익 창출 능력이 동업종 평균을 상회하여 수익성 기반이 견고함',
      scD.stable+' — 외부 차입 의존도가 낮고 자체 자본 비율이 안정적으로 유지되고 있어 재무 위험이 낮음',
      scD.growth+' — 시장 내 성장 잠재력이 충분히 확인되며 중기 확장 여력이 높은 상태임'
    ], color))
    +'</div>'
  );

  var p2 = rpPage(2,'수익성 및 안정성 분석','부채 구성 · 핵심 재무 지표',color,
    '<div style="display:flex;flex-direction:column;gap:14px">'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:stretch">'
    +rpSec('수익성 분석', color, pbars.map(function(b){return rpHB(b.label,b.value,b.display,color);}).join(''))
    +rpSec('부채 구성 비율', color,
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:156px">'
      +'<div class="rp-ch" style="width:142px;height:142px;flex-shrink:0;padding:6px;border:none"><canvas id="fp-donut" data-names="'+debtData.map(function(x){return x.name;}).join('|')+'" data-ratios="'+debtData.map(function(x){return x.ratio;}).join(',')+'" style="width:100%;height:100%"></canvas></div>'
      +'<div class="rp-dleg" style="flex:1">'+debtData.map(function(dd,i){return '<div class="rp-dli"><div class="rp-ddt" style="background:'+dColors[i]+'"></div><span style="flex:1">'+dd.name+'</span><span style="font-weight:800;color:#1e293b">'+dd.ratio+'</span></div>';}).join('')+'</div>'
      +'</div>'
    )
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:stretch">'
    +rpSec('수익성 상세 분석', color, rpLst(d.profit_detail||[
      '매출이익률이 업종 평균(25~30%)을 상회하여 단위당 수익성이 우수한 제품 구조를 보유하고 있음',
      '영업이익률이 안정적으로 유지되고 있어 판매관리비 통제 능력이 검증된 것으로 평가할 수 있음'
    ], color))
    +rpSec('부채 구조 분석', color, rpLst(d.debt_detail||[
      '정책자금 비중이 높아 금리 부담이 낮고 장기 상환 구조로 안정적인 재무 구조를 유지하고 있음',
      '단기 차입금 비중이 낮아 만기 도래에 따른 유동성 위기 가능성이 매우 낮은 수준임'
    ], color))
    +'</div>'
    +rpSec('안정성 핵심 지표', color,
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">'
      +stableMetrics.slice(0,4).map(financeKeyMetricCard).join('')
      +'</div>'
    )
    +rpSec('신용 개선 방향', color, rpLst(d.credit_improvements||[
      '현재 신용 3등급 유지 — 정책자금 신청 기준(3등급 이상) 충족 상태로 즉시 신청 가능한 조건임',
      '부가세·소득세 성실 신고 유지로 국세 체납 이력 발생을 원천 차단해야 함'
    ], color))
    +'</div>'
  );

  var p3 = rpPage(3,'성장성 분석 및 재무 개선 방향','목표 · 3개년 액션플랜',color,
    '<div style="display:flex;flex-direction:column;gap:14px">'
    +rpSec('성장성 분석', '#7c3aed', rpLst(growthNarrative, '#7c3aed'))
    +rpSec('3개년 매출 목표', '#7c3aed', '<div class="rp-ch" style="height:144px"><canvas id="fp-growth-chart" data-y1="'+growthTargets[0]+'" data-y2="'+growthTargets[1]+'" data-y3="'+growthTargets[2]+'" style="width:100%;height:100%"></canvas></div>')
    +rpSec('재무 개선 우선순위 액션플랜', color,
      '<div class="rp-rm3">'
      +financeActionCard('#ef4444','🔴 즉시 (1개월)', d.action_urgent||'월별 손익계산서 작성 체계 구축, 현금흐름표 정기 관리 시작, 정책자금 신청서류 목록 작성')
      +financeActionCard('#f97316','🟠 단기 (3개월)', d.action_short||'정책자금 1~2개 기관 동시 신청, 벤처인증 추진 착수, 회계 ERP 시스템 도입 검토')
      +financeActionCard(color,'🔵 중기 (1년)', d.action_mid||'조달 자금으로 생산 설비 확충 및 원가율 개선 실현, 제2 매출 채널 확보, 이노비즈 인증 취득')
      +'</div>'
    )
    +'</div>'
  );

  return tplStyle(color, 'portrait') + '<div class="rp-wrap">' + cover + p1 + p2 + p3 + '</div>';
}

// ===========================
// ★ 상권분석 (표지+2P)
// ===========================
function buildTradeHTML(d, cData, rev, dateStr) {
  var color  = '#0d9488';
  var cover  = buildCoverHTML(cData, {title:'AI 상권분석 리포트',reportKind:'AI 빅데이터 상권분석',vLabel:'리포트',borderColor:color}, rev, dateStr);
  var radar  = (d.radar||[82,75,68,72,80]).join(',');
  var sim    = d.sim||{s0:9167,s1:12500,s2:16667,s3:25000};
  var target = d.target||{age:'30~40대',household:'1~2인',channel:'온라인',cycle:'월 2~3회'};

  var p1 = rpPage(1,'상권 현황 분석','핵심 입지 지표 · 경쟁 분석',color,
    '<div class="rp-3col">'
    +'<div class="rp-3c">'
    +'<div class="rp-g3" style="flex-shrink:0;margin-bottom:10px">'
    +rpMC('유동인구 (일평균)',d.traffic||'2,400명','일평균 유동량',color)
    +rpMC('반경1km 경쟁업체',(d.competitors||7)+'개','직접 경쟁',parseInt(d.competitors||7)>5?'#f97316':'#16a34a')
    +rpMC('입지 경쟁력 등급',d.grade||'B+','상위 30%',color)
    +'</div>'
    +rpSec('상권 특성 분석', color, rpLst(d.features||[
      '주변 1km 내 핵심 소비층인 30~40대 1~2인 가구의 밀집도가 높아 타겟 고객 접근성이 우수한 입지임',
      '대중교통 접근성(지하철·버스)이 양호하여 광역 고객 유입 가능성이 높고 주중·주말 유동량이 고른 편임',
      '상권 성장 단계가 성숙기에 진입하여 안정적인 수요는 확보되어 있으나 신규 경쟁자 진입 리스크도 존재함',
      '반경 내 유사 업종 경쟁업체 '+( d.comp_direct||7)+'개 중 강성 경쟁업체는 '+(d.comp_strong||3)+'개로 차별화 전략이 필수적임'
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
  var cover    = buildCoverHTML(cData, {title:'AI 마케팅 제안서',reportKind:'AI 맞춤형 마케팅 제안서',vLabel:'제안서',borderColor:color}, rev, dateStr);
  var channels = (d.channels && d.channels.length ? d.channels : [
    {name:'SNS (인스타그램, 유튜브 쇼츠, 틱톡)',score:92},
    {name:'네이버 검색광고 및 블로그 체험단',score:85},
    {name:'인플루언서 협업 및 리뷰 마케팅',score:80},
    {name:'쿠팡·마켓컬리 등 이커머스 광고',score:75},
    {name:'제휴 마케팅 (밀키트·HMR 브랜드)',score:60}
  ]).slice(0,3);
  var strategies = d.strategies && d.strategies.length ? d.strategies : [
    (cData.name||'해당 기업')+'의 핵심 제품 메시지를 SNS 숏폼 콘텐츠 중심으로 재정의하여 브랜드 인지도와 검색량을 동시에 끌어올려야 함',
    '인플루언서 협업과 후기형 콘텐츠를 병행하여 초기 신뢰 형성과 체험 전환을 동시에 유도해야 함',
    '네이버 검색광고·블로그 체험단을 통해 브랜드 검색 유입과 구매 전환 퍼널을 안정적으로 확보해야 함',
    '이커머스 광고는 시즌성 프로모션과 묶음상품 전략을 연계하여 객단가 상승 구조로 설계해야 함',
    '성과 측정은 월 단위 KPI와 채널별 ROI 기준으로 운영하여 예산 재배분이 가능하도록 해야 함'
  ];
  var budgetTotal = d.budget_total || '700만원/월';
  var budget   = (d.budget && d.budget.length ? d.budget : [
    {name:'SNS 광고',ratio:40},
    {name:'검색광고',ratio:25},
    {name:'체험단·리뷰',ratio:20},
    {name:'콘텐츠 제작',ratio:15}
  ]).slice(0,4);
  var bColors  = ['#db2777','#be185d','#f472b6','#fbcfe8'];
  var principles = d.principles && d.principles.length ? d.principles : [
    '초기 3개월은 디지털 채널 집중 투자로 브랜드 인지도와 검색량을 빠르게 구축함',
    '4개월차부터는 성과 데이터 기반으로 채널별 비중을 재조정하여 효율을 최적화함',
    '월별 ROI(광고 수익률) 분석 후 성과가 낮은 채널 예산은 즉시 이동함'
  ];
  var kpi = (d.kpi && d.kpi.length ? d.kpi : [
    {label:'SNS 팔로워',value:'+5,000',period:'3개월'},
    {label:'월 매출 증가',value:'+40%',period:'6개월'},
    {label:'재구매율',value:'45%',period:'목표'},
    {label:'리뷰 누적',value:'700건',period:'6개월'},
    {label:'검색량 증가',value:'+50%',period:'3개월'},
    {label:'정기구독 전환',value:'45%',period:'목표'}
  ]).slice(0,6);
  var roadmap = (d.roadmap && d.roadmap.length ? d.roadmap : [
    {period:'1월',task:(cData.name||'해당 기업')+' SNS 채널 리뉴얼 및 숏폼 브랜딩 강화',highlight:false},
    {period:'2월',task:(cData.coreItem||'핵심 제품')+' 인플루언서 1차 협업 및 숏폼 콘텐츠 기획',highlight:false},
    {period:'3월',task:(cData.coreItem||'핵심 제품')+' 바이럴 캠페인 런칭',highlight:false},
    {period:'4월',task:(cData.coreItem||'핵심 제품')+' 마케팅 성과 분석 및 채널별 최적화 진행',highlight:true},
    {period:'5월',task:(cData.coreItem||'핵심 제품')+' 마케팅 성과 분석 및 채널별 최적화 진행',highlight:true},
    {period:'6월',task:(cData.coreItem||'핵심 제품')+' 정기구독 서비스 론칭 및 프로모션 운영',highlight:false},
    {period:'7월~',task:'B2B 채널·외식업체·급식업체 대상 영업 및 재유통 확대',highlight:false},
    {period:'8월',task:'리뷰 확보 캠페인 및 검색광고 확장',highlight:false},
    {period:'9월',task:'라이브커머스·이커머스 프로모션 집행',highlight:false},
    {period:'10월',task:'브랜드 검색량 증대형 콘텐츠 집중 집행',highlight:false},
    {period:'11월',task:'재구매 고객 리텐션 캠페인 운영',highlight:false},
    {period:'12월',task:'연말 프로모션 및 성과 정리',highlight:false}
  ]).slice(0,12).map(function(item){
    if (item && item.false !== undefined && item.highlight === undefined) item.highlight = item.false;
    return item;
  });
  var focusBoxes = (d.focus_boxes && d.focus_boxes.length ? d.focus_boxes : [
    {icon:'📊',title:'1~3개월 핵심 지표',items:['SNS 팔로워 +3,000명 달성','리뷰 100건 이상 확보','브랜드 검색량 200% 증가']},
    {icon:'📈',title:'4~6개월 핵심 지표',items:['월 매출 +30% 달성','재구매율 40% 이상 확보','정기구독 고객 200명 확보']},
    {icon:'📝',title:'1~3개월 실행 체크',items:['숏폼 콘텐츠 주 3회 발행','체험단·리뷰 운영 정착','검색광고 A/B 테스트 진행']},
    {icon:'🎯',title:'4~6개월 성과 목표',items:['채널별 CPA 안정화','이커머스 전환율 개선','B2B 제휴처 발굴 시작']}
  ]).slice(0,4);

  function scoreBar(channel, idx) {
    var fill = bColors[idx] || color;
    return '<div style="margin-bottom:13px">'
      +'<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:5px">'
      +'<div style="font-size:13px;font-weight:700;color:#334155;line-height:1.45;flex:1">'+channel.name+'</div>'
      +'<div style="font-size:13px;font-weight:800;color:'+fill+';white-space:nowrap">'+channel.score+'점</div>'
      +'</div>'
      +'<div style="height:8px;background:#fce7f3;border-radius:999px;overflow:hidden">'
      +'<div style="width:'+Math.max(8, Math.min(100, channel.score))+'%;height:100%;background:'+fill+';border-radius:999px"></div>'
      +'</div>'
      +'</div>';
  }

  function kpiCard(item) {
    return '<div style="background:white;border:1px solid #f1d5e4;border-radius:10px;min-height:86px;padding:14px 10px;display:flex;flex-direction:column;justify-content:center;text-align:center">'
      +'<div style="font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:6px;line-height:1.4">'+item.label+'</div>'
      +'<div style="font-size:18px;font-weight:900;color:'+color+';line-height:1.15">'+item.value+'</div>'
      +'<div style="font-size:11px;color:#a1a1aa;margin-top:6px;font-weight:700">'+item.period+'</div>'
      +'</div>';
  }

  function roadmapCard(item) {
    var bg = item.highlight ? '#fbcfe8' : '#fdf2f8';
    var bd = item.highlight ? color : '#f5c2da';
    var tc = item.highlight ? '#9d174d' : color;
    return '<div style="border-radius:10px;background:'+bg+';border:1px solid '+bd+';padding:12px 11px;min-height:126px;height:100%">'
      +'<div style="font-size:13px;font-weight:800;color:'+tc+';margin-bottom:7px">'+item.period+'</div>'
      +'<div style="font-size:12px;color:#52525b;line-height:1.68">'+item.task+'</div>'
      +'</div>';
  }

  function focusCard(box) {
    return '<div style="background:#fdf2f8;border:1px solid #f5c2da;border-radius:10px;padding:14px 14px;min-height:138px">'
      +'<div style="font-size:13px;font-weight:800;color:#9d174d;margin-bottom:8px">'+(box.icon||'📌')+' '+box.title+'</div>'
      +'<div style="font-size:12px;color:#52525b;line-height:1.8">'+(box.items||[]).map(function(t){return t;}).join('<br>')+'</div>'
      +'</div>';
  }

  var p1 = rpPage(1,'채널별 마케팅 전략 및 예산','채널 효과 분석 · 예산 배분',color,
    '<div style="display:flex;flex-direction:column;gap:14px">'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:stretch">'
    +rpSec('채널별 예상 효과 (점수/100)', color, channels.map(scoreBar).join(''))
    +rpSec('핵심 마케팅 전략', color, rpLst(strategies, color))
    +'</div>'
    +rpSec('월 예산 배분 ('+budgetTotal+')', color,
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px">'
      +budget.map(function(b,i){
        return '<div style="text-align:center">'
          +'<div style="font-size:18px;font-weight:900;color:#3f3f46;line-height:1">'+b.ratio+'%</div>'
          +'<div style="font-size:11px;color:#64748b;margin:6px 0 4px;line-height:1.35;min-height:30px">'+b.name+'</div>'
          +'<div style="width:10px;height:10px;border-radius:50%;background:'+(bColors[i]||color)+';margin:0 auto"></div>'
          +'</div>';
      }).join('')
      +'</div>'
      +'<div style="display:flex;justify-content:center;align-items:center;padding:8px 0 2px">'
      +'<div class="rp-ch" style="width:170px;height:170px;flex-shrink:0;padding:6px;border:none;background:transparent"><canvas id="mp-donut" data-names="'+budget.map(function(b){return b.name;}).join('|')+'" data-ratios="'+budget.map(function(b){return b.ratio;}).join(',')+'" style="width:100%;height:100%"></canvas></div>'
      +'</div>'
    )
    +rpSec('예산 운영 원칙', color, rpLst(principles, color))
    +'</div>'
  );

  var p2 = rpPage(2,'KPI 목표 및 월별 실행 로드맵','성과 지표 · 실행 타임라인',color,
    '<div style="display:flex;flex-direction:column;gap:14px">'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'+kpi.map(kpiCard).join('')+'</div>'
    +rpSec('월별 실행 로드맵', color,
      '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px">'
      +roadmap.map(roadmapCard).join('')
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      +focusBoxes.map(focusCard).join('')
      +'</div>'
    )
    +'</div>'
  );

  return tplStyle(color, 'portrait') + '<div class="rp-wrap">' + cover + p1 + p2 + '</div>';
}

// ===========================
// ★ 정책자금매칭 (표지+3P)
// ===========================
function buildFundHTML(d, cData, rev, dateStr) {
  var color  = '#ea580c';
  var cover  = buildCoverHTML(cData, {title:'AI 정책자금매칭',reportKind:'AI 정책자금 매칭 리포트',vLabel:'리포트',borderColor:color}, rev, dateStr);
  var checks = d.checks||[{text:'중소기업 해당 여부 확인',status:'pass'},{text:'국세·지방세 체납 없음',status:'pass'},{text:'금융 연체 이력 없음',status:'pass'},{text:'사업자 등록 유효',status:'pass'},{text:'업력 2년 이상 충족',status:'cond'},{text:'벤처·이노비즈 인증 보유',status:'fail'}];
  var score  = d.score||78;
  var gda    = Math.round((score/100)*151);
  var funds  = d.funds||[{rank:1,name:'중진공 소공인 특화자금',limit:'1억',tags:['금리 2.5%','즉시 신청 가능','제조업 우대']},{rank:2,name:'기보 기술보증 (특허 우대)',limit:'3억',tags:['보증료 0.5%','특허 1건 우대','90% 보증']},{rank:3,name:'소진공 성장촉진자금',limit:'1억',tags:['금리 3.0%','창업 3년 이내','온라인 신청']},{rank:4,name:'지역신보 소액보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤형','빠른 처리']},{rank:5,name:'신보 창업기업 특례보증',limit:'2억',tags:['보증료 0.5%','벤처인증 조건부','95% 보증']}];
  var rColors= [color,'#f97316','#fb923c','#94a3b8','#94a3b8'];
  var comp   = d.comparison||[{org:'중진공',limit:'1억',rate:'2.5%',period:'5년',diff:'easy'},{org:'기보',limit:'3억',rate:'0.5%',period:'7년',diff:'mid'},{org:'소진공',limit:'1억',rate:'3.0%',period:'5년',diff:'easy'},{org:'지역신보',limit:'5천만',rate:'0.8%',period:'3년',diff:'easy'}];
  var dMap   = {easy:{bg:'#dcfce7',tc:'#166534',l:'쉬움'},mid:{bg:'#fef9c3',tc:'#854d0e',l:'보통'},hard:{bg:'#fee2e2',tc:'#991b1b',l:'어려움'}};
  var cReady = d.checklist_ready||['사업자등록증 사본','부가세 신고서 (최근 2년)','국세납부증명서','신용정보 동의서'];
  var cNeed  = d.checklist_need||['사업계획서 (기보 필수)','벤처인증서 (취득 후 추가)'];
  var scoreItems = d.score_items||[
    '기본 자격요건 4개 충족 — 중진공·기보·소진공 등 주요 정책자금 즉시 신청 가능한 상태임',
    '벤처·이노비즈 인증 취득 시 추가 우대 한도 최대 3억원 이상 추가 확보 가능함',
    '현재 조건에서 신청 가능한 자금 총액: 중진공+기보+소진공 합계 최대 약 5억원 수준임'
  ];
  var totalRange = d.total_range || '기본 3억 ~ 최대 7억+';

  function chkS(s){
    return s==='pass'?{bg:'#dcfce7',tc:'#16a34a',ic:'✓',bbc:'#dcfce7',btc:'#166534',bl:'통과'}
      :s==='cond'?{bg:'#fef9c3',tc:'#ca8a04',ic:'!',bbc:'#fef9c3',btc:'#854d0e',bl:'조건부'}
      :{bg:'#fee2e2',tc:'#dc2626',ic:'✗',bbc:'#fee2e2',btc:'#991b1b',bl:'미보유'};
  }
  function fundCat(title, sub, body){
    return '<div class="rp-cat">'
      + '<div class="rp-ph">'
      + '<div class="rp-pnum" style="background:#fff7ed;color:'+color+'">•</div>'
      + '<span class="rp-ptitle">'+title+'</span>'
      + '<span class="rp-psub">'+(sub||'')+'</span>'
      + '</div>'
      + body
      + '</div>';
  }

  var topFunds = funds.slice(0, 3);
  var otherFunds = funds.slice(3);

  var s1 = fundCat('신청 가능성 종합 진단','자격 체크 · 매칭 스코어 · 핵심 판단',
    '<div class="rp-2col">'
    + '<div class="rp-col45">'
    +   '<div class="rp-section" style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:#fff7ed;border-color:#fed7aa">'
    +     '<div style="font-size:13px;font-weight:700;color:'+color+';margin-bottom:10px">신청 가능성 종합 점수</div>'
    +     '<svg viewBox="0 0 130 72" width="138" height="76" style="display:block;margin:4px auto 10px">'
    +       '<path d="M14,62 A52,52 0 0,1 116,62" fill="none" stroke="#e2e8f0" stroke-width="16"/>'
    +       '<path d="M14,62 A52,52 0 0,1 116,62" fill="none" stroke="'+color+'" stroke-width="16" stroke-dasharray="'+gda+' '+(151-gda)+'" stroke-linecap="round"/>'
    +       '<text x="65" y="57" text-anchor="middle" font-size="24" font-weight="700" fill="#1e293b">'+score+'</text>'
    +     '</svg>'
    +     '<div style="font-size:18px;font-weight:800;color:'+color+';line-height:1.2">'+(d.score_desc||'신청 가능')+'</div>'
    +     '<div style="font-size:13px;color:#64748b;margin-top:6px">'+(d.match_count||5)+'개 기관 매칭 완료 · 예상 조달 범위 '+totalRange+'</div>'
    +     '<div class="rp-g3" style="width:100%;margin-top:14px">'
    +       + rpMC('우선 검토', (topFunds[0]&&topFunds[0].name)||'중진공', '즉시 신청 권장', color)
    +       + rpMC('최대 한도', (topFunds[1]&&topFunds[1].limit)||'3억', '단일 기관 기준', '#ea580c')
    +       + rpMC('추가 레버리지', '인증 취득', '벤처·이노비즈 연계', '#7c3aed')
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<div class="rp-colF">'
    +   rpSec('기본 자격 체크리스트', color,
          checks.map(function(c){ var s=chkS(c.status); return '<div class="rp-chk"><div class="rp-chi" style="background:'+s.bg+';color:'+s.tc+'">'+s.ic+'</div><div class="rp-cht">'+c.text+'</div><span class="rp-chb" style="background:'+s.bbc+';color:'+s.btc+'">'+s.bl+'</span></div>'; }).join('')
        )
    +   rpSec('자격 분석 종합', color, rpLst(scoreItems, color))
    + '</div>'
    + '</div>'
  );

  var s2 = fundCat('추천 정책자금 포트폴리오','TOP 자금 · 우선순위 · 신청 포인트',
    '<div class="rp-section" style="margin-bottom:12px;background:#fff7ed;border-color:#fed7aa">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">'
    +   '<div><div style="font-size:14px;font-weight:800;color:'+color+';margin-bottom:4px">추천 우선순위 전략</div><div style="font-size:13px;color:#7c2d12">가장 신청 난도가 낮은 자금부터 확보하고, 인증 취득 후 고한도 보증 상품으로 확장하는 구조임</div></div>'
    +   '<div style="font-size:26px;font-weight:900;color:'+color+'">'+totalRange+'</div>'
    + '</div>'
    + '</div>'
    + '<div class="rp-g3" style="margin-bottom:12px">'
    + topFunds.map(function(f,i){
        return '<div class="rp-rank" style="margin-bottom:0;border-top:4px solid '+rColors[i]+';min-height:150px">'
          + '<div class="rp-rh"><div class="rp-rn" style="background:'+rColors[i]+'">'+f.rank+'</div><span class="rp-rnm">'+f.name+'</span><span class="rp-rlm" style="color:'+rColors[i]+'">'+f.limit+'</span></div>'
          + '<div style="font-size:13px;color:#64748b;line-height:1.55;margin-bottom:10px">우선 검토 대상 자금으로 즉시 신청 가능성·한도·조건을 기준으로 선별함</div>'
          + '<div class="rp-rtgs">'+f.tags.map(function(t,j){ return '<span class="rp-rtg" style="background:'+(j===0?'#fff7ed':'#f8fafc')+';color:'+(j===0?'#c2410c':'#475569')+'">'+t+'</span>'; }).join('')+'</div>'
          + '</div>';
      }).join('')
    + '</div>'
    + '<div class="rp-2col">'
    + '<div class="rp-col50">'
    +   rpSec('추가 검토 가능한 자금', color,
          otherFunds.map(function(f,i){
            var idx = i + 3;
            return '<div class="rp-rank" style="margin-bottom:8px;border-left:4px solid '+rColors[idx]+'">'
              + '<div class="rp-rh"><div class="rp-rn" style="background:'+rColors[idx]+'">'+f.rank+'</div><span class="rp-rnm">'+f.name+'</span><span class="rp-rlm" style="color:'+rColors[idx]+'">'+f.limit+'</span></div>'
              + '<div class="rp-rtgs">'+f.tags.map(function(t){ return '<span class="rp-rtg" style="background:#f8fafc;color:#475569">'+t+'</span>'; }).join('')+'</div>'
              + '</div>';
          }).join('')
        )
    + '</div>'
    + '<div class="rp-colF">'
    +   rpSec('신청 순서 권장안', color, rpLst([
          '1단계: 중진공·소진공 등 신청 난도가 낮은 자금을 먼저 확보해 초기 유동성을 안정화함',
          '2단계: 특허·기술력 기반으로 기보 보증을 연결해 더 큰 한도를 추가 조달하는 구조를 설계함',
          '3단계: 벤처·이노비즈 인증 취득 후 신보 특례보증까지 확장해 총 조달액을 극대화함',
          '4단계: 기관별 심사 일정이 겹치지 않도록 월 단위 제출 캘린더를 운영해 승인 확률을 높임'
        ], color))
    + '</div>'
    + '</div>'
  );

  var s3 = fundCat('기관 비교 및 서류 준비','비교표 · 준비 현황 · 실행 체크',
    '<div class="rp-2col">'
    + '<div class="rp-col50">'
    +   rpSec('기관별 조건 비교표', color,
          '<table class="rp-cmpt"><thead><tr style="background:#fff7ed"><th style="color:'+color+'">기관</th><th style="color:'+color+'">한도</th><th style="color:'+color+'">금리/보증료</th><th style="color:'+color+'">기간</th><th style="color:'+color+'">난이도</th></tr></thead><tbody>'
          + comp.map(function(c,i){ var dm=dMap[c.diff]||dMap.easy; return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'><td style="font-weight:700">'+c.org+'</td><td>'+c.limit+'</td><td style="color:#16a34a;font-weight:700">'+c.rate+'</td><td>'+c.period+'</td><td><span style="background:'+dm.bg+';color:'+dm.tc+';padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700">'+dm.l+'</span></td></tr>'; }).join('')
          + '</tbody></table>'
        )
    +   '<div class="rp-g2" style="margin-top:10px">'
    +     '<div class="rp-section" style="background:#fff7ed;border-color:#fed7aa"><h4 style="color:'+color+'">핵심 비교 포인트</h4>'+rpLst([
            '중진공·소진공은 상대적으로 접근성이 높아 초기 확보용 자금으로 적합함',
            '기보·신보는 보증 구조상 한도가 크지만 기술성과 자료 완성도가 중요함'
          ], color)+'</div>'
    +     '<div class="rp-section" style="background:#fffbeb;border-color:#fde68a"><h4 style="color:#ca8a04">심사 대응 팁</h4>'+rpLst([
            '최근 매출 흐름과 자금 사용계획을 연결해 상환 가능성을 수치 중심으로 설명함',
            '대표자 신용·세금·4대보험 이슈를 사전에 점검해 서류 보완 발생을 최소화함'
          ], '#ca8a04')+'</div>'
    +   '</div>'
    + '</div>'
    + '<div class="rp-colF">'
    +   rpSec('신청 준비 서류 체크리스트', color,
          '<div style="margin-bottom:8px;font-size:13px;font-weight:700;color:#15803d">✅ 준비 완료 서류</div>'
          + cReady.map(function(t){ return '<div class="rp-chk"><div class="rp-chi" style="background:#dcfce7;color:#16a34a">✓</div><div class="rp-cht">'+t+'</div></div>'; }).join('')
          + '<div style="margin:14px 0 8px;font-size:13px;font-weight:700;color:#dc2626">❌ 추가 준비 필요 서류</div>'
          + cNeed.map(function(t){ return '<div class="rp-chk"><div class="rp-chi" style="background:#fee2e2;color:#dc2626">✗</div><div class="rp-cht">'+t+'</div></div>'; }).join('')
        )
    +   rpSec('권장 실행 순서', color, rpLst([
          '이번 주: 신청 대상 1·2순위 확정 및 제출용 기본 서류 취합',
          '2주 내: 자금 사용계획서·사업계획서 보완 후 중진공 또는 소진공 접수',
          '1개월 내: 기술보증용 특허·기술설명 자료 보강 및 기보 상담 진행',
          '분기 내: 벤처·이노비즈 인증 로드맵 착수 후 추가 보증 한도 확보'
        ], color))
    + '</div>'
    + '</div>'
  );

  return tplStyle(color, 'portrait') + '<div class="rp-wrap rp-flow rp-flow-tight">' + cover + s1 + s2 + s3 + '</div>';
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
  var totalBp = bpCerts.reduce(function(s,c){var n=parseFloat(String(c.amount||'').replace(/[^0-9.]/g,'')); return s+(isNaN(n)?0:n);}, 0);
  var nf = cData.needFund>0 ? fKRW(cData.needFund) : '4억원';
  var fundRows = d.s7_rows||[{item:'원재료 구입',amount:'1억 5천만원',ratio:'37.5%',purpose:'돈육 사골 등 핵심 원재료 선매입 및 안정적 재고 확보'},{item:'생산 설비 투자',amount:'1억원',ratio:'25%',purpose:'반자동 생산설비 도입 — 원가율 20% 절감 목표'},{item:'마케팅·채널 확대',amount:'7천만원',ratio:'17.5%',purpose:'SNS 광고·쿠팡 입점·브랜드 마케팅 집행'},{item:'운전자금',amount:'8천만원',ratio:'20%',purpose:'인건비·공과금·운영 고정비 등'}];
  var kpi9 = d.s9_kpi||{y1:'18억',y2:'24억',ch:'5개↑',emp:'11명'};
  var rmYears = d.s9_roadmap||[{year:'2026',tasks:['정책자금 4억 조달 완료','생산 설비 확충 가동','쿠팡·스마트스토어 입점']},{year:'2027',tasks:['벤처인증 취득 완료','B2B 납품 채널 3곳','매출 24억 달성']},{year:'2028',tasks:['이노비즈 취득','매출 35억 달성','자동화 생산 완성']},{year:'2029~',tasks:['해외 수출 추진','기업부설연구소','매출 100억 목표']}];
  var rmColors = ['#16a34a','#2563eb','#7c3aed','#ea580c'];
  var conclusion = d.s10_conclusion||cData.name+'는 창업 이후 단기간에 폭발적인 매출 성장을 달성하며 HMR 시장의 핵심 플레이어로 부상하고 있음. 돈육 사골 농축 압축 기술 특허와 1회 분량 개별 포장이라는 독창적 제품력은 경쟁사가 쉽게 모방할 수 없는 진입 장벽을 구축하고 있음. 정책자금 4억원 조달 시 생산 설비 확충과 마케팅 채널 다각화를 통해 2년 내 매출 24억 달성이 충분히 가능한 성장 기반을 갖추고 있음. 인증 취득 로드맵을 체계적으로 실행하면 추가 자금 최대 6.5억원 확보와 함께 중장기 매출 100억 목표 달성 가능성이 충분히 있음.';
  var yoy = (rev.y24>0&&rev.y25>0)?Math.round(((rev.y25-rev.y24)/rev.y24)*100):21;
  var overviewItems = d.s1_items||[
    '창업 1년 만에 11억 4천만원 달성 → 금년 14억원 예상 — 업종 내 최고 수준의 초고속 성장세를 기록 중임',
    '돈육 사골 농축 압축 기술 특허를 보유하여 경쟁사의 제품 모방 및 시장 진입을 원천 방어하고 있음',
    'HMR 시장 내 돈육 특화 세그먼트에서 독보적인 포지션을 구축하여 빠른 시장 침투를 성공적으로 실현함',
    '소수 정예 4인 팀 운영으로 인당 생산성이 업종 평균을 크게 상회하는 탁월한 운영 효율성을 보여줌',
    '정책자금 4억원 조달 시 생산 설비 확충 및 채널 다각화로 2년 내 매출 2배 이상 성장이 가능한 기반을 보유함'
  ];

  function diffCard(it){
    var bg=bgMap[it.color]||'#f0fdf4', bd=bdMap[it.color]||'#86efac';
    return '<div class="rp-diff" style="background:'+bg+';border:1px solid '+bd+';border-left:5px solid '+it.color+';margin-bottom:0;min-height:132px">'
      + '<div class="rp-dt" style="color:'+it.color+'">'+it.title+'</div>'
      + '<div class="rp-dd">'+it.text+'</div>'
      + '</div>';
  }

  var p1 = rpPage(1,'사업개요 및 핵심지표','기업 정보 · 실행 배경 · 핵심 강점',color,
    '<div class="rp-2col">'
    + '<div class="rp-col45">'
    +   rpSec('기업 기본 정보', color,
          '<table class="rp-ovt" style="border-top-color:'+color+'">'
          + '<tr><th style="color:'+color+'">기업명</th><td colspan="3">'+cData.name+'</td></tr>'
          + '<tr><th style="color:'+color+'">대표자</th><td>'+(cData.rep||'-')+'</td><th style="color:'+color+'">업종</th><td>'+(cData.industry||'-')+'</td></tr>'
          + '<tr><th style="color:'+color+'">설립일</th><td>'+(cData.bizDate||'-')+'</td><th style="color:'+color+'">상시근로자</th><td>'+(cData.empCount||'-')+'명</td></tr>'
          + '<tr><th style="color:'+color+'">핵심아이템</th><td colspan="3">'+(cData.coreItem||'-')+'</td></tr>'
          + '<tr><th style="color:'+color+'">전년 매출</th><td>'+fKRW(rev.y25)+'</td><th style="color:'+color+'">금년 예상</th><td>'+fKRW(exp)+'</td></tr>'
          + '</table>'
        )
    +   '<div class="rp-g2">'
    +     rpMC('업력', cData.bizDate?Math.max(1,Math.round((Date.now()-new Date(cData.bizDate))/31536000000))+'년':'2년', '초기 고성장 단계', color)
    +     rpMC('매출 성장률', '+'+yoy+'%', '전년 대비', '#2563eb')
    +     rpMC('필요 자금', nf, '조달 목표', '#7c3aed')
    +     rpMC('핵심 경쟁력', '특허·제품력', '시장 진입장벽', '#ea580c')
    +   '</div>'
    +   '<div class="rp-section" style="background:#f0fdf4;border-color:#bbf7d0">'
    +     '<h4 style="color:'+color+'">사업 핵심 한 줄 요약</h4>'
    +     '<div style="font-size:14px;line-height:1.75;color:#14532d;font-weight:700">'+(overviewItems[0]||'고성장 기반과 차별화된 제품력을 바탕으로 빠른 확장이 가능한 사업 구조임')+'</div>'
    +   '</div>'
    + '</div>'
    + '<div class="rp-colF">'
    +   rpSec('사업개요 및 추진 배경', color, rpLst(overviewItems, color))
    + '</div>'
    + '</div>'
  );

  var p2 = rpPage(2,'시장기회 및 SWOT','시장 성장성 · 외부환경 · 리스크 구조',color,
    '<div class="rp-2col">'
    + '<div class="rp-col45">'
    +   '<div class="rp-g3" style="margin-bottom:10px">'
    +     rpMC('HMR 시장', '7조원', '2022년 기준', color)
    +     rpMC('연평균 성장률', '18%', '육수·국물 세그먼트', '#2563eb')
    +     rpMC('핵심 소비층', '1~2인 가구 61%', '구조적 성장', '#7c3aed')
    +   '</div>'
    +   rpSec('시장 성장 추이', color, '<div class="rp-ch" style="height:196px"><canvas id="bp-market-chart" style="width:100%;height:100%"></canvas></div>')
    + '</div>'
    + '<div class="rp-colF">'
    +   rpSec('시장 트렌드 분석', color, rpLst(d.s3_items||[
          '1~2인 가구 비율 61%로 증가세 — 간편식 수요가 구조적으로 증가하며 HMR 시장 연 18% 성장 지속',
          '건강·프리미엄 간편식에 대한 소비자 선호도 급상승 — 고가 제품군의 성장이 업계 평균을 크게 상회',
          '쿠팡·마켓컬리 등 온라인 식품 채널 급성장 — 소규모 브랜드의 진입 장벽이 낮아져 성장 기회 확대됨',
          '육수·국물 세그먼트는 HMR 중 가장 빠른 성장 구간 — 대체 불가 필수 식품으로 소비 빈도가 높음',
          '식품 안전·품질 인증(HACCP 등)에 대한 소비자 요구 강화 — 인증 기업이 채널 확보에서 유리한 위치를 점함'
        ], color))
    + '</div>'
    + '</div>'
    + '<div class="rp-swot" style="margin-top:12px">'
    +   '<div class="rp-sws rp-sw"><div class="rp-swl">강점 Strength</div><ul>'+(swot.strength||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +   '<div class="rp-sww rp-sw"><div class="rp-swl">약점 Weakness</div><ul>'+(swot.weakness||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +   '<div class="rp-swo rp-sw"><div class="rp-swl">기회 Opportunity</div><ul>'+(swot.opportunity||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +   '<div class="rp-swt rp-sw"><div class="rp-swl">위협 Threat</div><ul>'+(swot.threat||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    + '</div>'
  );

  var p3 = rpPage(3,'경쟁환경 및 차별화 전략','비교표 · 포지셔닝 · 핵심 우위',color,
    '<div class="rp-2col">'
    + '<div class="rp-col50">'
    +   rpSec('경쟁사 비교표', color,
          '<table class="rp-ctb"><thead><tr><th style="text-align:left">비교 항목</th><th>'+cData.name+'</th><th>경쟁사 A</th><th>경쟁사 B</th></tr></thead>'
          + '<tbody>'+compRows.map(function(r,i){ return '<tr'+(i%2===0?'':' style="background:#f8fafc"')+'><td>'+r.item+'</td><td>'+r.self+'</td><td>'+r.a+'</td><td>'+r.b+'</td></tr>'; }).join('')+'</tbody></table>'
        )
    + '</div>'
    + '<div class="rp-colF">'
    +   rpSec('경쟁력 분석', color, rpLst(d.s4_items||[
          '특허 기술 보유로 동일 제품 제조가 불가능하여 직접적인 가격 경쟁에서 원천 차단됨',
          '1회 개별 포장 스펙으로 경쟁사 제품과 직접 비교가 어려운 독자적 카테고리를 형성하고 있음',
          '창업 초기에 검증된 시장 수요를 보유하여 경쟁사 대비 제품 신뢰도와 재구매율이 높음',
          '초기 시장 선점 효과로 충성 고객 확보 속도가 빨라 경쟁사의 후발 진입을 어렵게 만들고 있음'
        ], color))
    +   '<div class="rp-section" style="background:#fdf4ff;border-color:#e9d5ff"><h4 style="color:#7c3aed">포지셔닝 결론</h4><div style="font-size:13px;color:#5b21b6;line-height:1.7;font-weight:700">특허 기반 기술력과 세그먼트 특화 제품력이 결합되어 후발 경쟁사가 가격만으로 흔들기 어려운 구조를 형성하고 있음</div></div>'
    + '</div>'
    + '</div>'
    + '<div class="rp-g2" style="margin-top:12px">'+(Array.isArray(diffs)&&typeof diffs[0]==='object'?diffs:[]).slice(0,4).map(diffCard).join('')+'</div>'
  );

  var p4 = rpPage(4,'인증·조달 레버리지 전략','가점 확보 · 정책자금 확장 · 실행 우선순위',color,
    '<div class="rp-2col">'
    + '<div class="rp-col50">'
    +   bpCerts.map(function(c,i){
          return '<div class="rp-cert" style="margin-bottom:10px;min-height:88px">'
            + '<div class="rp-certi" style="background:'+bpBgs[i%bpBgs.length]+'">'+bpIcons[i%bpIcons.length]+'</div>'
            + '<div class="rp-certb"><div class="rp-certn">'+c.name+'</div><div class="rp-certd">'+c.effect+'</div></div>'
            + '<div class="rp-certa"><div class="rp-certv" style="color:'+color+'">'+c.amount+'</div><div class="rp-certp">'+c.period+'</div></div>'
            + '</div>';
        }).join('')
    + '</div>'
    + '<div class="rp-colF">'
    +   '<div class="rp-section" style="background:#f0fdf4;border-color:#bbf7d0;margin-bottom:10px;text-align:center">'
    +     '<div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:8px">인증 완료 시 총 추가 조달 가능 한도</div>'
    +     '<div style="font-size:32px;font-weight:900;color:'+color+';line-height:1.2">최대 +'+(totalBp>0?totalBp+'억원':'6억5천만원')+'</div>'
    +     '<div style="font-size:13px;color:#64748b;margin-top:6px">현재 신청 한도 + 인증 취득 후 추가 조달 합계 기준</div>'
    +   '</div>'
    +   rpSec('취득 우선순위 전략', color, rpLst([
          '1순위: 벤처인증 — 자금 한도 확대와 기술성 인정 효과가 동시에 발생하여 가장 먼저 추진할 가치가 높음',
          '2순위: 이노비즈 인증 — 기술혁신 기업 포지션을 강화해 중진공·기보 계열 자금 접근성을 높임',
          '3순위: 기업부설연구소 — 세액공제와 연구개발 신뢰도를 함께 확보해 중장기 자금 조달의 기반을 만듦',
          '4순위: HACCP — 대형 유통과 B2B 채널 확장에 직접 연결되어 매출 성장의 증빙 자료로 활용 가능함'
        ], color))
    +   '<div class="rp-section" style="background:#eff6ff;border-color:#bfdbfe"><h4 style="color:#2563eb">정책자금 연결 포인트</h4>'+rpLst([
          '인증 취득 시 금리·보증료 우대뿐 아니라 심사 신뢰도 향상 효과가 커서 승인 확률 개선에 유리함',
          '사업계획서와 인증 로드맵을 하나의 성장 서사로 연결하면 기관별 심사에서 일관성을 확보할 수 있음'
        ], '#2563eb')+'</div>'
    + '</div>'
    + '</div>'
  );

  var p5 = rpPage(5,'자금 조달 및 사용 계획','필요 자금 '+nf+' · 집행 구조 · 기대 효과',color,
    '<div class="rp-2col">'
    + '<div class="rp-col50">'
    +   rpSec('자금 집행 계획표', color,
          '<table class="rp-ftb"><thead><tr><th style="text-align:left">항목</th><th>금액</th><th>비율</th><th>사용 목적</th></tr></thead>'
          + '<tbody>'+fundRows.map(function(r,i){ return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'><td style="font-weight:700">'+r.item+'</td><td style="text-align:center">'+r.amount+'</td><td style="text-align:center;font-weight:700;color:'+color+'">'+r.ratio+'</td><td>'+r.purpose+'</td></tr>'; }).join('')
          + '<tr style="background:#f0fdf4"><td style="font-weight:700">합계</td><td style="text-align:center;font-weight:700;color:'+color+'">'+nf+'</td><td style="text-align:center;font-weight:700;color:'+color+'">100%</td><td>-</td></tr>'
          + '</tbody></table>'
        )
    + '</div>'
    + '<div class="rp-colF">'
    +   rpSec('집행 비중 요약', color,
          (fundRows||[]).map(function(r,idx){
            var barColor = [color,'#2563eb','#7c3aed','#ea580c'][idx%4];
            var ratioNum = parseFloat(String(r.ratio||'0').replace(/[^0-9.]/g,'')) || 0;
            return rpHB(r.item, ratioNum, r.ratio, barColor);
          }).join('')
        )
    +   rpSec('자금 집행 전략 및 기대 효과', color, rpLst(d.s7_strategy||[
          '1단계: 원재료 선매입으로 공급망 안정성과 원가 협상력을 동시에 확보하여 매출 증가 구간에 대응함',
          '2단계: 생산 설비 투자로 원가율과 생산 리드타임을 함께 낮춰 수익성과 공급 안정성을 높임',
          '3단계: 마케팅·채널 확대를 통해 온라인 유통 접점을 넓히고 반복 구매 기반을 조기에 형성함',
          '4단계: 운전자금 확보로 고성장 구간의 현금흐름 리스크를 줄여 사업 운영의 안정성을 강화함',
          '집행 이후 6개월 단위 KPI 점검 체계를 두어 자금 사용 효과를 정량적으로 관리함'
        ], color))
    + '</div>'
    + '</div>'
  );

  var p6 = rpPage(6,'매출 전망 및 실행 로드맵','1년 시뮬레이션 · 단계별 확장 계획',color,
    '<div class="rp-2col">'
    + '<div class="rp-col45">'
    +   rpSec('월별 매출 시뮬레이션', color, '<div class="rp-ch" style="height:210px"><canvas id="biz-monthly-chart" style="width:100%;height:100%"></canvas></div>')
    +   '<div class="rp-g2" style="margin-top:10px">'
    +     rpMC('1년 후 매출', kpi9.y1, '단기 목표', color)
    +     rpMC('2년 후 매출', kpi9.y2, '중기 목표', '#2563eb')
    +     rpMC('목표 채널', kpi9.ch, '유통 다각화', '#7c3aed')
    +     rpMC('목표 인력', kpi9.emp, '운영 확장', '#ea580c')
    +   '</div>'
    + '</div>'
    + '<div class="rp-colF">'
    +   '<div class="rp-gph rp-gphs" style="margin-bottom:8px"><div class="rp-gphh">단기 1년</div><ul>'+(d.s8_short||['정책자금 4억 조달 완료','쿠팡·스마트스토어 입점','생산 설비 교체 가동','월 매출 1.5억 달성']).map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'
    +   '<div class="rp-gph rp-gphm" style="margin-bottom:8px"><div class="rp-gphh">중기 3년</div><ul>'+(d.s8_mid||['벤처인증 취득 완료','B2B 납품 3채널 확보','이노비즈 인증 추진','매출 24억 달성']).map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'
    +   '<div class="rp-gph rp-gphl"><div class="rp-gphh">장기 5년</div><ul>'+(d.s8_long||['자동화 생산 체계 완성','해외 수출 시장 진출','기업부설연구소 설립','매출 100억 달성']).map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'
    + '</div>'
    + '</div>'
    + rpSec('연차별 실행 로드맵', color,
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px">'
        + rmYears.map(function(r,i){
            return '<div style="border-radius:8px;padding:12px;border:1px solid #e2e8f0;border-top:4px solid '+rmColors[i]+';background:white;min-height:146px">'
              + '<div style="font-size:13px;font-weight:800;color:'+rmColors[i]+';margin-bottom:8px">'+r.year+'</div>'
              + (r.tasks||[]).map(function(t){ return '<div style="font-size:13px;color:#475569;padding-left:11px;position:relative;line-height:1.55;margin-bottom:5px"><span style="position:absolute;left:0;color:'+rmColors[i]+';font-weight:700">•</span>'+t+'</div>'; }).join('')
              + '</div>';
          }).join('')
        + '</div>'
      )
  );

  var p7 = rpPage(7,'종합 제언','최종 평가 · 컨설턴트 의견 · 실행 권고',color,
    '<div class="rp-2col">'
    + '<div class="rp-col50">'
    +   '<div class="rp-cls" style="height:100%">'
    +     '<div class="rp-clst">'+cData.name+' 종합 의견</div>'
    +     '<div class="rp-clstx">'+conclusion+'</div>'
    +   '</div>'
    + '</div>'
    + '<div class="rp-colF">'
    +   '<div class="rp-g4" style="margin-bottom:12px">'
    +     [{l:'시장성',v:'★★★★★',c:color},{l:'기술력',v:'★★★★★',c:'#2563eb'},{l:'성장성',v:'★★★★★',c:'#7c3aed'},{l:'실행력',v:'★★★★☆',c:'#ea580c'}].map(function(r){
            return '<div class="rp-mc" style="border-top:3px solid '+r.c+'"><div class="rp-mcl">'+r.l+'</div><div class="rp-mcv" style="color:'+r.c+';font-size:17px">'+r.v+'</div><div class="rp-mcd">사업계획서 관점 평가</div></div>';
        }).join('')
    +   '</div>'
    +   rpSec('핵심 실행 메시지', color, rpLst([
          '차별화된 제품력과 시장 성장성이 동시에 확인되어 자금 조달 후 확장 전략의 설득력이 높음',
          '인증 취득·자금 조달·채널 확대를 하나의 실행 패키지로 묶어 추진할 때 성과 속도가 가장 빠르게 나타남',
          '초기 고성장 구간인 만큼 운영체계와 현금흐름 관리까지 함께 설계해야 성장의 질을 유지할 수 있음',
          '본 사업계획서는 심사용 기본 문서로 활용 가능하며 기관별 요구사항에 맞춰 세부 수치만 보정하면 즉시 제출 수준임'
        ], color))
    + '</div>'
    + '</div>'
  );

  return tplStyle(color, 'landscape') + '<div class="rp-wrap">' + cover + p1 + p2 + p3 + p4 + p5 + p6 + p7 + '</div>';
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
      try { new Chart(ra.getContext('2d'),{type:'radar',data:{labels:['재무','전략/마케팅','인사','운영','IT'],datasets:[{data:ra.dataset.scores.split(',').map(Number),backgroundColor:'rgba(59,130,246,0.18)',borderColor:'#3b82f6',borderWidth:2,pointBackgroundColor:'#1e3a8a',pointBorderColor:'#ffffff',pointBorderWidth:2,pointRadius:4,pointHoverRadius:6}]},options:{layout:{padding:{top:6,right:10,bottom:6,left:10}},scales:{r:{min:0,max:100,ticks:{display:false,stepSize:20,showLabelBackdrop:false},angleLines:{color:'rgba(148,163,184,0.28)'},grid:{color:'rgba(148,163,184,0.20)'},pointLabels:{font:{size:13,weight:'bold'},color:'#475569'}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}}); } catch(e){console.error('레이더 오류:',e);}
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
    if(fg) {
      safeDestroyChart(fg);
      try {
        var gd = fg.dataset || {};
        var growthData = [+(gd.y1||0), +(gd.y2||0), +(gd.y3||0)];
        if (!growthData[0] && !growthData[1] && !growthData[2]) growthData = [140000,240000,350000];
        new Chart(fg.getContext('2d'),{type:'line',data:{labels:['2026','2027','2028'],datasets:[{data:growthData,borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,0.15)',borderWidth:3,pointRadius:6,pointHoverRadius:7,fill:true,tension:0.3}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:11},callback:function(v){return v>=10000?Math.floor(v/10000)+'억':v.toLocaleString()+'만';}}}}}});
      } catch(e){}
    }
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
function buildMgmtCombinedPrompt(cData, fRev) {
  var nm=cData.name, ind=cData.industry||'제조업', itm=cData.coreItem||'주력제품', emp=cData.empCount||'4', rep=cData.rep||'대표';
  var r25=fRev.매출_2025년||'0원', r24=fRev.매출_2024년||'0원', rExp=fRev.금년예상연간매출||'0원', rCur=fRev.금년매출_전월말기준||'0원';
  return '너는 대한민국 최고 수준의 경영컨설턴트야. \n'
    +'아래 기업 데이터를 기반으로 경영진단보고서에 필요한 전체 데이터를 한 번에 생성해.\n'
    +'기업전달용(긍정적 톤)과 컨설턴트 내부용(리스크 솔직 기술) 데이터를 하나의 JSON에 모두 담아줘.\n\n'
    +'【필수 규칙】\n'
    +'- 기업명 \''+nm+'\', 핵심아이템 \''+itm+'\', 실제 수치('+r25+', '+rExp+') 를 각 항목에 반드시 자연스럽게 포함\n'
    +'- 모든 텍스트 항목은 반드시 60자 이상, 구체적이고 실질적인 내용으로 작성\n'
    +'- JSON만 출력 (마크다운·설명 텍스트 없이)\n\n'
    +'JSON 구조:\n'
    +'{'
    +'"grade":"A- 등 등급",'
    +'"grade_desc":"고성장 유망기업 등 8자이내",'

    // ── 공통 데이터 (기업전달용·컨설턴트용 모두 사용) ──
    +'"overview":["'+nm+'의 현황 5개항목 각60자이상"],'
    +'"finance_strengths":["'+nm+'의 재무강점 4개 각60자이상"],'
    +'"finance_risks":["'+nm+'의 재무개선포인트 3개 각60자이상"],'
    +'"radar":[재무점수,전략점수,인사점수,운영점수,IT점수],'
    +'"marketing_bars":{"finance":점수,"strategy":점수,"operation":점수,"hr":점수,"it":점수},'
    +'"marketing":["'+nm+'의 '+itm+' 마케팅분석 5개 각60자이상"],'
    +'"marketing_items":["포지셔닝전략 3개 각50자이상"],'
    +'"hr":["'+nm+' 인사조직 5개 각60자이상"],'
    +'"ops":["'+nm+' 운영생산 5개 각60자이상"],'
    +'"it":["'+nm+' IT디지털 5개 각60자이상"],'
    +'"certs":['
      +'{"name":"벤처기업 인증","effect":"'+nm+'의 '+itm+' 기술력 인정으로 중진공·기보 우대금리 적용 — 추가 자금 한도 최대 2억원 확보 가능","amount":"+2억","period":"6개월 내"},'
      +'{"name":"이노비즈 인증","effect":"'+nm+'의 기술혁신형 기업 인증으로 중진공 기술개발자금 신청 자격 부여 및 기보 우대 보증 적용","amount":"+3억","period":"1년 내"},'
      +'{"name":"기업부설연구소","effect":"'+nm+'의 R&D 세액공제 25% 적용 및 기보 기술보증 우대 — 절세+보증 시너지 효과 동시 달성","amount":"+1.5억","period":"세액공제 병행"},'
      +'{"name":"HACCP 인증","effect":"'+nm+' '+itm+' 제품의 대형마트·단체급식 납품 채널 확대 직접 연결 — B2B 매출 신규 확보","amount":"채널↑","period":"매출 확대"}'
    +'],'
    +'"roadmap_short":["'+nm+' 단기실행 6개 각35자이상"],'
    +'"roadmap_mid":["'+nm+' 중기실행 6개 각35자이상"],'
    +'"roadmap_long":["'+nm+' 장기실행 6개 각35자이상"],'
    +'"summary":["'+nm+' 종합의견 3개 각80자이상"],'

    // ── 컨설턴트 전용 데이터 ──
    +'"key_risks":["'+nm+' 핵심리스크 4개 각70자이상 솔직하게"],'
    +'"fb_finance":["재무 컨설턴트피드백 3개 각70자이상 날카롭게"],'
    +'"fb_marketing":["마케팅 컨설턴트피드백 3개 각70자이상 날카롭게"],'
    +'"fb_hr_ops":["인사운영 컨설턴트피드백 3개 각70자이상 날카롭게"],'
    +'"fb_it":["IT 컨설턴트피드백 3개 각70자이상 날카롭게"],'
    +'"fb_roadmap":["로드맵 컨설턴트피드백 2개 각70자이상 날카롭게"],'
    +'"consultant_issues":["'+nm+' 시급이슈TOP3 각80자이상 매우구체적으로"],'
    +'"consultant_funds":["'+nm+' 정책자금신청전략 4개 각70자이상"],'
    +'"consultant_certs":["인증취득전략 3개 각60자이상"],'
    +'"consultant_marketing":["마케팅개선 3개 각60자이상"],'
    +'"consultant_credit":["신용개선 2개 각50자이상"]'
    +'}'
    +'\n\n[기업 데이터] 기업명:'+nm+', 업종:'+ind+', 핵심아이템:'+itm+', 상시근로자:'+emp+'명, 대표:'+rep
    +', 전년매출:'+r25+', 전전년:'+r24+', 금년예상:'+rExp+', 금년현재:'+rCur;
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
  return '디지털마케팅 전문가. \''+nm+'\'의 \''+itm+'\' 마케팅 제안서. 기업명·제품명·실제 매출수치 반영. JSON만.\n\n'
    +'{"channels":[{"name":"SNS (인스타그램, 유튜브 쇼츠, 틱톡)","score":92},{"name":"네이버 검색광고 및 블로그 체험단","score":85},{"name":"인플루언서 협업 및 리뷰 마케팅","score":80},{"name":"쿠팡·마켓컬리 등 이커머스 광고","score":75},{"name":"제휴 마케팅 (밀키트·HMR 브랜드)","score":60}],'
    +'"strategies":["'+nm+'의 '+itm+' 마케팅 전략 5개 각 60자 이상"],'
    +'"budget_total":"700만원/월",'
    +'"budget":[{"name":"SNS 광고","ratio":40},{"name":"검색광고","ratio":25},{"name":"체험단·리뷰","ratio":20},{"name":"콘텐츠 제작","ratio":15}],'
    +'"principles":["예산 운영 원칙 3개 각 45자 이상"],'
    +'"kpi":[{"label":"SNS 팔로워","value":"+5,000","period":"3개월"},{"label":"월 매출 증가","value":"+40%","period":"6개월"},{"label":"재구매율","value":"45%","period":"목표"},{"label":"리뷰 누적","value":"700건","period":"6개월"},{"label":"검색량 증가","value":"+50%","period":"3개월"},{"label":"정기구독 전환","value":"45%","period":"목표"}],'
    +'"roadmap":[{"period":"1월","task":"'+nm+' SNS 채널 리뉴얼 및 숏폼 브랜딩 강화","highlight":false},{"period":"2월","task":"'+itm+' 인플루언서 1차 협업 및 숏폼 콘텐츠 기획","highlight":false},{"period":"3월","task":"'+itm+' 바이럴 캠페인 런칭","highlight":false},{"period":"4월","task":"마케팅 성과 분석 및 채널별 최적화 진행","highlight":true},{"period":"5월","task":"마케팅 성과 분석 및 채널별 최적화 진행","highlight":true},{"period":"6월","task":"정기구독 서비스 론칭 및 프로모션 운영","highlight":false},{"period":"7월~","task":"B2B 채널·외식업체·급식업체 대상 영업 및 재유통 확대","highlight":false},{"period":"8월","task":"리뷰 확보 캠페인 및 검색광고 확장","highlight":false},{"period":"9월","task":"라이브커머스·이커머스 프로모션 집행","highlight":false},{"period":"10월","task":"브랜드 검색량 증대형 콘텐츠 집중 집행","highlight":false},{"period":"11월","task":"재구매 고객 리텐션 캠페인 운영","highlight":false},{"period":"12월","task":"연말 프로모션 및 성과 정리","highlight":false}],'
    +'"focus_boxes":[{"icon":"📊","title":"1~3개월 핵심 지표","items":["핵심 지표 3개"]},{"icon":"📈","title":"4~6개월 핵심 지표","items":["핵심 지표 3개"]},{"icon":"📝","title":"1~3개월 실행 체크","items":["실행 체크 3개"]},{"icon":"🎯","title":"4~6개월 성과 목표","items":["성과 목표 3개"]}]}\n\n'
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
  finance:     {typeLabel:'재무진단',    title:'상세 재무진단',       contentAreaId:'finance-content-area',    landscape:false, buildPrompt:buildFinancePrompt,   buildHTML:buildFinanceHTML},
  aiTrade:     {typeLabel:'상권분석',    title:'AI 상권분석 리포트',  contentAreaId:'aiTrade-content-area',    landscape:false, buildPrompt:buildTradePrompt,     buildHTML:buildTradeHTML},
  aiMarketing: {typeLabel:'마케팅제안',  title:'마케팅 제안서',        contentAreaId:'aiMarketing-content-area',landscape:false, buildPrompt:buildMarketingPrompt, buildHTML:buildMarketingHTML},
  aiFund:      {typeLabel:'정책자금매칭',title:'AI 정책자금매칭',      contentAreaId:'aiFund-content-area',     landscape:false, buildPrompt:buildFundPrompt,      buildHTML:buildFundHTML},
  aiBiz:       {typeLabel:'사업계획서',  title:'AI 사업계획서',        contentAreaId:'aiBiz-content-area',      landscape:true,  buildPrompt:buildBizPlanPrompt,   buildHTML:buildBizPlanHTML}
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
  if (!cData) { alert('기업 정보를 찾을 수 없음.'); return; }
  var rev  = cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
  var fRev = fRevAI(cData, rev);

  if (overlay) {
    overlay.style.display = 'flex';
    var tt = document.getElementById('loading-title-text');
    var td = document.getElementById('loading-desc-text');
    if(tt) tt.textContent = '경영진단보고서 생성 중...';
    if(td) td.innerHTML = '<b>'+cData.name+'</b> 기업 데이터를 종합 분석하여<br>'
      +'기업전달용 + 컨설턴트용을 <b style="color:#3b82f6">동시에</b> 생성함.<br>'
      +'<b style="color:#3b82f6">최대 90초</b>가 소요될 수 있음.';
  }

  var data = null;
  try {
    // ★ 하나의 통합 프롬프트로 두 버전 데이터 동시 생성
    data = await callGeminiJSON(buildMgmtCombinedPrompt(cData, fRev), 16384);
  } catch(e) {
    console.error('보고서 생성 오류:', e);
    alert('보고서 생성 오류: ' + (e.message||'알 수 없는 오류'));
  } finally {
    if (overlay) overlay.style.display = 'none';
  }
  if (!data) return;

  var today = new Date().toISOString().split('T')[0];
  var rs = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');

  // ★ 두 버전 모두 저장 (같은 데이터, 다른 버전 태그)
  var idBase = Date.now();
  var rptClient = {
    id:'rep_'+idBase+'_c',
    type:'경영진단', company:cData.name,
    title:'경영진단보고서 (기업전달용)',
    date:today, content:JSON.stringify(data),
    version:'client', revenueData:rev, reportType:'management'
  };
  var rptConsultant = {
    id:'rep_'+(idBase+1)+'_k',
    type:'경영진단', company:cData.name,
    title:'경영진단보고서 (컨설턴트용)',
    date:today, content:JSON.stringify(data),
    version:'consultant', revenueData:rev, reportType:'management'
  };
  rs.push(rptClient);
  rs.push(rptConsultant);
  localStorage.setItem(DB_REPORTS, JSON.stringify(rs));
  updateDataLists();

  tab.querySelector('[id$="-input-step"]').style.display = 'none';
  tab.querySelector('[id$="-result-step"]').style.display = 'block';

  var ca = document.getElementById('report-content-area');
  resetContentArea(ca);

  // ★ 클릭한 버튼의 버전을 먼저 표시
  try {
    ca.innerHTML = version==='client'
      ? buildMgmtClientHTML(data, cData, rev, today)
      : buildMgmtConsultantHTML(data, cData, rev, today);
  } catch(htmlErr) {
    console.error('HTML 빌드 오류:', htmlErr);
    ca.innerHTML = '<div style="padding:40px;color:red;font-size:14px;background:white;border-radius:8px"><b>⚠️ 보고서 렌더링 오류</b><br><pre style="margin-top:10px;font-size:12px;white-space:pre-wrap">' + (htmlErr.stack||String(htmlErr)) + '</pre></div>';
  }

  _currentReport = {
    company: cData.name,
    type: '경영진단보고서 ('+(version==='client'?'기업전달용':'컨설턴트용')+')',
    contentAreaId: 'report-content-area',
    landscape: false
  };
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
  if (!cData) { alert('기업 정보를 찾을 수 없음.'); return; }
  var rev  = cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
  var fRev = fRevAI(cData, rev);
  var cfg  = REPORT_CONFIGS[type]; if (!cfg) return;
  if (overlay) {
    overlay.style.display = 'flex';
    var tt = document.getElementById('loading-title-text');
    var td = document.getElementById('loading-desc-text');
    var typeNames = {finance:'상세 재무진단', aiTrade:'상권분석 리포트', aiMarketing:'마케팅 제안서', aiFund:'정책자금매칭', aiBiz:'AI 사업계획서'};
    if(tt) tt.textContent = (typeNames[type]||'보고서') + ' 생성 중...';
    var waitSec = type==='aiBiz' ? '최대 <b style="color:#3b82f6">90초</b>' : '최대 <b style="color:#3b82f6">60초</b>';
    if(td) td.innerHTML = cData.name + ' 기업 데이터를 분석하여<br>맞춤형 ' + (typeNames[type]||'보고서') + '를 작성하고 있음.<br>' + waitSec + '가 소요될 수 있음.';
  }
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
      try {
      ca.innerHTML = r.version==='client' ? buildMgmtClientHTML(data,cData,rev,r.date) : buildMgmtConsultantHTML(data,cData,rev,r.date);
    } catch(htmlErr2) {
      console.error('viewReport HTML 오류:', htmlErr2);
      ca.innerHTML = '<div style="padding:40px;color:red;font-size:14px;background:white;border-radius:8px"><b>⚠️ 보고서 렌더링 오류</b><br><pre style="margin-top:10px;font-size:12px;white-space:pre-wrap">' + (htmlErr2.stack||String(htmlErr2)) + '</pre></div>';
    }
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
