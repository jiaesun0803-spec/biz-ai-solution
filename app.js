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

  var printCSS = `
    @page { size: 297mm 210mm; margin: 0; }
    * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    body { margin: 0; padding: 0; background: white; font-family: "Malgun Gothic","Apple SD Gothic Neo",sans-serif; }
    .rp-wrap { background: white !important; padding: 0 !important; gap: 0 !important; display: block !important; }
    .rp-cover, .rp-page {
      width: 297mm !important;
      height: 210mm !important;
      margin: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
    }
    .rp-section { page-break-inside: avoid !important; break-inside: avoid !important; }
    .rp-cert, .rp-rank, .rp-chk, .rp-mc, .rp-hbr { page-break-inside: avoid !important; }
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
  // 레이더 차트
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
// ★ 탭 이동 및 업체 관리
// ===========================
window.showTab = function(tabId, updateUrl=true) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.menu li, .bottom-menu li').forEach(i=>i.classList.remove('active'));
  const target=document.getElementById(tabId); if(target) target.classList.add('active');
  const menu=document.getElementById('menu-'+tabId); if(menu) menu.classList.add('active');
  if(tabId==='settings') loadUserProfile();
  if(tabId==='company') showCompanyList();
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
      const addrEl = c.rawData.find(d=>d.type==='text'&&d.value&&d.value.length>3);
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
// ★ 데이터 목록 갱신 및 유틸리티
// ===========================
window.updateDataLists = function() {
  const companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  const reports   = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
  document.querySelectorAll('.company-dropdown').forEach(sel=>{
    sel.innerHTML='<option value="">기업을 선택하세요</option>';
    companies.forEach(c=>sel.innerHTML+=`<option value="${c.name}">${c.name}</option>`);
  });
  updateDashboardReports(); renderCompanyCards();
};
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
  listEl.innerHTML=[...reports].reverse().slice(0,5).map(r=>`<div class="recent-report-item"><div class="report-type-icon">${typeIcon(r.type)}</div><div><div class="report-item-title">${r.title}</div><div class="report-item-company">${r.company}</div></div><div class="report-item-right"><span class="report-badge">${r.type}</span><span class="report-date">🕐 ${r.date}</span><button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button></div></div>`).join('');
}

// ===========================
// ★ 기업 저장 및 입력 제어
// ===========================
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
function initInputHandlers(){
  document.querySelectorAll('.number-only').forEach(i=>i.addEventListener('input',function(){this.value=this.value.replace(/[^0-9]/g,'');}));
  document.querySelectorAll('.money-format').forEach(i=>i.addEventListener('input',function(){let v=this.value.replace(/[^0-9\-]/g,'');this.value=v.replace(/\B(?=(\d{3})+(?!\d))/g,',');}));
  document.querySelectorAll('.debt-input').forEach(i=>i.addEventListener('input',calculateTotalDebt));
}

// ===========================
// ★ 보고서 CSS 및 헬퍼 (A4 가로형 고정)
// ===========================
function tplStyle(color) {
  var c = color||'#3b82f6';
  return '<style>'
  + '* { box-sizing:border-box; }'
  + '.rp-wrap { font-family:"Malgun Gothic",sans-serif; background:#e8eaed; padding:30px; display:flex; flex-direction:column; align-items:center; gap:24px; }'
  + '.rp-cover { background:white; border-radius:8px; padding:40px 50px; position:relative; width:297mm; height:210mm; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1); flex-shrink:0; }'
  + '.rp-cbar  { position:absolute; left:0; top:0; bottom:0; width:16px; background:'+c+'; }'
  + '.rp-ctitle{ font-size:30px; font-weight:700; color:#0f172a; margin-bottom:8px; }'
  + '.rp-page { background:white; border-radius:8px; padding:30px 40px; width:297mm; height:210mm; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1); flex-shrink:0; }'
  + '.rp-body  { flex:1; display:flex; flex-direction:column; gap:14px; }'
  + '.rp-section { border-radius:8px; padding:13px 15px; border:1px solid #e2e8f0; background:#f8fafc; }'
  + '.rp-2col  { display:flex; gap:16px; flex:1; }'
  + '.rp-colF  { flex:1; min-width:0; display:flex; flex-direction:column; gap:10px; }'
  + '.rp-grade { background:linear-gradient(135deg,#eff6ff,#dbeafe); border:1px solid #bfdbfe; border-radius:8px; padding:16px; text-align:center; }'
  + '.rp-gval  { font-size:44px; font-weight:900; line-height:1; }'
  + '.rp-mc  { background:white; border-radius:8px; padding:12px 10px; border:1px solid #e2e8f0; text-align:center; }'
  + '.rp-mcv { font-size:20px; font-weight:700; line-height:1.2; }'
  + '.rp-lst { display:flex; flex-direction:column; gap:7px; }'
  + '.rp-li  { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:#334155; line-height:1.65; }'
  + '.rp-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:6px; }'
  + '.rp-ovt { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:12px; border-top:2px solid #1e3a8a; }'
  + '.rp-ovt th { background:#eff6ff; border:1px solid #bfdbfe; padding:8px 11px; text-align:left; color:#1e40af; }'
  + '.rp-ovt td { border:1px solid #e2e8f0; padding:8px 11px; }'
  + '.rp-rm3 { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }'
  + '.rp-rmi { border-radius:8px; padding:13px; background:white; border:1px solid #e2e8f0; }'
  + '.rp-ch  { background:white; border-radius:7px; border:1px solid #e2e8f0; padding:10px; }'
  + '</style>';
}
function rpPage(num, title, sub, color, content) {
  return `<div class="rp-page"><div class="rp-ph" style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:2.5px solid #f1f5f9;"><div class="rp-pnum" style="width:32px;height:32px;border-radius:50%;background:#eff6ff;color:${color};display:flex;align-items:center;justify-content:center;font-weight:700;">${num}</div><span class="rp-ptitle" style="font-size:20px;font-weight:700;">${title}</span><span class="rp-psub" style="margin-left:auto;color:#94a3b8;font-size:14px;">${sub||''}</span></div><div class="rp-body">${content}</div></div>`;
}
function rpSec(title, color, content) {
  return `<div class="rp-section">${title ? `<h4 style="color:${color};margin-bottom:10px;">${title}</h4>` : ''}${content}</div>`;
}
function rpMC(label, value, desc, color) {
  return `<div class="rp-mc"><div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">${label}</div><div class="rp-mcv" style="color:${color}">${value}</div><div style="font-size:11px;color:#94a3b8;margin-top:4px;">${desc}</div></div>`;
}

