// ===== BizConsult AI 보고서 플랫폼 =====
const DB_USERS       = 'biz_users';
const DB_SESSION     = 'biz_session';
// ===== API 서버 URL (Netlify Functions 사용) =====
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : '';  // Netlify: 상대경로로 /.netlify/functions/api 사용

async function apiCall(path, options={}) {
  const token = localStorage.getItem('biz_jwt_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers||{}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) {
    // 401: 토큰 만료 또는 인증 실패 → 로컬 데이터 보존 후 재로그인 안내
    if (res.status === 401) {
      const err = new Error(data.error || '인증이 만료되었습니다.');
      err.isAuthError = true;
      throw err;
    }
    throw new Error(data.error || '서버 오류가 발생했습니다.');
  }
  return data;
}
const STORAGE_KEY_BASE = 'biz_consult_companies';
const DB_REPORTS_BASE  = 'biz_reports';
const DB_SUPPORT_DOC   = 'biz_support_documents';
const DB_NOTICES       = 'biz_dashboard_notices';
// 사용자별 격리 스토리지 키 (A사용자 데이터가 B사용자에게 보이지 않도록)
function getUserStorageKey() {
  try {
    var s = JSON.parse(localStorage.getItem('biz_session')||'null');
    var uid = (s && s._id) ? s._id : 'guest';
    return STORAGE_KEY_BASE + '_' + uid;
  } catch(e) { return STORAGE_KEY_BASE; }
}
function getReportsKey() {
  try {
    var s = JSON.parse(localStorage.getItem('biz_session')||'null');
    var uid = (s && s._id) ? s._id : 'guest';
    return DB_REPORTS_BASE + '_' + uid;
  } catch(e) { return DB_REPORTS_BASE; }
}
// 하위 호환: STORAGE_KEY, DB_REPORTS는 동적으로 참조
Object.defineProperty(window, 'STORAGE_KEY', { get: getUserStorageKey });
Object.defineProperty(window, 'DB_REPORTS',  { get: getReportsKey });
let _currentReport = { company:'', type:'', contentAreaId:'', landscape:true };

// ===========================
// ★ 보고서 서버 캐시
// ===========================
window._reportsCache = [];

// 서버에서 보고서 목록 로드 후 메모리 캐시에 저장
async function syncReportsFromServer() {
  try {
    const serverData = await apiCall('/api/reports');
    if (!Array.isArray(serverData)) { console.warn('보고서 서버 데이터 형식 오류'); return; }

    // localStorage에 저장된 기존 보고서 자동 마이그레이션
    const localReports = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
    if (localReports.length > 0) {
      const serverIds = new Set(serverData.map(r => r.id));
      const toMigrate = localReports.filter(r => r.id && !serverIds.has(r.id));
      if (toMigrate.length > 0) {
        console.log('localStorage 보고서 마이그레이션 시작:', toMigrate.length, '개');
        for (const rpt of toMigrate) {
          try {
            await apiCall('/api/reports', { method:'POST', body: JSON.stringify(rpt) });
          } catch(e) {
            console.warn('마이그레이션 실패 (개별):', rpt.id, e.message);
          }
        }
        // 마이그레이션 완료 후 서버에서 다시 로드
        const refreshed = await apiCall('/api/reports');
        window._reportsCache = Array.isArray(refreshed) ? refreshed : serverData;
        // 마이그레이션 완료 후 localStorage 기록 제거 (중복 방지)
        localStorage.removeItem(DB_REPORTS);
        console.log('localStorage 보고서 마이그레이션 완료');
      } else {
        window._reportsCache = serverData;
        // 서버에 이미 모두 있으면 localStorage 정리
        localStorage.removeItem(DB_REPORTS);
      }
    } else {
      window._reportsCache = serverData;
    }

    console.log('보고서 서버 로드 완료:', window._reportsCache.length, '개');
    updateDataLists();
    if (typeof updateDashboardReports === 'function') updateDashboardReports();
  } catch(e) {
    console.warn('보고서 서버 동기화 실패:', e.message);
    // 실패 시 localStorage 폴백
    window._reportsCache = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
    updateDataLists();
  }
}

// 보고서 서버 저장 (비동기, 실패해도 캐시에는 유지)
async function saveReportToServer(rpt) {
  try {
    await apiCall('/api/reports', { method:'POST', body: JSON.stringify(rpt) });
  } catch(e) {
    console.warn('보고서 서버 저장 실패 (로컬 캐시에는 유지):', e.message);
  }
}

// 보고서 서버 삭제
async function deleteReportFromServer(id) {
  try {
    await apiCall('/api/reports/'+id, { method:'DELETE' });
  } catch(e) {
    console.warn('보고서 서버 삭제 실패:', e.message);
  }
}
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
    approved:false,
    createdAt:'',
    approvedAt:''
  }, u);
  if (nu.isAdmin) nu.approved = true;
  // approved가 명시적으로 저장된 경우 그 값을 그대로 사용 (undefined일 때만 false 유지)
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
// ===========================
// ★ 업체 입력보드 프린트
// ===========================
window.printCompanyForm = function() {
  var form = document.getElementById('companyForm');
  if (!form) { alert('업체 정보를 찾을 수 없음.'); return; }
  var title = document.getElementById('company-form-title');
  var titleText = title ? title.textContent : '기업 정보';
  var pw = window.open('', '_blank', 'width=900,height=1200,scrollbars=yes');
  if (!pw) { alert('팝업이 차단되었음. 팝업을 허용해 주세요.'); return; }
  var printCSS = `
    @page { size: A4 portrait; margin: 15mm; }
    html, body { margin:0; padding:0; font-family: "Malgun Gothic","Apple SD Gothic Neo",sans-serif; font-size:13px; color:#0f172a; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    h1 { font-size:18px; font-weight:700; color:#1e3a8a; border-bottom:2px solid #1e3a8a; padding-bottom:8px; margin-bottom:16px; }
    .section { margin-bottom:16px; }
    .section-title { font-size:13px; font-weight:700; color:#1e3a8a; background:#eff6ff; padding:6px 10px; border-left:3px solid #3b82f6; margin-bottom:8px; }
    table { width:100%; border-collapse:collapse; margin-bottom:8px; }
    th { background:#f8fafc; color:#475569; font-size:11px; font-weight:600; padding:6px 8px; border:1px solid #e2e8f0; text-align:left; white-space:nowrap; width:130px; }
    td { padding:6px 8px; border:1px solid #e2e8f0; font-size:12px; color:#0f172a; }
    @media print { body { margin:0; } }
  `;
  // 폼 데이터 수집
  var g = function(id) { var el=document.getElementById(id); return el ? (el.value||el.innerText||'-') : '-'; };
  var gR = function(name) { var el=document.querySelector('input[name="'+name+'"]:checked'); return el ? el.value : '-'; };
  var rev = { cur: g('rev_cur'), y25: g('rev_25'), y24: g('rev_24'), y23: g('rev_23') };
  var html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${titleText}</title><style>${printCSS}</style></head><body>
    <h1>기업 정보 입력서</h1>
    <div class="section">
      <div class="section-title">회사 기본 정보</div>
      <table>
        <tr><th>상호명</th><td>${g('comp_name')}</td><th>사업자유형</th><td>${gR('biz_type')}</td></tr>
        <tr><th>사업자등록번호</th><td>${g('biz_number')}</td><th>법인등록번호</th><td>${g('corp_number')}</td></tr>
        <tr><th>업종</th><td>${g('comp_industry')}</td><th>설립일</th><td>${g('biz_date')}</td></tr>
        <tr><th>대표자명</th><td>${document.querySelector('input[placeholder="대표자명을 입력하세요"]')?.value||'-'}</td><th>직원수</th><td>${g('emp_count')}명</td></tr>
        <tr><th>사업장 주소</th><td colspan="3">${g('biz_address')}</td></tr>
        <tr><th>핵심아이템</th><td colspan="3">${g('core_item')}</td></tr>
      </table>
    </div>
    <div class="section">
      <div class="section-title">매출 현황</div>
      <table>
        <tr><th>금년 매출(연환산)</th><td>${rev.cur}원</td><th>2025년 매출</th><td>${rev.y25}원</td></tr>
        <tr><th>2024년 매출</th><td>${rev.y24}원</td><th>2023년 매출</th><td>${rev.y23}원</td></tr>
        <tr><th>필요자금</th><td>${g('need_fund')}원</td><th>자금용도</th><td>${g('fund_plan')}</td></tr>
      </table>
    </div>
    <div class="section">
      <div class="section-title">신용 및 금융 현황</div>
      <table>
        <tr><th>KCB 신용점수</th><td>${g('kcb_score')}점</td><th>NICE 신용점수</th><td>${g('nice_score')}점</td></tr>
        <tr><th>금융연체</th><td>${gR('fin_over')}</td><th>세금체납</th><td>${gR('tax_over')}</td></tr>
        <tr><th>임대유형</th><td>${gR('rent_type')}</td><th>임대보증금</th><td>${g('rent_deposit')}원</td></tr>
      </table>
    </div>
  </body></html>`;
  pw.document.write(html);
  pw.document.close();
  pw.onload = function() { pw.print(); };
};

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
    var cs = (window._companiesCache||[]);
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
  migrateRevenueToWon();
  initFinanceTab();
  ensureAdminAccount();
  checkAuth();
  const urlParams = new URLSearchParams(window.location.search);
  showTab(urlParams.get('tab') || 'dashboard', false);
  window.toggleCorpNumber(); window.toggleRentInputs(); window.toggleExportInputs();
});


// ===========================
// ★ 서버 업체 데이터 동기화
// ===========================
// ★ 메모리 캐시 (Supabase DB 단독 저장 — localStorage 업체 저장 완전 제거)
window._companiesCache = [];

// 서버에서 업체 목록 로드 후 메모리 캐시에 저장
async function syncCompaniesFromServer() {
  try {
    const serverData = await apiCall('/api/companies');
    if (!Array.isArray(serverData)) {
      console.warn('서버 업체 데이터 형식 오류');
      updateDataLists();
      if (typeof renderCompanyCards === 'function') renderCompanyCards();
      return;
    }
    // 서버 데이터를 메모리 캐시에 저장 (extra 컬럼에 원본 JSON 저장됨)
    window._companiesCache = serverData.map(function(c) {
      const base = (c.extra && typeof c.extra === 'object') ? c.extra : {};
      return Object.assign({}, base, {
        _serverId: c.id,
        name: c.name || base.name,
        industry: base.industry || c.industry || '',
        rep: base.rep || c.rep_name || '',
        bizNum: base.bizNum || c.reg_no || '',
        bizDate: base.bizDate || c.founded || '',
        empCount: base.empCount || String(c.employees || ''),
        address: base.address || c.address || (function(){
          // 기존 데이터에 address 필드가 없을 경우 rawData[11]에서 추출 (biz_address 필드 인덱스)
          var rd = base.rawData || [];
          var v = rd[11] && rd[11].value ? rd[11].value : '';
          return v;
        })()
      });
    });
    console.log('업체 데이터 서버 로드 완료:', window._companiesCache.length, '개');
    // address 필드 자동 마이그레이션: DB의 address가 비어 있지만 rawData에서 추출된 경우 서버에 업데이트
    window._companiesCache.forEach(async function(comp) {
      if (comp.address && comp.address !== '-' && comp._serverId) {
        // 서버 데이터에서 address가 비어 있었는지 확인
        var serverComp = serverData.find(function(s){ return s.id === comp._serverId; });
        if (serverComp && !serverComp.address) {
          try {
            await apiCall('/api/companies/'+comp._serverId, {
              method: 'PUT',
              body: JSON.stringify(Object.assign({}, comp, { address: comp.address }))
            });
            console.log('주소 마이그레이션 완료:', comp.name, comp.address);
          } catch(e2) {
            console.warn('주소 마이그레이션 실패:', comp.name, e2.message);
          }
        }
      }
    });
    updateDataLists();
    if (typeof renderCompanyCards === 'function') renderCompanyCards();
  } catch(e) {
    console.warn('서버 업체 동기화 실패:', e.message);
    if (e.isAuthError) { showSessionExpiredBanner(); }
    updateDataLists();
    if (typeof renderCompanyCards === 'function') renderCompanyCards();
  }
}

// ===========================
// ★ 인증
// ===========================
window.devBypassLogin = function() {
  alert('배포 모드에서는 테스트 계정 바로 접속 기능을 사용하지 않음.');
};
function checkAuth() {
  const session = JSON.parse(localStorage.getItem(DB_SESSION)||'null');
  const authEl = document.getElementById('auth-container');
  const appEl  = document.getElementById('main-app');
  if (session && localStorage.getItem('biz_jwt_token')) {
    authEl.style.display='none';
    appEl.style.display='flex';
    loadUserProfile();
    updateDataLists();
    initInputHandlers();
    syncCompaniesFromServer();
    syncReportsFromServer();
  } else {
    localStorage.removeItem(DB_SESSION);
    localStorage.removeItem('biz_jwt_token');
    authEl.style.display='flex';
    appEl.style.display='none';
  }
}
window.toggleAuthMode = function(mode) {
  document.getElementById('login-form-area').style.display  = mode==='login'  ? 'block' : 'none';
  document.getElementById('signup-form-area').style.display = mode==='signup' ? 'block' : 'none';
};
window.handleSignup = async function() {
  const email=(document.getElementById('signup-email').value||'').trim();
  const pw=(document.getElementById('signup-pw').value||'').trim();
  const name=(document.getElementById('signup-name').value||'').trim();
  const dept=(document.getElementById('signup-dept').value||'').trim();
  const phone=(document.getElementById('signup-phone').value||'').trim();
  if (!email||!pw||!name) { alert('이메일, 비밀번호, 사용자명은 필수 입력 항목임.'); return; }
  const btn = document.querySelector('#signup-form-area button');
  if(btn){ btn.disabled=true; btn.textContent='처리 중...'; }
  try {
    await apiCall('/api/auth/signup', { method:'POST', body: JSON.stringify({email,pw,name,dept,phone}) });
    ['signup-email','signup-pw','signup-name','signup-dept','signup-phone'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
    alert('회원가입 신청이 접수되었음. 관리자 승인 후 로그인할 수 있음.');
    toggleAuthMode('login');
  } catch(e) {
    alert(e.message);
  } finally {
    if(btn){ btn.disabled=false; btn.textContent='가입 신청'; }
  }
};
window.handleLogin = async function() {
  const email=(document.getElementById('login-email').value||'').trim();
  const pw=(document.getElementById('login-pw').value||'').trim();
  if(!email||!pw){ alert('이메일과 비밀번호를 입력해주세요.'); return; }
  const btn = document.querySelector('#login-form-area .btn-primary');
  if(btn){ btn.disabled=true; btn.textContent='로그인 중...'; }
  try {
    const res = await apiCall('/api/auth/login', { method:'POST', body: JSON.stringify({email,pw}) });
    // API 응답을 localStorage 호환 형식으로 변환
    const user = {
      email: res.user.email,
      name: res.user.name,
      dept: res.user.dept||'',
      phone: res.user.phone||'',
      apiKey: res.user.api_key||'',
      isAdmin: res.user.is_admin||false,
      approved: res.user.approved||false,
      createdAt: res.user.created_at||'',
      approvedAt: res.user.approved_at||'',
      _id: res.user.id
    };
    // 이전 사용자 세션 완전 초기화 (소속정보 꼬임 방지)
    var prevSession = JSON.parse(localStorage.getItem('biz_session')||'null');
    var prevUid = prevSession && prevSession._id ? prevSession._id : null;
    var newUid = res.user.id;
    if (prevUid && prevUid !== newUid) {
      // 다른 사용자로 전환: 이전 사용자의 세션 관련 UI 상태만 초기화 (업체/보고서 데이터는 보존)
      localStorage.removeItem('biz_session');
      localStorage.removeItem('biz_jwt_token');
    }
    localStorage.setItem(DB_SESSION, JSON.stringify(user));
    localStorage.setItem('biz_jwt_token', res.token);
    checkAuth();
  } catch(e) {
    alert(e.message);
  } finally {
    if(btn){ btn.disabled=false; btn.textContent='로그인'; }
  }
};
window.handleLogout = function() { localStorage.removeItem(DB_SESSION); localStorage.removeItem('biz_jwt_token'); location.reload(); };

// 세션 만료 안내 배너 (데이터 삭제 없이 재로그인만 요청)
function showSessionExpiredBanner() {
  if (document.getElementById('session-expired-banner')) return; // 중복 표시 방지
  const banner = document.createElement('div');
  banner.id = 'session-expired-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#ef4444;color:#fff;padding:12px 20px;text-align:center;font-size:14px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
  banner.innerHTML = '\u26a0\ufe0f \ub85c\uadf8\uc778 \uc138\uc158\uc774 \ub9cc\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \uc5c5\uccb4 \ub370\uc774\ud130\ub294 \uc548\uc804\ud558\uac8c \ubcf4\uc874\ub418\uc5c8\uc2b5\ub2c8\ub2e4. <button onclick="handleSessionExpiredRelogin()" style="margin-left:12px;background:#fff;color:#ef4444;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;font-weight:bold;">\uc7ac\ub85c\uadf8\uc778</button> <button onclick="document.getElementById(&quot;session-expired-banner&quot;).remove()" style="margin-left:8px;background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);padding:6px 10px;border-radius:4px;cursor:pointer;">\ub2eb\uae30</button>';
  document.body.prepend(banner);
}
window.handleSessionExpiredRelogin = function() {
  // 로컬 데이터(업체, 보고서) 보존 후 토큰만 삭제
  localStorage.removeItem(DB_SESSION);
  localStorage.removeItem('biz_jwt_token');
  // 업체와 보고서는 절대 삭제하지 않음
  location.reload();
};

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
  // 관리자 메뉴 탭 표시/숨김
  var adminMenu = document.getElementById('menu-admin');
  if(adminMenu) adminMenu.style.display = user.isAdmin ? 'flex' : 'none';
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
window.saveProfileSettings=async function(){
  let s=normalizeUser(JSON.parse(localStorage.getItem(DB_SESSION)||'null')); if(!s) return;
  const name=(document.getElementById('set-user-name').value||'').trim();
  const dept=(document.getElementById('set-user-dept').value||'').trim();
  const phone=(document.getElementById('set-user-phone').value||'').trim();
  const emailEl=document.getElementById('set-user-email');
  const email=emailEl?(emailEl.value||'').trim():s.email;
  if(!email){ alert('이메일은 필수 입력 항목임.'); return; }
  try {
    // 서버 API로 프로필 업데이트
    await apiCall('/api/auth/me', { method:'PUT', body: JSON.stringify({ name, dept, phone, email }) });
  } catch(e) {
    // 서버 오류 시 로컬만 업데이트 (오프라인 fallback)
    console.warn('서버 프로필 저장 실패, 로컬만 업데이트:', e.message);
  }
  // 로컬 세션 항상 업데이트
  s.name=name; s.dept=dept; s.phone=phone; s.email=email;
  localStorage.setItem(DB_SESSION, JSON.stringify(s));
  // 로컬 users DB도 동기화
  const users=getUsers();
  const idx=users.findIndex(function(x){ return x.email===email || (s._id && x._id===s._id); });
  if(idx>=0){ users[idx]=normalizeUser(s); saveUsers(users); }
  loadUserProfile();
  alert('계정 정보가 저장되었음.');
};
window.savePasswordSettings=async function(){
  const currentPw=(document.getElementById('set-current-pw').value||'').trim();
  const nextPw=(document.getElementById('set-new-pw').value||'').trim();
  const confirmPw=(document.getElementById('set-confirm-pw').value||'').trim();
  if(!currentPw||!nextPw||!confirmPw){ alert('비밀번호 변경 항목을 모두 입력해주세요.'); return; }
  if(nextPw.length<4){ alert('새 비밀번호는 4자 이상으로 입력해주세요.'); return; }
  if(nextPw!==confirmPw){ alert('새 비밀번호 확인이 일치하지 않음.'); return; }
  try {
    await apiCall('/api/auth/change-password', { method:'PUT', body: JSON.stringify({ current_pw: currentPw, new_pw: nextPw }) });
    ['set-current-pw','set-new-pw','set-confirm-pw'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
    alert('비밀번호가 변경되었음.');
  } catch(e) {
    alert(e.message);
  }
};
window.saveApiSettings=async function(){
  let s=normalizeUser(JSON.parse(localStorage.getItem(DB_SESSION)||'null')); if(!s) return;
  const apiKey=document.getElementById('set-api-key').value||'';
  try {
    await apiCall('/api/auth/me', { method:'PUT', body: JSON.stringify({ api_key: apiKey }) });
    s.apiKey = apiKey;
    localStorage.setItem(DB_SESSION, JSON.stringify(s));
    loadUserProfile();
    alert('API 키가 저장되었음.');
  } catch(e) {
    alert('API 키 저장 실패: ' + (e.message||'알 수 없는 오류'));
  }
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
window.approveUser=async function(userId){
  try {
    await apiCall('/api/admin/users/'+userId+'/approve', { method:'PUT' });
    renderAdminTab();
    alert('사용자 승인이 완료되었음.');
  } catch(e) { alert(e.message); }
};
window.rejectUser=async function(userId){
  if(!confirm('승인 대기 사용자를 삭제하시겠습니까?')) return;
  try {
    await apiCall('/api/admin/users/'+userId, { method:'DELETE' });
    renderAdminTab();
    alert('승인 대기 사용자가 삭제되었음.');
  } catch(e) { alert(e.message); }
};
window.revokeUser=async function(userId){
  if(!confirm('이 회원의 승인을 취소하시겠습니까? 해당 회원은 다시 승인 대기 상태가 됩니다.')) return;
  try {
    await apiCall('/api/admin/users/'+userId+'/reject', { method:'PUT' });
    renderAdminTab();
    alert('승인이 취소되었음.');
  } catch(e) { alert(e.message); }
};
window.deleteUser=async function(userId){
  if(!confirm('이 회원을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
  try {
    await apiCall('/api/admin/users/'+userId, { method:'DELETE' });
    renderAdminTab();
    alert('회원이 삭제되었음.');
  } catch(e) { alert(e.message); }
};

// ===========================
// ★ 관리자 탭 렌더링
// ===========================
function renderAdminTab(){
  const session=normalizeUser(JSON.parse(localStorage.getItem(DB_SESSION)||'null'));
  if(!session||!session.isAdmin) return;
  const el=function(id){ return document.getElementById(id); };
  const reports=window._reportsCache||[];
  if(el('admin-stat-reports')) el('admin-stat-reports').textContent=reports.length;

  // API에서 사용자 목록 가져오기
  Promise.all([
    apiCall('/api/admin/users'),
    apiCall('/api/admin/stats')
  ]).then(function(results){
    const allUsers = results[0];
    const stats = results[1];

    // 통계 업데이트
    if(el('admin-stat-total')) el('admin-stat-total').textContent=stats.total||0;
    if(el('admin-stat-pending')) el('admin-stat-pending').textContent=stats.pending||0;
    if(el('admin-stat-approved')) el('admin-stat-approved').textContent=stats.approved||0;
    if(el('admin-stat-reports')) el('admin-stat-reports').textContent=stats.reports||reports.length;

    const pending=allUsers.filter(function(u){ return !u.is_admin && !u.approved; });
    const approved=allUsers.filter(function(u){ return !u.is_admin && u.approved; });

    // 승인 대기 목록
    var pendingCountEl=el('admin-tab-pending-count');
    var pendingListEl=el('admin-tab-pending-list');
    if(pendingCountEl) pendingCountEl.textContent='대기 '+pending.length+'명';
    if(pendingListEl){
      if(!pending.length){
        pendingListEl.innerHTML='<div class="empty-state"><div class="empty-state-emoji">✅</div><div class="empty-state-title">승인 대기 중인 사용자가 없음.</div><div class="empty-state-desc">신규 회원가입이 들어오면 이 영역에서 바로 승인할 수 있음.</div></div>';
      } else {
        pendingListEl.innerHTML=pending.map(function(u){
          return '<div class="admin-user-card">'
            + '<div class="admin-user-head">'
            +   '<div>'
            +     '<div class="admin-user-name">'+(u.name||'이름 미입력')+'</div>'
            +     '<div class="admin-user-meta">'+(u.email||'-')+' · '+(u.dept||'소속 미입력')+(u.phone?' · '+u.phone:'')+'<br>가입신청: '+(u.created_at?new Date(u.created_at).toLocaleString('ko-KR'):'-')+'</div>'
            +   '</div>'
            +   '<span class="status-badge warning">승인 대기</span>'
            + '</div>'
            + '<div class="admin-user-actions">'
            +   '<button class="btn-primary" style="padding:8px 16px;font-size:13px;" onclick="approveUser(\'' + u.id + '\')"> 승인</button>'
            +   '<button class="btn-delete" onclick="rejectUser(\'' + u.id + '\')"> 거절/삭제</button>'
            + '</div>'
            + '</div>';
        }).join('');
      }
    }

    // 전체 회원 목록
    var allCountEl=el('admin-tab-all-count');
    var allListEl=el('admin-tab-all-list');
    const nonAdminUsers = allUsers.filter(function(u){ return !u.is_admin; });
    if(allCountEl) allCountEl.textContent='전체 '+nonAdminUsers.length+'명';
    if(allListEl){
      if(!nonAdminUsers.length){
        allListEl.innerHTML='<div class="empty-state"><div class="empty-state-emoji">👥</div><div class="empty-state-title">등록된 회원이 없음.</div></div>';
      } else {
        allListEl.innerHTML=nonAdminUsers.map(function(u){
          var badge=u.approved
            ? '<span class="status-badge success">승인 완료</span>'
            : '<span class="status-badge warning">승인 대기</span>';
          var actions=u.approved
            ? '<button class="btn-delete" style="font-size:12px;padding:6px 12px;" onclick="revokeUser(\'' + u.id + '\')"> 승인 취소</button>'
              + '<button class="btn-delete" style="font-size:12px;padding:6px 12px;background:#dc2626;" onclick="deleteUser(\'' + u.id + '\')"> 삭제</button>'
            : '<button class="btn-primary" style="font-size:12px;padding:6px 12px;" onclick="approveUser(\'' + u.id + '\')"> 승인</button>'
              + '<button class="btn-delete" style="font-size:12px;padding:6px 12px;" onclick="deleteUser(\'' + u.id + '\')"> 삭제</button>';
          return '<div class="admin-member-card">'
            + '<div class="admin-member-info">'
            +   '<div class="admin-member-name">'+(u.name||'이름 미입력')+'</div>'
            +   '<div class="admin-member-meta">'+(u.email||'-')+' · '+(u.dept||'소속 미입력')+(u.phone?' · '+u.phone:'')+'<br>가입일: '+(u.created_at?new Date(u.created_at).toLocaleString('ko-KR'):'-')+(u.approved_at?' · 승인일: '+new Date(u.approved_at).toLocaleString('ko-KR'):'')+'</div>'
            + '</div>'
            + '<div class="admin-member-actions">'+ badge + actions +'</div>'
            + '</div>';
        }).join('');
      }
    }
  }).catch(function(e){
    console.error('관리자 탭 로드 실패:', e.message);
  });
}

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
  if(tabId==='admin') renderAdminTab();
  // 보고서 탭 → 항상 입력 화면
  ['report','finance','aiBiz','aiFund','aiTrade','aiMarketing'].forEach(rt=>{
    if(tabId===rt){
      const inp=document.getElementById(rt+'-input-step');
      const res=document.getElementById(rt+'-result-step');
      if(inp) inp.style.display='block';
      if(res) res.style.display='none';
    }
  });
  // 재무제표 탭 전환 시: 기업 선택 초기화 + 보유여부 토글 숨김 + 입력 폼 숨김
  if(tabId==='finance'){
    const sel = document.getElementById('finance-company-select');
    if(sel) sel.value = '';
    const toggle = document.getElementById('fs-mode-toggle');
    if(toggle) toggle.style.display = 'none';
    const simpleForm = document.getElementById('finance-simple-form');
    if(simpleForm) simpleForm.style.display = 'none';
    const formalForm = document.getElementById('finance-formal-form');
    if(formalForm) formalForm.style.display = 'none';
    // 라디오 초기화
    const radioYes = document.getElementById('fs_mode_yes');
    if(radioYes) radioYes.checked = true;
  }
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
    const comp = (window._companiesCache||[]).find(c=>c.name===editName);
    if (comp?.rawData) {
      const els = document.querySelectorAll('#companyForm input,#companyForm select,#companyForm textarea');
      comp.rawData.forEach((d,i) => { if(els[i]){ if(els[i].type==='checkbox'||els[i].type==='radio') els[i].checked=d.checked; else els[i].value=d.value; } });
      // address 필드가 따로 저장된 경우 biz_address 입력란에 동기화
      if (comp.address && comp.address !== '-') {
        const addrEl = document.getElementById('biz_address');
        if (addrEl && !addrEl.value) addrEl.value = comp.address;
      }
      calculateTotalDebt(); toggleCorpNumber(); toggleRentInputs(); toggleExportInputs();
    }
  } else {
    if(titleEl) titleEl.textContent = '기업 정보 등록';
    // 신규 등록 시 폼 완전 초기화
    const form = document.getElementById('companyForm');
    if (form) form.reset();
    calculateTotalDebt(); toggleCorpNumber(); toggleRentInputs(); toggleExportInputs();
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
  const companies = window._companiesCache || [];
  const keyword   = (document.getElementById('company-search-input')?.value||'').toLowerCase();
  const filtered  = companies.filter(c=>c.name.toLowerCase().includes(keyword)||(c.industry||'').toLowerCase().includes(keyword));
  if (!filtered.length) {
    container.innerHTML=`<div class="company-empty-state"><div class="empty-icon">🏢</div><p>${keyword?'검색 결과가 없음.':'등록된 업체가 없음.'}</p><button class="btn-add-company" onclick="showCompanyForm()">＋ 업체 등록하기</button></div>`;
    return;
  }
  container.innerHTML = filtered.map(c => {
    let address = c.address && c.address !== '-' ? c.address : '주소 미입력';
    return `<div class="company-card"><div class="company-card-top"><div class="company-card-icon">🏢</div><div class="company-card-info"><div class="company-card-name">${c.name}</div><div class="company-card-rep">${c.rep&&c.rep!=='-'?c.rep+' 대표':'대표자 미입력'}</div></div><div class="company-card-actions"><button class="btn-card-detail" onclick="showCompanyForm('${c.name}')">›</button><button class="btn-card-delete" onclick="deleteCompany('${c.name}')">🗑</button></div></div><div class="company-card-body"><div class="company-card-row"><span class="company-card-label">업종</span><span class="company-card-value">${c.industry&&c.industry!=='-'?c.industry:'미입력'}</span></div><div class="company-card-row"><span class="company-card-label">주소</span><span class="company-card-value addr">${address}</span></div></div></div>`;
  }).join('');
};

window.deleteCompany = async function(name) {
  if (!confirm(`[${name}]을 삭제하시겠습니까?`)) return;
  const target = (window._companiesCache || []).find(c=>c.name===name);
  if (target && target._serverId) {
    try {
      await apiCall('/api/companies/'+target._serverId, { method:'DELETE' });
      window._companiesCache = (window._companiesCache || []).filter(c=>c.name!==name);
    } catch(e) {
      alert('삭제 실패: ' + e.message);
      return;
    }
  } else {
    window._companiesCache = (window._companiesCache || []).filter(c=>c.name!==name);
  }
  updateDataLists(); renderCompanyCards();
};

// ===========================
// ★ 대시보드
// ===========================
function updateDashboardReports() {
  const listEl = document.getElementById('dashboard-report-list'); if (!listEl) return;
  const reports   = window._reportsCache || [];
  const companies = window._companiesCache || [];
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

  const typeIcon=t=>({'경영진단':'📈','재무제표 분석':'💰','사업계획서':'💡','정책자금매칭':'🎯','상권분석':'🏪','마케팅제안':'📢'}[t]||'📄');

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
  const companies = window._companiesCache || [];
  const reports   = window._reportsCache || [];
  document.querySelectorAll('.company-dropdown').forEach(sel=>{
    sel.innerHTML='<option value="">기업을 선택하세요</option>';
    companies.forEach(c=>sel.innerHTML+=`<option value="${c.name}">${c.name}</option>`);
  });
  const cBody=document.getElementById('company-list-body');
  if(cBody){ const shown=companies.slice(0,3); cBody.innerHTML=shown.length?shown.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.rep||'-'}</td><td>${c.bizNum||'-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="showCompanyForm('${c.name}')">수정/보기</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">등록된 기업이 없음.</td></tr>'; }
  const rBody=document.getElementById('report-list-body');
  if(rBody){ const shown=[...reports].reverse().slice(0,15); rBody.innerHTML=shown.length?shown.map(r=>`<tr><td><span style="background:#eff6ff;color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${r.type}</span></td><td><strong>${r.company}</strong></td><td>${r.title}</td><td>${r.date}</td><td style="white-space:nowrap;"><button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button><button class="btn-small-outline" style="margin-left:6px;background:#f0fdf4;color:#16a34a;border-color:#bbf7d0;" onclick="downloadReportById('${r.id}')">다운로드</button><button class="btn-delete" style="margin-left:6px;" onclick="deleteReport('${r.id}')">삭제</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">생성된 보고서가 없음.</td></tr>'; }
  const filterComp=document.getElementById('filter-company');
  if(filterComp){ filterComp.innerHTML='<option value="">전체 업체</option>'; companies.forEach(c=>filterComp.innerHTML+=`<option value="${c.name}">${c.name}</option>`); }
  updateDashboardReports(); renderCompanyCards();
};

