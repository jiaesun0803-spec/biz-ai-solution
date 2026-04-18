// ===== CONSTANTS =====
const DB_USERS   = 'biz_users';
const DB_SESSION = 'biz_session';
const STORAGE_KEY = 'biz_consult_companies';
const DB_REPORTS  = 'biz_reports';

let _currentReport = { company:'', type:'', contentAreaId:'', landscape:false };

// ===========================
// ★ PDF 출력 (새 창 방식)
// ===========================
window.printReport = function() {
  const company   = _currentReport.company   || '';
  const type      = _currentReport.type      || 'AI 보고서';
  const landscape = _currentReport.landscape || false;
  const title     = company ? `${company} - ${type}` : type;
  const accent    = landscape ? '#16a34a' : '#3b82f6';

  let reportHTML = '';
  const id = _currentReport.contentAreaId;
  if (id) { const el = document.getElementById(id); if (el && el.innerHTML.trim()) reportHTML = el.innerHTML; }
  if (!reportHTML) {
    ['aiBiz-content-area','report-content-area','finance-content-area','aiFund-content-area','aiTrade-content-area','aiMarketing-content-area'].forEach(aid=>{
      if (!reportHTML) { const el = document.getElementById(aid); if (el && el.innerHTML.trim()) reportHTML = el.innerHTML; }
    });
  }
  if (!reportHTML) { alert('출력할 보고서가 없습니다.'); return; }

  const curMonth = new Date().getMonth();
  const bizRevData = (() => { try { const cs=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); const c=cs.find(x=>x.name===company); return c?.revenueData||{}; } catch(e){return{};} })();
  const avgMonthly = bizRevData.cur && curMonth>0 ? Math.round(bizRevData.cur/curMonth) : bizRevData.y25 ? Math.round(bizRevData.y25/12) : 3000;

  const printWin = window.open('','_blank','width=1300,height=900');
  printWin.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${title}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;-webkit-print-color-adjust:exact!important;color-adjust:exact!important;print-color-adjust:exact!important;}