// ===========================
// ★ 리포트 생성 로직 (로딩 오버레이 포함)
// ===========================
window.generateReport = async function(type, version, event) {
  var overlay = document.getElementById('ai-loading-overlay');
  var tab = event.target.closest('.tab-content');
  var cN  = tab.querySelector('.company-dropdown').value;
  if (!cN) { alert('기업을 선택해주세요.'); return; }
  var cs  = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  var cData = cs.find(function(c){return c.name===cN;});
  if (!cData) { alert('기업 정보를 찾을 수 없습니다.'); return; }
  
  if (overlay) overlay.style.display = 'flex'; // 로딩 오버레이 표시
  
  try {
    var rev = cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
    var fRev = fRevAI(cData, rev);
    var prompt = version==='client' ? buildMgmtClientPrompt(cData,fRev) : buildMgmtConsultantPrompt(cData,fRev);
    var data = await callGeminiJSON(prompt, 8192);
    if (!data) throw new Error("AI 응답을 받지 못했습니다.");
    
    var today = new Date().toISOString().split('T')[0];
    var vL = version==='client'?'기업전달용':'컨설턴트용';
    var rpt = {id:'rep_'+Date.now(),type:'경영진단',company:cData.name,title:'AI 경영진단보고서 ('+vL+')',date:today,content:JSON.stringify(data),version:version,revenueData:rev,reportType:'management'};
    var rs = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]'); rs.push(rpt);
    localStorage.setItem(DB_REPORTS, JSON.stringify(rs)); updateDataLists();
    
    tab.querySelector('[id$="-input-step"]').style.display = 'none';
    tab.querySelector('[id$="-result-step"]').style.display = 'block';
    var ca = document.getElementById('report-content-area');
    resetContentArea(ca);
    ca.innerHTML = version==='client' ? buildMgmtClientHTML(data,cData,rev,today) : buildMgmtConsultantHTML(data,cData,rev,today);
    _currentReport = {company:cData.name, type:'AI 경영진단보고서 ('+vL+')', contentAreaId:'report-content-area', landscape:true};
    initReportCharts(rev);
  } catch(e) {
    console.error(e); alert('오류: ' + e.message);
  } finally {
    if (overlay) overlay.style.display = 'none'; // 로딩 오버레이 숨김
  }
};

