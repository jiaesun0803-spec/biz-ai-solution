// ===== CONSTANTS =====
const DB_USERS = 'biz_users';
const DB_SESSION = 'biz_session';
const STORAGE_KEY = 'biz_consult_companies';
const DB_REPORTS = 'biz_reports';

let _currentReport = { company:'', type:'', contentAreaId:'', landscape:true };

// ===== CONSTANTS =====


// ===========================
// ★ PDF 출력 (항상 가로형 A4)
// ===========================
window.printReport = function() {
  var company  = _currentReport.company  || '';
  var type     = _currentReport.type     || 'AI 보고서';
  var title    = company ? (company + ' - ' + type) : type;

  var reportHTML = '';
  var id = _currentReport.contentAreaId;
  if (id) { var el = document.getElementById(id); if (el && el.innerHTML.trim()) reportHTML = el.innerHTML; }
  if (!reportHTML) {
    ['aiBiz-content-area','report-content-area','finance-content-area','aiFund-content-area','aiTrade-content-area','aiMarketing-content-area'].forEach(function(aid){
      if (!reportHTML) { var e2 = document.getElementById(aid); if (e2 && e2.innerHTML.trim()) reportHTML = e2.innerHTML; }
    });
  }
  if (!reportHTML) { alert('출력할 보고서가 없습니다.'); return; }

  var curMonth   = new Date().getMonth();
  var brd = (function(){ try { var cs=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); var c=cs.find(function(x){return x.name===company;}); return (c&&c.revenueData)?c.revenueData:{}; } catch(e){return{};} })();
  var avgM = (brd.cur && curMonth>0) ? Math.round(brd.cur/curMonth) : (brd.y25 ? Math.round(brd.y25/12) : 3000);

  var pw = window.open('','_blank','width=1400,height=900');
  var h = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>' + title + '</title>'
    + '<style>'
    + '*{-webkit-print-color-adjust:exact!important;color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box;font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;}'
    + '@page{size:A4 landscape;margin:8mm;}'
    + 'body{margin:0;padding:0;background:white;font-size:12px;}'
    + '.tp-wrap{background:white!important;padding:0!important;}'
    + '.tp-cover{border-radius:0!important;margin:0!important;page-break-after:always!important;break-after:page!important;min-height:182mm!important;padding:16px 16px 14px 24px!important;}'
    + '.tp-page{border-radius:0!important;margin:0!important;border:none!important;page-break-before:always!important;break-before:page!important;padding:12px 16px!important;min-height:182mm!important;}'
    + '</style>'
    + '<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>'
    + '</head><body>' + reportHTML
    + '<script>window.onload=function(){'
    + 'var ra=document.getElementById("rp-radar");'
    + 'if(ra&&ra.dataset&&ra.dataset.scores){var sc=ra.dataset.scores.split(",").map(Number);new Chart(ra.getContext("2d"),{type:"radar",data:{labels:["재무","전략/마케팅","인사","운영","IT"],datasets:[{data:sc,backgroundColor:"rgba(59,130,246,0.15)",borderColor:"#3b82f6",pointBackgroundColor:"#1e3a8a",pointRadius:4}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});}'
    + 'var li=document.getElementById("rp-linechart");'
    + 'if(li&&li.dataset&&li.dataset.y23!==undefined){var ld=li.dataset;new Chart(li.getContext("2d"),{type:"line",data:{labels:["23년","24년","25년","금년(예)"],datasets:[{data:[+ld.y23||0,+ld.y24||0,+ld.y25||0,+ld.exp||0],borderColor:"#3b82f6",backgroundColor:"rgba(59,130,246,0.1)",borderWidth:2,pointRadius:4,fill:true,tension:0.2}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v>=10000?Math.floor(v/10000)+"억":v.toLocaleString()+"만";}}}}}});}'
    + 'var de=document.getElementById("fp-donut");'
    + 'if(de&&de.dataset&&de.dataset.names){var dn=de.dataset.names.split("|");var dr=de.dataset.ratios.split(",").map(Number);new Chart(de.getContext("2d"),{type:"doughnut",data:{labels:dn,datasets:[{data:dr,backgroundColor:["#2563eb","#7c3aed","#06b6d4","#16a34a","#ea580c"],borderWidth:2,borderColor:"white"}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:"60%"}});}'
    + 'var fg=document.getElementById("fp-growth-chart");'
    + 'if(fg){new Chart(fg.getContext("2d"),{type:"line",data:{labels:["2026","2027","2028"],datasets:[{data:[14,24,35],borderColor:"#7c3aed",backgroundColor:"rgba(124,58,237,0.1)",borderWidth:2,pointRadius:5,fill:true,tension:0.2}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v+"억";}}}}}}));}'
    + 'var tr=document.getElementById("tp-radar");'
    + 'if(tr&&tr.dataset&&tr.dataset.scores){var ts=tr.dataset.scores.split(",").map(Number);new Chart(tr.getContext("2d"),{type:"radar",data:{labels:["유동인구","접근성","성장성","경쟁강도","가시성"],datasets:[{data:ts,backgroundColor:"rgba(13,148,136,0.15)",borderColor:"#0d9488",pointBackgroundColor:"#0d9488",pointRadius:4}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});}'
    + 'var tl=document.getElementById("tp-linechart");'
    + 'if(tl&&tl.dataset&&tl.dataset.s0){var td=tl.dataset;new Chart(tl.getContext("2d"),{type:"line",data:{labels:["현재","6개월","1년","2년"],datasets:[{data:[+td.s0,+td.s1,+td.s2,+td.s3],borderColor:"#0d9488",backgroundColor:"rgba(13,148,136,0.1)",borderWidth:2,pointRadius:5,fill:true,tension:0.2}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return Math.round(v/1000)+"천만";}}}}}});}'
    + 'var md=document.getElementById("mp-donut");'
    + 'if(md&&md.dataset&&md.dataset.names){var mn=md.dataset.names.split("|");var mr=md.dataset.ratios.split(",").map(Number);new Chart(md.getContext("2d"),{type:"doughnut",data:{labels:mn,datasets:[{data:mr,backgroundColor:["#db2777","#9d174d","#f4c0d1","#fdf2f8"],borderWidth:2,borderColor:"white"}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:"60%"}});}'
    + 'var bm=document.getElementById("bp-market-chart");'
    + 'if(bm){new Chart(bm.getContext("2d"),{type:"line",data:{labels:["2016","2017","2018","2019","2020","2021","2022"],datasets:[{data:[2,2.4,3,3.8,4.5,5.8,7],borderColor:"#16a34a",backgroundColor:"rgba(22,163,74,0.1)",borderWidth:2,pointRadius:3,fill:true,tension:0.3}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v+"조";}}}}}}})'
    + 'var bc=document.getElementById("biz-monthly-chart");'
    + 'if(bc){var ms=["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];var cm=' + curMonth + ',av=' + avgM + ',ac=[],fc=[];'
    + 'for(var i=0;i<12;i++){if(i<cm){ac.push(Math.round(av*(0.88+i*0.025)));fc.push(null);}else{ac.push(null);fc.push(Math.round(av*Math.pow(1.05,i-cm+1)));};}'
    + 'new Chart(bc.getContext("2d"),{type:"bar",data:{labels:ms,datasets:[{label:"실적",data:ac,backgroundColor:"rgba(22,163,74,0.7)",borderColor:"#16a34a",borderWidth:1,borderRadius:4},{label:"예측",data:fc,backgroundColor:"rgba(59,130,246,0.45)",borderColor:"#3b82f6",borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:"top",labels:{font:{size:10}}}},scales:{y:{ticks:{callback:function(v){return v>=10000?Math.floor(v/10000)+"억":Math.round(v/1000)+"천만";}}}}}});}'
    + 'setTimeout(function(){window.print();window.close();},1000);};'
    + '<\/script></body></html>';
  pw.document.write(h);
  pw.document.close();
};