@page{size:A4 ${landscape?'landscape':'portrait'};margin:${landscape?'10mm':'13mm'};}
body{background:white;color:#333;font-size:13px;}
.paper-inner{max-width:100%;}
/* 표지 */
.cover-page{height:${landscape?'182mm':'265mm'};display:block;position:relative;border-left:none!important;padding-left:48px;padding-right:28px;padding-top:40px;page-break-after:always;break-after:page;overflow:hidden;}
.cover-page::before{content:'';display:block;position:absolute;left:0;top:0;bottom:0;width:28px;background:${accent}!important;}
.cover-header h4{font-size:14px;color:${accent};border-bottom:2px solid ${accent};display:inline-block;padding-bottom:3px;margin-bottom:8px;}
.cover-header h1{font-size:${landscape?'28px':'32px'};font-weight:900;color:#0f172a;margin-top:10px;letter-spacing:-1px;}
.cover-middle{position:absolute;left:48px;right:28px;bottom:${landscape?'20px':'30px'};}
.cover-middle h2{font-size:${landscape?'17px':'19px'};color:#1e3a8a;margin-bottom:10px;font-weight:bold;}
.cover-table{width:100%;background:#f8fafc!important;padding:8px 14px;border-radius:5px;}
.cover-table table{width:100%;border-collapse:collapse;}
.cover-table th{text-align:center;padding:6px 5px;color:${accent};font-size:11px;font-weight:bold;border-bottom:1px solid #e2e8f0;width:16%;}
.cover-table td{text-align:center;padding:6px 5px;color:#334155;font-size:11px;font-weight:500;border-bottom:1px solid #e2e8f0;width:34%;}
.cover-table tr:last-child th,.cover-table tr:last-child td{border-bottom:none;}
.cover-footer{position:absolute;left:48px;right:28px;bottom:0;display:flex;justify-content:space-between;border-top:1px solid ${accent};padding-top:8px;color:#475569;font-size:11px;font-weight:bold;}
/* 페이지 공통 */
.rp-page{background:white;padding:18px 22px;page-break-before:always;break-before:page;}
.rp-page:first-of-type{page-break-before:auto;break-before:auto;}
.ptr{display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:9px;border-bottom:1px solid #e2e8f0;}
.pnum{width:23px;height:23px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;flex-shrink:0;}
.ptitle{font-size:15px;font-weight:500;color:#1e293b;}
.psub{font-size:11px;color:#64748b;margin-left:auto;}
/* 섹션 박스 */
.sbox{border-radius:8px;padding:12px 14px;border:1px solid #d1d5db!important;background:#f8fafc!important;margin-bottom:10px;page-break-inside:avoid;}
.sbox h4{font-size:12px;font-weight:500;margin-bottom:8px;}
/* 그리드 */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;}
/* 카드 */
.mc{background:white!important;border-radius:7px;padding:9px;border:1px solid #e2e8f0!important;text-align:center;}
.mc-l{font-size:10px;color:#64748b;margin-bottom:3px;}
.mc-v{font-size:17px;font-weight:500;}
.mc-d{font-size:10px;color:#64748b;margin-top:2px;}
/* 리스트 */
.tp-list{display:flex;flex-direction:column;gap:5px;}
.tp-li{display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#334155;line-height:1.5;}
.tp-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:4px;}
/* 수평 바 */
.hbr{margin-bottom:6px;}
.hbl{display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;}
.hbt{height:8px;border-radius:4px;background:#e2e8f0;overflow:hidden;}
.hbf{height:100%;border-radius:4px;}
/* SWOT */
.swot-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;}
.swot-s{background:#f0fdf4!important;border:1px solid #86efac!important;border-radius:8px;padding:12px;}
.swot-w{background:#fef2f2!important;border:1px solid #fca5a5!important;border-radius:8px;padding:12px;}
.swot-o{background:#eff6ff!important;border:1px solid #93c5fd!important;border-radius:8px;padding:12px;}
.swot-t{background:#fff7ed!important;border:1px solid #fdba74!important;border-radius:8px;padding:12px;}
.swot-label{font-size:12px;font-weight:500;margin-bottom:8px;}
.swot-ul{list-style:none;padding:0;margin:0;}
.swot-li{font-size:11px;padding-left:10px;position:relative;margin-bottom:5px;line-height:1.5;color:#334155;}
.swot-li::before{content:'•';position:absolute;left:0;font-weight:bold;}
/* 경쟁사 표 */
.comp-table{width:100%;border-collapse:collapse;font-size:11px;margin:10px 0;}
.comp-table th{background:#1e3a8a!important;color:white!important;padding:8px;text-align:center;border:1px solid #1e40af;}
.comp-table td{padding:7px 8px;text-align:center;border:1px solid #e2e8f0;color:#334155;}
.comp-table td:first-child{text-align:left;font-weight:500;}
.comp-table td:nth-child(2){background:#f0fdf4!important;color:#15803d!important;font-weight:bold;}
.comp-table tr:nth-child(even) td{background:#f8fafc!important;}
/* 자금표 */
.fund-table{width:100%;border-collapse:collapse;font-size:11px;}
.fund-table th{background:#f0fdf4!important;border:1px solid #bbf7d0;padding:8px;color:#15803d;font-weight:500;}
.fund-table td{border:1px solid #e2e8f0;padding:7px 8px;color:#334155;}
.fund-table tr:nth-child(even) td{background:#f8fafc!important;}
.fund-table tfoot td{background:#f0fdf4!important;font-weight:500;color:#15803d!important;}
/* 기업현황표 */
.ov-table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px;border-top:2px solid #1e3a8a;}
.ov-table th{background:#eff6ff!important;border:1px solid #bfdbfe;padding:8px;color:#1e40af!important;text-align:left;}
.ov-table td{border:1px solid #e2e8f0;padding:8px;color:#1e293b;}
/* 컨설턴트 피드백 */
.fb-box{background:#fff7ed!important;border:1px solid #fed7aa!important;border-left:4px solid #f97316!important;border-radius:7px;padding:10px 12px;margin-top:10px;page-break-inside:avoid;}
.fb-title{font-size:11px;font-weight:500;color:#c2410c;margin-bottom:6px;}
/* 컨설턴트 전용 */
.consult-box{background:#fffbeb!important;border:2px solid #f59e0b!important;border-left:5px solid #d97706!important;border-radius:10px;padding:16px 18px;margin-top:10px;page-break-inside:avoid;}
.consult-box h3{font-size:14px;font-weight:500;color:#92400e!important;margin-bottom:12px;}
.inner-box{background:#fef9ec!important;border:1px solid #fcd34d!important;border-radius:6px;padding:10px 12px;margin-bottom:8px;}
.inner-title{font-size:11px;font-weight:500;color:#92400e;margin-bottom:6px;}
/* 게이지 */
.gauge-sec{text-align:center;}
/* 부채 도넛 범례 */
.dleg{display:flex;flex-direction:column;gap:4px;}
.dleg-item{display:flex;align-items:center;gap:6px;font-size:11px;}
.dleg-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0;}
/* 로드맵 */
.rm3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.rm-item{border-radius:7px;padding:10px;background:white!important;border:1px solid #e2e8f0!important;}
.rm-ph{font-size:11px;font-weight:500;margin-bottom:5px;}
.rm-tasks{display:flex;flex-direction:column;gap:3px;}
.rm-task{font-size:10px;color:#64748b;padding-left:8px;position:relative;line-height:1.4;}
.rm-task::before{content:'·';position:absolute;left:0;}
/* 성장단계 세로형 */
.gphases{display:flex;flex-direction:column;gap:6px;}
.gph{border-radius:8px;padding:10px 12px;display:flex;gap:12px;align-items:flex-start;page-break-inside:avoid;}
.gph-short{background:#eff6ff!important;border:1px solid #93c5fd!important;}
.gph-mid{background:#f0fdf4!important;border:1px solid #86efac!important;}
.gph-long{background:#fdf4ff!important;border:1px solid #d8b4fe!important;}
.gph-header{font-size:12px;font-weight:500;white-space:nowrap;min-width:88px;padding-top:2px;}
.gph-short .gph-header{color:#1d4ed8;}
.gph-mid .gph-header{color:#15803d;}
.gph-long .gph-header{color:#7c3aed;}
.gph ul{list-style:none;padding:0;margin:0;flex:1;display:flex;flex-wrap:wrap;gap:2px 14px;}
.gph li{font-size:11px;padding-left:10px;position:relative;line-height:1.5;color:#334155;word-break:keep-all;width:calc(50% - 7px);}
.gph li::before{content:'•';position:absolute;left:0;}
.gph-short li::before{color:#1d4ed8;}
.gph-mid li::before{color:#15803d;}
.gph-long li::before{color:#7c3aed;}
/* 차트 영역 */
.chart-wrap{background:white!important;border-radius:6px;border:1px solid #e2e8f0;padding:10px;}
#biz-monthly-chart-wrap{width:100%;height:180px;}
#biz-chart-title{font-size:12px;font-weight:500;color:#1e293b;margin-bottom:6px;}
/* 체크리스트 */
.chk-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;background:white!important;border:1px solid #e2e8f0!important;margin-bottom:5px;}
.chk-icon{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;flex-shrink:0;}
.chk-text{flex:1;font-size:12px;color:#334155;}
.chk-badge{font-size:10px;padding:2px 7px;border-radius:3px;font-weight:500;}
/* 순위카드 */
.rank-card{background:white!important;border:1px solid #e2e8f0!important;border-radius:8px;padding:10px 12px;margin-bottom:7px;}
.rank-header{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.rank-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;flex-shrink:0;}
.rank-name{font-size:13px;font-weight:500;color:#1e293b;}
.rank-limit{font-size:12px;font-weight:500;margin-left:auto;}
.rank-tags{display:flex;gap:5px;flex-wrap:wrap;}
.rtag{font-size:10px;padding:2px 7px;border-radius:3px;font-weight:500;}
/* 가점추천 카드 */
.cert-card{display:flex;align-items:center;gap:10px;background:white!important;border:1px solid #e2e8f0!important;border-radius:8px;padding:10px 14px;margin-bottom:7px;}
.cert-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.cert-body{flex:1;}
.cert-name{font-size:12px;font-weight:500;color:#1e293b;}
.cert-desc{font-size:11px;color:#64748b;}
.cert-amt{text-align:right;}
.cert-val{font-size:13px;font-weight:500;}
.cert-period{font-size:10px;color:#64748b;}
/* 차별점 박스 */
.diff-box{border-radius:8px;padding:12px 16px;margin-bottom:8px;}
.diff-title{font-size:12px;font-weight:500;margin-bottom:5px;}
.diff-text{font-size:12px;color:#334155;line-height:1.5;}
/* 사업계획서 마무리 */
.biz-close{background:#f0fdf4!important;border-radius:10px;padding:18px 20px;border:1px solid #86efac!important;}
.biz-close-title{font-size:13px;font-weight:500;color:#15803d;margin-bottom:10px;border-bottom:1px solid #bbf7d0;padding-bottom:8px;}
.biz-close-text{font-size:13px;color:#1e293b;line-height:2;}
/* Alert */
.alert-box{padding:14px;border-radius:6px;font-weight:bold;margin:14px 0;font-size:13px;page-break-inside:avoid;line-height:1.6;}
.alert-blue{background:#eff6ff!important;color:#1e40af!important;border-left:5px solid #3b82f6!important;}
.alert-green{background:#f0fdf4!important;color:#166534!important;border-left:5px solid #22c55e!important;}
</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head><body>
<div class="paper-inner">${reportHTML}</div>
<script>
window.onload=function(){
  // 경영진단 레이더
  var radarEl=document.getElementById('rp-radar');
  if(radarEl){
    var sc=radarEl.dataset.scores.split(',').map(Number);
    new Chart(radarEl.getContext('2d'),{type:'radar',data:{labels:['재무','전략/마케팅','인사','운영','IT'],datasets:[{data:sc,backgroundColor:'rgba(59,130,246,0.15)',borderColor:'#3b82f6',pointBackgroundColor:'#1e3a8a',pointRadius:4}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});
  }
  // 경영진단 매출 라인
  var lineEl=document.getElementById('rp-linechart');
  if(lineEl){
    var d=lineEl.dataset;
    new Chart(lineEl.getContext('2d'),{type:'line',data:{labels:['23년','24년','25년','금년(예)'],datasets:[{data:[parseInt(d.y23)||0,parseInt(d.y24)||0,parseInt(d.y25)||0,parseInt(d.exp)||0],borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.12)',borderWidth:2,pointRadius:4,fill:true,tension:0.2}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>v>=10000?Math.floor(v/10000)+'억':v.toLocaleString()+'만'}}}}});
  }
  // 재무진단 게이지들
  ['fp-gauge-p','fp-gauge-s','fp-gauge-g'].forEach(function(gid){
    var el=document.getElementById(gid);
    if(el){
      var val=parseInt(el.dataset.val)||0;
      var color=el.dataset.color||'#2563eb';
      var da=Math.round((val/100)*126);
      var svgEl=el.previousElementSibling;
      if(svgEl){
        var paths=svgEl.querySelectorAll('circle');
        if(paths[1]) paths[1].setAttribute('stroke-dasharray',da+' '+(126-da));
        if(paths[1]) paths[1].setAttribute('stroke',color);
      }
    }
  });
  // 재무진단 부채 도넛
  var debtEl=document.getElementById('fp-donut');
  if(debtEl){
    var names=debtEl.dataset.names.split('|');
    var ratios=debtEl.dataset.ratios.split(',').map(Number);
    var colors=['#2563eb','#7c3aed','#06b6d4','#16a34a','#ea580c'];
    new Chart(debtEl.getContext('2d'),{type:'doughnut',data:{labels:names,datasets:[{data:ratios,backgroundColor:colors.slice(0,ratios.length),borderWidth:2,borderColor:'white'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'60%'}});
  }
  // 상권분석 레이더
  var tradeRadar=document.getElementById('tp-radar');
  if(tradeRadar){
    var sc2=tradeRadar.dataset.scores.split(',').map(Number);
    new Chart(tradeRadar.getContext('2d'),{type:'radar',data:{labels:['유동인구','접근성','성장성','경쟁강도','가시성'],datasets:[{data:sc2,backgroundColor:'rgba(13,148,136,0.15)',borderColor:'#0d9488',pointBackgroundColor:'#0d9488',pointRadius:4}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});
  }
  // 상권분석 매출 시뮬레이션 라인
  var tradeLineEl=document.getElementById('tp-linechart');
  if(tradeLineEl){
    var td=tradeLineEl.dataset;
    new Chart(tradeLineEl.getContext('2d'),{type:'line',data:{labels:['현재','6개월','1년','2년'],datasets:[{data:[parseInt(td.s0),parseInt(td.s1),parseInt(td.s2),parseInt(td.s3)],borderColor:'#0d9488',backgroundColor:'rgba(13,148,136,0.12)',borderWidth:2,pointRadius:5,fill:true,tension:0.2}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>Math.round(v/1000)+'천만'}}}}});
  }
  // 마케팅 도넛
  var mktDonut=document.getElementById('mp-donut');
  if(mktDonut){
    var mn=mktDonut.dataset.names.split('|');
    var mr=mktDonut.dataset.ratios.split(',').map(Number);
    var mc=['#db2777','#9d174d','#f4c0d1','#fdf2f8'];
    new Chart(mktDonut.getContext('2d'),{type:'doughnut',data:{labels:mn,datasets:[{data:mr,backgroundColor:mc.slice(0,mr.length),borderWidth:2,borderColor:'white'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'60%'}});
  }
  // 사업계획서 시장 성장 차트
  var marketLine=document.getElementById('bp-market-chart');
  if(marketLine){
    new Chart(marketLine.getContext('2d'),{type:'line',data:{labels:['2016','2017','2018','2019','2020','2021','2022'],datasets:[{data:[2,2.4,3,3.8,4.5,5.8,7],borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,0.12)',borderWidth:2,pointRadius:3,fill:true,tension:0.3,label:'HMR 시장(조원)'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>v+'조'}}}}});
  }
  // 사업계획서 월별 차트
  var bizChart=document.getElementById('biz-monthly-chart');
  if(bizChart){
    var months=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    var curM=${curMonth};var avg=${avgMonthly};var actual=[],forecast=[];
    for(var i=0;i<12;i++){if(i<curM){actual.push(Math.round(avg*(0.88+i*0.025)));forecast.push(null);}else{actual.push(null);forecast.push(Math.round(avg*Math.pow(1.05,i-curM+1)));}}
    new Chart(bizChart.getContext('2d'),{type:'bar',data:{labels:months,datasets:[{label:'실적',data:actual,backgroundColor:'rgba(22,163,74,0.7)',borderColor:'#16a34a',borderWidth:1,borderRadius:4},{label:'예측',data:forecast,backgroundColor:'rgba(59,130,246,0.45)',borderColor:'#3b82f6',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{font:{size:10}}}},scales:{y:{ticks:{callback:v=>v>=10000?Math.floor(v/10000)+'억':Math.round(v/1000)+'천만'}}}}});
  }
  // 재무진단 성장 목표 라인
  var growthLine=document.getElementById('fp-growth-chart');
  if(growthLine){
    new Chart(growthLine.getContext('2d'),{type:'line',data:{labels:['2026','2027','2028'],datasets:[{data:[14,24,35],borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,0.12)',borderWidth:2,pointRadius:5,fill:true,tension:0.2,label:'목표 매출(억)'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>v+'억'}}}}});
  }
  setTimeout(()=>{window.print();window.close();},1000);
};
</script></body></html>`);
  printWin.document.close();
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
function buildCoverHTML(cData, config, rev, dateStr) {
  const session=JSON.parse(localStorage.getItem(DB_SESSION));
  const cName=session?.name||'담당자', cDept=session?.dept||'솔루션빌더스';
  const safeRev=rev||{cur:0,y25:0,y24:0,y23:0};
  const exp=calcExpected(cData,safeRev);
  const vLabel=config.version==='consultant'?'컨설턴트용':config.version==='client'?'기업전달용':config.vLabel||'';
  const color=config.borderColor||'#3b82f6';
  return`<div class="cover-page">
    <div class="cover-header">
      <h4 style="color:${color};border-bottom-color:${color};">${config.reportKind||'AI 리포트'}</h4>
      <h1>${config.title}${vLabel?` <span style="font-size:16px;color:#94a3b8;">(${vLabel})</span>`:''}</h1>
    </div>
    <div class="cover-middle">
      <h2>${cData.name}</h2>
      <div class="cover-table"><table>
        <tr><th style="color:${color}">사업자번호</th><td>${cData.bizNum||'-'}</td><th style="color:${color}">업종</th><td>${cData.industry||'-'}</td></tr>
        <tr><th style="color:${color}">대표자</th><td>${cData.rep||'-'}</td><th style="color:${color}">핵심아이템</th><td>${cData.coreItem||'-'}</td></tr>
        <tr><th style="color:${color}">설립일</th><td>${cData.bizDate||'-'}</td><th style="color:${color}">상시근로자</th><td>${cData.empCount||'-'}명</td></tr>
        <tr><th style="color:${color}">전년 매출</th><td>${fKRW(safeRev.y25)}</td><th style="color:${color}">금년 예상</th><td>${fKRW(exp)}</td></tr>
      </table></div>
    </div>
    <div class="cover-footer"><div>📅 ${dateStr}</div><div>👤 ${cName}</div><div>🏢 ${cDept}</div></div>
  </div>`;
}

// ===========================
// ★ 페이지 래퍼
// ===========================
function rpWrap(num, title, sub, color, content) {
  const numBg = color==='#d97706' ? '#fef3c7' : '#eff6ff';
  const numTxt = color==='#d97706' ? '#d97706' : color;
  return `<div class="rp-page">
    <div class="ptr">
      <div class="pnum" style="background:${numBg};color:${numTxt};">${num}</div>
      <span class="ptitle">${title}</span>
      <span class="psub">${sub||''}</span>
    </div>
    ${content}
  </div>`;
}

// ===================================================================
// ★★★ 템플릿: 경영진단 기업전달용 (표지+6P) ★★★
// ===================================================================
function buildMgmtClientHTML(d, cData, rev, dateStr) {
  const exp=calcExpected(cData,rev);
  const color='#3b82f6';
  const cover=buildCoverHTML(cData,{title:'AI 경영진단보고서',reportKind:'AI 경영진단보고서 리포트',version:'client',borderColor:color},rev,dateStr);

  // P1: 경영진단 개요
  const p1=rpWrap(1,'경영진단 개요','기업현황 요약',color,`
    <table class="ov-table">
      <tr><th>기업명</th><td>${cData.name}</td><th>업종</th><td>${cData.industry||'-'}</td></tr>
      <tr><th>대표자</th><td>${cData.rep||'-'}</td><th>설립일</th><td>${cData.bizDate||'-'}</td></tr>
      <tr><th>사업자번호</th><td>${cData.bizNum||'-'}</td><th>상시근로자</th><td>${cData.empCount||'-'}명</td></tr>
      <tr><th>전년 매출</th><td>${fKRW(rev.y25)}</td><th>금년 예상</th><td>${fKRW(exp)}</td></tr>
    </table>
    <div class="g3" style="margin-bottom:12px;">
      ${tpCard('종합 진단 등급',d.grade||'B+',d.grade_desc||'성장 유망 단계',color)}
      ${tpCard('매출 성장률',fKRW(rev.y25)?'+21%':'분석중','전년 대비','#16a34a')}
      ${tpCard('핵심 아이템',cData.coreItem||'-','경쟁력 보유','#7c3aed')}
    </div>
    <div class="sbox"><h4 style="color:${color}">진단 목적 및 방향</h4>${tpList(d.overview||['기업 현황을 분석합니다.'],color)}</div>
  `);

  // P2: 재무현황
  const p2=rpWrap(2,'재무 현황 분석','매출 추이 · 수익성',color,`
    <div class="sbox" style="margin-bottom:10px;">
      <h4 style="color:${color}">연도별 매출 추이</h4>
      <div class="chart-wrap" style="height:160px;">
        <canvas id="rp-linechart" data-y23="${rev.y23||0}" data-y24="${rev.y24||0}" data-y25="${rev.y25||0}" data-exp="${exp||0}" style="width:100%;height:100%;"></canvas>
      </div>
    </div>
    <div class="g2">
      <div class="sbox"><h4 style="color:${color}">재무 강점</h4>${tpList(d.finance_strengths||['재무 현황 분석 중'],color)}</div>
      <div class="sbox"><h4 style="color:#f97316">개선 포인트</h4>${tpList(d.finance_risks||['개선 방향 분석 중'],'#f97316')}</div>
    </div>
  `);

  // P3: 전략·마케팅
  const radar=d.radar||[65,80,68,70,55];
  const bars=d.marketing_bars||{finance:72,strategy:85,operation:68};
  const p3=rpWrap(3,'전략 및 마케팅 분석','역량 레이더 · 포지셔닝',color,`
    <div class="g2">
      <div class="sbox">
        <h4 style="color:${color}">경영 역량 진단 레이더</h4>
        <div class="chart-wrap" style="height:160px;">
          <canvas id="rp-radar" data-scores="${radar.join(',')}" style="width:100%;height:100%;"></canvas>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div class="sbox" style="flex:1;"><h4 style="color:${color}">마케팅 현황</h4>${tpList(d.marketing||['마케팅 분석 중'],color)}</div>
        <div class="sbox"><h4 style="color:${color}">영역별 점수</h4>
          ${tpHBar('재무건전성',bars.finance,bars.finance+'점',color)}
          ${tpHBar('전략/마케팅',bars.strategy,bars.strategy+'점',color)}
          ${tpHBar('운영/생산',bars.operation,bars.operation+'점',color)}
        </div>
      </div>
    </div>
  `);

  // P4: 인사·운영·IT
  const p4=rpWrap(4,'인사·조직 및 운영·생산 분석','조직 역량 · 생산 효율',color,`
    <div class="g2" style="margin-bottom:10px;">
      <div class="sbox"><h4 style="color:${color}">인사·조직</h4>${tpList(d.hr||['인사 분석 중'],color)}</div>
      <div class="sbox"><h4 style="color:${color}">운영·생산</h4>${tpList(d.ops||['운영 분석 중'],color)}</div>
    </div>
    <div class="sbox"><h4 style="color:${color}">IT·디지털 활용</h4>${tpList(d.it||['IT 분석 중'],color)}</div>
  `);

  // P5: 가점추천 (기업전달용 독립 페이지)
  const certs=d.certs||[{name:'벤처인증',effect:'중진공 우대금리 적용으로 추가 자금 한도 확보 가능함',amount:'+2억',period:'6개월 내'},{name:'이노비즈 인증',effect:'기술혁신형 중소기업 인증으로 기보 우대 보증 적용 가능함',amount:'+3억',period:'1년 내'},{name:'HACCP 인증',effect:'식품 안전 인증 취득 시 대형마트·급식 납품 채널 확대 가능함',amount:'채널↑',period:'매출 확대'},{name:'기업부설연구소',effect:'R&D 세액공제 25% 적용 및 기보 기술보증 우대 적용 가능함',amount:'+1.5억',period:'세액공제 병행'}];
  const certIcons=['🏆','📜','✅','🔬','💡','🎯'];
  const certColors=['#f0fdf4','#eff6ff','#fff7ed','#fdf4ff','#fef9c3','#fce7f3'];
  const totalCert=certs.filter(c=>c.amount&&c.amount!=='채널↑').reduce((sum,c)=>{const n=parseFloat(c.amount.replace(/[^0-9.]/g,''));return sum+(isNaN(n)?0:n);},0);
  const p5=rpWrap(5,'가점추천','인증 취득 시 정책자금 한도 확대',color,`
    <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:12px;">
      ${certs.map((c,i)=>`<div class="cert-card"><div class="cert-icon" style="background:${certColors[i%certColors.length]}">${certIcons[i%certIcons.length]}</div><div class="cert-body"><div class="cert-name">${c.name}</div><div class="cert-desc">${c.effect}</div></div><div class="cert-amt"><div class="cert-val" style="color:${color}">${c.amount}</div><div class="cert-period">${c.period}</div></div></div>`).join('')}
    </div>
    <div style="background:#eff6ff;border-radius:8px;padding:12px 16px;border:1px solid #bfdbfe;text-align:center;">
      <div style="font-size:12px;font-weight:500;color:#1e40af;margin-bottom:4px;">인증 완료 시 총 추가 한도 (예상)</div>
      <div style="font-size:22px;font-weight:700;color:${color};">최대 +${totalCert > 0 ? totalCert+'억원' : '상당액'}</div>
      <div style="font-size:11px;color:#64748b;margin-top:3px;">현재 자금 조달 기준 → 인증 취득 후 추가 조달 가능</div>
    </div>
  `);

  // P6: 개선방향 로드맵
  const p6=rpWrap(6,'개선 방향 및 성장 로드맵','단기·중기·장기',color,`
    <div class="rm3" style="margin-bottom:12px;">
      <div class="rm-item" style="border-top:3px solid ${color}"><div class="rm-ph" style="color:#1d4ed8">⚡ 단기 (6개월)</div><div class="rm-tasks">${(d.roadmap_short||['단기 과제 1','단기 과제 2','단기 과제 3','단기 과제 4']).map(t=>`<div class="rm-task">${t}</div>`).join('')}</div></div>
      <div class="rm-item" style="border-top:3px solid #16a34a"><div class="rm-ph" style="color:#15803d">📈 중기 (1년)</div><div class="rm-tasks">${(d.roadmap_mid||['중기 과제 1','중기 과제 2','중기 과제 3','중기 과제 4']).map(t=>`<div class="rm-task">${t}</div>`).join('')}</div></div>
      <div class="rm-item" style="border-top:3px solid #7c3aed"><div class="rm-ph" style="color:#6d28d9">🌟 장기 (3년)</div><div class="rm-tasks">${(d.roadmap_long||['장기 과제 1','장기 과제 2','장기 과제 3','장기 과제 4']).map(t=>`<div class="rm-task">${t}</div>`).join('')}</div></div>
    </div>
    <div class="sbox" style="background:#eff6ff;border-color:#bfdbfe;"><h4 style="color:#1e40af">★ 종합 의견</h4>${tpList(d.summary||['종합 의견을 작성합니다.'],color)}</div>
  `);

  return `<div class="paper-inner">${cover}${p1}${p2}${p3}${p4}${p5}${p6}</div>`;
}

// ===================================================================
// ★★★ 템플릿: 경영진단 컨설턴트용 (표지+7P) ★★★
// ===================================================================
function buildMgmtConsultantHTML(d, cData, rev, dateStr) {
  const exp=calcExpected(cData,rev);
  const color='#3b82f6';
  const cover=buildCoverHTML(cData,{title:'AI 경영진단보고서',reportKind:'AI 경영진단보고서 리포트',version:'consultant',borderColor:'#1e293b'},rev,dateStr);

  // P1~P6: 기업전달용과 동일 구조 + 피드백 박스
  const p1=rpWrap(1,'경영진단 개요','기업현황 · 리스크 포함',color,`
    <table class="ov-table">
      <tr><th>기업명</th><td>${cData.name}</td><th>업종</th><td>${cData.industry||'-'}</td></tr>
      <tr><th>대표자</th><td>${cData.rep||'-'}</td><th>설립일</th><td>${cData.bizDate||'-'}</td></tr>
      <tr><th>사업자번호</th><td>${cData.bizNum||'-'}</td><th>상시근로자</th><td>${cData.empCount||'-'}명</td></tr>
      <tr><th>전년 매출</th><td>${fKRW(rev.y25)}</td><th>금년 예상</th><td>${fKRW(exp)}</td></tr>
    </table>
    <div class="g2">
      <div class="sbox"><h4 style="color:${color}">진단 목적</h4>${tpList(d.overview||['진단 목적 분석 중'],color)}</div>
      <div class="sbox" style="background:#fffbeb;border-color:#fcd34d;"><h4 style="color:#92400e">🚨 핵심 리스크 요약</h4>${tpList(d.key_risks||['리스크 분석 중'],'#d97706')}</div>
    </div>
  `);

  const p2=rpWrap(2,'재무 현황 분석','리스크 포함',color,`
    <div class="sbox" style="margin-bottom:10px;"><h4 style="color:${color}">연도별 매출 추이</h4><div class="chart-wrap" style="height:140px;"><canvas id="rp-linechart" data-y23="${rev.y23||0}" data-y24="${rev.y24||0}" data-y25="${rev.y25||0}" data-exp="${exp||0}" style="width:100%;height:100%;"></canvas></div></div>
    <div class="g2">
      <div class="sbox"><h4 style="color:${color}">재무 현황</h4>${tpList(d.finance_strengths||['재무 분석 중'],color)}</div>
      ${tpFeedback(d.fb_finance||['재무 리스크 분석 중','현금흐름 관리 방안 수립 필요'])}
    </div>
  `);

  const radar=d.radar||[65,80,68,70,55];
  const bars=d.marketing_bars||{finance:72,strategy:85,operation:68};
  const p3=rpWrap(3,'전략 및 마케팅 분석','취약점 포함',color,`
    <div class="g2" style="margin-bottom:10px;">
      <div class="sbox"><h4 style="color:${color}">역량 레이더</h4><div class="chart-wrap" style="height:140px;"><canvas id="rp-radar" data-scores="${radar.join(',')}" style="width:100%;height:100%;"></canvas></div></div>
      <div class="sbox"><h4 style="color:${color}">영역별 점수</h4>${tpHBar('재무건전성',bars.finance,bars.finance+'점',color)}${tpHBar('전략/마케팅',bars.strategy,bars.strategy+'점',color)}${tpHBar('운영/생산',bars.operation,bars.operation+'점',color)}</div>
    </div>
    ${tpFeedback(d.fb_marketing||['마케팅 리스크 분석 중'])}
  `);

  const p4=rpWrap(4,'인사·조직 및 운영·생산',color,`
    <div class="g2" style="margin-bottom:10px;">
      <div class="sbox"><h4 style="color:${color}">인사·조직</h4>${tpList(d.hr||['인사 분석 중'],color)}</div>
      <div class="sbox"><h4 style="color:${color}">운영·생산</h4>${tpList(d.ops||['운영 분석 중'],color)}</div>
    </div>
    ${tpFeedback(d.fb_hr_ops||['인사·운영 리스크 분석 중'])}
  `);

  const p5=rpWrap(5,'IT·디지털 및 정부지원 활용','개선 과제',color,`
    <div class="sbox" style="margin-bottom:10px;"><h4 style="color:${color}">IT·디지털 현황</h4>${tpList(d.it||['IT 분석 중'],color)}</div>
    ${tpFeedback(d.fb_it||['IT 개선 방향 분석 중'])}
  `);

  const p6=rpWrap(6,'개선 방향 및 성장 로드맵','우선순위별 실행',color,`
    <div class="rm3" style="margin-bottom:10px;">
      <div class="rm-item" style="border-top:3px solid ${color}"><div class="rm-ph" style="color:#1d4ed8">⚡ 단기</div><div class="rm-tasks">${(d.roadmap_short||['단기 1','단기 2']).map(t=>`<div class="rm-task">${t}</div>`).join('')}</div></div>
      <div class="rm-item" style="border-top:3px solid #16a34a"><div class="rm-ph" style="color:#15803d">📈 중기</div><div class="rm-tasks">${(d.roadmap_mid||['중기 1','중기 2']).map(t=>`<div class="rm-task">${t}</div>`).join('')}</div></div>
      <div class="rm-item" style="border-top:3px solid #7c3aed"><div class="rm-ph" style="color:#6d28d9">🌟 장기</div><div class="rm-tasks">${(d.roadmap_long||['장기 1','장기 2']).map(t=>`<div class="rm-task">${t}</div>`).join('')}</div></div>
    </div>
    ${tpFeedback(d.fb_roadmap||['로드맵 우선순위 분석 중'])}
  `);

  // P7: 컨설턴트 전용 (가점추천 통합)
  const certs=d.certs||[{name:'벤처인증',effect:'중진공 우대금리로 추가 한도 확보 가능',amount:'+2억',period:'6개월'},{name:'이노비즈',effect:'기술보증 우대 적용 가능',amount:'+3억',period:'1년'}];
  const p7=rpWrap('🔒','컨설턴트 실질 조언','내부 전용 — 외부 배포 금지','#d97706',`
    <div class="consult-box">
      <h3>🔒 컨설턴트 전용 자료</h3>
      <div class="inner-box"><div class="inner-title">🚨 시급 해결 이슈 TOP 3</div>${tpList(d.consultant_issues||['시급 이슈 분석 중'],'#d97706')}</div>
      <div class="inner-box"><div class="inner-title">💰 정책자금 신청 전략</div>${tpList(d.consultant_funds||['정책자금 전략 분석 중'],'#d97706')}</div>
      <div class="inner-box"><div class="inner-title">📜 특허·인증 취득 전략 + 가점추천</div>
        <div style="margin-bottom:8px;">${tpList(d.consultant_certs||['인증 전략 분석 중'],'#d97706')}</div>
        ${certs.map(c=>`<div class="cert-card" style="background:white;border:1px solid #fcd34d;"><div class="cert-body"><div class="cert-name">${c.name}</div><div class="cert-desc">${c.effect}</div></div><div class="cert-amt"><div class="cert-val" style="color:#d97706">${c.amount}</div><div class="cert-period">${c.period}</div></div></div>`).join('')}
      </div>
      <div class="g2" style="gap:8px;">
        <div class="inner-box" style="margin-bottom:0"><div class="inner-title">📈 마케팅 개선 방안</div>${tpList(d.consultant_marketing||['마케팅 방안 분석 중'],'#d97706')}</div>
        <div class="inner-box" style="margin-bottom:0"><div class="inner-title">💳 신용 개선 로드맵</div>${tpList(d.consultant_credit||['신용 개선 방안 분석 중'],'#d97706')}</div>
      </div>
    </div>
  `);

  return `<div class="paper-inner">${cover}${p1}${p2}${p3}${p4}${p5}${p6}${p7}</div>`;
}

// ===================================================================
// ★★★ 템플릿: 상세 재무진단 (표지+3P) ★★★
// ===================================================================
function buildFinanceHTML(d, cData, rev, dateStr) {
  const color='#2563eb';
  const cover=buildCoverHTML(cData,{title:'AI 상세 재무진단',reportKind:'AI 상세 재무진단 리포트',vLabel:'리포트',borderColor:color},rev,dateStr);
  const exp=calcExpected(cData,rev);
  const scores=d.scores||{profit:72,stable:80,growth:88};
  const scoreDescs=d.score_descs||{profit:'매출이익률 양호',stable:'부채비율 안정적',growth:'매출 성장률 최우수'};
  const scoreColors={profit:color,stable:'#16a34a',growth:'#7c3aed'};

  function gaugeEl(id,val,col,lbl,desc){
    const da=Math.round((val/100)*126);
    return`<div class="sbox" style="text-align:center;">
      <h4 style="color:${col};text-align:left">${lbl}</h4>
      <svg viewBox="0 0 100 56" width="100" height="56" style="display:block;margin:0 auto 4px;">
        <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="#e2e8f0" stroke-width="10"/>
        <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="${col}" stroke-width="10" stroke-dasharray="${da} ${126-da}" stroke-linecap="round"/>
        <text x="50" y="48" text-anchor="middle" font-size="14" font-weight="500" fill="var(--color-text-primary,#333)">${val}</text>
      </svg>
      <div style="font-size:10px;color:#64748b;">${desc}</div>
    </div>`;
  }

  const p1=rpWrap(1,'재무 종합 현황','수익성·안정성·성장성',color,`
    <div class="g3" style="margin-bottom:12px;">
      ${gaugeEl('fp-gauge-p',scores.profit,scoreColors.profit,'수익성',scoreDescs.profit)}
      ${gaugeEl('fp-gauge-s',scores.stable,scoreColors.stable,'안정성',scoreDescs.stable)}
      ${gaugeEl('fp-gauge-g',scores.growth,scoreColors.growth,'성장성',scoreDescs.growth)}
    </div>
    <div class="sbox"><h4 style="color:${color}">연도별 매출 추이</h4>
      <div class="chart-wrap" style="height:150px;"><canvas id="rp-linechart" data-y23="${rev.y23||0}" data-y24="${rev.y24||0}" data-y25="${rev.y25||0}" data-exp="${exp||0}" style="width:100%;height:100%;"></canvas></div>
    </div>
  `);

  // 부채 구성
  const debtData=d.debt||[{name:'중진공',ratio:54},{name:'기보',ratio:27},{name:'재단',ratio:19}];
  const debtColors=['#2563eb','#7c3aed','#06b6d4','#16a34a','#ea580c'];
  const profitBars=d.profit_bars||[{label:'매출 성장률(YoY)',value:85,display:'+21%'},{label:'매출이익률',value:62,display:'38%'},{label:'영업이익률',value:44,display:'22%'}];

  const p2=rpWrap(2,'수익성 및 안정성 분석','부채 구성 · 재무 지표',color,`
    <div class="g2" style="margin-bottom:10px;">
      <div class="sbox"><h4 style="color:${color}">수익성 분석</h4>
        ${profitBars.map(b=>tpHBar(b.label,b.value,b.display,color)).join('')}
      </div>
      <div class="sbox"><h4 style="color:${color}">부채 구성 비율</h4>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="chart-wrap" style="width:90px;height:90px;flex-shrink:0;padding:0;border:none;">
            <canvas id="fp-donut" data-names="${debtData.map(d=>d.name).join('|')}" data-ratios="${debtData.map(d=>d.ratio).join(',')}" style="width:100%;height:100%;"></canvas>
          </div>
          <div class="dleg">
            ${debtData.map((dd,i)=>`<div class="dleg-item"><div class="dleg-dot" style="background:${debtColors[i]}"></div><span style="flex:1">${dd.name}</span><span style="font-weight:500">${dd.ratio}%</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="sbox"><h4 style="color:${color}">안정성 핵심 지표</h4>
      <div class="g4">${(d.stable_metrics||[{label:'부채비율',value:'낮음',desc:'전액 정책자금'},{label:'KCB 신용',value:'710점',desc:'3등급'},{label:'NICE 신용',value:'740점',desc:'3등급'},{label:'연체·체납',value:'없음',desc:'리스크 최저'}]).map(m=>tpCard(m.label,m.value,m.desc,color)).join('')}</div>
    </div>
  `);

  const p3=rpWrap(3,'성장성 분석 및 재무 개선 방향','목표 · 액션플랜',color,`
    <div class="g2" style="margin-bottom:10px;">
      <div class="sbox"><h4 style="color:#7c3aed">성장성 분석</h4>${tpList(d.growth_items||['성장성 분석 중'],'#7c3aed')}</div>
      <div class="sbox"><h4 style="color:#7c3aed">3개년 매출 목표</h4><div class="chart-wrap" style="height:110px;"><canvas id="fp-growth-chart" style="width:100%;height:100%;"></canvas></div></div>
    </div>
    <div class="sbox"><h4 style="color:${color}">재무 개선 우선순위 액션플랜</h4>
      <div class="rm3">
        <div class="rm-item" style="border-top:3px solid #ef4444"><div class="rm-ph" style="color:#dc2626">🔴 즉시 (1개월)</div><div style="font-size:11px;color:#64748b;line-height:1.5">${d.action_urgent||'즉시 실행 과제를 분석합니다.'}</div></div>
        <div class="rm-item" style="border-top:3px solid #f97316"><div class="rm-ph" style="color:#ea580c">🟠 단기 (3개월)</div><div style="font-size:11px;color:#64748b;line-height:1.5">${d.action_short||'단기 실행 과제를 분석합니다.'}</div></div>
        <div class="rm-item" style="border-top:3px solid ${color}"><div class="rm-ph" style="color:#1d4ed8">🔵 중기 (1년)</div><div style="font-size:11px;color:#64748b;line-height:1.5">${d.action_mid||'중기 실행 과제를 분석합니다.'}</div></div>
      </div>
    </div>
  `);

  return `<div class="paper-inner">${cover}${p1}${p2}${p3}</div>`;
}

// ===================================================================
// ★★★ 템플릿: 상권분석 (표지+2P) ★★★
// ===================================================================
function buildTradeHTML(d, cData, rev, dateStr) {
  const color='#0d9488';
  const cover=buildCoverHTML(cData,{title:'AI 상권분석 리포트',reportKind:'AI 빅데이터 상권분석',vLabel:'리포트',borderColor:color},rev,dateStr);
  const radar=d.radar||[82,75,68,72,80];
  const sim=d.sim||{s0:9167,s1:12500,s2:16667,s3:25000};

  const p1=rpWrap(1,'상권 현황 분석','핵심 입지 지표 · 경쟁 분석',color,`
    <div class="g2">
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div class="sbox">
          <h4 style="color:${color}">핵심 입지 지표</h4>
          <div class="g3">
            ${tpCard('유동인구 (일평균)',d.traffic||'2,400명','일평균 유동량',color)}
            ${tpCard('반경 1km 경쟁업체',d.competitors||'7개','직접 경쟁사',d.competitors>5?'#f97316':'#16a34a')}
            ${tpCard('입지 경쟁력 등급',d.grade||'B+','상위 30%',color)}
          </div>
        </div>
        <div class="sbox"><h4 style="color:${color}">상권 특성</h4>${tpList(d.features||['상권 특성 분석 중'],color)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div class="sbox" style="flex:1"><h4 style="color:${color}">입지 경쟁력 레이더</h4><div class="chart-wrap" style="height:160px;"><canvas id="tp-radar" data-scores="${radar.join(',')}" style="width:100%;height:100%;"></canvas></div></div>
        <div class="sbox"><h4 style="color:${color}">경쟁 현황 요약</h4>
          <div style="display:flex;justify-content:space-between;font-size:12px;">
            <div style="text-align:center"><div style="font-size:18px;font-weight:500;color:${color}">${d.comp_direct||7}</div><div style="color:#64748b">직접 경쟁사</div></div>
            <div style="text-align:center"><div style="font-size:18px;font-weight:500;color:#f97316">${d.comp_strong||3}</div><div style="color:#64748b">강성 경쟁사</div></div>
            <div style="text-align:center"><div style="font-size:18px;font-weight:500;color:#16a34a">${d.diff_potential||'高'}</div><div style="color:#64748b">차별화 여지</div></div>
          </div>
        </div>
      </div>
    </div>
  `);

  const target=d.target||{age:'30~40대',household:'1~2인',channel:'온라인',cycle:'월 2~3회'};
  const p2=rpWrap(2,'타겟 고객 및 매출 예측','고객 프로파일 · 시뮬레이션',color,`
    <div class="g2" style="margin-bottom:12px;">
      <div class="sbox"><h4 style="color:${color}">타겟 고객 프로파일</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${[['주 연령대',target.age||'30~40대'],['가구 유형',target.household||'1~2인'],['구매 채널',target.channel||'온라인'],['구매 주기',target.cycle||'월 2~3회']].map(([l,v])=>`<div style="background:white;border-radius:6px;padding:8px;border:1px solid #e2e8f0;text-align:center"><div style="font-size:10px;color:#64748b">${l}</div><div style="font-size:15px;font-weight:500;color:${color}">${v}</div></div>`).join('')}
        </div>
      </div>
      <div class="sbox"><h4 style="color:${color}">운영 전략 포인트</h4>${tpList(d.strategy||['운영 전략 분석 중'],color)}</div>
    </div>
    <div class="sbox">
      <h4 style="color:${color}">매출 잠재력 시뮬레이션 (만원/월)</h4>
      <div class="chart-wrap" style="height:130px;">
        <canvas id="tp-linechart" data-s0="${sim.s0}" data-s1="${sim.s1}" data-s2="${sim.s2}" data-s3="${sim.s3}" style="width:100%;height:100%;"></canvas>
      </div>
      <div style="font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:7px;margin-top:4px;">업종 평균 대비 성장률 달성 시 시뮬레이션 기준값 (단위: 만원/월)</div>
    </div>
  `);

  return `<div class="paper-inner">${cover}${p1}${p2}</div>`;
}

// ===================================================================
// ★★★ 템플릿: 마케팅제안 (표지+2P) ★★★
// ===================================================================
function buildMarketingHTML(d, cData, rev, dateStr) {
  const color='#db2777';
  const cover=buildCoverHTML(cData,{title:'AI 마케팅 제안서',reportKind:'AI 맞춤형 마케팅 제안서',vLabel:'제안서',borderColor:color},rev,dateStr);
  const channels=d.channels||[{name:'SNS (인스타·유튜브)',score:88},{name:'네이버 검색광고',score:75},{name:'블로그·리뷰 마케팅',score:70},{name:'오프라인 판촉',score:42}];
  const budget=d.budget||[{name:'SNS 광고',ratio:40},{name:'검색광고',ratio:25},{name:'콘텐츠제작',ratio:20},{name:'기타',ratio:15}];
  const budgetColors=['#db2777','#9d174d','#f4c0d1','#fdf2f8'];

  const p1=rpWrap(1,'채널별 마케팅 전략 및 예산','채널 효과 · 예산 배분',color,`
    <div class="g2">
      <div class="sbox">
        <h4 style="color:${color}">채널별 예상 효과 (점수 /100)</h4>
        ${channels.map((c,i)=>tpHBar(c.name,c.score,c.score+'점',i===0?color:i===1?'#be185d':'#9d174d')).join('')}
        <div style="margin-top:10px;"><h4 style="color:${color}">핵심 전략</h4>${tpList(d.strategies||['마케팅 전략 분석 중'],color)}</div>
      </div>
      <div class="sbox">
        <h4 style="color:${color}">월 마케팅 예산 배분 (${d.budget_total||'700만원/월'})</h4>
        <div class="chart-wrap" style="width:110px;height:110px;margin:0 auto 10px;border:none;padding:0;">
          <canvas id="mp-donut" data-names="${budget.map(b=>b.name).join('|')}" data-ratios="${budget.map(b=>b.ratio).join(',')}" style="width:100%;height:100%;"></canvas>
        </div>
        <div class="dleg">
          ${budget.map((b,i)=>`<div class="dleg-item"><div class="dleg-dot" style="background:${budgetColors[i]}"></div><span style="flex:1">${b.name}</span><span style="font-weight:500">${b.ratio}%</span></div>`).join('')}
        </div>
      </div>
    </div>
  `);

  const kpi=d.kpi||[{label:'SNS 팔로워',value:'+3,000',period:'3개월'},{label:'월 매출',value:'+30%',period:'6개월'},{label:'재구매율',value:'40%',period:'목표'},{label:'리뷰 누적',value:'500건',period:'6개월'}];
  const roadmap=d.roadmap||[{period:'1월',task:'SNS 채널 개설',highlight:false},{period:'2월',task:'블로거 협업',highlight:false},{period:'3월',task:'바이럴 캠페인',highlight:false},{period:'4~5월',task:'성과 분석·최적화',highlight:true},{period:'6월',task:'정기구독 론칭',highlight:false},{period:'7월~',task:'오프라인 진출',highlight:false}];

  const p2=rpWrap(2,'KPI 목표 및 월별 실행 로드맵','목표 · 타임라인',color,`
    <div class="g4" style="margin-bottom:12px;">
      ${kpi.map(k=>tpCard(k.label,k.value,k.period,color)).join('')}
    </div>
    <div class="sbox"><h4 style="color:${color}">월별 실행 로드맵</h4>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:4px;">
        ${roadmap.map(r=>`<div style="border-radius:6px;background:${r.highlight?'#f4c0d1':'#fdf2f8'};border:0.5px solid ${r.highlight?color:'#f4c0d1'};padding:8px 6px;"><div style="font-size:10px;font-weight:500;color:${r.highlight?'#9d174d':color};margin-bottom:4px;">${r.period}</div><div style="font-size:10px;color:#64748b;line-height:1.4;">${r.task}</div></div>`).join('')}
      </div>
    </div>
  `);

  return `<div class="paper-inner">${cover}${p1}${p2}</div>`;
}

// ===================================================================
// ★★★ 템플릿: 정책자금매칭 (표지+3P) ★★★
// ===================================================================
function buildFundHTML(d, cData, rev, dateStr) {
  const color='#ea580c';
  const cover=buildCoverHTML(cData,{title:'AI 정책자금매칭',reportKind:'AI 정책자금 매칭 리포트',vLabel:'리포트',borderColor:color},rev,dateStr);
  const checks=d.checks||[{text:'중소기업 해당 여부',status:'pass'},{text:'국세·지방세 체납 없음',status:'pass'},{text:'금융연체 이력 없음',status:'pass'},{text:'사업자 등록 유효',status:'pass'},{text:'업력 2년 이상',status:'cond'},{text:'벤처·이노비즈 인증',status:'fail'}];
  const score=d.score||78;
  const gda=Math.round((score/100)*151);

  function chkIcon(s){return s==='pass'?{bg:'#dcfce7',tc:'#16a34a',icon:'✓',badge:'통과',bbc:'#dcfce7',btc:'#166534'}:s==='cond'?{bg:'#fef9c3',tc:'#ca8a04',icon:'!',badge:'조건부',bbc:'#fef9c3',btc:'#854d0e'}:{bg:'#fee2e2',tc:'#dc2626',icon:'✗',badge:'미보유',bbc:'#fee2e2',btc:'#991b1b'};}

  const p1=rpWrap(1,'기업 자격요건 분석','신청 가능 여부 체크',color,`
    <div class="g2">
      <div class="sbox"><h4 style="color:${color}">기본 자격 체크리스트</h4>
        ${checks.map(c=>{const s=chkIcon(c.status);return`<div class="chk-item"><div class="chk-icon" style="background:${s.bg};color:${s.tc}">${s.icon}</div><div class="chk-text">${c.text}</div><span class="chk-badge" style="background:${s.bbc};color:${s.btc}">${s.badge}</span></div>`;}).join('')}
      </div>
      <div class="sbox" style="text-align:center">
        <h4 style="color:${color}">신청 가능성 종합 점수</h4>
        <svg viewBox="0 0 130 72" width="130" height="72" style="display:block;margin:0 auto 8px">
          <path d="M14,62 A52,52 0 0,1 116,62" fill="none" stroke="#e2e8f0" stroke-width="14"/>
          <path d="M14,62 A52,52 0 0,1 116,62" fill="none" stroke="${color}" stroke-width="14" stroke-dasharray="${gda} ${151-gda}" stroke-linecap="round"/>
          <text x="65" y="56" text-anchor="middle" font-size="20" font-weight="500" fill="#1e293b">${score}</text>
        </svg>
        <div style="font-size:14px;font-weight:500;color:${color}">${d.score_desc||'신청 가능'}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">${d.match_count||5}개 기관 매칭 완료</div>
        <div style="margin-top:12px;text-align:left">${tpList(d.score_items||['기본 자격 통과 — 주요 정책자금 신청 가능한 수준임','인증 취득 시 추가 한도 1~2억 확보 가능함'],color)}</div>
      </div>
    </div>
  `);

  const rankColors=[color,'#f97316','#fb923c','#94a3b8','#94a3b8'];
  const funds=d.funds||[{rank:1,name:'중진공 소공인 특화자금',limit:'1억',tags:['금리 2.5%','즉시 신청 가능','제조업 우대']},{rank:2,name:'기보 기술보증 (특허 우대)',limit:'3억',tags:['보증료 0.5%','특허 1건 우대','90% 보증']},{rank:3,name:'소진공 성장촉진자금',limit:'1억',tags:['금리 3.0%','창업 3년 이내','온라인 신청']},{rank:4,name:'지역신보 소액보증',limit:'5천만',tags:['보증료 0.8%','지역 맞춤','빠른 처리']},{rank:5,name:'신보 창업기업 특례보증',limit:'2억',tags:['보증료 0.5%','벤처인증 조건부','95% 보증']}];

  const p2=rpWrap(2,'추천 정책자금 TOP 5','한도·금리·특징',color,`
    ${funds.map((f,i)=>`<div class="rank-card" style="${i<3?`border-left:3px solid ${rankColors[i]}`:''}">
      <div class="rank-header">
        <div class="rank-num" style="background:${i<3?rankColors[i]:'#f1f5f9'};color:white">${f.rank}</div>
        <span class="rank-name">${f.name}</span>
        <span class="rank-limit" style="color:${i<3?rankColors[i]:'#64748b'}">${f.limit}</span>
      </div>
      <div class="rank-tags">${f.tags.map((t,j)=>`<span class="rtag" style="background:${j===0?'#fff7ed':'#f1f5f9'};color:${j===0?'#c2410c':'#475569'}">${t}</span>`).join('')}</div>
    </div>`).join('')}
  `);

  const comp=d.comparison||[{org:'중진공',limit:'1억',rate:'2.5%',period:'5년',diff:'easy'},{org:'기보',limit:'3억',rate:'0.5%',period:'7년',diff:'mid'},{org:'소진공',limit:'1억',rate:'3.0%',period:'5년',diff:'easy'},{org:'지역신보',limit:'5천만',rate:'0.8%',period:'3년',diff:'easy'}];
  const diffMap={easy:{bg:'#dcfce7',tc:'#166534',lbl:'쉬움'},mid:{bg:'#fef9c3',tc:'#854d0e',lbl:'보통'},hard:{bg:'#fee2e2',tc:'#991b1b',lbl:'어려움'}};
  const checkReady=d.checklist_ready||['사업자등록증 사본','부가세 신고서 (최근 2년)','국세납부증명서','신용정보 조회 동의서'];
  const checkNeed=d.checklist_need||['사업계획서 (기보 필수)','벤처인증서 (취득 후 추가)'];

  const p3=rpWrap(3,'기관별 비교 및 신청 전략','비교표 · 준비 체크리스트',color,`
    <div class="sbox" style="margin-bottom:10px;"><h4 style="color:${color}">기관별 조건 비교표</h4>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead><tr style="background:#fff7ed"><th style="padding:7px;border:0.5px solid #fed7aa;color:${color};font-weight:500;text-align:left">기관</th><th style="padding:7px;border:0.5px solid #fed7aa;color:${color};font-weight:500;text-align:center">한도</th><th style="padding:7px;border:0.5px solid #fed7aa;color:${color};font-weight:500;text-align:center">금리/보증료</th><th style="padding:7px;border:0.5px solid #fed7aa;color:${color};font-weight:500;text-align:center">기간</th><th style="padding:7px;border:0.5px solid #fed7aa;color:${color};font-weight:500;text-align:center">난이도</th></tr></thead>
        <tbody>${comp.map((c,i)=>{const dm=diffMap[c.diff]||diffMap.easy;return`<tr style="${i%2===1?'background:#f8fafc':''}"><td style="padding:7px;border:0.5px solid #e2e8f0;font-weight:500">${c.org}</td><td style="padding:7px;border:0.5px solid #e2e8f0;text-align:center${c.limit.includes('3')||parseInt(c.limit)>=200000?';color:'+color+';font-weight:bold':''}">${c.limit}</td><td style="padding:7px;border:0.5px solid #e2e8f0;text-align:center;color:#16a34a">${c.rate}</td><td style="padding:7px;border:0.5px solid #e2e8f0;text-align:center">${c.period}</td><td style="padding:7px;border:0.5px solid #e2e8f0;text-align:center"><span style="background:${dm.bg};color:${dm.tc};padding:2px 6px;border-radius:3px;font-size:10px">${dm.lbl}</span></td></tr>`;}).join('')}</tbody>
      </table>
    </div>
    <div class="sbox"><h4 style="color:${color}">신청 준비 체크리스트</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        ${checkReady.map(t=>`<div class="chk-item"><div class="chk-icon" style="background:#dcfce7;color:#16a34a">✓</div><div class="chk-text" style="font-size:11px">${t}</div></div>`).join('')}
        ${checkNeed.map(t=>`<div class="chk-item"><div class="chk-icon" style="background:#fee2e2;color:#dc2626">✗</div><div class="chk-text" style="font-size:11px">${t}</div></div>`).join('')}
      </div>
    </div>
  `);

  return `<div class="paper-inner">${cover}${p1}${p2}${p3}</div>`;
}

// ===================================================================
// ★★★ 템플릿: AI 사업계획서 (표지+10P) ★★★
// ===================================================================
function buildBizPlanHTML(d, cData, rev, dateStr) {
  const color='#16a34a';
  const cover=buildCoverHTML(cData,{title:'AI 사업계획서',reportKind:'AI 맞춤형 사업계획서',vLabel:'완성본',borderColor:color},rev,dateStr);
  const exp=calcExpected(cData,rev);

  // P1: 기업현황분석
  const p1=rpWrap(1,'기업현황분석','기업정보 요약표',color,`
    <table class="ov-table" style="border-top-color:${color}">
      <tr><th style="color:${color}">기업명</th><td>${cData.name}</td><th style="color:${color}">대표자</th><td>${cData.rep||'-'}</td></tr>
      <tr><th style="color:${color}">업종</th><td>${cData.industry||'-'}</td><th style="color:${color}">설립일</th><td>${cData.bizDate||'-'}</td></tr>
      <tr><th style="color:${color}">상시근로자</th><td>${cData.empCount||'-'}명</td><th style="color:${color}">핵심아이템</th><td>${cData.coreItem||'-'}</td></tr>
      <tr><th style="color:${color}">전년 매출</th><td>${fKRW(rev.y25)}</td><th style="color:${color}">금년 예상</th><td>${fKRW(exp)}</td></tr>
    </table>
    <div class="g4">
      ${tpCard('업력',cData.bizDate?Math.round((Date.now()-new Date(cData.bizDate))/31536000000)+'년':'2년','고성장 초기',color)}
      ${tpCard('매출 성장률',rev.y24>0&&rev.y25>0?'+'+Math.round(((rev.y25-rev.y24)/rev.y24)*100)+'%':'+21%','전년 대비',color)}
      ${tpCard('신용등급','3등급','KCB 710점','#2563eb')}
      ${tpCard('필요자금',cData.needFund>0?fKRW(cData.needFund):'4억원','조달 목표','#7c3aed')}
    </div>
    <div class="sbox" style="margin-top:10px"><h4 style="color:${color}">기업 현황 분석</h4>${tpList(d.s1_items||['기업 현황을 분석합니다.'],color)}</div>
  `);

  // P2: SWOT
  const swot=d.s2_swot||{strength:['창업 1년 만에 13억 매출 달성'],weakness:['소규모 인력(4명)'],opportunity:['HMR 시장 연 18% 성장'],threat:['대형 식품기업 진입 가능']};
  const p2=rpWrap(2,'SWOT 분석','강점·약점·기회·위협',color,`
    <div class="swot-grid">
      <div class="swot-s"><div class="swot-label" style="color:#15803d">💪 S 강점 (Strength)</div><ul class="swot-ul">${(swot.strength||[]).map(i=>`<li class="swot-li" style="color:#166534">${i}</li>`).join('')}</ul></div>
      <div class="swot-w"><div class="swot-label" style="color:#dc2626">⚠️ W 약점 (Weakness)</div><ul class="swot-ul">${(swot.weakness||[]).map(i=>`<li class="swot-li" style="color:#991b1b">${i}</li>`).join('')}</ul></div>
      <div class="swot-o"><div class="swot-label" style="color:#1d4ed8">🚀 O 기회 (Opportunity)</div><ul class="swot-ul">${(swot.opportunity||[]).map(i=>`<li class="swot-li" style="color:#1e40af">${i}</li>`).join('')}</ul></div>
      <div class="swot-t"><div class="swot-label" style="color:#ea580c">🛡️ T 위협 (Threat)</div><ul class="swot-ul">${(swot.threat||[]).map(i=>`<li class="swot-li" style="color:#c2410c">${i}</li>`).join('')}</ul></div>
    </div>
  `);

  // P3: 시장현황
  const p3=rpWrap(3,'시장현황','시장 규모·트렌드',color,`
    <div class="g3" style="margin-bottom:12px;">
      ${tpCard('국내 HMR 시장','7조원','2022년 기준',color)}
      ${tpCard('연평균 성장률','18%','육수·국물 세그먼트',color)}
      ${tpCard('1~2인 가구 비율','61%','핵심 소비층','#7c3aed')}
    </div>
    <div class="sbox" style="margin-bottom:10px"><h4 style="color:${color}">시장 성장 추이</h4><div class="chart-wrap" style="height:130px"><canvas id="bp-market-chart" style="width:100%;height:100%"></canvas></div></div>
    <div class="sbox"><h4 style="color:${color}">시장 트렌드 분석</h4>${tpList(d.s3_items||['시장 현황을 분석합니다.'],color)}</div>
  `);

  // P4: 경쟁력분석
  const compRows=d.s4_competitor||[{item:'제품경쟁력',self:'★★★★★',a:'★★★★',b:'★★★'},{item:'기술력',self:'★★★★★',a:'★★★',b:'★★★'},{item:'가격경쟁력',self:'★★★★',a:'★★★★★',b:'★★★★'},{item:'유통망',self:'★★★',a:'★★★★★',b:'★★★★'},{item:'성장성',self:'★★★★★',a:'★★★',b:'★★★'}];
  const p4=rpWrap(4,'경쟁력분석','경쟁사 비교표',color,`
    <div class="sbox" style="margin-bottom:10px"><h4 style="color:${color}">경쟁력 분석</h4>${tpList(d.s4_items||['경쟁력을 분석합니다.'],color)}</div>
    <div class="sbox"><h4 style="color:${color}">경쟁사 비교표</h4>
      <table class="comp-table">
        <thead><tr><th style="text-align:left">비교 항목</th><th>${cData.name}</th><th>경쟁사 A</th><th>경쟁사 B</th></tr></thead>
        <tbody>${compRows.map((r,i)=>`<tr${i%2===0?'':' style="background:#f8fafc"'}><td>${r.item}</td><td>${r.self}</td><td>${r.a}</td><td>${r.b}</td></tr>`).join('')}</tbody>
      </table>
    </div>
  `);

  // P5: 차별점
  const diffs=d.s5_items||[{title:'기술 차별화',text:'돈육 사골 농축 압축 기술 특허 보유',color:'#16a34a'},{title:'제품 차별화',text:'1회 분량 개별 포장으로 위생·편의성 극대화',color:'#2563eb'},{title:'시장 포지셔닝',text:'HMR 시장 내 돈육 특화 세그먼트 선점',color:'#7c3aed'},{title:'성장 증명력',text:'창업 1년 만에 11억 4천만원 달성, 시장성 검증됨',color:'#ea580c'}];
  const borderMap={'#16a34a':'#86efac','#2563eb':'#93c5fd','#7c3aed':'#d8b4fe','#ea580c':'#fdba74'};
  const bgMap={'#16a34a':'#f0fdf4','#2563eb':'#eff6ff','#7c3aed':'#fdf4ff','#ea580c':'#fff7ed'};
  const p5=rpWrap(5,'차별점 및 핵심경쟁력','핵심 강점 요약',color,`
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${(Array.isArray(diffs[0])?diffs:diffs).map(item=>{
        const isObj=typeof item==='object'&&item.title;
        const t=isObj?item.title:'차별점';
        const tx=isObj?item.text:item;
        const c=isObj?(item.color||color):color;
        const bg=bgMap[c]||'#f0fdf4';
        const bd=borderMap[c]||'#86efac';
        return`<div class="diff-box" style="background:${bg};border:0.5px solid ${bd};border-left:4px solid ${c}"><div class="diff-title" style="color:${c}">🔹 ${t}</div><div class="diff-text">${tx}</div></div>`;
      }).join('')}
    </div>
  `);

  // P6: 가점추천
  const bpCerts=d.s6_certs||[{name:'벤처기업 인증',effect:'중진공·기보 우대금리 적용으로 추가 자금 한도 확보 가능함',amount:'+2억',period:'6개월 내'},{name:'이노비즈 인증',effect:'기술혁신형 인증으로 중진공 기술개발자금 신청 가능함',amount:'+3억',period:'1년 내'},{name:'기업부설연구소',effect:'R&D 세액공제 25% + 기보 기술보증 우대 적용 가능함',amount:'+1.5억',period:'세액공제 병행'},{name:'HACCP 인증',effect:'대형마트·급식 납품 채널 확대로 매출 직접 연결됨',amount:'채널↑',period:'매출 확대'}];
  const bpCertIcons=['🏆','📜','🔬','✅','💡'];
  const bpCertBg=['#f0fdf4','#eff6ff','#fdf4ff','#fff7ed','#fef9c3'];
  const totalBp=bpCerts.filter(c=>c.amount&&c.amount!=='채널↑').reduce((s,c)=>{const n=parseFloat(c.amount.replace(/[^0-9.]/g,''));return s+(isNaN(n)?0:n);},0);
  const p6=rpWrap(6,'가점추천','인증 취득 시 정책자금 한도 확대',color,`
    <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:12px;">
      ${bpCerts.map((c,i)=>`<div class="cert-card"><div class="cert-icon" style="background:${bpCertBg[i%bpCertBg.length]}">${bpCertIcons[i%bpCertIcons.length]}</div><div class="cert-body"><div class="cert-name">${c.name}</div><div class="cert-desc">${c.effect}</div></div><div class="cert-amt"><div class="cert-val" style="color:${color}">${c.amount}</div><div class="cert-period">${c.period}</div></div></div>`).join('')}
    </div>
    <div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;border:1px solid #86efac;text-align:center">
      <div style="font-size:12px;font-weight:500;color:#15803d;margin-bottom:4px">인증 완료 시 총 추가 한도 (예상)</div>
      <div style="font-size:22px;font-weight:700;color:${color}">최대 +${totalBp > 0 ? totalBp+'억원' : '6억 5천만원'}</div>
      <div style="font-size:11px;color:#64748b;margin-top:3px">현재 필요자금 기준 → 인증 취득 후 최대 ${cData.needFund>0?fKRW(cData.needFund+totalBp*10000):'10억원'} 조달 가능</div>
    </div>
  `);

  // P7: 자금사용계획
  const needFundStr=cData.needFund>0?fKRW(cData.needFund):'4억원';
  const fundRows=d.s7_rows||[{item:'원재료 구입',amount:'1억 5천만원',ratio:'37.5%',purpose:'돈육 사골 등 핵심 원재료 선매입 및 재고 확보'},{item:'생산 설비 투자',amount:'1억원',ratio:'25%',purpose:'반자동 생산설비 도입 — 원가율 20% 절감 목표'},{item:'마케팅·채널 확대',amount:'7천만원',ratio:'17.5%',purpose:'SNS 광고·쿠팡 입점·브랜드 마케팅 집행'},{item:'운전자금',amount:'8천만원',ratio:'20%',purpose:'인건비·공과금·사무실 유지비 등 운영 비용'}];
  const p7=rpWrap(7,'자금사용계획',`총 필요자금 ${needFundStr}`,color,`
    <div class="sbox" style="margin-bottom:10px"><h4 style="color:${color}">자금 집행 계획표</h4>
      <table class="fund-table">
        <thead><tr><th style="text-align:left">항목</th><th style="text-align:center">금액</th><th style="text-align:center">비율</th><th>사용 목적</th></tr></thead>
        <tbody>${fundRows.map((r,i)=>`<tr${i%2===1?' style="background:#f8fafc"':''}><td style="font-weight:500">${r.item}</td><td style="text-align:center">${r.amount}</td><td style="text-align:center;font-weight:500;color:${color}">${r.ratio}</td><td>${r.purpose}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td style="font-weight:500">합계</td><td style="text-align:center;font-weight:bold;color:${color}">${needFundStr}</td><td style="text-align:center;font-weight:500;color:${color}">100%</td><td>-</td></tr></tfoot>
      </table>
    </div>
    <div class="sbox"><h4 style="color:${color}">자금 집행 전략</h4>${tpList(d.s7_strategy||['자금 집행 전략을 분석합니다.'],color)}</div>
  `);

  // P8: 매출추이 및 전망
  const p8=rpWrap(8,'매출 추이 및 1년 전망','실적·예측·단중장기',color,`
    <div class="sbox" style="margin-bottom:10px">
      <div id="biz-chart-title">「1년 전망」 월별 매출 시뮬레이션</div>
      <div id="biz-monthly-chart-wrap"><canvas id="biz-monthly-chart" style="width:100%;height:100%"></canvas></div>
    </div>
    <div class="gphases">
      <div class="gph gph-short"><div class="gph-header">⚡ 단기 (1년 이내)</div><ul>${(d.s8_short||['단기 목표 1','단기 목표 2','단기 목표 3','단기 목표 4']).map(t=>`<li>${t}</li>`).join('')}</ul></div>
      <div class="gph gph-mid"><div class="gph-header">📈 중기 (3년 이내)</div><ul>${(d.s8_mid||['중기 목표 1','중기 목표 2','중기 목표 3','중기 목표 4']).map(t=>`<li>${t}</li>`).join('')}</ul></div>
      <div class="gph gph-long"><div class="gph-header">🌟 장기 (5년 이후)</div><ul>${(d.s8_long||['장기 목표 1','장기 목표 2','장기 목표 3','장기 목표 4']).map(t=>`<li>${t}</li>`).join('')}</ul></div>
    </div>
  `);

  // P9: 성장비전
  const kpi=d.s9_kpi||{y1:'18억',y2:'24억',ch:'5개↑',emp:'11명'};
  const rmYears=d.s9_roadmap||[{year:'2026',tasks:['정책자금 조달 완료','설비 확충']},{year:'2027',tasks:['벤처인증 취득','B2B 납품']},{year:'2028',tasks:['이노비즈 취득','매출 35억']},{year:'2029~',tasks:['해외 진출','매출 100억']}];
  const rmColors=['#16a34a','#2563eb','#7c3aed','#ea580c'];
  const p9=rpWrap(9,'성장비전','향후 발전 가능성 및 계획',color,`
    <div class="g2" style="margin-bottom:10px">
      <div class="sbox"><h4 style="color:${color}">핵심 성장 동력</h4>${tpList(d.s9_items||['성장 가능성을 분석합니다.'],color)}</div>
      <div class="sbox"><h4 style="color:${color}">KPI 목표</h4>
        <div class="g2" style="gap:6px">
          ${tpCard('1년 후 매출',kpi.y1||'18억','+30% 성장',color)}
          ${tpCard('2년 후 매출',kpi.y2||'24억','+74% 성장',color)}
          ${tpCard('목표 채널',kpi.ch||'5개↑','현재 1개','#2563eb')}
          ${tpCard('목표 인력',kpi.emp||'11명','2년 내','#7c3aed')}
        </div>
      </div>
    </div>
    <div class="sbox"><h4 style="color:${color}">앞으로의 계획 로드맵</h4>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
        ${rmYears.map((r,i)=>`<div style="border-radius:7px;padding:9px;border:0.5px solid #e2e8f0;border-top:3px solid ${rmColors[i]};background:white"><div style="font-size:10px;font-weight:500;color:${rmColors[i]};margin-bottom:5px">${r.year}</div><div style="display:flex;flex-direction:column;gap:3px">${r.tasks.map(t=>`<div style="font-size:10px;color:#64748b;padding-left:8px;position:relative;line-height:1.4"><span style="position:absolute;left:0">·</span>${t}</div>`).join('')}</div></div>`).join('')}
      </div>
    </div>
  `);

  // P10: 마무리
  const conclusion=d.s10_conclusion||`${cData.name}는 창업 이후 폭발적인 매출 성장을 달성한 고성장 초기 기업으로, 독보적인 기술력과 특허를 보유하고 있음. 정책자금 4억원 조달 시 생산 설비 확충과 채널 다각화를 통해 2년 내 매출 24억 달성이 가능한 성장 기반을 갖추고 있음. 인증 취득 로드맵 이행 시 추가 자금 확보와 함께 중장기 100억 매출 목표 달성 가능성이 충분히 있음.`;
  const ratingItems=[{l:'시장성',v:'★★★★★',c:color},{l:'기술력',v:'★★★★★',c:'#2563eb'},{l:'성장성',v:'★★★★★',c:'#7c3aed'},{l:'안정성',v:'★★★★',c:'#ea580c'}];
  const p10=rpWrap('✦','마무리','종합 요약',color,`
    <div class="biz-close" style="margin-bottom:12px">
      <div class="biz-close-title">${cData.name} — 종합 의견</div>
      <div class="biz-close-text">${conclusion}</div>
    </div>
    <div class="g4">${ratingItems.map(r=>`<div class="mc" style="border-top:3px solid ${r.c}"><div class="mc-l">${r.l}</div><div class="mc-v" style="color:${r.c};font-size:14px">${r.v}</div></div>`).join('')}</div>
  `);

  return `<div class="paper-inner">${cover}${p1}${p2}${p3}${p4}${p5}${p6}${p7}${p8}${p9}${p10}</div>`;
}

// ===========================
// ★ 차트 초기화
// ===========================
function initReportCharts(rev, exp) {
  setTimeout(()=>{
    const radarEl=document.getElementById('rp-radar');
    if(radarEl){const sc=radarEl.dataset.scores.split(',').map(Number);new Chart(radarEl.getContext('2d'),{type:'radar',data:{labels:['재무','전략/마케팅','인사','운영','IT'],datasets:[{data:sc,backgroundColor:'rgba(59,130,246,0.15)',borderColor:'#3b82f6',pointBackgroundColor:'#1e3a8a',pointRadius:4}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});}
    const lineEl=document.getElementById('rp-linechart');
    if(lineEl){const d=lineEl.dataset;new Chart(lineEl.getContext('2d'),{type:'line',data:{labels:['23년','24년','25년','금년(예)'],datasets:[{data:[parseInt(d.y23)||0,parseInt(d.y24)||0,parseInt(d.y25)||0,parseInt(d.exp)||0],borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.1)',borderWidth:2,pointRadius:4,fill:true,tension:0.2,label:'매출 추이'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>v>=10000?Math.floor(v/10000)+'억':v.toLocaleString()+'만'}}}}});}
    const debtEl=document.getElementById('fp-donut');
    if(debtEl){const names=debtEl.dataset.names.split('|');const ratios=debtEl.dataset.ratios.split(',').map(Number);const cols=['#2563eb','#7c3aed','#06b6d4','#16a34a','#ea580c'];new Chart(debtEl.getContext('2d'),{type:'doughnut',data:{labels:names,datasets:[{data:ratios,backgroundColor:cols.slice(0,ratios.length),borderWidth:2,borderColor:'white'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'60%'}});}
    const tradeRadar=document.getElementById('tp-radar');
    if(tradeRadar){const sc=tradeRadar.dataset.scores.split(',').map(Number);new Chart(tradeRadar.getContext('2d'),{type:'radar',data:{labels:['유동인구','접근성','성장성','경쟁강도','가시성'],datasets:[{data:sc,backgroundColor:'rgba(13,148,136,0.15)',borderColor:'#0d9488',pointBackgroundColor:'#0d9488',pointRadius:4}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});}
    const tradeLine=document.getElementById('tp-linechart');
    if(tradeLine){const td=tradeLine.dataset;new Chart(tradeLine.getContext('2d'),{type:'line',data:{labels:['현재','6개월','1년','2년'],datasets:[{data:[parseInt(td.s0),parseInt(td.s1),parseInt(td.s2),parseInt(td.s3)],borderColor:'#0d9488',backgroundColor:'rgba(13,148,136,0.1)',borderWidth:2,pointRadius:5,fill:true,tension:0.2}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>Math.round(v/1000)+'천만'}}}}});}
    const mktDonut=document.getElementById('mp-donut');
    if(mktDonut){const mn=mktDonut.dataset.names.split('|');const mr=mktDonut.dataset.ratios.split(',').map(Number);new Chart(mktDonut.getContext('2d'),{type:'doughnut',data:{labels:mn,datasets:[{data:mr,backgroundColor:['#db2777','#9d174d','#f4c0d1','#fdf2f8'],borderWidth:2,borderColor:'white'}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'60%'}});}
    const fpGrowth=document.getElementById('fp-growth-chart');
    if(fpGrowth){new Chart(fpGrowth.getContext('2d'),{type:'line',data:{labels:['2026','2027','2028'],datasets:[{data:[14,24,35],borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,0.1)',borderWidth:2,pointRadius:5,fill:true,tension:0.2}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>v+'억'}}}}});}
    const bpMarket=document.getElementById('bp-market-chart');
    if(bpMarket){new Chart(bpMarket.getContext('2d'),{type:'line',data:{labels:['2016','2017','2018','2019','2020','2021','2022'],datasets:[{data:[2,2.4,3,3.8,4.5,5.8,7],borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,0.1)',borderWidth:2,pointRadius:3,fill:true,tension:0.3}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>v+'조'}}}}});}
    const bizMonthly=document.getElementById('biz-monthly-chart');
    if(bizMonthly){const curM=new Date().getMonth();const avgM=rev.cur&&curM>0?Math.round(rev.cur/curM):rev.y25?Math.round(rev.y25/12):3000;const actual=[],forecast=[];for(let i=0;i<12;i++){if(i<curM){actual.push(Math.round(avgM*(0.88+i*0.025)));forecast.push(null);}else{actual.push(null);forecast.push(Math.round(avgM*Math.pow(1.05,i-curM+1)));}}new Chart(bizMonthly.getContext('2d'),{type:'bar',data:{labels:['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],datasets:[{label:'실적',data:actual,backgroundColor:'rgba(22,163,74,0.7)',borderColor:'#16a34a',borderWidth:1,borderRadius:4},{label:'예측',data:forecast,backgroundColor:'rgba(59,130,246,0.45)',borderColor:'#3b82f6',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{font:{size:11}}}},scales:{y:{ticks:{callback:v=>v>=10000?Math.floor(v/10000)+'억':Math.round(v/1000)+'천만'}}}}});}
  },200);
}

// ===========================
// ★ JSON 프롬프트 함수들
// ===========================
function buildMgmtClientPrompt(cData, fRev) {
  const pd={name:cData.name,rep:cData.rep,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,bizNum:cData.bizNum,매출데이터:fRev};
  return `너는 20년 경력의 경영컨설턴트야. 대상 기업: '${cData.name}' (업종:${cData.industry||'-'})
아래 JSON 구조에 맞게 기업 경영진단 분석 결과를 작성해.
각 항목은 반드시 구체적이고 기업 데이터에 근거한 내용으로 작성.

{
  "grade": "종합 진단 등급 (예: B+, A-, B)",
  "grade_desc": "등급 설명 (10자 이내)",
  "overview": ["기업 현황 및 진단 목적 문장 3개 (각 40자 이상)"],
  "finance_strengths": ["재무 강점 3개 (각 40자 이상)"],
  "finance_risks": ["재무 개선 포인트 2개 (각 40자 이상)"],
  "radar": [재무건전성점수, 전략마케팅점수, 인사조직점수, 운영생산점수, IT디지털점수],
  "marketing_bars": {"finance": 점수(0-100), "strategy": 점수(0-100), "operation": 점수(0-100)},
  "marketing": ["전략 및 마케팅 분석 3개 (각 40자 이상)"],
  "hr": ["인사조직 분석 3개 (각 40자 이상)"],
  "ops": ["운영생산 분석 3개 (각 40자 이상)"],
  "it": ["IT디지털 현황 2개 (각 40자 이상)"],
  "certs": [
    {"name": "인증명", "effect": "취득 효과 설명 (40자 이상)", "amount": "+X억", "period": "X개월 내"}
  ],
  "roadmap_short": ["단기 과제 4개 (각 20자 이상)"],
  "roadmap_mid": ["중기 과제 4개 (각 20자 이상)"],
  "roadmap_long": ["장기 과제 4개 (각 20자 이상)"],
  "summary": ["종합 의견 2개 (각 50자 이상)"]
}

[기업 데이터] ${JSON.stringify(pd)}`;
}

function buildMgmtConsultantPrompt(cData, fRev) {
  const pd={name:cData.name,rep:cData.rep,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,bizNum:cData.bizNum,매출데이터:fRev};
  return `너는 20년 경력의 경영컨설턴트야. 대상 기업: '${cData.name}'
컨설턴트 내부용 보고서로 리스크·문제점을 솔직하게 작성.

{
  "grade": "등급",
  "grade_desc": "등급 설명",
  "overview": ["기업 현황 3개 (각 40자 이상, 리스크 포함)"],
  "key_risks": ["핵심 리스크 3개 (각 40자 이상)"],
  "finance_strengths": ["재무 현황 3개 (각 40자 이상)"],
  "fb_finance": ["재무 컨설턴트 피드백 2개 (각 50자 이상)"],
  "radar": [재무, 전략, 인사, 운영, IT점수],
  "marketing_bars": {"finance": 점수, "strategy": 점수, "operation": 점수},
  "marketing": ["마케팅 분석 3개 (각 40자 이상)"],
  "fb_marketing": ["마케팅 피드백 2개 (각 50자 이상)"],
  "hr": ["인사 분석 3개 (각 40자 이상)"],
  "ops": ["운영 분석 3개 (각 40자 이상)"],
  "fb_hr_ops": ["인사·운영 피드백 2개 (각 50자 이상)"],
  "it": ["IT 현황 2개 (각 40자 이상)"],
  "fb_it": ["IT 피드백 2개 (각 50자 이상)"],
  "roadmap_short": ["단기 4개"], "roadmap_mid": ["중기 4개"], "roadmap_long": ["장기 4개"],
  "fb_roadmap": ["로드맵 피드백 2개 (각 50자 이상)"],
  "certs": [{"name": "인증명", "effect": "효과", "amount": "+X억", "period": "기간"}],
  "consultant_issues": ["시급 이슈 TOP3 (각 60자 이상)"],
  "consultant_funds": ["정책자금 전략 3개 (각 50자 이상)"],
  "consultant_certs": ["인증 취득 전략 3개 (각 40자 이상)"],
  "consultant_marketing": ["마케팅 개선 3개 (각 40자 이상)"],
  "consultant_credit": ["신용 개선 3개 (각 40자 이상)"]
}

[기업 데이터] ${JSON.stringify(pd)}`;
}

function buildFinancePrompt(cData, fRev) {
  return `너는 공인회계사급 재무 전문 컨설턴트야. 대상: '${cData.name}'

{
  "scores": {"profit": 수익성점수(0-100), "stable": 안정성점수(0-100), "growth": 성장성점수(0-100)},
  "score_descs": {"profit": "수익성 설명(10자)", "stable": "안정성 설명(10자)", "growth": "성장성 설명(10자)"},
  "profit_bars": [
    {"label": "매출 성장률(YoY)", "value": 바길이(0-100), "display": "+21%"},
    {"label": "매출이익률", "value": 바길이, "display": "38%"},
    {"label": "영업이익률", "value": 바길이, "display": "22%"},
    {"label": "현금흐름 안정성", "value": 바길이, "display": "등급"}
  ],
  "debt": [{"name": "기관명", "ratio": 비율}, ...],
  "stable_metrics": [{"label": "지표명", "value": "값", "desc": "설명"}, ...4개],
  "growth_items": ["성장성 분석 3개 (각 40자 이상)"],
  "action_urgent": "즉시 실행 방안 (2줄)",
  "action_short": "단기 실행 방안 (2줄)",
  "action_mid": "중기 실행 방안 (2줄)"
}

[기업 데이터] ${JSON.stringify({name:cData.name,industry:cData.industry,empCount:cData.empCount,bizDate:cData.bizDate,매출데이터:fRev})}`;
}

function buildTradePrompt(cData, fRev) {
  return `너는 상권분석 전문 컨설턴트야. 대상: '${cData.name}' (업종:${cData.industry||'-'}, 지역:${cData.bizDate||'-'})

{
  "traffic": "유동인구 (예: 2,400명)",
  "competitors": 경쟁업체수(숫자),
  "grade": "입지 등급 (예: B+)",
  "radar": [유동인구점수, 접근성점수, 성장성점수, 경쟁강도역점수, 가시성점수],
  "features": ["상권 특성 3개 (각 40자 이상)"],
  "comp_direct": 직접경쟁사수,
  "comp_strong": 강성경쟁사수,
  "diff_potential": "차별화 여지 (高/中/低)",
  "target": {"age": "주 연령대", "household": "가구유형", "channel": "구매채널", "cycle": "구매주기"},
  "strategy": ["운영 전략 3개 (각 40자 이상)"],
  "sim": {"s0": 현재월매출(만원), "s1": 6개월후, "s2": 1년후, "s3": 2년후}
}

[기업 데이터] ${JSON.stringify({name:cData.name,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,매출데이터:fRev})}`;
}

function buildMarketingPrompt(cData, fRev) {
  return `너는 디지털 마케팅 전문 컨설턴트야. 대상: '${cData.name}'

{
  "channels": [
    {"name": "채널명", "score": 점수(0-100)},
    ...4개 채널
  ],
  "strategies": ["핵심 전략 3개 (각 40자 이상)"],
  "budget_total": "월 예산 총액 (예: 700만원/월)",
  "budget": [{"name": "항목명", "ratio": 비율}, ...4개],
  "kpi": [
    {"label": "KPI 지표명", "value": "목표값", "period": "기간"},
    ...4개
  ],
  "roadmap": [
    {"period": "월", "task": "실행 과제", "highlight": false/true},
    ...6개
  ]
}

[기업 데이터] ${JSON.stringify({name:cData.name,industry:cData.industry,coreItem:cData.coreItem,empCount:cData.empCount,매출데이터:fRev})}`;
}

function buildFundPrompt(cData, fRev) {
  return `너는 중소기업 정책자금 전문 컨설턴트야. 대상: '${cData.name}'

{
  "checks": [
    {"text": "자격요건 항목", "status": "pass/cond/fail"},
    ...6개
  ],
  "score": 신청가능성점수(0-100),
  "score_desc": "점수 설명",
  "match_count": 매칭기관수,
  "score_items": ["분석 내용 2개 (각 40자 이상)"],
  "funds": [
    {"rank": 1, "name": "자금명", "limit": "한도", "tags": ["태그1", "태그2", "태그3"]},
    ...5개
  ],
  "comparison": [
    {"org": "기관명", "limit": "한도", "rate": "금리", "period": "기간", "diff": "easy/mid/hard"},
    ...4개
  ],
  "checklist_ready": ["준비된 서류 4개"],
  "checklist_need": ["추가 필요 서류 2개"]
}

[기업 데이터] ${JSON.stringify({name:cData.name,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,needFund:cData.needFund,매출데이터:fRev})}`;
}

function buildBizPlanPrompt(cData, fRev) {
  const needFundStr=cData.needFund>0?fKRW(cData.needFund):'4억원';
  const fundPlan=cData.fundPlan||'자금 사용 계획 미입력';
  return `너는 20년 경력의 경영컨설턴트이자 사업계획서 전문가야. 대상: '${cData.name}'
반드시 기업 데이터에 근거한 구체적인 내용으로 작성.

{
  "s1_items": ["기업현황 분석 5개 (각 40자 이상, 매출성장·시장포지션 포함)"],
  "s2_swot": {
    "strength": ["강점 4개 (각 30자 이상)"],
    "weakness": ["약점 3개 (각 30자 이상)"],
    "opportunity": ["기회 4개 (각 30자 이상)"],
    "threat": ["위협 3개 (각 30자 이상)"]
  },
  "s3_items": ["시장현황 5개 (각 40자 이상)"],
  "s4_items": ["경쟁력 분석 4개 (각 40자 이상)"],
  "s4_competitor": [
    {"item": "비교항목", "self": "★점수", "a": "★점수", "b": "★점수"},
    ...7개 (제품경쟁력/기술력/가격경쟁력/유통망/브랜드/고객서비스/성장성)
  ],
  "s5_items": [
    {"title": "차별점 제목", "text": "설명 (40자 이상)", "color": "#색상코드"},
    ...4개
  ],
  "s6_certs": [
    {"name": "인증명", "effect": "효과 설명 (40자 이상)", "amount": "+X억 또는 채널↑", "period": "취득 기간"},
    ...4개 (벤처/이노비즈/HACCP/기업부설연구소 포함)
  ],
  "s7_rows": [
    {"item": "항목명", "amount": "금액(한국식)", "ratio": "X%", "purpose": "사용목적(30자 이상)"},
    ...주의: 총합이 반드시 ${needFundStr}이 되게 배분, 업체자금계획="${fundPlan}" 참고
  ],
  "s7_strategy": ["자금 집행 전략 3개 (각 30자 이상)"],
  "s8_short": ["단기 목표 4개 (각 25자 이상, 업체 계획 기반)"],
  "s8_mid": ["중기 목표 4개 (각 25자 이상)"],
  "s8_long": ["장기 목표 4개 (각 25자 이상)"],
  "s9_items": ["성장 동력 4개 (각 40자 이상)"],
  "s9_kpi": {"y1": "1년후 매출", "y2": "2년후 매출", "ch": "목표 채널수", "emp": "목표 인원"},
  "s9_roadmap": [
    {"year": "2026", "tasks": ["과제1", "과제2", "과제3"]},
    {"year": "2027", "tasks": ["과제1", "과제2", "과제3"]},
    {"year": "2028", "tasks": ["과제1", "과제2", "과제3"]},
    {"year": "2029~", "tasks": ["과제1", "과제2", "과제3"]}
  ],
  "s10_conclusion": "마무리 문장 (4~5문장, 반드시 ~있음 형식으로 마무리)"
}

[기업 데이터] ${JSON.stringify({name:cData.name,rep:cData.rep,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,bizNum:cData.bizNum,필요자금:needFundStr,자금사용계획:fundPlan,매출데이터:fRev})}`;
}

// ===========================
// ★ 보고서 생성 함수들
// ===========================
window.generateReport = async function(type, version, event) {
  const tab=event.target.closest('.tab-content');
  const companyName=tab.querySelector('.company-dropdown').value;
  if(!companyName){alert('기업을 선택해주세요.');return;}
  const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  const cData=companies.find(c=>c.name===companyName);
  if(!cData){alert('기업 정보를 찾을 수 없습니다.');return;}
  const rev=cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
  const fRev=fRevAI(cData,rev);
  const prompt = version==='client' ? buildMgmtClientPrompt(cData,fRev) : buildMgmtConsultantPrompt(cData,fRev);
  document.getElementById('ai-loading-overlay').style.display='flex';
  const data=await callGeminiJSON(prompt, 8192);
  document.getElementById('ai-loading-overlay').style.display='none';
  if(!data) return;
  const todayStr=new Date().toISOString().split('T')[0];
  const vLabel=version==='client'?'기업전달용':'컨설턴트용';
  const reportObj={id:'rep_'+Date.now(),type:'경영진단',company:cData.name,title:`AI 경영진단보고서 (${vLabel})`,date:todayStr,content:JSON.stringify(data),version,revenueData:rev,reportType:'management'};
  const reports=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');reports.push(reportObj);localStorage.setItem(DB_REPORTS,JSON.stringify(reports));
  updateDataLists();
  tab.querySelector('[id$="-input-step"]').style.display='none';
  tab.querySelector('[id$="-result-step"]').style.display='block';
  const contentArea=document.getElementById('report-content-area');
  const html = version==='client' ? buildMgmtClientHTML(data,cData,rev,todayStr) : buildMgmtConsultantHTML(data,cData,rev,todayStr);
  contentArea.innerHTML = html;
  _currentReport={company:cData.name,type:`AI 경영진단보고서 (${vLabel})`,contentAreaId:'report-content-area',landscape:false};
  initReportCharts(rev, calcExpected(cData,rev));
};

const REPORT_CONFIGS = {
  finance:     { typeLabel:'재무진단',     title:'AI 상세 재무진단',   contentAreaId:'finance-content-area',   landscape:false, buildPrompt: buildFinancePrompt,   buildHTML: buildFinanceHTML   },
  aiTrade:     { typeLabel:'상권분석',     title:'AI 상권분석 리포트', contentAreaId:'aiTrade-content-area',   landscape:false, buildPrompt: buildTradePrompt,     buildHTML: buildTradeHTML     },
  aiMarketing: { typeLabel:'마케팅제안',   title:'AI 마케팅 제안서',   contentAreaId:'aiMarketing-content-area',landscape:false, buildPrompt: buildMarketingPrompt, buildHTML: buildMarketingHTML },
  aiFund:      { typeLabel:'정책자금매칭', title:'AI 정책자금매칭',    contentAreaId:'aiFund-content-area',    landscape:false, buildPrompt: buildFundPrompt,      buildHTML: buildFundHTML      },
  aiBiz:       { typeLabel:'사업계획서',   title:'AI 사업계획서',      contentAreaId:'aiBiz-content-area',     landscape:true,  buildPrompt: buildBizPlanPrompt,   buildHTML: buildBizPlanHTML   }
};

window.generateAnyReport = async function(type, version, event) {
  const tab=event.target.closest('.tab-content');
  const companyName=tab.querySelector('.company-dropdown').value;
  if(!companyName){alert('기업을 선택해주세요.');return;}
  const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  const cData=companies.find(c=>c.name===companyName);
  if(!cData){alert('기업 정보를 찾을 수 없습니다.');return;}
  const rev=cData.revenueData||{y23:0,y24:0,y25:0,cur:0};
  const fRev=fRevAI(cData,rev);
  const cfg=REPORT_CONFIGS[type]; if(!cfg) return;
  document.getElementById('ai-loading-overlay').style.display='flex';
  const maxTokens = type==='aiBiz' ? 65536 : 8192;
  const data = await callGeminiJSON(cfg.buildPrompt(cData,fRev,version), maxTokens);
  document.getElementById('ai-loading-overlay').style.display='none';
  if(!data) return;
  const todayStr=new Date().toISOString().split('T')[0];
  let vLabel;
  if(type==='aiBiz') vLabel=version==='draft'?'초안':'완성본';
  else vLabel=version==='client'?'기업전달용':'컨설턴트용';
  const reportObj={id:'rep_'+Date.now(),type:cfg.typeLabel,company:cData.name,title:`${cfg.title} (${vLabel})`,date:todayStr,content:JSON.stringify(data),version,revenueData:rev,reportType:type,contentAreaId:cfg.contentAreaId};
  const reports=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');reports.push(reportObj);localStorage.setItem(DB_REPORTS,JSON.stringify(reports));
  updateDataLists();
  tab.querySelector('[id$="-input-step"]').style.display='none';
  tab.querySelector('[id$="-result-step"]').style.display='block';
  const contentArea=document.getElementById(cfg.contentAreaId);
  contentArea.innerHTML = cfg.buildHTML(data, cData, rev, todayStr);
  _currentReport={company:cData.name,type:cfg.title+` (${vLabel})`,contentAreaId:cfg.contentAreaId,landscape:cfg.landscape};
  initReportCharts(rev, calcExpected(cData,rev));
};

window.viewReport = function(id) {
  const r=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]').find(x=>x.id===id); if(!r) return;
  const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  const cData=companies.find(c=>c.name===r.company)||{name:r.company,bizNum:'-',industry:'-',rep:'-',coreItem:'-',bizDate:'-',empCount:'-',date:r.date};
  const rev=r.revenueData||{cur:0,y25:0,y24:0,y23:0};
  let data;
  try { data=JSON.parse(r.content); } catch(e){ data={}; }
  const type=r.reportType||'management';
  if(type==='management'){
    showTab('report');
    document.getElementById('report-input-step').style.display='none';
    document.getElementById('report-result-step').style.display='block';
    const html=r.version==='client'?buildMgmtClientHTML(data,cData,rev,r.date):buildMgmtConsultantHTML(data,cData,rev,r.date);
    document.getElementById('report-content-area').innerHTML=html;
    _currentReport={company:cData.name,type:r.title,contentAreaId:'report-content-area',landscape:false};
    initReportCharts(rev,calcExpected(cData,rev));
  } else {
    const cfg=REPORT_CONFIGS[type]; if(!cfg) return;
    const tabId=cfg.contentAreaId.replace('-content-area','');
    showTab(tabId);
    document.getElementById(tabId+'-input-step').style.display='none';
    document.getElementById(tabId+'-result-step').style.display='block';
    document.getElementById(cfg.contentAreaId).innerHTML=cfg.buildHTML(data,cData,rev,r.date);
    _currentReport={company:cData.name,type:r.title,contentAreaId:cfg.contentAreaId,landscape:cfg.landscape};
    initReportCharts(rev,calcExpected(cData,rev));
  }
};

window.backToInput = function(tab) {
  document.getElementById(tab+'-input-step').style.display='block';
  document.getElementById(tab+'-result-step').style.display='none';
};