window.generateAnyReport = async function(type, version, event) {
  var overlay = document.getElementById('ai-loading-overlay');
  var tab = event.target.closest('.tab-content');
  var cN  = tab.querySelector('.company-dropdown').value;
  if (!cN) { alert('기업을 선택해주세요.'); return; }
  var cs  = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  var cData = cs.find(function(c){return c.name===cN;});
  if (!cData) { alert('기업 정보를 찾을 수 없습니다.'); return; }
  var cfg  = REPORT_CONFIGS[type]; if (!cfg) return;
  
  if (overlay) overlay.style.display = 'flex'; // 로딩 오버레이 표시
  
  try {
    var rev = cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
    var fRev = fRevAI(cData, rev);
    var data = await callGeminiJSON(cfg.buildPrompt(cData, fRev, version), type==='aiBiz'?65536:8192);
    if (!data) throw new Error("AI 응답을 받지 못했습니다.");
    
    var today = new Date().toISOString().split('T')[0];
    var vL = type==='aiBiz'?(version==='draft'?'초안':'완성본'):'리포트';
    var rpt = {id:'rep_'+Date.now(),type:cfg.typeLabel,company:cData.name,title:cfg.title+' ('+vL+')',date:today,content:JSON.stringify(data),version:version,revenueData:rev,reportType:type,contentAreaId:cfg.contentAreaId};
    var rs = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]'); rs.push(rpt);
    localStorage.setItem(DB_REPORTS, JSON.stringify(rs)); updateDataLists();
    
    tab.querySelector('[id$="-input-step"]').style.display = 'none';
    tab.querySelector('[id$="-result-step"]').style.display = 'block';
    var ca = document.getElementById(cfg.contentAreaId);
    resetContentArea(ca);
    ca.innerHTML = cfg.buildHTML(data, cData, rev, today);
    _currentReport = {company:cData.name, type:cfg.title+' ('+vL+')', contentAreaId:cfg.contentAreaId, landscape:true};
    initReportCharts(rev);
  } catch(e) {
    console.error(e); alert('오류: ' + e.message);
  } finally {
    if (overlay) overlay.style.display = 'none'; // 로딩 오버레이 숨김
  }
};

