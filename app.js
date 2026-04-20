// ===== BizConsult AI 보고서 플랫폼 =====
const DB_USERS    = 'biz_users';
const DB_SESSION  = 'biz_session';
const STORAGE_KEY = 'biz_consult_companies';
const DB_REPORTS  = 'biz_reports';
const DB_SUPPORT_DOC = 'biz_support_documents';
const DB_NOTICES     = 'biz_dashboard_notices';
let _currentReport = { company:'', type:'', contentAreaId:'', landscape:true };

// ===========================
// ★ PDF 인쇄 (가로/세로 동적 대응)
// ===========================
window.printReport = function() {
  var caid = _currentReport.contentAreaId;
  if (!caid) {
    var ids = ['report-content-area','finance-content-area','aiBiz-content-area','aiFund-content-area','aiTrade-content-area','aiMarketing-content-area'];
    for (var k=0; k<ids.length; k++) { var e=document.getElementById(ids[k]); if(e&&e.innerHTML.trim()){caid=ids[k];break;} }
  }
  var el = document.getElementById(caid);
  if (!el || !el.innerHTML.trim()) { alert('출력할 보고서가 없습니다.'); return; }

  var pw = window.open('','_blank','width=1400,height=900,scrollbars=yes');
  if (!pw) { alert('팝업이 차단되었습니다. 팝업을 허용해 주세요.'); return; }

  var isLandscape = (_currentReport.landscape === true);
  var pageW = isLandscape ? '297mm' : '210mm';
  var pageH = isLandscape ? '210mm' : '297mm';

  var printCSS = `
    @page { size: ${pageW} ${pageH}; margin: 0; }
    * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    body { margin: 0; padding: 0; background: white; font-family: "Malgun Gothic","Apple SD Gothic Neo",sans-serif; }
    .rp-wrap { background: white !important; padding: 0 !important; }
    .rp-cover, .rp-page {
      width: ${pageW} !important;
      height: ${pageH} !important;
      margin: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      page-break-after: always !important;
      break-after: page !important;
      display: flex !important;
      flex-direction: column !important;
      position: relative !important;
      overflow: hidden !important;
    }
    .rp-section { page-break-inside: avoid !important; break-inside: avoid !important; }
  `;

  pw.document.write(`<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${_currentReport.type||'보고서'}</title>
<style>${printCSS}</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
</head><body>
${el.innerHTML}
<script>
window.onload = function() {
  var ra = document.getElementById('rp-radar');
  if(ra && ra.dataset.scores){
    new Chart(ra.getContext('2d'),{type:'radar',data:{labels:['재무','전략/마케팅','인사','운영','IT'],datasets:[{data:ra.dataset.scores.split(',').map(Number),backgroundColor:'rgba(59,130,246,0.18)',borderColor:'#3b82f6',pointRadius:5}]},options:{scales:{r:{min:0,max:100}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});
  }
  var li = document.getElementById('rp-linechart');
  if(li && li.dataset.y23){
    new Chart(li.getContext('2d'),{type:'line',data:{labels:['2023','2024','2025','금년(예)'],datasets:[{data:[+li.dataset.y23,+li.dataset.y24,+li.dataset.y25,+li.dataset.exp],borderColor:'#3b82f6',fill:true,tension:0.3}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}}}});
  }
  setTimeout(function(){ window.print(); }, 2000);
};
<\/script></body></html>`);
  pw.document.close();
};

// ===========================
// ★ 초기화 및 인증
// ===========================
document.addEventListener('DOMContentLoaded', function() {
  initTestAccount();
  checkAuth();
  const urlParams = new URLSearchParams(window.location.search);
  showTab(urlParams.get('tab') || 'dashboard', false);
  initInputHandlers();
});

function initTestAccount() {
  let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
  if (!users.find(u => u.email === 'test@biz.com')) {
    users.push({ email: 'test@biz.com', pw: '1234', name: '선지영', dept: '솔루션빌더스', apiKey: '' });
    localStorage.setItem(DB_USERS, JSON.stringify(users));
  }
}

window.devBypassLogin = function() {
  const tu = { email:'test@biz.com', pw:'1234', name:'선지영', dept:'솔루션빌더스', apiKey:'' };
  localStorage.setItem(DB_SESSION, JSON.stringify(tu));
  location.reload();
};

function checkAuth() {
  const session = JSON.parse(localStorage.getItem(DB_SESSION));
  const authEl = document.getElementById('auth-container');
  const appEl  = document.getElementById('main-app');
  if (session) { authEl.style.display='none'; appEl.style.display='flex'; loadUserProfile(); updateDataLists(); }
  else { authEl.style.display='flex'; appEl.style.display='none'; }
}

window.handleLogin = function() {
  const email=document.getElementById('login-email').value, pw=document.getElementById('login-pw').value;
  const user=JSON.parse(localStorage.getItem(DB_USERS)||'[]').find(u=>u.email===email&&u.pw===pw);
  if (user) { localStorage.setItem(DB_SESSION,JSON.stringify(user)); location.reload(); }
  else alert('로그인 정보를 확인해주세요.');
};

