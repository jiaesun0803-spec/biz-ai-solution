// ===== BizConsult 시스템 코어 =====
const DB_USERS    = 'biz_users';
const DB_SESSION  = 'biz_session';
const STORAGE_KEY = 'biz_consult_companies';
const DB_REPORTS  = 'biz_reports';
let _currentReport = { company:'', type:'', contentAreaId:'', landscape:true };

// 초기화: 테스트 계정 생성 및 로드
document.addEventListener('DOMContentLoaded', function() {
  initTestAccount();
  checkAuth();
  initInputHandlers();
});

function initTestAccount() {
  let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
  if (!users.find(u => u.email === 'test@biz.com')) {
    users.push({ email: 'test@biz.com', pw: '1234', name: '테스트사용자', dept: '솔루션빌더스', apiKey: '' });
    localStorage.setItem(DB_USERS, JSON.stringify(users));
  }
}

// ===========================
// ★ 인증 및 계정 관리
// ===========================
window.devBypassLogin = function() {
  const testUser = { email: 'test@biz.com', pw: '1234', name: '테스트사용자', dept: '솔루션빌더스', apiKey: '' };
  localStorage.setItem(DB_SESSION, JSON.stringify(testUser));
  location.reload();
};

function checkAuth() {
  const session = JSON.parse(localStorage.getItem(DB_SESSION));
  const authEl = document.getElementById('auth-container');
  const appEl  = document.getElementById('main-app');
  if (session) {
    authEl.style.display='none'; appEl.style.display='flex';
    loadUserProfile();
    showTab('dashboard');
  } else {
    authEl.style.display='flex'; appEl.style.display='none';
  }
}

window.handleLogin = function() {
  const email = document.getElementById('login-email').value;
  const pw = document.getElementById('login-pw').value;
  const users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
  const user = users.find(u => u.email === email && u.pw === pw);
  if (user) {
    localStorage.setItem(DB_SESSION, JSON.stringify(user));
    location.reload();
  } else { alert('이메일 또는 비밀번호가 틀립니다.'); }
};

window.handleLogout = function() { localStorage.removeItem(DB_SESSION); location.reload(); };

// ===========================
// ★ 설정 (프로필, API키)
// ===========================
function loadUserProfile() {
  const user = JSON.parse(localStorage.getItem(DB_SESSION));
  if (!user) return;
  document.getElementById('display-user-name').innerText = user.name;
  document.getElementById('display-user-dept').innerText = user.dept || '경영컨설턴트';
  document.getElementById('set-user-name').value = user.name;
  document.getElementById('set-user-email').value = user.email;
  document.getElementById('set-user-dept').value = user.dept || '';
  
  if (user.apiKey) {
    document.getElementById('set-api-key').value = user.apiKey;
    lockApiKeyUI();
  }
}

window.saveProfileSettings = function() {
  let session = JSON.parse(localStorage.getItem(DB_SESSION));
  session.name = document.getElementById('set-user-name').value;
  session.dept = document.getElementById('set-user-dept').value;
  updateUserDatabase(session);
  alert('프로필이 저장되었습니다.');
  loadUserProfile();
};

window.handleChangePw = function() {
  const newPw = document.getElementById('set-new-pw').value;
  if (!newPw) { alert('새 비밀번호를 입력하세요.'); return; }
  let session = JSON.parse(localStorage.getItem(DB_SESSION));
  session.pw = newPw;
  updateUserDatabase(session);
  alert('비밀번호가 변경되었습니다.');
};

window.handleDeleteAccount = function() {
  if (confirm('정말 탈퇴하시겠습니까? 데이터는 복구되지 않습니다.')) {
    let session = JSON.parse(localStorage.getItem(DB_SESSION));
    let users = JSON.parse(localStorage.getItem(DB_USERS));
    users = users.filter(u => u.email !== session.email);
    localStorage.setItem(DB_USERS, JSON.stringify(users));
    handleLogout();
  }
};

window.saveApiSettings = function() {
  const key = document.getElementById('set-api-key').value.trim();
  if (!key) { alert('API 키를 입력하세요.'); return; }
  let session = JSON.parse(localStorage.getItem(DB_SESSION));
  session.apiKey = key;
  updateUserDatabase(session);
  lockApiKeyUI();
  alert('API 키가 저장되었습니다.');
};

function lockApiKeyUI() {
  document.getElementById('set-api-key').disabled = true;
  document.getElementById('btn-api-save').style.display = 'none';
  document.getElementById('btn-api-edit').style.display = 'inline-block';
}

window.unlockApiKey = function() {
  document.getElementById('set-api-key').disabled = false;
  document.getElementById('btn-api-save').style.display = 'inline-block';
  document.getElementById('btn-api-edit').style.display = 'none';
};

function updateUserDatabase(updatedUser) {
  localStorage.setItem(DB_SESSION, JSON.stringify(updatedUser));
  let users = JSON.parse(localStorage.getItem(DB_USERS));
  const idx = users.findIndex(u => u.email === updatedUser.email);
  if (idx > -1) { users[idx] = updatedUser; localStorage.setItem(DB_USERS, JSON.stringify(users)); }
}