// ===========================
// ★ 보고서 목록 서브뷰
// ===========================
window.showReportListSummary=function(){document.getElementById('rl-summary').style.display='block';document.getElementById('rl-companies').style.display='none';document.getElementById('rl-reports').style.display='none';updateDataLists();};
window.showFullCompanies=function(){document.getElementById('rl-summary').style.display='none';document.getElementById('rl-companies').style.display='block';document.getElementById('rl-reports').style.display='none';const companies=window._companiesCache||[];const tbody=document.getElementById('company-full-body');if(tbody){tbody.innerHTML=companies.length?companies.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.rep||'-'}</td><td>${c.bizNum||'-'}</td><td>${c.industry||'-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="showCompanyForm('${c.name}')">수정/보기</button></td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">등록된 기업이 없음.</td></tr>';}};
window.showFullReports=function(){document.getElementById('rl-summary').style.display='none';document.getElementById('rl-companies').style.display='none';document.getElementById('rl-reports').style.display='block';const companies=window._companiesCache||[];const filterComp=document.getElementById('filter-company');if(filterComp){filterComp.innerHTML='<option value="">전체 업체</option>';companies.forEach(c=>filterComp.innerHTML+=`<option value="${c.name}">${c.name}</option>`);}renderFullReports();};
window.renderFullReports=function(){const tf=document.getElementById('filter-type')?.value||'';const cf=document.getElementById('filter-company')?.value||'';const reports=window._reportsCache||[];const filtered=[...reports].reverse().filter(r=>(!tf||r.type===tf)&&(!cf||r.company===cf));const shown=filtered.slice(0,15);const countEl=document.getElementById('filter-result-count');if(countEl)countEl.textContent=`총 ${filtered.length}건`;const tbody=document.getElementById('report-full-body');if(!tbody)return;tbody.innerHTML=shown.length?shown.map(r=>`<tr><td><span style="background:#eff6ff;color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${r.type}</span></td><td><strong>${r.company}</strong></td><td>${r.title}</td><td>${r.date}</td><td style="white-space:nowrap;"><button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button><button class="btn-delete" style="margin-left:6px;" onclick="deleteReportFull('${r.id}')">삭제</button><button class="btn-small-outline" style="margin-left:6px;background:#f0fdf4;color:#16a34a;border-color:#bbf7d0;" onclick="downloadReportById('${r.id}')">다운로드</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">조건에 맞는 보고서가 없음.</td></tr>';};
window.deleteReportFull=function(id){if(!confirm('삭제하시겠습니까?'))return;window._reportsCache=(window._reportsCache||[]).filter(x=>x.id!==id);deleteReportFromServer(id);renderFullReports();updateDashboardReports();};
window.downloadReportById=function(id){
  var reports=window._reportsCache||[];
  var rep=reports.find(function(x){return x.id===id;});
  if(!rep){alert('보고서를 찾을 수 없음.');return;}
  var cs=window._companiesCache||[];
  var cData=cs.find(function(x){return x.name===rep.company;})||{name:rep.company,bizNum:'-',industry:'-',rep:'-',coreItem:'-',bizDate:'-',empCount:'-',date:rep.date};
  var rev={};
  try{if(cData&&cData.revenueData)rev=cData.revenueData;}catch(e){}
  // content가 JSON이면 파싱하여 HTML 재빌드
  var htmlContent='';
  try{
    var data=JSON.parse(rep.content);
    var type=rep.reportType||'management';
    var cfg=REPORT_CONFIGS[type];
    if(cfg&&cfg.buildHTML){
      htmlContent=cfg.buildHTML(data,cData,rev,rep.date);
    } else if(type==='management'){
      var ver=rep.version||'client';
      htmlContent=ver==='client'?buildMgmtClientHTML(data,cData,rev,rep.date):buildMgmtConsultantHTML(data,cData,rev,rep.date);
    } else {
      htmlContent='<pre style="padding:20px;font-size:12px;">'+(rep.content||'')+'</pre>';
    }
  }catch(e){
    // content가 이미 HTML인 경우
    htmlContent=rep.content||'';
  }
  var isLandscape=(rep.reportType==='aiBiz'||rep.type==='사업계획서'||rep.type==='AI 사업계획서');
  var layout=getReportLayoutConfig(isLandscape);
  var pw=window.open('','_blank','width=1600,height=1000,scrollbars=yes');
  if(!pw){alert('팝업이 차단되었음. 팝업을 허용해 주세요.');return;}
  // 사업계획서는 표지 배경(네이비 그라데이션)을 보존하기 위해 background 강제 설정 제외
  var coverBgCSS = isLandscape
    ? 'border-radius:8px!important;margin:0 0 14px 0!important;height:'+layout.contentHeight+'!important;min-height:'+layout.contentHeight+'!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;page-break-after:always!important;break-after:page!important;page-break-inside:avoid!important;box-shadow:none!important;'
    : 'background:white!important;border-radius:8px!important;margin:0 0 14px 0!important;padding:'+layout.coverPadding+'!important;height:'+layout.contentHeight+'!important;min-height:'+layout.contentHeight+'!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;page-break-after:always!important;break-after:page!important;page-break-inside:avoid!important;box-shadow:none!important;';
  var printCSS=`@page{size:${layout.pageSize};margin:${layout.printMargin};}html,body{margin:0;padding:0;background:#e8eaed;}*{-webkit-print-color-adjust:exact!important;color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box;}body{font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;min-width:${layout.contentWidth};}.pdf-shell{width:${layout.contentWidth};margin:0 auto;padding:${layout.wrapPadding} 0;background:#e8eaed;}.pdf-shell>*{width:100%;}.rp-wrap{width:100%!important;max-width:none!important;background:#e8eaed!important;padding:${layout.wrapPadding}!important;}.rp-cover{${coverBgCSS}}.rp-page{background:white!important;border-radius:8px!important;margin:0 0 14px 0!important;padding:${layout.pagePadding}!important;height:${layout.contentHeight}!important;min-height:${layout.contentHeight}!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;page-break-before:always!important;break-before:page!important;page-break-inside:avoid!important;break-inside:avoid!important;box-shadow:none!important;}@media print{html,body{background:white!important;}.pdf-shell{width:100%!important;padding:0!important;background:white!important;}.rp-wrap{width:100%!important;padding:0!important;background:white!important;}.rp-cover,.rp-page{border-radius:0!important;margin:0!important;}}`;
  pw.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${rep.type||'보고서'} - ${rep.company}</title><style>${printCSS}</style><script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script></head><body><div class="pdf-shell">${htmlContent}</div><script>${safeDestroyChart.toString()}${initReportCharts.toString()}var _popupRev=${JSON.stringify(rev||{})};window.onload=function(){initReportCharts(_popupRev);setTimeout(function(){window.print();},900);};<\/script></body></html>`);
  pw.document.close();
};
window.deleteReport=function(id){if(!confirm('삭제하시겠습니까?'))return;window._reportsCache=(window._reportsCache||[]).filter(x=>x.id!==id);deleteReportFromServer(id);updateDataLists();};

// ===========================
// ★ 기업 저장
// ===========================
window.clearCompanyForm=function(){if(confirm('초기화하시겠습니까?')){document.getElementById('companyForm').reset();calculateTotalDebt();toggleCorpNumber();toggleRentInputs();toggleExportInputs();}};
window.saveCompanyData=function(){
  const name=document.getElementById('comp_name')?.value; if(!name){alert('상호명을 입력해주세요.');return;}
  const rev={cur:parseInt(document.getElementById('rev_cur')?.value?.replace(/,/g,'')||0),y25:parseInt(document.getElementById('rev_25')?.value?.replace(/,/g,'')||0),y24:parseInt(document.getElementById('rev_24')?.value?.replace(/,/g,'')||0),y23:parseInt(document.getElementById('rev_23')?.value?.replace(/,/g,'')||0)};
  const needFund=parseInt(document.getElementById('need_fund')?.value?.replace(/,/g,'')||0)||0;
  const fundPlan=document.getElementById('fund_plan')?.value||'';
  const _pInt=id=>{const el=document.getElementById(id);return parseInt((el?.value||'0').replace(/[^0-9]/g,''))||0;};
  const debtKibo=_pInt('debt_kibo');
  const debtShinbo=_pInt('debt_shinbo');
  const debtJjg=_pInt('debt_jjg');
  const debtSjg=_pInt('debt_sjg');
  const debtJaidan=_pInt('debt_jaidan');
  const debtCorpCollateral=_pInt('debt_corp_collateral');
  const rentMonthly=_pInt('rent_monthly');
  const kcbScore=parseInt((document.getElementById('kcb_score')?.value||'0').replace(/[^0-9]/g,''))||0;
  const niceScore=parseInt((document.getElementById('nice_score')?.value||'0').replace(/[^0-9]/g,''))||0;
  const finOver=document.querySelector('input[name="fin_over"]:checked')?.value||'없음';
  const taxOver=document.querySelector('input[name="tax_over"]:checked')?.value||'없음';
  const address=document.getElementById('biz_address')?.value||'-';
  const newC={name,rep:document.querySelector('input[placeholder="대표자명을 입력하세요"]')?.value||'-',bizNum:document.getElementById('biz_number')?.value||'-',industry:document.getElementById('comp_industry')?.value||'-',bizDate:document.getElementById('biz_date')?.value||'-',empCount:document.getElementById('emp_count')?.value||'-',coreItem:document.getElementById('core_item')?.value||'-',address,date:new Date().toISOString().split('T')[0],revenueData:rev,needFund,fundPlan,debtKibo,debtShinbo,debtJjg,debtSjg,debtJaidan,debtCorpCollateral,rentMonthly,kcbScore,niceScore,finOver,taxOver,rawData:Array.from(document.querySelectorAll('#companyForm input,#companyForm select,#companyForm textarea')).map(el=>({type:el.type,value:el.value,checked:el.checked}))};
  const cache = window._companiesCache || [];
  const idx = cache.findIndex(c=>c.name===name);
  const existingServerId = idx>-1 ? cache[idx]._serverId : null;
  // Supabase API 단독 저장 (localStorage 저장 없음)
  (async function(){
    try {
      let saved;
      if (existingServerId) {
        saved = await apiCall('/api/companies/'+existingServerId, { method:'PUT', body: JSON.stringify(newC) });
      } else {
        saved = await apiCall('/api/companies', { method:'POST', body: JSON.stringify(newC) });
      }
      // 메모리 캐시 업데이트
      const item = Object.assign({}, newC, { _serverId: saved.id });
      if (idx>-1) { window._companiesCache[idx] = item; }
      else { window._companiesCache.push(item); }
      alert('기업 정보가 저장되었음!');
      updateDataLists(); showCompanyList();
    } catch(e){
      alert('저장 실패: ' + e.message);
    }
  })();
};
window.toggleExportInputs=function(){const isExp=[...document.getElementsByName('export')].some(r=>r.checked&&r.value==='수출중');document.querySelectorAll('.export-money').forEach(i=>{i.disabled=!isExp;if(!isExp)i.value='';});};
window.toggleCorpNumber=function(){const isC=[...document.getElementsByName('biz_type')].some(r=>r.checked&&r.value==='법인');const el=document.getElementById('corp_number');if(el){el.disabled=!isC;if(!isC)el.value='';}};
window.toggleRentInputs=function(){const isR=[...document.getElementsByName('rent_type')].some(r=>r.checked&&r.value==='임대');['rent_deposit','rent_monthly'].forEach(id=>{const el=document.getElementById(id);if(el){el.disabled=!isR;if(!isR)el.value='';}});};
window.calculateTotalDebt=function(){let tot=0;document.querySelectorAll('.debt-input').forEach(i=>{let v=i.value.replace(/[^0-9]/g,'');if(v)tot+=parseInt(v);});const el=document.getElementById('total-debt');if(el)el.innerText=tot.toLocaleString('ko-KR')+'원 ('+fKRW(tot)+')';};

// ===========================
// ★ 입력 포매터
// ===========================
function initInputHandlers(){
  document.querySelectorAll('.number-only').forEach(i=>i.addEventListener('input',function(){this.value=this.value.replace(/[^0-9]/g,'');}));
  document.querySelectorAll('.money-format').forEach(i=>i.addEventListener('input',function(){let v=this.value.replace(/[^0-9\-]/g,'');this.value=v.replace(/\B(?=(\d{3})+(?!\d))/g,',');}));
  document.querySelectorAll('.debt-input').forEach(i=>i.addEventListener('input',calculateTotalDebt));
  document.querySelectorAll('.fs-input').forEach(i=>i.addEventListener('input',function(){let v=this.value.replace(/[^0-9\-]/g,'');this.value=v.replace(/\B(?=(\d{3})+(?!\d))/g,',');calcFsRatios();}));
  [['biz_number','biz'],['corp_number','corp'],['biz_date','date'],['rep_birth','date'],['write_date','date']].forEach(([id,fmt])=>{const el=document.getElementById(id);if(!el)return;el.addEventListener('input',function(){let v=this.value.replace(/[^0-9]/g,'');if(fmt==='corp'){this.value=v.length<7?v:v.slice(0,6)+'-'+v.slice(6,13);}else if(fmt==='biz'){if(v.length<4)this.value=v;else if(v.length<6)this.value=v.slice(0,3)+'-'+v.slice(3);else this.value=v.slice(0,3)+'-'+v.slice(3,5)+'-'+v.slice(5,10);}else{if(v.length<5)this.value=v;else if(v.length<7)this.value=v.slice(0,4)+'-'+v.slice(4);else this.value=v.slice(0,4)+'-'+v.slice(4,6)+'-'+v.slice(6,8);}});});
  ['biz_phone','rep_phone'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.addEventListener('input',function(){let v=this.value.replace(/[^0-9]/g,'');if(v.startsWith('02')){if(v.length<3)this.value=v;else if(v.length<6)this.value=v.slice(0,2)+'-'+v.slice(2);else if(v.length<10)this.value=v.slice(0,2)+'-'+v.slice(2,5)+'-'+v.slice(5);else this.value=v.slice(0,2)+'-'+v.slice(2,6)+'-'+v.slice(6,10);}else{if(v.length<4)this.value=v;else if(v.length<7)this.value=v.slice(0,3)+'-'+v.slice(3);else if(v.length<11)this.value=v.slice(0,3)+'-'+v.slice(3,6)+'-'+v.slice(6);else this.value=v.slice(0,3)+'-'+v.slice(3,7)+'-'+v.slice(7,11);}});});
}

// ===========================
// ★ 유틸리티

// ===========================
function fKRW(n){
  // 원 단위 숫자를 자연스러운 한국어 금액으로 변환
  // 예: 113,000,000 → 1억1300만원 / 1,153,000,000 → 11억5300만원
  var num = Math.floor(Math.abs(parseInt(String(n).replace(/,/g,''), 10)));
  if (isNaN(num) || num === 0) return '0원';
  var eok      = Math.floor(num / 100000000);  // 억 단위
  var rem      = num % 100000000;              // 억 이하 나머지
  var manTotal = Math.floor(rem / 10000);      // 만원 단위 (0~9999)
  var result   = '';
  if (eok > 0) result += eok + '억';
  if (manTotal > 0) {
    // 만원 단위를 숫자 그대로 표시 (예: 1300만원, 500만원)
    result += (eok > 0 ? '' : '') + manTotal + '만';
  }
  return result.trim() + '원';
}
// 천만원 단위 절사 버전 (보고서 금액 표시용)
// 예: 113,000,000 → 1억1천만원 / 1,153,000,000 → 11억5천만원
function fKRWRound(n){
  var num = Math.floor(Math.abs(parseInt(String(n).replace(/,/g,''), 10)));
  if (isNaN(num) || num === 0) return '0원';
  // 천만원 단위로 반올림
  var rounded = Math.round(num / 10000000) * 10000000;
  if (rounded === 0) rounded = Math.round(num / 1000000) * 1000000; // 천만 미만이면 백만 단위
  var eok  = Math.floor(rounded / 100000000);
  var rem  = rounded % 100000000;
  var chun = Math.floor(rem / 10000000); // 천만 자리
  var baek = Math.floor((rem % 10000000) / 1000000); // 백만 자리
  var parts = '';
  if (eok  > 0) parts += eok + '억';
  if (chun > 0) parts += chun + '천만';
  else if (baek > 0 && eok === 0) parts += baek + '백만';
  if (!parts) return fKRW(num); // 백만 미만이면 fKRW 사용 (이미 '원' 포함)
  return parts.trim() + '원'; // '원' 한 번만 붙임
}

// ===========================
// ★ 기존 만원 단위 데이터 → 원 단위 마이그레이션
// ===========================
function migrateRevenueToWon() {
  var cs = (window._companiesCache||[]);
  var changed = false;
  cs.forEach(function(c) {
    // 마이그레이션 플래그가 없고, 매출 데이터가 만원 단위로 보이는 경우 변환
    // 기준: y24 값이 0보다 크고 100,000 미만이면 만원 단위로 판단 (1억 = 10000만원)
    if (!c._wonMigrated && c.revenueData) {
      var rv = c.revenueData;
      var maxVal = Math.max(rv.cur||0, rv.y25||0, rv.y24||0, rv.y23||0);
      if (maxVal > 0 && maxVal < 100000) {
        // 만원 단위 → 원 단위 변환 (×10000)
        if (rv.cur) rv.cur = rv.cur * 10000;
        if (rv.y25) rv.y25 = rv.y25 * 10000;
        if (rv.y24) rv.y24 = rv.y24 * 10000;
        if (rv.y23) rv.y23 = rv.y23 * 10000;
        c._wonMigrated = true;
        changed = true;
      } else {
        c._wonMigrated = true; // 이미 원 단위이거나 데이터 없음
      }
    }
    // 부채 데이터 마이그레이션
    if (!c._debtMigrated) {
      var maxDebt = Math.max(c.debtKibo||0, c.debtShinbo||0, c.debtJjg||0, c.debtSjg||0);
      if (maxDebt > 0 && maxDebt < 100000) {
        if (c.debtKibo)   c.debtKibo   = c.debtKibo   * 10000;
        if (c.debtShinbo) c.debtShinbo = c.debtShinbo * 10000;
        if (c.debtJjg)    c.debtJjg    = c.debtJjg    * 10000;
        if (c.debtSjg)    c.debtSjg    = c.debtSjg    * 10000;
        changed = true;
      }
      c._debtMigrated = true;
    }
    // needFund 마이그레이션
    if (!c._fundMigrated && c.needFund > 0 && c.needFund < 100000) {
      c.needFund = c.needFund * 10000;
      c._fundMigrated = true;
      changed = true;
    } else {
      c._fundMigrated = true;
    }
    // fsData 마이그레이션 (재무제표 입력 데이터)
    if (!c._fsMigrated && c.fsData) {
      var fsFields = ['rev_y23','rev_y24','cogs_y24','sga_y24','op_y24','net_y24','int_y24',
                      'cur_asset','fix_asset','total_asset','cur_liab','fix_liab','total_liab','cap','total_equity'];
      var maxFs = 0;
      fsFields.forEach(function(f){ var v=parseInt(c.fsData[f])||0; if(v>maxFs) maxFs=v; });
      if (maxFs > 0 && maxFs < 100000) {
        fsFields.forEach(function(f){
          var v = parseInt(c.fsData[f])||0;
          if (v > 0) c.fsData[f] = String(v * 10000);
        });
        changed = true;
      }
      c._fsMigrated = true;
    }
  });
  if (changed) {
    window._companiesCache = cs;
    console.log('[Migration] 만원→원 단위 변환 완료');
  }
}

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
  + '.rp-cover-unified::after { content:none; }'
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
  + '.rp-page-auto { background:white; border-radius:8px; margin-bottom:14px; padding:'+layout.pagePadding+'; min-height:auto; height:auto; overflow:visible; display:flex; flex-direction:column; }'
  + '.rp-page-auto .rp-body { flex:none; overflow:visible; }'
  + '.rp-ph   { display:flex; align-items:center; gap:10px; margin-bottom:14px; padding-bottom:10px; border-bottom:2.5px solid #f1f5f9; flex-shrink:0; }'
  + '.rp-pnum { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }'
  + '.rp-ptitle{ font-size:17px; font-weight:700; color:#1e293b; }'
  + '.rp-psub  { font-size:12px; color:#94a3b8; margin-left:auto; white-space:nowrap; }'
  + '.rp-body  { flex:1; display:flex; flex-direction:column; gap:12px; }'

  // ── 레이아웃 ──
  + '.rp-2col  { display:flex; gap:16px; flex:1; }'
  + '.rp-col38 { width:38%; flex-shrink:0; display:flex; flex-direction:column; gap:10px; }'
  + '.rp-col40 { width:40%; flex-shrink:0; display:flex; flex-direction:column; gap:10px; }'
  + '.rp-col35 { width:35%; flex-shrink:0; display:flex; flex-direction:column; gap:10px; }'
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

function rpPageAuto(num, title, sub, color, content) {
  var numBg = (color==='#d97706'||color==='#92400e') ? '#fef3c7' : '#eff6ff';
  var numTc = (color==='#d97706'||color==='#92400e') ? '#d97706' : color;
  return '<div class="rp-page-auto">'
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
     +'<div style="padding:0 32px 12px 32px">'    +'<table style="width:100%;border-collapse:collapse;font-size:12px;border:1.5px solid #cbd5e1;border-radius:8px;table-layout:fixed;word-break:keep-all">'
    +'<tr style="background:#f1f5f9">'
      +'<th style="padding:7px 12px;text-align:left;color:#475569;font-weight:700;white-space:nowrap;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;width:13%">상호</th>'    +'<td style="padding:7px 12px;font-weight:600;color:#1e293b;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;width:37%">'+companyName+'</td>'    +'<th style="padding:7px 12px;text-align:left;color:#475569;font-weight:700;white-space:nowrap;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;width:15%">사업자등록번호</th>'    +'<td style="padding:7px 12px;font-weight:600;color:#1e293b;border-bottom:1px solid #e2e8f0;width:35%">'+((cData&&cData.bizNum)||'-')+'</td>'
    +'</tr>'
    +'<tr>'
       +'<th style="padding:7px 12px;text-align:left;color:#475569;font-weight:700;white-space:nowrap;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;background:#f1f5f9">대표자명</th>'    +'<td style="padding:7px 12px;font-weight:600;color:#1e293b;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0">'+((cData&&cData.rep)||'-')+'</td>'    +'<th style="padding:7px 12px;text-align:left;color:#475569;font-weight:700;white-space:nowrap;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;background:#f1f5f9">업종</th>'    +'<td style="padding:7px 12px;font-weight:600;color:#1e293b;border-bottom:1px solid #e2e8f0">'+((cData&&cData.industry)||'-')+'</td>'
    +'</tr>'
    +'<tr style="background:#f1f5f9">'
    +'<th style="padding:7px 12px;text-align:left;color:#475569;font-weight:700;white-space:nowrap;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;background:#f1f5f9">사업장주소</th>'
    +'<td style="padding:7px 12px;font-weight:600;color:#1e293b;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0" colspan="3">'+((cData&&cData.address)||'-')+'</td>'
    +'</tr>'
    +'<tr>'
    +'<th style="padding:7px 12px;text-align:left;color:#475569;font-weight:700;white-space:nowrap;border-right:1px solid #e2e8f0;background:#f1f5f9">핵심아이템</th>'
    +'<td style="padding:7px 12px;font-weight:600;color:#1e293b" colspan="3">'+((cData&&cData.coreItem)||'-')+'</td>'
    +'</tr>'
    +'</table>'
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
  var vLabel = config.version==='consultant'?'컨설턴트용':config.version==='client'?'클라이언트용':(config.vLabel||'');
  return buildUnifiedCover(config.title||config.reportKind||'보고서', vLabel, cData, dateStr, color);
}

function mgmtCover(cData, rev, exp, dateStr, version) {
  var isConsultant = (version === 'consultant');
  var color = isConsultant ? '#334155' : '#2563eb';
  var vLabel = isConsultant ? '컨설턴트용' : '클라이언트용';
  return buildUnifiedCover('AI 경영진단보고서', vLabel, cData, dateStr, color);
}


// ═══════════════════════════════════════
// ★ 경영진단 클라이언트용 — 자연 흐름 레이아웃
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
  var ind = cData.industry||'제조업';
  var itm = cData.coreItem||'주력제품';
  var certs = d.certs||getIndustryCerts(ind, nm, itm, cData).certs;
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
    +'<tr><th style="'+_thb+'">전년 매출</th><td style="'+_tdb+';white-space:nowrap">'+fKRWRound(rev.y25)+'</td><th style="'+_thb+'">금년 예상</th><td style="'+_tdb+';white-space:nowrap">'+fKRWRound(exp)+'</td><th style="'+_thb+'">핵심아이템</th><td style="padding:10px 14px;font-weight:600;'+_nw+'">'+(cData.coreItem||'-')+'</td></tr>'
    +'</table></div>';

  var gradeCards = '<div style="display:flex;gap:10px;margin-bottom:12px;align-items:stretch">'
    +'<div style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:10px;padding:16px 20px;min-width:160px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center">'
    +'<div style="font-size:11px;color:#64748b;margin-bottom:6px">AI 종합 진단 등급</div>'
    +'<div style="font-size:34px;font-weight:900;color:'+C+';line-height:1;margin-bottom:5px">'+(gradeVal)+'&nbsp;등급</div>'
    +'<div style="font-size:12px;color:#1e40af;font-weight:700">'+(d.grade_desc||'고성장 유망기업')+'</div>'
    +'</div>'
    +'<div style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:10px">'
    +[['📈',growRate,'매출성장률','#16a34a'],['💰',fKRWRound(exp),'금년예상',C],['👥',(cData.empCount||'0')+'명','상시근로자','#7c3aed'],['🏆',(gradeVal)+'등급','종합등급',C]].map(function(v){
      return '<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:12px 8px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:20px;margin-bottom:5px">'+v[0]+'</div><div style="font-size:14px;font-weight:800;color:'+v[3]+';margin-bottom:3px;white-space:nowrap">'+v[1]+'</div><div style="font-size:11px;color:#64748b">'+v[2]+'</div></div>';
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
    // 인증 카드 2열 그리드 (상단)
    '<div style="font-size:13px;font-weight:700;color:'+C+';margin-bottom:10px">📜 추천 인증 목록 (우선순위 순)</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'
    +certs.map(function(c,i){
      return '<div style="display:flex;align-items:flex-start;gap:10px;background:white;border:1px solid #e2e8f0;border-radius:9px;padding:11px 13px">'
        +'<div style="width:32px;height:32px;border-radius:7px;background:'+certBgs[i%4]+';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">'+certIcons[i%4]+'</div>'
        +'<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:2px">'+c.name+'</div><div style="font-size:11px;color:#64748b;line-height:1.5">'+c.effect+'</div></div>'
        +'<div style="text-align:right;flex-shrink:0;margin-left:6px"><div style="font-size:13px;font-weight:800;color:'+C+'">'+c.amount+'</div><div style="font-size:11px;color:#94a3b8;white-space:nowrap">'+c.period+'</div></div>'
        +'</div>';
    }).join('')
    +'</div>'
    // 최대 한도 강조 박스 (중앙 전체 너비)
    +'<div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);border-radius:12px;padding:20px;text-align:center;margin-bottom:14px">'
    +'<div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.85);margin-bottom:6px">인증 완료 시 총 추가 조달 가능 한도</div>'
    +'<div style="font-size:36px;font-weight:900;color:#ffffff;line-height:1.1;letter-spacing:-1px">최대 +'+(totalC2>0?totalC2+'억원':'6.5억원')+'</div>'
    +'<div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:6px">현재 신청 가능 한도 + 인증 취득 후 추가 조달 합계</div>'
    +'</div>'
    // 취득 우선순위 전략 (하단 2열)
    +'<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px">'
    +'<div style="font-size:13px;font-weight:700;color:'+C+';margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #e2e8f0">🗓 취득 우선순위 전략</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +[
        '1순위: 벤처인증 (약 6개월) — 즉각적 자금 한도 확대 효과 최대, 준비 난이도 낮음. 현재 매출로 충분히 취득 가능',
        '2순위: 이노비즈 (1년 내) — 벤처인증 후 연속 추진. 중진공 기술개발자금 자격 + 기보 우대보증 동시 적용',
        '3순위: 기업부설연구소 (중기) — 이노비즈와 병행, R&D 세액공제 25% 절세 효과 극대화 전략으로 추진',
        '4순위: HACCP (장기) — 대형마트·단체급식 채널 확보 후 안정적 B2B 매출 기반 마련 및 신뢰도 강화',
        '인증 준비는 사업계획서 작성과 병행하여 시너지를 극대화하고 컨설턴트와 일정 조율 강력 권고',
        '인증별 담당 기관 사전 접촉 및 예비 상담을 통해 요건 충족 여부를 조기에 점검하고 준비 착수 필요'
      ].map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#334155;line-height:1.6"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:'+C+'"></div><span>'+t+'</span></div>';}).join('')
    +'</div>'
    +'</div>'
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
// ★ 경영진단 컨설턴트용 — 자연 흐름 레이아웃 (클라이언트용 동일 구조)
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
  var ind = cData.industry||'제조업';
  var itm = cData.coreItem||'주력제품';
  var certs = d.certs||getIndustryCerts(ind, nm, itm, cData).certs.slice(0, 2);

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
    +'<tr><th style="'+_thb+'">전년 매출</th><td style="'+_tdb+';white-space:nowrap">'+fKRWRound(rev.y25)+'</td><th style="'+_thb+'">금년 예상</th><td style="'+_tdb+';white-space:nowrap">'+fKRWRound(exp)+'</td><th style="'+_thb+'">핵심아이템</th><td style="padding:10px 14px;font-weight:600;'+_nw+'">'+(cData.coreItem||'-')+'</td></tr>'
    +'</table></div>';
  // 정책자금 totalRange 계산 (buildFundHTML과 동일 로직) - 추가조달가능금액 연동
  var _clientFunds = getIndustryCerts(ind, nm, itm, cData).funds;
  var _clientRevNum = parseInt((cData.revenueData&&cData.revenueData.y25)||0) || parseInt((cData.revenueData&&cData.revenueData.y24)||0) || 0;
  var _clientDebtTotal = (parseInt(cData.debtJjg)||0)+(parseInt(cData.debtKibo)||0)+(parseInt(cData.debtShinbo)||0)+(parseInt(cData.debtSjg)||0)+(parseInt(cData.debtJaidan)||0)+(parseInt(cData.debtCorpCol)||0)+(parseInt(cData.debtRepCr)||0)+(parseInt(cData.debtRepCol)||0);
  var _clientDebtRatio = _clientRevNum > 0 ? Math.round((_clientDebtTotal/_clientRevNum)*100) : 0;
  var _clientMaxLim = 0;
  _clientFunds.forEach(function(f){
    var s=String(f.limit||'').replace(/[,\s]/g,'');
    var n=s.includes('억')?parseFloat(s)*100000000:s.includes('천만')?parseFloat(s)*10000000:s.includes('만')?parseFloat(s)*10000:parseFloat(s)||0;
    if(n>0)_clientMaxLim+=n;
  });
  var _clientAdj = _clientDebtRatio > 300 ? 0.6 : _clientDebtRatio > 200 ? 0.8 : 1.0;
  var _clientMaxAdj = Math.round(_clientMaxLim * _clientAdj);
  if (_clientRevNum > 0) { var _clientRevCap = Math.round(_clientRevNum * 0.8); if (_clientMaxAdj > _clientRevCap) _clientMaxAdj = _clientRevCap; }
  var _clientFundLabel = _clientMaxAdj > 0 ? (function(n){return n>=100000000?(n/100000000).toFixed(0)+'억':n>=10000000?(n/10000000).toFixed(0)+'천만':n>=10000?(n/10000).toFixed(0)+'만':n+''})(_clientMaxAdj) : '-';
  var gradeCards = '<div style="display:flex;gap:10px;margin-bottom:12px;align-items:stretch">'
    +'<div style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:10px;padding:16px 20px;min-width:160px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center">'
    +'<div style="font-size:11px;color:#64748b;margin-bottom:5px">종합 진단 등급</div>'
    +'<div style="font-size:34px;font-weight:900;color:#334155;line-height:1;margin-bottom:5px">'+gradeVal+'</div>'
    +'<div style="font-size:12px;color:#475569;font-weight:700">'+(d.grade_desc||'고성장 잠재력 보유')+'</div>'
    +'</div>'
    +'<div style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:10px">'
    +[['📈',growRate,'매출성장률','#16a34a'],['🚨','4건','핵심리스크','#dc2626'],['💰',fKRWRound(exp),'금년예상','#475569'],['🏦',_clientFundLabel,'추가조달가능','#475569']].map(function(v){
      return '<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:12px 8px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:20px;margin-bottom:5px">'+v[0]+'</div><div style="font-size:14px;font-weight:800;color:'+v[3]+';margin-bottom:3px;white-space:nowrap">'+v[1]+'</div><div style="font-size:11px;color:#64748b">'+v[2]+'</div></div>';
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
    '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 15px;background:#f8fafc;margin-bottom:12px">'
    +'<div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e9ecef">📈 연도별 매출 추이</div>'
    +'<div class="rp-ch" style="height:140px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px">'
    +[['전년 매출',fKRWRound(rev.y25),'2025년','#475569'],['금년 예상',fKRWRound(exp),'연환산','#475569'],['YoY 성장',growRate,'전년 대비','#16a34a'],['현금흐름','주의','관리 필요','#f97316']].map(function(v){
      return '<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:9px;text-align:center"><div style="font-size:11px;color:#94a3b8;margin-bottom:2px">'+v[0]+'</div><div style="font-size:15px;font-weight:800;color:'+v[3]+';white-space:nowrap">' +v[1]+'</div><div style="font-size:10px;color:#94a3b8;margin-top:1px">'+v[2]+'</div></div>';
    }).join('')
    +'</div></div>'
    +'<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:12px">'
    +'<div style="border:1.5px solid #3b82f6;border-radius:10px;padding:14px 16px;background:#eff6ff">'
    +'<div style="font-size:13px;font-weight:700;color:#1d4ed8;margin-bottom:10px;padding-bottom:8px;border-bottom:1.5px solid #bfdbfe">💡 재무 현황 분석</div>'
    +'<div style="display:flex;flex-direction:column;gap:9px">'
    +(d.finance_strengths||[
        nm+'는 전년 대비 금년 예상 매출이 80% 이상 급증하며 매우 강력한 성장세를 시현하고 있음',
        '매출 성장에 비해 고정비 증가가 억제되어 영업 레버리지 효과가 수익성 개선으로 이어지고 있음',
        '주요 원재료 공급처와의 장기 계약으로 원가 안정성을 확보하고 있으며 마진율 방어에 유리한 구조임',
        '재고 회전율이 업종 평균 대비 양호한 수준을 유지하여 운전자본 효율성이 상대적으로 높음',
        '매출채권 회수 기간이 짧아 현금 전환 주기(CCC)가 경쟁사 대비 유리한 편이며 유동성 리스크가 낮음',
        '고정비 최소화 구조로 손익분기점이 낮게 형성되어 매출 변동에도 흑자 구조를 유지할 가능성이 높음'
      ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#1e3a5f;line-height:1.65"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#3b82f6"></div><span>'+t+'</span></div>';}).join('')
    +'</div></div>'
    +'<div style="border:1.5px solid #f97316;border-radius:10px;padding:14px 16px;background:#fff7ed">'
    +'<div style="font-size:13px;font-weight:700;color:#c2410c;margin-bottom:10px;padding-bottom:8px;border-bottom:1.5px solid #fed7aa">⚠️ 재무 리스크</div>'
    +'<div style="display:flex;flex-direction:column;gap:9px">'
    +(d.finance_risks||[
        '운전자본 부족 리스크 — 급성장에 따른 현금흐름 단기 경색 가능성이 높아 즉각적인 관리 체계 구축이 필요함',
        '단일 아이템 의존 구조 — 핵심 제품 매출 집중도가 80% 이상으로 포트폴리오 다각화가 시급함',
        '대표 의존도 높은 재무 운영 구조 — 핵심 인력 이탈 시 재무 의사결정 공백이 발생할 위험이 있음',
        '내부 통제 및 재무 관리 시스템 미흡 — 규모 확장에 따른 회계 오류 및 부정 리스크가 증대됨',
        '부채 의존도 증가 추세 — 차입금 증가로 인한 이자 부담이 영업이익을 잠식할 가능성이 있음',
        '매출 급증 대비 자본 적립 속도 부족 — 자기자본비율 하락 시 금융기관 신용 평가에 부정적 영향이 있음'
      ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#7c2d12;line-height:1.65"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#f97316"></div><span>'+t+'</span></div>';}).join('')
    +'</div></div>'
    +'</div>'
    +'<div style="page-break-before:always;break-before:page"></div>'
    +'<div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;background:#f8fafc;margin-bottom:12px">'
    +'<div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:12px;padding-bottom:8px;border-bottom:1.5px solid #e2e8f0">📊 영역별 재무 지표</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
    +[['매출 성장률','전년 대비 매출 증가율로 사업 확장 속도를 나타냄',bars.finance||82,'#16a34a'],['매출이익률','매출 대비 매출총이익 비율로 상품 경쟁력을 반영함',Math.max((bars.finance||82)-8,62),'#2563eb'],['현금흐름 안정성','영업활동 현금흐름의 안정성으로 단기 지급 능력을 나타냄',Math.max((bars.finance||82)-25,45),'#f97316'],['부채 안정성','부채비율 역수 기반 지표로 재무 건전성 수준을 나타냄',Math.min((bars.finance||82)+3,88),'#7c3aed']].map(function(b){
      var score=b[2]; var color=b[3];
      var grade=score>=80?'우수':score>=65?'양호':score>=50?'보통':'주의';
      var gradeBg=score>=80?'#dcfce7':score>=65?'#dbeafe':score>=50?'#fef9c3':'#fee2e2';
      var gradeColor=score>=80?'#15803d':score>=65?'#1d4ed8':score>=50?'#854d0e':'#dc2626';
      return '<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:13px 15px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
        +'<span style="font-size:13px;font-weight:700;color:#334155">'+b[0]+'</span>'
        +'<span style="background:'+gradeBg+';color:'+gradeColor+';font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px">'+grade+'</span>'
        +'</div>'
        +'<div style="font-size:11px;color:#64748b;margin-bottom:8px;line-height:1.5">'+b[1]+'</div>'
        +'<div style="display:flex;align-items:center;gap:10px">'
        +'<div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;border-radius:4px;width:'+score+'%;background:'+color+'"></div></div>'
        +'<span style="font-size:15px;font-weight:900;color:'+color+';min-width:36px;text-align:right">'+score+'점</span>'
        +'</div>'
        +'</div>';
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
    +'<div style="display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:12px">'
    +'<div style="background:#fef9ec;border:1.5px solid #fcd34d;border-radius:10px;padding:13px 14px">'
    +'<div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #fcd34d">🚨 시급 해결 이슈 TOP 3</div>'
    +(d.consultant_issues||[
      nm+'의 대표 1인 의존도를 낮추기 위한 핵심 인력 채용과 업무 분담 체계 구축이 가장 시급한 과제임',
      '급성장하는 매출에 상응하는 내부 통제·운영 효율성 확보를 위해 체계적인 관리 시스템 도입이 절실함',
      '미래 성장을 위한 전략적 투자 재원 마련과 효과적인 정책자금 조달 계획 수립이 당면 핵심 과제임'
    ]).map(function(t,i){return '<div style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#92400e;line-height:1.6;margin-bottom:8px"><div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:800;flex-shrink:0">TOP'+(i+1)+'</div><span>'+t+'</span></div>';}).join('')
    +'</div>'
    +'<div style="background:#fef9ec;border:1.5px solid #fcd34d;border-radius:10px;padding:13px 14px">'
    +'<div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #fcd34d">📜 인증 취득 전략 + 가점추천</div>'
    +(d.consultant_certs||[
      '벤처인증 우선 취득 — 기술평가 방식 활용(현장 심사 불요), 현재 매출·역량으로 즉시 신청이 가능함',
      '이노비즈 인증은 벤처인증 취득 후 1년 내 추진 — 기술 경쟁력 지표 사전 정비가 필요함'
    ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#92400e;line-height:1.6;margin-bottom:7px"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#d97706"></div><span>'+t+'</span></div>';}).join('')
    +certs.map(function(c,i){
      return '<div style="background:white;border:1px solid #fcd34d;border-radius:8px;padding:9px 11px;margin-top:6px;display:flex;align-items:flex-start;gap:9px">'
        +'<div style="flex:1"><div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:2px">'+c.name+'</div><div style="font-size:11px;color:#64748b;line-height:1.5">'+c.effect+'</div></div>'
        +'<div style="text-align:right;flex-shrink:0"><div style="font-size:13px;font-weight:800;color:#d97706">'+c.amount+'</div><div style="font-size:10px;color:#94a3b8">'+c.period+'</div></div>'
        +'</div>';
    }).join('')
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'<div class="rp-cat" style="background:#fffbeb;border:2px solid #f59e0b;page-break-before:always;break-before:page">'
    +'<div class="rp-ph">'
    +'<div class="rp-pnum" style="background:#fef3c7;color:#d97706">🔒</div>'
    +'<span class="rp-ptitle">컨설턴트 실질 조언 (계속)</span>'
    +'<span class="rp-psub" style="color:#dc2626;font-weight:600">내부 전용 — 대외비</span>'
    +'</div>'
    +'<div class="rp-body">'
    +'<div style="display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:12px">'
    +'<div style="background:#fef9ec;border:1.5px solid #fcd34d;border-radius:10px;padding:13px 14px">'
    +'<div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #fcd34d">💰 정책자금 신청 전략</div>'
    +(d.consultant_funds||[
      '1순위: 중진공 소공인 특화자금(1억) — 이번 달 신청 착수, 약 30일 내 승인 가능한 가장 빠른 루트임',
      '2순위: 기보 기술보증(3억) — 현재 역량 기반 우대 적용, 사업계획서 준비 후 병행 신청 권고',
      '3순위: 벤처인증 취득 후 신보 특례보증(2억) — 총 6억+ 조달 시나리오 실행이 가능함',
      '병행 전략: 소진공 성장촉진자금(1억) 추가 신청으로 최대 7억+ 조달 극대화가 가능함'
    ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#92400e;line-height:1.6;margin-bottom:7px"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#d97706"></div><span>'+t+'</span></div>';}).join('')
    +'</div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +'<div style="background:#fef9ec;border:1.5px solid #fcd34d;border-radius:10px;padding:13px 14px">'
    +'<div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #fcd34d">📈 마케팅 개선</div>'
    +(d.consultant_marketing||[
      '디지털 마케팅: '+nm+'를 위한 SNS·블로그·온라인 채널을 활용한 홍보 및 잠재 고객 발굴 전략을 수립함',
      'B2B 영업 강화: 기존 거래처 관리 효율화 및 신규 거래처 발굴을 위한 영업 프로세스 개선 방안을 제안함',
      '콘텐츠 마케팅: 전문 블로그·유튜브 채널 운영으로 업계 신뢰도를 높이고 인바운드 리드를 창출함',
      '리뷰·UGC 전략: 기존 고객의 후기를 적극 수집·활용하여 신규 고객 전환율을 높이는 방안을 실행함'
    ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#92400e;line-height:1.6;margin-bottom:7px"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#d97706"></div><span>'+t+'</span></div>';}).join('')
    +'</div>'
    +'<div style="background:#fef9ec;border:1.5px solid #fcd34d;border-radius:10px;padding:13px 14px">'
    +'<div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #fcd34d">💳 신용 개선</div>'
    +(d.consultant_credit||[
      '재무제표 정비: '+nm+'의 회계 처리 투명성을 높이고 재무 건전성을 강화하여 신용 평가에 긍정적 영향을 줌',
      '부채 비율 관리: 정책자금 상환 계획을 수립하여 안정적인 자금 흐름으로 신용도를 지속 향상시킴',
      '연체 이력 관리: 기존 대출 원리금 연체 없이 관리하여 신용등급 유지 및 추가 조달 여력을 확보함',
      '세금 완납 유지: 국세·지방세 완납 상태를 유지하여 정책자금 심사 시 결격 사유를 사전에 차단함'
    ]).map(function(t){return '<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#92400e;line-height:1.6;margin-bottom:7px"><div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:#d97706"></div><span>'+t+'</span></div>';}).join('')
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>';

  return tplStyle(C,'portrait') + '<div class="rp-wrap rp-flow">' + cover + cat1 + cat2 + cat3 + cat4 + cat5 + cat6 + cat7 + '</div>';
}


// ===========================
// ★ 재무제표 분석 (표지+3P)
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
      +'<div style="font-size:56px;font-weight:900;color:#3f3f46;letter-spacing:-2.1px;line-height:1.08;margin-bottom:28px">재무제표 분석</div>'
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
      +'<div style="font-size:20px;font-weight:900;color:'+(valueColor||color)+';line-height:1.28;letter-spacing:-0.5px;white-space:nowrap">'+value+'</div>'
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
    +financeMetricCard('전년 매출', fKRWRound(rev.y25), '2025년', color)
    +financeMetricCard('금년 예상', fKRWRound(exp), '연환산', color)
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

  // p2: 신용개선방향 등 내용 잘림 방지 - rp-page-auto 사용 (높이 제한 없음)
  var p2Auto = p2.replace('class="rp-page"', 'class="rp-page-auto"');
  return tplStyle(color, 'portrait') + '<div class="rp-wrap">' + cover + p1 + p2Auto + p3 + '</div>';
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
    '<div class="rp-2col" style="margin-bottom:12px">'
    +'<div class="rp-col50" style="display:flex;flex-direction:column;gap:10px">'
    +'<div class="rp-g3">'
    +rpMC('유동인구 (일평균)',d.traffic||'2,400명','일평균 유동량',color)
    +rpMC('반경1km 경쟁업체',(d.competitors||7)+'개','직접 경쟁',parseInt(d.competitors||7)>5?'#f97316':'#16a34a')
    +rpMC('입지 경쟁력 등급',d.grade||'B+','상위 30%',color)
    +'</div>'
    +rpSec('경쟁 현황 요약', color,
      '<div style="display:flex;justify-content:space-around;text-align:center;padding:8px 0">'
      +'<div><div style="font-size:28px;font-weight:800;color:'+color+'">'+(d.comp_direct||7)+'</div><div style="font-size:12px;color:#64748b;margin-top:3px">직접 경쟁</div></div>'
      +'<div><div style="font-size:28px;font-weight:800;color:#f97316">'+(d.comp_strong||3)+'</div><div style="font-size:12px;color:#64748b;margin-top:3px">강성 경쟁</div></div>'
      +'<div><div style="font-size:28px;font-weight:800;color:#16a34a">'+(d.diff_potential||'高')+'</div><div style="font-size:12px;color:#64748b;margin-top:3px">차별화 여지</div></div>'
      +'</div>'
    )
    +'</div>'
    +'<div class="rp-colF">'
    +rpSec('입지 경쟁력 레이더', color, '<div class="rp-ch" style="height:240px"><canvas id="tp-radar" data-scores="'+radar+'" style="width:100%;height:100%"></canvas></div>')
    +'</div>'
    +'</div>'
    +rpSec('상권 특성 분석', color, rpLst(d.features||[
      '주변 1km 내 핵심 소비층인 30~40대 1~2인 가구의 밀집도가 높아 타겟 고객 접근성이 우수한 입지임',
      '대중교통 접근성(지하철·버스)이 양호하여 광역 고객 유입 가능성이 높고 주중·주말 유동량이 고른 편임',
      '상권 성장 단계가 성숙기에 진입하여 안정적인 수요는 확보되어 있으나 신규 경쟁자 진입 리스크도 존재함',
      '반경 내 유사 업종 경쟁업체 '+(d.comp_direct||7)+'개 중 강성 경쟁업체는 '+(d.comp_strong||3)+'개로 차별화 전략이 필수적임'
    ], color))
    +rpSec('운영 전략 포인트', color, rpLst(d.strategy||[
      '경쟁사 대비 차별화된 제품·서비스 강점을 명확히 하여 가격 경쟁이 아닌 가치 경쟁으로 포지셔닝해야 함',
      '네이버 스마트플레이스 최적화 및 SNS 위치 태그 활성화로 주변 고객 자연 유입을 극대화해야 함',
      '고객 재방문율 향상을 위한 포인트 적립, 정기 구독, 단골 혜택 프로그램을 조기에 도입해야 함',
      '피크타임(점심·저녁·주말) 운영 최적화와 비피크타임 프로모션으로 시간대별 매출을 균등화해야 함',
      '배달·픽업 서비스 도입으로 반경 3km 이내 비방문 고객까지 커버하여 잠재 시장을 확대해야 함'
    ], color))
  );

  var p2 = rpPage(2,'타겟 고객 및 매출 예측','고객 프로파일 · 시뮬레이션',color,
    rpSec('타겟 고객 프로파일', color,
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px">'
      +[['\uc8fc \uc5f0\ub839\ub300',target.age],['\uac00\uad6c \uc720\ud615',target.household],['\uad6c\ub9e4 \ucc44\ub110',target.channel],['\uad6c\ub9e4 \uc8fc\uae30',target.cycle]].map(function(pair){
        return '<div style="background:white;border-radius:8px;padding:11px 9px;border:1px solid #e2e8f0;text-align:center"><div style="font-size:12px;color:#64748b;margin-bottom:4px">'+pair[0]+'</div><div style="font-size:16px;font-weight:700;color:'+color+'">'+pair[1]+'</div></div>';
      }).join('')
      +'</div>'
    )
    +'<div class="rp-2col">'
    +'<div class="rp-col50">'
    +rpSec('매출 잠재력 시뮬레이션 (월 매출)', color,
      '<div class="rp-ch" style="height:200px"><canvas id="tp-linechart" data-s0="'+sim.s0+'" data-s1="'+sim.s1+'" data-s2="'+sim.s2+'" data-s3="'+sim.s3+'" style="width:100%;height:100%"></canvas></div>'
    )
    +'</div>'
    +'<div class="rp-colF">'
    +'<div class="rp-g2" style="margin-bottom:8px">'
    +rpMC('현재',(function(n){var m=Math.round(n/100)*100;if(m>=10000){var ok=Math.floor(m/10000);var rem=m%10000;return ok+'억'+(rem>0?' '+Math.round(rem/1000)+'천만원':'억원');}return Math.round(m/1000)+'천만원';  })(sim.s0),'/월',color)
    +rpMC('6개월',(function(n){var m=Math.round(n/100)*100;if(m>=10000){var ok=Math.floor(m/10000);var rem=m%10000;return ok+'억'+(rem>0?' '+Math.round(rem/1000)+'천만원':'억원');}return Math.round(m/1000)+'천만원';  })(sim.s1),'+'+Math.round((sim.s1-sim.s0)/sim.s0*100)+'%',color)
    +'</div>'
    +'<div class="rp-g2">'
    +rpMC('1년',(function(n){var m=Math.round(n/100)*100;if(m>=10000){var ok=Math.floor(m/10000);var rem=m%10000;return ok+'억'+(rem>0?' '+Math.round(rem/1000)+'천만원':'억원');}return Math.round(m/1000)+'천만원';  })(sim.s2),'+'+Math.round((sim.s2-sim.s0)/sim.s0*100)+'%',color)
    +rpMC('2년',(function(n){var m=Math.round(n/100)*100;if(m>=10000){var ok=Math.floor(m/10000);var rem=m%10000;return ok+'억'+(rem>0?' '+Math.round(rem/1000)+'천만원':'억원');}return Math.round(m/1000)+'천만원';  })(sim.s3),'+'+Math.round((sim.s3-sim.s0)/sim.s0*100)+'%',color)
    +'</div>'
    +'<div style="font-size:11px;color:#64748b;padding:9px;background:#f0fdfa;border-radius:7px;margin-top:8px">\u203b \uc5c5\uc885 \ud3c9\uade0 \uc131\uc7a5\ub960 \ub2ec\uc131 \uac00\uc815 \uc2dc \ucd94\uc815\uac12 (\uc804\uc81c: \uc6b4\uc601 \uc804\ub7b5 \uc774\ud589, \uacc4\uc808\uc131 \ubc18\uc601, \uacbd\uc7c1 \ud658\uacbd \uc720\uc0ac \uc218\uc900 \uc720\uc9c0)</div>'
    +'</div>'
    +'</div>'
    +rpSec('\uace0\uac1d \uc804\ub7b5', color, rpLst([
      target.age+' \ud0c0\uac9f\uce35\uc758 \uc18c\ube44 \ud328\ud134\uc744 \ubd84\uc11d\ud558\uc5ec \uc120\ud638\ud558\ub294 \uac00\uaca9\ub300\u00b7\ud328\ud0a4\uc9c0\u00b7\ud64d\ubcf4 \uba54\uc2dc\uc9c0\ub97c \ucd5c\uc801\ud654\ud574\uc57c \ud568',
      target.household+' \uac00\uad6c \ub9de\ucda4 \uc18c\uc6a9\ub7c9\u00b7\ud3b8\uc758\uc131 \uc81c\ud488 \uad6c\uc131\uc73c\ub85c \uad6c\ub9e4 \uc7a5\ubcbd\uc744 \ub099\ucdb0\uace0 \uc7ac\uad6c\ub9e4\uc728\uc744 \ub192\uc5ec\uc57c \ud568',
      target.channel+' \ucc44\ub110 \ucd5c\uc801\ud654\ub97c \ud1b5\ud574 \uc18c\ube44\uc790 \uc811\uc810\uc744 \ub2e4\uac01\ud654\ud558\uace0 \uad6c\ub9e4 \uc804\ud658\uc728\uc744 \uccb4\uacc4\uc801\uc73c\ub85c \uad00\ub9ac\ud574\uc57c \ud568'
    ], color))
  );

  return tplStyle(color, 'portrait') + '<div class="rp-wrap">' + cover
    + p1.replace('class="rp-page"','class="rp-page-auto"').replace(/min-height:\s*\d+px/g,'min-height:auto')
    + p2.replace('class="rp-page"','class="rp-page-auto"').replace(/min-height:\s*\d+px/g,'min-height:auto')
    + '</div>';
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
    +rpSec('채널별 예상 효과 (점수/100)', color, channels.map(function(ch,idx){return scoreBar(ch,idx);}).join(''))
    +'<div class="rp-section" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px">'
    +'<div style="font-size:13px;font-weight:700;color:'+color+';margin-bottom:10px;align-self:flex-start">월 예산 배분 ('+budgetTotal+')</div>'
    +'<div style="display:flex;align-items:center;justify-content:center;gap:16px;width:100%">'
    +'<div class="rp-ch" style="width:160px;height:160px;flex-shrink:0;border:none;background:transparent"><canvas id="mp-donut" data-names="'+budget.map(function(b){return b.name;}).join('|')+'" data-ratios="'+budget.map(function(b){return b.ratio;}).join(',')+'" style="width:100%;height:100%"></canvas></div>'
    +'<div style="display:flex;flex-direction:column;gap:7px">'
    +budget.map(function(b,i){
      return '<div style="display:flex;align-items:center;gap:7px">'
        +'<div style="width:10px;height:10px;border-radius:50%;background:'+(bColors[i]||color)+';flex-shrink:0"></div>'
        +'<div style="font-size:11px;color:#64748b;line-height:1.35;white-space:nowrap">'+b.ratio+'% '+b.name+'</div>'
        +'</div>';
    }).join('')
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
    +rpSec('핵심 마케팅 전략', color,
      strategies.map(function(t){
        return '<div style="display:flex;align-items:flex-start;gap:8px;background:#fff0f6;border:1px solid #fce7f3;border-radius:8px;padding:10px 12px;margin-bottom:7px">'
          +'<div style="width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:5px;background:'+color+'"></div>'
          +'<span style="font-size:12px;color:#3f3f46;line-height:1.6">'+t+'</span>'
          +'</div>';
      }).join('')
    )
    +rpSec('예산 운영 원칙', color,
      principles.map(function(t){
        return '<div style="display:flex;align-items:flex-start;gap:8px;background:#fff0f6;border:1px solid #fce7f3;border-radius:8px;padding:10px 12px;margin-bottom:7px">'
          +'<div style="width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:5px;background:'+color+'"></div>'
          +'<span style="font-size:12px;color:#3f3f46;line-height:1.6">'+t+'</span>'
          +'</div>';
      }).join('')
    )
    +'</div>'
  );

  var p2 = rpPage(2,'KPI 목표 및 월별 실행 로드맵','성과 지표 · 실행 타임라인',color,
    '<div style="display:flex;flex-direction:column;gap:14px">'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'+kpi.map(kpiCard).join('')+'</div>'
    +rpSec('월별 실행 로드맵', color,
      '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px">'
      +roadmap.map(roadmapCard).join('')
      +'</div>'
      +'<div style="background:#fdf2f8;border:1px solid #f5c2da;border-radius:10px;padding:14px;margin-top:4px">'      +'<div style="font-size:13px;font-weight:800;color:#9d174d;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f5c2da">📅 분기별 실행 계획</div>'      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'      +(d.quarterly_plan||[        {q:'1분기',tasks:['채널별 콘텐츠 기초 세팅','SNS 계정 최적화 및 팔로워 확보','초기 광고 집행 및 반응 데이터 수집']},        {q:'2분기',tasks:['성과 데이터 기반 채널 집중화','인플루언서 협업 1~2건 진행','리뷰·후기 콘텐츠 강화']},        {q:'3분기',tasks:['고성과 채널 예산 확대','신규 고객 유입 캠페인 집중','재구매율 향상 프로모션 운영']},        {q:'4분기',tasks:['연간 성과 분석 및 KPI 점검','차년도 마케팅 전략 수립','충성 고객 리텐션 프로그램 운영']}      ]).map(function(q){        return '<div style="background:white;border:1px solid #fce7f3;border-radius:8px;padding:12px">'          +'<div style="font-size:12px;font-weight:800;color:#9d174d;margin-bottom:8px">'+q.q+'</div>'          +(q.tasks||[]).map(function(t){            return '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:5px">'              +'<div style="width:5px;height:5px;border-radius:50%;background:#e879a0;flex-shrink:0;margin-top:5px"></div>'              +'<span style="font-size:11px;color:#52525b;line-height:1.55">'+t+'</span>'              +'</div>';          }).join('')          +'</div>';      }).join('')      +'</div>'      +'</div>'
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
  var ind = cData.industry||'제조업';
  var itm = cData.coreItem||'주력제품';
  var _industryCerts = getIndustryCerts(ind, cData.name, itm, cData);
  // 신용점수·업력 동적 반영
  var _kcb  = parseInt(cData.kcbScore)  || 0;
  var _nice = parseInt(cData.niceScore) || 0;
  var _cs   = _kcb || _nice || 0;
  var _finO = cData.finOver || '없음';
  var _taxO = cData.taxOver || '없음';
  var _bizYrs = _industryCerts.bizYears || 0;
  var _hasOvd = _industryCerts.hasOverdue || (_finO==='있음'||_taxO==='있음');
  // checks 동적 생성
  var checks = d.checks || [
    {text:'중소기업 해당 여부',status:'pass'},
    {text:'국세·지방세 체납 없음',status:_taxO==='있음'?'fail':'pass'},
    {text:'금융 연체 이력 없음',status:_finO==='있음'?'fail':'pass'},
    {text:'사업자 등록 유효',status:'pass'},
    {text:'업력 조건 충족'+(_bizYrs>0?' ('+_bizYrs+'년)':''),status:_bizYrs===0?'cond':_bizYrs>=2?'pass':'cond'},
    {text:'신용점수'+(_cs>0?' ('+(_kcb?'KCB ':'')+(_nice?'NICE ':'')+_cs+'점)':''),status:_cs===0?'cond':_cs>=700?'pass':_cs>=600?'cond':'fail'},
    {text:'벤처·이노비즈 인증 보유',status:'fail'}
  ];
  var score  = d.score || (_cs>0 ? Math.min(95,Math.max(40,Math.round(_cs/10-5))) : 78);
  var gda    = Math.round((score/100)*151);
  var funds  = d.funds||_industryCerts.funds;
  // totalRange: funds 기반 동적 계산
  function parseLimitNum(s) {
    if (!s) return 0;
    s = String(s).replace(/[,\s]/g,'');
    if (s.includes('억')) return parseFloat(s)*100000000;
    if (s.includes('천만')) return parseFloat(s)*10000000;
    if (s.includes('만')) return parseFloat(s)*10000;
    return parseFloat(s)||0;
  }
  // ===== 정책자금 예상 한도 계산 (2026년 기준) =====
  // 1. 매출 기준: 금년 매출(rev_cur)이 있으면 1분기 기준으로 연환산(×4), 없으면 25년>24년 순서로 사용
  var _revCur = parseInt((cData.revenueData&&cData.revenueData.cur)||0) || 0;
  var _revY25  = parseInt((cData.revenueData&&cData.revenueData.y25)||0) || 0;
  var _revY24  = parseInt((cData.revenueData&&cData.revenueData.y24)||0) || 0;
  // 금년 매출(전월말 기준)이 있으면 1분기 기준 연환산: 3월까지 입력값 × 4
  // (rev_cur은 전월말 기준이므로 현재 월 기준으로 연환산)
  var _curMonth = new Date().getMonth() + 1; // 1~12
  var _annualizedCur = _revCur > 0 ? Math.round(_revCur * (12 / Math.max(_curMonth, 1))) : 0;
  // 예상 연매출: 연환산 금년 > 25년 > 24년 순서
  var _revNum = _annualizedCur || _revY25 || _revY24 || 0;
  // 2. 기대출 총액 (신보·기보·중진공·소진공·재단·법인담보·대표담보 합산)
  var _debtTotal = (parseInt(cData.debtJjg)||0)+(parseInt(cData.debtKibo)||0)+(parseInt(cData.debtShinbo)||0)+(parseInt(cData.debtSjg)||0)+(parseInt(cData.debtJaidan)||0)+(parseInt(cData.debtCorpCol)||0)+(parseInt(cData.debtRepCr)||0)+(parseInt(cData.debtRepCol)||0);
  var _debtRatio = _revNum > 0 ? Math.round((_debtTotal/_revNum)*100) : 0;
  // 3. 업종별 한도 비율: 제조업 1/4, 비제조업 1/7
  var _ind = (cData.industry||'').toLowerCase();
  var _isMfg = _ind.includes('제조') || _ind.includes('생산') || _ind.includes('가공') || _ind.includes('뿌리') || _ind.includes('소재') || _ind.includes('부품') || _ind.includes('장비');
  var _limitRatio = _isMfg ? (1/4) : (1/7);
  // 4. 예상 한도 = 예상 연매출 × 업종비율 - 기대출
  var _baseLimit = _revNum > 0 ? Math.round(_revNum * _limitRatio) : 0;
  var _fundLimit = Math.max(0, _baseLimit - _debtTotal);
  // 5. 부채비율 높으면 추가 하향 (200~300%: ×0.8, 300%↑: ×0.6)
  var _adj = _debtRatio > 300 ? 0.6 : _debtRatio > 200 ? 0.8 : 1.0;
  var _fundLimitAdj = Math.round(_fundLimit * _adj);
  function fLimitStr(n){ if(n>=100000000) return (n/100000000).toFixed(1).replace(/\.0$/,'')+'억'; if(n>=10000000) return (n/10000000).toFixed(0)+'천만'; if(n>=10000) return (n/10000).toFixed(0)+'만'; return n+''; }
  // 6. 필요자금 상한 적용 (필요자금이 있으면 계산값과 비교해 작은 값 사용)
  var _needFundNum = parseInt(cData.needFund)||0;
  var _maxAdj = _fundLimitAdj;
  if (_needFundNum > 0 && _maxAdj > _needFundNum) _maxAdj = _needFundNum; // 필요자금 초과 불가
  var _minAdj = Math.round(_maxAdj * 0.6);
  // 매출 없으면 기관별 한도 합산 방식 fallback
  if (_revNum === 0) {
    var _minLim = 0, _maxLim = 0;
    funds.forEach(function(f){ var n=parseLimitNum(f.limit); if(n>0){_maxLim+=n; if(_minLim===0)_minLim=n;} });
    _maxAdj = Math.round(_maxLim * _adj);
    if (_needFundNum > 0 && _maxAdj > _needFundNum) _maxAdj = _needFundNum;
    _minAdj = Math.round(_minLim * _adj);
  }
  // 한도 계산 근거 텍스트 생성
  var _limitBasis = _revNum > 0
    ? '예상 연매출 '+fLimitStr(_revNum)+' × '+(_isMfg?'1/4(제조업)':'1/7(비제조업)')
      +(_debtTotal>0?' − 기대출 '+fLimitStr(_debtTotal):'')  
      +(_adj<1?' × 부채비율 조정('+Math.round(_adj*100)+'%)':'')
    : '매출 미입력 — 기관별 한도 기준 산정';
  // 매출이 없어도 기관별 공식 한도 기준으로 항상 금액 표시 (별도 산정 필요 제거)
  if (_maxAdj === 0 && _revNum === 0 && funds.length > 0) {
    // 매출 미입력 시: 기관별 공식 한도 합산 기준으로 표시
    var _fallbackMin = 0, _fallbackMax = 0;
    funds.forEach(function(f){ var n=parseLimitNum(f.limit); if(n>0){_fallbackMax+=n; if(_fallbackMin===0||n<_fallbackMin)_fallbackMin=n;} });
    if (_needFundNum > 0 && _fallbackMax > _needFundNum) _fallbackMax = _needFundNum;
    _maxAdj = _fallbackMax;
    _minAdj = _fallbackMin;
  }
  // 최종 보정: 여전히 0이면 첫 번째 기관 한도 기준으로 표시
  if (_maxAdj === 0 && funds.length > 0) {
    _maxAdj = parseLimitNum(funds[0].limit) || 70000000;
    _minAdj = Math.round(_maxAdj * 0.5);
  }
  var totalRange = d.total_range || '기본 '+fLimitStr(_minAdj)+' ~ 최대 '+fLimitStr(_maxAdj);
  var rColors= [color,'#f97316','#fb923c','#94a3b8','#94a3b8'];
  var comp   = d.comparison||[{org:'소진공',limit:funds[0]&&funds[0].limit||'7시만',rate:'2.0%',period:'5년',diff:'easy'},{org:'지역신보',limit:'5천만',rate:'0.8%',period:'3년',diff:'easy'},{org:'신보',limit:'2억',rate:'0.5%',period:'7년',diff:'mid'},{org:'기보',limit:'3억',rate:'0.5%',period:'7년',diff:'hard'}];
  var dMap   = {easy:{bg:'#dcfce7',tc:'#166534',l:'쉬움'},mid:{bg:'#fef9c3',tc:'#854d0e',l:'보통'},hard:{bg:'#fee2e2',tc:'#991b1b',l:'어려움'}};
  var cReady = d.checklist_ready||['사업자등록증 사본','부가세 신고서 (최근 2년)','국세납부증명서','신용정보 동의서'];
  var cNeed  = d.checklist_need||['사업계획서 (기보 필수)','벤처인증서 (취득 후 추가)'];
  var scoreItems = d.score_items||[
    '기본 자격요건 충족 — 소진공·지역신보 등 주요 정책자금 즉시 신청 가능한 상태임',
    '벤처·메인비즈 인증 취득 시 추가 우대 한도 확보 가능함',
    '현재 조건에서 신청 가능한 자금 총액: '+totalRange+' 수준임'
  ];

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
    '<div style="display:grid;grid-template-columns:180px 1fr;gap:14px;margin-bottom:12px;align-items:stretch">'
    + '<div class="rp-section" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:#fff7ed;border-color:#fed7aa;padding:18px">'
    +   '<div style="font-size:12px;font-weight:700;color:'+color+';margin-bottom:10px">신청 가능성 종합 점수</div>'
    +   '<svg viewBox="0 0 110 62" width="130" height="74" style="display:block;margin:4px auto 10px">'
    +     '<path d="M12,52 A44,44 0 0,1 98,52" fill="none" stroke="#e2e8f0" stroke-width="13"/>'
    +     '<path d="M12,52 A44,44 0 0,1 98,52" fill="none" stroke="'+color+'" stroke-width="13" stroke-dasharray="'+(Math.round((score/100)*128))+' '+(128-Math.round((score/100)*128))+'" stroke-linecap="round"/>'
    +     '<text x="55" y="48" text-anchor="middle" font-size="20" font-weight="700" fill="#1e293b">'+score+'</text>'
    +   '</svg>'
    +   '<div style="font-size:16px;font-weight:800;color:'+color+';line-height:1.2;margin-bottom:8px">'+(d.score_desc||'신청 가능')+'</div>'
    +   '<div style="font-size:9.5px;color:#64748b;line-height:1.85;word-break:keep-all;white-space:normal;text-align:center">'+(d.match_count||5)+'개 기관 매칭 완료<br>예상 조달 범위<br>'+totalRange+'</div>'
    + '</div>'
    + rpSec('기본 자격 체크리스트', color,
          checks.map(function(c){ var s=chkS(c.status); return '<div class="rp-chk"><div class="rp-chi" style="background:'+s.bg+';color:'+s.tc+'">'+s.ic+'</div><div class="rp-cht">'+c.text+'</div><span class="rp-chb" style="background:'+s.bbc+';color:'+s.btc+'">'+s.bl+'</span></div>'; }).join('')
        )
    + '</div>'
    + '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 14px">'
    +   '<div style="font-size:12px;font-weight:700;color:'+color+';margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #fed7aa">자격 분석 종합</div>'
    +   rpLst(scoreItems, color)
    + '</div>'
  );

  var s2 = fundCat('추천 정책자금 포트폴리오','TOP 자금 · 우선순위 · 신청 포인트',
    '<div class="rp-section" style="margin-bottom:12px;background:#fff7ed;border-color:#fed7aa">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">'
    +   '<div><div style="font-size:14px;font-weight:800;color:'+color+';margin-bottom:4px">추천 우선순위 전략</div><div style="font-size:13px;color:#7c2d12">가장 신청 난도가 낮은 자금부터 확보하고, 인증 취득 후 고한도 보증 상품으로 확장하는 구조임</div></div>'
    +   '<div style="text-align:right"><div style="font-size:26px;font-weight:900;color:'+color+'">'+totalRange+'</div><div style="font-size:10.5px;color:#92400e;margin-top:3px;line-height:1.5">'+_limitBasis+'</div></div>'
    + '</div>'
    + '</div>'
    + '<div class="rp-g2" style="margin-bottom:12px">'
    + topFunds.concat(otherFunds).slice(0,4).map(function(f,i){
        var isTop = i < 3;
        return '<div class="rp-rank" style="margin-bottom:0;border-top:4px solid '+rColors[Math.min(i,4)]+';min-height:130px">'
          + '<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><div class="rp-rn" style="background:'+rColors[Math.min(i,4)]+';flex-shrink:0">'+f.rank+'</div><div style="flex:1"><div style="font-size:12px;font-weight:700;color:#1e293b;line-height:1.4;word-break:keep-all">'+f.name+'</div><div style="font-size:14px;font-weight:900;color:'+rColors[Math.min(i,4)]+';margin-top:2px">'+f.limit+'</div></div></div>'
          + '<div style="font-size:11px;color:#64748b;line-height:1.5;margin-bottom:8px">'+(isTop?'우선 검토 대상 자금으로 즉시 신청 가능성·한도·조건을 기준으로 선별함':'추가 검토 가능한 자금으로 조건 충족 시 신청 가능함')+'</div>'
          + '<div class="rp-rtgs">'+f.tags.map(function(t,j){ return '<span class="rp-rtg" style="background:'+(j===0?'#fff7ed':'#f8fafc')+';color:'+(j===0?'#c2410c':'#475569')+';font-size:10px">'+t+'</span>'; }).join('')+'</div>'
          + '</div>';
      }).join('')
    + '</div>'
    + '<div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:8px;padding:12px 16px;margin-bottom:0">'
    + '<div style="font-size:12px;font-weight:700;color:'+color+';margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #fed7aa">📋 신청 순서 권장안</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">'
    + ['1단계: 중진공·소진공 등 신청 난도가 낮은 자금을 먼저 확보해 초기 유동성을 안정화함','2단계: 특허·기술력 기반으로 기보 보증을 연결해 더 큰 한도를 추가 조달하는 구조를 설계함','3단계: 벤처·이노비즈 인증 취득 후 신보 특례보증까지 확장해 총 조달액을 극대화함','4단계: 기관별 심사 일정이 겹치지 않도록 월 단위 제출 캘린더를 운영해 승인 확률을 높임'].map(function(t,i){
        return '<div style="background:white;border:1px solid #fed7aa;border-radius:6px;padding:10px 11px">'
          +'<div style="font-size:11px;font-weight:800;color:'+color+';margin-bottom:5px">'+(i+1)+'단계</div>'
          +'<div style="font-size:10.5px;color:#7c2d12;line-height:1.55;word-break:keep-all">'+t.replace(/^\d단계: /,'')+'</div>'
          +'</div>';
      }).join('')
    + '</div>'
    + '</div>'
  );

  var s3 = fundCat('기관 비교 및 서류 준비','비교표 · 준비 현황 · 실행 체크',
    '<div class="rp-2col" style="margin-bottom:14px">'
    + '<div class="rp-col50">'
    +   '<div style="background:white;border:1.5px solid #e2e8f0;border-radius:10px;padding:16px 18px;height:100%">'
    +     '<div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #dcfce7">✅ 준비 완료 서류</div>'
    +     cReady.map(function(t){ return '<div class="rp-chk" style="padding:8px 0;border-bottom:1px solid #f1f5f9"><div class="rp-chi" style="background:#dcfce7;color:#16a34a">✓</div><div class="rp-cht" style="font-size:13px">'+t+'</div></div>'; }).join('')
    +   '</div>'
    + '</div>'
    + '<div class="rp-colF">'
    +   '<div style="background:white;border:1.5px solid #e2e8f0;border-radius:10px;padding:16px 18px;height:100%">'
    +     '<div style="font-size:13px;font-weight:700;color:#dc2626;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #fee2e2">❌ 추가 준비 필요 서류</div>'
    +     cNeed.map(function(t){ return '<div class="rp-chk" style="padding:8px 0;border-bottom:1px solid #f1f5f9"><div class="rp-chi" style="background:#fee2e2;color:#dc2626">✗</div><div class="rp-cht" style="font-size:13px">'+t+'</div></div>'; }).join('')
    +   '</div>'
    + '</div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'
    +   '<div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:14px 15px">'
    +     '<div style="font-size:13px;font-weight:700;color:'+color+';margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #fed7aa">핵심 비교 포인트</div>'
    +     rpLst([
              '중진공·소진공은 상대적으로 접근성이 높아 초기 확보용 자금으로 적합함',
              '기보·신보는 보증 구조상 한도가 크지만 기술성과 자료 완성도가 중요함'
            ], color)
    +   '</div>'
    +   '<div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;padding:14px 15px">'
    +     '<div style="font-size:13px;font-weight:700;color:#ca8a04;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #fde68a">심사 대응 팁</div>'
    +     rpLst([
              '최근 매출 흐름과 자금 사용계획을 연결해 상환 가능성을 수치 중심으로 설명함',
              '대표자 신용·세금·4대보험 이슈를 사전에 점검해 서류 보완 발생을 최소화함'
            ], '#ca8a04')
    +   '</div>'
    +   '<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:14px 15px">'
    +     '<div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #86efac">권장 실행 순서</div>'
    +     rpLst([
              '이번 주: 신청 대상 1·2순위 확정 및 제출용 기본 서류 취합',
              '2주 내: 자금 사용계획서·사업계획서 보완 후 중진공 또는 소진공 접수',
              '1개월 내: 기술보증용 특허·기술설명 자료 보강 및 기보 상담 진행',
              '분기 내: 벤처·이노비즈 인증 로드맵 착수 후 추가 보증 한도 확보'
            ], '#15803d')
    +   '</div>'
    + '</div>'
  );

  return tplStyle(color, 'portrait') + '<div class="rp-wrap rp-flow rp-flow-tight">' + cover + s1 + s2 + s3 + '</div>';
}

// ===========================
// ★ AI 사업계획서 (표지+10P)
// ===========================
function buildBizPlanHTML(d, cData, rev, dateStr) {
  var color = '#1e2d4a';   // 네이비 (시안 기준)
  var accentRed = '#c0392b'; // 빨간 포인트
  var exp   = calcExp(cData, rev);

  // ── 사업계획서 전용 표지 (시안 스타일: 네이비 그라데이션 전체 배경) ──
  var session = JSON.parse(localStorage.getItem(DB_SESSION)||'{}');
  var cName = session.name||'담당 컨설턴트';
  var cDept = session.dept||'(주)비즈AI솔루션';
  var dateObj = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(dateObj.getTime())) dateObj = new Date();
  var issueDate = dateObj.getFullYear()+'년 '+(dateObj.getMonth()+1)+'월';
  var kpiCoverItems = [
    {val: fKRW(rev.y25||0), lbl: '전년도 매출'},
    {val: '+'+(rev.y24>0&&rev.y25>0?Math.round(((rev.y25-rev.y24)/rev.y24)*100):21)+'%', lbl: 'YoY 성장률'},
    {val: (cData.empCount||'-')+'명', lbl: '상시 근로자'},
    {val: cData.needFund>0?fKRW(cData.needFund):'2억원', lbl: '투자 요청액'},
    {val: cData.certs?cData.certs.split(',').length+'건':'1건', lbl: '보유 인증'}
  ];
  var cover = '<div class="rp-cover" style="background:linear-gradient(160deg,#1a2a4a 0%,#0d1b3e 60%,#1a2a4a 100%);padding:0;position:relative;overflow:hidden">'
    // 배경 장식 원
    + '<div style="position:absolute;top:-80px;right:-80px;width:320px;height:320px;border-radius:50%;background:rgba(255,255,255,0.04)"></div>'
    + '<div style="position:absolute;bottom:-60px;left:-60px;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,0.03)"></div>'
    // 중앙 콘텐츠
    + '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 60px;position:relative;z-index:1">'
    +   '<div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:20px;padding:6px 20px;font-size:11px;color:rgba(255,255,255,0.85);letter-spacing:1px;margin-bottom:24px">기관·투자용 AI 사업계획서 · 안정성·실행형</div>'
    +   '<div style="font-size:48px;font-weight:900;color:white;text-align:center;line-height:1.15;letter-spacing:-1.5px;margin-bottom:12px">'+cData.name+'</div>'
    +   '<div style="font-size:15px;color:rgba(255,255,255,0.7);text-align:center;margin-bottom:8px">'+(cData.coreItem||cData.industry||'핵심 사업 아이템')+'</div>'
    +   '<div style="width:60px;height:3px;background:'+accentRed+';border-radius:2px;margin:16px auto 28px"></div>'
    // KPI 카드 5개
    +   '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">'
    +   kpiCoverItems.map(function(k){
          return '<div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:14px 20px;text-align:center;min-width:90px">'
            + '<div style="font-size:20px;font-weight:900;color:white;line-height:1.2">'+k.val+'</div>'
            + '<div style="font-size:10px;color:rgba(255,255,255,0.65);margin-top:4px">'+k.lbl+'</div>'
            + '</div>';
        }).join('')
    +   '</div>'
    + '</div>'
    // 하단 기업정보 바
    + '<div style="background:rgba(0,0,0,0.35);padding:14px 40px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1;flex-shrink:0">'
    +   '<div style="display:flex;gap:32px">'
    +     '<span style="font-size:11px;color:rgba(255,255,255,0.7)">상호 <strong style="color:white">'+cData.name+'</strong></span>'
    +     '<span style="font-size:11px;color:rgba(255,255,255,0.7)">대표자 <strong style="color:white">'+(cData.rep||'-')+'</strong></span>'
    +     '<span style="font-size:11px;color:rgba(255,255,255,0.7)">업종 <strong style="color:white">'+(cData.industry||'-')+'</strong></span>'
    +     '<span style="font-size:11px;color:rgba(255,255,255,0.7)">사업자번호 <strong style="color:white">'+(cData.bizNum||cData.bizNo||'-')+'</strong></span>'
    +     '<span style="font-size:11px;color:rgba(255,255,255,0.7)">사업장주소 <strong style="color:white">'+(cData.address||cData.addr||'-')+'</strong></span>'
    +   '</div>'
    +   '<div style="text-align:right">'
    +     '<div style="font-size:10px;color:rgba(255,255,255,0.6)">작성일: '+issueDate+'</div>'
    +     '<div style="font-size:10px;color:rgba(255,255,255,0.6)">담당 컨설턴트: '+cName+'</div>'
    +     '<div style="font-size:10px;color:rgba(255,255,255,0.6)">'+cDept+'</div>'
    +   '</div>'
    + '</div>'
    + '</div>';

  var swot = d.s2_swot||{strength:['창업 1년 만에 13억 8천만원 폭발적 매출 달성 — 시장성 검증 완료'],weakness:['상시근로자 4명의 소규모 인력으로 사업 확장 속도에 제약이 있음'],opportunity:['HMR 시장 연 18% 성장 — 돈육·육수 세그먼트 최우수 성장 구간'],threat:['대형 식품기업의 후발 진입 가능성 상시 존재 — 특허 방어 필수']};
  var compRows = d.s4_competitor||[{item:'제품 경쟁력',self:'★★★★★',a:'★★★★',b:'★★★'},{item:'기술력(특허)',self:'★★★★★',a:'★★★',b:'★★★'},{item:'가격 경쟁력',self:'★★★★',a:'★★★★★',b:'★★★★'},{item:'유통망',self:'★★★',a:'★★★★★',b:'★★★★'},{item:'성장성',self:'★★★★★',a:'★★★',b:'★★★'}];
  var diffs = d.s5_items||[{title:'기술 차별화',text:'돈육 사골 농축 압축 기술 특허 보유 — 경쟁사의 동일 제품 제조를 원천 차단하는 진입 장벽 구축',color:'#16a34a'},{title:'제품 차별화',text:'1회 분량 개별 포장으로 위생·편의성·보관성을 동시에 충족 — 소비자 불편을 해소한 혁신 제품',color:'#2563eb'},{title:'시장 포지셔닝',text:'HMR 내 돈육 특화 세그먼트 선점 — 틈새 독점 포지션 구축으로 경쟁 압력을 원천 최소화',color:'#7c3aed'},{title:'성장 증명력',text:'창업 1년 만에 11억 달성 — 투자·자금 심사 기관이 가장 신뢰하는 시장성 검증 완료 상태',color:'#ea580c'}];
  var bgMap = {'#16a34a':'#f0fdf4','#2563eb':'#eff6ff','#7c3aed':'#fdf4ff','#ea580c':'#fff7ed'};
  var bdMap = {'#16a34a':'#86efac','#2563eb':'#93c5fd','#7c3aed':'#d8b4fe','#ea580c':'#fdba74'};
  var ind = cData.industry||'제조업';
  var itm = cData.coreItem||'주력제품';
  var bpCerts = d.s6_certs||getIndustryCerts(ind, cData.name, itm, cData).certs;
  var bpIcons = ['🏆','📜','🔬','✅'];
  var bpBgs   = ['#f0fdf4','#eff6ff','#fdf4ff','#fff7ed'];
  var totalBp = bpCerts.reduce(function(s,c){var n=parseFloat(String(c.amount||'').replace(/[^0-9.]/g,'')); return s+(isNaN(n)?0:n);}, 0);
  var nf = cData.needFund>0 ? fKRW(cData.needFund) : '4억원';
  var fundRows = d.s7_rows||[{item:'원재료 구입',amount:'1억 5천만원',ratio:'37.5%',purpose:'돈육 사골 등 핵심 원재료 선매입 및 안정적 재고 확보'},{item:'생산 설비 투자',amount:'1억원',ratio:'25%',purpose:'반자동 생산설비 도입 — 원가율 20% 절감 목표'},{item:'마케팅·채널 확대',amount:'7천만원',ratio:'17.5%',purpose:'SNS 광고·쿠팡 입점·브랜드 마케팅 집행'},{item:'운전자금',amount:'8천만원',ratio:'20%',purpose:'인건비·공과금·운영 고정비 등'}];
  var kpi9 = d.s9_kpi||{y1:'18억',y2:'24억',ch:'5개↑',emp:'11명'};
  var rmYears = d.s9_roadmap||[{year:'2026',tasks:['정책자금 4억 조달 완료','생산 설비 확충 가동','쿠팡·스마트스토어 입점']},{year:'2027',tasks:['벤처인증 취득 완료','B2B 납품 채널 3곳','매출 24억 달성']},{year:'2028',tasks:['이노비즈 취득','매출 35억 달성','자동화 생산 완성']},{year:'2029~',tasks:['해외 수출 추진','기업부설연구소','매출 100억 목표']}];
  var rmColors = ['#1e2d4a','#2563eb','#7c3aed','#ea580c'];
  var conclusion = d.s10_conclusion||cData.name+'는 창업 이후 단기간에 폭발적인 매출 성장을 달성하며 HMR 시장의 핵심 플레이어로 부상하고 있음. 돈육 사골 농축 압축 기술 특허와 1회 분량 개별 포장이라는 독창적 제품력은 경쟁사가 쉽게 모방할 수 없는 진입 장벽을 구축하고 있음. 정책자금 4억원 조달 시 생산 설비 확충과 마케팅 채널 다각화를 통해 2년 내 매출 24억 달성이 충분히 가능한 성장 기반을 갖추고 있음. 인증 취득 로드맵을 체계적으로 실행하면 추가 자금 최대 6.5억원 확보와 함께 중장기 매출 100억 목표 달성 가능성이 충분히 있음.';
  var yoy = (rev.y24>0&&rev.y25>0)?Math.round(((rev.y25-rev.y24)/rev.y24)*100):21;
  var overviewItems = d.s1_items||[
    '창업 1년 만에 11억 4천만원 달성 → 금년 14억원 예상 — 업종 내 최고 수준의 초고속 성장세를 기록 중임',
    '돈육 사골 농축 압축 기술 특허를 보유하여 경쟁사의 제품 모방 및 시장 진입을 원천 방어하고 있음',
    'HMR 시장 내 돈육 특화 세그먼트에서 독보적인 포지션을 구축하여 빠른 시장 침투를 성공적으로 실현함',
    '소수 정예 4인 팀 운영으로 인당 생산성이 업종 평균을 크게 상회하는 탁월한 운영 효율성을 보여줌',
    '정책자금 4억원 조달 시 생산 설비 확충 및 채널 다각화로 2년 내 매출 2배 이상 성장이 가능한 기반을 보유함'
  ];

  // ── P1: 사업개요 및 핵심지표 ──
  var p1 = rpPageAuto(1,'사업개요 및 핵심지표','기업 정보 · 실행 배경 · 핵심 강점',color,
    '<div class="rp-2col">'
    + '<div class="rp-col45">'
    +   rpSec('기업 기본 정보', color,
          '<table class="rp-ovt" style="border-top-color:'+color+'">'
          + '<tr><th style="color:'+color+'">기업명</th><td colspan="3">'+cData.name+'</td></tr>'
          + '<tr><th style="color:'+color+'">대표자</th><td>'+(cData.rep||'-')+'</td><th style="color:'+color+'">업종</th><td>'+(cData.industry||'-')+'</td></tr>'
          + '<tr><th style="color:'+color+'">설립일</th><td>'+(cData.bizDate||'-')+'</td><th style="color:'+color+'">상시근로자</th><td>'+(cData.empCount||'-')+'명</td></tr>'
          + '<tr><th style="color:'+color+'">사업자번호</th><td>'+(cData.bizNo||'-')+'</td><th style="color:'+color+'">법인번호</th><td>'+(cData.corpNo||'-')+'</td></tr>'
          + '<tr><th style="color:'+color+'">사업장주소</th><td colspan="3">'+(cData.addr||'-')+'</td></tr>'
          + '<tr><th style="color:'+color+'">수출여부</th><td>'+(cData.exportYn||'해당없음')+'</td><th style="color:'+color+'">전년 매출</th><td>'+fKRW(rev.y25)+'</td></tr>'
          + '<tr><th style="color:'+color+'">특허·인증</th><td colspan="3">'+(cData.certs||cData.coreItem||'-')+'</td></tr>'
          + '<tr><th style="color:'+color+'">핵심아이템</th><td colspan="3">'+(cData.coreItem||'-')+'</td></tr>'
          + '</table>'
        )
    +   '<div class="rp-g2" style="margin-top:8px">'
    +     rpMC('업력', cData.bizDate?Math.max(1,Math.round((Date.now()-new Date(cData.bizDate))/31536000000))+'년':'2년', '초기 고성장 단계', color)
    +     rpMC('매출 성장률', '+'+yoy+'%', '전년 대비', '#2563eb')
    +     rpMC('필요 자금', nf, '조달 목표', '#7c3aed')
    +     rpMC('금년 예상', fKRW(exp), '연간 추정', '#ea580c')
    +   '</div>'
    + '</div>'
    + '<div class="rp-colF">'
    +   rpSec('사업개요 및 추진 배경', color, rpLst(overviewItems, color))
    +   '<div class="rp-section" style="background:#f0fdf4;border-color:#bbf7d0;margin-top:8px">'
    +     '<h4 style="color:'+color+'">사업 핵심 한 줄 요약</h4>'
    +     '<div style="font-size:13.5px;line-height:1.75;color:#14532d;font-weight:700">'+(overviewItems[0]||'고성장 기반과 차별화된 제품력을 바탕으로 빠른 확장이 가능한 사업 구조임')+'</div>'
    +   '</div>'
    + '</div>'
    + '</div>'
  );

  // ── P2: 시장기회 분석 (PEST 포함) ──
  var mktLabel = d.s3_mktLabel || (ind+' 시장');
  var mktSize   = d.s3_mktSize  || '7조원';
  var mktGrowth = d.s3_mktGrowth|| '18%';
  var mktTarget = d.s3_mktTarget|| '1~2인 가구';
  var mktOpps   = d.s3_opportunities || [{title:'정책 지원 확대',desc:'정부 스마트공장·중소기업 지원 사업 확대로 보조금 활용 기회 증가'},{title:'온라인 채널 성장',desc:'이커머스 물동량 연 18% 증가 — 소규모 브랜드 진입 장벽 낮아짐'},{title:'인증 취득 레버리지',desc:'벤처·이노비즈 인증 취득 시 정책자금 가점 및 공공 조달 채널 확보'},{title:'해외 시장 진출',desc:'K-브랜드 인지도 상승으로 동남아·북미 수출 기회 구조적 확대'}];
  var pestData = d.s3_pest || {
    p:['중소기업 스마트공장 지원 사업 확대','조달청 우수제품 등록 기업 우선 구매 정책','전자상거래 성장 → 물류 인프라 투자 의무화','인증 기업 정책자금 가점 부여 확대'],
    e:[ind+' 시장 연 '+mktGrowth+' 성장','인건비 상승 → 자동화 ROI 개선','이커머스 물동량 연 18% 증가 — 채널 효율화 필수','중소기업 IT 투자 확대 — 정부 보조금 활용'],
    s:['1~2인 가구 증가 → 간편식 수요 구조적 확대','소비자 프리미엄 선호 급상승 — 고가 제품군 성장','온라인 구매 습관 정착 — 재구매율 높은 구조 형성','탄소 중립 목표 → 효율화로 탄소 감축 요구'],
    t:['AI·IoT 기술 가격 하락 — 중소기업 도입 가능','클라우드 SaaS 확산 — 초기 투자 없이 도입 가능','AI 수요 예측 정확도 향상 — 재고 최적화 실현','모바일 앱 연동 — 스마트폰으로 현장 관리 가능']
  };
  var pestColors = {p:{bg:'#eff6ff',bd:'#93c5fd',c:'#2563eb',label:'P 정치·규제'},e:{bg:'#fff7ed',bd:'#fdba74',c:'#ea580c',label:'E 경제'},s:{bg:'#f0fdf4',bd:'#86efac',c:'#16a34a',label:'S 사회'},t:{bg:'#fdf4ff',bd:'#d8b4fe',c:'#7c3aed',label:'T 기술'}};

  var p2 = rpPageAuto(2,'시장기회 분석 (PEST)','거시환경 분석 · 시장 규모 · 성장성',color,
    '<div class="rp-2col">'
    + '<div class="rp-col50">'
    +   rpSec('PEST 거시환경 분석', color,
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
          + ['p','e','s','t'].map(function(k){
              var pc = pestColors[k];
              return '<div style="background:'+pc.bg+';border:1px solid '+pc.bd+';border-radius:8px;padding:10px 12px">'
                + '<div style="font-size:12px;font-weight:700;color:'+pc.c+';margin-bottom:7px">'+pc.label+'</div>'
                + (pestData[k]||[]).map(function(t){return '<div style="font-size:12px;color:#374151;padding-left:12px;position:relative;line-height:1.55;margin-bottom:5px"><span style="position:absolute;left:0;color:'+pc.c+'">▸</span>'+t+'</div>';}).join('')
                + '</div>';
            }).join('')
          + '</div>'
        )
    + '</div>'
    + '<div class="rp-colF">'
    +   '<div class="rp-g3" style="margin-bottom:10px">'
    +     rpMC(mktLabel, mktSize, '시장 규모', color)
    +     rpMC('연평균 성장률', mktGrowth, ind+' 세그먼트', '#2563eb')
    +     rpMC('당사 타겟', mktTarget, '핵심 소비층', '#7c3aed')
    +   '</div>'
    +   rpSec('3개년 매출 전망', color, '<div class="rp-ch" style="height:130px"><canvas id="bp-market-chart" style="width:100%;height:100%"></canvas></div>')
    +   rpSec('타겟 시장 세분화', color,
          '<table class="rp-ftb"><thead><tr><th style="text-align:left">세그먼트</th><th>규모</th><th>성장률</th><th>당사 집중도</th></tr></thead>'
          + '<tbody>'
          + mktOpps.slice(0,4).map(function(op,i){
              var pri = i<2?'<span style="background:#dcfce7;color:#16a34a;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700">최우선</span>':'<span style="background:#eff6ff;color:#2563eb;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700">2차 공략</span>';
              return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'><td style="font-weight:700">'+op.title+'</td><td style="text-align:center">-</td><td style="text-align:center">+18%</td><td style="text-align:center">'+pri+'</td></tr>';
            }).join('')
          + '</tbody></table>'
        )
    + '</div>'
    + '</div>'
  );

  // ── P3: SWOT 분석 ──
  var p3 = rpPageAuto(3,'SWOT 분석','강점 · 약점 · 기회 · 위협 요인',color,
    '<div class="rp-swot" style="flex:1;margin-bottom:10px">'
    +   '<div class="rp-sws rp-sw"><div class="rp-swl">💪 강점 (Strengths)</div><ul>'+(swot.strength||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +   '<div class="rp-sww rp-sw"><div class="rp-swl">⚠️ 약점 (Weaknesses)</div><ul>'+(swot.weakness||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +   '<div class="rp-swo rp-sw"><div class="rp-swl">🚀 기회 (Opportunities)</div><ul>'+(swot.opportunity||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +   '<div class="rp-swt rp-sw"><div class="rp-swl">🛡️ 위협 (Threats)</div><ul>'+(swot.threat||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    + '</div>'
    + (function(){
        var insights = [
          {label:'핵심 강점 활용 포인트', color:'#16a34a', bg:'#f0fdf4', bd:'#86efac', items:[
            (swot.strength&&swot.strength[0]?swot.strength[0].split('—')[0].trim():'기술 특허 보유')+' → 경쟁사 진입 장벽 구축에 즉시 활용 가능',
            (swot.opportunity&&swot.opportunity[0]?swot.opportunity[0].split('—')[0].trim():'시장 성장세')+' → 현재가 최적의 시장 진입·확장 시점'
          ]},
          {label:'즉시 해결 필요 약점', color:'#ea580c', bg:'#fff7ed', bd:'#fdba74', items:[
            (swot.weakness&&swot.weakness[0]?swot.weakness[0].split('—')[0].trim():'인력 부족')+' → 정책자금 조달 후 핵심 인력 채용 우선 실행',
            (swot.threat&&swot.threat[0]?swot.threat[0].split('—')[0].trim():'경쟁 심화')+' → 인증·특허 강화로 방어 체계 선제 구축'
          ]}
        ];
        return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
          + insights.map(function(ins){
              return '<div style="background:'+ins.bg+';border:1px solid '+ins.bd+';border-left:5px solid '+ins.color+';border-radius:8px;padding:10px 12px">'
                + '<div style="font-size:11px;font-weight:700;color:'+ins.color+';margin-bottom:6px">'+ins.label+'</div>'
                + ins.items.map(function(t){return '<div style="font-size:10.5px;color:#374151;padding-left:12px;position:relative;line-height:1.5;margin-bottom:4px"><span style="position:absolute;left:0;color:'+ins.color+'">•</span>'+t+'</div>';}).join('')
                + '</div>';
            }).join('')
          + '</div>';
      })()
  );

  // ── P4: SWOT 교차 전략 ──
  var cross = d.s2_cross || {so:['SO전략 1: 기술 특허 × 시장 성장 — 독점 포지션 강화로 시장 점유율 확대','SO전략 2: 인증 취득 × 정책 지원 — 공공기관 수의계약 채널 집중 공략','SO전략 3: 매출 실적 × 이커머스 성장 — 풀필먼트 센터 전용 패키지 출시','SO전략 4: 인건비 절감 트렌드 × 2주 설치 강점 — ROI 계산기로 도입 결정 가속'],wo:['WO전략 1: 정책자금 조달 × 영업 인력 부족 — 정책자금으로 영업 인력 2→5명 확충','WO전략 2: 이커머스 풀필먼트 전용 패키지 개발 — 쿠팡·네이버 물류 파트너 채널 진입','WO전략 3: IoT 하드웨어 파트너사 2곳 이상 다변화 — 공급망 리스크 분산 및 원가 절감','WO전략 4: 정부 스마트공장 보조금 연계 영업 — 고객 초기 도입 비용 50% 절감 지원'],st:['ST전략 1: AI 특허 + 실증 데이터로 중소기업 전문 포지셔닝 — 대형 SI 진입 방어','ST전략 2: SaaS 구독 모델 + 고객 유지율 96% — 경기 침체 시에도 안정적 반복 매출','ST전략 3: ISO 27001 취득 추진 — 보안 우려 선제 해소, 공공기관 신뢰도 강화','ST전략 4: 조달청 우수제품 등록 유지 — 유사 스타트업 대비 공공 채널 진입 장벽 구축'],wt:['WT전략 1: 기존 고객 전담 CS 체계 강화 — 유지율 97% 이상 유지로 매출 기반 방어','WT전략 2: 데이터 암호화·접근 권한 관리 고도화 — IoT 보안 취약점 이슈 선제 대응','WT전략 3: 핵심 기능 특허 추가 출원 — 유사 스타트업의 기능 복제 법적 차단','WT전략 4: 파트너사 다변화로 하드웨어 의존도 감소 — 경기 침체 시 원가 구조 유연화']};
  var crossColors = {so:color, wo:'#2563eb', st:'#7c3aed', wt:'#ea580c'};
  var crossBgs    = {so:'#f0fdf4', wo:'#eff6ff', st:'#fdf4ff', wt:'#fff7ed'};
  var crossBds    = {so:'#86efac', wo:'#93c5fd', st:'#d8b4fe', wt:'#fdba74'};
  var crossLabels = {so:'💡 SO 전략 (강점×기회)', wo:'🔧 WO 전략 (약점×기회)', st:'🛡️ ST 전략 (강점×위협)', wt:'⚡ WT 전략 (약점×위협)'};

  var p4 = rpPageAuto(4,'SWOT 교차 전략','SO · WO · ST · WT 실행 전략',color,
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
    + ['so','wo','st','wt'].map(function(k){
        return '<div style="background:'+crossBgs[k]+';border:1px solid '+crossBds[k]+';border-left:5px solid '+crossColors[k]+';border-radius:8px;padding:9px 12px">'
          + '<div style="font-size:11.5px;font-weight:700;color:'+crossColors[k]+';margin-bottom:6px">'+crossLabels[k]+'</div>'
          + (cross[k]||[]).slice(0,3).map(function(t,i){
              return '<div style="font-size:11px;color:#374151;padding-left:16px;position:relative;line-height:1.5;margin-bottom:4px">'
                + '<span style="position:absolute;left:0;color:'+crossColors[k]+';font-weight:700">'+String(i+1)+'.</span>'+t+'</div>';
            }).join('')
          + '</div>';
      }).join('')
    + '</div>'
    +   rpSec('전략 실행 우선순위', color,
          '<table class="rp-ftb"><thead><tr><th style="text-align:left;width:72px;white-space:nowrap">전략</th><th style="width:120px;white-space:nowrap">핵심 방향</th><th style="text-align:left">주요 실행 과제</th><th style="width:80px">우선순위</th><th style="width:70px;white-space:nowrap">실행 시기</th></tr></thead>'
          + '<tbody>'
          + '<tr><td style="font-weight:700;color:'+color+'">SO 전략</td><td style="text-align:center;white-space:nowrap">공공 시장 집중 공략</td><td>'+(cross.so&&cross.so[0]?cross.so[0].replace(/SO전략 [0-9]+: /g,'').split('—')[0].trim():'조달·인증 활용 공공기관 영업 강화')+'</td><td style="text-align:center;color:'+color+';font-weight:700">★★★★★</td><td style="text-align:center">26년 Q1~Q2</td></tr>'
          + '<tr style="background:#f8fafc"><td style="font-weight:700;color:#2563eb">WO 전략</td><td style="text-align:center;white-space:nowrap">인력·채널 확충</td><td>'+(cross.wo&&cross.wo[0]?cross.wo[0].replace(/WO전략 [0-9]+: /g,'').split('—')[0].trim():'정책자금으로 영업 인력 확충 및 채널 진입')+'</td><td style="text-align:center;color:#2563eb;font-weight:700">★★★★☆</td><td style="text-align:center">26년 Q2~Q3</td></tr>'
          + '<tr><td style="font-weight:700;color:#7c3aed">ST 전략</td><td style="text-align:center;white-space:nowrap">기술 포지셔닝 강화</td><td>'+(cross.st&&cross.st[0]?cross.st[0].replace(/ST전략 [0-9]+: /g,'').split('—')[0].trim():'특허·실증 데이터로 전문 포지셔닝 강화')+'</td><td style="text-align:center;color:#7c3aed;font-weight:700">★★★★☆</td><td style="text-align:center">26년 Q3</td></tr>'
          + '<tr style="background:#f8fafc"><td style="font-weight:700;color:#ea580c">WT 전략</td><td style="text-align:center;white-space:nowrap">기존 고객 방어</td><td>'+(cross.wt&&cross.wt[0]?cross.wt[0].replace(/WT전략 [0-9]+: /g,'').split('—')[0].trim():'고객 유지율 97% 이상 유지 및 특허 추가 출원')+'</td><td style="text-align:center;color:#ea580c;font-weight:700">★★★☆☆</td><td style="text-align:center">상시</td></tr>'
          + '</tbody></table>'
        )
  );

  // ── P5: 경쟁환경 및 차별화 전략 ──
  var p5 = rpPageAuto(5,'경쟁환경 분석 및 차별화 전략','경쟁사 비교 · 차별화 포인트',color,
    '<div class="rp-2col">'
    + '<div class="rp-col50">'
    +   rpSec('주요 경쟁사 비교 분석', color,
          '<table class="rp-ctb"><thead><tr><th style="text-align:left">구분</th><th>'+cData.name+'</th><th>경쟁사 A</th><th>경쟁사 B</th></tr></thead>'
          + '<tbody>'+compRows.map(function(r,i){ return '<tr'+(i%2===0?'':' style="background:#f8fafc"')+'><td>'+r.item+'</td><td style="text-align:center">'+r.self+'</td><td style="text-align:center">'+r.a+'</td><td style="text-align:center">'+r.b+'</td></tr>'; }).join('')+'</tbody></table>'
        )
    +   rpSec('핵심 경쟁 우위', color,
          (d.s4_items||[
            '특허 기술 보유로 동일 제품 제조가 불가능하여 직접적인 가격 경쟁에서 원천 차단됨',
            '1회 개별 포장 스펙으로 경쟁사 제품과 직접 비교가 어려운 독자적 카테고리를 형성하고 있음',
            '창업 초기에 검증된 시장 수요를 보유하여 경쟁사 대비 제품 신뢰도와 재구매율이 높음',
            '초기 시장 선점 효과로 충성 고객 확보 속도가 빨라 경쟁사의 후발 진입을 어렵게 만들고 있음'
          ]).map(function(t){
            return '<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:7px"><span style="color:'+color+';font-size:14px;flex-shrink:0;margin-top:1px">✓</span><span style="font-size:11px;color:#374151;line-height:1.55">'+t+'</span></div>';
          }).join('')
        )
    + '</div>'
    + '<div class="rp-colF">'
    +   rpSec('4대 핵심 차별화 전략', color,
          '<div style="display:flex;flex-direction:column;gap:9px">'
          + (Array.isArray(diffs)&&typeof diffs[0]==='object'?diffs:[]).slice(0,4).map(function(it,i){
              var bg=bgMap[it.color]||'#f0fdf4', bd=bdMap[it.color]||'#86efac';
              return '<div style="background:'+bg+';border:1px solid '+bd+';border-left:5px solid '+it.color+';border-radius:8px;padding:10px 13px">'
                + '<div style="font-size:12px;font-weight:700;color:'+it.color+';margin-bottom:4px">'+(i+1)+'. '+it.title+'</div>'
                + '<div style="font-size:11px;color:#374151;line-height:1.55">'+it.text+'</div>'
                + '</div>';
            }).join('')
          + '</div>'
        )
    + '</div>'
    + '</div>'
  );

  // ── P6: 인증·조달 레버리지 전략 (핵심인력 + 마케팅전략 포함) ──
  var teamRows = d.s6_team||[
    {role:'CEO', name:cData.rep||'대표', spec:'경영·전략', career:'업종 전문가, 창업 리더십 보유'},
    {role:'영업이사', name:'영업담당', spec:'B2B 영업', career:'업종 영업 경력 10년 이상'},
    {role:'생산관리', name:'생산담당', spec:'제조·품질', career:'생산 공정 관리 및 품질 인증 담당'},
    {role:'마케팅', name:'마케팅담당', spec:'온라인 마케팅', career:'SNS·이커머스 채널 운영 전문'}
  ];
  var mktPlan = d.s6_mktplan||[
    {period:'금년(26년): 공공 시장 집중 공략', detail:'인증 활용 공공기관 영업 강화 · 전시회 참가 2회 · 신규 고객 15개 목표 · 공공 납품 5개소 · 연매출 목표 달성'},
    {period:'27년: 이커머스 풀필먼트 공략', detail:'이커머스 플랫폼 연동 기능 출시 · 풀필먼트 전용 패키지 개발 · 이노비즈 인증 취득 · 신규 고객 30개 목표'},
    {period:'28년: 제조업 자재창고 확장', detail:'제조업 자재창고 전용 모듈 개발 · 이노비즈 인증 활용 제조 고객 공략 · 고객사 100개 달성 · 총 매출 목표 달성'}
  ];

  var p6 = rpPageAuto(6,'인증·조달 레버리지 전략','가점 확보 · 정책자금 확장 · 핵심 인력',color,
    '<div class="rp-2col">'
    + '<div class="rp-col50">'
    +   rpSec('보유 인증 현황 및 활용 전략', color,
          '<table class="rp-ftb"><thead><tr><th style="text-align:left">인증명</th><th>현황</th><th style="text-align:left">활용 전략</th></tr></thead>'
          + '<tbody>'+bpCerts.map(function(c,i){
              var certPeriod = c.period||c.date||c.status||'';
              var certDone = certPeriod.includes('취득')||certPeriod.includes('완료')||certPeriod.includes('등록')||certPeriod.includes('완');
              var status = certDone?'<span style="background:#dcfce7;color:#16a34a;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700">취득완료</span>':'<span style="background:#fef9c3;color:#854d0e;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700">'+(certPeriod||'진행중')+'</span>';
              return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'><td style="font-weight:700">'+c.name+'</td><td style="text-align:center">'+status+'</td><td>'+c.effect+'</td></tr>';
            }).join('')
          + '</tbody></table>'
        )
    +   rpSec('핵심 인력 구성', color,
          '<table class="rp-ftb"><thead><tr><th>직책</th><th>성명</th><th>전문성</th><th style="text-align:left">주요 이력</th></tr></thead>'
          + '<tbody>'+teamRows.map(function(r,i){
              return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'><td style="font-weight:700;color:'+color+'">'+r.role+'</td><td>'+r.name+'</td><td>'+r.spec+'</td><td>'+r.career+'</td></tr>';
            }).join('')
          + '</tbody></table>'
        )
    + '</div>'
    + '<div class="rp-colF">'
    +   '<div class="rp-section" style="background:#f0fdf4;border-color:#bbf7d0;margin-bottom:10px;text-align:center">'
    +     '<div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:8px">인증 완료 시 총 추가 조달 가능 한도</div>'
    +     '<div style="font-size:32px;font-weight:900;color:'+color+';line-height:1.2">최대 +'+(totalBp>0?totalBp+'억원':'6억5천만원')+'</div>'
    +     '<div style="font-size:13px;color:#64748b;margin-top:6px">현재 신청 한도 + 인증 취득 후 추가 조달 합계 기준</div>'
    +   '</div>'
    +   rpSec('마케팅 및 영업 전략', color,
          '<div style="display:flex;flex-direction:column;gap:8px">'
          + mktPlan.map(function(m,i){
              var mc = [color,'#2563eb','#7c3aed'][i];
              var mbg = ['#f0fdf4','#eff6ff','#fdf4ff'][i];
              return '<div style="background:'+mbg+';border:1px solid #e2e8f0;border-left:4px solid '+mc+';border-radius:7px;padding:9px 12px">'
                + '<div style="font-size:11.5px;font-weight:700;color:'+mc+';margin-bottom:4px">📌 '+m.period+'</div>'
                + '<div style="font-size:10.5px;color:#374151;line-height:1.55">'+m.detail+'</div>'
                + '</div>';
            }).join('')
          + '</div>'
        )
    + '</div>'
    + '</div>'
  );

  // ── P7: 자금 조달 및 사용 계획 ──
  var fundSources = d.s7_sources||[
    {name:'신용보증기금 보증부 대출', desc:'성장 기업 우대 보증 (보증비율 85%)', amount:'2억원', color:'#16a34a'},
    {name:'중소기업진흥공단 정책자금', desc:'소공인 특화 자금 (금리 2.1%, 5년 분할 상환)', amount:'1억5천만원', color:'#2563eb'},
    {name:'기술보증기금 기술평가 보증', desc:'특허 기반 기술 평가 — 보증 한도 확대', amount:'5천만원', color:'#7c3aed'}
  ];
  var fundRepay = d.s7_repay||[
    {src:'신보 보증부 대출', rate:'3.2%', method:'5년 분할 상환', resource:'SaaS 구독 매출 (월 고정 수입)'},
    {src:'중진공 정책자금', rate:'2.1%', method:'5년 분할 상환', resource:'신규 고객 계약 매출'},
    {src:'기보 기술 보증', rate:'3.5%', method:'3년 분할 상환', resource:'공공 납품 매출'}
  ];

  var p7 = rpPageAuto(7,'자금 조달 및 사용 계획','필요 자금 '+nf+' · 집행 구조 · 상환 계획',color,
    // 상단: 자금조달구조 + 배분비율 (2열)
    '<div class="rp-2col" style="margin-bottom:10px">'
    + '<div class="rp-col50">'
    +   rpSec('자금 조달 구조 (총 '+nf+')', color,
          fundSources.map(function(s){
            return '<div style="border:1px solid #e2e8f0;border-left:5px solid '+s.color+';border-radius:8px;padding:9px 12px;margin-bottom:7px;background:white">'
              + '<div style="display:flex;justify-content:space-between;align-items:center">'
              + '<div><div style="font-size:11.5px;font-weight:700;color:#1e293b">'+s.name+'</div><div style="font-size:10.5px;color:#64748b;margin-top:2px">'+s.desc+'</div></div>'
              + '<div style="font-size:18px;font-weight:900;color:'+s.color+'">'+s.amount+'</div>'
              + '</div></div>';
          }).join('')
          + '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 12px;margin-top:4px;display:flex;justify-content:space-between;align-items:center">'
          + '<span style="font-size:12px;font-weight:700;color:#15803d">합계 조달 목표</span>'
          + '<span style="font-size:20px;font-weight:900;color:'+color+'">'+nf+'</span>'
          + '</div>'
        )
    + '</div>'
    + '<div class="rp-colF">'
    +   rpSec('자금 배분 비율', color,
          (fundRows||[]).map(function(r,idx){
            var barColor = [color,'#2563eb','#7c3aed','#ea580c'][idx%4];
            var ratioNum = parseFloat(String(r.ratio||'0').replace(/[^0-9.]/g,'')) || 0;
            return rpHB(r.item, ratioNum, r.ratio, barColor);
          }).join('')
        )
    + '</div>'
    + '</div>'
    // 하단: 자금 집행 계획표 (전체 너비)
    + rpSec('자금 집행 계획표', color,
        '<table class="rp-ftb" style="font-size:12px;width:100%"><thead><tr>'
        + '<th style="text-align:left;width:16%">집행항목</th>'
        + '<th style="width:12%">금액</th>'
        + '<th style="width:8%">비중</th>'
        + '<th style="text-align:left">집행전략</th>'
        + '<th style="width:12%">집행시기</th>'
        + '</tr></thead>'
        + '<tbody>'+fundRows.map(function(r,i){ return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'><td style="font-weight:700">'+r.item+'</td><td style="text-align:center">'+r.amount+'</td><td style="text-align:center;font-weight:700;color:'+color+'">'+r.ratio+'</td><td>'+r.purpose+'</td><td style="text-align:center;font-size:11px">'+(r.timing||'26년 Q2~Q3')+'</td></tr>'; }).join('')
        + '<tr style="background:#f0fdf4"><td style="font-weight:700">합계</td><td style="text-align:center;font-weight:700;color:'+color+'">'+nf+'</td><td style="text-align:center;font-weight:700;color:'+color+'">100%</td><td colspan="2">26년 Q2 ~ 27년 Q1 (약 12개월 집행)</td></tr>'
        + '</tbody></table>'
      )
  );

  // ── P8: 매출 전망 및 실행 로드맵 ──
  var curYr = new Date().getFullYear();
  // 매출 데이터 (억 단위 숫자로 변환)
  function parseOk(v) {
    if (!v) return 0;
    var s = String(v).replace(/[,\s]/g,'');
    var m = s.match(/([\d.]+)\s*억/);
    if (m) return parseFloat(m[1]);
    m = s.match(/([\d.]+)\s*천만/);
    if (m) return parseFloat(m[1]) * 0.1;
    m = s.match(/([\d.]+)\s*만/);
    if (m) return parseFloat(m[1]) * 0.0001;
    return parseFloat(s) || 0;
  }
  var y1v = parseOk(kpi9.y1) || 18;
  var y2v = parseOk(kpi9.y2) || 24;
  var y3v = parseOk(d.s8_y3) || 35;
  // YoY 계산
  var prevSales = rev && rev.cur ? rev.cur / 100000000 : (rev && rev.y25 ? rev.y25 / 100000000 : 0);
  var yoy1 = prevSales > 0 ? Math.round((y1v / prevSales - 1) * 100) : null;
  var yoy2 = y1v > 0 ? Math.round((y2v / y1v - 1) * 100) : null;
  var yoy3 = y2v > 0 ? Math.round((y3v / y2v - 1) * 100) : null;
  var yoy1txt = yoy1 !== null ? 'YoY +' + yoy1 + '%' : 'YoY 성장 목표';
  var yoy2txt = yoy2 !== null ? 'YoY +' + yoy2 + '%' : 'YoY 성장 목표';
  var yoy3txt = yoy3 !== null ? 'YoY +' + yoy3 + '%' : 'YoY 성장 목표';
  // 서브텍스트 (s8_sub 또는 기본값)
  var sub1 = (d.s8_sub && d.s8_sub[0]) || (yoy1txt + ' | BEP 달성 목표');
  var sub2 = (d.s8_sub && d.s8_sub[1]) || (yoy2txt + ' | BEP 달성');
  var sub3 = (d.s8_sub && d.s8_sub[2]) || (yoy3txt + ' | 도약 목표');
  // 로드맵 데이터
  var rmData = [
    {year: String(curYr)+'년', stage: '금년', yc: color, ybg: color,
     c1lbl: 'Q1-Q2', c1title: '인력 확충', c1body: (d.s8_short&&d.s8_short[0])||'정책자금 조달 완료. 핵심 인력 채용 착수. 생산 설비 확충 계획 수립.',
     c2lbl: 'Q3', c2title: '제품 출시', c2body: (d.s8_short&&d.s8_short[1])||'신규 제품 라인 출시. 온라인 채널 입점 완료. 초도 물량 생산 가동.',
     c3lbl: '연간 목표', c3title: kpi9.y1, c3body: yoy1txt + (d.s8_short&&d.s8_short[2] ? ' | ' + d.s8_short[2] : ' | 채널 공략 완료'), dark: true},
    {year: String(curYr+1)+'년', stage: '성장기', yc: '#2563eb', ybg: '#2563eb',
     c1lbl: 'Q1-Q2', c1title: '채널 확대', c1body: (d.s8_mid&&d.s8_mid[0])||'이커머스 풀필먼트 전용 패키지 출시. 신규 유통 채널 3개 확보.',
     c2lbl: 'Q3-Q4', c2title: '채널 다각화', c2body: (d.s8_mid&&d.s8_mid[1])||'인증 취득 완료. 물류 파트너십 체결. 고객사 확대 및 연매출 달성.',
     c3lbl: '연간 목표', c3title: kpi9.y2, c3body: yoy2txt + (d.s8_mid&&d.s8_mid[2] ? ' | ' + d.s8_mid[2] : ' | BEP 달성'), dark: true},
    {year: String(curYr+2)+'년', stage: '도약기', yc: '#7c3aed', ybg: '#7c3aed',
     c1lbl: '상반기', c1title: '제조업 확장', c1body: (d.s8_long&&d.s8_long[0])||'글로벌 시장 진출 준비. 해외 법인 설립 및 현지 생산 거점 확보.',
     c2lbl: '하반기', c2title: '자동화 완성', c2body: (d.s8_long&&d.s8_long[1])||'자동화 생산 체계 완성. 원가율 최적화. 신성장 동력 확보.',
     c3lbl: '연간 목표', c3title: (d.s8_y3||'35억원'), c3body: yoy3txt + (d.s8_long&&d.s8_long[2] ? ' | ' + d.s8_long[2] : ' | 도약 달성'), dark: true}
  ];

  var p8 = rpPageAuto(8,'매출 전망 및 실행 로드맵','3개년 매출 전망 · 분기별 실행 계획',color,
    // ── 3개년 매출 전망 섹션 ──
    rpSec('3개년 매출 전망 (금년 '+String(curYr).slice(-2)+'년 → '+String(curYr+1).slice(-2)+'년 → '+String(curYr+2).slice(-2)+'년)', color,
      // 꺾은선 차트
      '<div style="height:180px;margin-bottom:12px"><canvas id="bp-sales-forecast" data-y1="'+y1v+'" data-y2="'+y2v+'" data-y3="'+y3v+'" data-yr="'+curYr+'" style="width:100%;height:100%"></canvas></div>'
      // KPI 카드 3개 가로 배치
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">'
      + '<div style="padding:14px 18px;border-right:1px solid #e2e8f0;text-align:center">'
      +   '<div style="font-size:11.5px;color:#64748b;margin-bottom:4px">금년('+String(curYr).slice(-2)+'년)</div>'
      +   '<div style="font-size:26px;font-weight:900;color:#1e293b;line-height:1.1">'+kpi9.y1+'</div>'
      +   '<div style="font-size:10.5px;color:#e11d48;font-weight:600;margin-top:4px">'+sub1+'</div>'
      + '</div>'
      + '<div style="padding:14px 18px;border-right:1px solid #e2e8f0;text-align:center">'
      +   '<div style="font-size:11.5px;color:#64748b;margin-bottom:4px">'+String(curYr+1).slice(-2)+'년</div>'
      +   '<div style="font-size:26px;font-weight:900;color:#1e293b;line-height:1.1">'+kpi9.y2+'</div>'
      +   '<div style="font-size:10.5px;color:#e11d48;font-weight:600;margin-top:4px">'+sub2+'</div>'
      + '</div>'
      + '<div style="padding:14px 18px;background:#1e2d4a;text-align:center">'
      +   '<div style="font-size:11.5px;color:#94a3b8;margin-bottom:4px">'+String(curYr+2).slice(-2)+'년</div>'
      +   '<div style="font-size:26px;font-weight:900;color:white;line-height:1.1">'+(d.s8_y3||'35억')+'</div>'
      +   '<div style="font-size:10.5px;color:#93c5fd;font-weight:600;margin-top:4px">'+sub3+'</div>'
      + '</div>'
      + '</div>'
    )
    // ── 실행 로드맵 섹션 ──
    + rpSec('실행 로드맵 (금년 '+String(curYr)+'년 → '+String(curYr+2)+'년)', color,
      '<div style="display:flex;flex-direction:column;gap:10px">'
      + rmData.map(function(yr){
          return '<div style="display:grid;grid-template-columns:80px 1fr 1fr 1fr;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">'
            // 연도 셀
            + '<div style="background:'+yr.ybg+';color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 6px;text-align:center">'
            +   '<div style="font-size:14px;font-weight:900;line-height:1.2">'+yr.year+'</div>'
            +   '<div style="font-size:10px;opacity:0.85;margin-top:3px">'+yr.stage+'</div>'
            + '</div>'
            // Q1-Q2 셀
            + '<div style="padding:10px 12px;border-left:1px solid #e2e8f0;background:white">'
            +   '<div style="font-size:10px;font-weight:700;color:'+yr.yc+';margin-bottom:4px">'+yr.c1lbl+'</div>'
            +   '<div style="font-size:11.5px;font-weight:700;color:#1e293b;margin-bottom:4px">'+yr.c1title+'</div>'
            +   '<div style="font-size:10px;color:#64748b;line-height:1.5">'+yr.c1body+'</div>'
            + '</div>'
            // Q3 셀
            + '<div style="padding:10px 12px;border-left:1px solid #e2e8f0;background:white">'
            +   '<div style="font-size:10px;font-weight:700;color:'+yr.yc+';margin-bottom:4px">'+yr.c2lbl+'</div>'
            +   '<div style="font-size:11.5px;font-weight:700;color:#1e293b;margin-bottom:4px">'+yr.c2title+'</div>'
            +   '<div style="font-size:10px;color:#64748b;line-height:1.5">'+yr.c2body+'</div>'
            + '</div>'
            // 연간 목표 셀 (어두운 배경)
            + '<div style="padding:10px 12px;border-left:1px solid #e2e8f0;background:#1e2d4a">'
            +   '<div style="font-size:10px;font-weight:700;color:#93c5fd;margin-bottom:4px">'+yr.c3lbl+'</div>'
            +   '<div style="font-size:13px;font-weight:900;color:white;margin-bottom:4px">'+yr.c3title+'</div>'
            +   '<div style="font-size:10px;color:#94a3b8;line-height:1.5">'+yr.c3body+'</div>'
            + '</div>'
            + '</div>';
        }).join('')
      + '</div>'
    )
  );

    // ── P9: 종합 제언 ──
  var kpiRows = d.s9_kpiRows||[
    {item:'사업 안정성', basis:'매출 성장 + 특허 보유 + 시장 검증 완료', eval:'★★★★★', note:'심사 우수 예상'},
    {item:'기술 차별화', basis:'핵심 특허 보유 + 실증 데이터 확보', eval:'★★★★☆', note:'추가 특허 출원 계획'},
    {item:'시장 성장성', basis:mktLabel+' CAGR '+mktGrowth+' 성장', eval:'★★★★☆', note:'규제 드리븐 성장'},
    {item:'재무 건전성', basis:'YoY +'+yoy+'% 성장, 상환 가능 현금 흐름 확보', eval:'★★★★☆', note:String(curYr+1)+'년 BEP 달성 계획'},
    {item:'상환 가능성', basis:'월정 수입 기반 원리금 상환 — 현금 흐름 예측 가능', eval:'★★★★★', note:'보수적 시나리오에서도 상환 가능'}
  ];

  // P9a: 종합 제언 카드 3개
  var p9a = rpPageAuto(9,'종합 제언','최종 평가 · 투자 타당성 · 실행 권고',color,
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:0">'
    + [
        {icon:'🏆', title:'안정적 수익 구조', desc:conclusion.split('.')[0]||cData.name+'의 매출 성장과 반복 구매 기반이 안정적 수익 구조를 형성하고 있음', c:color},
        {icon:'📋', title:'구체적 실행 계획', desc:'인력 채용·제품 개발·인증 취득·영업 확대의 단계별 실행 계획이 명확하며 투자 자금 집행 목적과 기대 효과가 구체적으로 제시됨', c:'#2563eb'},
        {icon:'📈', title:'성장 잠재력', desc:mktLabel+' CAGR '+mktGrowth+' 고성장. '+String(curYr+2)+'년 매출 목표 달성 시 기업가치 상승 및 추가 투자 유치 가능성이 높음', c:'#7c3aed'}
      ].map(function(card){
        return '<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:20px 22px">'
          + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">'
          +   '<span style="font-size:30px;flex-shrink:0">'+card.icon+'</span>'
          +   '<span style="font-size:14px;font-weight:700;color:'+card.c+'">'+card.title+'</span>'
          + '</div>'
          + '<div style="font-size:12px;color:#374151;line-height:1.75">'+card.desc+'</div>'
          + '</div>';
      }).join('')
    + '</div>'
  );

  // P9b: 투자 타당성 요약 표 (별도 페이지 - 헤더 없음)
  var p9b = '<div class="rp-page-auto"><div class="rp-body">'
    + rpSec('투자 타당성 요약', color,
        '<table class="rp-ftb"><thead><tr>'
        + '<th style="text-align:left;width:120px">평가 항목</th>'
        + '<th style="text-align:left">근거 및 현황</th>'
        + '<th style="width:90px">평가</th>'
        + '<th style="text-align:left;width:150px">비고</th>'
        + '</tr></thead>'
        + '<tbody>'+kpiRows.map(function(r,i){
            return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'>'              + '<td style="font-weight:700">'+r.item+'</td>'              + '<td>'+r.basis+'</td>'              + '<td style="text-align:center;font-size:12px">'+r.eval+'</td>'              + '<td style="font-size:10.5px;color:#64748b">'+r.note+'</td>'              + '</tr>';
          }).join('')
        + '</tbody></table>'
      )
    + '<div style="background:#f0fdf4;border:2px solid '+color+';border-radius:10px;padding:16px 20px;margin-top:14px;display:flex;justify-content:space-between;align-items:center">'
    +   '<div>'
    +     '<div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:6px">투자 요청 금액 및 활용 목적</div>'
    +     '<div style="font-size:12px;color:#374151;line-height:1.7">'+fundRows.map(function(r){return r.item+'('+r.ratio+')';}).join(' + ')+'<br>→ '+String(curYr+2)+'년 매출 목표 달성, 대출 전액 상환 완료, 기업가치 상승 목표</div>'
    +   '</div>'
    +   '<div style="text-align:right">'
    +     '<div style="font-size:11px;color:#64748b;margin-bottom:4px">투자 요청</div>'
    +     '<div style="font-size:36px;font-weight:900;color:'+color+'">'+nf+'</div>'
    +   '</div>'
    + '</div>'
    + '</div></div>';


  var p9 = p9a + p9b;

    // 사업계획서 전용 CSS: 내지 헤더를 네이비 바 스타일로 오버라이드
  var bizPlanExtraCSS = '<style>'
    + '.rp-ph { background:#1e2d4a !important; border-radius:6px !important; padding:10px 14px !important; margin-bottom:14px !important; border-bottom:none !important; }'
    + '.rp-pnum { background:#c0392b !important; color:white !important; border-radius:4px !important; width:26px !important; height:26px !important; font-size:12px !important; }'
    + '.rp-ptitle { color:white !important; font-size:14px !important; font-weight:700 !important; }'
    + '.rp-psub { color:rgba(255,255,255,0.65) !important; font-size:11px !important; }'
    + '.rp-section h4 { color:#1e2d4a !important; border-left:3px solid #c0392b; padding-left:8px; }'
    + '.rp-page-auto { overflow:visible !important; height:auto !important; min-height:auto !important; max-height:none !important; }'
    + '</style>';
  return tplStyle(color, 'landscape') + bizPlanExtraCSS + '<div class="rp-wrap">' + cover + p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 + '</div>';
}

// ===========================
// ★ 차트 초기화 함수
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
      try { var ld=li.dataset; new Chart(li.getContext('2d'),{type:'line',data:{labels:['2023년','2024년','2025년','금년(예)'],datasets:[{data:[+ld.y23||0,+ld.y24||0,+ld.y25||0,+ld.exp||0],borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.12)',borderWidth:3,pointRadius:6,pointHoverRadius:8,fill:true,tension:0.3}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:11},callback:function(v){var e=Math.floor(v/100000000),r=v%100000000,c=Math.floor(r/10000000),m=Math.floor((r%10000000)/10000);if(e>0)return e+(c>0?c+'천만':'')+'억';if(c>0)return c+'천만';if(m>0)return m+'만';return v>0?v.toLocaleString()+'원':'0';}}}}}}); } catch(e){console.error('라인 오류:',e);}
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
        var gd = fg.dataset || {};        var growthData = [+(gd.y1||0), +(gd.y2||0), +(gd.y3||0)];
        if (!growthData[0] && !growthData[1] && !growthData[2]) growthData = [140000,240000,350000];
        var gRange=Math.max(growthData[2]-growthData[0], growthData[0]*0.5, 50000);
        var gMid1=Math.round(growthData[0]+gRange*0.30);
        var gMid2=Math.round(growthData[0]+gRange*0.60);
        var gMid3=Math.round(growthData[1]+gRange*0.18);
        var expandedData=[growthData[0], gMid1, gMid2, growthData[1], gMid3, growthData[2]];
        new Chart(fg.getContext('2d'),{type:'line',data:{labels:['26.1Q','26.2Q','26.3Q','27.1Q','27.3Q','28'],datasets:[{data:expandedData,borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,0.15)',borderWidth:3,pointRadius:[6,4,4,6,4,6],pointHoverRadius:8,fill:true,tension:0.4,cubicInterpolationMode:'monotone'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:11},callback:function(v){var e=Math.floor(v/100000000),r=v%100000000,c=Math.floor(r/10000000),m=Math.floor((r%10000000)/10000);if(e>0)return e+(c>0?c+'천만':'')+'억';if(c>0)return c+'천만';if(m>0)return m+'만';return v>0?v.toLocaleString()+'원':'0';}}}}}});;
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
    // ─ 시장 성장 라인 (사업계획서 P2)
    var bm = document.getElementById('bp-market-chart');
    if(bm) { safeDestroyChart(bm); try { new Chart(bm.getContext('2d'),{type:'line',data:{labels:['2016','2017','2018','2019','2020','2021','2022'],datasets:[{data:[2,2.4,3,3.8,4.5,5.8,7],borderColor:'#1e2d4a',backgroundColor:'rgba(30,45,74,0.12)',borderWidth:3,pointRadius:5,fill:true,tension:0.35}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{font:{size:11},callback:function(v){return v+'조';}}}}}}); } catch(e){} }
    // ─ P8 3개년 매출 전망 꺾은선 차트
    var bsf = document.getElementById('bp-sales-forecast');
    if(bsf) {
      safeDestroyChart(bsf);
      try {
        var bsd = bsf.dataset;
        var y1n = parseFloat(bsd.y1)||18, y2n = parseFloat(bsd.y2)||24, y3n = parseFloat(bsd.y3)||35;
        var yrN = parseInt(bsd.yr)||new Date().getFullYear();
        var lbls = ['금년('+String(yrN).slice(-2)+'년)', String(yrN+1).slice(-2)+'년', String(yrN+2).slice(-2)+'년'];
        var yoy2p = y1n>0?Math.round((y2n/y1n-1)*100):null;
        var yoy3p = y2n>0?Math.round((y3n/y2n-1)*100):null;
        new Chart(bsf.getContext('2d'),{
          type:'line',
          data:{
            labels: lbls,
            datasets:[{
              data:[y1n,y2n,y3n],
              borderColor:'#1e2d4a',
              backgroundColor:'rgba(30,45,74,0.10)',
              borderWidth:3,
              pointRadius:8,
              pointHoverRadius:10,
              pointBackgroundColor:'white',
              pointBorderColor:'#1e2d4a',
              pointBorderWidth:3,
              fill:true,
              tension:0.35
            }]
          },
          options:{
            maintainAspectRatio:false,
            plugins:{legend:{display:false}},
            scales:{
              y:{ticks:{font:{size:11},callback:function(v){return v+'억';}},grid:{color:'rgba(148,163,184,0.15)'}},
              x:{ticks:{font:{size:12,weight:'bold'}},grid:{display:false}}
            }
          },
          plugins:[{
            afterDatasetsDraw: function(chart){
              var ctx2 = chart.ctx;
              var meta = chart.getDatasetMeta(0);
              var vals = [y1n, y2n, y3n];
              var yoys = [null, yoy2p, yoy3p];
              meta.data.forEach(function(pt, i){
                ctx2.save();
                ctx2.font = 'bold 13px sans-serif';
                ctx2.fillStyle = '#1e2d4a';
                ctx2.textAlign = 'center';
                ctx2.fillText(vals[i]+'억', pt.x, pt.y - 16);
                if (yoys[i] !== null) {
                  ctx2.font = '11px sans-serif';
                  ctx2.fillStyle = '#16a34a';
                  ctx2.fillText('+'+yoys[i]+'% ↑', pt.x + 32, pt.y - 4);
                }
                ctx2.restore();
              });
            }
          }]
        });
      } catch(e){ console.error('bp-sales-forecast 오류:',e); }
    }
    // ─ 월별 매출 바
    var bc = document.getElementById('biz-monthly-chart');
    if(bc) {
      safeDestroyChart(bc);
      try {
        var curM=new Date().getMonth(), sr=rev||{};
        var avgM=sr.cur&&curM>0?Math.round(sr.cur/curM):sr.y25?Math.round(sr.y25/12):3000;
        var ac=[],fc=[];
        for(var i=0;i<12;i++){if(i<curM){ac.push(Math.round(avgM*(0.9+i*0.02)));fc.push(null);}else{ac.push(null);fc.push(Math.round(avgM*Math.pow(1.06,i-curM+1)));}
        }
        new Chart(bc.getContext('2d'),{type:'bar',data:{labels:['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],datasets:[{label:'실적',data:ac,backgroundColor:'rgba(22,163,74,0.75)',borderColor:'#16a34a',borderWidth:1,borderRadius:5},{label:'예측',data:fc,backgroundColor:'rgba(59,130,246,0.55)',borderColor:'#3b82f6',borderWidth:1,borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{font:{size:11}}}},scales:{y:{ticks:{font:{size:11},callback:function(v){var e=Math.floor(v/100000000),r=v%100000000,c=Math.floor(r/10000000),m=Math.floor((r%10000000)/10000);if(e>0)return e+(c>0?c+'천만':'')+'억';if(c>0)return c+'천만';if(m>0)return m+'만';return v>0?v.toLocaleString()+'원':'0';}}}}}}); } catch(e){}
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
    +'클라이언트용(긍정적 톤)과 컨설턴트 내부용(리스크 솔직 기술) 데이터를 하나의 JSON에 모두 담아줘.\n\n'
    +'【필수 규칙】\n'
    +'- 기업명 \''+nm+'\', 핵심아이템 \''+itm+'\', 실제 수치('+r25+', '+rExp+') 를 각 항목에 반드시 자연스럽게 포함\n'
    +'- 모든 텍스트 항목은 반드시 60자 이상, 구체적이고 실질적인 내용으로 작성\n'
    +'- JSON만 출력 (마크다운·설명 텍스트 없이)\n\n'
    +'JSON 구조:\n'
    +'{'
    +'"grade":"A- 등 등급",'
    +'"grade_desc":"고성장 유망기업 등 8자이내",'

    // ── 공통 데이터 (클라이언트용·컨설턴트용 모두 사용) ──
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
    +'"certs":' + JSON.stringify(getIndustryCerts(ind, nm, itm, cData).certs) + ','
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
  var nm=cData.name, ind=cData.industry||'제조업', itm=cData.coreItem||'';
  var r25=fRev.매출_2025년||'0원', rExp=fRev.금년예상연간매출||'0원';
  var nf=cData.needFund>0?fKRW(cData.needFund):'4억원';
  var indData = getIndustryCerts(ind, nm, itm, cData);
  var indFunds = indData.funds;
  var top1 = indFunds[0]||{};
  // 기존 대출 기관 조건 판단
  var _dKibo   = parseInt(cData.debtKibo)   || 0;
  var _dShinbo = parseInt(cData.debtShinbo) || 0;
  var _dJjg    = parseInt(cData.debtJjg)    || 0;
  var loanNote = '';
  if (_dKibo > 0 && _dShinbo === 0)      loanNote = '기보 기존 대출 있음 → 기보 위주 추천, 신보 중복 제외';
  else if (_dShinbo > 0 && _dKibo === 0) loanNote = '신보 기존 대출 있음 → 신보 위주 추천, 기보 중복 제외';
  else if (_dKibo > 0 && _dShinbo > 0)  loanNote = '기보·신보 모두 대출 있음 → 잔액 큰 기관 위주 추천';
  else                                   loanNote = '기보·신보 기존 대출 없음 → 업종 기준 최적 기관 추천';
  // 2026년 기관별 심사기준 정보 구성
  var _kcbS  = parseInt(cData.kcbScore)  || 0;
  var _niceS = parseInt(cData.niceScore) || 0;
  var _cs    = _kcbS || _niceS || 0;
  var _finO  = cData.finOver || '없음';
  var _taxO  = cData.taxOver || '없음';
  var _bizYrs = (function(){
    if (!cData.bizDate || cData.bizDate === '-') return 0;
    var bd = new Date(cData.bizDate);
    if (isNaN(bd.getTime())) return 0;
    return Math.max(0, Math.floor((Date.now() - bd.getTime()) / (365.25 * 24 * 3600 * 1000)));
  })();
  var creditNote = _cs > 0
    ? '\n[신용점수] '+(_kcbS?'KCB '+_kcbS+'점 ':'')+(_niceS?'NICE '+_niceS+'점 ':'')
      + (_cs>=750?'(중진공 권장 충족)':_cs>=700?'(중진공 권장 미충족 — NICE 750점 이상 권장)':_cs>=600?'(저신용 — 기보 제외, 신보 조건부)':'(신용취약 — 기보·신보·중진공 제외)')
    : '';
  var overdueNote = (_finO==='있음'||_taxO==='있음')
    ? '\n[연체/체납] 금융연체:'+_finO+', 세금체납:'+_taxO+' — 완납 후 1개월 경과 후 재신청 권장'
    : '';
  var bizYrsNote = _bizYrs > 0 ? '\n[업력] 창업일 기준 '+_bizYrs+'년 경과'+(_bizYrs<=3?' (소진공 성장촉진자금 조건 충족)':_bizYrs<=7?' (중진공 혁신창업 조건 충족)':' (중진공 신성장기반자금 대상)') : '';
  // checks 동적 생성
  var _checksArr = [
    {text:'중소기업 해당 여부',status:'pass'},
    {text:'국세·지방세 체납 없음',status:(_taxO==='있음'?'fail':'pass')},
    {text:'금융 연체 이력 없음',status:(_finO==='있음'?'fail':'pass')},
    {text:'사업자 등록 유효',status:'pass'},
    {text:'업력 조건 충족'+(_bizYrs>0?' ('+_bizYrs+'년)':''),status:(_bizYrs===0?'cond':_bizYrs>=2?'pass':'cond')},
    {text:'신용점수'+(_cs>0?' ('+_cs+'점)':''),status:(_cs===0?'cond':_cs>=700?'pass':_cs>=600?'cond':'fail')},
    {text:'벤처·이노비즈 인증',status:'fail'}
  ];
  var _scoreVal = _cs > 0 ? Math.min(95, Math.max(40, Math.round(_cs/10-5))) : 78;
  var compOrg = (top1.name||'중진공').split('(')[0].trim()
    .replace('농림수산업자신용보증기금','농신보')
    .replace('한국무역보험공사','K-SURE')
    .replace('한국환경산업기술원/에너지공단','환경/에너지공단')
    .replace('국민체육진흥공단','KSPO')
    .replace('관광진흥개발기금','관광기금');
  return '정책자금 전문 컨설턴트. \''+nm+'\' 정책자금 매칭. 기업명 반드시 반영. JSON만.\n\n'
    +'{"checks":'+JSON.stringify(_checksArr)+','
    +'"score":'+_scoreVal+',"score_desc":"'+nm+' 2026년 정책자금 심사기준 분석","match_count":5,'
    +'"score_items":["'+nm+'는 2026년 정책자금 심사기준 기반 분석 결과 60자이상"],'
    +'"funds":'+JSON.stringify(indFunds)+','
    +'"comparison":[{"org":"'+compOrg+'","limit":"'+(top1.limit||'1억')+'","rate":"'+(top1.tags&&top1.tags[0]||'우대금리')+'","period":"5년","diff":"easy"},{"org":"기보","limit":"3억","rate":"0.5%","period":"7년","diff":"mid"},{"org":"소진공","limit":"1억","rate":"3.0%","period":"5년","diff":"easy"},{"org":"지역신보","limit":"5천만","rate":"0.8%","period":"3년","diff":"easy"}],'
    +'"checklist_ready":["사업자등록증 사본","부가세 신고서 2년","국세납부증명서","신용정보 동의서"],'
    +'"checklist_need":["사업계획서 (기보 필수)","벤처인증서 (취득 후)"],'
    +'"rejection_checklist":["세금 체납 절대 불가 (국세·지방세·4대보험료 완납 후 1개월 경과 권장)","가지급금 정리 (대표자 회사돈 차용 가지급금 감점 최대 요인)","자본잠식 해결 (증자 또는 이익잉여금 확보로 자본총계 유지)","최근 3개월 연체 기록 없어야 함 (단 하루라도 3개월 이내 연체 시 심사 불리)","사업장·주거지 압류 없어야 함 (대표자 개인 소유 부동산 가압류·압류 시 100% 부결)"]}'
    +'\n\n[기업] 기업명:'+nm+', 업종:'+ind+', 필요자금:'+nf+', 전년매출:'+r25+', 금년예상:'+rExp+', [대출조건] '+loanNote+creditNote+overdueNote+bizYrsNote
    +'\n[2026년 기관별 심사기준] 중진공: NICE 750점 이상 권장, 운전자금 매출 1/3~1/4, 시설자금 견적서 80~100% | 기보: 기술력 우선(연체/체납 시 즉시 부결), B등급 이상, 자본잠식 없어야 함 | 신보: KCB/NICE 800점 이상 선호, 매출 1/4~1/6 한도 | 소진공: 839점 이하 저신용 전용자금 별도 배정, 다중송무자 제한';
}

function buildFinancePrompt(cData, fRev) {
  var nm  = cData.name, ind = cData.industry||'제조업';
  var r25 = fRev.매출_2025년||'0원', rExp = fRev.금년예상연간매출||'0원';
  // 재무제표 입력 데이터 (fsData에 저장된 값 우선, 없으면 기존 revenueData 활용)
  var fs  = cData.fsData || {};
  // revenueData는 원 단위로 저장됨 (만원 곱하기 제거)
  var revY24   = parseInt(fs.rev_y24)    || parseInt((cData.revenueData||{}).y24||0) || 0;
  var revY23   = parseInt(fs.rev_y23)    || parseInt((cData.revenueData||{}).y23||0) || 0;
  // 업체 등록 부채 현황 (정책자금 부채 합계)
  var dKibo   = parseInt(cData.debtKibo)   || 0;
  var dShinbo = parseInt(cData.debtShinbo) || 0;
  var dJjg    = parseInt(cData.debtJjg)    || 0;
  var dSjg    = parseInt(cData.debtSjg)    || 0;
  var dJaidan = parseInt(cData.debtJaidan) || 0;
  var dCorpCol= parseInt(cData.debtCorpCollateral) || 0;
  var dRepCr  = parseInt(cData.debtRepCredit) || 0;
  var dRepCol = parseInt(cData.debtRepCollateral) || 0;
  var totalRegisteredDebt = dKibo + dShinbo + dJjg + dSjg + dJaidan + dCorpCol + dRepCr + dRepCol;
  var opY24    = parseInt(fs.op_y24)     || 0;
  var netY24   = parseInt(fs.net_y24)    || 0;
  var intY24   = parseInt(fs.int_y24)    || 0;
  var cogsY24  = parseInt(fs.cogs_y24)   || 0;
  var sgaY24   = parseInt(fs.sga_y24)    || 0;
  var curAsset = parseInt(fs.cur_asset)  || 0;
  var fixAsset = parseInt(fs.fix_asset)  || 0;
  var totAsset = parseInt(fs.total_asset)|| (curAsset + fixAsset) || 0;
  var curLiab  = parseInt(fs.cur_liab)   || 0;
  var fixLiab  = parseInt(fs.fix_liab)   || 0;
  // 부채총계: 재무상태표 입력값 우선, 없으면 업체 등록 부채 합계로 fallback
  var totLiab  = parseInt(fs.total_liab) || (curLiab + fixLiab) || totalRegisteredDebt || 0;
  var cap      = parseInt(fs.cap)        || 0;
  var totEquity= parseInt(fs.total_equity)|| (totAsset - totLiab) || 0;
  // 재무비율 계산
  var opMargin  = revY24 > 0 ? Math.round((opY24  / revY24) * 1000) / 10 : 0;
  var netMargin = revY24 > 0 ? Math.round((netY24 / revY24) * 1000) / 10 : 0;
  var grossMargin = (revY24 > 0 && cogsY24 > 0) ? Math.round(((revY24-cogsY24)/revY24)*1000)/10 : 0;
  var debtRatio = totEquity > 0 ? Math.round((totLiab / totEquity) * 1000) / 10 : 0;
  var curRatio  = curLiab  > 0 ? Math.round((curAsset / curLiab) * 1000) / 10 : 0;
  var equityRatio = totAsset > 0 ? Math.round((totEquity / totAsset) * 1000) / 10 : 0;
  var icr       = intY24   > 0 ? Math.round((opY24 / intY24) * 10) / 10 : 0;
  var assetTurn = totAsset > 0 ? Math.round((revY24 / totAsset) * 100) / 100 : 0;
  var revGrowth = revY23   > 0 ? Math.round(((revY24-revY23)/revY23)*1000)/10 : 0;
  var opGrowth  = 0; // 전전년 영업이익 미입력 시 0
  return '재무제표 분석 전문가. \''+nm+'\' 기업 재무제표 분석 리포트. 기업명 반드시 반영. JSON만.\n\n'
    +'{"scores":{"profit":'+Math.min(100,Math.max(0,Math.round(50+(opMargin-5)*2)))+',"stable":'+Math.min(100,Math.max(0,Math.round(80-(debtRatio-100)*0.1)))+',"growth":'+Math.min(100,Math.max(0,Math.round(50+revGrowth*1.5)))+'},'
    +'"score_descs":{"profit":"영업이익률 '+opMargin+'%","stable":"부채비율 '+debtRatio+'%","growth":"매출성장률 '+revGrowth+'%"},'
    +'"profit_bars":[{"label":"매출 성장률(YoY)","value":'+Math.min(100,Math.max(0,50+revGrowth))+',"display":"'+revGrowth+'%"},{"label":"매출총이익률","value":'+Math.min(100,grossMargin)+',"display":"'+grossMargin+'%"},{"label":"영업이익률","value":'+Math.min(100,Math.max(0,opMargin*2))+',"display":"'+opMargin+'%"},{"label":"이자보상배율","value":'+Math.min(100,icr*10)+',"display":"'+icr+'배"}],'
    +'"stable_metrics":[{"label":"부채비율","value":"'+debtRatio+'%","desc":"'+(debtRatio<200?"양호":"주의 필요")+'"},{"label":"유동비율","value":"'+curRatio+'%","desc":"'+(curRatio>100?"안전":"개선 필요")+'"},{"label":"자기자본비율","value":"'+equityRatio+'%","desc":"'+(equityRatio>30?"건전":"점검 필요")+'"},{"label":"이자보상배율","value":"'+icr+'배","desc":"'+(icr>1.5?"안전":"위험")+'"}],'
    +'"debt":[{"name":"유동부채","ratio":'+Math.round(curLiab/(totLiab||1)*100)+'},{"name":"비유동부채","ratio":'+Math.round(fixLiab/(totLiab||1)*100)+'}],'
    +'"growth_targets":['+revY24+','+Math.round(revY24*1.3)+','+Math.round(revY24*1.65)+'],'
    +'"growth_items":["'+nm+'의 전년 매출은 '+fKRW(revY24)+'으로 전년 대비 '+revGrowth+'% 성장하였으며, 영업이익률 '+opMargin+'%를 기록함","부채비율 '+debtRatio+'%로 '+(debtRatio<200?"정책자금 심사 기준 충족":"개선 필요")+'하며 유동비율 '+curRatio+'%로 단기 상환 능력 '+(curRatio>100?"양호":"점검 필요")+'"],'
    +'"action_short":"'+nm+' 단기 재무 개선: '+(debtRatio>200?"고금리 단기차입금 정책자금 대환 우선":"유동성 확보 및 매출채권 회수 기일 단축")+'\n영업이익률 '+opMargin+'% → 원가 절감 및 판관비 효율화 추진\n이자보상배율 '+icr+'배 → '+(icr<1.5?"이자 부담 경감 위한 금리 우대 정책자금 전환":"현 수준 유지 및 추가 여신 검토 가능")+'","action_mid":"'+nm+' 중장기 재무 전략: 이익잉여금 누적을 통한 자기자본 강화\n부채비율 목표 200% 이하 달성 계획 수립\n설비투자 시 정책자금(중진공 시설자금) 활용으로 재무 부담 최소화"}'
     +'\n\n[기업] 기업명:'+nm+', 업종:'+ind+', 전년매출:'+r25+', 금년예상:'+rExp
    +'\n[재무지표] 영업이익률:'+opMargin+'%, 부채비율:'+debtRatio+'%, 유동비율:'+curRatio+'%, 이자보상배율:'+icr+'배, 매출성장률:'+revGrowth+'%'
    +'\n[재무상태] 자산총계:'+fKRW(totAsset)+', 부채총계:'+fKRW(totLiab)+', 자본총계:'+fKRW(totEquity)
    +(totalRegisteredDebt > 0 ? '\n[업체등록 부채현황] 기보:'+fKRW(dKibo)+', 신보:'+fKRW(dShinbo)+', 중진공:'+fKRW(dJjg)+', 소진공:'+fKRW(dSjg)+', 재단:'+fKRW(dJaidan)+', 회사담보:'+fKRW(dCorpCol)+', 대표신용:'+fKRW(dRepCr)+', 대표담보:'+fKRW(dRepCol)+', 합계:'+fKRW(totalRegisteredDebt) : '');;
}
function buildBizPlanPrompt(cData, fRev) {
  var nm=cData.name, ind=cData.industry||'제조업', itm=cData.coreItem||'주력제품', emp=cData.empCount||'4', rep=cData.rep||'대표';
  var r25=fRev.매출_2025년||'0원', rExp=fRev.금년예상연간매출||'0원', r24=fRev.매출_2024년||'0원';
  var nf=cData.needFund>0?fKRW(cData.needFund):'4억원';
  return '사업계획서 전문가. \''+nm+'\' 완성형 AI 사업계획서. 기업명·제품명·실제수치를 모든 항목에 반드시 포함. JSON만.\n\n'
    +'{"s1_items":["'+nm+'는 '+itm+'을 통해 5개 70자이상"],'
    +'"s2_swot":{"strength":["'+nm+'의 강점 4개 50자이상"],"weakness":["'+nm+'의 약점 3개 50자이상"],"opportunity":["'+nm+'의 기회 4개 50자이상"],"threat":["'+nm+'의 위협 3개 50자이상"]},'
    +'"s2_cross":{"so":["SO전략 4개 50자이상"],"wo":["WO전략 4개 50자이상"],"st":["ST전략 4개 50자이상"],"wt":["WT전략 4개 50자이상"]},'
    +'"s3_mktLabel":"'+ind+' 시장",'
    +'"s3_mktSize":"시장 규모 숫자+단위",'
    +'"s3_mktGrowth":"연평균 성장률 숫자%",'
    +'"s3_mktTarget":"핵심 소비층 10자이내",'
    +'"s3_opportunities":[{"title":"기회요인명","desc":"'+nm+' 관점 기회 설명 50자이상"}],'
    +'"s3_items":["'+ind+' 시장 현황 5개 70자이상"],'
    +'"s4_items":["'+nm+'의 '+itm+' 경쟁력 4개 70자이상"],'
    +'"s4_competitor":[{"item":"제품경쟁력","self":"★★★★★","a":"★★★★","b":"★★★"},{"item":"기술력(특허)","self":"★★★★★","a":"★★★","b":"★★★"},{"item":"가격경쟁력","self":"★★★★","a":"★★★★★","b":"★★★★"},{"item":"유통망","self":"★★★","a":"★★★★★","b":"★★★★"},{"item":"성장성","self":"★★★★★","a":"★★★","b":"★★★"}],'
    +'"s5_items":[{"title":"기술 차별화","text":"'+nm+'의 '+itm+' 기술특허 보유로 70자이상","color":"#16a34a"},{"title":"제품 차별화","text":"'+nm+' 제품 독창적 특징 70자이상","color":"#2563eb"},{"title":"시장 포지셔닝","text":"'+nm+'의 '+ind+' 시장 내 포지션 70자이상","color":"#7c3aed"},{"title":"성장 증명력","text":"'+nm+'의 '+r25+' 매출 달성으로 70자이상","color":"#ea580c"}],'
    +'"s6_certs":' + JSON.stringify(getIndustryCerts(ind, nm, itm, cData).certs) + ','
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
// ★ 업종별 인증 및 자금 추천 로직
// ===========================
function getIndustryCerts(ind, nm, itm, cData) {
  cData = cData || {};
  var certs = [];
  var funds = [];
  var isFood = ind.includes('식품') || ind.includes('외식') || ind.includes('음식') || ind.includes('농림') || ind.includes('수산');
  var isManu = ind.includes('제조');
  // 기존 대요 기관 판단
  var debtKibo   = parseInt(cData.debtKibo)   || 0;
  var debtShinbo = parseInt(cData.debtShinbo) || 0;
  var debtJjg    = parseInt(cData.debtJjg)    || 0;
  var hasKiboLoan   = debtKibo   > 0;
  var hasShinboLoan = debtShinbo > 0;
  var hasJjgLoan    = debtJjg    > 0;
  // 매출 및 직원 수 조건
  var revY24 = parseInt((cData.revenueData && cData.revenueData.y24) || 0);
  var revY25 = parseInt((cData.revenueData && cData.revenueData.y25) || 0);
  var prevRev = revY25 || revY24 || 0;
  var prevRevBillion = prevRev / 10000;
  var empNum = parseInt(cData.empCount) || 0;
  var isLargeScale = prevRevBillion >= 50 || empNum >= 5;
  // 신용점수 및 업력 조건
  var kcbScore  = parseInt(cData.kcbScore)  || 0;
  var niceScore = parseInt(cData.niceScore) || 0;
  var creditScore = kcbScore || niceScore || 0; // 둘 중 입력된 값 우선
  var isCreditWeak = creditScore > 0 && creditScore < 600; // 신용취약자: 600점 미만
  var isCreditLow  = creditScore > 0 && creditScore < 700; // 저신용: 700점 미만
  // 2026년 기관별 권장 신용점수 기준
  // 중진공: NICE 750점 이상 권장 (내부 기업진단 점수 우선)
  // 기보: 신용보다 기술력 우선 (대표자 연체/체납 시 즉시 부결)
  // 신보: KCB/NICE 800점 이상 선호 (대표자 신용도 핵심 기준)
  // 소진공: 839점 이하 저신용 전용 자금 별도 배정 (2026년)
  var isJjgCredit  = creditScore === 0 || creditScore >= 750; // 중진공 신용 조건 충족
  var isShinboCredit = creditScore === 0 || creditScore >= 800; // 신보 선호 신용 충족
  var isSjgLowCredit = creditScore > 0 && creditScore <= 839;  // 소진공 저신용 전용 대상
  var finOver = cData.finOver || '없음';
  var taxOver = cData.taxOver || '없음';
  var hasOverdue = finOver === '있음' || taxOver === '있음'; // 연체/체납 여부
  // 업력(년) 자동 계산
  var bizYears = 0;
  if (cData.bizDate && cData.bizDate !== '-') {
    var bd = new Date(cData.bizDate);
    if (!isNaN(bd.getTime())) {
      bizYears = Math.max(0, Math.floor((Date.now() - bd.getTime()) / (365.25 * 24 * 3600 * 1000)));
    }
  }
  var isNewBiz   = bizYears > 0 && bizYears <= 3;  // 창업 3년 이하
  var isEarlyBiz = bizYears > 0 && bizYears <= 7;  // 창업 7년 이하 (중진공 혁신창업 조건)
  var isRetail = ind.includes('도소매') || ind.includes('유통');
  var isService = ind.includes('서비스') || ind.includes('물류');
  var isIT = ind.includes('IT') || ind.includes('소프트웨어') || ind.includes('SW') || ind.includes('정보');
  // 2026년 중진공 확대 업종 (지식서비스업/유망서비스업)
  var isKnowledgeSvc = ind.includes('엔지니어링') || ind.includes('디자인') || ind.includes('연구개발') || ind.includes('R&D') || ind.includes('콘텐츠') || ind.includes('영상') || ind.includes('방송') || ind.includes('게임');
  var isSmartLogistics = ind.includes('물류') && (ind.includes('스마트') || ind.includes('이커머스') || ind.includes('전자상거래'));
  var isLocalCreator = ind.includes('로컈크리에이터') || ind.includes('지역특산') || ind.includes('로컈');
  // 중진공 접수 가능 업종 여부 (제조업 외 확대 조건 포함)
  var isJjgEligible = isManu || isIT || isKnowledgeSvc || isSmartLogistics || isLocalCreator || (isLargeScale && (isService || isTour || ind.includes('보건') || ind.includes('교육')));
  var isRoot = ind.includes('주조') || ind.includes('금형') || ind.includes('소성가공') || ind.includes('용접') || ind.includes('표면처리') || ind.includes('열처리');
  var isMaterial = ind.includes('소재') || ind.includes('부품') || ind.includes('장비') || ind.includes('전기전자') || ind.includes('자동차') || ind.includes('기계') || ind.includes('금속') || ind.includes('화학');
  var isExport = ind.includes('수출') || ind.includes('무역');
  var isEco = ind.includes('환경') || ind.includes('에너지') || ind.includes('재활용');
  var isSports = ind.includes('스포츠') || ind.includes('체육') || ind.includes('헬스');
  var isTour = ind.includes('관광') || ind.includes('숙박') || ind.includes('여행');

  // 공통 인증 (벤처기업)
  certs.push({name:'벤처기업 인증',effect:nm+'의 기술력 인정 — 중진공·기보 우대금리 + 추가 자금 한도 2억 확보 가능',amount:'+2억',period:'6개월 내'});

  if (isManu || isIT || ind.includes('바이오') || isEco) {
    certs.push({name:'이노비즈 인증',effect:nm+'의 기술혁신형 기업 인증 — 중진공 기술개발자금 신청 자격 부여',amount:'+3억',period:'1년 내'});
  } else if (isService || isRetail || isTour) {
    certs.push({name:'메인비즈 인증',effect:nm+'의 경영혁신형 기업 인증 — 마케팅, 판로 개척 및 금융권 대출 금리 우대',amount:'+2억',period:'1년 내'});
  } else {
    certs.push({name:'이노비즈 인증',effect:nm+'의 기술혁신형 기업 인증 — 중진공 기술개발자금 신청 자격 부여',amount:'+3억',period:'1년 내'});
  }

  if (isFood) {
    certs.push({name:'HACCP 인증',effect:nm+' 제품의 대형마트·단체급식 납품 채널 확대 직접 연결',amount:'채널↑',period:'매출 확대'});
    certs.push({name:'ISO 22000',effect:nm+'의 글로벌 식품 안전 표준 경영 체계 구축 — 해외 수출 신뢰도 확보',amount:'수출↑',period:'1년 내'});
  } else if (isRoot) {
    certs.push({name:'뿌리기업 확인',effect:nm+'의 핵심뿌리기술 인정 — 외국인 근로자 고용 한도 확대 및 기술개발 사업 우선 선정',amount:'가점↑',period:'6개월 내'});
    certs.push({name:'ISO 9001/14001',effect:nm+'의 품질/환경 경영 체계 증명 — 조달청 입찰 및 대기업 협력업체 등록 기본 사양',amount:'입찰↑',period:'6개월 내'});
  } else if (isMaterial) {
    certs.push({name:'소부장 전문기업',effect:nm+'의 소재·부품·장비 기술력 입증 — 특화 R&D 자금 및 산업은행 금융 지원',amount:'+5억',period:'1년 내'});
    certs.push({name:'ISO 9001/14001',effect:nm+'의 품질/환경 경영 체계 증명 — 조달청 입찰 및 대기업 협력업체 등록 기본 사양',amount:'입찰↑',period:'6개월 내'});
  } else if (isIT) {
    certs.push({name:'성능인증(EPC)',effect:nm+'의 우수 기술 제품 인증 — 공공기관 수의계약 및 의무구매 비중 적용',amount:'매출↑',period:'1년 내'});
    certs.push({name:'기업부설연구소',effect:nm+'의 R&D 세액공제 25% + 기보 기술보증 우대 동시 적용 가능',amount:'+1.5억',period:'세액공제 병행'});
  } else {
    certs.push({name:'기업부설연구소',effect:nm+'의 R&D 세액공제 25% + 기보 기술보증 우대 동시 적용 가능',amount:'+1.5억',period:'세액공제 병행'});
    certs.push({name:'ISO 9001/14001',effect:nm+'의 품질/환경 경영 체계 증명 — 조달청 입찰 및 대기업 협력업체 등록 기본 사양',amount:'입찰↑',period:'6개월 내'});
  }

  // 자금 추천
  if (isFood) {
    funds = [
      {rank:1,name:'농림수산업자신용보증기금(농신보)',limit:'3억',tags:['농어업인 우대','식품가공 특화','보증료 우대']},
      {rank:2,name:'중진공 소공인 특화자금',limit:'1억',tags:['금리 2.5%','즉시 신청 가능','제조업 우대']},
      {rank:3,name:'기보 기술보증 (특허 우대)',limit:'3억',tags:['보증료 0.5%','특허 1건 우대','90% 보증']},
      {rank:4,name:'소진공 성장촉진자금',limit:'1억',tags:['금리 3.0%','창업 3년 이내','온라인 신청']},
      {rank:5,name:'지역신보 소액보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤형','빠른 처리']}
    ];
  } else if (isExport) {
    funds = [
      {rank:1,name:'한국무역보험공사(K-SURE)',limit:'5억',tags:['수출기업 특화','수출채권 현금화','보증료 우대']},
      {rank:2,name:'중진공 수출기업지원자금',limit:'3억',tags:['수출실적 우대','글로벌 진출','금리 우대']},
      {rank:3,name:'기보 기술보증 (특허 우대)',limit:'3억',tags:['보증료 0.5%','특허 1건 우대','90% 보증']},
      {rank:4,name:'신보 창업기업 특례보증',limit:'2억',tags:['보증료 0.5%','벤처인증 조건부','95% 보증']},
      {rank:5,name:'지역신보 소액보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤형','빠른 처리']}
    ];
  } else if (isEco) {
    funds = [
      {rank:1,name:'한국환경산업기술원/에너지공단',limit:'5억',tags:['친환경 설비','ESCO 사업','금리 우대']},
      {rank:2,name:'중진공 신성장기반자금',limit:'3억',tags:['시설자금 우대','저탄소 인증','장기 대출']},
      {rank:3,name:'기보 기술보증 (특허 우대)',limit:'3억',tags:['보증료 0.5%','특허 1건 우대','90% 보증']},
      {rank:4,name:'신보 창업기업 특례보증',limit:'2억',tags:['보증료 0.5%','벤처인증 조건부','95% 보증']},
      {rank:5,name:'지역신보 소액보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤형','빠른 처리']}
    ];
  } else if (isSports) {
    funds = [
      {rank:1,name:'국민체육진흥공단(KSPO) 튼튼론',limit:'1억',tags:['스포츠/체육 특화','금리 우대','시설/운전 자금']},
      {rank:2,name:'소진공 소상공인 정책자금',limit:'7천만',tags:['금리 2.0%','온라인 신청','서비스 우대']},
      {rank:3,name:'지역신보 소액보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤형','빠른 처리']},
      {rank:4,name:'신보 창업기업 특례보증',limit:'2억',tags:['보증료 0.5%','벤처인증 조건부','95% 보증']},
      {rank:5,name:'중진공 혁신창업사업화자금',limit:'1억',tags:['금리 2.5%','창업 7년 미만','성장성 평가']}
    ];
  } else if (isTour) {
    funds = [
      {rank:1,name:'관광진흥개발기금',limit:'5억',tags:['관광/숙박 특화','시설 개보수','장기 저리']},
      {rank:2,name:'소진공 소상공인 정책자금',limit:'7천만',tags:['금리 2.0%','온라인 신청','서비스 우대']},
      {rank:3,name:'지역신보 소액보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤형','빠른 처리']},
      {rank:4,name:'신보 창업기업 특례보증',limit:'2억',tags:['보증료 0.5%','벤처인증 조건부','95% 보증']},
      {rank:5,name:'중진공 혁신창업사업화자금',limit:'1억',tags:['금리 2.5%','창업 7년 미만','성장성 평가']}
    ];
  } else if (isRetail || isService) {
    // 도소매/서비스: 중진공은 매출 10억이상 또는 직원 5명이상일 때만 추천
    var _retJjg = (prevRevBillion >= 10 || empNum >= 5);
    if (_retJjg) {
      funds = [
        {rank:1,name:'소진공 소상공인 정책자금',limit:'7천만',tags:['금리 2.0%','온라인 신청','도소매 우대']},
        {rank:2,name:'지역신보 소액보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤형','빠른 처리']},
        {rank:3,name:'신보 창업기업 특례보증',limit:'2억',tags:['보증료 0.5%','벤처인증 조건부','95% 보증']},
        {rank:4,name:'중진공 혁신창업사업화자금',limit:'1억',tags:['금리 2.5%','창업 7년 미만','성장성 평가']},
        {rank:5,name:'기보 기술보증 (특허 우대)',limit:'3억',tags:['보증료 0.5%','특허 1건 우대','90% 보증']}
      ];
    } else {
      // 매출 10억 미만 + 직원 5명 미만: 중진공 제외
      funds = [
        {rank:1,name:'소진공 소상공인 정책자금',limit:'7천만',tags:['금리 2.0%','온라인 신청','도소매 우대']},
        {rank:2,name:'지역신보 소액보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤형','빠른 처리']},
        {rank:3,name:'신보 창업기업 특례보증',limit:'2억',tags:['보증료 0.5%','벤처인증 조건부','95% 보증']},
        {rank:4,name:'농신보 소액보증',limit:'3억',tags:['보증료 0.5%','소상공인 우대','빠른 승인']},
        {rank:5,name:'지자체 소상공인 지원자금',limit:'5천만',tags:['시/군/구 직접 지원','무이자 또는 저리 지원','빠른 승인']}
      ];
    }
  } else {
    // 제조/IT/기타 기본 케이스: 기보/신보/중진공 조건 적용
    var _f = [];
    // ===== 업종별 기관 추천 (2026년 기준) =====
    // [제조업] 중진공 → 기술보증기금(기보) → 신용보증재단(지역신보) → 소상공인정책자금(소진공) → 지역 특례자금
    // [비제조업] 중진공(조건부) → 신용보증기금(신보) → 신용보증재단(지역신보) → 소상공인정책자금(소진공) → 업종 특화 기관
    // 신보·기보 중복 불가: 기보 이용 시 기보 추천, 신보 이용 시 신보 추천 (단, 신용보증재단은 항상 가능)
    if (isManu || isRoot || isMaterial) {
      // ===== 제조업 계열 =====
      // 1순위: 중진공 (2026년 소공인 특화자금)
      var _jjgTag = isJjgCredit ? '금리 2.5%' : 'NICE 750점 권장';
      _f.push({rank:1,name:'중진공 소공인 특화자금',limit:'1억',tags:[_jjgTag,'즉시 신청 가능','제조업 우대']});
      // 2순위: 기보 또는 신보 (중복 불가)
      if (hasKiboLoan || (!hasShinboLoan && !hasKiboLoan)) {
        // 기보 이용 중이거나 둘 다 없으면 기보 추천
        _f.push({rank:2,name:'기술보증기금(기보) 기술보증',limit:'3억',tags:['보증료 0.5%','기술력 우선 심사','B등급 이상']});
      } else if (hasShinboLoan) {
        // 신보 이용 중이면 신보 추천
        _f.push({rank:2,name:'신용보증기금(신보) 특례보증',limit:'2억',tags:['보증료 0.5%','기존 신보 거래 우대','95% 보증']});
      }
      // 3순위: 신용보증재단 (신보·기보 이용 여부 무관 항상 가능)
      _f.push({rank:3,name:'신용보증재단(지역신보) 보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤형','기보·신보 병행 가능']});
      // 4순위: 소상공인정책자금(소진공)
      _f.push({rank:4,name:'소진공 소상공인 정책자금',limit:'7천만',tags:['금리 2.0%','온라인 신청','제조업 우대']});
      // 5순위: 지역 특례자금
      _f.push({rank:5,name:'지역 특례자금(시·도 지원)',limit:'5천만',tags:['지자체 직접 지원','무이자 또는 저리','빠른 승인']});
    } else if (isIT || isKnowledgeSvc) {
      // ===== IT/지식서비스업 =====
      // 1순위: 중진공 (2026년 확대 업종)
      if (isJjgEligible && isJjgCredit) {
        _f.push({rank:1,name:'중진공 혁신창업사업화자금',limit:'1억',tags:['금리 2.5%','창업 7년 미만','IT·지식서비스 가능']});
      } else {
        _f.push({rank:1,name:'중진공 신성장기반자금',limit:'1억',tags:['NICE 750점 권장','IT 업종 가능','시설·운전 자금']});
      }
      // 2순위: 기보 또는 신보 (중복 불가)
      if (hasKiboLoan || (!hasShinboLoan && !hasKiboLoan)) {
        _f.push({rank:2,name:'기술보증기금(기보) 기술보증',limit:'3억',tags:['보증료 0.5%','기술력 우선 심사','IT·SW 특화']});
      } else if (hasShinboLoan) {
        _f.push({rank:2,name:'신용보증기금(신보) 특례보증',limit:'2억',tags:['보증료 0.5%','기존 신보 거래 우대','95% 보증']});
      }
      // 3순위: 신용보증재단 (항상 가능)
      _f.push({rank:3,name:'신용보증재단(지역신보) 보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤형','기보·신보 병행 가능']});
      // 4순위: 소진공
      _f.push({rank:4,name:'소진공 소상공인 정책자금',limit:'7천만',tags:['금리 2.0%','온라인 신청','서비스 우대']});
      // 5순위: 업종 특화 (K-STARTUP 등)
      _f.push({rank:5,name:'창업진흥원 K-Startup 지원',limit:'1억',tags:['스타트업 특화','비대면 심사','성장성 평가']});
    } else {
      // ===== 비제조업 (서비스·도소매·관광 등) =====
      // 1순위: 중진공 (매출 10억↑ 또는 직원 5명↑ 조건부)
      if (isJjgEligible && isJjgCredit) {
        _f.push({rank:1,name:'중진공 혁신창업사업화자금',limit:'1억',tags:['금리 2.5%','창업 7년 미만','성장성 평가']});
      }
      // 2순위: 신용보증기금(신보) — 비제조업 주력 기관
      if (hasShinboLoan || (!hasKiboLoan && !hasShinboLoan)) {
        // 신보 이용 중이거나 둘 다 없으면 신보 추천
        var _shinboTag2 = isShinboCredit ? '기존 신보 거래 우대' : 'KCB/NICE 800점 권장';
        _f.push({rank:_f.length+1,name:'신용보증기금(신보) 특례보증',limit:'2억',tags:['보증료 0.5%',_shinboTag2,'95% 보증']});
      } else if (hasKiboLoan) {
        // 기보 이용 중이면 기보 추천
        _f.push({rank:_f.length+1,name:'기술보증기금(기보) 기술보증',limit:'3억',tags:['보증료 0.5%','기존 기보 거래 우대','90% 보증']});
      }
      // 3순위: 신용보증재단 (항상 가능)
      _f.push({rank:_f.length+1,name:'신용보증재단(지역신보) 보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤형','신보·기보 병행 가능']});
      // 4순위: 소상공인정책자금(소진공)
      _f.push({rank:_f.length+1,name:'소진공 소상공인 정책자금',limit:'7천만',tags:['금리 2.0%','온라인 신청','서비스 우대']});
      // 5순위: 업종 맞춤 기관 (관광/스포츠/식품 등)
      if (isTour) {
        _f.push({rank:_f.length+1,name:'관광진흥개발기금',limit:'5억',tags:['관광·숙박 특화','시설 개보수','장기 저리']});
      } else if (isSports) {
        _f.push({rank:_f.length+1,name:'국민체육진흥공단(KSPO) 튼튼론',limit:'1억',tags:['스포츠·체육 특화','금리 우대','시설·운전 자금']});
      } else if (isFood) {
        _f.push({rank:_f.length+1,name:'농림수산업자신용보증기금(농신보)',limit:'3억',tags:['식품·농업 특화','보증료 우대','빠른 승인']});
      } else {
        _f.push({rank:_f.length+1,name:'지역 특례자금(시·도 지원)',limit:'5천만',tags:['지자체 직접 지원','무이자 또는 저리','빠른 승인']});
      }
    }
    // 순위 재정렬
    _f.forEach(function(x,i){x.rank=i+1;});
    funds = _f.slice(0,5);
  }

  // ===== 신용점수 기반 후처리 필터 (2026년 기관별 심사기준 적용) =====
  if (hasOverdue) {
    // 연체·체납 있으면 기보·신보·중진공 제외 (완납 후 1개월 경과 후 재신청 권장)
    funds = funds.filter(function(f){
      return !f.name.includes('기보') && !f.name.includes('신보') && !f.name.includes('중진공');
    });
    // 신용취약자 전용 상품 최우선 추가
    funds.unshift({rank:1,name:'미소금융 창업·운영자금',limit:'2천만',tags:['무담보·무보증','신용취약자 전용','연체이력 무관']});
    funds.unshift({rank:1,name:'햇살론 소상공인 보증',limit:'3천만',tags:['저신용 전용','보증료 면제','빠른 승인']});
    funds = funds.slice(0,5);
  } else if (isCreditWeak) {
    // 신용 600점 미만: 기보·신보·중진공 제외, 미소금융 + 소진공 저신용 전용 상품 추가
    funds = funds.filter(function(f){ return !f.name.includes('기보') && !f.name.includes('신보') && !f.name.includes('중진공'); });
    funds.unshift({rank:1,name:'소진공 저신용 소상공인 전용자금',limit:'7천만',tags:['2026년 별도 배정','839점 이하 전용','온라인 신청']});
    funds.unshift({rank:1,name:'미소금융 창업·운영자금',limit:'2천만',tags:['무담보·무보증','신용취약자 전용','600점 미만 가능']});
    funds = funds.slice(0,5);
  } else if (isCreditLow) {
    // 신용 600~699점: 기보 제외, 신보 조건부 유지, 소진공 저신용 전용 추가
    funds = funds.filter(function(f){ return !f.name.includes('기보'); });
    if (isSjgLowCredit && !funds.some(function(f){ return f.name.includes('저신용'); })) {
      funds.unshift({rank:1,name:'소진공 저신용 소상공인 전용자금',limit:'7천만',tags:['2026년 별도 배정','839점 이하 전용','온라인 신청']});
    }
    if (!funds.some(function(f){ return f.name.includes('신보'); })) {
      funds.push({rank:funds.length+1,name:'신보 창업기업 특례보증',limit:'1억',tags:['보증료 0.5%','저신용 조건부','심사 강화']});
    }
    funds = funds.slice(0,5);
  } else if (isSjgLowCredit && !isShinboCredit) {
    // 신용 700~799점 (신보 800점 미만): 소진공 저신용 전용 자금 안내 추가
    if (!funds.some(function(f){ return f.name.includes('저신용'); })) {
      funds.push({rank:funds.length+1,name:'소진공 저신용 소상공인 전용자금',limit:'7천만',tags:['2026년 별도 배정','839점 이하 전용','온라인 신청']});
    }
    funds = funds.slice(0,5);
  }

  // ===== 업력 기반 후처리 필터 =====
  if (bizYears > 0) {
    // 소진공 성장촉진자금: 창업 3년 이내만 해당 → 초과 시 제거
    if (!isNewBiz) {
      funds = funds.filter(function(f){ return f.name !== '소진공 성장촉진자금'; });
      // 대체: 소진공 일반경영안정자금 추가
      if (!funds.some(function(f){ return f.name.includes('소진공'); })) {
        funds.push({rank:funds.length+1,name:'소진공 일반경영안정자금',limit:'7천만',tags:['금리 2.0%','업력 무관','온라인 신청']});
      }
    }
    // 중진공 혁신창업사업화자금: 창업 7년 이내만 해당 → 초과 시 제거
    funds = funds.map(function(f){
      if (f.name.includes('혁신창업사업화') && !isEarlyBiz) {
        return Object.assign({},f,{name:'중진공 신성장기반자금',tags:['시설자금 우대','업력 무관','장기 대출']});
      }
      return f;
    });
  }

  // ===== 매출 기반 기관별 한도 동적 조정 =====
  // 매출이 있으면 기관별 공식 한도와 매출 기반 계산값 중 작은 값 사용
  (function() {
    var _rv = parseInt((cData.revenueData&&cData.revenueData.y25)||0) || parseInt((cData.revenueData&&cData.revenueData.y24)||0) || 0;
    var _curM = new Date().getMonth()+1;
    var _rvCur = parseInt((cData.revenueData&&cData.revenueData.cur)||0) || 0;
    var _rvAnn = _rvCur > 0 ? Math.round(_rvCur*(12/Math.max(_curM,1))) : 0;
    var _revNum = _rvAnn || _rv || 0;
    if (_revNum <= 0) return; // 매출 없으면 하드코딩 한도 유지
    var _isMfg2 = ind.includes('제조') || ind.includes('생산') || ind.includes('가공') || ind.includes('뿌리') || ind.includes('소재') || ind.includes('부품') || ind.includes('장비');
    function _fls(n){ if(n>=100000000) return (n/100000000).toFixed(1).replace(/\.0$/,'')+'억'; if(n>=10000000) return (n/10000000).toFixed(0)+'천만'; if(n>=10000) return (n/10000).toFixed(0)+'만'; return n+''; }
    function _pln(s){ if(!s) return 0; s=String(s).replace(/[,\s]/g,''); if(s.includes('억')) return parseFloat(s)*100000000; if(s.includes('천만')) return parseFloat(s)*10000000; if(s.includes('만')) return parseFloat(s)*10000; return parseFloat(s)||0; }
    // 기관별 매출 기반 한도 계산 규칙 (2026년 기준)
    var _orgLimits = {
      '중진공': _isMfg2 ? Math.round(_revNum*(1/4)) : Math.round(_revNum*(1/7)),
      '기보': _isMfg2 ? Math.round(_revNum*(1/3)) : Math.round(_revNum*(1/5)),
      '신보': Math.round(_revNum*(1/5)),
      '신용보증재단': Math.min(100000000, Math.round(_revNum*(1/8))),
      '지역신보': Math.min(100000000, Math.round(_revNum*(1/8))),
      '소진공': Math.min(70000000, Math.round(_revNum*(1/8))),
      '농신보': Math.round(_revNum*(1/5))
    };
    funds = funds.map(function(f) {
      var _officialNum = _pln(f.limit);
      var _dynNum = 0;
      // 기관명 매칭
      if (f.name.includes('중진공')) _dynNum = _orgLimits['중진공'];
      else if (f.name.includes('기보') || f.name.includes('기술보증')) _dynNum = _orgLimits['기보'];
      else if (f.name.includes('신보') && !f.name.includes('지역') && !f.name.includes('재단')) _dynNum = _orgLimits['신보'];
      else if (f.name.includes('신용보증재단') || f.name.includes('지역신보')) _dynNum = _orgLimits['신용보증재단'];
      else if (f.name.includes('소진공')) _dynNum = _orgLimits['소진공'];
      else if (f.name.includes('농신보')) _dynNum = _orgLimits['농신보'];
      if (_dynNum > 0 && _officialNum > 0) {
        // 공식 한도와 매출 기반 계산값 중 작은 값 사용 (단, 최소 1천만 보장)
        var _finalNum = Math.max(10000000, Math.min(_officialNum, _dynNum));
        return Object.assign({}, f, { limit: _fls(_finalNum) });
      }
      return f;
    });
  })();
  // 최종 순위 재정렬
  funds.forEach(function(f,i){ f.rank = i+1; });
  funds = funds.slice(0,5);

  return { certs: certs, funds: funds, creditScore: creditScore, bizYears: bizYears, hasOverdue: hasOverdue };
}

// ===========================
// ★ REPORT_CONFIGS
// ===========================
var REPORT_CONFIGS = {
  finance:     {typeLabel:'재무제표 분석',    title:'재무제표 분석',              contentAreaId:'finance-content-area',    landscape:false, buildPrompt:buildFinancePrompt,   buildHTML:buildFinanceHTML},
  aiTrade:     {typeLabel:'상권분석',    title:'AI 상권분석',           contentAreaId:'aiTrade-content-area',    landscape:false, buildPrompt:buildTradePrompt,     buildHTML:buildTradeHTML},
  aiMarketing: {typeLabel:'마케팅제안',  title:'마케팅제안',            contentAreaId:'aiMarketing-content-area',landscape:false, buildPrompt:buildMarketingPrompt, buildHTML:buildMarketingHTML},
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
  var cs  = (window._companiesCache||[]);
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
      +'클라이언트용 + 컨설턴트용을 <b style="color:#3b82f6">동시에</b> 생성함.<br>'
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
  var rs = [...(window._reportsCache||[])];

  // ★ 두 버전 모두 저장 (같은 데이터, 다른 버전 태그)
  var idBase = Date.now();
  var rptClient = {
    id:'rep_'+idBase+'_c',
    type:'경영진단', company:cData.name,
    title:cData.name+'_경영진단보고서(클라이언트용)',
    date:today, content:JSON.stringify(data),
    version:'client', revenueData:rev, reportType:'management'
  };
  var rptConsultant = {
    id:'rep_'+(idBase+1)+'_k',
    type:'경영진단', company:cData.name,
    title:cData.name+'_경영진단보고서(컨설턴트용)',
    date:today, content:JSON.stringify(data),
    version:'consultant', revenueData:rev, reportType:'management'
  };
  rs.push(rptClient);
  rs.push(rptConsultant);
  window._reportsCache = rs;
  saveReportToServer(rptClient);
  saveReportToServer(rptConsultant);
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
    addDisclaimerToReport('report-content-area');
  } catch(htmlErr) {
    console.error('HTML 빌드 오류:', htmlErr);
    ca.innerHTML = '<div style="padding:40px;color:red;font-size:14px;background:white;border-radius:8px"><b>⚠️ 보고서 렌더링 오류</b><br><pre style="margin-top:10px;font-size:12px;white-space:pre-wrap">' + (htmlErr.stack||String(htmlErr)) + '</pre></div>';
  }

  _currentReport = {
    company: cData.name,
    type: '경영진단보고서 ('+(version==='client'?'클라이언트용':'컨설턴트용')+')',
    contentAreaId: 'report-content-area',
    landscape: false
  };
  initReportCharts(rev);
};


// ===========================
// ★ 기타 보고서 생성 — try/finally 오버레이 보장
// ===========================

// ===========================
// ★ 재무제표 탭 — 기업 선택 이벤트, 저장, 비율 계산, 보고서 생성
// ===========================
// 숫자 → 콤마 포맷 변환 유틸
function fmtComma(n) { var v = parseInt(n)||0; return v > 0 ? v.toLocaleString('ko-KR') : ''; }

// ===== 소상공인 간이 재무 모드 업종별 원가율 테이블 =====
var SIMPLE_FS_INDUSTRY = {
  food:     { costRate: 0.42, label: '음식점·주점업' },
  retail:   { costRate: 0.70, label: '소매업' },
  service:  { costRate: 0.30, label: '서비스업' },
  wholesale:{ costRate: 0.75, label: '도매업' },
  mfg:      { costRate: 0.60, label: '소규모 제조업' },
  edu:      { costRate: 0.35, label: '교육·학원업' },
  it:       { costRate: 0.28, label: 'IT·소프트웨어' },
  const:    { costRate: 0.65, label: '건설·인테리어' },
  other:    { costRate: 0.50, label: '기타' }
};

// 재무제표 보유 유무 모드 전환
window.toggleFsMode = function(mode) {
  var fsForm     = document.getElementById('finance-fs-form');
  var simpleForm = document.getElementById('finance-simple-form');
  if (mode === 'yes') {
    if (fsForm)     fsForm.style.display     = 'block';
    if (simpleForm) simpleForm.style.display = 'none';
  } else {
    if (fsForm)     fsForm.style.display     = 'none';
    if (simpleForm) simpleForm.style.display = 'block';
  }
};

// 소상공인 간이 재무 실시간 추정 계산
window.calcSimpleFs = function() {
  var _n = function(id) { var el = document.getElementById(id); if (!el) return 0; return parseInt((el.value||'0').replace(/,/g,'')) || 0; };
  var industry  = (document.getElementById('simple_industry') || {}).value || '';
  var revY24    = _n('simple_rev_y24');  // 2025년(전년도)
  var revY23    = _n('simple_rev_y23');  // 2024년(전전년도)
  var rent      = _n('simple_rent')   * 12;
  var labor     = _n('simple_labor')  * 12;
  var interest  = _n('simple_interest') * 12;
  var totalDebt = _n('simple_debt');

  var resultDiv = document.getElementById('simple-fs-result');
  if (!industry || revY24 <= 0) {
    if (resultDiv) resultDiv.style.display = 'none';
    return;
  }

  var cfg = SIMPLE_FS_INDUSTRY[industry] || SIMPLE_FS_INDUSTRY['other'];
  var cogs     = Math.round(revY24 * cfg.costRate);
  var fixedCost= rent + labor;
  var opProfit = revY24 - cogs - fixedCost;
  var opRate   = (opProfit / revY24 * 100);

  // 간이 자산 추정: 매출의 0.8배 (소상공인 평균 자산 회전율)
  var estAsset = Math.round(revY24 * 0.8);
  // 간이 자본 추정: 자산 - 부채
  var estEquity = estAsset - totalDebt;
  // 부채비율(부채/자본 xd7 100) - 정책자금 판정용
  var debtRatio = estEquity > 0 ? (totalDebt / estEquity * 100) : (totalDebt > 0 ? 9999 : 0);
  // 부채 대 자산 비율(부채/자산 xd7 100) - 표시용
  var debtAssetRatio = estAsset > 0 ? (totalDebt / estAsset * 100) : 0;

  // 정책자금 기관별 판정
  var policyItems = [];
  var allOk = true;
  if (debtRatio >= 9999) {
    policyItems.push('<span style="color:#ef4444;font-weight:700;">🚨 자본잠식 의심 — 모든 기관 부결 위험</span>');
    allOk = false;
  } else {
    var sjgOk  = debtRatio <= 200;
    var sbkbOk = debtRatio <= 250;
    var jjgOk  = debtRatio <= 300;
    if (!sjgOk) allOk = false;
    policyItems.push((sjgOk  ? '✅' : '❌') + ' 소진공 (200% 이하 권장): ' + debtRatio.toFixed(0) + '% → ' + (sjgOk  ? '적합' : '초과'));
    policyItems.push((sbkbOk ? '✅' : '❌') + ' 신보·기보 (250% 이하 안전): ' + debtRatio.toFixed(0) + '% → ' + (sbkbOk ? '적합' : '초과'));
    policyItems.push((jjgOk  ? '✅' : '❌') + ' 중진공 (300% 이하 권장): ' + debtRatio.toFixed(0) + '% → ' + (jjgOk  ? '적합' : '초과'));
  }

  // 결과 표시
  var elOp    = document.getElementById('simple_op_result');
  var elOpR   = document.getElementById('simple_op_rate_result');
  var elDR    = document.getElementById('simple_debt_rate_result');
  var elPol   = document.getElementById('simple_policy_result');
  var elPolBox= document.getElementById('simple_policy_box');
  var elPolDet= document.getElementById('simple_policy_detail');

  if (elOp)  elOp.textContent  = fKRWRound(opProfit);
  if (elOpR) { elOpR.textContent = opRate.toFixed(1) + '%'; elOpR.style.color = opRate >= 10 ? '#16a34a' : opRate >= 0 ? '#f59e0b' : '#ef4444'; }
  if (elDR)  { elDR.textContent  = debtRatio >= 9999 ? '자본잠식' : debtRatio.toFixed(0) + '%'; elDR.style.color = debtRatio <= 200 ? '#16a34a' : debtRatio <= 300 ? '#f59e0b' : '#ef4444'; }
  if (elPol) {
    if (allOk) { elPol.textContent = '🟢 신청 가능'; elPol.style.color = '#16a34a'; }
    else       { elPol.textContent = '🟡 일부 주의'; elPol.style.color = '#f59e0b'; }
  }
  if (elPolBox) elPolBox.style.background = allOk ? '#f0fdf4' : '#fefce8';
  if (elPolDet) elPolDet.innerHTML = policyItems.join('<br>');
  if (resultDiv) resultDiv.style.display = 'block';

  // 실시간 저장 (window._simpleFsCache)
  window._simpleFsCache = {
    industry: industry, industryLabel: cfg.label,
    revY24: revY24, revY23: revY23,
    cogs: cogs, fixedCost: fixedCost, opProfit: opProfit, opRate: opRate,
    totalDebt: totalDebt, estAsset: estAsset, estEquity: estEquity,
    debtRatio: debtRatio, debtAssetRatio: debtAssetRatio,
    interest: interest
  };
};

// 소상공인 간이 데이터 저장
window.saveSimpleFsData = function() {
  var sel = document.getElementById('finance-company-select');
  if (!sel || !sel.value) { alert('업체를 먼저 선택하세요.'); return; }
  calcSimpleFs();
  var cache = window._simpleFsCache;
  if (!cache || !cache.revY24) { alert('전년도 매출과 업종을 입력하세요.'); return; }
  var cs = window._companiesCache || [];
  var cData = cs.find(function(c){return c.name===sel.value;});
  if (!cData) { alert('업체 데이터를 찾을 수 없습니다.'); return; }
  cData.simpleFsData = cache;
  // 업체정보 매출도 동기화
  if (!cData.revenueData) cData.revenueData = {};
  cData.revenueData.y25 = cache.revY24;
  cData.revenueData.y24 = cache.revY23;
  try {
    var stored = JSON.parse(localStorage.getItem('companies')||'[]');
    var idx = stored.findIndex(function(c){return c.name===sel.value;});
    if (idx >= 0) { stored[idx] = cData; } else { stored.push(cData); }
    localStorage.setItem('companies', JSON.stringify(stored));
    alert('간이 재무 데이터가 저장되었습니다.');
  } catch(e) { alert('저장 중 오류가 발생했습니다: ' + e.message); }
};

// 소상공인 간이 재무 분석 보고서 생성
window.generateSimpleFinanceReport = function(e) {
  if (e) e.preventDefault();
  var sel = document.getElementById('finance-company-select');
  if (!sel || !sel.value) { alert('업체를 먼저 선택하세요.'); return; }
  calcSimpleFs();
  var cache = window._simpleFsCache;
  if (!cache || !cache.revY24) { alert('전년도 매출과 업종을 입력하세요.'); return; }
  var cs = window._companiesCache || [];
  var cData = cs.find(function(c){return c.name===sel.value;}) || {};

  // 간이 데이터를 정식 fsData 형식으로 변환
  var fakeFs = {
    rev_y24: cache.revY24,
    rev_y23: cache.revY23,
    cogs_y24: cache.cogs,
    sga_y24: cache.fixedCost,
    op_y24: cache.opProfit,
    net_y24: Math.round(cache.opProfit - cache.interest),
    int_y24: cache.interest,
    cur_asset: Math.round(cache.estAsset * 0.4),
    fix_asset: Math.round(cache.estAsset * 0.6),
    total_asset: cache.estAsset,
    cur_liab: cache.totalDebt,
    fix_liab: 0,
    total_liab: cache.totalDebt,
    cap: Math.round(cache.estEquity * 0.5),
    total_equity: cache.estEquity > 0 ? cache.estEquity : 0,
    isSimpleMode: true,
    industryLabel: cache.industryLabel
  };
  var tempCData = Object.assign({}, cData, { fsData: fakeFs });
  if (!tempCData.revenueData) tempCData.revenueData = {};
  tempCData.revenueData.y25 = cache.revY24;
  tempCData.revenueData.y24 = cache.revY23;

  // 정식 보고서 생성 함수 호출 (간이 모드 플래그 전달)
  if (typeof generateFinanceReport === 'function') {
    window._simpleModeOverride = tempCData;
    generateFinanceReport(e);
    window._simpleModeOverride = null;
  } else {
    alert('보고서 생성 함수를 찾을 수 없습니다.');
  }
};

window.initFinanceTab = function() {
  var sel = document.getElementById('finance-company-select');
  if (!sel) return;
  sel.addEventListener('change', function() {
    var nm = sel.value;
    var form = document.getElementById('finance-fs-form');
    var debtInfo = document.getElementById('finance-debt-info');
    var debtSummary = document.getElementById('finance-debt-summary');
    var modeToggle = document.getElementById('fs-mode-toggle');
    var simpleForm = document.getElementById('finance-simple-form');
    if (!nm) {
      if(form) form.style.display='none';
      if(debtInfo) debtInfo.style.display='none';
      if(modeToggle) modeToggle.style.display='none';
      if(simpleForm) simpleForm.style.display='none';
      return;
    }
    // 모드 토글 표시
    if(modeToggle) modeToggle.style.display='block';
    // 현재 선택된 모드에 따라 폼 표시
    var currentMode = document.querySelector('input[name="fs_mode"]:checked');
    var mode = currentMode ? currentMode.value : 'yes';
    if (mode === 'yes') {
      if(form) form.style.display='block';
      if(simpleForm) simpleForm.style.display='none';
    } else {
      if(form) form.style.display='none';
      if(simpleForm) simpleForm.style.display='block';
    }
    // 저장된 데이터 불러오기
    var cs = (window._companiesCache||[]);
    var cData = cs.find(function(c){return c.name===nm;});
    // ① 업체 등록 부채 현황 표시
    var dKibo   = parseInt(cData && cData.debtKibo)   || 0;
    var dShinbo = parseInt(cData && cData.debtShinbo) || 0;
    var dJjg    = parseInt(cData && cData.debtJjg)    || 0;
    var dSjg    = parseInt(cData && cData.debtSjg)    || 0;
    var dJaidan = parseInt(cData && cData.debtJaidan) || 0;
    var dCorpCol= parseInt(cData && cData.debtCorpCollateral) || 0;
    var dRepCr  = parseInt(cData && cData.debtRepCredit) || 0;
    var dRepCol = parseInt(cData && cData.debtRepCollateral) || 0;
    var totalRegisteredDebt = dKibo + dShinbo + dJjg + dSjg + dJaidan + dCorpCol + dRepCr + dRepCol;
    if (debtInfo && debtSummary) {
      if (totalRegisteredDebt > 0) {
        var parts = [];
        if (dKibo   > 0) parts.push('기보 ' + fKRW(dKibo));
        if (dShinbo > 0) parts.push('신보 ' + fKRW(dShinbo));
        if (dJjg    > 0) parts.push('중진공 ' + fKRW(dJjg));
        if (dSjg    > 0) parts.push('소진공 ' + fKRW(dSjg));
        if (dJaidan > 0) parts.push('재단 ' + fKRW(dJaidan));
        if (dCorpCol> 0) parts.push('회사담보 ' + fKRW(dCorpCol));
        if (dRepCr  > 0) parts.push('대표신용 ' + fKRW(dRepCr));
        if (dRepCol > 0) parts.push('대표담보 ' + fKRW(dRepCol));
        debtSummary.textContent = parts.join(' / ') + ' (합계: ' + fKRW(totalRegisteredDebt) + ')';
        debtInfo.style.display = 'block';
      } else {
        debtInfo.style.display = 'none';
      }
    }
    // ② 재무제표 입력 데이터 불러오기
    var fields = ['rev_y23','rev_y24','cogs_y24','sga_y24','op_y24','net_y24','int_y24',
                  'cur_asset','fix_asset','total_asset','cap','total_equity'];
    if (cData && cData.fsData) {
      var fs = cData.fsData;
      fields.forEach(function(f) {
        var el = document.getElementById('fs_'+f);
        if (el) el.value = fs[f] ? fmtComma(fs[f]) : '';
      });
    } else {
      // 저장된 fsData 없으면 모든 필드 초기화
      fields.forEach(function(f) {
        var el = document.getElementById('fs_'+f);
        if (el) el.value = '';
      });
    }
    // ③ 업체정보 매출 → 손익계산서 매출 자동 연동
    // 업체정보: rev_25(2025년=전년도) → fs_rev_y24(전년도 매출액)
    // 업체정보: rev_24(2024년=전전년도) → fs_rev_y23(전전년도 매출액)
    if (cData && cData.revenueData) {
      var rev = cData.revenueData;
      // y25 = 2025년(전년도) → fs_rev_y24
      var elRevY24 = document.getElementById('fs_rev_y24');
      if (elRevY24 && rev.y25 > 0) elRevY24.value = fmtComma(rev.y25);
      // y24 = 2024년(전전년도) → fs_rev_y23
      var elRevY23 = document.getElementById('fs_rev_y23');
      if (elRevY23 && rev.y24 > 0) elRevY23.value = fmtComma(rev.y24);
    }
    // ③-2 간이 모드: 업체정보 매출 + 월임대료 자동 반영
    if (cData && cData.revenueData) {
      var rev2 = cData.revenueData;
      // 2025년(전년도) 매출 → simple_rev_y24
      var elSimRevY24 = document.getElementById('simple_rev_y24');
      if (elSimRevY24 && rev2.y25 > 0) elSimRevY24.value = fmtComma(rev2.y25);
      // 2024년(전전년도) 매출 → simple_rev_y23
      var elSimRevY23 = document.getElementById('simple_rev_y23');
      if (elSimRevY23 && rev2.y24 > 0) elSimRevY23.value = fmtComma(rev2.y24);
    }
    // 업체정보 월임대료 → simple_rent 자동 반영
    var elSimRent = document.getElementById('simple_rent');
    if (elSimRent && cData && cData.rentMonthly > 0) {
      elSimRent.value = fmtComma(cData.rentMonthly);
    }
    // 간이 모드 총 대출 잔액 → simple_debt 자동 반영 (업체 등록 부채 합계)
    var elSimDebt = document.getElementById('simple_debt');
    if (elSimDebt && totalRegisteredDebt > 0) {
      elSimDebt.value = fmtComma(totalRegisteredDebt);
    }
    // 간이 모드 업종 자동 선택
    var elSimIndustry = document.getElementById('simple_industry');
    if (elSimIndustry && cData && cData.industry) {
      var industryMap = {
        '제조업': 'manufacturing', '도매업': 'wholesale', '소매업': 'retail',
        '음식점': 'food', '음식점업': 'food', '주점업': 'food',
        '서비스업': 'service', 'IT': 'it', '소프트웨어': 'it',
        '건설업': 'construction', '건설': 'construction'
      };
      var matchedIndustry = '';
      Object.keys(industryMap).forEach(function(key) {
        if ((cData.industry || '').includes(key)) matchedIndustry = industryMap[key];
      });
      if (matchedIndustry) elSimIndustry.value = matchedIndustry;
    }
    // 간이 모드 값 입력 후 실시간 계산 트리거
    if (typeof calcSimpleFs === 'function') calcSimpleFs();
    // ④ 유동부채 = 중진공+신보+기보+소진공+재단 자동 합산 (재단 포함 확인)
    var curLiab = dJjg + dShinbo + dKibo + dSjg + dJaidan;
    // ⑤ 비유동부채 = 회사담보
    var fixLiab = dCorpCol;
    // ⑥ 부채총계 = 유동부채 + 비유동부채
    var totLiab = curLiab + fixLiab;
    var elCurLiab  = document.getElementById('fs_cur_liab');
    var elFixLiab  = document.getElementById('fs_fix_liab');
    var elTotLiab  = document.getElementById('fs_total_liab');
    if (elCurLiab)  elCurLiab.value  = curLiab > 0 ? fmtComma(curLiab) : '';
    if (elFixLiab)  elFixLiab.value  = fixLiab > 0 ? fmtComma(fixLiab) : '';
    if (elTotLiab)  elTotLiab.value  = totLiab > 0 ? fmtComma(totLiab) : '';
    calcFsRatios();
  });
};

window.calcFsRatios = function() {
  // 콤마 포함 값도 정확히 파싱
  var _v = function(id) { var el = document.getElementById(id); if(!el) return 0; return parseInt((el.value||'0').replace(/,/g,'')) || 0; };
  var rev      = _v('fs_rev_y24');   // 전년도(2025년) 매출액
  var op       = _v('fs_op_y24');
  var int_     = _v('fs_int_y24');
  var curA     = _v('fs_cur_asset');
  var totA     = _v('fs_total_asset'); // 자산총계
  var curL     = _v('fs_cur_liab');
  var totL     = _v('fs_total_liab');  // 부채총계
  var totE     = _v('fs_total_equity');

  // ① 영업이익률 = 영업이익 / 매출액 × 100
  var opM = rev > 0 ? (op/rev*100).toFixed(1)+'%' : '—';

  // ② 부채 대 자산 비율 = 부채총계 / 자산총계 × 100 (%)
  var debtAssetRatio = (totA > 0) ? (totL / totA * 100) : 0;
  var debtR = totA > 0 ? debtAssetRatio.toFixed(1)+'%' : '—';

  // 부채 대 자산 비율 건전성 등급 판정
  var debtGrade = '';
  var debtColor = '#16a34a';
  if (totA > 0) {
    if (debtAssetRatio <= 30)      { debtGrade = '우수 (보수적)'; debtColor = '#16a34a'; }
    else if (debtAssetRatio <= 50) { debtGrade = '양호 (균형)';          debtColor = '#2563eb'; }
    else if (debtAssetRatio <= 60) { debtGrade = '보통 (주의)';          debtColor = '#f59e0b'; }
    else if (debtAssetRatio <= 80) { debtGrade = '높음 (경고)';          debtColor = '#ea580c'; }
    else                           { debtGrade = '위험 (즉시관리)'; debtColor = '#ef4444'; }
  }

  // ③ 유동비율 = 유동자산 / 유동부채 × 100
  var curR = curL > 0 ? (curA/curL*100).toFixed(1)+'%' : '—';

  // ④ 이자보상배율 = 영업이익 / 이자비용
  var icr = int_ > 0 ? (op/int_).toFixed(1)+'배' : '—';

  var _set = function(id, val, warn, color) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = val;
      if (color) { el.style.color = color; }
      else { el.style.color = warn ? '#ef4444' : (val==='—'?'#94a3b8':'inherit'); }
    }
  };
  _set('fs_ratio_op',   opM,   false);
  // 부채 대 자산 비율 표시 + 색상 적용
  _set('fs_ratio_debt', debtR, false, debtColor);
  _set('fs_ratio_cur',  curR,  parseFloat(curR)<100);
  _set('fs_ratio_icr',  icr,   parseFloat(icr)<1);

  // 부채 대 자산 비율 등급 표시 (id: fs_debt_grade)
  var gradeEl = document.getElementById('fs_debt_grade');
  if (gradeEl) {
    gradeEl.textContent = debtGrade || '—';
    gradeEl.style.color = debtGrade ? debtColor : '#94a3b8';
  }

  // 부채 대 자산 비율 세부 설명 표시 (id: fs_debt_detail)
  var detailEl = document.getElementById('fs_debt_detail');
  if (detailEl && totA > 0) {
    var industry = '';
    // 업체 업종 가져오기
    var sel2 = document.getElementById('finance-company-select');
    if (sel2 && sel2.value) {
      var cs2 = (window._companiesCache||[]);
      var cData2 = cs2.find(function(c){return c.name===sel2.value;});
      if (cData2) industry = cData2.industry || '';
    }
    // 산업별 벤치마크
    var benchmark = 40;
    var benchLabel = '제조업 40%';
    if (industry.indexOf('제조') > -1) { benchmark=40; benchLabel='제조업 평균 40%'; }
    else if (industry.indexOf('유통') > -1 || industry.indexOf('소매') > -1) { benchmark=45; benchLabel='유통/소매 평균 45%'; }
    else if (industry.indexOf('부동산') > -1) { benchmark=50; benchLabel='부동산 평균 50%'; }
    else if (industry.indexOf('기술') > -1 || industry.indexOf('IT') > -1 || industry.indexOf('소프트') > -1) { benchmark=25; benchLabel='기술/IT 평균 25%'; }
    else if (industry.indexOf('의료') > -1 || industry.indexOf('보건') > -1) { benchmark=35; benchLabel='의료/보건 평균 35%'; }
    else if (industry.indexOf('식품') > -1 || industry.indexOf('소비재') > -1) { benchmark=38; benchLabel='소비재 평균 38%'; }
    var diff = debtAssetRatio - benchmark;
    var diffStr = diff > 0 ? '+'+diff.toFixed(1)+'%p (업종 평균 초과)' : diff.toFixed(1)+'%p (업종 평균 이하)';
    detailEl.innerHTML = '산업 벤치마크: <strong>'+benchLabel+'</strong> &nbsp;|  실제: <strong style="color:'+debtColor+'">'+debtAssetRatio.toFixed(1)+'%</strong> &nbsp;|  차이: <strong style="color:'+(diff>0?'#ef4444':'#16a34a')+'">'+diffStr+'</strong>';
  } else if (detailEl) {
    detailEl.innerHTML = '자산총계를 입력하면 산업 벤치마크와 비교합니다.';
  }

  // ===== 정책자금 기관별 권장 부채비율 판정 =====
  // 정책자금 부채비율 = 부채총계 / 자본총계 × 100 (전통적 부채비율)
  // 자본잠식 감지: 자본총계 ≤ 0
  var policyDebtEl = document.getElementById('fs_policy_debt_status');
  if (policyDebtEl) {
    // 자본총계 필드가 실제로 입력된 경우에만 판정 (빈 값이면 0이 아닌 미입력으로 처리)
    var equityEl = document.getElementById('fs_total_equity');
    var equityInputted = equityEl && equityEl.value && equityEl.value.trim() !== '' && equityEl.value.trim() !== '0';
    var debtEquityRatio = (equityInputted && totE > 0) ? (totL / totE * 100) : null;
    var isCapitalImpaired = (equityInputted && totE <= 0 && totL > 0); // 자본잠식 (자본총계 입력된 경우에만)
    var html = '';

    if (isCapitalImpaired) {
      // 자본잠식 경고
      html += '<div style="background:#fef2f2;border:2px solid #ef4444;border-radius:8px;padding:12px 16px;margin-bottom:8px;">';
      html += '<div style="font-size:13px;font-weight:800;color:#ef4444;">&#9888; 자본잠식 상태 감지</div>';
      html += '<div style="font-size:12px;color:#7f1d1d;margin-top:4px;">자본총계가 0 이하(자본잠식)입니다. 정책자금 신청 시 <strong>모든 기관 즉시 부결 위험</strong>이 매우 큽니다. 자본 증자 또는 부채 상환이 선행되어야 합니다.</div>';
      html += '</div>';
    } else if (debtEquityRatio !== null) {
      var der = debtEquityRatio.toFixed(0);
      // 소진공: 200% 이하 권장
      var sjgOk  = debtEquityRatio <= 200;
      // 신보·기보: 250% 이하 안전
      var sbkbOk = debtEquityRatio <= 250;
      // 중진공: 300% 이하 권장
      var jjgOk  = debtEquityRatio <= 300;

      html += '<div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:8px;">';
      html += '정책자금 부채비율 (부채/자본): <strong style="font-size:15px;color:'+(jjgOk?'#2563eb':'#ef4444')+';">' + der + '%</strong>';
      html += '</div>';

      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">';

      // 소진공
      html += '<div style="border-radius:8px;padding:10px;text-align:center;background:'+(sjgOk?'#f0fdf4':'#fef2f2')+';border:1.5px solid '+(sjgOk?'#86efac':'#fca5a5')+';">';
      html += '<div style="font-size:11px;font-weight:800;color:#64748b;margin-bottom:4px;">소진공</div>';
      html += '<div style="font-size:13px;font-weight:900;color:'+(sjgOk?'#16a34a':'#ef4444')+';">'+(sjgOk?'&#10003; 적합':'&#10007; 부적합')+'</div>';
      html += '<div style="font-size:10px;color:#94a3b8;margin-top:3px;">권장: 200% 이하</div>';
      html += '<div style="font-size:10px;color:'+(sjgOk?'#16a34a':'#ef4444')+';font-weight:700;">'+der+'% / 200%</div>';
      html += '</div>';

      // 신보·기보
      html += '<div style="border-radius:8px;padding:10px;text-align:center;background:'+(sbkbOk?'#f0fdf4':'#fef2f2')+';border:1.5px solid '+(sbkbOk?'#86efac':'#fca5a5')+';">';
      html += '<div style="font-size:11px;font-weight:800;color:#64748b;margin-bottom:4px;">신보·기보</div>';
      html += '<div style="font-size:13px;font-weight:900;color:'+(sbkbOk?'#16a34a':'#ef4444')+';">'+(sbkbOk?'&#10003; 안전':'&#10007; 주의')+'</div>';
      html += '<div style="font-size:10px;color:#94a3b8;margin-top:3px;">권장: 250% 이하</div>';
      html += '<div style="font-size:10px;color:'+(sbkbOk?'#16a34a':'#ef4444')+';font-weight:700;">'+der+'% / 250%</div>';
      html += '</div>';

      // 중진공
      html += '<div style="border-radius:8px;padding:10px;text-align:center;background:'+(jjgOk?'#f0fdf4':'#fef2f2')+';border:1.5px solid '+(jjgOk?'#86efac':'#fca5a5')+';">';
      html += '<div style="font-size:11px;font-weight:800;color:#64748b;margin-bottom:4px;">중진공</div>';
      html += '<div style="font-size:13px;font-weight:900;color:'+(jjgOk?'#16a34a':'#ef4444')+';">'+(jjgOk?'&#10003; 적합':'&#10007; 부적합')+'</div>';
      html += '<div style="font-size:10px;color:#94a3b8;margin-top:3px;">권장: 300% 이하</div>';
      html += '<div style="font-size:10px;color:'+(jjgOk?'#16a34a':'#ef4444')+';font-weight:700;">'+der+'% / 300%</div>';
      html += '</div>';

      html += '</div>'; // grid

      // 주의사항
      if (!sjgOk || !sbkbOk || !jjgOk) {
        html += '<div style="margin-top:8px;padding:8px 12px;background:#fef9c3;border-radius:6px;font-size:11px;color:#92400e;">';
        html += '<strong>⚠ 주의:</strong> 부채비율이 권장 구간을 초과한 기관은 신청 시 추가 서류 또는 보증 제한이 적용될 수 있습니다. 업종 및 규모에 따라 예외 적용이 가능합니다.';
        html += '</div>';
      } else {
        html += '<div style="margin-top:8px;padding:8px 12px;background:#f0fdf4;border-radius:6px;font-size:11px;color:#166534;">';
        html += '<strong>&#10003; 양호:</strong> 모든 정책자금 기관 권장 부채비율 구간 이내입니다.';
        html += '</div>';
      }
    } else {
      html = '<div style="font-size:12px;color:#94a3b8;">자본총계를 입력하면 정책자금 기관별 부채비율 적합성을 확인합니다.</div>';
    }
    policyDebtEl.innerHTML = html;
  }
};

window.saveFsData = function() {
  var sel = document.getElementById('finance-company-select');
  if (!sel || !sel.value) { alert('기업을 먼저 선택해주세요.'); return; }
  var nm = sel.value;
  var cs = (window._companiesCache||[]);
  var idx = cs.findIndex(function(c){return c.name===nm;});
  if (idx < 0) { alert('기업 정보를 찾을 수 없음.'); return; }
  var fields = ['rev_y23','rev_y24','cogs_y24','sga_y24','op_y24','net_y24','int_y24',
                'cur_asset','fix_asset','total_asset','cur_liab','fix_liab','total_liab','cap','total_equity'];
  var fsData = {};
  fields.forEach(function(f) {
    var el = document.getElementById('fs_'+f);
    if (el) fsData[f] = el.value.replace(/[^0-9\-]/g,'');
  });
  cs[idx].fsData = fsData;
  // 매출액 → revenueData 연동 (업체관리 매출 데이터 자동 반영)
  // fs_rev_y23 = 전전년도(2024년) 매출 → revenueData.y24
  // fs_rev_y24 = 전년도(2025년) 매출 → revenueData.y25
  var _rv23 = parseInt(fsData.rev_y23) || 0;  // 2024년 매출
  var _rv24 = parseInt(fsData.rev_y24) || 0;  // 2025년 매출
  if (!cs[idx].revenueData) cs[idx].revenueData = {cur:0,y25:0,y24:0,y23:0};
  if (_rv23 > 0) cs[idx].revenueData.y24 = _rv23;  // 2024년 매출
  if (_rv24 > 0) cs[idx].revenueData.y25 = _rv24;  // 2025년 매출
  window._companiesCache = cs;
  // 보고서 생성 시 자동 저장 - alert 제거 (보고서 생성 버튼 클릭 시 팝업 방지)
};

window.generateFinanceReport = async function(event) {
  var sel = document.getElementById('finance-company-select');
  if (!sel || !sel.value) { alert('기업을 선택해주세요.'); return; }
  var nm = sel.value;
  var cs = (window._companiesCache||[]);
  var cData = cs.find(function(c){return c.name===nm;});
  if (!cData) { alert('기업 정보를 찾을 수 없음.'); return; }
  // 로딩 오버레이 즉시 표시 (팝업 없이 바로 로딩 시작)
  var overlay = document.getElementById('ai-loading-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    var tt = document.getElementById('loading-title-text');
    var td = document.getElementById('loading-desc-text');
    if(tt) tt.textContent = '재무제표 분석 생성 중...';
    if(td) td.innerHTML = cData.name + ' 재무 데이터를 분석하여<br>맞춤형 재무제표 분석 리포트를 작성하고 있음.<br>최대 <b style="color:#3b82f6">60초</b>가 소요될 수 있음.';
  }
  // 저장 (alert 없이 자동 저장)
  saveFsData();
  // saveFsData 후 cData 재조회 (fsData 업데이트 반영)
  cData = (window._companiesCache||[]).find(function(c){return c.name===nm;}) || cData;
  // rev 구성: fsData 매출 우선, 없으면 업체정보 revenueData 사용
  var _baseRev = cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
  var _fsD = cData.fsData||{};
  var _fsRevY24 = parseInt(_fsD.rev_y24)||0;  // 재무제표 전년도(2025년) 매출
  var _fsRevY23 = parseInt(_fsD.rev_y23)||0;  // 재무제표 전전년도(2024년) 매출
  var rev = {
    cur: _baseRev.cur||0,
    y25: _fsRevY24 > 0 ? _fsRevY24 : (_baseRev.y25||0),  // 2025년(전년도)
    y24: _fsRevY23 > 0 ? _fsRevY23 : (_baseRev.y24||0),  // 2024년(전전년도)
    y23: _baseRev.y23||0                                    // 2023년
  };
  var fRev = fRevAI(cData, rev);
  var data = null;
  try {
    data = await callGeminiJSON(buildFinancePrompt(cData, fRev), 8192);
  } catch(e) {
    console.error('재무제표 분석 오류:', e);
    if (overlay) overlay.style.display = 'none';
    alert('보고서 생성 오류: ' + (e.message||'알 수 없는 오류'));
    return;
  }
  if (overlay) overlay.style.display = 'none';
  if (!data) return;
  var today = new Date().toISOString().split('T')[0];
  var rptTitle = cData.name+'_재무제표 분석';
  var rpt = {id:'rep_'+Date.now(),type:'재무제표 분석',company:cData.name,title:rptTitle,date:today,content:JSON.stringify(data),version:'client',revenueData:rev,reportType:'finance',contentAreaId:'finance-content-area'};
  window._reportsCache = [...(window._reportsCache||[]), rpt];
  saveReportToServer(rpt);
  updateDataLists();
  var tab = document.getElementById('finance');
  if (tab) {
    var inputStep = document.getElementById('finance-input-step');
    var resultStep = document.getElementById('finance-result-step');
    if(inputStep) inputStep.style.display = 'none';
    if(resultStep) resultStep.style.display = 'block';
  }
  var ca = document.getElementById('finance-content-area');
  if (ca) {
    try {
      resetContentArea(ca);
      ca.innerHTML = buildFinanceHTML(data, cData, rev, today);
      addDisclaimerToReport('finance-content-area');
    } catch(htmlErr) {
      console.error('재무제표 HTML 생성 오류:', htmlErr);
      ca.innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444">보고서 렌더링 오류가 발생했음.<br>다시 시도해 주세요.<br><small>' + (htmlErr.message||'') + '</small></div>';
    }
  }
  // resultStep 표시 보장 (ca 없어도 결과 화면 전환)
  var inputStep2 = document.getElementById('finance-input-step');
  var resultStep2 = document.getElementById('finance-result-step');
  if(inputStep2) inputStep2.style.display = 'none';
  if(resultStep2) resultStep2.style.display = 'block';
  _currentReport = {company:cData.name, type:rptTitle, contentAreaId:'finance-content-area', landscape:false};
  // canvas 크기 확보 후 차트 렌더링 (즉시 호출 시 height=0으로 그래프 안 나옴)
  setTimeout(function(){ initReportCharts(rev); }, 150);
};

// 보고서 면책 문구 추가 공통 함수
function addDisclaimerToReport(contentAreaId) {
  // 면책 문구 비활성화 (삭제 요청)
}

window.generateAnyReport = async function(type, version, event) {
  var overlay = document.getElementById('ai-loading-overlay');
  var tab = event.target.closest('.tab-content');
  var cN  = tab.querySelector('.company-dropdown').value;
  if (!cN) { alert('기업을 선택해주세요.'); return; }
  var cs  = (window._companiesCache||[]);
  var cData = cs.find(function(c){return c.name===cN;});
  if (!cData) { alert('기업 정보를 찾을 수 없음.'); return; }
  var rev  = cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
  var fRev = fRevAI(cData, rev);
  var cfg  = REPORT_CONFIGS[type]; if (!cfg) return;
  if (overlay) {
    overlay.style.display = 'flex';
    var tt = document.getElementById('loading-title-text');
    var td = document.getElementById('loading-desc-text');
    var typeNames = {finance:'재무제표 분석', aiTrade:'상권분석 리포트', aiMarketing:'마케팅 제안서', aiFund:'정책자금매칭', aiBiz:'AI 사업계획서'};
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
  var rptTitle = cData.name+'_'+cfg.title;
  var rpt = {id:'rep_'+Date.now(),type:cfg.typeLabel,company:cData.name,title:rptTitle,date:today,content:JSON.stringify(data),version:version,revenueData:rev,reportType:type,contentAreaId:cfg.contentAreaId};
  window._reportsCache = [...(window._reportsCache||[]), rpt];
  saveReportToServer(rpt);
  updateDataLists();
  tab.querySelector('[id$="-input-step"]').style.display = 'none';
  tab.querySelector('[id$="-result-step"]').style.display = 'block';
  var ca = document.getElementById(cfg.contentAreaId);
  resetContentArea(ca);
  ca.innerHTML = cfg.buildHTML(data, cData, rev, today);
  _currentReport = {company:cData.name, type:rptTitle, contentAreaId:cfg.contentAreaId, landscape:cfg.landscape===true};
  // 사업계획서인 경우 발표 스크립트 생성을 위해 데이터 저장
  if (type === 'aiBiz') {
    window._lastBizData  = data;
    window._lastBizCData = cData;
    window._lastBizRev   = rev;
    // 스크립트 버튼 활성화
    var scriptBtn = document.getElementById('biz-script-btn');
    if (scriptBtn) { scriptBtn.disabled = false; scriptBtn.style.opacity = '1'; }
  }
  addDisclaimerToReport(cfg.contentAreaId);
  setTimeout(function(){ initReportCharts(rev); }, 150);
  // 사업계획서 landscape 미리보기 자동 스케일 조정
  if (cfg.landscape) {
    setTimeout(function() {
      var container = document.querySelector('.report-view-landscape');
      var paper = document.querySelector('.report-paper-landscape');
      if (container && paper) {
        var containerW = container.clientWidth - 32;
        var paperW = 1122;
        var scale = Math.min(1, containerW / paperW);
        paper.style.transform = 'scale(' + scale + ')';
        paper.style.transformOrigin = 'top center';
        paper.style.marginBottom = ((scale - 1) * paper.scrollHeight) + 'px';
        var header = container.querySelector('.report-view-header');
        if (header) { header.style.width = (containerW) + 'px'; header.style.minWidth = 'unset'; }
      }
    }, 200);
  }
};

// ===========================
// ★ 보고서 보기 (showTab 리셋 후 setTimeout으로 복원)
// ===========================
window.viewReport = function(id) {
  var r = (window._reportsCache||[]).find(function(x){return x.id===id;}); if(!r) return;
  var cs = (window._companiesCache||[]);
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
      addDisclaimerToReport('report-content-area');
    } catch(htmlErr2) {
      console.error('viewReport HTML 오류:', htmlErr2);
      ca.innerHTML = '<div style="padding:40px;color:red;font-size:14px;background:white;border-radius:8px"><b>\u26a0\ufe0f 보고서 렌더링 오류</b><br><pre style="margin-top:10px;font-size:12px;white-space:pre-wrap">' + (htmlErr2.stack||String(htmlErr2)) + '</pre></div>';
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
      addDisclaimerToReport(cfg.contentAreaId);
      _currentReport = {company:cData.name, type:r.title, contentAreaId:cfg.contentAreaId, landscape:cfg.landscape===true};
      setTimeout(function(){ initReportCharts(rev); }, 150);
      // landscape 미리보기 자동 스케일
      if (cfg.landscape) {
        setTimeout(function() {
          var container = document.querySelector('.report-view-landscape');
          var paper = document.querySelector('.report-paper-landscape');
          if (container && paper) {
            var cW = container.clientWidth - 32;
            var scale = Math.min(1, cW / 1122);
            paper.style.transform = 'scale(' + scale + ')';
            paper.style.transformOrigin = 'top center';
            paper.style.marginBottom = ((scale - 1) * paper.scrollHeight) + 'px';
            var header = container.querySelector('.report-view-header');
            if (header) { header.style.width = cW + 'px'; header.style.minWidth = 'unset'; }
          }
        }, 200);
      }
    }, 50);
  }
};

window.backToInput = function(tab) {
  document.getElementById(tab+'-input-step').style.display='block';
  document.getElementById(tab+'-result-step').style.display='none';
  showTab('reportList');
};

// ===========================
// ★ 2026 정책자금 심사기준 모달
// ===========================
window.openFundCriteriaModal = function() {
  var modal = document.getElementById('fundCriteriaModal');
  var body  = document.getElementById('fundCriteriaModalBody');
  if (!modal || !body) return;
  // 콘텐츠가 아직 없으면 인라인 HTML 주입
  if (!body.innerHTML.trim()) {
    body.innerHTML = buildFundCriteriaHTML();
  }
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
};
window.closeFundCriteriaModal = function() {
  var modal = document.getElementById('fundCriteriaModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
};
// ESC 키로 닫기
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') window.closeFundCriteriaModal();
});

function buildFundCriteriaHTML() {
  var c = '#ea580c'; // 오렌지 포인트 컬러
  return `
<style>
.fc-section{background:#fff;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.06);padding:24px 26px;margin-bottom:22px}
.fc-sec-title{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.fc-sec-num{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:800;color:#fff;flex-shrink:0}
.fc-sec-label{font-size:16.5px;font-weight:800;color:#1e293b}
.fc-sec-sub{font-size:12.5px;color:#64748b;margin-left:4px}
/* 부결 항목 */
.fc-reject{display:flex;gap:12px;align-items:flex-start;padding:15px 16px;border-radius:11px;margin-bottom:10px;border:1.5px solid transparent;transition:transform .15s}
.fc-reject:hover{transform:translateX(3px)}
.fc-reject.cr{background:linear-gradient(135deg,#fff1f2,#fef2f2);border-color:#fecaca}
.fc-reject.hi{background:linear-gradient(135deg,#fff7ed,#fff5eb);border-color:#fed7aa}
.fc-reject.md{background:linear-gradient(135deg,#fffbeb,#fefce8);border-color:#fde68a}
.fc-rbadge{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15.5px;flex-shrink:0}
.fc-rbadge.cr{background:#fee2e2}.fc-rbadge.hi{background:#ffedd5}.fc-rbadge.md{background:#fef9c3}
.fc-rtitle{font-size:13.5px;font-weight:800;color:#1e293b;margin-bottom:4px}
.fc-rdesc{font-size:12.5px;color:#475569;line-height:1.6}
.fc-rtip{display:inline-flex;align-items:center;gap:4px;margin-top:7px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:4px 9px;font-size:11.5px;color:#64748b}
.fc-rlevel{margin-left:auto;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.fc-lbadge{font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:20px;white-space:nowrap}
.fc-lbadge.cr{background:#fee2e2;color:#991b1b}.fc-lbadge.hi{background:#ffedd5;color:#9a3412}.fc-lbadge.md{background:#fef9c3;color:#854d0e}
.fc-limp{font-size:10.5px;color:#94a3b8;text-align:right}
/* 기관 카드 */
.fc-org-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:16px}
.fc-org{border-radius:12px;overflow:hidden;border:1.5px solid transparent}
.fc-org.jjg{border-color:#bfdbfe;background:linear-gradient(135deg,#eff6ff,#dbeafe)}
.fc-org.kibo{border-color:#bbf7d0;background:linear-gradient(135deg,#f0fdf4,#dcfce7)}
.fc-org.shinbo{border-color:#e9d5ff;background:linear-gradient(135deg,#faf5ff,#f3e8ff)}
.fc-org.sjg{border-color:#fed7aa;background:linear-gradient(135deg,#fff7ed,#ffedd5)}
.fc-org-hd{padding:13px 15px 10px;display:flex;align-items:center;gap:9px;border-bottom:1px solid rgba(0,0,0,.06)}
.fc-org-ic{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16.5px;flex-shrink:0}
.fc-org-ic.jjg{background:#2563eb;color:#fff}.fc-org-ic.kibo{background:#16a34a;color:#fff}.fc-org-ic.shinbo{background:#7c3aed;color:#fff}.fc-org-ic.sjg{background:#ea580c;color:#fff}
.fc-org-nm{font-size:14.5px;font-weight:800;color:#1e293b}.fc-org-full{font-size:10.5px;color:#64748b;margin-top:1px}
.fc-org-bd{padding:12px 15px 14px}
.fc-cr{display:flex;gap:7px;align-items:flex-start;margin-bottom:8px}
.fc-cr:last-child{margin-bottom:0}
.fc-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:5px}
.fc-dot.jjg{background:#2563eb}.fc-dot.kibo{background:#16a34a}.fc-dot.shinbo{background:#7c3aed}.fc-dot.sjg{background:#ea580c}
.fc-ct{font-size:12.5px;color:#334155;line-height:1.55}
.fc-ct strong{font-weight:700;color:#1e293b}
.fc-chip{display:inline-block;color:#fff;font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:3px;margin-left:3px}
.fc-chip.jjg{background:#2563eb}.fc-chip.kibo{background:#16a34a}.fc-chip.shinbo{background:#7c3aed}.fc-chip.sjg{background:#ea580c}
/* 신용점수 표 */
.fc-table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:14px}
.fc-table th{background:#1e3a5f;color:#fff;padding:9px 12px;text-align:left;font-weight:700;font-size:11.5px}
.fc-table th:first-child{border-radius:7px 0 0 0}.fc-table th:last-child{border-radius:0 7px 0 0}
.fc-table td{padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
.fc-table tr:last-child td{border-bottom:none}
.fc-table tr:nth-child(even) td{background:#f8fafc}
.fc-tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10.5px;font-weight:700;white-space:nowrap}
.fc-tag.pass{background:#dcfce7;color:#166534}.fc-tag.cond{background:#fef9c3;color:#854d0e}.fc-tag.fail{background:#fee2e2;color:#991b1b}
/* 업력 카드 */
.fc-yr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}
.fc-yr{border-radius:11px;padding:14px;text-align:center;border:1.5px solid}
.fc-yr.y3{background:#f0fdf4;border-color:#86efac}.fc-yr.y7{background:#eff6ff;border-color:#93c5fd}.fc-yr.y7p{background:#faf5ff;border-color:#c4b5fd}
.fc-yr-n{font-size:20.5px;font-weight:900;margin-bottom:3px}
.fc-yr.y3 .fc-yr-n{color:#16a34a}.fc-yr.y7 .fc-yr-n{color:#2563eb}.fc-yr.y7p .fc-yr-n{color:#7c3aed}
.fc-yr-lb{font-size:11.5px;font-weight:700;color:#475569;margin-bottom:7px}
.fc-yr-fd{font-size:11.5px;color:#64748b;line-height:1.55}
.fc-yr-fd strong{color:#1e293b;font-weight:700}
/* 요약 배너 */
.fc-summary{background:linear-gradient(135deg,#1e3a5f,#0f2744);border-radius:12px;padding:20px 24px;margin-top:6px}
.fc-sum-title{font-size:14.5px;font-weight:800;color:#fb923c;margin-bottom:12px;display:flex;align-items:center;gap:7px}
.fc-sum-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.fc-sum-item{background:rgba(255,255,255,.07);border-radius:9px;padding:12px;border:1px solid rgba(255,255,255,.1)}
.fc-sum-org{font-size:11.5px;font-weight:700;color:#94a3b8;margin-bottom:5px}
.fc-sum-score{font-size:16.5px;font-weight:900;color:#fff;margin-bottom:3px}
.fc-sum-desc{font-size:10.5px;color:#cbd5e1;line-height:1.5}
/* 도입 배너 */
.fc-intro{background:linear-gradient(135deg,#fff1f2,#fff5f5);border:1.5px solid #fecaca;border-radius:11px;padding:15px 18px;margin-bottom:18px;display:flex;gap:12px;align-items:flex-start}
.fc-intro-icon{font-size:24.5px;flex-shrink:0;margin-top:1px}
.fc-intro h3{font-size:14.5px;font-weight:800;color:#dc2626;margin-bottom:4px}
.fc-intro p{font-size:12.5px;color:#7f1d1d;line-height:1.65}
.fc-score-title{font-size:13.5px;font-weight:800;color:#1e293b;margin:16px 0 10px;display:flex;align-items:center;gap:7px}
.fc-score-title::before{content:'';display:block;width:3px;height:14px;background:#ea580c;border-radius:2px}
</style>

<!-- ── 섹션 1: 부결 체크리스트 ── -->
<div class="fc-section">
  <div class="fc-sec-title">
    <div class="fc-sec-num" style="background:#dc2626">1</div>
    <span class="fc-sec-label">신청 전 필수 부결 체크리스트</span>
    <span class="fc-sec-sub">— 하나라도 해당되면 즉시 부결 가능</span>
  </div>
  <div class="fc-intro">
    <div class="fc-intro-icon">⚠️</div>
    <div>
      <h3>정책자금 신청 전 반드시 확인하세요</h3>
      <p>아래 5가지 항목은 기관 공통 부결 요인입니다. 특히 세금 체납·가지급금·자본잠식은 심사관이 가장 먼저 확인하는 핵심 감점 요인입니다.</p>
    </div>
  </div>
  <div class="fc-reject cr">
    <div class="fc-rbadge cr">🚫</div>
    <div style="flex:1">
      <div class="fc-rtitle">① 세금 체납 — 절대 불가</div>
      <div class="fc-rdesc">국세·지방세·4대보험료 중 하나라도 체납 시 모든 정책금융기관에서 즉시 부결됩니다. 완납 후 <strong>최소 1개월 경과 후</strong> 재신청 권장합니다.</div>
      <div class="fc-rtip">💡 <strong>해결책:</strong> 분납 신청 후 완납 → 완납증명서 발급 → 1개월 후 신청</div>
    </div>
    <div class="fc-rlevel"><span class="fc-lbadge cr">즉시 부결</span><span class="fc-limp">100% 부결</span></div>
  </div>
  <div class="fc-reject cr">
    <div class="fc-rbadge cr">💸</div>
    <div style="flex:1">
      <div class="fc-rtitle">② 가지급금 — 감점 최대 요인</div>
      <div class="fc-rdesc">대표자가 회사 자금을 개인적으로 차용한 가지급금은 심사관이 가장 먼저 확인하는 항목입니다. 금액이 클수록 신용등급 하락 및 한도 축소로 직결됩니다.</div>
      <div class="fc-rtip">💡 <strong>해결책:</strong> 가지급금 상환 또는 급여·배당으로 정리 → 재무상태표 정상화</div>
    </div>
    <div class="fc-rlevel"><span class="fc-lbadge cr">감점 최대</span><span class="fc-limp">한도 최대 50% ↓</span></div>
  </div>
  <div class="fc-reject hi">
    <div class="fc-rbadge hi">📉</div>
    <div style="flex:1">
      <div class="fc-rtitle">③ 자본잠식 — 기보·중진공 즉시 부결</div>
      <div class="fc-rdesc">자본총계가 마이너스(완전자본잠식) 또는 납입자본금 미만(부분자본잠식)인 경우 기보·중진공에서 즉시 부결됩니다. 신보·소진공도 한도가 대폭 축소됩니다.</div>
      <div class="fc-rtip">💡 <strong>해결책:</strong> 유상증자 또는 이익잉여금 확보로 자본총계 플러스 유지</div>
    </div>
    <div class="fc-rlevel"><span class="fc-lbadge hi">기보·중진공 부결</span><span class="fc-limp">신보·소진공 한도 ↓</span></div>
  </div>
  <div class="fc-reject hi">
    <div class="fc-rbadge hi">🔴</div>
    <div style="flex:1">
      <div class="fc-rtitle">④ 최근 3개월 내 연체 기록</div>
      <div class="fc-rdesc">단 하루라도 최근 3개월 이내 금융 연체 기록이 있으면 심사에 매우 불리합니다. 연체 이력은 신용평가사(KCB·NICE)에 최대 5년간 기록됩니다.</div>
      <div class="fc-rtip">💡 <strong>해결책:</strong> 연체 즉시 상환 → 3개월 이상 정상 거래 유지 후 신청</div>
    </div>
    <div class="fc-rlevel"><span class="fc-lbadge hi">심사 불리</span><span class="fc-limp">신용점수 최대 100점 ↓</span></div>
  </div>
  <div class="fc-reject md">
    <div class="fc-rbadge md">🏠</div>
    <div style="flex:1">
      <div class="fc-rtitle">⑤ 사업장·주거지 압류</div>
      <div class="fc-rdesc">대표자 개인 소유 부동산에 가압류·압류가 설정되어 있으면 담보 제공이 불가능해 100% 부결됩니다. 법인 소유 부동산의 경우에도 감점 요인이 됩니다.</div>
      <div class="fc-rtip">💡 <strong>해결책:</strong> 압류 해제 후 신청 — 가압류는 채권자 합의 또는 공탁으로 해제 가능</div>
    </div>
    <div class="fc-rlevel"><span class="fc-lbadge md">담보 불가</span><span class="fc-limp">100% 부결</span></div>
  </div>
</div>

<!-- ── 섹션 2: 기관별 심사기준 ── -->
<div class="fc-section">
  <div class="fc-sec-title">
    <div class="fc-sec-num" style="background:#2563eb">2</div>
    <span class="fc-sec-label">2026년 기관별 심사기준</span>
    <span class="fc-sec-sub">— 신용점수·업종·업력·한도 산정 기준</span>
  </div>
  <div class="fc-org-grid">
    <div class="fc-org jjg">
      <div class="fc-org-hd"><div class="fc-org-ic jjg">🏭</div><div><div class="fc-org-nm">중진공</div><div class="fc-org-full">중소벤처기업진흥공단</div></div></div>
      <div class="fc-org-bd">
        <div class="fc-cr"><div class="fc-dot jjg"></div><div class="fc-ct"><strong>권장 신용점수</strong> NICE <span class="fc-chip jjg">750점 이상</span> 권장 — 내부 기업진단 점수 우선 적용</div></div>
        <div class="fc-cr"><div class="fc-dot jjg"></div><div class="fc-ct"><strong>운전자금 한도</strong> 전년 매출의 <strong>1/3 ~ 1/4</strong> 이내</div></div>
        <div class="fc-cr"><div class="fc-dot jjg"></div><div class="fc-ct"><strong>시설자금 한도</strong> 견적서 금액의 <strong>80 ~ 100%</strong> 이내</div></div>
        <div class="fc-cr"><div class="fc-dot jjg"></div><div class="fc-ct"><strong>2026년 확대 업종</strong> 지식서비스(엔지니어링·디자인·R&D·콘텐츠·게임), 스마트물류, 로컬크리에이터</div></div>
        <div class="fc-cr"><div class="fc-dot jjg"></div><div class="fc-ct"><strong>업력 조건</strong> 혁신창업사업화자금: 창업 7년 미만 / 신성장기반자금: 업력 무관</div></div>
      </div>
    </div>
    <div class="fc-org kibo">
      <div class="fc-org-hd"><div class="fc-org-ic kibo">🔬</div><div><div class="fc-org-nm">기보</div><div class="fc-org-full">기술보증기금</div></div></div>
      <div class="fc-org-bd">
        <div class="fc-cr"><div class="fc-dot kibo"></div><div class="fc-ct"><strong>심사 우선순위</strong> 신용점수보다 <strong>기술력 우선</strong> — 특허·기업부설연구소 보유 시 우대</div></div>
        <div class="fc-cr"><div class="fc-dot kibo"></div><div class="fc-ct"><strong>즉시 부결 조건</strong> 대표자 연체·체납 시 즉시 부결 / 자본잠식 기업 부결</div></div>
        <div class="fc-cr"><div class="fc-dot kibo"></div><div class="fc-ct"><strong>기술등급 조건</strong> 기술평가 <strong>B등급 이상</strong> 필요 (C등급 이하 한도 대폭 축소)</div></div>
        <div class="fc-cr"><div class="fc-dot kibo"></div><div class="fc-ct"><strong>중복 제한</strong> 신보 대출 있으면 기보 신규 보증 제한 (기보·신보 중복 불가 원칙)</div></div>
        <div class="fc-cr"><div class="fc-dot kibo"></div><div class="fc-ct"><strong>보증 한도</strong> 최대 30억 / 보증료 0.5~1.5%</div></div>
      </div>
    </div>
    <div class="fc-org shinbo">
      <div class="fc-org-hd"><div class="fc-org-ic shinbo">💳</div><div><div class="fc-org-nm">신보</div><div class="fc-org-full">신용보증기금</div></div></div>
      <div class="fc-org-bd">
        <div class="fc-cr"><div class="fc-dot shinbo"></div><div class="fc-ct"><strong>권장 신용점수</strong> KCB/NICE <span class="fc-chip shinbo">800점 이상</span> 선호 — 대표자 신용도 핵심 기준</div></div>
        <div class="fc-cr"><div class="fc-dot shinbo"></div><div class="fc-ct"><strong>한도 산정</strong> 전년 매출의 <strong>1/4 ~ 1/6</strong> 이내</div></div>
        <div class="fc-cr"><div class="fc-dot shinbo"></div><div class="fc-ct"><strong>중복 제한</strong> 기보 대출 있으면 신보 신규 보증 제한</div></div>
        <div class="fc-cr"><div class="fc-dot shinbo"></div><div class="fc-ct"><strong>특례보증 조건</strong> 창업 7년 미만, 벤처인증 시 우대</div></div>
        <div class="fc-cr"><div class="fc-dot shinbo"></div><div class="fc-ct"><strong>보증 한도</strong> 최대 20억 / 보증료 0.5~1.0% / 보증비율 95%</div></div>
      </div>
    </div>
    <div class="fc-org sjg">
      <div class="fc-org-hd"><div class="fc-org-ic sjg">🏪</div><div><div class="fc-org-nm">소진공</div><div class="fc-org-full">소상공인시장진흥공단</div></div></div>
      <div class="fc-org-bd">
        <div class="fc-cr"><div class="fc-dot sjg"></div><div class="fc-ct"><strong>2026년 신설</strong> <span class="fc-chip sjg">839점 이하</span> 저신용 전용자금 별도 배정 — 일반 자금과 분리 운영</div></div>
        <div class="fc-cr"><div class="fc-dot sjg"></div><div class="fc-ct"><strong>한도</strong> 일반 7천만원 / 저신용 전용 7천만원 / 성장촉진자금 1억</div></div>
        <div class="fc-cr"><div class="fc-dot sjg"></div><div class="fc-ct"><strong>업력 조건</strong> 성장촉진자금: 창업 <strong>3년 이내</strong> / 일반경영안정자금: 업력 무관</div></div>
        <div class="fc-cr"><div class="fc-dot sjg"></div><div class="fc-ct"><strong>제한 대상</strong> 다중채무자(3개 이상 금융기관 동시 연체) 제한 / 유흥업종 제외</div></div>
        <div class="fc-cr"><div class="fc-dot sjg"></div><div class="fc-ct"><strong>금리</strong> 정책금리 연 2.0~3.0% / 온라인 신청 가능 / 처리 기간 2~4주</div></div>
      </div>
    </div>
  </div>
  <!-- 신용점수 구간표 -->
  <div class="fc-score-title">신용점수 구간별 기관 추천 매트릭스</div>
  <table class="fc-table">
    <thead><tr><th>신용점수 구간</th><th>중진공</th><th>기보</th><th>신보</th><th>소진공</th><th>미소금융·햇살론</th></tr></thead>
    <tbody>
      <tr><td><strong>800점 이상</strong></td><td><span class="fc-tag pass">✓ 정상</span></td><td><span class="fc-tag pass">✓ 정상</span></td><td><span class="fc-tag pass">✓ 선호</span></td><td><span class="fc-tag pass">✓ 정상</span></td><td><span class="fc-tag cond">— 해당없음</span></td></tr>
      <tr><td><strong>750~799점</strong></td><td><span class="fc-tag pass">✓ 정상</span></td><td><span class="fc-tag pass">✓ 정상</span></td><td><span class="fc-tag cond">△ 조건부</span></td><td><span class="fc-tag pass">✓ 정상</span></td><td><span class="fc-tag cond">— 해당없음</span></td></tr>
      <tr><td><strong>700~749점</strong></td><td><span class="fc-tag cond">△ 권장 미충족</span></td><td><span class="fc-tag pass">✓ 기술력 우선</span></td><td><span class="fc-tag fail">✗ 제외</span></td><td><span class="fc-tag pass">✓ 저신용 전용</span></td><td><span class="fc-tag cond">— 해당없음</span></td></tr>
      <tr><td><strong>600~699점</strong></td><td><span class="fc-tag fail">✗ 제외</span></td><td><span class="fc-tag fail">✗ 제외</span></td><td><span class="fc-tag fail">✗ 제외</span></td><td><span class="fc-tag pass">✓ 저신용 전용</span></td><td><span class="fc-tag cond">△ 검토 가능</span></td></tr>
      <tr><td><strong>600점 미만</strong></td><td><span class="fc-tag fail">✗ 제외</span></td><td><span class="fc-tag fail">✗ 제외</span></td><td><span class="fc-tag fail">✗ 제외</span></td><td><span class="fc-tag fail">✗ 제외</span></td><td><span class="fc-tag pass">✓ 전용 상품</span></td></tr>
      <tr><td><strong>연체·체납 있음</strong></td><td><span class="fc-tag fail">✗ 즉시 부결</span></td><td><span class="fc-tag fail">✗ 즉시 부결</span></td><td><span class="fc-tag fail">✗ 즉시 부결</span></td><td><span class="fc-tag fail">✗ 부결</span></td><td><span class="fc-tag pass">✓ 연체 무관</span></td></tr>
    </tbody>
  </table>
</div>

<!-- ── 섹션 3: 업력 조건별 추천 자금 ── -->
<div class="fc-section">
  <div class="fc-sec-title">
    <div class="fc-sec-num" style="background:#16a34a">3</div>
    <span class="fc-sec-label">업력 조건별 추천 자금</span>
    <span class="fc-sec-sub">— 창업일 기준 자동 계산 적용</span>
  </div>
  <div class="fc-yr-grid">
    <div class="fc-yr y3">
      <div class="fc-yr-n">3년 이하</div>
      <div class="fc-yr-lb">초기 창업 단계</div>
      <div class="fc-yr-fd"><strong>소진공 성장촉진자금</strong><br>창업 3년 이내 전용 / 최대 1억<br><br><strong>중진공 혁신창업사업화자금</strong><br>창업 7년 미만 / 최대 1억<br><br><strong>기보 창업기업 특례</strong><br>기술력 보유 시 최대 3억</div>
    </div>
    <div class="fc-yr y7">
      <div class="fc-yr-n">3~7년</div>
      <div class="fc-yr-lb">성장 단계</div>
      <div class="fc-yr-fd"><strong>소진공 일반경영안정자금</strong><br>업력 무관 / 최대 7천만<br><br><strong>중진공 혁신창업사업화자금</strong><br>창업 7년 미만 / 최대 1억<br><br><strong>기보·신보 일반 보증</strong><br>매출·기술력 기반 한도 산정</div>
    </div>
    <div class="fc-yr y7p">
      <div class="fc-yr-n">7년 초과</div>
      <div class="fc-yr-lb">안정·확장 단계</div>
      <div class="fc-yr-fd"><strong>소진공 일반경영안정자금</strong><br>업력 무관 / 최대 7천만<br><br><strong>중진공 신성장기반자금</strong><br>업력 무관 / 시설자금 우대<br><br><strong>기보·신보 일반 보증</strong><br>매출·기술력 기반 한도 산정</div>
    </div>
  </div>
</div>

<!-- ── 요약 배너 ── -->
<div class="fc-summary">
  <div class="fc-sum-title">📌 2026년 기관별 권장 신용점수 요약</div>
  <div class="fc-sum-grid">
    <div class="fc-sum-item"><div class="fc-sum-org">중진공</div><div class="fc-sum-score">NICE 750점↑</div><div class="fc-sum-desc">내부 기업진단 점수 우선<br>운전자금 매출 1/3~1/4</div></div>
    <div class="fc-sum-item"><div class="fc-sum-org">기보</div><div class="fc-sum-score">기술력 우선</div><div class="fc-sum-desc">연체·체납 즉시 부결<br>B등급 이상 / 자본잠식 불가</div></div>
    <div class="fc-sum-item"><div class="fc-sum-org">신보</div><div class="fc-sum-score">800점↑ 선호</div><div class="fc-sum-desc">대표자 신용도 핵심<br>매출 1/4~1/6 한도</div></div>
    <div class="fc-sum-item"><div class="fc-sum-org">소진공</div><div class="fc-sum-score">839점↓ 전용</div><div class="fc-sum-desc">2026년 저신용 전용자금<br>별도 배정 / 다중채무 제한</div></div>
  </div>
</div>
`;
}

// ===========================
// ★ 발표 스크립트 생성
// ===========================
window.generatePresentationScript = async function() {
  var modal = document.getElementById('script-modal');
  var loading = document.getElementById('script-loading');
  var contentDiv = document.getElementById('script-content');
  var actionsDiv = document.getElementById('script-actions');
  if (!modal || !loading || !contentDiv) return;

  var d = window._lastBizData;
  var cData = window._lastBizCData;
  if (!d || !cData) {
    alert('사업계획서를 먼저 생성해주세요.');
    return;
  }

  // 모달 열기
  modal.style.display = 'block';
  loading.style.display = 'block';
  contentDiv.style.display = 'none';
  if (actionsDiv) actionsDiv.style.display = 'none';

  var nm = cData.name || '기업명';
  var ind = cData.industry || '제조업';
  var itm = cData.coreItem || '주력제품';
  var rep = cData.rep || '대표';
  var rev = window._lastBizRev || {};
  var r25 = rev.y25 ? (rev.y25/100000000).toFixed(1)+'억원' : '전년 매출';
  var nf = cData.needFund > 0 ? (cData.needFund/100000000).toFixed(1)+'억원' : '4억원';

  // 사업계획서 핵심 내용 요약
  var overviewItems = (d.s1_items||[]).slice(0,3).join(' / ');
  var strengths = ((d.s2_swot||{}).strength||[]).slice(0,2).join(', ');
  var opportunities = ((d.s2_swot||{}).opportunity||[]).slice(0,2).join(', ');
  var kpi = d.s9_kpi || {y1:'18억', y2:'24억'};
  var conclusion = (d.s10_conclusion||'').slice(0,200);

  var prompt = `당신은 전문 경영 발표 코치입니다. 아래 AI 사업계획서 내용을 바탕으로 투자자·심사위원 앞에서 발표할 수 있는 페이지별 발표 스크립트를 작성해주세요.

[기업 정보]
- 기업명: ${nm}
- 업종: ${ind}
- 핵심아이템: ${itm}
- 대표자: ${rep}
- 전년 매출: ${r25}
- 필요 자금: ${nf}

[사업계획서 핵심 내용]
- 사업 개요: ${overviewItems}
- 핵심 강점: ${strengths}
- 시장 기회: ${opportunities}
- 매출 목표: 1년차 ${kpi.y1}, 2년차 ${kpi.y2}
- 종합 의견: ${conclusion}

[작성 요건]
1. 표지(인사말) → P1(기업개요) → P2(목차) → P3(사업개요) → P4(시장분석) → P5(SWOT) → P6(교차전략) → P7(경쟁분석) → P8(인증·조달전략) → P9(자금계획) → P10(매출전망·로드맵) → P11(종합제언) 순서로 작성
2. 각 페이지별로 **[P페이지번호 - 섹션명]** 형식의 제목을 붙이고, 발표 멘트를 2~4문단으로 작성
3. 각 페이지 예상 발표 시간을 괄호로 표시 (예: 약 2분)
4. 자연스럽고 설득력 있는 구어체로 작성 (존댓말, ~입니다 체)
5. 핵심 수치와 기업명을 반드시 포함
6. 마지막에 Q&A 예상 질문 3개와 답변 요령을 추가`;

  try {
    var scriptText = await callGeminiAPIBiz(prompt);
    loading.style.display = 'none';
    contentDiv.style.display = 'block';
    if (actionsDiv) actionsDiv.style.display = 'flex';

    // 마크다운 스타일로 렌더링
    window._lastScriptText = scriptText;
    var html = scriptText
      .replace(/^## (.+)$/gm, '<h3 style="color:#1e293b;font-size:16px;font-weight:700;margin:24px 0 8px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;">$1</h3>')
      .replace(/^\*\*\[(.+?)\]\*\*(.*)$/gm, '<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:10px 14px;margin:12px 0 6px;border-radius:0 8px 8px 0;"><strong style="color:#16a34a;font-size:14px;">[$1]</strong>$2</div>')
      .replace(/^\*\*(.+?)\*\*(.*)$/gm, '<p style="margin:6px 0;"><strong>$1</strong>$2</p>')
      .replace(/^### (.+)$/gm, '<h4 style="color:#16a34a;font-size:14px;font-weight:700;margin:16px 0 6px;">$1</h4>')
      .replace(/^\[(.+?)\](.*)$/gm, '<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:10px 14px;margin:12px 0 6px;border-radius:0 8px 8px 0;"><strong style="color:#16a34a;font-size:14px;">[$1]</strong>$2</div>')
      .replace(/^- (.+)$/gm, '<li style="margin:4px 0;padding-left:4px;">$1</li>')
      .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul style="margin:8px 0 8px 16px;padding:0;">$&</ul>')
      .replace(/\n\n/g, '</p><p style="margin:8px 0;">')
      .replace(/\n/g, '<br>');
    contentDiv.innerHTML = '<div style="padding:4px 0;">' + html + '</div>';
  } catch(e) {
    loading.style.display = 'none';
    contentDiv.style.display = 'block';
    contentDiv.innerHTML = '<div style="color:#ef4444;padding:20px;background:#fef2f2;border-radius:8px;">스크립트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.<br><small>' + (e.message||'') + '</small></div>';
  }
};

window.copyScriptToClipboard = function() {
  var text = window._lastScriptText || '';
  if (!text) return;
  navigator.clipboard.writeText(text).then(function() {
    alert('클립보드에 복사되었습니다.');
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('클립보드에 복사되었습니다.');
  });
};

window.downloadScriptAsTxt = function() {
  var text = window._lastScriptText || '';
  if (!text) return;
  var cData = window._lastBizCData || {};
  var nm = cData.name || '기업';
  var blob = new Blob([text], {type:'text/plain;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nm + '_발표스크립트.txt';
  a.click();
  URL.revokeObjectURL(a.href);
};