window.handleLogout = function() { localStorage.removeItem(DB_SESSION); location.reload(); };

// ===========================
// ★ 설정 및 프로필 (잠금 기능 포함)
// ===========================
function loadUserProfile() {
  const user=JSON.parse(localStorage.getItem(DB_SESSION)); if (!user) return;
  document.getElementById('display-user-name').innerText = user.name;
  document.getElementById('display-user-dept').innerText = user.dept || '솔루션빌더스';
  if(document.getElementById('set-user-name')){
    document.getElementById('set-user-name').value=user.name;
    document.getElementById('set-user-email').value=user.email;
    document.getElementById('set-user-dept').value=user.dept||'';
    if(user.apiKey) {
      document.getElementById('set-api-key').value=user.apiKey;
      lockApiKeyUI(true);
    }
  }
}

window.saveApiSettings=function(){
  const key = document.getElementById('set-api-key').value.trim();
  if(!key){ alert('API 키를 입력해주세요.'); return; }
  let s=JSON.parse(localStorage.getItem(DB_SESSION));
  s.apiKey=key; updateUserDB(s); lockApiKeyUI(true);
  alert('API 키가 저장되었습니다.');
};

function lockApiKeyUI(isLocked) {
  document.getElementById('set-api-key').disabled = isLocked;
  document.getElementById('btn-api-save').style.display = isLocked ? 'none' : 'inline-block';
  document.getElementById('btn-api-edit').style.display = isLocked ? 'inline-block' : 'none';
}

window.unlockApiKey=function(){ lockApiKeyUI(false); };

function updateUserDB(u){
  let users=JSON.parse(localStorage.getItem(DB_USERS));
  const i=users.findIndex(x=>x.email===u.email);
  if(i>-1) users[i]=u;
  localStorage.setItem(DB_USERS,JSON.stringify(users));
  localStorage.setItem(DB_SESSION,JSON.stringify(u));
}

// ===========================
// ★ 통합 표지 빌더 (테이블 삭제 및 레이아웃 통일)
// ===========================
function buildUnifiedCover(reportTitle, versionLabel, cData, dateStr, accentColor) {
  var session = JSON.parse(localStorage.getItem(DB_SESSION)||'{}');
  var cName = session.name||'담당 컨설턴트';
  var cDept = session.dept||'솔루션빌더스';

  return '<div class="rp-cover" style="padding:0;background:white;position:relative;display:flex;flex-direction:column;box-sizing:border-box;">'
    +'<div style="position:absolute;left:0;top:0;bottom:0;width:12px;background:'+accentColor+'"></div>'
    +'<div style="padding:45px 50px 20px 50px; font-size:14px; font-weight:700; color:'+accentColor+'; text-align:left;">'+reportTitle+'</div>'
    +'<div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding:0 70px;">'
    +'  <div style="font-size:52px; font-weight:900; color:#0f172a; letter-spacing:-1.5px; line-height:1.1; margin-bottom:5px;">'+reportTitle+'</div>'
    +   (versionLabel ? '<div style="font-size:22px; color:#94a3b8; font-weight:500; text-align:right;">'+versionLabel+'</div>' : '')
    +'</div>'
    +'<div style="padding:0 70px 80px;">'
    +'  <div style="font-size:26px; font-weight:800; color:#0f172a; margin-bottom:5px;">'+cData.name+'</div>'
    +'  <div style="font-size:14px; color:#64748b; font-weight:500;">'+(cData.industry||'-')+'</div>'
    +'</div>'
    +'<div style="display:flex; justify-content:space-between; align-items:center; padding:20px 50px; border-top:1px solid #f1f5f9; font-size:11px; color:#94a3b8; font-weight:500;">'
    +'  <span>📅 보고서 작성일: '+dateStr+'</span>'
    +'  <span>👤 담당 컨설턴트: '+cName+'</span>'
    +'  <span>🏢 '+cDept+'</span>'
    +'</div>'
    +'</div>';
}

function buildCoverHTML(cData, config, rev, dateStr) {
  var color = config.borderColor||'#3b82f6';
  var vLabel = config.version==='consultant' ? '컨설턴트용' : config.version==='client' ? '기업전달용' : (config.vLabel||'');
  var displayVLabel = vLabel ? "(" + vLabel + ")" : "";
  return buildUnifiedCover(config.title||"보고서", displayVLabel, cData, dateStr, color);
}