// ===========================
// ★ 기업 관리 및 보고서 생성
// ===========================
window.saveCompanyData = function() {
  const name = document.getElementById('comp_name').value;
  if (!name) { alert('기업명을 입력하세요.'); return; }
  const data = {
    name, industry: document.getElementById('comp_industry').value,
    empCount: document.getElementById('emp_count').value,
    bizDate: document.getElementById('biz_date').value,
    revenueData: { cur: document.getElementById('rev_cur').value }
  };
  let list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const idx = list.findIndex(c => c.name === name);
  if (idx > -1) list[idx] = data; else list.push(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  alert('기업 정보가 저장되었습니다.');
  showCompanyList();
};

window.generateReport = async function(type, version, event) {
  const cN = event.target.closest('.tab-content').querySelector('.company-dropdown').value;
  if (!cN) { alert('기업을 선택하세요.'); return; }
  const session = JSON.parse(localStorage.getItem(DB_SESSION));
  if (!session.apiKey) { alert('설정에서 API 키를 먼저 저장하세요.'); showTab('settings'); return; }

  const overlay = document.getElementById('ai-loading-overlay');
  overlay.style.display = 'flex';
  await new Promise(r => setTimeout(r, 100)); // UI 갱신 유도

  try {
    const data = await callGeminiAPI(`기업 ${cN}의 경영진단보고서를 작성해줘.`);
    const isL = false; // 세로형
    const title = `경영진단보고서 (${version === 'client' ? '기업전달용' : '컨설턴트용'})`;
    
    document.getElementById('report-input-step').style.display = 'none';
    document.getElementById('report-result-step').style.display = 'block';
    const ca = document.getElementById('report-content-area');
    ca.innerHTML = tplStyle('#3b82f6', isL) + `<div class="rp-wrap"><div class="rp-cover"><div class="rp-cbar"></div><h1>${title}</h1><p>${cN}</p></div><div class="rp-page"><h3>분석 결과 요약</h3><p>${data}</p></div></div>`;
    
    _currentReport = { company: cN, type: title, contentAreaId: 'report-content-area', landscape: isL };
  } catch (e) { alert('오류가 발생했습니다.'); } 
  finally { overlay.style.display = 'none'; }
};

window.generateAnyReport = async function(type, version, event) {
  const tab = event.target.closest('.tab-content');
  const cN = tab.querySelector('.company-dropdown').value;
  if (!cN) { alert('기업을 선택하세요.'); return; }
  const session = JSON.parse(localStorage.getItem(DB_SESSION));
  if (!session.apiKey) { alert('설정에서 API 키를 먼저 저장하세요.'); showTab('settings'); return; }

  const overlay = document.getElementById('ai-loading-overlay');
  overlay.style.display = 'flex';
  await new Promise(r => setTimeout(r, 100));

  try {
    const data = await callGeminiAPI(`${type} 보고서 작성.`);
    const isL = (type === 'aiBiz'); // 사업계획서만 가로
    const config = { finance: '상세 재무진단', aiBiz: '사업계획서', aiFund: '정책자금매칭' };
    const title = config[type] || '리포트';
    const areaId = type + '-content-area';

    tab.querySelector('[id$="-input-step"]').style.display = 'none';
    tab.querySelector('[id$="-result-step"]').style.display = 'block';
    document.getElementById(areaId).innerHTML = tplStyle('#2563eb', isL) + `<div class="rp-wrap"><div class="rp-cover"><div class="rp-cbar"></div><h1>${title}</h1><p>${cN}</p></div><div class="rp-page"><p>${data}</p></div></div>`;
    
    _currentReport = { company: cN, type: title, contentAreaId: areaId, landscape: isL };
  } catch (e) { alert('생성 오류'); }
  finally { overlay.style.display = 'none'; }
};

async function callGeminiAPI(prompt) {
  const session = JSON.parse(localStorage.getItem(DB_SESSION));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${session.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.candidates[0].content.parts[0].text;
}

// ===========================
// ★ UI 헬퍼
// ===========================
function tplStyle(color, isL) {
  const w = isL ? '297mm' : '210mm'; const h = isL ? '210mm' : '297mm';
  return `<style>.rp-wrap{display:flex;flex-direction:column;align-items:center;background:#e8eaed;padding:30px;gap:30px;}.rp-cover,.rp-page{width:${w};height:${h};background:white;padding:50px;box-shadow:0 4px 15px rgba(0,0,0,0.1);position:relative;flex-shrink:0;overflow:hidden;}.rp-cbar{position:absolute;left:0;top:0;bottom:0;width:15px;background:${color};}h1{font-size:32px;margin-bottom:20px;}</style>`;
}

window.showTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  const m = document.getElementById('menu-' + tabId); if (m) m.classList.add('active');
  if (tabId === 'company') renderCompanyCards();
  updateDataLists();
};

window.renderCompanyCards = function() {
  const container = document.getElementById('company-cards-container'); if (!container) return;
  const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  container.innerHTML = list.map(c => `<div class="company-card"><strong>${c.name}</strong><p>${c.industry}</p></div>`).join('');
};

window.updateDataLists = function() {
  const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  document.querySelectorAll('.company-dropdown').forEach(sel => {
    sel.innerHTML = '<option value="">기업 선택</option>';
    list.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
  });
  document.getElementById('stat-companies').innerText = list.length;
};

window.printReport = function() { window.print(); };
window.backToInput = function(id) { document.getElementById(id + '-input-step').style.display = 'block'; document.getElementById(id + '-result-step').style.display = 'none'; };
window.toggleAuthMode = function(m) { document.getElementById('login-form-area').style.display = (m==='login'?'block':'none'); document.getElementById('signup-form-area').style.display = (m==='signup'?'block':'none'); };
function initInputHandlers() { 
    document.querySelectorAll('.money-format').forEach(i => i.addEventListener('input', e => {
        let v = e.target.value.replace(/[^0-9]/g,''); e.target.value = v.replace(/\B(?=(\d{3})+(?!\d))/g,',');
    }));
}

console.log("수정완료");