// ===========================
// ★ 초기화
// ===========================
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
// ★ 통일된 타이포그래피 + 가로형 템플릿 CSS
// ===========================
function tplStyle(color) {
  return '<style>'
  // ── 기본 리셋 ──
  + '.tp-wrap{font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;background:#e8eaed;padding:10px;border-radius:8px;}'
  + '.tp-wrap *{box-sizing:border-box;font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;}'
  // ── 표지 (가로형) ──
  + '.tp-cover{background:white;border-radius:7px;margin-bottom:10px;padding:18px 18px 14px 28px;position:relative;min-height:155px;display:flex;flex-direction:column;overflow:hidden;}'
  + '.tp-cbar{position:absolute;left:0;top:0;bottom:0;width:8px;background:' + color + ';}'
  + '.tp-cbadge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;display:inline-block;margin-bottom:4px;letter-spacing:0.3px;}'
  + '.tp-ctitle{font-size:18px;font-weight:700;color:#0f172a;margin-bottom:2px;letter-spacing:-0.5px;line-height:1.2;}'
  + '.tp-csub{font-size:11px;color:#64748b;margin-bottom:10px;}'
  + '.tp-cinfo{margin-top:auto;}'
  + '.tp-ctbl{width:100%;border-collapse:collapse;font-size:11px;background:#f8fafc;border-radius:4px;margin-bottom:7px;}'
  + '.tp-ctbl th{padding:5px 8px;text-align:left;font-weight:700;color:' + color + ';width:20%;border-bottom:1px solid #e2e8f0;font-size:11px;}'
  + '.tp-ctbl td{padding:5px 8px;color:#334155;border-bottom:1px solid #e2e8f0;font-size:11px;}'
  + '.tp-ctbl tr:last-child th,.tp-ctbl tr:last-child td{border-bottom:none;}'
  + '.tp-cfoot{display:flex;justify-content:space-between;font-size:11px;color:#64748b;padding-top:6px;border-top:1px solid #e2e8f0;margin-top:6px;}'
  // ── 페이지 ──
  + '.tp-page{background:white;border-radius:7px;margin-bottom:10px;padding:14px 16px;}'
  + '.tp-ph{display:flex;align-items:center;gap:7px;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #f1f5f9;}'
  + '.tp-pnum{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;}'
  + '.tp-ptitle{font-size:14px;font-weight:700;color:#1e293b;}'
  + '.tp-psub{font-size:10px;color:#94a3b8;margin-left:auto;}'
  // ── 섹션 박스 ──
  + '.tp-sb{border-radius:6px;padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;margin-bottom:8px;}'
  + '.tp-sb h4{font-size:12px;font-weight:700;margin:0 0 6px 0;}'
  // ── 그리드 ──
  + '.tp-g2{display:grid;grid-template-columns:1fr 1fr;gap:9px;}'
  + '.tp-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}'
  + '.tp-g4{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;}'
  + '.tp-g5{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;}'
  // ── 지표 카드 ──
  + '.tp-mc{background:white;border-radius:6px;padding:8px;border:1px solid #e2e8f0;text-align:center;}'
  + '.tp-mcl{font-size:10px;color:#94a3b8;margin-bottom:2px;font-weight:400;}'
  + '.tp-mcv{font-size:16px;font-weight:700;line-height:1.2;}'
  + '.tp-mcd{font-size:10px;color:#94a3b8;margin-top:2px;font-weight:400;}'
  // ── 리스트 ──
  + '.tp-lst{display:flex;flex-direction:column;gap:4px;}'
  + '.tp-li{display:flex;align-items:flex-start;gap:5px;font-size:11px;color:#334155;line-height:1.55;font-weight:400;}'
  + '.tp-d{width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-top:5px;}'
  // ── 수평 바 ──
  + '.tp-hbr{margin-bottom:5px;}'
  + '.tp-hbl{display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;font-weight:400;}'
  + '.tp-hbv{font-weight:700;}'
  + '.tp-hbt{height:6px;border-radius:3px;background:#e2e8f0;overflow:hidden;}'
  + '.tp-hbf{height:100%;border-radius:3px;}'
  // ── 3단 로드맵 ──
  + '.tp-rm3{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}'
  + '.tp-rmi{border-radius:6px;padding:8px;background:white;border:1px solid #e2e8f0;}'
  + '.tp-rmph{font-size:11px;font-weight:700;margin-bottom:4px;}'
  + '.tp-rmtk{font-size:10px;color:#64748b;padding-left:7px;position:relative;margin-bottom:2px;line-height:1.4;font-weight:400;}'
  + '.tp-rmtk::before{content:"·";position:absolute;left:0;}'
  // ── 성장 단계 ──
  + '.tp-gph{display:flex;gap:8px;align-items:flex-start;border-radius:6px;padding:8px 10px;margin-bottom:5px;}'
  + '.tp-gphs{background:#eff6ff;border:1px solid #93c5fd;}'
  + '.tp-gphm{background:#f0fdf4;border:1px solid #86efac;}'
  + '.tp-gphl{background:#fdf4ff;border:1px solid #d8b4fe;}'
  + '.tp-gphh{font-size:11px;font-weight:700;white-space:nowrap;min-width:78px;padding-top:2px;}'
  + '.tp-gphs .tp-gphh{color:#1d4ed8;}'
  + '.tp-gphm .tp-gphh{color:#15803d;}'
  + '.tp-gphl .tp-gphh{color:#7c3aed;}'
  + '.tp-gph ul{list-style:none;padding:0;margin:0;flex:1;display:flex;flex-wrap:wrap;gap:2px 10px;}'
  + '.tp-gph li{font-size:10px;padding-left:8px;position:relative;line-height:1.5;color:#334155;width:calc(50% - 5px);font-weight:400;}'
  + '.tp-gph li::before{content:"•";position:absolute;left:0;}'
  + '.tp-gphs li::before{color:#1d4ed8;}'
  + '.tp-gphm li::before{color:#15803d;}'
  + '.tp-gphl li::before{color:#7c3aed;}'
  // ── 차트 박스 ──
  + '.tp-ch{background:white;border-radius:5px;border:1px solid #e2e8f0;padding:7px;}'
  // ── SWOT ──
  + '.tp-swot{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:4px;}'
  + '.tp-sws{background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:8px;}'
  + '.tp-sww{background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:8px;}'
  + '.tp-swo{background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;padding:8px;}'
  + '.tp-swt{background:#fff7ed;border:1px solid #fdba74;border-radius:6px;padding:8px;}'
  + '.tp-swl{font-size:11px;font-weight:700;margin-bottom:5px;}'
  + '.tp-sws .tp-swl{color:#15803d;}'
  + '.tp-sww .tp-swl{color:#dc2626;}'
  + '.tp-swo .tp-swl{color:#1d4ed8;}'
  + '.tp-swt .tp-swl{color:#ea580c;}'
  + '.tp-sw ul{list-style:none;padding:0;margin:0;}'
  + '.tp-sw li{font-size:10px;padding-left:8px;position:relative;margin-bottom:3px;line-height:1.5;color:#334155;font-weight:400;}'
  + '.tp-sw li::before{content:"•";position:absolute;left:0;font-weight:700;}'
  + '.tp-sws li::before{color:#15803d;}'
  + '.tp-sww li::before{color:#dc2626;}'
  + '.tp-swo li::before{color:#1d4ed8;}'
  + '.tp-swt li::before{color:#ea580c;}'
  // ── 비교표 ──
  + '.tp-ctb{width:100%;border-collapse:collapse;font-size:11px;}'
  + '.tp-ctb th{background:#1e3a8a;color:white;padding:6px 7px;text-align:center;border:1px solid #1e40af;font-size:11px;font-weight:700;}'
  + '.tp-ctb td{padding:5px 7px;text-align:center;border:1px solid #e2e8f0;color:#334155;font-size:11px;font-weight:400;}'
  + '.tp-ctb td:first-child{text-align:left;font-weight:700;}'
  + '.tp-ctb td:nth-child(2){background:#f0fdf4;color:#15803d;font-weight:700;}'
  + '.tp-ctb tr:nth-child(even) td{background:#f8fafc;}'
  // ── 자금 표 ──
  + '.tp-ftb{width:100%;border-collapse:collapse;font-size:11px;}'
  + '.tp-ftb th{background:#f0fdf4;border:1px solid #bbf7d0;padding:6px 7px;color:#15803d;font-weight:700;font-size:11px;text-align:center;}'
  + '.tp-ftb td{border:1px solid #e2e8f0;padding:5px 7px;color:#334155;font-size:11px;font-weight:400;}'
  + '.tp-ftb tr:nth-child(even) td{background:#f8fafc;}'
  + '.tp-ftb tfoot td{background:#f0fdf4;font-weight:700;color:#15803d;}'
  // ── 기업현황표 ──
  + '.tp-ovt{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:9px;border-top:2px solid #1e3a8a;}'
  + '.tp-ovt th{background:#eff6ff;border:1px solid #bfdbfe;padding:6px 8px;text-align:left;color:#1e40af;font-weight:700;white-space:nowrap;width:14%;font-size:11px;}'
  + '.tp-ovt td{border:1px solid #e2e8f0;padding:6px 8px;color:#1e293b;font-size:11px;font-weight:400;}'
  // ── 가점추천 카드 ──
  + '.tp-cert{display:flex;align-items:center;gap:8px;background:white;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;margin-bottom:5px;}'
  + '.tp-certi{width:30px;height:30px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}'
  + '.tp-certb{flex:1;}'
  + '.tp-certn{font-size:11px;font-weight:700;color:#1e293b;}'
  + '.tp-certd{font-size:10px;color:#64748b;margin-top:1px;font-weight:400;}'
  + '.tp-certa{text-align:right;}'
  + '.tp-certv{font-size:12px;font-weight:700;}'
  + '.tp-certp{font-size:10px;color:#94a3b8;font-weight:400;}'
  // ── 순위 카드 ──
  + '.tp-rank{background:white;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;margin-bottom:5px;}'
  + '.tp-rh{display:flex;align-items:center;gap:6px;margin-bottom:4px;}'
  + '.tp-rn{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;color:white;}'
  + '.tp-rnm{font-size:11px;font-weight:700;color:#1e293b;}'
  + '.tp-rlm{font-size:11px;font-weight:700;margin-left:auto;}'
  + '.tp-rtgs{display:flex;gap:3px;flex-wrap:wrap;}'
  + '.tp-rtg{font-size:10px;padding:1px 5px;border-radius:3px;font-weight:500;}'
  // ── 체크리스트 ──
  + '.tp-chk{display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:5px;background:white;border:1px solid #e2e8f0;margin-bottom:3px;}'
  + '.tp-chi{width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;}'
  + '.tp-cht{flex:1;font-size:11px;color:#334155;font-weight:400;}'
  + '.tp-chb{font-size:10px;padding:1px 5px;border-radius:3px;font-weight:700;white-space:nowrap;}'
  // ── 컨설턴트 박스 ──
  + '.tp-cons{border-radius:7px;padding:12px 14px;border:1.5px solid #f59e0b;border-left:4px solid #d97706;background:#fffbeb;}'
  + '.tp-cons h3{font-size:13px;font-weight:700;color:#92400e;margin:0 0 9px 0;}'
  + '.tp-inn{border-radius:5px;padding:7px 9px;margin-bottom:6px;background:#fef9ec;border:1px solid #fcd34d;}'
  + '.tp-innt{font-size:11px;font-weight:700;color:#92400e;margin-bottom:4px;}'
  // ── 피드백 박스 ──
  + '.tp-fb{border-radius:5px;padding:7px 9px;border:1px solid #fed7aa;border-left:3px solid #f97316;background:#fff7ed;margin-top:7px;}'
  + '.tp-fbt{font-size:11px;font-weight:700;color:#c2410c;margin-bottom:3px;}'
  // ── 차별점 박스 ──
  + '.tp-diff{border-radius:6px;padding:9px 12px;margin-bottom:6px;}'
  // ── 사업계획서 마무리 ──
  + '.tp-cls{background:#f0fdf4;border-radius:7px;padding:12px 14px;border:1px solid #86efac;margin-bottom:9px;}'
  + '.tp-clst{font-size:12px;font-weight:700;color:#15803d;margin-bottom:7px;border-bottom:1px solid #bbf7d0;padding-bottom:5px;}'
  + '.tp-clstx{font-size:11px;color:#1e293b;line-height:1.85;font-weight:400;}'
  // ── 비교 테이블 ──
  + '.tp-cmpt{width:100%;border-collapse:collapse;font-size:11px;}'
  + '.tp-cmpt th{border:1px solid #fed7aa;padding:5px 6px;font-weight:700;background:#fff7ed;font-size:11px;}'
  + '.tp-cmpt td{padding:5px 6px;border:1px solid #e2e8f0;color:#334155;font-size:11px;font-weight:400;text-align:center;}'
  + '.tp-cmpt td:first-child{text-align:left;}'
  + '.tp-cmpt tr:nth-child(even) td{background:#f8fafc;}'
  // ── 도넛 범례 ──
  + '.tp-dleg{display:flex;flex-direction:column;gap:4px;}'
  + '.tp-dli{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:400;}'
  + '.tp-ddt{width:9px;height:9px;border-radius:2px;flex-shrink:0;}'
  // ── 인쇄 페이지 분리 (A4 landscape) ──
  + '@media print{'
  + '.tp-wrap{background:white!important;padding:0!important;}'
  + '.tp-cover{border-radius:0!important;margin:0!important;page-break-after:always;break-after:page;}'
  + '.tp-page{border-radius:0!important;margin:0!important;border:none!important;page-break-before:always;break-before:page;}'
  + '}'
  + '</style>';
}

// ===========================
// ★ 헬퍼 함수들
// ===========================
function calcExp(cData,rev){
  var regMonth=parseInt((cData.date||'').split('-')[1])||1;
  var months=Math.max(regMonth-1,1);
  return Math.round(((rev.cur||0)/months)*12);
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
  return '<div class="tp-page"><div class="tp-ph"><div class="tp-pnum" style="background:'+numBg+';color:'+numTc+'">'+num+'</div><span class="tp-ptitle">'+title+'</span><span class="tp-psub">'+(sub||'')+'</span></div>'+content+'</div>';
}

// ===========================
// ★ 표지 HTML (가로형)
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
    +'<div class="tp-ctitle">'+config.title+(vLabel?' <span style="font-size:12px;color:#94a3b8">('+vLabel+')</span>':'')+'</div>'
    +'<div class="tp-csub">'+cData.name+' &nbsp;·&nbsp; '+( cData.industry||'-')+'</div>'
    +'<div class="tp-cinfo">'
    +'<table class="tp-ctbl">'
    +'<tr><th>기업명</th><td>'+cData.name+'</td><th>대표자</th><td>'+(cData.rep||'-')+'</td><th>업종</th><td>'+(cData.industry||'-')+'</td><th>설립일</th><td>'+(cData.bizDate||'-')+'</td></tr>'
    +'<tr><th>사업자번호</th><td>'+(cData.bizNum||'-')+'</td><th>상시근로자</th><td>'+(cData.empCount||'-')+'명</td><th>전년 매출</th><td>'+fKRW(safeRev.y25)+'</td><th>금년 예상</th><td>'+fKRW(exp)+'</td></tr>'
    +'</table>'
    +'<div class="tp-cfoot"><span>📅 '+dateStr+'</span><span>👤 '+cName+'</span><span>🏢 '+cDept+'</span></div>'
    +'</div></div>';
}