// ===========================
// ★ 기타 UI 및 차트 기능
// ===========================
window.viewReport = function(id) {
  var r = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]').find(x=>x.id===id); if(!r) return;
  var cs = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  var cData = cs.find(c=>c.name===r.company)||{name:r.company,bizNum:'-',industry:'-',rep:'-',coreItem:'-',bizDate:'-',empCount:'-',date:r.date};
  var rev = r.revenueData||{cur:0,y25:0,y24:0,y23:0};
  var data; try{data=JSON.parse(r.content);}catch(e){data={};}
  var type = r.reportType||'management';
  if (type==='management') {
    showTab('report');
    setTimeout(() => {
      document.getElementById('report-input-step').style.display='none';
      document.getElementById('report-result-step').style.display='block';
      var ca = document.getElementById('report-content-area');
      resetContentArea(ca);
      ca.innerHTML = r.version==='client' ? buildMgmtClientHTML(data,cData,rev,r.date) : buildMgmtConsultantHTML(data,cData,rev,r.date);
      _currentReport = {company:cData.name, type:r.title, contentAreaId:'report-content-area', landscape:true};
      initReportCharts(rev);
    }, 100);
  } else {
    var cfg = REPORT_CONFIGS[type]; if(!cfg) return;
    showTab(cfg.contentAreaId.replace('-content-area',''));
    setTimeout(() => {
      document.getElementById(cfg.contentAreaId.replace('-content-area','') + '-input-step').style.display='none';
      document.getElementById(cfg.contentAreaId.replace('-content-area','') + '-result-step').style.display='block';
      var ca2 = document.getElementById(cfg.contentAreaId);
      resetContentArea(ca2);
      ca2.innerHTML = cfg.buildHTML(data,cData,rev,r.date);
      _currentReport = {company:cData.name, type:r.title, contentAreaId:cfg.contentAreaId, landscape:true};
      initReportCharts(rev);
    }, 100);
  }
};
function resetContentArea(el) { if(el) el.style.cssText = 'padding:0!important;background:transparent!important;box-shadow:none!important;min-height:unset!important;border-radius:0!important;'; }
window.backToInput = function(tab) { document.getElementById(tab+'-input-step').style.display='block'; document.getElementById(tab+'-result-step').style.display='none'; };
function initReportCharts(rev) {
  setTimeout(function() {
    var ra = document.getElementById('rp-radar');
    if(ra && ra.dataset.scores) new Chart(ra.getContext('2d'),{type:'radar',data:{labels:['재무','전략/마케팅','인사','운영','IT'],datasets:[{data:ra.dataset.scores.split(',').map(Number),backgroundColor:'rgba(59,130,246,0.18)',borderColor:'#3b82f6',pointRadius:5}]},options:{scales:{r:{min:0,max:100}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});
    var li = document.getElementById('rp-linechart');
    if(li && li.dataset.y23) new Chart(li.getContext('2d'),{type:'line',data:{labels:['2023','2024','2025','금년(예)'],datasets:[{data:[+li.dataset.y23,+li.dataset.y24,+li.dataset.y25,+li.dataset.exp],borderColor:'#3b82f6',fill:true,tension:0.25}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}}}});
  }, 500);
}

// ===========================
// ★ 프롬프트 빌더 (기존 로직 유지)
// ===========================
function buildMgmtClientPrompt(cData, fRev) {
  return `너는 경영컨설턴트야. 기업 '${cData.name}'을 위해 AI 경영진단보고서(기업전달용)를 JSON 형식으로 작성해. 각 항목은 60자 이상 구체적으로 작성해. 수치(${fRev.매출_2025년}, ${fRev.금년예상연간매출})를 포함할 것. JSON: {"grade":"등급","grade_desc":"설명","overview":["항목5개"],"finance_strengths":["항목4개"],"finance_risks":["항목3개"],"radar":[70,80,60,70,50],"marketing_bars":{"finance":70,"strategy":85,"operation":65,"hr":60,"it":55},"marketing":["항목5개"],"marketing_items":["항목3개"],"hr":["항목5개"],"ops":["항목5개"],"it":["항목5개"],"roadmap_short":["항목4개"],"roadmap_mid":["항목4개"],"roadmap_long":["항목4개"],"summary":["항목3개"]}`;
}
function buildMgmtConsultantPrompt(cData, fRev) {
  return `너는 경영컨설턴트야. 기업 '${cData.name}'의 내부 전략 수립을 위한 AI 경영진단보고서(컨설턴트용)를 JSON으로 작성해. 리스크 위주로 솔직하게 작성해. JSON: {"grade":"등급","grade_desc":"설명","overview":["현황5개"],"key_risks":["리스크4개"],"finance_strengths":["강점4개"],"fb_finance":["피드백3개"],"radar":[65,75,65,70,55],"marketing_bars":{"finance":65,"strategy":75,"operation":68,"hr":64,"it":57},"marketing":["분석4개"],"fb_marketing":["피드백3개"],"hr":["분석5개"],"ops":["분석5개"],"fb_hr_ops":["피드백3개"],"it":["분석5개"],"fb_it":["피드백3개"],"roadmap_short":["4개"],"roadmap_mid":["4개"],"roadmap_long":["4개"],"fb_roadmap":["피드백2개"],"consultant_issues":["이슈3개"],"consultant_funds":["전략4개"],"consultant_certs":["전략3개"],"consultant_marketing":["2개"],"consultant_credit":["2개"]}`;
}

// buildFinanceHTML, buildMgmtClientHTML 등 build 로직들은 기존 파일의 HTML 구조를 따르므로 그대로 유지되거나 tplStyle() 수정에 맞춰 작동합니다.
// (나머지 buildHTML, buildPrompt 등 상세 보고서별 함수들은 생략 - 기존 코드와 동일 구조 유지)
