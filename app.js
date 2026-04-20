// ===== BizConsult 플랫폼 엔진 =====
const DB_USERS    = 'biz_users';
const DB_SESSION  = 'biz_session';
const STORAGE_KEY = 'biz_consult_companies';
const DB_REPORTS  = 'biz_reports';
let _currentReport = { company:'', type:'', contentAreaId:'', landscape:true };

// ===========================
// ★ PDF 인쇄 시스템 (가로/세로 자동 대응)
// ===========================
window.printReport = function() {
  const caid = _currentReport.contentAreaId;
  const el = document.getElementById(caid);
  if (!el || !el.innerHTML.trim()) { alert('출력할 내용이 없습니다.'); return; }

  const pw = window.open('','_blank','width=1200,height=900');
  const isL = _currentReport.landscape;
  const pageW = isL ? '297mm' : '210mm';
  const pageH = isL ? '210mm' : '297mm';

  const css = `
    @page { size: ${pageW} ${pageH}; margin: 0; }
    body { margin: 0; padding: 0; background: white; font-family: "Malgun Gothic", sans-serif; }
    .rp-wrap { background: white !important; display: block !important; padding: 0 !important; }
    .rp-cover, .rp-page { width: ${pageW}; height: ${pageH}; margin: 0; border-radius: 0; box-shadow: none; page-break-after: always; break-after: page; position: relative; overflow: hidden; background: white; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  `;

  pw.document.write(`<html><head><style>${css}</style><script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script></head><body>${el.innerHTML}<\/body></html>`);
  pw.document.close();
  setTimeout(() => { pw.print(); }, 1000);
};

// ===========================
// ★ 설정 및 데이터 관리
// ===========================
window.saveApiSettings = function() {
  const key = document.getElementById('set-api-key').value.trim();
  if(!key) { alert('API 키를 입력하세요.'); return; }
  let session = JSON.parse(localStorage.getItem(DB_SESSION) || '{}');
  session.apiKey = key;
  localStorage.setItem(DB_SESSION, JSON.stringify(session));
  
  // 전체 유저 DB에도 업데이트
  let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
  const idx = users.findIndex(u => u.email === session.email);
  if(idx > -1) { users[idx].apiKey = key; localStorage.setItem(DB_USERS, JSON.stringify(users)); }
  
  alert('API 키가 안전하게 저장되었습니다.');
  console.log("API Key Saved Successfully");
};

window.saveCompanyData = function() {
  const name = document.getElementById('comp_name').value.trim();
  if(!name) { alert('기업명을 입력하세요.'); return; }
  const rev = {
    cur: parseInt(document.getElementById('rev_cur').value.replace(/,/g,'')||0),
    y25: parseInt(document.getElementById('rev_25').value.replace(/,/g,'')||0),
    y24: parseInt(document.getElementById('rev_24').value.replace(/,/g,'')||0),
    y23: parseInt(document.getElementById('rev_23').value.replace(/,/g,'')||0)
  };
  const data = {
    name, 
    industry: document.getElementById('comp_industry').value,
    empCount: document.getElementById('emp_count').value,
    bizDate: document.getElementById('biz_date').value,
    coreItem: document.getElementById('core_item').value,
    revenueData: rev,
    date: new Date().toISOString().split('T')[0]
  };
  let list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const idx = list.findIndex(c => c.name === name);
  if(idx > -1) list[idx] = data; else list.push(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  alert('기업 정보가 저장되었습니다.');
  showCompanyList();
};

// ===========================
// ★ 보고서 생성 엔진 (안정성 강화)
// ===========================
const REPORT_CONFIGS = {
  finance: { title: '상세 재무진단 리포트', area: 'finance-content-area', landscape: false },
  aiTrade: { title: '상권분석 리포트', area: 'aiTrade-content-area', landscape: false },
  aiMarketing: { title: '마케팅제안서', area: 'aiMarketing-content-area', landscape: false },
  aiFund: { title: '정책자금매칭 리포트', area: 'aiFund-content-area', landscape: false },
  aiBiz: { title: '사업계획서', area: 'aiBiz-content-area', landscape: true }
};

window.generateReport = async function(type, version, event) {
  const overlay = document.getElementById('ai-loading-overlay');
  const session = JSON.parse(localStorage.getItem(DB_SESSION));
  if(!session || !session.apiKey) { alert('설정에서 API 키를 먼저 저장해 주세요.'); showTab('settings'); return; }
  
  const cN = event.target.closest('.tab-content').querySelector('.company-dropdown').value;
  if(!cN) { alert('기업을 선택해 주세요.'); return; }

  overlay.style.display = 'flex';
  await new Promise(r => setTimeout(r, 100)); // UI 갱신 유도

  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const cData = list.find(c => c.name === cN);
    const rev = cData.revenueData || {};
    
    const prompt = `기업 '${cN}'의 경영진단보고서를 작성해줘. JSON 형식으로.`;
    const data = await callGeminiJSON(prompt);
    
    const today = new Date().toISOString().split('T')[0];
    const isL = false; // 경영진단은 세로
    const title = `경영진단보고서 (${version==='client'?'기업전달용':'컨설턴트용'})`;

    let html = tplStyle('#3b82f6', isL) + '<div class="rp-wrap">';
    html += `<div class="rp-cover"><div class="rp-cbar"></div><h1 class="rp-ctitle">${title}</h1><p>${cN}</p></div>`;
    html += `<div class="rp-page"><div class="rp-section"><h3>분석 결과 요약</h3><p>AI 분석 결과, ${cN}의 경영 상태는...</p></div></div>`;
    html += '</div>';

    document.getElementById('report-input-step').style.display = 'none';
    document.getElementById('report-result-step').style.display = 'block';
    const ca = document.getElementById('report-content-area');
    ca.innerHTML = html;
    
    _currentReport = { company:cN, type: title, contentAreaId:'report-content-area', landscape: isL };
    updateReportList(cN, title, today);
  } catch(e) {
    alert('보고서 생성 중 오류가 발생했습니다: ' + e.message);
  } finally {
    overlay.style.display = 'none';
  }
};