// ===========================
// ★ 경영진단 기업전달용 (표지+6P)
// ===========================
function buildMgmtClientHTML(d, cData, rev, dateStr) {
  var color='#3b82f6';
  var exp=calcExp(cData,rev);
  var cover=buildCoverHTML(cData,{title:'AI 경영진단보고서',reportKind:'AI 경영진단보고서',version:'client',borderColor:color},rev,dateStr);
  var radar=(d.radar||[65,80,68,70,55]).join(',');
  var bars=d.marketing_bars||{finance:72,strategy:85,operation:68};
  var certs=d.certs||[{name:'벤처기업 인증',effect:'중진공·기보 우대금리 — 추가 자금 한도 확보 가능함',amount:'+2억',period:'6개월 내'},{name:'이노비즈 인증',effect:'기술혁신형 인증 — 기술개발자금 신청 가능함',amount:'+3억',period:'1년 내'},{name:'기업부설연구소',effect:'R&D 세액공제 25% + 기보 기술보증 우대 적용 가능함',amount:'+1.5억',period:'세액공제 병행'},{name:'HACCP 인증',effect:'대형마트·급식 납품 채널 확대로 매출 직접 연결됨',amount:'채널↑',period:'매출 확대'}];
  var cIcons=['🏆','📜','🔬','✅','💡'], cBgs=['#f0fdf4','#eff6ff','#fdf4ff','#fff7ed','#fef9c3'];
  var totalC=certs.filter(function(c){return c.amount&&c.amount!=='채널↑';}).reduce(function(s,c){var n=parseFloat(c.amount.replace(/[^0-9.]/g,''));return s+(isNaN(n)?0:n);},0);

  var p1=tpPage(1,'경영진단 개요','기업현황 요약',color,
    '<div class="tp-g2">'
    +'<div>'
    +'<table class="tp-ovt"><tr><th>기업명</th><td>'+cData.name+'</td><th>업종</th><td>'+(cData.industry||'-')+'</td></tr><tr><th>대표자</th><td>'+(cData.rep||'-')+'</td><th>설립일</th><td>'+(cData.bizDate||'-')+'</td></tr><tr><th>사업자번호</th><td>'+(cData.bizNum||'-')+'</td><th>상시근로자</th><td>'+(cData.empCount||'-')+'명</td></tr><tr><th>전년 매출</th><td>'+fKRW(rev.y25)+'</td><th>금년 예상</th><td>'+fKRW(exp)+'</td></tr></table>'
    +'<div class="tp-g3" style="margin-bottom:8px">'+tpMC('종합 진단 등급',d.grade||'B+',d.grade_desc||'성장 유망',color)+tpMC('매출 성장률',(rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'+21%','전년 대비','#16a34a')+tpMC('핵심 아이템',cData.coreItem||'-','경쟁력 보유','#7c3aed')+'</div>'
    +'</div>'
    +'<div class="tp-sb" style="height:100%"><h4 style="color:'+color+'">진단 목적 및 방향</h4>'+tpLst(d.overview||['기업 현황 분석 중'],color)+'</div>'
    +'</div>'
  );

  var p2=tpPage(2,'재무 현황 분석','매출 추이 · 수익성',color,
    '<div class="tp-g2">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">연도별 매출 추이</h4><div class="tp-ch" style="height:140px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div></div>'
    +'<div>'
    +'<div class="tp-sb" style="margin-bottom:8px"><h4 style="color:'+color+'">재무 강점</h4>'+tpLst(d.finance_strengths||['재무 분석 중'],color)+'</div>'
    +'<div class="tp-sb"><h4 style="color:#f97316">개선 포인트</h4>'+tpLst(d.finance_risks||['개선점 분석 중'],'#f97316')+'</div>'
    +'</div>'
    +'</div>'
  );

  var p3=tpPage(3,'전략 및 마케팅 분석','역량 레이더 · 포지셔닝',color,
    '<div class="tp-g2">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">경영 역량 진단 레이더</h4><div class="tp-ch" style="height:155px"><canvas id="rp-radar" data-scores="'+radar+'" style="width:100%;height:100%"></canvas></div></div>'
    +'<div>'
    +'<div class="tp-sb" style="margin-bottom:8px"><h4 style="color:'+color+'">마케팅 현황</h4>'+tpLst(d.marketing||['마케팅 분석 중'],color)+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">영역별 점수</h4>'+tpHB('재무건전성',bars.finance,bars.finance+'점',color)+tpHB('전략/마케팅',bars.strategy,bars.strategy+'점',color)+tpHB('운영/생산',bars.operation,bars.operation+'점',color)+'</div>'
    +'</div>'
    +'</div>'
  );

  var p4=tpPage(4,'인사·조직 및 운영·생산 분석','조직 역량 · 생산 효율',color,
    '<div class="tp-g3">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">인사·조직</h4>'+tpLst(d.hr||['인사 분석 중'],color)+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">운영·생산</h4>'+tpLst(d.ops||['운영 분석 중'],color)+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">IT·디지털 활용</h4>'+tpLst(d.it||['IT 분석 중'],color)+'</div>'
    +'</div>'
  );

  var p5=tpPage(5,'가점추천','인증 취득 시 정책자금 한도 확대',color,
    '<div class="tp-g2">'
    +'<div>'
    +certs.map(function(c,i){return '<div class="tp-cert"><div class="tp-certi" style="background:'+cBgs[i%cBgs.length]+'">'+cIcons[i%cIcons.length]+'</div><div class="tp-certb"><div class="tp-certn">'+c.name+'</div><div class="tp-certd">'+c.effect+'</div></div><div class="tp-certa"><div class="tp-certv" style="color:'+color+'">'+c.amount+'</div><div class="tp-certp">'+c.period+'</div></div></div>';}).join('')
    +'</div>'
    +'<div>'
    +'<div style="background:#eff6ff;border-radius:7px;padding:14px;border:1px solid #bfdbfe;text-align:center;margin-bottom:8px">'
    +'<div style="font-size:11px;font-weight:700;color:#1e40af;margin-bottom:4px">인증 완료 시 총 추가 한도</div>'
    +'<div style="font-size:22px;font-weight:700;color:'+color+'">최대 +'+(totalC>0?totalC+'억원':'상당액')+'</div>'
    +'<div style="font-size:10px;color:#64748b;margin-top:3px">인증 취득 후 추가 정책자금 조달 가능</div>'
    +'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">인증 취득 전략</h4>'+tpLst(['우선순위: 벤처인증(단기) → 이노비즈(중기) → 부설연구소(중기) → HACCP(장기)','각 인증 취득 후 정책자금 재신청으로 누적 한도 확보 전략 권고','인증 준비와 사업계획서 작성을 동시에 진행하여 시너지 극대화'],'#64748b')+'</div>'
    +'</div>'
    +'</div>'
  );

  var p6=tpPage(6,'개선 방향 및 성장 로드맵','단기·중기·장기',color,
    '<div class="tp-rm3" style="margin-bottom:9px">'
    +'<div class="tp-rmi" style="border-top:3px solid '+color+'"><div class="tp-rmph" style="color:#1d4ed8">⚡ 단기 (6개월)</div>'+(d.roadmap_short||['단기1','단기2','단기3','단기4']).map(function(t){return '<div class="tp-rmtk">'+t+'</div>';}).join('')+'</div>'
    +'<div class="tp-rmi" style="border-top:3px solid #16a34a"><div class="tp-rmph" style="color:#15803d">📈 중기 (1년)</div>'+(d.roadmap_mid||['중기1','중기2','중기3','중기4']).map(function(t){return '<div class="tp-rmtk">'+t+'</div>';}).join('')+'</div>'
    +'<div class="tp-rmi" style="border-top:3px solid #7c3aed"><div class="tp-rmph" style="color:#6d28d9">🌟 장기 (3년)</div>'+(d.roadmap_long||['장기1','장기2','장기3','장기4']).map(function(t){return '<div class="tp-rmtk">'+t+'</div>';}).join('')+'</div>'
    +'</div>'
    +'<div class="tp-sb" style="background:#eff6ff;border-color:#bfdbfe"><h4 style="color:#1e40af">★ 종합 의견</h4>'+tpLst(d.summary||['종합 의견 분석 중'],color)+'</div>'
  );

  return tplStyle(color)+'<div class="tp-wrap">'+cover+p1+p2+p3+p4+p5+p6+'</div>';
}

// ===========================
// ★ 경영진단 컨설턴트용 (표지+7P)
// ===========================
function buildMgmtConsultantHTML(d, cData, rev, dateStr) {
  var color='#3b82f6';
  var exp=calcExp(cData,rev);
  var cover=buildCoverHTML(cData,{title:'AI 경영진단보고서',reportKind:'AI 경영진단보고서',version:'consultant',borderColor:'#1e293b'},rev,dateStr);
  var radar=(d.radar||[65,80,68,70,55]).join(',');
  var bars=d.marketing_bars||{finance:72,strategy:85,operation:68};
  var certs=d.certs||[{name:'벤처인증',effect:'중진공 우대금리 적용',amount:'+2억',period:'6개월'},{name:'이노비즈',effect:'기보 우대 보증',amount:'+3억',period:'1년'}];

  var p1=tpPage(1,'경영진단 개요','기업현황 · 리스크 포함',color,
    '<div class="tp-g2">'
    +'<div>'
    +'<table class="tp-ovt"><tr><th>기업명</th><td>'+cData.name+'</td><th>업종</th><td>'+(cData.industry||'-')+'</td></tr><tr><th>대표자</th><td>'+(cData.rep||'-')+'</td><th>설립일</th><td>'+(cData.bizDate||'-')+'</td></tr><tr><th>전년 매출</th><td>'+fKRW(rev.y25)+'</td><th>금년 예상</th><td>'+fKRW(exp)+'</td></tr></table>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">진단 목적</h4>'+tpLst(d.overview||['진단 목적 분석 중'],color)+'</div>'
    +'</div>'
    +'<div class="tp-sb" style="background:#fffbeb;border-color:#fcd34d"><h4 style="color:#92400e">🚨 핵심 리스크 요약</h4>'+tpLst(d.key_risks||['리스크 분석 중'],'#d97706')+'</div>'
    +'</div>'
  );

  var p2=tpPage(2,'재무 현황 분석','리스크 포함',color,
    '<div class="tp-g2">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">연도별 매출 추이</h4><div class="tp-ch" style="height:140px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div></div>'
    +'<div><div class="tp-sb"><h4 style="color:'+color+'">재무 현황</h4>'+tpLst(d.finance_strengths||['재무 분석 중'],color)+'</div>'+tpFB(d.fb_finance||['재무 리스크 분석 중'])+'</div>'
    +'</div>'
  );

  var p3=tpPage(3,'전략 및 마케팅 분석','취약점 포함',color,
    '<div class="tp-g2">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">역량 레이더</h4><div class="tp-ch" style="height:140px"><canvas id="rp-radar" data-scores="'+radar+'" style="width:100%;height:100%"></canvas></div></div>'
    +'<div>'
    +'<div class="tp-sb" style="margin-bottom:8px"><h4 style="color:'+color+'">영역별 점수</h4>'+tpHB('재무건전성',bars.finance,bars.finance+'점',color)+tpHB('전략/마케팅',bars.strategy,bars.strategy+'점',color)+tpHB('운영/생산',bars.operation,bars.operation+'점',color)+'</div>'
    +tpFB(d.fb_marketing||['마케팅 리스크 분석 중'])
    +'</div>'
    +'</div>'
  );

  var p4=tpPage(4,'인사·조직 및 운영·생산','리스크 중점',color,
    '<div class="tp-g2">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">인사·조직 + 운영·생산</h4>'+tpLst((d.hr||['인사 분석 중']).concat(d.ops||['운영 분석 중']),color)+'</div>'
    +tpFB(d.fb_hr_ops||['인사·운영 리스크 분석 중'])
    +'</div>'
  );

  var p5=tpPage(5,'IT·디지털 및 정부지원 활용','개선 과제',color,
    '<div class="tp-g2">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">IT·디지털 현황</h4>'+tpLst(d.it||['IT 분석 중'],color)+'</div>'
    +tpFB(d.fb_it||['IT 개선 방향 분석 중'])
    +'</div>'
  );

  var p6=tpPage(6,'개선 방향 및 성장 로드맵','우선순위별 실행',color,
    '<div class="tp-rm3" style="margin-bottom:9px">'
    +'<div class="tp-rmi" style="border-top:3px solid '+color+'"><div class="tp-rmph" style="color:#1d4ed8">⚡ 단기</div>'+(d.roadmap_short||['단기1','단기2']).map(function(t){return '<div class="tp-rmtk">'+t+'</div>';}).join('')+'</div>'
    +'<div class="tp-rmi" style="border-top:3px solid #16a34a"><div class="tp-rmph" style="color:#15803d">📈 중기</div>'+(d.roadmap_mid||['중기1','중기2']).map(function(t){return '<div class="tp-rmtk">'+t+'</div>';}).join('')+'</div>'
    +'<div class="tp-rmi" style="border-top:3px solid #7c3aed"><div class="tp-rmph" style="color:#6d28d9">🌟 장기</div>'+(d.roadmap_long||['장기1','장기2']).map(function(t){return '<div class="tp-rmtk">'+t+'</div>';}).join('')+'</div>'
    +'</div>'
    +tpFB(d.fb_roadmap||['로드맵 우선순위 분석 중'])
  );

  var p7=tpPage('🔒','컨설턴트 실질 조언','내부 전용','#d97706',
    '<div class="tp-cons">'
    +'<h3>🔒 컨설턴트 전용 자료 — 대외비</h3>'
    +'<div class="tp-g2">'
    +'<div>'
    +'<div class="tp-inn"><div class="tp-innt">🚨 시급 해결 이슈 TOP 3</div>'+tpLst(d.consultant_issues||['시급 이슈 분석 중'],'#d97706')+'</div>'
    +'<div class="tp-inn"><div class="tp-innt">💰 정책자금 신청 전략</div>'+tpLst(d.consultant_funds||['정책자금 전략 분석 중'],'#d97706')+'</div>'
    +'<div class="tp-inn" style="margin-bottom:0"><div class="tp-innt">📈 마케팅·신용 개선</div>'+tpLst((d.consultant_marketing||[]).concat(d.consultant_credit||['개선 분석 중']),'#d97706')+'</div>'
    +'</div>'
    +'<div>'
    +'<div class="tp-inn"><div class="tp-innt">📜 인증 취득 전략 + 가점추천</div>'
    +'<div style="margin-bottom:6px">'+tpLst(d.consultant_certs||['인증 전략 분석 중'],'#d97706')+'</div>'
    +certs.map(function(c){return '<div class="tp-cert" style="background:white;border:1px solid #fcd34d"><div class="tp-certb"><div class="tp-certn">'+c.name+'</div><div class="tp-certd">'+c.effect+'</div></div><div class="tp-certa"><div class="tp-certv" style="color:#d97706">'+c.amount+'</div><div class="tp-certp">'+c.period+'</div></div></div>';}).join('')
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
  var color='#2563eb';
  var exp=calcExp(cData,rev);
  var cover=buildCoverHTML(cData,{title:'AI 상세 재무진단',reportKind:'AI 상세 재무진단 리포트',vLabel:'리포트',borderColor:color},rev,dateStr);
  var scores=d.scores||{profit:72,stable:80,growth:88};
  var scoreDescs=d.score_descs||{profit:'매출이익률 양호',stable:'부채비율 안정적',growth:'매출 성장률 최우수'};

  function gauge(val,col,lbl,desc){
    var da=Math.round((val/100)*126);
    return '<div class="tp-sb" style="text-align:center">'
      +'<h4 style="color:'+col+';text-align:left;margin-bottom:5px">'+lbl+'</h4>'
      +'<svg viewBox="0 0 100 56" width="80" height="50" style="display:block;margin:0 auto 2px">'
      +'<path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="#e2e8f0" stroke-width="10"/>'
      +'<path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="'+col+'" stroke-width="10" stroke-dasharray="'+da+' '+(126-da)+'" stroke-linecap="round"/>'
      +'<text x="50" y="47" text-anchor="middle" font-size="14" font-weight="700" fill="#1e293b">'+val+'</text>'
      +'</svg>'
      +'<div style="font-size:10px;color:#64748b">'+desc+'</div>'
      +'</div>';
  }

  var debtData=d.debt||[{name:'중진공',ratio:54},{name:'기보',ratio:27},{name:'재단',ratio:19}];
  var debtColors=['#2563eb','#7c3aed','#06b6d4','#16a34a','#ea580c'];
  var profitBars=d.profit_bars||[{label:'매출 성장률(YoY)',value:85,display:'+21%'},{label:'매출이익률',value:62,display:'38%'},{label:'영업이익률',value:44,display:'22%'}];

  var p1=tpPage(1,'재무 종합 현황','수익성·안정성·성장성',color,
    '<div class="tp-g2" style="margin-bottom:8px">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">연도별 매출 추이</h4><div class="tp-ch" style="height:130px"><canvas id="rp-linechart" data-y23="'+(rev.y23||0)+'" data-y24="'+(rev.y24||0)+'" data-y25="'+(rev.y25||0)+'" data-exp="'+(exp||0)+'" style="width:100%;height:100%"></canvas></div></div>'
    +'<div class="tp-g3">'+gauge(scores.profit,color,'수익성',scoreDescs.profit)+gauge(scores.stable,'#16a34a','안정성',scoreDescs.stable)+gauge(scores.growth,'#7c3aed','성장성',scoreDescs.growth)+'</div>'
    +'</div>'
  );

  var p2=tpPage(2,'수익성 및 안정성 분석','부채 구성 · 재무 지표',color,
    '<div class="tp-g3">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">수익성 분석</h4>'+profitBars.map(function(b){return tpHB(b.label,b.value,b.display,color);}).join('')+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">부채 구성 비율</h4>'
    +'<div style="display:flex;align-items:center;gap:9px"><div class="tp-ch" style="width:80px;height:80px;flex-shrink:0;padding:3px;border:none"><canvas id="fp-donut" data-names="'+debtData.map(function(x){return x.name;}).join('|')+'" data-ratios="'+debtData.map(function(x){return x.ratio;}).join(',')+'" style="width:100%;height:100%"></canvas></div>'
    +'<div class="tp-dleg">'+debtData.map(function(dd,i){return '<div class="tp-dli"><div class="tp-ddt" style="background:'+debtColors[i]+'"></div><span style="flex:1">'+dd.name+'</span><span style="font-weight:700">'+dd.ratio+'%</span></div>';}).join('')+'</div></div>'
    +'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">안정성 핵심 지표</h4>'
    +'<div style="display:flex;flex-direction:column;gap:5px">'
    +(d.stable_metrics||[{label:'부채비율',value:'낮음',desc:'전액 정책자금'},{label:'KCB 신용',value:'710점',desc:'3등급'},{label:'NICE 신용',value:'740점',desc:'3등급'},{label:'연체·체납',value:'없음',desc:'리스크 최저'}]).map(function(m){return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f1f5f9"><span style="font-size:11px;color:#64748b">'+m.label+'</span><div style="text-align:right"><div style="font-size:12px;font-weight:700;color:'+color+'">'+m.value+'</div><div style="font-size:10px;color:#94a3b8">'+m.desc+'</div></div></div>';}).join('')
    +'</div></div>'
    +'</div>'
  );

  var p3=tpPage(3,'성장성 분석 및 재무 개선 방향','목표 · 액션플랜',color,
    '<div class="tp-g2">'
    +'<div>'
    +'<div class="tp-sb" style="margin-bottom:8px"><h4 style="color:#7c3aed">성장성 분석</h4>'+tpLst(d.growth_items||['성장성 분석 중'],'#7c3aed')+'</div>'
    +'<div class="tp-sb"><h4 style="color:#7c3aed">3개년 매출 목표</h4><div class="tp-ch" style="height:100px"><canvas id="fp-growth-chart" style="width:100%;height:100%"></canvas></div></div>'
    +'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">재무 개선 우선순위 액션플랜</h4>'
    +'<div class="tp-rm3">'
    +'<div class="tp-rmi" style="border-top:3px solid #ef4444"><div class="tp-rmph" style="color:#dc2626">🔴 즉시 (1개월)</div><div style="font-size:11px;color:#64748b;line-height:1.5;font-weight:400">'+(d.action_urgent||'즉시 실행 과제 분석 중')+'</div></div>'
    +'<div class="tp-rmi" style="border-top:3px solid #f97316"><div class="tp-rmph" style="color:#ea580c">🟠 단기 (3개월)</div><div style="font-size:11px;color:#64748b;line-height:1.5;font-weight:400">'+(d.action_short||'단기 실행 과제 분석 중')+'</div></div>'
    +'<div class="tp-rmi" style="border-top:3px solid '+color+'"><div class="tp-rmph" style="color:#1d4ed8">🔵 중기 (1년)</div><div style="font-size:11px;color:#64748b;line-height:1.5;font-weight:400">'+(d.action_mid||'중기 실행 과제 분석 중')+'</div></div>'
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
  var color='#0d9488';
  var cover=buildCoverHTML(cData,{title:'AI 상권분석 리포트',reportKind:'AI 빅데이터 상권분석',vLabel:'리포트',borderColor:color},rev,dateStr);
  var radar=(d.radar||[82,75,68,72,80]).join(',');
  var sim=d.sim||{s0:9167,s1:12500,s2:16667,s3:25000};
  var target=d.target||{age:'30~40대',household:'1~2인',channel:'온라인',cycle:'월 2~3회'};

  var p1=tpPage(1,'상권 현황 분석','핵심 입지 지표 · 경쟁 분석',color,
    '<div class="tp-g3">'
    +'<div>'
    +'<div class="tp-g3" style="margin-bottom:8px">'+tpMC('유동인구(일평균)',d.traffic||'2,400명','일평균',color)+tpMC('반경1km 경쟁',(d.competitors||7)+'개','직접 경쟁',(parseInt(d.competitors||7)>5)?'#f97316':'#16a34a')+tpMC('입지 등급',d.grade||'B+','상위 30%',color)+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">상권 특성</h4>'+tpLst(d.features||['상권 특성 분석 중'],color)+'</div>'
    +'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">입지 경쟁력 레이더</h4><div class="tp-ch" style="height:150px"><canvas id="tp-radar" data-scores="'+radar+'" style="width:100%;height:100%"></canvas></div></div>'
    +'<div>'
    +'<div class="tp-sb" style="margin-bottom:8px"><h4 style="color:'+color+'">경쟁 현황</h4>'
    +'<div style="display:flex;justify-content:space-around;text-align:center">'
    +'<div><div style="font-size:18px;font-weight:700;color:'+color+'">'+(d.comp_direct||7)+'</div><div style="font-size:10px;color:#64748b">직접 경쟁</div></div>'
    +'<div><div style="font-size:18px;font-weight:700;color:#f97316">'+(d.comp_strong||3)+'</div><div style="font-size:10px;color:#64748b">강성 경쟁</div></div>'
    +'<div><div style="font-size:18px;font-weight:700;color:#16a34a">'+(d.diff_potential||'高')+'</div><div style="font-size:10px;color:#64748b">차별화 여지</div></div>'
    +'</div></div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">운영 전략</h4>'+tpLst(d.strategy||['운영 전략 분석 중'],color)+'</div>'
    +'</div>'
    +'</div>'
  );

  var p2=tpPage(2,'타겟 고객 및 매출 예측','고객 프로파일 · 시뮬레이션',color,
    '<div class="tp-g2">'
    +'<div>'
    +'<div class="tp-sb" style="margin-bottom:8px"><h4 style="color:'+color+'">타겟 고객 프로파일</h4>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">'
    +[['주 연령대',target.age],['가구 유형',target.household],['구매 채널',target.channel],['구매 주기',target.cycle]].map(function(pair){return '<div style="background:white;border-radius:5px;padding:7px;border:1px solid #e2e8f0;text-align:center"><div style="font-size:10px;color:#64748b">'+pair[0]+'</div><div style="font-size:13px;font-weight:700;color:'+color+'">'+pair[1]+'</div></div>';}).join('')
    +'</div></div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">운영 전략 심화</h4>'+tpLst(d.strategy||['전략 분석 중'],color)+'</div>'
    +'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">매출 잠재력 시뮬레이션 (만원/월)</h4>'
    +'<div class="tp-ch" style="height:130px"><canvas id="tp-linechart" data-s0="'+sim.s0+'" data-s1="'+sim.s1+'" data-s2="'+sim.s2+'" data-s3="'+sim.s3+'" style="width:100%;height:100%"></canvas></div>'
    +'<div style="font-size:10px;color:#64748b;margin-top:5px">업종 평균 성장률 달성 시 기준값 (단위: 만원/월)</div>'
    +'</div>'
    +'</div>'
  );

  return tplStyle(color)+'<div class="tp-wrap">'+cover+p1+p2+'</div>';
}

// ===========================
// ★ 마케팅제안 (표지+2P)
// ===========================
function buildMarketingHTML(d, cData, rev, dateStr) {
  var color='#db2777';
  var cover=buildCoverHTML(cData,{title:'AI 마케팅 제안서',reportKind:'AI 맞춤형 마케팅 제안서',vLabel:'제안서',borderColor:color},rev,dateStr);
  var channels=d.channels||[{name:'SNS (인스타·유튜브)',score:88},{name:'네이버 검색광고',score:75},{name:'블로그·리뷰',score:70},{name:'오프라인 판촉',score:42}];
  var budget=d.budget||[{name:'SNS 광고',ratio:40},{name:'검색광고',ratio:25},{name:'콘텐츠',ratio:20},{name:'기타',ratio:15}];
  var budgetColors=['#db2777','#9d174d','#f4c0d1','#fdf2f8'];
  var kpi=d.kpi||[{label:'SNS 팔로워',value:'+3,000',period:'3개월'},{label:'월 온라인 매출',value:'+30%',period:'6개월'},{label:'재구매율',value:'40%',period:'목표'},{label:'리뷰 누적',value:'500건',period:'6개월'}];
  var roadmap=d.roadmap||[{period:'1월',task:'SNS 채널 개설',highlight:false},{period:'2월',task:'블로거 협업',highlight:false},{period:'3월',task:'바이럴 캠페인',highlight:false},{period:'4~5월',task:'성과 분석',highlight:true},{period:'6월',task:'정기구독 론칭',highlight:false},{period:'7월~',task:'오프라인 진출',highlight:false}];

  var p1=tpPage(1,'채널별 마케팅 전략 및 예산','채널 효과 · 예산 배분',color,
    '<div class="tp-g3">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">채널별 예상 효과 (/100)</h4>'+channels.map(function(c,i){return tpHB(c.name,c.score,c.score+'점',i===0?color:i===1?'#be185d':'#9d174d');}).join('')+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">핵심 전략</h4>'+tpLst(d.strategies||['마케팅 전략 분석 중'],color)+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">월 예산 배분 ('+(d.budget_total||'700만원/월')+')</h4>'
    +'<div style="display:flex;align-items:center;gap:9px"><div class="tp-ch" style="width:90px;height:90px;flex-shrink:0;padding:3px;border:none"><canvas id="mp-donut" data-names="'+budget.map(function(b){return b.name;}).join('|')+'" data-ratios="'+budget.map(function(b){return b.ratio;}).join(',')+'" style="width:100%;height:100%"></canvas></div>'
    +'<div class="tp-dleg">'+budget.map(function(b,i){return '<div class="tp-dli"><div class="tp-ddt" style="background:'+budgetColors[i]+'"></div><span style="flex:1">'+b.name+'</span><span style="font-weight:700">'+b.ratio+'%</span></div>';}).join('')+'</div></div>'
    +'</div>'
    +'</div>'
  );

  var p2=tpPage(2,'KPI 목표 및 월별 실행 로드맵','목표 · 타임라인',color,
    '<div class="tp-g4" style="margin-bottom:9px">'+kpi.map(function(k){return tpMC(k.label,k.value,k.period,color);}).join('')+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">월별 실행 로드맵</h4>'
    +'<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-top:3px">'
    +roadmap.map(function(r){return '<div style="border-radius:5px;background:'+(r.highlight?'#f4c0d1':'#fdf2f8')+';border:1px solid '+(r.highlight?color:'#f4c0d1')+';padding:6px 5px"><div style="font-size:10px;font-weight:700;color:'+(r.highlight?'#9d174d':color)+';margin-bottom:2px">'+r.period+'</div><div style="font-size:10px;color:#64748b;line-height:1.4;font-weight:400">'+r.task+'</div></div>';}).join('')
    +'</div></div>'
  );

  return tplStyle(color)+'<div class="tp-wrap">'+cover+p1+p2+'</div>';
}

// ===========================
// ★ 정책자금매칭 (표지+3P)
// ===========================
function buildFundHTML(d, cData, rev, dateStr) {
  var color='#ea580c';
  var cover=buildCoverHTML(cData,{title:'AI 정책자금매칭',reportKind:'AI 정책자금 매칭 리포트',vLabel:'리포트',borderColor:color},rev,dateStr);
  var checks=d.checks||[{text:'중소기업 해당 여부',status:'pass'},{text:'국세·지방세 체납 없음',status:'pass'},{text:'금융연체 이력 없음',status:'pass'},{text:'사업자 등록 유효',status:'pass'},{text:'업력 2년 이상',status:'cond'},{text:'벤처·이노비즈 인증',status:'fail'}];
  var score=d.score||78;
  var gda=Math.round((score/100)*151);
  var funds=d.funds||[{rank:1,name:'중진공 소공인 특화자금',limit:'1억',tags:['금리 2.5%','즉시 신청','제조업 우대']},{rank:2,name:'기보 기술보증 (특허 우대)',limit:'3억',tags:['보증료 0.5%','특허 우대','90% 보증']},{rank:3,name:'소진공 성장촉진자금',limit:'1억',tags:['금리 3.0%','창업 3년 이내','온라인 신청']},{rank:4,name:'지역신보 소액보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤','빠른 처리']},{rank:5,name:'신보 창업기업 특례보증',limit:'2억',tags:['보증료 0.5%','벤처인증 조건부','95% 보증']}];
  var rankColors=[color,'#f97316','#fb923c','#94a3b8','#94a3b8'];
  var comp=d.comparison||[{org:'중진공',limit:'1억',rate:'2.5%',period:'5년',diff:'easy'},{org:'기보',limit:'3억',rate:'0.5%',period:'7년',diff:'mid'},{org:'소진공',limit:'1억',rate:'3.0%',period:'5년',diff:'easy'},{org:'지역신보',limit:'5천만',rate:'0.8%',period:'3년',diff:'easy'}];
  var diffMap={easy:{bg:'#dcfce7',tc:'#166534',l:'쉬움'},mid:{bg:'#fef9c3',tc:'#854d0e',l:'보통'},hard:{bg:'#fee2e2',tc:'#991b1b',l:'어려움'}};

  function chkS(s){return s==='pass'?{bg:'#dcfce7',tc:'#16a34a',ic:'✓',bbc:'#dcfce7',btc:'#166534',bl:'통과'}:s==='cond'?{bg:'#fef9c3',tc:'#ca8a04',ic:'!',bbc:'#fef9c3',btc:'#854d0e',bl:'조건부'}:{bg:'#fee2e2',tc:'#dc2626',ic:'✗',bbc:'#fee2e2',btc:'#991b1b',bl:'미보유'};}

  var p1=tpPage(1,'기업 자격요건 분석','신청 가능 여부 체크',color,
    '<div class="tp-g2">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">기본 자격 체크리스트</h4>'
    +checks.map(function(c){var s=chkS(c.status);return '<div class="tp-chk"><div class="tp-chi" style="background:'+s.bg+';color:'+s.tc+'">'+s.ic+'</div><div class="tp-cht">'+c.text+'</div><span class="tp-chb" style="background:'+s.bbc+';color:'+s.btc+'">'+s.bl+'</span></div>';}).join('')
    +'</div>'
    +'<div class="tp-sb" style="text-align:center"><h4 style="color:'+color+'">신청 가능성 종합 점수</h4>'
    +'<svg viewBox="0 0 130 72" width="120" height="66" style="display:block;margin:0 auto 6px">'
    +'<path d="M14,62 A52,52 0 0,1 116,62" fill="none" stroke="#e2e8f0" stroke-width="14"/>'
    +'<path d="M14,62 A52,52 0 0,1 116,62" fill="none" stroke="'+color+'" stroke-width="14" stroke-dasharray="'+gda+' '+(151-gda)+'" stroke-linecap="round"/>'
    +'<text x="65" y="56" text-anchor="middle" font-size="20" font-weight="700" fill="#1e293b">'+score+'</text>'
    +'</svg>'
    +'<div style="font-size:13px;font-weight:700;color:'+color+'">'+(d.score_desc||'신청 가능')+'</div>'
    +'<div style="font-size:10px;color:#64748b;margin-top:2px">'+(d.match_count||5)+'개 기관 매칭 완료</div>'
    +'<div style="margin-top:9px;text-align:left">'+tpLst(d.score_items||['기본 자격 통과','인증 취득 시 추가 한도 확보 가능'],color)+'</div>'
    +'</div>'
    +'</div>'
  );

  var p2=tpPage(2,'추천 정책자금 TOP 5','한도·금리·특징',color,
    '<div class="tp-g2">'
    +'<div>'+funds.slice(0,3).map(function(f,i){return '<div class="tp-rank" style="'+(i<3?'border-left:3px solid '+rankColors[i]:'')+'">'+'<div class="tp-rh"><div class="tp-rn" style="background:'+rankColors[i]+'">'+f.rank+'</div><span class="tp-rnm">'+f.name+'</span><span class="tp-rlm" style="color:'+rankColors[i]+'">'+f.limit+'</span></div>'+'<div class="tp-rtgs">'+f.tags.map(function(t,j){return '<span class="tp-rtg" style="background:'+(j===0?'#fff7ed':'#f1f5f9')+';color:'+(j===0?'#c2410c':'#475569')+'">'+t+'</span>';}).join('')+'</div></div>';}).join('')+'</div>'
    +'<div>'+funds.slice(3).map(function(f,i){return '<div class="tp-rank"><div class="tp-rh"><div class="tp-rn" style="background:#94a3b8">'+f.rank+'</div><span class="tp-rnm">'+f.name+'</span><span class="tp-rlm" style="color:#64748b">'+f.limit+'</span></div><div class="tp-rtgs">'+f.tags.map(function(t,j){return '<span class="tp-rtg" style="background:'+(j===0?'#fff7ed':'#f1f5f9')+';color:'+(j===0?'#c2410c':'#475569')+'">'+t+'</span>';}).join('')+'</div></div>';}).join('')+'</div>'
    +'</div>'
  );

  var chkReady=d.checklist_ready||['사업자등록증 사본','부가세 신고서 (최근 2년)','국세납부증명서','신용정보 동의서'];
  var chkNeed=d.checklist_need||['사업계획서 (기보 필수)','벤처인증서 (취득 후)'];

  var p3=tpPage(3,'기관별 비교 및 신청 전략','비교표 · 준비 체크',color,
    '<div class="tp-g2">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">기관별 조건 비교표</h4>'
    +'<table class="tp-cmpt"><thead><tr style="background:#fff7ed"><th style="color:'+color+'">기관</th><th style="color:'+color+'">한도</th><th style="color:'+color+'">금리/보증료</th><th style="color:'+color+'">기간</th><th style="color:'+color+'">난이도</th></tr></thead>'
    +'<tbody>'+comp.map(function(c,i){var dm=diffMap[c.diff]||diffMap.easy;return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'><td style="font-weight:700">'+c.org+'</td><td>'+c.limit+'</td><td style="color:#16a34a">'+c.rate+'</td><td>'+c.period+'</td><td><span style="background:'+dm.bg+';color:'+dm.tc+';padding:1px 5px;border-radius:3px;font-size:10px">'+dm.l+'</span></td></tr>';}).join('')
    +'</tbody></table>'
    +'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">신청 준비 체크리스트</h4>'
    +chkReady.map(function(t){return '<div class="tp-chk"><div class="tp-chi" style="background:#dcfce7;color:#16a34a">✓</div><div class="tp-cht">'+t+'</div></div>';}).join('')
    +chkNeed.map(function(t){return '<div class="tp-chk"><div class="tp-chi" style="background:#fee2e2;color:#dc2626">✗</div><div class="tp-cht">'+t+'</div></div>';}).join('')
    +'</div>'
    +'</div>'
  );

  return tplStyle(color)+'<div class="tp-wrap">'+cover+p1+p2+p3+'</div>';
}

// ===========================
// ★ AI 사업계획서 (표지+10P)
// ===========================
function buildBizPlanHTML(d, cData, rev, dateStr) {
  var color='#16a34a';
  var exp=calcExp(cData,rev);
  var cover=buildCoverHTML(cData,{title:'AI 사업계획서',reportKind:'AI 맞춤형 사업계획서',vLabel:'완성본',borderColor:color},rev,dateStr);
  var swot=d.s2_swot||{strength:['폭발적 매출 성장세 보유'],weakness:['소규모 인력(4명)'],opportunity:['HMR 시장 연 18% 성장'],threat:['대형 식품기업 진입 가능']};
  var compRows=d.s4_competitor||[{item:'제품경쟁력',self:'★★★★★',a:'★★★★',b:'★★★'},{item:'기술력(특허)',self:'★★★★★',a:'★★★',b:'★★★'},{item:'가격경쟁력',self:'★★★★',a:'★★★★★',b:'★★★★'},{item:'유통망',self:'★★★',a:'★★★★★',b:'★★★★'},{item:'성장성',self:'★★★★★',a:'★★★',b:'★★★'}];
  var diffs=d.s5_items||[{title:'기술 차별화',text:'돈육 사골 농축 압축 기술 특허 보유 — 경쟁사 진입 방어 가능',color:'#16a34a'},{title:'제품 차별화',text:'1회 분량 개별 포장 — 위생·편의성·보관 동시 확보',color:'#2563eb'},{title:'시장 포지셔닝',text:'HMR 내 돈육 특화 세그먼트 선점 — 틈새 독점 포지션',color:'#7c3aed'},{title:'성장 증명력',text:'창업 1년 만에 11억 달성 — 시장성 검증 완료',color:'#ea580c'}];
  var bgMap={'#16a34a':'#f0fdf4','#2563eb':'#eff6ff','#7c3aed':'#fdf4ff','#ea580c':'#fff7ed'};
  var bdMap={'#16a34a':'#86efac','#2563eb':'#93c5fd','#7c3aed':'#d8b4fe','#ea580c':'#fdba74'};
  var bpCerts=d.s6_certs||[{name:'벤처기업 인증',effect:'중진공·기보 우대금리 — 추가 자금 한도 확보 가능함',amount:'+2억',period:'6개월 내'},{name:'이노비즈 인증',effect:'기술혁신형 인증 — 기술개발자금 신청 가능함',amount:'+3억',period:'1년 내'},{name:'기업부설연구소',effect:'R&D 세액공제 25% + 기보 우대 적용 가능함',amount:'+1.5억',period:'세액공제 병행'},{name:'HACCP 인증',effect:'대형마트·급식 납품 채널 확대로 매출 직접 연결됨',amount:'채널↑',period:'매출 확대'}];
  var bpIcons=['🏆','📜','🔬','✅'],bpBgs=['#f0fdf4','#eff6ff','#fdf4ff','#fff7ed'];
  var totalBp=bpCerts.filter(function(c){return c.amount&&c.amount!=='채널↑';}).reduce(function(s,c){var n=parseFloat(c.amount.replace(/[^0-9.]/g,''));return s+(isNaN(n)?0:n);},0);
  var needFundStr=cData.needFund>0?fKRW(cData.needFund):'4억원';
  var fundRows=d.s7_rows||[{item:'원재료 구입',amount:'1억 5천만원',ratio:'37.5%',purpose:'핵심 원재료 선매입 및 재고 확보'},{item:'생산 설비 투자',amount:'1억원',ratio:'25%',purpose:'반자동 설비 도입 — 원가 20% 절감 목표'},{item:'마케팅·채널 확대',amount:'7천만원',ratio:'17.5%',purpose:'SNS·쿠팡 입점·브랜드 마케팅 집행'},{item:'운전자금',amount:'8천만원',ratio:'20%',purpose:'인건비·공과금·운영 비용'}];
  var kpi9=d.s9_kpi||{y1:'18억',y2:'24억',ch:'5개↑',emp:'11명'};
  var rmYears=d.s9_roadmap||[{year:'2026',tasks:['정책자금 조달','설비 확충','채널 확장']},{year:'2027',tasks:['벤처인증 취득','B2B 납품','신제품 출시']},{year:'2028',tasks:['이노비즈 취득','매출 35억','자동화 완성']},{year:'2029~',tasks:['해외 진출','연구소 설립','매출 100억']}];
  var rmColors=['#16a34a','#2563eb','#7c3aed','#ea580c'];
  var conclusion=d.s10_conclusion||cData.name+'는 창업 이후 폭발적인 매출 성장을 달성한 고성장 초기 기업임. 독보적인 기술력과 특허를 바탕으로 HMR 시장 내 차별화된 포지션을 확보하고 있음. 정책자금 조달 시 생산 설비 확충과 채널 다각화를 통해 2년 내 매출 24억 달성이 가능한 기반을 갖추고 있음. 인증 취득 로드맵 이행 시 추가 자금 확보와 함께 중장기 100억 목표 달성 가능성이 충분히 있음.';

  var p1=tpPage(1,'기업현황분석','기업정보 요약표',color,
    '<table class="tp-ovt" style="border-top-color:'+color+'"><tr><th style="color:'+color+'">기업명</th><td>'+cData.name+'</td><th style="color:'+color+'">대표자</th><td>'+(cData.rep||'-')+'</td><th style="color:'+color+'">업종</th><td>'+(cData.industry||'-')+'</td><th style="color:'+color+'">설립일</th><td>'+(cData.bizDate||'-')+'</td></tr><tr><th style="color:'+color+'">상시근로자</th><td>'+(cData.empCount||'-')+'명</td><th style="color:'+color+'">핵심아이템</th><td>'+(cData.coreItem||'-')+'</td><th style="color:'+color+'">전년 매출</th><td>'+fKRW(rev.y25)+'</td><th style="color:'+color+'">금년 예상</th><td>'+fKRW(exp)+'</td></tr></table>'
    +'<div class="tp-g4" style="margin-bottom:8px">'+tpMC('업력',cData.bizDate?Math.round((Date.now()-new Date(cData.bizDate))/31536000000)+'년':'2년','고성장 초기',color)+tpMC('매출 성장률',(rev.y24>0&&rev.y25>0)?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'+21%','전년 대비',color)+tpMC('신용등급','3등급','KCB 710점','#2563eb')+tpMC('필요자금',cData.needFund>0?fKRW(cData.needFund):'4억원','조달 목표','#7c3aed')+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">기업 현황 분석</h4>'+tpLst(d.s1_items||['기업 현황 분석 중'],color)+'</div>'
  );

  var p2=tpPage(2,'SWOT 분석','강점·약점·기회·위협',color,
    '<div class="tp-swot">'
    +'<div class="tp-sws tp-sw"><div class="tp-swl">💪 S 강점</div><ul>'+(swot.strength||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +'<div class="tp-sww tp-sw"><div class="tp-swl">⚠️ W 약점</div><ul>'+(swot.weakness||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +'<div class="tp-swo tp-sw"><div class="tp-swl">🚀 O 기회</div><ul>'+(swot.opportunity||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +'<div class="tp-swt tp-sw"><div class="tp-swl">🛡️ T 위협</div><ul>'+(swot.threat||[]).map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul></div>'
    +'</div>'
  );

  var p3=tpPage(3,'시장현황','시장 규모·트렌드',color,
    '<div class="tp-g2">'
    +'<div><div class="tp-g3" style="margin-bottom:8px">'+tpMC('HMR 시장','7조원','2022년 기준',color)+tpMC('연평균 성장률','18%','육수·국물',color)+tpMC('1~2인 가구','61%','핵심 소비층','#7c3aed')+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">시장 트렌드</h4>'+tpLst(d.s3_items||['시장 분석 중'],color)+'</div></div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">시장 성장 추이</h4><div class="tp-ch" style="height:150px"><canvas id="bp-market-chart" style="width:100%;height:100%"></canvas></div></div>'
    +'</div>'
  );

  var p4=tpPage(4,'경쟁력분석','경쟁사 비교표',color,
    '<div class="tp-g2">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">경쟁력 분석</h4>'+tpLst(d.s4_items||['경쟁력 분석 중'],color)+'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">경쟁사 비교표</h4>'
    +'<table class="tp-ctb"><thead><tr><th style="text-align:left">비교 항목</th><th>'+cData.name+'</th><th>경쟁사 A</th><th>경쟁사 B</th></tr></thead>'
    +'<tbody>'+compRows.map(function(r,i){return '<tr'+(i%2===0?'':' style="background:#f8fafc"')+'><td>'+r.item+'</td><td>'+r.self+'</td><td>'+r.a+'</td><td>'+r.b+'</td></tr>';}).join('')+'</tbody></table>'
    +'</div>'
    +'</div>'
  );

  var p5=tpPage(5,'차별점 및 핵심경쟁력','핵심 강점',color,
    '<div class="tp-g2">'
    +(Array.isArray(diffs)&&typeof diffs[0]==='object'&&diffs[0].title?diffs:diffs.map(function(t,i){var cs=['#16a34a','#2563eb','#7c3aed','#ea580c'];return{title:'차별점'+(i+1),text:String(t),color:cs[i%cs.length]};}))
    .reduce(function(acc,it,i){
      var bg=bgMap[it.color]||'#f0fdf4', bd=bdMap[it.color]||'#86efac';
      var box='<div class="tp-diff" style="background:'+bg+';border:1px solid '+bd+';border-left:4px solid '+it.color+'"><div style="font-size:11px;font-weight:700;color:'+it.color+';margin-bottom:3px">🔹 '+it.title+'</div><div style="font-size:11px;color:#334155;line-height:1.5;font-weight:400">'+it.text+'</div></div>';
      if(i<2) acc[0]+=box; else acc[1]+=box;
      return acc;
    },['',''])
    .map(function(col){return '<div>'+col+'</div>';}).join('')
    +'</div>'
  );

  var p6=tpPage(6,'가점추천','인증 취득 시 정책자금 한도 확대',color,
    '<div class="tp-g2">'
    +'<div>'+bpCerts.map(function(c,i){return '<div class="tp-cert"><div class="tp-certi" style="background:'+bpBgs[i%bpBgs.length]+'">'+bpIcons[i%bpIcons.length]+'</div><div class="tp-certb"><div class="tp-certn">'+c.name+'</div><div class="tp-certd">'+c.effect+'</div></div><div class="tp-certa"><div class="tp-certv" style="color:'+color+'">'+c.amount+'</div><div class="tp-certp">'+c.period+'</div></div></div>';}).join('')+'</div>'
    +'<div>'
    +'<div style="background:#f0fdf4;border-radius:7px;padding:12px;border:1px solid #86efac;text-align:center;margin-bottom:8px">'
    +'<div style="font-size:11px;font-weight:700;color:#15803d;margin-bottom:3px">인증 완료 시 총 추가 한도</div>'
    +'<div style="font-size:20px;font-weight:700;color:'+color+'">최대 +'+(totalBp>0?totalBp+'억원':'6.5억원')+'</div>'
    +'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">취득 우선순위 전략</h4>'+tpLst(['1순위: 벤처인증 (6개월, 자금 확보 즉시 효과)','2순위: 이노비즈 (1년, 기술보증 우대)','3순위: 기업부설연구소 (세액공제 25%)','4순위: HACCP (대형마트·급식 채널 확대)'],color)+'</div>'
    +'</div>'
    +'</div>'
  );

  var p7=tpPage(7,'자금사용계획','총 '+needFundStr,color,
    '<div class="tp-g2">'
    +'<div class="tp-sb"><h4 style="color:'+color+'">자금 집행 계획표</h4>'
    +'<table class="tp-ftb"><thead><tr><th style="text-align:left">항목</th><th>금액</th><th>비율</th><th>사용 목적</th></tr></thead>'
    +'<tbody>'+fundRows.map(function(r,i){return '<tr'+(i%2===1?' style="background:#f8fafc"':'')+'><td style="font-weight:700">'+r.item+'</td><td style="text-align:center">'+r.amount+'</td><td style="text-align:center;font-weight:700;color:'+color+'">'+r.ratio+'</td><td>'+r.purpose+'</td></tr>';}).join('')
    +'<tr style="background:#f0fdf4"><td style="font-weight:700">합계</td><td style="text-align:center;font-weight:700;color:'+color+'">'+needFundStr+'</td><td style="text-align:center;font-weight:700;color:'+color+'">100%</td><td>-</td></tr>'
    +'</tbody></table>'
    +'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">자금 집행 전략</h4>'+tpLst(d.s7_strategy||['자금 집행 전략 분석 중'],color)+'</div>'
    +'</div>'
  );

  var p8=tpPage(8,'매출 추이 및 1년 전망','실적·예측·단중장기',color,
    '<div class="tp-g2">'
    +'<div class="tp-sb"><div style="font-size:12px;font-weight:700;color:#1e293b;margin-bottom:5px">「1년 전망」 월별 매출 시뮬레이션</div><div class="tp-ch" style="height:155px"><canvas id="biz-monthly-chart" style="width:100%;height:100%"></canvas></div></div>'
    +'<div>'
    +'<div class="tp-gph tp-gphs"><div class="tp-gphh">⚡ 단기 (1년)</div><ul>'+(d.s8_short||['단기1','단기2','단기3','단기4']).map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'
    +'<div class="tp-gph tp-gphm"><div class="tp-gphh">📈 중기 (3년)</div><ul>'+(d.s8_mid||['중기1','중기2','중기3','중기4']).map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'
    +'<div class="tp-gph tp-gphl"><div class="tp-gphh">🌟 장기 (5년)</div><ul>'+(d.s8_long||['장기1','장기2','장기3','장기4']).map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'
    +'</div>'
    +'</div>'
  );

  var p9=tpPage(9,'성장비전','향후 발전 가능성',color,
    '<div class="tp-g2">'
    +'<div>'
    +'<div class="tp-sb" style="margin-bottom:8px"><h4 style="color:'+color+'">핵심 성장 동력</h4>'+tpLst(d.s9_items||['성장 동력 분석 중'],color)+'</div>'
    +'<div class="tp-g4">'+tpMC('1년후 매출',kpi9.y1,'+30%',color)+tpMC('2년후 매출',kpi9.y2,'+74%',color)+tpMC('목표 채널',kpi9.ch,'현재 1개','#2563eb')+tpMC('목표 인력',kpi9.emp,'2년 내','#7c3aed')+'</div>'
    +'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">앞으로의 계획 로드맵</h4>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">'
    +rmYears.map(function(r,i){return '<div style="border-radius:6px;padding:8px;border:1px solid #e2e8f0;border-top:3px solid '+rmColors[i]+';background:white"><div style="font-size:10px;font-weight:700;color:'+rmColors[i]+';margin-bottom:4px">'+r.year+'</div>'+r.tasks.map(function(t){return '<div style="font-size:10px;color:#64748b;padding-left:7px;position:relative;line-height:1.4;font-weight:400"><span style="position:absolute;left:0">·</span>'+t+'</div>';}).join('')+'</div>';}).join('')
    +'</div></div>'
    +'</div>'
  );

  var p10=tpPage('✦','마무리','종합 요약',color,
    '<div class="tp-g2">'
    +'<div class="tp-cls"><div class="tp-clst">'+cData.name+' — 종합 의견</div><div class="tp-clstx">'+conclusion+'</div></div>'
    +'<div>'
    +'<div class="tp-g4" style="margin-bottom:8px">'
    +[{l:'시장성',v:'★★★★★',c:color},{l:'기술력',v:'★★★★★',c:'#2563eb'},{l:'성장성',v:'★★★★★',c:'#7c3aed'},{l:'안정성',v:'★★★★',c:'#ea580c'}].map(function(r){return '<div class="tp-mc" style="border-top:3px solid '+r.c+'"><div class="tp-mcl">'+r.l+'</div><div class="tp-mcv" style="color:'+r.c+';font-size:13px">'+r.v+'</div></div>';}).join('')
    +'</div>'
    +'<div class="tp-sb"><h4 style="color:'+color+'">핵심 메시지</h4>'+tpLst(['특허 기반 기술력 + 폭발적 성장률 = 정책자금 최우선 지원 대상','인증 취득 로드맵 실행 시 추가 자금 한도 최대 6.5억원 확보 가능','컨설턴트 밀착 지원 하에 3년 내 매출 35억 달성 계획 수립 권고'],color)+'</div>'
    +'</div>'
    +'</div>'
  );

  return tplStyle(color)+'<div class="tp-wrap">'+cover+p1+p2+p3+p4+p5+p6+p7+p8+p9+p10+'</div>';
}


// ===========================
// ★ 차트 초기화 (화면 미리보기용)
// ===========================
function initReportCharts(rev) {
  setTimeout(function(){
    var radarEl=document.getElementById('rp-radar');
    if(radarEl&&radarEl.dataset.scores){var sc=radarEl.dataset.scores.split(',').map(Number);new Chart(radarEl.getContext('2d'),{type:'radar',data:{labels:['재무','전략/마케팅','인사','운영','IT'],datasets:[{data:sc,backgroundColor:'rgba(59,130,246,0.15)',borderColor:'#3b82f6',pointBackgroundColor:'#1e3a8a',pointRadius:4}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});}
    var lineEl=document.getElementById('rp-linechart');
    if(lineEl&&lineEl.dataset.y23!==undefined){var d=lineEl.dataset;new Chart(lineEl.getContext('2d'),{type:'line',data:{labels:['23년','24년','25년','금년(예)'],datasets:[{data:[+d.y23||0,+d.y24||0,+d.y25||0,+d.exp||0],borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.1)',borderWidth:2,pointRadius:4,fill:true,tension:0.2}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v>=10000?Math.floor(v/10000)+'억':v.toLocaleString()+'만';}}}}}});}
    var debtEl=document.getElementById('fp-donut');
    if(debtEl&&debtEl.dataset.names){var nm=debtEl.dataset.names.split('|');var rt=debtEl.dataset.ratios.split(',').map(Number);new Chart(debtEl.getContext('2d'),{type:'doughnut',data:{labels:nm,datasets:[{data:rt,backgroundColor:['#2563eb','#7c3aed','#06b6d4','#16a34a','#ea580c'],borderWidth:2,borderColor:'white'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'60%'}});}
    var fpGrowth=document.getElementById('fp-growth-chart');
    if(fpGrowth){new Chart(fpGrowth.getContext('2d'),{type:'line',data:{labels:['2026','2027','2028'],datasets:[{data:[14,24,35],borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,0.1)',borderWidth:2,pointRadius:5,fill:true,tension:0.2}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v+'억';}}}}}})}
    var tradeRadar=document.getElementById('tp-radar');
    if(tradeRadar&&tradeRadar.dataset.scores){var sc2=tradeRadar.dataset.scores.split(',').map(Number);new Chart(tradeRadar.getContext('2d'),{type:'radar',data:{labels:['유동인구','접근성','성장성','경쟁강도','가시성'],datasets:[{data:sc2,backgroundColor:'rgba(13,148,136,0.15)',borderColor:'#0d9488',pointBackgroundColor:'#0d9488',pointRadius:4}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});}
    var tradeLine=document.getElementById('tp-linechart');
    if(tradeLine&&tradeLine.dataset.s0){var td=tradeLine.dataset;new Chart(tradeLine.getContext('2d'),{type:'line',data:{labels:['현재','6개월','1년','2년'],datasets:[{data:[+td.s0,+td.s1,+td.s2,+td.s3],borderColor:'#0d9488',backgroundColor:'rgba(13,148,136,0.1)',borderWidth:2,pointRadius:5,fill:true,tension:0.2}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return Math.round(v/1000)+'천만';}}}}}});}
    var mktDonut=document.getElementById('mp-donut');
    if(mktDonut&&mktDonut.dataset.names){var mn=mktDonut.dataset.names.split('|');var mr=mktDonut.dataset.ratios.split(',').map(Number);new Chart(mktDonut.getContext('2d'),{type:'doughnut',data:{labels:mn,datasets:[{data:mr,backgroundColor:['#db2777','#9d174d','#f4c0d1','#fdf2f8'],borderWidth:2,borderColor:'white'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'60%'}});}
    var bpMarket=document.getElementById('bp-market-chart');
    if(bpMarket){new Chart(bpMarket.getContext('2d'),{type:'line',data:{labels:['2016','2017','2018','2019','2020','2021','2022'],datasets:[{data:[2,2.4,3,3.8,4.5,5.8,7],borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,0.1)',borderWidth:2,pointRadius:3,fill:true,tension:0.3}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v+'조';}}}}}})}
    var bizMonthly=document.getElementById('biz-monthly-chart');
    if(bizMonthly){
      var curM=new Date().getMonth();
      var safeRev=rev||{};
      var avgM=safeRev.cur&&curM>0?Math.round(safeRev.cur/curM):safeRev.y25?Math.round(safeRev.y25/12):3000;
      var actual=[],forecast=[];
      for(var i=0;i<12;i++){if(i<curM){actual.push(Math.round(avgM*(0.88+i*0.025)));forecast.push(null);}else{actual.push(null);forecast.push(Math.round(avgM*Math.pow(1.05,i-curM+1)));}}
      new Chart(bizMonthly.getContext('2d'),{type:'bar',data:{labels:['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],datasets:[{label:'실적',data:actual,backgroundColor:'rgba(22,163,74,0.7)',borderColor:'#16a34a',borderWidth:1,borderRadius:4},{label:'예측',data:forecast,backgroundColor:'rgba(59,130,246,0.45)',borderColor:'#3b82f6',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{font:{size:10}}}},scales:{y:{ticks:{callback:function(v){return v>=10000?Math.floor(v/10000)+'억':Math.round(v/1000)+'천만';}}}}}});
    }
  },200);
}

// ===========================
// ★ JSON 프롬프트 함수들
// ===========================
function buildMgmtClientPrompt(cData, fRev) {
  var pd={name:cData.name,rep:cData.rep,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,bizNum:cData.bizNum,매출데이터:fRev};
  return '너는 20년 경력의 경영컨설턴트야. 대상 기업: \''+cData.name+'\' (업종:'+( cData.industry||'-')+')\n'
    +'기업전달용 보고서 — 긍정적·객관적 톤. 아래 JSON만 출력.\n\n'
    +'{"grade":"등급(예:B+)","grade_desc":"설명(8자이내)","overview":["현황3개(각40자이상)"],"finance_strengths":["강점3개(각40자이상)"],"finance_risks":["개선2개(각40자이상)"],"radar":[재무,전략,인사,운영,IT점수],"marketing_bars":{"finance":점수,"strategy":점수,"operation":점수},"marketing":["마케팅3개(각40자이상)"],"hr":["인사3개(각40자이상)"],"ops":["운영3개(각40자이상)"],"it":["IT2개(각40자이상)"],"certs":[{"name":"인증명","effect":"효과(40자이상)","amount":"+X억또는채널↑","period":"기간"}],"roadmap_short":["단기4개"],"roadmap_mid":["중기4개"],"roadmap_long":["장기4개"],"summary":["종합2개(각50자이상)"]}\n\n'
    +'[기업데이터] '+JSON.stringify(pd);
}

function buildMgmtConsultantPrompt(cData, fRev) {
  var pd={name:cData.name,rep:cData.rep,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,bizNum:cData.bizNum,매출데이터:fRev};
  return '너는 20년 경력의 경영컨설턴트야. 대상: \''+cData.name+'\'\n컨설턴트 내부용 — 리스크 솔직하게. JSON만 출력.\n\n'
    +'{"grade":"등급","grade_desc":"설명","overview":["현황3개(리스크포함,각40자이상)"],"key_risks":["핵심리스크3개(각40자이상)"],"finance_strengths":["재무3개(각40자이상)"],"fb_finance":["재무피드백2개(각50자이상)"],"radar":[재무,전략,인사,운영,IT],"marketing_bars":{"finance":점수,"strategy":점수,"operation":점수},"marketing":["마케팅3개"],"fb_marketing":["마케팅피드백2개(각50자이상)"],"hr":["인사3개"],"ops":["운영3개"],"fb_hr_ops":["인사운영피드백2개(각50자이상)"],"it":["IT2개"],"fb_it":["IT피드백2개(각50자이상)"],"roadmap_short":["단기4개"],"roadmap_mid":["중기4개"],"roadmap_long":["장기4개"],"fb_roadmap":["로드맵피드백2개(각50자이상)"],"certs":[{"name":"인증명","effect":"효과","amount":"+X억","period":"기간"}],"consultant_issues":["시급이슈3개(각60자이상)"],"consultant_funds":["자금전략3개(각50자이상)"],"consultant_certs":["인증전략3개(각40자이상)"],"consultant_marketing":["마케팅개선3개"],"consultant_credit":["신용개선3개"]}\n\n'
    +'[기업데이터] '+JSON.stringify(pd);
}

function buildFinancePrompt(cData, fRev) {
  return '너는 재무 전문 컨설턴트야. 대상: \''+cData.name+'\'. JSON만 출력.\n\n'
    +'{"scores":{"profit":수익성점수,"stable":안정성점수,"growth":성장성점수},"score_descs":{"profit":"설명8자","stable":"설명8자","growth":"설명8자"},"profit_bars":[{"label":"항목","value":바길이,"display":"표시값"},... 4개],"debt":[{"name":"기관","ratio":비율},...],"stable_metrics":[{"label":"지표","value":"값","desc":"설명"},... 4개],"growth_items":["성장3개(각40자이상)"],"action_urgent":"즉시실행2줄","action_short":"단기실행2줄","action_mid":"중기실행2줄"}\n\n'
    +'[기업데이터] '+JSON.stringify({name:cData.name,industry:cData.industry,empCount:cData.empCount,bizDate:cData.bizDate,매출데이터:fRev});
}

function buildTradePrompt(cData, fRev) {
  return '너는 상권분석 전문가야. 대상: \''+cData.name+'\'. JSON만 출력.\n\n'
    +'{"traffic":"유동인구","competitors":경쟁수,"grade":"입지등급","radar":[유동인구,접근성,성장성,경쟁강도역,가시성],"features":["특성3개(각40자이상)"],"comp_direct":직접경쟁수,"comp_strong":강성경쟁수,"diff_potential":"高/中/低","target":{"age":"연령대","household":"가구유형","channel":"구매채널","cycle":"구매주기"},"strategy":["전략3개(각40자이상)"],"sim":{"s0":현재월매출만원,"s1":6개월후,"s2":1년후,"s3":2년후}}\n\n'
    +'[기업데이터] '+JSON.stringify({name:cData.name,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,매출데이터:fRev});
}

function buildMarketingPrompt(cData, fRev) {
  return '너는 디지털 마케팅 전문가야. 대상: \''+cData.name+'\'. JSON만 출력.\n\n'
    +'{"channels":[{"name":"채널명","score":점수},... 4개],"strategies":["전략3개(각40자이상)"],"budget_total":"월예산총액","budget":[{"name":"항목","ratio":비율},... 4개],"kpi":[{"label":"지표","value":"목표","period":"기간"},... 4개],"roadmap":[{"period":"월","task":"과제","highlight":false},... 6개]}\n\n'
    +'[기업데이터] '+JSON.stringify({name:cData.name,industry:cData.industry,coreItem:cData.coreItem,empCount:cData.empCount,매출데이터:fRev});
}

function buildFundPrompt(cData, fRev) {
  return '너는 정책자금 전문 컨설턴트야. 대상: \''+cData.name+'\'. JSON만 출력.\n\n'
    +'{"checks":[{"text":"자격요건","status":"pass/cond/fail"},... 6개],"score":가능성점수,"score_desc":"설명","match_count":기관수,"score_items":["분석2개(각40자이상)"],"funds":[{"rank":1,"name":"자금명","limit":"한도","tags":["태그1","태그2","태그3"]},... 5개],"comparison":[{"org":"기관","limit":"한도","rate":"금리","period":"기간","diff":"easy/mid/hard"},... 4개],"checklist_ready":["준비서류4개"],"checklist_need":["필요서류2개"]}\n\n'
    +'[기업데이터] '+JSON.stringify({name:cData.name,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,needFund:cData.needFund,매출데이터:fRev});
}

function buildBizPlanPrompt(cData, fRev) {
  var needFundStr=cData.needFund>0?fKRW(cData.needFund):'4억원';
  return '너는 사업계획서 전문가야. 대상: \''+cData.name+'\'. 기업데이터 기반 구체적 내용. JSON만 출력.\n\n'
    +'{"s1_items":["현황5개(각40자이상)"],"s2_swot":{"strength":["강점4개"],"weakness":["약점3개"],"opportunity":["기회4개"],"threat":["위협3개"]},"s3_items":["시장5개(각40자이상)"],"s4_items":["경쟁4개(각40자이상)"],"s4_competitor":[{"item":"항목","self":"★점수","a":"★점수","b":"★점수"},... 5~7개],"s5_items":[{"title":"제목","text":"설명(40자이상)","color":"#색상"},... 4개 (#16a34a/#2563eb/#7c3aed/#ea580c)],"s6_certs":[{"name":"인증명","effect":"효과(40자이상)","amount":"+X억또는채널↑","period":"기간"},... 4개],"s7_rows":[{"item":"항목","amount":"금액","ratio":"X%","purpose":"목적(30자이상)"},... 총합='+needFundStr+'],"s7_strategy":["전략3개(각30자이상)"],"s8_short":["단기4개(각25자이상)"],"s8_mid":["중기4개"],"s8_long":["장기4개"],"s9_items":["동력4개(각40자이상)"],"s9_kpi":{"y1":"1년후매출","y2":"2년후매출","ch":"목표채널","emp":"목표인원"},"s9_roadmap":[{"year":"2026","tasks":["3개"]},{"year":"2027","tasks":["3개"]},{"year":"2028","tasks":["3개"]},{"year":"2029~","tasks":["3개"]}],"s10_conclusion":"마무리4~5문장(~있음으로마무리)"}\n\n'
    +'[기업데이터] '+JSON.stringify({name:cData.name,rep:cData.rep,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,bizNum:cData.bizNum,필요자금:needFundStr,자금사용계획:cData.fundPlan||'',매출데이터:fRev});
}

// ===========================
// ★ REPORT_CONFIGS (모두 가로형)
// ===========================
var REPORT_CONFIGS = {
  finance:     {typeLabel:'재무진단',     title:'AI 상세 재무진단',   contentAreaId:'finance-content-area',    landscape:true, buildPrompt:buildFinancePrompt,   buildHTML:buildFinanceHTML},
  aiTrade:     {typeLabel:'상권분석',     title:'AI 상권분석 리포트', contentAreaId:'aiTrade-content-area',    landscape:true, buildPrompt:buildTradePrompt,     buildHTML:buildTradeHTML},
  aiMarketing: {typeLabel:'마케팅제안',   title:'AI 마케팅 제안서',   contentAreaId:'aiMarketing-content-area',landscape:true, buildPrompt:buildMarketingPrompt, buildHTML:buildMarketingHTML},
  aiFund:      {typeLabel:'정책자금매칭', title:'AI 정책자금매칭',    contentAreaId:'aiFund-content-area',     landscape:true, buildPrompt:buildFundPrompt,      buildHTML:buildFundHTML},
  aiBiz:       {typeLabel:'사업계획서',   title:'AI 사업계획서',      contentAreaId:'aiBiz-content-area',      landscape:true, buildPrompt:buildBizPlanPrompt,   buildHTML:buildBizPlanHTML}
};

// ===========================
// ★ 컨테이너 초기화 (report-paper 패딩 제거)
// ===========================
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
  var rev = cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
  var fRev = fRevAI(cData, rev);
  var prompt = version==='client' ? buildMgmtClientPrompt(cData,fRev) : buildMgmtConsultantPrompt(cData,fRev);
  document.getElementById('ai-loading-overlay').style.display = 'flex';
  var data = await callGeminiJSON(prompt, 8192);
  document.getElementById('ai-loading-overlay').style.display = 'none';
  if (!data) return;
  var todayStr = new Date().toISOString().split('T')[0];
  var vLabel = version==='client'?'기업전달용':'컨설턴트용';
  var reportObj = {id:'rep_'+Date.now(),type:'경영진단',company:cData.name,title:'AI 경영진단보고서 ('+vLabel+')',date:todayStr,content:JSON.stringify(data),version:version,revenueData:rev,reportType:'management'};
  var reports = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
  reports.push(reportObj); localStorage.setItem(DB_REPORTS, JSON.stringify(reports));
  updateDataLists();
  tab.querySelector('[id$="-input-step"]').style.display = 'none';
  tab.querySelector('[id$="-result-step"]').style.display = 'block';
  var contentArea = document.getElementById('report-content-area');
  resetContentArea(contentArea);
  contentArea.innerHTML = version==='client' ? buildMgmtClientHTML(data,cData,rev,todayStr) : buildMgmtConsultantHTML(data,cData,rev,todayStr);
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
  var rev = cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
  var fRev = fRevAI(cData, rev);
  var cfg = REPORT_CONFIGS[type]; if (!cfg) return;
  document.getElementById('ai-loading-overlay').style.display = 'flex';
  var maxTokens = type==='aiBiz' ? 65536 : 8192;
  var data = await callGeminiJSON(cfg.buildPrompt(cData,fRev,version), maxTokens);
  document.getElementById('ai-loading-overlay').style.display = 'none';
  if (!data) return;
  var todayStr = new Date().toISOString().split('T')[0];
  var vLabel = type==='aiBiz' ? (version==='draft'?'초안':'완성본') : (version==='client'?'기업전달용':'컨설턴트용');
  var reportObj = {id:'rep_'+Date.now(),type:cfg.typeLabel,company:cData.name,title:cfg.title+' ('+vLabel+')',date:todayStr,content:JSON.stringify(data),version:version,revenueData:rev,reportType:type,contentAreaId:cfg.contentAreaId};
  var reports = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
  reports.push(reportObj); localStorage.setItem(DB_REPORTS, JSON.stringify(reports));
  updateDataLists();
  tab.querySelector('[id$="-input-step"]').style.display = 'none';
  tab.querySelector('[id$="-result-step"]').style.display = 'block';
  var contentArea = document.getElementById(cfg.contentAreaId);
  resetContentArea(contentArea);
  contentArea.innerHTML = cfg.buildHTML(data, cData, rev, todayStr);
  _currentReport = {company:cData.name, type:cfg.title+' ('+vLabel+')', contentAreaId:cfg.contentAreaId, landscape:true};
  initReportCharts(rev);
};

// ===========================
// ★ 보고서 보기
// ===========================
window.viewReport = function(id) {
  var r = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]').find(function(x){return x.id===id;}); if (!r) return;
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
    resetContentArea(ca2);
    ca2.innerHTML = cfg.buildHTML(data, cData, rev, r.date);
    _currentReport = {company:cData.name, type:r.title, contentAreaId:cfg.contentAreaId, landscape:true};
    initReportCharts(rev);
  }
};

window.backToInput = function(tab) {
  document.getElementById(tab+'-input-step').style.display = 'block';
  document.getElementById(tab+'-result-step').style.display = 'none';
};
