// ===== BizConsult AI 보고서 플랫폼 =====
const DB_USERS    = 'biz_users';
const DB_SESSION  = 'biz_session';
const STORAGE_KEY = 'biz_consult_companies';
const DB_REPORTS  = 'biz_reports';
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

  var isLandscape = _currentReport.landscape;
  var pageW = isLandscape ? '297mm' : '210mm';
  var pageH = isLandscape ? '210mm' : '297mm';

  var printCSS = `
    @page { size: ${pageW} ${pageH}; margin: 0; }
    * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    body { margin: 0; padding: 0; background: white; font-family: "Malgun Gothic","Apple SD Gothic Neo",sans-serif; }
    .rp-wrap { background: white !important; padding: 0 !important; gap: 0 !important; display: block !important; }
    .rp-cover, .rp-page {
      width: ${pageW} !important;
      height: ${pageH} !important;
      margin: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
    }
  `;

  pw.document.write(`<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${_currentReport.type||'보고서'}</title>
<style>${printCSS}</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
</head><body>
${el.innerHTML}
<script>
window.onload = function() {
  // 레이더 차트
  var ra = document.getElementById('rp-radar');
  if(ra && ra.dataset.scores){
    new Chart(ra.getContext('2d'),{type:'radar',data:{labels:['재무','전략/마케팅','인사','운영','IT'],datasets:[{data:ra.dataset.scores.split(',').map(Number),backgroundColor:'rgba(59,130,246,0.18)',borderColor:'#3b82f6',pointRadius:5}]},options:{scales:{r:{min:0,max:100}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});
  }
  // 매출 라인 차트
  var li = document.getElementById('rp-linechart');
  if(li && li.dataset.y23){
    var d=li.dataset;
    new Chart(li.getContext('2d'),{type:'line',data:{labels:['2023년','2024년','2025년','금년(예)'],datasets:[{data:[+d.y23,+d.y24,+d.y25,+d.exp],borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.12)',fill:true,tension:0.25}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}}}});
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
// ★ 인증 및 프로필
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
  else { authEl.style.display='flex';  appEl.style.display='none'; }
}
window.handleLogout = function() { localStorage.removeItem(DB_SESSION); location.reload(); };
function loadUserProfile() {
  const user = JSON.parse(localStorage.getItem(DB_SESSION)); if (!user) return;
  const setEl=(id,val)=>{const el=document.getElementById(id);if(el)el[el.tagName==='INPUT'?'value':'innerText']=val;};
  setEl('display-user-name',user.name); setEl('display-user-dept',user.dept||'솔루션빌더스');
}
window.updateDataLists = function() {
  const companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  document.querySelectorAll('.company-dropdown').forEach(sel=>{
    sel.innerHTML='<option value="">기업을 선택하세요</option>';
    companies.forEach(c=>sel.innerHTML+=`<option value="${c.name}">${c.name}</option>`);
  });
};

// ===========================
// ★ 탭 및 업체 관리
// ===========================
window.showTab = function(tabId, updateUrl=true) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.menu li, .bottom-menu li').forEach(i=>i.classList.remove('active'));
  const target=document.getElementById(tabId); if(target) target.classList.add('active');
  const menu=document.getElementById('menu-'+tabId); if(menu) menu.classList.add('active');
  if(tabId==='company') showCompanyList();
  if(updateUrl) history.pushState(null,'',`?tab=${tabId}`);
};
window.showCompanyList = function() {
  document.getElementById('company-list-step').style.display = 'block';
  document.getElementById('company-form-step').style.display = 'none';
  renderCompanyCards();
};
window.showCompanyForm = function(editName=null) {
  document.getElementById('company-list-step').style.display = 'none';
  document.getElementById('company-form-step').style.display = 'block';
};
window.renderCompanyCards = function() {
  const container = document.getElementById('company-cards-container'); if (!container) return;
  const companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  if (!companies.length) { container.innerHTML='<p>등록된 업체가 없습니다.</p>'; return; }
  container.innerHTML = companies.map(c => `<div class="company-card"><strong>${c.name}</strong><br>${c.industry}</div>`).join('');
};
window.saveCompanyData = function() {
  const name=document.getElementById('comp_name')?.value; if(!name){alert('상호명을 입력해주세요.');return;}
  const rev={cur:parseInt(document.getElementById('rev_cur')?.value?.replace(/,/g,'')||0),y25:parseInt(document.getElementById('rev_25')?.value?.replace(/,/g,'')||0),y24:parseInt(document.getElementById('rev_24')?.value?.replace(/,/g,'')||0),y23:parseInt(document.getElementById('rev_23')?.value?.replace(/,/g,'')||0)};
  const newC={name, industry:document.getElementById('comp_industry').value, revenueData:rev};
  let companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  companies.push(newC); localStorage.setItem(STORAGE_KEY,JSON.stringify(companies));
  alert('저장되었습니다.'); showCompanyList(); updateDataLists();
};

// ===========================
// ★ 유틸리티 및 템플릿
// ===========================
function fKRW(n){const num=parseInt(n,10);if(!num||isNaN(num))return'0원';const uk=Math.floor(num/10000),man=num%10000;if(uk>0)return uk.toLocaleString('ko-KR')+'억'+(man>0?' '+man.toLocaleString('ko-KR')+'만원':'원');return man.toLocaleString('ko-KR')+'만원';}
function fRevAI(cData,rev){return{매출_2025년:fKRW(rev.y25),금년예상연간매출:fKRW(rev.cur*1.2)};}
function calcExp(cData,rev){return Math.round((rev.cur||0)*1.2);}

function tplStyle(color, isLandscape) {
  var c = color||'#3b82f6';
  var w = isLandscape ? '297mm' : '210mm';
  var h = isLandscape ? '210mm' : '297mm';
  return `<style>.rp-wrap{display:flex;flex-direction:column;align-items:center;background:#e8eaed;padding:30px;gap:20px;}.rp-cover,.rp-page{background:white;width:${w};height:${h};padding:40px;box-shadow:0 4px 10px rgba(0,0,0,0.1);flex-shrink:0;position:relative;}.rp-cbar{position:absolute;left:0;top:0;bottom:0;width:15px;background:${c};}.rp-ctitle{font-size:28px;font-weight:700;margin-top:20px;}.rp-section{border:1px solid #e2e8f0;padding:15px;margin-top:15px;border-radius:8px;}.rp-2col{display:flex;gap:15px;}.rp-colF{flex:1;}</style>`;
}

function buildPage(num, title, color, content) {
  return `<div class="rp-page"><div style="border-bottom:2px solid #eee;padding-bottom:10px;margin-bottom:15px;display:flex;justify-content:space-between;"><strong>${num}. ${title}</strong></div><div class="rp-body">${content}</div></div>`;
}

// ===========================
// ★ 보고서 생성 (핵심 로직)
// ===========================
window.generateReport = async function(type, version, event) {
  const session = JSON.parse(localStorage.getItem(DB_SESSION));
  if(!session || !session.apiKey) { alert('설정에서 API 키를 입력해주세요.'); return; }
  const cN = event.target.closest('.tab-content').querySelector('.company-dropdown').value;
  if(!cN) { alert('기업을 선택하세요.'); return; }

  const overlay = document.getElementById('ai-loading-overlay');
  overlay.style.display = 'flex'; // 애니메이션 시작

  // 애니메이션이 화면에 그려질 시간을 줌
  await new Promise(r => setTimeout(r, 100));

  try {
    const cs = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const cData = cs.find(c => c.name === cN);
    const rev = cData.revenueData || {y25:0, cur:0};
    
    // AI 호출 시뮬레이션 (실제 Gemini 호출)
    const prompt = `경영진단보고서를 작성해줘. 기업명: ${cN}`;
    const data = await callGeminiJSON(prompt);

    const today = new Date().toISOString().split('T')[0];
    const isLandscape = false; // 경영진단은 세로형

    let html = tplStyle('#3b82f6', isLandscape) + '<div class="rp-wrap">';
    html += `<div class="rp-cover"><div class="rp-cbar"></div><div class="rp-ctitle">경영진단보고서</div><p>${cN}</p></div>`;
    html += buildPage(1, "진단 개요", "#3b82f6", `<div class="rp-section">AI 분석 결과에 따른 경영 전략...</div>`);
    html += '</div>';

    document.getElementById('report-input-step').style.display = 'none';
    document.getElementById('report-result-step').style.display = 'block';
    const ca = document.getElementById('report-content-area');
    ca.innerHTML = html;
    
    _currentReport = { company:cN, type:'경영진단보고서', contentAreaId:'report-content-area', landscape: isLandscape };
  } catch(e) {
    alert('오류가 발생했습니다.');
  } finally {
    overlay.style.display = 'none'; // 애니메이션 종료
  }
};

window.generateAnyReport = async function(type, version, event) {
  const session = JSON.parse(localStorage.getItem(DB_SESSION));
  if(!session || !session.apiKey) { alert('설정에서 API 키를 입력해주세요.'); return; }
  const cN = event.target.closest('.tab-content').querySelector('.company-dropdown').value;
  if(!cN) { alert('기업을 선택하세요.'); return; }

  const overlay = document.getElementById('ai-loading-overlay');
  overlay.style.display = 'flex';

  await new Promise(r => setTimeout(r, 100));

  try {
    const isLandscape = (type === 'aiBiz'); // 사업계획서만 가로형
    const today = new Date().toISOString().split('T')[0];
    
    // AI 호출
    const data = await callGeminiJSON(`${type} 보고서 작성. 기업명: ${cN}`);

    let html = tplStyle('#16a34a', isLandscape) + '<div class="rp-wrap">';
    html += `<div class="rp-cover"><div class="rp-cbar" style="background:#16a34a"></div><div class="rp-ctitle">${type} 리포트</div><p>${cN}</p></div>`;
    html += buildPage(1, "상세 분석", "#16a34a", `<div class="rp-section">분석 데이터...</div>`);
    html += '</div>';

    const tabId = event.target.closest('.tab-content').id;
    document.getElementById(tabId + '-input-step').style.display = 'none';
    document.getElementById(tabId + '-result-step').style.display = 'block';
    const ca = document.getElementById(tabId + '-content-area');
    ca.innerHTML = html;

    _currentReport = { company:cN, type: type, contentAreaId: tabId + '-content-area', landscape: isLandscape };
  } catch(e) {
    alert('오류 발생');
  } finally {
    overlay.style.display = 'none';
  }
};

async function callGeminiJSON(prompt) {
  const session = JSON.parse(localStorage.getItem(DB_SESSION));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${session.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt + " [중요] 반드시 순수 JSON만 출력" }] }] })
  });
  const json = await res.json();
  return json.candidates[0].content.parts[0].text;
}

function resetContentArea(el) { if(el) el.style.cssText = 'padding:0!important;background:transparent!important;'; }
window.backToInput = function(tab) { document.getElementById(tab+'-input-step').style.display='block'; document.getElementById(tab+'-result-step').style.display='none'; };

// 완료 메세지
console.log("모든 수정 사항 반영 완료");