// ===========================
// ★ 보고서 생성 및 렌더링
// ===========================
var REPORT_CONFIGS = {
  finance:     {typeLabel:'재무진단',    title:'상세 재무진단 리포트',   contentAreaId:'finance-content-area',    landscape:false, accent:'#2563eb'},
  aiTrade:     {typeLabel:'상권분석',    title:'상권분석 리포트', contentAreaId:'aiTrade-content-area',    landscape:false, accent:'#0d9488'},
  aiMarketing: {typeLabel:'마케팅제안',  title:'마케팅 제안서',   contentAreaId:'aiMarketing-content-area',landscape:false, accent:'#db2777'},
  aiFund:      {typeLabel:'정책자금매칭',title:'정책자금 매칭 리포트',    contentAreaId:'aiFund-content-area',     landscape:false, accent:'#ea580c'},
  aiBiz:       {typeLabel:'사업계획서',  title:'사업계획서',      contentAreaId:'aiBiz-content-area',      landscape:true,  accent:'#16a34a'}
};

window.generateReport = async function(type, version, event) {
  var tab = event.target.closest('.tab-content');
  var cN  = tab.querySelector('.company-dropdown').value;
  if (!cN) { alert('기업을 선택해주세요.'); return; }
  var cs  = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  var cData = cs.find(c=>c.name===cN);
  
  const session = JSON.parse(localStorage.getItem(DB_SESSION));
  if(!session.apiKey) { alert('설정에서 API 키를 먼저 저장하세요.'); showTab('settings'); return; }

  const overlay = document.getElementById('ai-loading-overlay');
  overlay.style.display = 'flex';
  await new Promise(r => setTimeout(r, 800));

  try {
    const today = new Date().toISOString().split('T')[0];
    const color = version === 'client' ? '#2563eb' : '#1e293b';
    const vLabel = version === 'client' ? '(기업전달용)' : '(컨설턴트용)';
    
    // 표지 생성
    const cover = buildUnifiedCover("경영진단보고서", vLabel, cData, today, color);
    
    // 내용 생성 (간략 예시)
    const page1 = `<div class="rp-page" style="padding:50px;"><h2>1. 진단 개요</h2><p>본 보고서는 ${cN}의 경영 현황을 분석한 결과입니다.</p></div>`;

    document.getElementById('report-input-step').style.display = 'none';
    document.getElementById('report-result-step').style.display = 'block';
    const ca = document.getElementById('report-content-area');
    ca.innerHTML = `<div class="rp-wrap">${cover}${page1}</div>`;
    
    _currentReport = { company:cN, type:'경영진단보고서', contentAreaId:'report-content-area', landscape:false };
  } catch(e) { alert('오류 발생'); } 
  finally { overlay.style.display = 'none'; }
};

window.generateAnyReport = async function(type, version, event) {
  var tab = event.target.closest('.tab-content');
  var cN  = tab.querySelector('.company-dropdown').value;
  if (!cN) { alert('기업을 선택하세요.'); return; }
  const cfg = REPORT_CONFIGS[type];

  const overlay = document.getElementById('ai-loading-overlay');
  overlay.style.display = 'flex';
  await new Promise(r => setTimeout(r, 800));

  try {
    const today = new Date().toISOString().split('T')[0];
    const cover = buildUnifiedCover(cfg.title, "", cData, today, cfg.accent);
    
    tab.querySelector('[id$="-input-step"]').style.display = 'none';
    tab.querySelector('[id$="-result-step"]').style.display = 'block';
    const areaId = cfg.contentAreaId;
    document.getElementById(areaId).innerHTML = `<div class="rp-wrap">${cover}<div class="rp-page" style="padding:50px;"><h2>상세 내용</h2><p>데이터 스캔 결과...</p></div></div>`;
    
    _currentReport = { company:cN, type:cfg.title, contentAreaId:areaId, landscape:cfg.landscape };
  } catch(e) { alert('오류 발생'); }
  finally { overlay.style.display = 'none'; }
};

// ===========================
// ★ 기타 UI 핸들러
// ===========================
window.showTab = function(id) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const m = document.getElementById('menu-' + id); if (m) m.classList.add('active');
  updateDataLists();
};

window.updateDataLists = () => {
  const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  document.querySelectorAll('.company-dropdown').forEach(sel => {
    sel.innerHTML = '<option value="">기업 선택</option>' + list.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  });
};

window.saveCompanyData = function() {
  const name = document.getElementById('comp_name').value;
  const data = { name, industry: document.getElementById('comp_industry').value, date: new Date().toISOString().split('T')[0] };
  let list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  list.push(data); localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  alert('기업 정보 저장 완료'); showTab('company');
};

window.showCompanyList = () => { document.getElementById('company-list-step').style.display='block'; document.getElementById('company-form-step').style.display='none'; renderCompanyCards(); };
window.showCompanyForm = () => { document.getElementById('company-list-step').style.display='none'; document.getElementById('company-form-step').style.display='block'; };
window.backToInput = (id) => { document.getElementById(id + '-input-step').style.display = 'block'; document.getElementById(id + '-result-step').style.display = 'none'; };
window.renderCompanyCards = () => { /* 카드 렌더링 로직 */ };
function initInputHandlers() { /* 포맷터 로직 */ }

console.log("완료");