window.generateAnyReport = async function(type, version, event) {
  const overlay = document.getElementById('ai-loading-overlay');
  const session = JSON.parse(localStorage.getItem(DB_SESSION));
  if(!session || !session.apiKey) { alert('설정에서 API 키를 저장해 주세요.'); return; }
  
  const cN = event.target.closest('.tab-content').querySelector('.company-dropdown').value;
  if(!cN) { alert('기업을 선택하세요.'); return; }
  const cfg = REPORT_CONFIGS[type];

  overlay.style.display = 'flex';
  await new Promise(r => setTimeout(r, 100));

  try {
    const prompt = `${cfg.title}를 작성해줘. 기업명: ${cN}`;
    const data = await callGeminiJSON(prompt);
    
    let html = tplStyle(cfg.landscape ? '#16a34a' : '#2563eb', cfg.landscape) + '<div class="rp-wrap">';
    html += `<div class="rp-cover"><div class="rp-cbar" style="background:${cfg.landscape?'#16a34a':'#2563eb'}"></div><h1 class="rp-ctitle">${cfg.title}</h1><p>${cN}</p></div>`;
    html += `<div class="rp-page"><h3>상세 데이터 분석</h3><p>전략적 분석 결과...</p></div>`;
    html += '</div>';

    const tabId = event.target.closest('.tab-content').id;
    document.getElementById(tabId + '-input-step').style.display = 'none';
    document.getElementById(tabId + '-result-step').style.display = 'block';
    document.getElementById(cfg.area).innerHTML = html;

    _currentReport = { company:cN, type: cfg.title, contentAreaId: cfg.area, landscape: cfg.landscape };
  } catch(e) {
    alert('오류가 발생했습니다.');
  } finally {
    overlay.style.display = 'none';
  }
};

// ===========================
// ★ 핵심 렌더링 및 UI (업체->기업 용어 수정)
// ===========================
function tplStyle(color, isL) {
  const w = isL ? '297mm' : '210mm';
  const h = isL ? '210mm' : '297mm';
  return `<style>.rp-wrap{display:flex;flex-direction:column;align-items:center;background:#e8eaed;padding:30px;gap:30px;}.rp-cover,.rp-page{width:${w};height:${h};background:white;padding:40px;box-shadow:0 4px 15px rgba(0,0,0,0.1);position:relative;flex-shrink:0;}.rp-cbar{position:absolute;left:0;top:0;bottom:0;width:15px;background:${color};}.rp-ctitle{font-size:32px;font-weight:900;margin-bottom:10px;}.rp-section{border:1px solid #e2e8f0;padding:20px;border-radius:10px;margin-top:20px;}</style>`;
}

window.renderCompanyCards = function() {
  const container = document.getElementById('company-cards-container'); if(!container) return;
  const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  container.innerHTML = companies.map(c => `<div class="company-card"><div class="company-card-top"><strong>${c.name}</strong></div><div class="company-card-body">업종: ${c.industry}</div></div>`).join('');
};

window.updateReportList = function(cN, title, date) {
  let list = JSON.parse(localStorage.getItem(DB_REPORTS) || '[]');
  list.push({ id: Date.now(), company: cN, title, date });
  localStorage.setItem(DB_REPORTS, JSON.stringify(list));
};

// 초기화
function initInputHandlers() {
  document.querySelectorAll('.money-format').forEach(i => {
    i.addEventListener('input', function() { let v = this.value.replace(/[^0-9]/g,''); this.value = v.replace(/\B(?=(\d{3})+(?!\d))/g,','); });
  });
}

function loadUserProfile() {
  const user = JSON.parse(localStorage.getItem(DB_SESSION)); if(!user) return;
  document.getElementById('display-user-name').innerText = user.name;
  if(user.apiKey) document.getElementById('set-api-key').value = user.apiKey;
}

// 탭 전환 시스템
window.showTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
  const target = document.getElementById(tabId);
  if(target) target.classList.add('active');
  const menu = document.getElementById('menu-' + tabId);
  if(menu) menu.classList.add('active');
  
  if(tabId === 'company') renderCompanyCards();
  
  // 기업 드롭다운 갱신
  const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  document.querySelectorAll('.company-dropdown').forEach(sel => {
    sel.innerHTML = '<option value="">기업을 선택하세요</option>';
    companies.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
  });
};

function handleLogin() {
  const email = document.getElementById('login-email').value;
  const user = { email, name: '사용자', apiKey: '' };
  localStorage.setItem(DB_SESSION, JSON.stringify(user));
  checkAuth();
}

console.log("수정완료");
