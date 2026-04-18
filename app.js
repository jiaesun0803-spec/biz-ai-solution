const DB_USERS   = 'biz_users';
const DB_SESSION = 'biz_session';
const STORAGE_KEY = 'biz_consult_companies';
const DB_REPORTS  = 'biz_reports';

// ★ 현재 열린 보고서 정보 (파일명 생성용) ★
let _currentReport = { company: '', type: '' };

/* ===== ★ PDF 출력 함수 ★ =====
   1. document.title → "기업명 - 보고서종류" 로 변경 (PDF 파일명)
   2. 사이드바를 JS로 완전히 숨기고 인쇄 후 복구
   → @media print CSS와 JS 이중 처리로 붉은 아이콘 완전 제거
============================================ */
window.printReport = function() {
    const company   = _currentReport.company   || '';
    const type      = _currentReport.type      || 'AI 보고서';
    const landscape = _currentReport.landscape || false;
    const title     = company ? `${company} - ${type}` : type;
    const accentColor = landscape ? '#16a34a' : '#3b82f6';

    // ★ contentAreaId를 직접 사용해서 정확한 보고서만 추출 ★
    let reportHTML = '';
    const targetAreaId = _currentReport.contentAreaId;
    if (targetAreaId) {
        const el = document.getElementById(targetAreaId);
        if (el && el.innerHTML.trim()) reportHTML = el.innerHTML;
    }
    // fallback: contentAreaId가 없으면 순서대로 탐색
    if (!reportHTML) {
        const contentAreas = [
            'aiBiz-content-area','report-content-area','finance-content-area',
            'aiFund-content-area','aiTrade-content-area','aiMarketing-content-area'
        ];
        for (const id of contentAreas) {
            const el = document.getElementById(id);
            if (el && el.innerHTML.trim()) { reportHTML = el.innerHTML; break; }
        }
    }
    if (!reportHTML) { alert('출력할 보고서가 없습니다.'); return; }

    // 월별 차트 데이터 (사업계획서용)
    const curMonth = new Date().getMonth();
    const bizRevData = (() => {
        try {
            const companies = JSON.parse(localStorage.getItem('biz_consult_companies')||'[]');
            const cur = companies.find(c=>c.name===company);
            return cur?.revenueData || {};
        } catch(e){ return {}; }
    })();
    const avgMonthly = bizRevData.cur && curMonth > 0
        ? Math.round(bizRevData.cur / curMonth)
        : bizRevData.y25 ? Math.round(bizRevData.y25 / 12) : 3000;

    const printWin = window.open('', '_blank', 'width=1300,height=900');
    printWin.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
/* ========== 기본 리셋 ========== */
* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: ${landscape ? '10mm' : '13mm'}; }
body { background: white; color: #333; font-size: 13px; }

.cover-page {
    height: ${landscape ? '182mm' : '265mm'};
    display: block; position: relative;
    border-left: none !important;
    padding-left: 48px; padding-right: 28px; padding-top: 40px;
    page-break-after: always; break-after: page;
    overflow: hidden;
}
.cover-page::before {
    content: ''; display: block; position: absolute;
    left: 0; top: 0; bottom: 0; width: 28px;
    background: ${accentColor} !important;
}
.cover-header h4 {
    font-size: 14px; color: ${accentColor};
    border-bottom: 2px solid ${accentColor};
    display: inline-block; padding-bottom: 3px; margin-bottom: 8px;
}
.cover-header h1 { font-size: ${landscape?'28px':'32px'}; font-weight: 900; color: #0f172a; margin-top: 10px; letter-spacing: -1px; }
/* ★ 회사명 이하 콘텐츠 - 더 아래로 ★ */
.cover-middle { position: absolute; left: 48px; right: 28px; bottom: ${landscape ? '20px' : '30px'}; }
.cover-middle h2 { font-size: ${landscape?'17px':'19px'}; color: #1e3a8a; margin-bottom: 10px; font-weight: bold; }
/* ★ 기업개요표 - 더 작게 ★ */
.cover-table { width: 100%; background: #f8fafc !important; padding: 8px 14px; border-radius: 5px; }
.cover-table table { width: 100%; border-collapse: collapse; }
.cover-table th { text-align: center; padding: 6px 5px; color: ${accentColor}; font-size: 11px; font-weight: bold; border-bottom: 1px solid #e2e8f0; width: 16%; }
.cover-table td { text-align: center; padding: 6px 5px; color: #334155; font-size: 11px; font-weight: 500; border-bottom: 1px solid #e2e8f0; width: 34%; }
.cover-table tr:last-child th, .cover-table tr:last-child td { border-bottom: none; }
.cover-footer { position: absolute; left: 48px; right: 28px; bottom: 0; display: flex; justify-content: space-between; border-top: 1px solid ${accentColor}; padding-top: 8px; color: #475569; font-size: 11px; font-weight: bold; }

/* ========== 보고서 섹션 박스 ========== */
.paper-inner { max-width: 100%; }
.report-section-box {
    background: #f8fafc !important;
    border: 1px solid #d1d5db !important;
    border-radius: 10px;
    padding: 18px 20px;
    margin-bottom: 0;
    page-break-before: always; break-before: page;
    page-break-inside: avoid; break-inside: avoid;
}
/* 첫 섹션은 페이지 분리 안 함 (cover 다음) */
.cover-page + .report-section-box,
.paper-inner > .report-section-box:first-of-type {
    page-break-before: auto; break-before: auto;
}
.report-section-box h3 {
    margin-top: 0 !important; margin-bottom: 14px;
    color: #1e293b !important;
    border-left: 5px solid ${accentColor} !important;
    padding-left: 12px;
    font-size: 15px; font-weight: bold;
}
.report-section-box p { line-height: 1.75; color: #334155; margin-bottom: 12px; font-size: 13px; word-break: keep-all; }
.report-section-box ul { list-style: none; padding: 0; margin: 0; }
.report-section-box li { position: relative; padding-left: 16px; margin-bottom: 7px; font-size: 13px; color: #334155; line-height: 1.65; word-break: keep-all; }
.report-section-box li::before { content: '■'; position: absolute; left: 0; color: ${accentColor} !important; font-size: 9px; top: 3px; }

/* ========== 컨설턴트 전용 섹션 ========== */
.consultant-only-section {
    background: #fffbeb !important;
    border: 2px solid #f59e0b !important;
    border-left: 6px solid #d97706 !important;
    border-radius: 10px;
    padding: 20px 22px;
    margin-bottom: 0;
    page-break-before: always; break-before: page;
    page-break-inside: avoid; break-inside: avoid;
    position: relative;
}
.consultant-only-section h3 {
    margin-top: 0 !important; margin-bottom: 14px;
    color: #92400e !important;
    border-left: 5px solid #d97706 !important;
    padding-left: 12px; font-size: 15px; font-weight: bold;
}
.consultant-only-section ul { list-style: none; padding: 0; margin: 0; }
.consultant-only-section li { position: relative; padding-left: 16px; margin-bottom: 7px; font-size: 13px; color: #78350f !important; line-height: 1.65; word-break: keep-all; }
.consultant-only-section li::before { content: '▶'; position: absolute; left: 0; color: #d97706 !important; font-size: 9px; top: 4px; }
.consultant-only-section h4 { font-size: 12px; font-weight: bold; color: #92400e !important; margin-bottom: 8px; }

/* ========== 컨설턴트 피드백 박스 ========== */
.consultant-feedback-box {
    background: #fff7ed !important;
    border: 1px solid #fed7aa !important;
    border-left: 5px solid #f97316 !important;
    border-radius: 8px;
    padding: 16px 18px;
    margin-top: 16px;
    page-break-inside: avoid; break-inside: avoid;
}
.consultant-feedback-box h4 { font-size: 13px; font-weight: bold; color: #c2410c !important; margin-bottom: 10px; }
.consultant-feedback-box ul { list-style: none; padding: 0; margin: 0; }
.consultant-feedback-box li { position: relative; padding-left: 18px; margin-bottom: 8px; font-size: 12px; color: #7c2d12 !important; line-height: 1.6; word-break: keep-all; }
.consultant-feedback-box li::before { content: '▶'; position: absolute; left: 0; color: #f97316 !important; font-size: 9px; top: 4px; }

/* ========== 기업현황 테이블 ========== */
.overview-company-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; border-top: 2px solid #1e3a8a; }
.overview-company-table th { background: #eff6ff !important; border: 1px solid #bfdbfe; padding: 8px 10px; text-align: left; font-size: 11px; color: #1e40af !important; font-weight: bold; white-space: nowrap; width: 14%; }
.overview-company-table td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; color: #1e293b; }

/* ========== Alert 박스 ========== */
.alert-box { padding: 14px; border-radius: 6px; font-weight: bold; margin: 14px 0; font-size: 13px; page-break-inside: avoid; line-height: 1.6; }
.alert-box.blue  { background: #eff6ff !important; color: #1e40af !important; border-left: 5px solid #3b82f6 !important; }
.alert-box.green { background: #f0fdf4 !important; color: #166534 !important; border-left: 5px solid #22c55e !important; }

/* ========== 차트 ========== */
.chart-container { margin: 16px 0 8px; display: flex; justify-content: center; page-break-inside: avoid; }
.chart-box { width: 85%; max-width: 480px; background: white !important; padding: 10px; border-radius: 6px; border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; height: 180px; }

/* ========== 사업계획서 전용 ========== */
/* SWOT */
.swot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.swot-item { border-radius: 8px; padding: 14px; page-break-inside: avoid; }
.swot-s { background: #f0fdf4 !important; border: 1px solid #86efac; }
.swot-w { background: #fef2f2 !important; border: 1px solid #fca5a5; }
.swot-o { background: #eff6ff !important; border: 1px solid #93c5fd; }
.swot-t { background: #fff7ed !important; border: 1px solid #fdba74; }
.swot-label { font-weight: bold; font-size: 13px; margin-bottom: 8px; }
.swot-s .swot-label { color: #16a34a !important; }
.swot-w .swot-label { color: #dc2626 !important; }
.swot-o .swot-label { color: #2563eb !important; }
.swot-t .swot-label { color: #ea580c !important; }
.swot-item ul { list-style: none; padding: 0; margin: 0; }
.swot-item li { font-size: 12px; padding-left: 12px; position: relative; margin-bottom: 5px; line-height: 1.5; color: #334155; }
.swot-s li::before { content: '•'; position: absolute; left: 0; color: #16a34a !important; font-weight: bold; }
.swot-w li::before { content: '•'; position: absolute; left: 0; color: #dc2626 !important; font-weight: bold; }
.swot-o li::before { content: '•'; position: absolute; left: 0; color: #2563eb !important; font-weight: bold; }
.swot-t li::before { content: '•'; position: absolute; left: 0; color: #ea580c !important; font-weight: bold; }
/* 경쟁사 비교표 */
.competitor-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
.competitor-table th { background: #1e3a8a !important; color: white !important; padding: 9px 10px; text-align: center; border: 1px solid #1e40af; }
.competitor-table td { padding: 8px 10px; text-align: center; border: 1px solid #e2e8f0; color: #334155; }
.competitor-table tr:nth-child(even) td { background: #f8fafc !important; }
.competitor-table td:first-child { font-weight: bold; color: #1e293b; text-align: left; }
.competitor-table td:nth-child(2) { background: #eff6ff !important; color: #1e40af !important; font-weight: bold; }
/* 자금계획표 */
.fund-plan-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
.fund-plan-table th { background: #f8fafc !important; border: 1px solid #e2e8f0; padding: 8px 10px; color: #475569; font-weight: bold; text-align: center; }
.fund-plan-table td { border: 1px solid #e2e8f0; padding: 8px 10px; color: #334155; text-align: center; }
.fund-plan-table td:first-child { text-align: left; font-weight: bold; }
.fund-plan-table tfoot td { background: #eff6ff !important; font-weight: bold; color: #1e3a8a !important; }
/* 기업현황표 */
.biz-info-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; border-top: 2px solid #1e3a8a; font-size: 12px; }
.biz-info-table th { background: #eff6ff !important; border: 1px solid #bfdbfe; padding: 8px 10px; color: #1e40af !important; font-weight: bold; width: 14%; }
.biz-info-table td { border: 1px solid #e2e8f0; padding: 8px 10px; color: #1e293b; }
/* 성장 3단계 */
.growth-phases { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.growth-phase { border-radius: 8px; padding: 10px 14px; page-break-inside: avoid; display: flex; gap: 14px; align-items: flex-start; }
.phase-short { background: #eff6ff !important; border: 1px solid #93c5fd; }
.phase-mid   { background: #f0fdf4 !important; border: 1px solid #86efac; }
.phase-long  { background: #fdf4ff !important; border: 1px solid #d8b4fe; }
.phase-header { font-weight: bold; font-size: 12px; white-space: nowrap; min-width: 90px; padding-top: 2px; }
.phase-short .phase-header { color: #1d4ed8 !important; }
.phase-mid .phase-header   { color: #15803d !important; }
.phase-long .phase-header  { color: #7c3aed !important; }
.growth-phase ul { list-style: none; padding: 0; margin: 0; flex: 1; display: flex; flex-wrap: wrap; gap: 2px 16px; }
.growth-phase li { font-size: 11px; padding-left: 10px; position: relative; line-height: 1.5; color: #334155; word-break: keep-all; width: calc(50% - 8px); }
.growth-phase li::before { content: '•'; position: absolute; left: 0; }
.phase-short li::before { color: #1d4ed8 !important; }
.phase-mid li::before   { color: #15803d !important; }
.phase-long li::before  { color: #7c3aed !important; }
/* 차트 제목 & 월별차트 */
.biz-chart-section { margin-bottom: 10px; }
.biz-chart-title { font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 6px; }
#biz-monthly-chart-wrap { width: 100%; height: 200px; background: white !important; border-radius: 6px; border: 1px solid #d1d5db; padding: 10px; }
/* 마무리 */
.biz-closing p { font-size: 14px; line-height: 1.9; color: #1e293b; font-weight: 500; }
</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
<div class="paper-inner">${reportHTML}</div>
<script>
window.onload = function() {
    // 경영진단 레이더 차트
    const radarEl = document.getElementById('report-radar-chart');
    if (radarEl) {
        new Chart(radarEl.getContext('2d'), {
            type: 'radar',
            data: { labels: ['재무건전성','전략/마케팅','인사/조직','운영/생산','IT/디지털'],
                datasets: [{ label: '기업 역량', data: [65,80,72,68,55],
                    backgroundColor: 'rgba(59,130,246,0.2)', borderColor: '#3b82f6',
                    pointBackgroundColor: '#1e3a8a', pointRadius: 4 }] },
            options: { scales: { r: { min:0, max:100, ticks:{ stepSize:20 } } },
                maintainAspectRatio: false, plugins: { legend: { display:false } } }
        });
    }
    // 경영진단 매출 라인 차트
    const lineEl = document.getElementById('report-bar-chart');
    if (lineEl) {
        const d = lineEl.dataset;
        new Chart(lineEl.getContext('2d'), {
            type: 'line',
            data: { labels: ['23년도','24년도','25년도','금년(예상)'],
                datasets: [{ label:'매출 추이',
                    data: [parseInt(d.y23)||0,parseInt(d.y24)||0,parseInt(d.y25)||0,parseInt(d.exp)||0],
                    borderColor:'rgba(22,163,74,1)', backgroundColor:'rgba(22,163,74,0.15)',
                    borderWidth:2, pointRadius:4, fill:true, tension:0.1 }] },
            options: { maintainAspectRatio:false, plugins:{legend:{display:false}},
                scales:{ y:{ ticks:{ callback: v => v>=10000 ? Math.floor(v/10000)+'억' : v.toLocaleString('ko-KR')+'만' } } } }
        });
    }
    // 사업계획서 월별 차트
    const bizChart = document.getElementById('biz-monthly-chart');
    if (bizChart) {
        const months=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
        const curM=${curMonth};
        const avg=${avgMonthly};
        const actual=[], forecast=[];
        for(let i=0;i<12;i++){
            if(i<curM){ actual.push(Math.round(avg*(0.88+i*0.025))); forecast.push(null); }
            else { actual.push(null); forecast.push(Math.round(avg*Math.pow(1.05,i-curM+1))); }
        }
        new Chart(bizChart.getContext('2d'),{
            type:'bar',
            data:{ labels:months, datasets:[
                {label:'실적',data:actual,backgroundColor:'rgba(22,163,74,0.7)',borderColor:'#16a34a',borderWidth:1,borderRadius:4},
                {label:'예측',data:forecast,backgroundColor:'rgba(59,130,246,0.45)',borderColor:'#3b82f6',borderWidth:1,borderRadius:4}
            ]},
            options:{ responsive:true, maintainAspectRatio:false,
                plugins:{legend:{display:true,position:'top',labels:{font:{size:10}}}},
                scales:{y:{ticks:{callback:v=>v>=10000?Math.floor(v/10000)+'억':Math.round(v/1000)+'천만'}}} }
        });
    }
    setTimeout(() => { window.print(); window.close(); }, 1000);
};
</script>
</body>
</html>`);
    printWin.document.close();
};

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    const urlParams = new URLSearchParams(window.location.search);
    showTab(urlParams.get('tab') || 'dashboard', false);
    window.toggleCorpNumber(); window.toggleRentInputs(); window.toggleExportInputs();
});

/* ===== 인증 ===== */
window.devBypassLogin = function() {
    const testUser = { email:'test@biz.com', pw:'1234', name:'선지영', dept:'솔루션빌더스', apiKey:'' };
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    if (!users.find(u => u.email === testUser.email)) { users.push(testUser); localStorage.setItem(DB_USERS, JSON.stringify(users)); }
    localStorage.setItem(DB_SESSION, JSON.stringify(testUser));
    checkAuth();
};
function checkAuth() {
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    const authEl = document.getElementById('auth-container');
    const appEl  = document.getElementById('main-app');
    if (session) { authEl.style.display='none'; appEl.style.display='flex'; loadUserProfile(); updateDataLists(); initInputHandlers(); }
    else          { authEl.style.display='flex'; appEl.style.display='none'; }
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

/* ===== 프로필 ===== */
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

/* ===== 탭 이동 ===== */
window.showTab = function(tabId, updateUrl=true) {
    document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.menu li, .bottom-menu li').forEach(i=>i.classList.remove('active'));
    const target=document.getElementById(tabId); if(target) target.classList.add('active');
    const menu=document.getElementById('menu-'+tabId); if(menu) menu.classList.add('active');
    if(tabId==='settings') loadUserProfile();
    if(tabId==='company') showCompanyList();
    // ★ 보고서 탭 클릭 시 항상 입력 화면으로 리셋 ★
    const reportTabs = ['report','finance','aiBiz','aiFund','aiTrade','aiMarketing'];
    if (reportTabs.includes(tabId)) {
        const inp = document.getElementById(tabId+'-input-step');
        const res = document.getElementById(tabId+'-result-step');
        if (inp) inp.style.display = 'block';
        if (res) res.style.display = 'none';
    }
    updateDataLists();
    if(updateUrl) history.pushState(null,'',`?tab=${tabId}`);
};
window.addEventListener('popstate',()=>{const p=new URLSearchParams(window.location.search);showTab(p.get('tab')||'dashboard',false);});

/* ===== ★ 업체 관리 - 목록/폼 전환 ===== */
window.showCompanyList = function() {
    document.getElementById('company-list-step').style.display = 'block';
    document.getElementById('company-form-step').style.display = 'none';
    renderCompanyCards();
    // 탭이 company가 아니면 전환
    const companyTab = document.getElementById('company');
    if (!companyTab.classList.contains('active')) showTab('company');
};

window.showCompanyForm = function(editName=null) {
    document.getElementById('company-list-step').style.display = 'none';
    document.getElementById('company-form-step').style.display = 'block';
    const titleEl = document.getElementById('company-form-title');
    if (editName) {
        if(titleEl) titleEl.textContent = `기업 정보 수정 - ${editName}`;
        // 폼 데이터 불러오기
        const comp = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]').find(c=>c.name===editName);
        if (comp?.rawData) {
            const els = document.querySelectorAll('#companyForm input,#companyForm select,#companyForm textarea');
            comp.rawData.forEach((d,i) => {
                if (els[i]) {
                    if (els[i].type==='checkbox'||els[i].type==='radio') els[i].checked=d.checked;
                    else els[i].value=d.value;
                }
            });
            calculateTotalDebt(); toggleCorpNumber(); toggleRentInputs(); toggleExportInputs();
        }
    } else {
        if(titleEl) titleEl.textContent = '기업 정보 등록';
    }
    // 탭이 company가 아니면 전환
    const companyTab = document.getElementById('company');
    if (!companyTab.classList.contains('active')) {
        document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
        document.querySelectorAll('.menu li, .bottom-menu li').forEach(i=>i.classList.remove('active'));
        companyTab.classList.add('active');
        const menu = document.getElementById('menu-company');
        if(menu) menu.classList.add('active');
    }
};

/* ===== ★ 업체 카드 렌더링 ===== */
function formatSmallCurrency(n) {
    if (!n || n === 0) return '-';
    const num = parseInt(n, 10); if (isNaN(num) || num === 0) return '-';
    const uk = Math.floor(num / 10000), man = num % 10000;
    if (uk > 0) return uk + '억' + (man > 0 ? ' ' + man.toLocaleString() + '만원' : '원');
    return man.toLocaleString() + '만원';
}
function getGradeFromKCB(score) {
    const s = parseInt(score, 10);
    if (isNaN(s) || s === 0) return null;
    if (s >= 900) return '1등급'; if (s >= 850) return '2등급';
    if (s >= 800) return '3등급'; if (s >= 750) return '4등급';
    if (s >= 700) return '5등급'; return '6등급+';
}

window.renderCompanyCards = function() {
    const container = document.getElementById('company-cards-container'); if (!container) return;
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const reports   = JSON.parse(localStorage.getItem(DB_REPORTS)  || '[]');
    const keyword   = (document.getElementById('company-search-input')?.value || '').toLowerCase();

    const filtered = companies.filter(c =>
        c.name.toLowerCase().includes(keyword) || (c.industry||'').toLowerCase().includes(keyword)
    );

    if (!filtered.length) {
        container.innerHTML = `
            <div class="company-empty-state">
                <div class="empty-icon">🏢</div>
                <p>${keyword ? '검색 결과가 없습니다.' : '등록된 업체가 없습니다.'}</p>
                <button class="btn-add-company" onclick="showCompanyForm()">＋ 업체 등록하기</button>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(c => {
        // 주소 추출 (rawData에서 사업장 주소 텍스트)
        let address = '주소 미입력';
        if (c.rawData) {
            const addrEl = c.rawData.find(d =>
                d.type === 'text' && d.value && d.value.length > 3 &&
                d.value !== c.name && d.value !== c.rep && d.value !== c.bizNum &&
                d.value !== c.industry && d.value !== c.bizDate && d.value !== c.empCount &&
                d.value !== c.coreItem && !d.value.match(/^\d{2,3}-/) &&
                (d.value.includes('시') || d.value.includes('구') || d.value.includes('동') || d.value.includes('로') || d.value.includes('길'))
            );
            if (addrEl) address = addrEl.value;
        }

        return `
        <div class="company-card">
            <div class="company-card-top">
                <div class="company-card-icon">🏢</div>
                <div class="company-card-info">
                    <div class="company-card-name">${c.name}</div>
                    <div class="company-card-rep">${c.rep && c.rep !== '-' ? c.rep + ' 대표' : '대표자 미입력'}</div>
                </div>
                <div class="company-card-actions">
                    <button class="btn-card-detail" title="수정/상세보기" onclick="showCompanyForm('${c.name}')">›</button>
                    <button class="btn-card-delete" title="삭제" onclick="deleteCompany('${c.name}')">🗑</button>
                </div>
            </div>
            <div class="company-card-body">
                <div class="company-card-row">
                    <span class="company-card-label">업종</span>
                    <span class="company-card-value">${c.industry && c.industry !== '-' ? c.industry : '미입력'}</span>
                </div>
                <div class="company-card-row">
                    <span class="company-card-label">주소</span>
                    <span class="company-card-value addr">${address}</span>
                </div>
            </div>
        </div>`;
    }).join('');
};

/* ===== 업체 삭제 ===== */
window.deleteCompany = function(name) {
    if (!confirm(`[${name}]을 삭제하시겠습니까?\n관련 보고서는 삭제되지 않습니다.`)) return;
    let companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    companies = companies.filter(c => c.name !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    updateDataLists();
    renderCompanyCards();
};

/* ===== 대시보드 최근 보고서 ===== */
function updateDashboardReports() {
    const listEl = document.getElementById('dashboard-report-list'); if (!listEl) return;
    const reports   = JSON.parse(localStorage.getItem(DB_REPORTS)  || '[]');
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const setNum = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
    setNum('stat-companies', companies.length);
    setNum('stat-mgmt',  reports.filter(r=>r.type==='경영진단').length);
    setNum('stat-biz',   reports.filter(r=>r.type==='사업계획서').length);
    setNum('stat-total', reports.length);
    if (!reports.length) { listEl.innerHTML='<div class="empty-state">최근 생성된 보고서가 없습니다.</div>'; return; }
    const typeIcon = t => ({'경영진단':'📈','재무진단':'💰','사업계획서':'💡','정책자금매칭':'🎯','상권분석':'🏪','마케팅제안':'📢'}[t]||'📄');
    listEl.innerHTML = [...reports].reverse().slice(0,5).map(r=>`
        <div class="recent-report-item">
            <div class="report-type-icon">${typeIcon(r.type)}</div>
            <div>
                <div class="report-item-title">${r.title}</div>
                <div class="report-item-company">${r.company}</div>
            </div>
            <div class="report-item-right">
                <span class="report-badge">${r.type}</span>
                <span class="report-date">🕐 ${r.date}</span>
                <button class="btn-small-outline" style="font-size:11px;padding:4px 8px;" onclick="viewReport('${r.id}')">보기</button>
            </div>
        </div>`).join('');
}

/* ===== 데이터 목록 갱신 ===== */
window.updateDataLists = function() {
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const reports   = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');

    // 드롭다운 갱신
    document.querySelectorAll('.company-dropdown').forEach(sel=>{
        sel.innerHTML='<option value="">기업을 선택하세요</option>';
        companies.forEach(c=>sel.innerHTML+=`<option value="${c.name}">${c.name}</option>`);
    });

    // 요약: 기업 최대 5개
    const cBody=document.getElementById('company-list-body');
    if(cBody){
        const shown = companies.slice(0,5);
        cBody.innerHTML = shown.length
            ? shown.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.rep||'-'}</td><td>${c.bizNum||'-'}</td><td>${c.date}</td><td><button class="btn-small-outline" onclick="showCompanyForm('${c.name}')">수정/보기</button></td></tr>`).join('')
            : '<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">등록된 기업이 없습니다.</td></tr>';
    }

    // 요약: 보고서 최대 5개
    const rBody=document.getElementById('report-list-body');
    if(rBody){
        const shown=[...reports].reverse().slice(0,5);
        rBody.innerHTML = shown.length
            ? shown.map(r=>`<tr>
                <td><span style="background:#eff6ff;color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${r.type}</span></td>
                <td><strong>${r.company}</strong></td><td>${r.title}</td><td>${r.date}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button>
                    <button class="btn-delete" style="margin-left:6px;" onclick="deleteReport('${r.id}')">삭제</button>
                </td></tr>`).join('')
            : '<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">생성된 보고서가 없습니다.</td></tr>';
    }

    // 보고서 전체 필터 드롭다운 갱신
    const filterComp = document.getElementById('filter-company');
    if(filterComp){
        filterComp.innerHTML = '<option value="">전체 업체</option>';
        companies.forEach(c => filterComp.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    }

    updateDashboardReports();
    renderCompanyCards();
};

/* ===== 보고서 목록 서브뷰 전환 ===== */
window.showReportListSummary = function() {
    document.getElementById('rl-summary').style.display = 'block';
    document.getElementById('rl-companies').style.display = 'none';
    document.getElementById('rl-reports').style.display = 'none';
    updateDataLists();
};

window.showFullCompanies = function() {
    document.getElementById('rl-summary').style.display = 'none';
    document.getElementById('rl-companies').style.display = 'block';
    document.getElementById('rl-reports').style.display = 'none';
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const tbody = document.getElementById('company-full-body');
    if(tbody){
        tbody.innerHTML = companies.length
            ? companies.map(c=>`<tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.rep||'-'}</td>
                <td>${c.bizNum||'-'}</td>
                <td>${c.industry||'-'}</td>
                <td>${c.date}</td>
                <td><button class="btn-small-outline" onclick="showCompanyForm('${c.name}')">수정/보기</button></td>
            </tr>`).join('')
            : '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">등록된 기업이 없습니다.</td></tr>';
    }
};

window.showFullReports = function() {
    document.getElementById('rl-summary').style.display = 'none';
    document.getElementById('rl-companies').style.display = 'none';
    document.getElementById('rl-reports').style.display = 'block';
    // 업체 필터 드롭다운 갱신
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const filterComp = document.getElementById('filter-company');
    if(filterComp){
        filterComp.innerHTML = '<option value="">전체 업체</option>';
        companies.forEach(c => filterComp.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    }
    renderFullReports();
};

window.renderFullReports = function() {
    const typeFilter    = document.getElementById('filter-type')?.value    || '';
    const companyFilter = document.getElementById('filter-company')?.value || '';
    const reports = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
    const filtered = [...reports].reverse().filter(r =>
        (!typeFilter    || r.type    === typeFilter) &&
        (!companyFilter || r.company === companyFilter)
    );
    const countEl = document.getElementById('filter-result-count');
    if(countEl) countEl.textContent = `총 ${filtered.length}건`;
    const tbody = document.getElementById('report-full-body');
    if(!tbody) return;
    tbody.innerHTML = filtered.length
        ? filtered.map(r=>`<tr>
            <td><span style="background:#eff6ff;color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${r.type}</span></td>
            <td><strong>${r.company}</strong></td>
            <td>${r.title}</td>
            <td>${r.date}</td>
            <td style="white-space:nowrap;">
                <button class="btn-small-outline" onclick="viewReport('${r.id}')">보기</button>
                <button class="btn-delete" style="margin-left:6px;" onclick="deleteReportFull('${r.id}')">삭제</button>
            </td></tr>`).join('')
        : '<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">조건에 맞는 보고서가 없습니다.</td></tr>';
};

window.deleteReportFull = function(id) {
    if(!confirm('이 보고서를 삭제하시겠습니까?')) return;
    let reports = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
    reports = reports.filter(r=>r.id!==id);
    localStorage.setItem(DB_REPORTS, JSON.stringify(reports));
    renderFullReports();
    updateDashboardReports();
};

window.deleteReport = function(id) {
    if (!confirm('이 보고서를 삭제하시겠습니까?')) return;
    let reports = JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');
    reports = reports.filter(r=>r.id!==id);
    localStorage.setItem(DB_REPORTS,JSON.stringify(reports));
    updateDataLists();
};

/* ===== 기업 저장 ===== */
window.clearCompanyForm = function() { if(confirm('초기화하시겠습니까?')){ document.getElementById('companyForm').reset(); calculateTotalDebt(); toggleCorpNumber(); toggleRentInputs(); toggleExportInputs(); } };
window.saveCompanyData=function(){
    const name=document.getElementById('comp_name')?.value; if(!name){alert('상호명을 입력해주세요.');return;}
    const rev={
        cur:parseInt(document.getElementById('rev_cur')?.value?.replace(/,/g,'')||0),
        y25:parseInt(document.getElementById('rev_25')?.value?.replace(/,/g,'')||0),
        y24:parseInt(document.getElementById('rev_24')?.value?.replace(/,/g,'')||0),
        y23:parseInt(document.getElementById('rev_23')?.value?.replace(/,/g,'')||0)
    };
    const needFundRaw = document.getElementById('need_fund')?.value?.replace(/,/g,'') || '0';
    const needFund = parseInt(needFundRaw) || 0;
    const fundPlan = document.getElementById('fund_plan')?.value || '';
    const newC={
        name, rep:document.querySelector('input[placeholder="대표자명을 입력하세요"]')?.value||'-',
        bizNum:document.getElementById('biz_number')?.value||'-', industry:document.getElementById('comp_industry')?.value||'-',
        bizDate:document.getElementById('biz_date')?.value||'-', empCount:document.getElementById('emp_count')?.value||'-',
        coreItem:document.getElementById('core_item')?.value||'-', date:new Date().toISOString().split('T')[0],
        revenueData:rev, needFund, fundPlan,
        rawData:Array.from(document.querySelectorAll('#companyForm input,#companyForm select,#companyForm textarea')).map(el=>({type:el.type,value:el.value,checked:el.checked}))
    };
    let companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const idx=companies.findIndex(c=>c.name===name);
    if(idx>-1) companies[idx]=newC; else companies.push(newC);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(companies));
    alert('기업 정보가 저장되었습니다!');
    updateDataLists();
    showCompanyList(); // ★ 저장 후 목록으로 이동 ★
};

/* ===== 입력 토글/계산 ===== */
window.toggleExportInputs=function(){const isExp=[...document.getElementsByName('export')].some(r=>r.checked&&r.value==='수출중');document.querySelectorAll('.export-money').forEach(i=>{i.disabled=!isExp;if(!isExp)i.value='';});};
window.toggleCorpNumber=function(){const isC=[...document.getElementsByName('biz_type')].some(r=>r.checked&&r.value==='법인');const el=document.getElementById('corp_number');if(el){el.disabled=!isC;if(!isC)el.value='';}};
window.toggleRentInputs=function(){const isR=[...document.getElementsByName('rent_type')].some(r=>r.checked&&r.value==='임대');['rent_deposit','rent_monthly'].forEach(id=>{const el=document.getElementById(id);if(el){el.disabled=!isR;if(!isR)el.value='';}});};
window.calculateTotalDebt=function(){let tot=0;document.querySelectorAll('.debt-input').forEach(i=>{let v=i.value.replace(/[^0-9]/g,'');if(v)tot+=parseInt(v);});const el=document.getElementById('total-debt');if(el)el.innerText=tot.toLocaleString('ko-KR');};

/* ===== 입력 포매터 ===== */
function initInputHandlers(){
    document.querySelectorAll('.number-only').forEach(i=>i.addEventListener('input',function(){this.value=this.value.replace(/[^0-9]/g,'');}));
    document.querySelectorAll('.money-format').forEach(i=>i.addEventListener('input',function(){let v=this.value.replace(/[^0-9\-]/g,'');this.value=v.replace(/\B(?=(\d{3})+(?!\d))/g,',');}));
    document.querySelectorAll('.debt-input').forEach(i=>i.addEventListener('input',calculateTotalDebt));
    [['biz_number','biz'],['corp_number','corp'],['biz_date','date'],['rep_birth','date'],['write_date','date']].forEach(([id,fmt])=>{
        const el=document.getElementById(id);if(!el)return;
        el.addEventListener('input',function(){let v=this.value.replace(/[^0-9]/g,'');
            if(fmt==='corp'){this.value=v.length<7?v:v.slice(0,6)+'-'+v.slice(6,13);}
            else if(fmt==='biz'){if(v.length<4)this.value=v;else if(v.length<6)this.value=v.slice(0,3)+'-'+v.slice(3);else this.value=v.slice(0,3)+'-'+v.slice(3,5)+'-'+v.slice(5,10);}
            else{if(v.length<5)this.value=v;else if(v.length<7)this.value=v.slice(0,4)+'-'+v.slice(4);else this.value=v.slice(0,4)+'-'+v.slice(4,6)+'-'+v.slice(6,8);}
        });
    });
    ['biz_phone','rep_phone'].forEach(id=>{
        const el=document.getElementById(id);if(!el)return;
        el.addEventListener('input',function(){let v=this.value.replace(/[^0-9]/g,'');
            if(v.startsWith('02')){if(v.length<3)this.value=v;else if(v.length<6)this.value=v.slice(0,2)+'-'+v.slice(2);else if(v.length<10)this.value=v.slice(0,2)+'-'+v.slice(2,5)+'-'+v.slice(5);else this.value=v.slice(0,2)+'-'+v.slice(2,6)+'-'+v.slice(6,10);}
            else{if(v.length<4)this.value=v;else if(v.length<7)this.value=v.slice(0,3)+'-'+v.slice(3);else if(v.length<11)this.value=v.slice(0,3)+'-'+v.slice(3,6)+'-'+v.slice(6);else this.value=v.slice(0,3)+'-'+v.slice(3,7)+'-'+v.slice(7,11);}
        });
    });
}

/* ===== 한글 금액 변환 ===== */
function formatKoreanCurrency(n){
    const num=parseInt(n,10);if(!num||isNaN(num))return'0원';
    const uk=Math.floor(num/10000),man=num%10000;
    if(uk>0)return uk.toLocaleString('ko-KR')+'억'+(man>0?' '+man.toLocaleString('ko-KR')+'만원':'원');
    return man.toLocaleString('ko-KR')+'만원';
}
function formatRevenueForAI(companyData,rev){
    const regMonth=parseInt((companyData.date||'').split('-')[1])||1;
    const months=Math.max(regMonth-1,1);
    const expectedCur=Math.round(((rev.cur||0)/months)*12);
    return{금년매출_전월말기준:formatKoreanCurrency(rev.cur),금년예상연간매출:formatKoreanCurrency(expectedCur)+` (${months}개월 기준 연간 환산)`,매출_2025년:formatKoreanCurrency(rev.y25),매출_2024년:formatKoreanCurrency(rev.y24),매출_2023년:formatKoreanCurrency(rev.y23),_raw:rev,_expected:expectedCur,_months:months};
}

/* ===================================================
   ★★★ Gemini API 호출 (재시도 + 오류 처리 강화) ★★★
   - 400/429/503 오류 자동 재시도 (최대 3회)
   - 타임아웃 120초
   - 구체적 오류 메시지 표시
=================================================== */
async function _callGeminiCore(prompt, maxTokens, maxRetries) {
    const session = JSON.parse(localStorage.getItem('biz_session'));
    const apiKey = session?.apiKey;
    if (!apiKey) { alert('설정 탭에서 Gemini API 키를 등록해주세요.'); showTab('settings'); return null; }
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (attempt > 1) await new Promise(r => setTimeout(r, attempt * 2000));
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 120000);
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
                  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: maxTokens } }) }
            );
            clearTimeout(tid);
            const data = await res.json();
            if (res.status === 400) { lastError = new Error(`요청 형식 오류(400): ${data.error?.message||''}`); console.warn(`[Gemini] 400 (${attempt}/${maxRetries})`); continue; }
            if (res.status === 429) { lastError = new Error('API 요청 한도 초과(429). 잠시 후 재시도합니다.'); await new Promise(r => setTimeout(r, 5000 * attempt)); continue; }
            if (res.status === 503) { lastError = new Error('서버 과부하(503). 잠시 후 재시도합니다.'); continue; }
            if (!res.ok || data.error) throw new Error(data.error?.message || `HTTP ${res.status}`);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('AI 응답이 비어 있습니다.');
            return text;
        } catch(e) {
            if (e.name === 'AbortError') lastError = new Error('AI 응답 시간이 초과되었습니다(120초). 네트워크 상태를 확인하고 다시 시도해주세요.');
            else lastError = e;
            console.warn(`[Gemini] 오류 (${attempt}/${maxRetries}):`, e.message);
        }
    }
    alert(`AI 보고서 생성 실패 (${maxRetries}회 시도):\n${lastError?.message||'알 수 없는 오류'}\n\n해결 방법:\n1. 설정에서 API 키 확인\n2. 잠시 후 다시 시도\n3. 네트워크 연결 확인`);
    return null;
}
async function callGeminiAPIBiz(prompt) { return _callGeminiCore(prompt, 65536, 3); }
async function callGeminiAPI(prompt)    { return _callGeminiCore(prompt,  8192, 3); }

function cleanAIResponse(raw){
    let html=raw.replace(/```html|```/g,'').replace(/\*\*/g,'');
    const firstSectionIdx=html.indexOf('<div class="report-section-box">');
    if(firstSectionIdx>0) html=html.slice(firstSectionIdx);
    return html;
}

const COMMON_RULES=`
[★ 출력 형식 규칙 ★]
- 각 목차는 <div class="report-section-box">로 감쌀 것
- 제목은 <h3>, 내용은 <ul><li>
- li 최소 30자, 금액은 한글로, 개조식 문체, 표/마크다운 금지
- 첫 번째 목차 앞에 인사말 등 어떠한 텍스트도 출력하지 말 것
`;

/* ===== 표지 HTML ===== */
function buildCoverHTML(companyData,config,rev,dateStr){
    const session=JSON.parse(localStorage.getItem(DB_SESSION));
    const cName=session?.name||'담당자', cDept=session?.dept||'솔루션빌더스';
    const safeRev=rev||{cur:0,y25:0,y24:0,y23:0};
    const regMonth=parseInt((companyData.date||dateStr).split('-')[1])||1;
    const months=Math.max(regMonth-1,1);
    const expectedCur=Math.round((safeRev.cur/months)*12);
    const vLabel=config.version==='client'?'기업전달용':'컨설턴트용';
    return`<div class="cover-page" style="border-left-color:${config.borderColor||'#3b82f6'};">
        <div class="cover-header">
            <h4 style="color:${config.borderColor||'#3b82f6'};border-bottom-color:${config.borderColor||'#3b82f6'};">${config.reportKind||'AI 리포트'}</h4>
            <h1>${config.title}</h1>
        </div>
        <div class="cover-middle">
            <h2>${companyData.name} <span style="font-size:18px;color:#94a3b8;">(${vLabel})</span></h2>
            <div class="cover-table"><table>
                <tr><th>사업자번호</th><td>${companyData.bizNum||'-'}</td><th>업종</th><td>${companyData.industry||'-'}</td></tr>
                <tr><th>대표자명</th><td>${companyData.rep||'-'}</td><th>핵심아이템</th><td>${companyData.coreItem||'-'}</td></tr>
                <tr><th>설립일</th><td>${companyData.bizDate||'-'}</td><th>상시근로자</th><td>${companyData.empCount||'-'}명</td></tr>
                <tr><th>전년도 매출</th><td>${formatKoreanCurrency(safeRev.y25)}</td><th>금년 예상 매출</th><td>${formatKoreanCurrency(expectedCur)}</td></tr>
            </table></div>
        </div>
        <div class="cover-footer">
            <div>📅 작성일: ${dateStr}</div><div>👤 담당자: ${cName}</div><div>🏢 소속: ${cDept}</div>
        </div>
    </div>`;
}

function buildCompanyOverviewTable(companyData,rev){
    const safeRev=rev||{};
    const months=Math.max((parseInt((companyData.date||'').split('-')[1])||1)-1,1);
    const exp=Math.round(((safeRev.cur||0)/months)*12);
    return`<table class="overview-company-table">
        <tr><th>기업명</th><td>${companyData.name}</td><th>업종</th><td>${companyData.industry||'-'}</td></tr>
        <tr><th>대표자</th><td>${companyData.rep||'-'}</td><th>설립일</th><td>${companyData.bizDate||'-'}</td></tr>
        <tr><th>사업자번호</th><td>${companyData.bizNum||'-'}</td><th>상시근로자</th><td>${companyData.empCount||'-'}명</td></tr>
        <tr><th>전년도 매출 (25년)</th><td>${formatKoreanCurrency(safeRev.y25)}</td><th>금년 예상 매출</th><td>${formatKoreanCurrency(exp)}</td></tr>
    </table>`;
}

/* ===== 경영진단 렌더링 ===== */
function renderManagementReport(companyData,cleanHTML,version,rev,dateStr){
    const contentArea=document.getElementById('report-content-area');
    const safeRev=rev||{cur:0,y25:0,y24:0,y23:0};
    const months=Math.max((parseInt((companyData.date||dateStr).split('-')[1])||1)-1,1);
    const expectedCur=Math.round((safeRev.cur/months)*12);
    // ★ 파일명용 메타 저장 ★
    _currentReport={company:companyData.name,type:`AI 경영진단보고서 (${version==='client'?'기업전달용':'컨설턴트용'})`,contentAreaId:'report-content-area',landscape:false};
    cleanHTML=cleanHTML.replace(/(<h3[^>]*>[^<]*경영진단[^<]*개요[^<]*<\/h3>)/,`$1\n${buildCompanyOverviewTable(companyData,safeRev)}`);
    const pos1=cleanHTML.indexOf('경영진단');
    if(pos1>-1){const ulClose=cleanHTML.indexOf('</ul>',pos1);if(ulClose>-1)cleanHTML=cleanHTML.slice(0,ulClose+5)+'\n<div class="chart-container"><div class="chart-box"><canvas id="report-radar-chart"></canvas></div></div>\n'+cleanHTML.slice(ulClose+5);}
    cleanHTML=cleanHTML.replace(/(<h3[^>]*>[^<]*재무[^<]*현황[^<]*<\/h3>)/,`$1\n<div class="chart-container"><div class="chart-box"><canvas id="report-bar-chart" data-y23="${safeRev.y23||0}" data-y24="${safeRev.y24||0}" data-y25="${safeRev.y25||0}" data-exp="${expectedCur||0}"></canvas></div></div>`);
    const vLabel=version==='client'?'기업의 현재 역량 분석 및 맞춤형 성장 전략 제안':'내부 리스크 진단 및 컨설턴트 피드백 포함 자료';
    const coverCfg={title:'AI 경영진단보고서',reportKind:'AI 경영진단보고서 리포트',version,borderColor:'#3b82f6'};
    contentArea.innerHTML=`<div class="paper-inner">${buildCoverHTML(companyData,coverCfg,safeRev,dateStr)}${cleanHTML}<div class="alert-box ${version==='client'?'blue':'green'}">★ 본 리포트는 AI 컨설턴트가 분석한 ${vLabel} 자료입니다.</div></div>`;
    setTimeout(()=>{
        const radarEl=document.getElementById('report-radar-chart');
        if(radarEl)new Chart(radarEl.getContext('2d'),{type:'radar',data:{labels:['재무건전성','전략/마케팅','인사/조직','운영/생산','IT/디지털'],datasets:[{label:'기업 역량 진단',data:[65,80,72,68,55],backgroundColor:'rgba(59,130,246,0.2)',borderColor:'#3b82f6',pointBackgroundColor:'#1e3a8a',pointRadius:4}]},options:{scales:{r:{min:0,max:100,ticks:{stepSize:20}}},maintainAspectRatio:false,plugins:{legend:{display:false}}}});
        const lineEl=document.getElementById('report-bar-chart');
        if(lineEl)new Chart(lineEl.getContext('2d'),{type:'line',data:{labels:['23년도','24년도','25년도','금년(예상)'],datasets:[{label:'매출 추이',data:[safeRev.y23,safeRev.y24,safeRev.y25,expectedCur],borderColor:'rgba(22,163,74,1)',backgroundColor:'rgba(22,163,74,0.15)',borderWidth:2,pointRadius:4,fill:true,tension:0.1}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>v>=10000?Math.floor(v/10000)+'억':v.toLocaleString('ko-KR')+'만'}}}}});
    },100);
}

function renderGenericReport(contentAreaId,companyData,cleanHTML,config,rev,dateStr){
    const contentArea=document.getElementById(contentAreaId);if(!contentArea)return;
    const safeRev=rev||{cur:0,y25:0,y24:0,y23:0};
    // ★ 파일명용 메타 저장 ★
    _currentReport={company:companyData.name,type:config.title,contentAreaId,landscape:false};
    const vLabel=config.version==='client'?'기업의 현황 분석 및 맞춤형 전략 제안':'내부 리스크 진단 및 보완 액션 플랜';
    contentArea.innerHTML=`<div class="paper-inner">${buildCoverHTML(companyData,config,safeRev,dateStr)}${cleanHTML}<div class="alert-box ${config.version==='client'?'blue':'green'}">★ 본 리포트는 AI 컨설턴트가 분석한 ${config.title} 자료입니다. (${vLabel})</div></div>`;
}

/* ===================================================
   ★★★ 경영진단보고서 - 기업전달용 프롬프트 (방안B: 7섹션) ★★★
=================================================== */
function buildMgmtClientPrompt(cData, fRev) {
    const pd = {...cData}; delete pd.rawData; delete pd.revenueData; pd.매출데이터 = fRev;
    return `너는 20년 경력의 경영 컨설턴트야. 대상 기업: '${cData.name}'

★ 기업전달용 경영진단보고서 - 7개 섹션을 모두 작성할 것 ★
기업에게 전달하는 보고서이므로 긴정적·객관적 톤으로 작성. 리스크 언급 최소화.

[출력 규칙]
- 각 섹션은 반드시 <div class="report-section-box"> 로 시작하고 </div>로 닫을 것
- 제목은 <h3>번호. 제목</h3>
- 내용은 <ul><li>항목(최소 40자 이상)</li></ul>
- 금액은 한국식(억원/만원), 개조식 문체(~함, ~임, ~있음)
- 첫 섹션 앞에 인사말 등 어떠한 텍스트도 출력하지 말 것
- ** 마크다운 금지

=== 섹션 1: 경영진단 개요 ===
<div class="report-section-box"><h3>1. 경영진단 개요</h3>
[기업현황표 자동 삽입됨]
<ul><li>기업의 전반적 현황 및 진단 목적 li 4개, 각 40자 이상</li></ul></div>

=== 섹션 2: 재무 현황 분석 ===
<div class="report-section-box"><h3>2. 재무 현황 분석</h3>
[매출 추이 차트 자동 삽입됨]
<ul><li>매출 성장세, 수익성, 현금흐름 분석 li 5개, 각 40자 이상. 구체적 수치 포함</li></ul></div>

=== 섹션 3: 전략 및 마케팅 분석 ===
<div class="report-section-box"><h3>3. 전략 및 마케팅 분석</h3>
<ul><li>시장 포지셔닝, 경쟁력, 마케팅 채널 분석 li 7개, 각 40자 이상</li></ul></div>

=== 섹션 4: 인사 및 조직 분석 ===
<div class="report-section-box"><h3>4. 인사 및 조직 분석</h3>
<ul><li>인력 구성, 조직 역량, 대표자 역량 분석 li 6개, 각 40자 이상</li></ul></div>

=== 섹션 5: 운영 및 생산 분석 ===
<div class="report-section-box"><h3>5. 운영 및 생산 분석</h3>
<ul><li>생산 효율, 품질 관리, 납기 대응력 분석 li 6개, 각 40자 이상</li></ul></div>

=== 섹션 6: IT·디지털 및 정부지원 활용 ===
<div class="report-section-box"><h3>6. IT·디지털 및 정부지원 활용</h3>
<ul><li>디지털 전환 현황, 정책자금·인증 활용 현황 li 5개, 각 40자 이상</li></ul></div>

=== 섹션 7: 개선 방향 및 성장 로드맵 ===
<div class="report-section-box"><h3>7. 개선 방향 및 성장 로드맵</h3>
<ul><li>단기·중기·장기 개선 방향 및 실행 전략 li 7개, 각 40자 이상. 구체적 실행 방안 포함</li></ul></div>

[기업 데이터]
${JSON.stringify(pd, null, 2)}`;
}

/* ===================================================
   ★★★ 경영진단보고서 - 컨설턴트용 프롬프트 (방안B: 7섹션 + 컨설턴트 전용 섹션) ★★★
=================================================== */
function buildMgmtConsultantPrompt(cData, fRev) {
    const pd = {...cData}; delete pd.rawData; delete pd.revenueData; pd.매출데이터 = fRev;
    return `너는 20년 경력의 경영 컨설턴트야. 대상 기업: '${cData.name}'

★ 컨설턴트용 경영진단보고서 - 8개 섹션을 모두 작성할 것 ★
컨설턴트 내부용 보고서이므로 리스크·문제점·실질 조언을 솔직하고 구체적으로 작성.
기업전달용과 달리 부정적 요소도 명확히 기술.

[출력 규칙]
- 각 섹션은 반드시 <div class="report-section-box"> 로 시작하고 </div>로 닫을 것
- 컨설턴트 전용 섹션(섹션 8)은 <div class="consultant-only-section"> 사용
- 제목은 <h3>번호. 제목</h3>
- 내용은 <ul><li>항목(최소 50자 이상)</li></ul>
- 금액은 한국식(억원/만원), 개조식 문체(~함, ~임, ~있음)
- 첫 섹션 앞에 인사말 등 어떠한 텍스트도 출력하지 말 것
- ** 마크다운 금지

=== 섹션 1~7: 기업전달용과 동일한 구조로 작성 (단, 리스크·문제점 포함) ===

=== 섹션 1: 경영진단 개요 ===
<div class="report-section-box"><h3>1. 경영진단 개요</h3>
[기업현황표 자동 삽입됨]
<ul><li>기업 현황 및 진단 목적 li 4개, 리스크 요소 포함, 각 50자 이상</li></ul></div>

=== 섹션 2: 재무 현황 분석 ===
<div class="report-section-box"><h3>2. 재무 현황 분석</h3>
[매출 추이 차트 자동 삽입됨]
<ul><li>매출 성장세, 수익성, 현금흐름, 부체 리스크 분석 li 6개, 각 50자 이상</li></ul></div>

=== 섹션 3: 전략 및 마케팅 분석 ===
<div class="report-section-box"><h3>3. 전략 및 마케팅 분석</h3>
<ul><li>시장 포지셔닝, 경쟁력, 마케팅 취약점 분석 li 7개, 각 50자 이상</li></ul></div>

=== 섹션 4: 인사 및 조직 분석 ===
<div class="report-section-box"><h3>4. 인사 및 조직 분석</h3>
<ul><li>인력 구성, 조직 역량, 핵심 인력 리스크 분석 li 6개, 각 50자 이상</li></ul></div>

=== 섹션 5: 운영 및 생산 분석 ===
<div class="report-section-box"><h3>5. 운영 및 생산 분석</h3>
<ul><li>생산 효율, 품질 관리, 운영 리스크 분석 li 6개, 각 50자 이상</li></ul></div>

=== 섹션 6: IT·디지털 및 정부지원 활용 ===
<div class="report-section-box"><h3>6. IT·디지털 및 정부지원 활용</h3>
<ul><li>디지털 전환 현황, 정책자금 활용 현황, 개선 필요 사항 li 5개, 각 50자 이상</li></ul></div>

=== 섹션 7: 개선 방향 및 성장 로드맵 ===
<div class="report-section-box"><h3>7. 개선 방향 및 성장 로드맵</h3>
<ul><li>단기·중기·장기 개선 방향, 우선순위별 실행 전략 li 7개, 각 50자 이상</li></ul></div>

=== 섹션 8: 컨설턴트 실질 조언 및 참고 메모 (내부 전용) ===
이 섹션은 기업에게 전달하지 않는 컨설턴트 내부 전용 자료임.
가장 풍부하고 구체적으로 작성할 것.

<div class="consultant-only-section"><h3>8. 컨설턴트 실질 조언 및 참고 메모 🔒 내부 전용</h3>
<div style="background:#fef3c7;border-radius:6px;padding:12px 14px;margin-bottom:12px;"><h4 style="color:#92400e;font-size:13px;font-weight:bold;margin-bottom:8px;">🚨 시급 해결 이슈 (우선순위 TOP 3)</h4>
<ul><li>[이슈1] 구체적 문제점과 즉시 실행 가능한 해결 방안 60자 이상</li>
<li>[이슈2] 구체적 문제점과 즉시 실행 가능한 해결 방안 60자 이상</li>
<li>[이슈3] 구체적 문제점과 즉시 실행 가능한 해결 방안 60자 이상</li></ul></div>
<div style="background:#fef3c7;border-radius:6px;padding:12px 14px;margin-bottom:12px;"><h4 style="color:#92400e;font-size:13px;font-weight:bold;margin-bottom:8px;">💰 정책자금 신청 전략 (컨설턴트 판단)</h4>
<ul><li>신청 가능한 정책자금 기관·상품명과 신청 전략 li 5개, 각 50자 이상. 중진공·소진공·신보·기보·지역신보 포함</li></ul></div>
<div style="background:#fef3c7;border-radius:6px;padding:12px 14px;margin-bottom:12px;"><h4 style="color:#92400e;font-size:13px;font-weight:bold;margin-bottom:8px;">📜 특허·인증 취득 전략</h4>
<ul><li>취득 가능한 인증·특허와 취득 시 기대 효과 li 4개, 각 50자 이상. 벤처인증·이노비즈·메인비즈·ISO 포함</li></ul></div>
<div style="background:#fef3c7;border-radius:6px;padding:12px 14px;margin-bottom:12px;"><h4 style="color:#92400e;font-size:13px;font-weight:bold;margin-bottom:8px;">📈 마케팅 채널 개선 방안</h4>
<ul><li>즉시 실행 가능한 마케팅 채널별 구체적 전략 li 4개, 각 50자 이상</li></ul></div>
<div style="background:#fef3c7;border-radius:6px;padding:12px 14px;"><h4 style="color:#92400e;font-size:13px;font-weight:bold;margin-bottom:8px;">💳 신용 개선 로드맵</h4>
<ul><li>신용등급 개선을 위한 단계별 실행 방안 li 4개, 각 50자 이상</li></ul></div>
</div>

[기업 데이터]
${JSON.stringify(pd, null, 2)}`;
}

/* ===== 경영진단 생성 ===== */
window.generateReport=async function(type,version,event){
    const tab=event.target.closest('.tab-content');
    const companyName=tab.querySelector('.company-dropdown').value;
    if(!companyName){alert('기업을 선택해주세요.');return;}
    const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const companyData=companies.find(c=>c.name===companyName);
    const rev=companyData.revenueData||{y23:0,y24:0,y25:0,cur:0};
    const fRev=formatRevenueForAI(companyData,rev);
    document.getElementById('ai-loading-overlay').style.display='flex';
    // ★ 방안B: 기업전달용/컨설턴트용 완전히 다른 프롬프트 사용 ★
    const prompt = version === 'client'
        ? buildMgmtClientPrompt(companyData, fRev)
        : buildMgmtConsultantPrompt(companyData, fRev);
    const aiResponse=await callGeminiAPI(prompt);
    document.getElementById('ai-loading-overlay').style.display='none';
    if(aiResponse){
        let cleanHTML=cleanAIResponse(aiResponse);
        const todayStr=new Date().toISOString().split('T')[0];
        const reportObj={id:'rep_'+Date.now(),type:'경영진단',company:companyData.name,title:`AI 경영진단보고서 (${version==='client'?'기업전달용':'컨설턴트용'})`,date:todayStr,content:cleanHTML,version,revenueData:rev,reportType:'management'};
        const reports=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');reports.push(reportObj);localStorage.setItem(DB_REPORTS,JSON.stringify(reports));
        updateDataLists();
        tab.querySelector('[id$="-input-step"]').style.display='none';
        tab.querySelector('[id$="-result-step"]').style.display='block';
        renderManagementReport(companyData,cleanHTML,version,rev,todayStr);
    }
};

const REPORT_CONFIGS={
    finance:{typeLabel:'재무진단',title:'AI 상세 재무진단',reportKind:'AI 상세 재무진단 리포트',borderColor:'#2563eb',contentAreaId:'finance-content-area',buildPrompt:(cData,fRev,version)=>`너는 공인회계사급 재무 전문 컨설턴트야. 대상: '${cData.name}'\n5개섹션: 1.재무개요(3~4) 2.수익성분석(5~6) 3.안정성분석(5~6) 4.성장성분석(4~5) 5.재무개선방향(5~6)\n${COMMON_RULES}출력목적: ${version==='client'?'기업전달용':'컨설턴트용'}\n[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`},
    aiBiz:{typeLabel:'사업계획서',title:'AI 사업계획서',reportKind:'AI 맞춤형 사업계획서',borderColor:'#16a34a',contentAreaId:'aiBiz-content-area',
        buildPrompt:(cData,fRev,version)=>{
const needFundStr = cData.needFund>0 ? formatKoreanCurrency(cData.needFund) : '미입력';
const fundPlanStr = cData.fundPlan || '별도 입력 없음';
/* ★ 초안(draft): 3섹션, 빠른 방향 확인용 ★ */
if(version==='draft')return `너는 20년 경력의 경영컨설턴트야. 대상: '${cData.name}' (업종:${cData.industry||'-'}, 대표:${cData.rep||'-'})

★ 사업계획서 초안 - 3개 섹션을 빠르게 작성할 것 ★
방향 확인용 초안이므로 핵심만 간결하게 작성. 각 섹션 li 4~5개.

[출력 규칙]
- 각 섹션은 반드시 <div class="report-section-box"> 로 시작하고 </div>로 닫을 것
- 제목은 <h3>번호. 제목</h3>, 내용은 <ul><li>항목(최소 40자)</li></ul>
- 금액은 한국식(억원/만원), 개조식 문체, 인사말 금지, ** 금지

=== 섹션 1: 사업 개요 및 핵심 아이디어 ===
<div class="report-section-box"><h3>1. 사업 개요 및 핵심 아이디어</h3>
<table class="biz-info-table"><tr><th>기업명</th><td>${cData.name}</td><th>대표자</th><td>${cData.rep||'-'}</td></tr><tr><th>업종</th><td>${cData.industry||'-'}</td><th>핵심아이템</th><td>${cData.coreItem||'-'}</td></tr></table>
<ul><li>사업의 핵심 아이디어, 차별점, 가치 제안 li 5개, 각 40자 이상</li></ul></div>

=== 섹션 2: 시장 분석 및 사업 방향 ===
<div class="report-section-box"><h3>2. 시장 분석 및 사업 방향</h3>
<ul><li>타겟 시장 규모, 경쟁 환경, 진입 전략 li 5개, 각 40자 이상</li></ul></div>

=== 섹션 3: 초기 실행 계획 ===
<div class="report-section-box"><h3>3. 초기 실행 계획</h3>
<ul><li>단기 실행 과제, 필요 자원, 예상 성과 li 5개, 각 40자 이상. 필요자금: ${needFundStr}</li></ul></div>

[기업 데이터]
${JSON.stringify({name:cData.name,rep:cData.rep,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,필요자금:needFundStr,매출데이터:fRev},null,2)}`;
/* ★ 완성본(final): 10섹션, 실제 제출 가능한 수준 ★ */
return `너는 20년 경력의 경영컨설턴트야. 대상: '${cData.name}' (업종:${cData.industry||'-'}, 대표:${cData.rep||'-'}, 핵심아이템:${cData.coreItem||'-'})

★ 반드시 아래 10개 섹션을 모두 빠짐없이 작성할 것. 섹션을 건너뛰거나 생략하지 말 것. ★

[출력 규칙]
- 각 섹션은 반드시 <div class="report-section-box"> 로 시작하고 </div>로 닫을 것
- 섹션 제목은 <h3>번호. 제목</h3>
- 리스트는 <ul><li>내용(최소 40자)</li></ul>, 표는 지정 class 사용
- 금액은 한국식(억원/만원), 개조식 문체(~함, ~임), 인사말 금지, ** 금지

=== 섹션 1: 기업현황분석 ===
<div class="report-section-box"><h3>1. 기업현황분석</h3>
<table class="biz-info-table"><tr><th>기업명</th><td>${cData.name}</td><th>대표자</th><td>${cData.rep||'-'}</td></tr><tr><th>업종</th><td>${cData.industry||'-'}</td><th>설립일</th><td>${cData.bizDate||'-'}</td></tr><tr><th>상시근로자</th><td>${cData.empCount||'-'}명</td><th>핵심아이템</th><td>${cData.coreItem||'-'}</td></tr></table>
<ul><li>기업현황 분석 내용 li 5개, 매출트렌드·성과·시장포지션 포함</li></ul></div>

=== 섹션 2: SWOT 분석 ===
<div class="report-section-box"><h3>2. SWOT 분석</h3>
<div class="swot-grid">
<div class="swot-item swot-s"><div class="swot-label">💪 S 강점 (Strength)</div><ul><li>강점 li 4개</li></ul></div>
<div class="swot-item swot-w"><div class="swot-label">⚠️ W 약점 (Weakness)</div><ul><li>약점 li 3개</li></ul></div>
<div class="swot-item swot-o"><div class="swot-label">🚀 O 기회 (Opportunity)</div><ul><li>기회 li 4개</li></ul></div>
<div class="swot-item swot-t"><div class="swot-label">🛡️ T 위협 (Threat)</div><ul><li>위협 li 3개</li></ul></div>
</div></div>

=== 섹션 3: 시장현황 ===
<div class="report-section-box"><h3>3. 시장현황</h3>
<ul><li>시장규모·트렌드·성장성 li 5개</li></ul></div>

=== 섹션 4: 경쟁력분석 ===
<div class="report-section-box"><h3>4. 경쟁력분석</h3>
<ul><li>경쟁력 분석 li 4개</li></ul>
<table class="competitor-table"><thead><tr><th>비교 항목</th><th>${cData.name}</th><th>경쟁사 A</th><th>경쟁사 B</th></tr></thead>
<tbody><tr><td>제품 경쟁력</td><td>★★★★★</td><td>★★★★</td><td>★★★</td></tr>
[가격경쟁력·기술력·브랜드인지도·유통망·고객서비스·성장성 추가로 6행 더]
</tbody></table></div>

=== 섹션 5: 차별점 및 핵심경쟁력 ===
<div class="report-section-box"><h3>5. 차별점 및 핵심경쟁력</h3>
<ul><li>차별점·핵심경쟁력 li 5개, 구체적 근거 포함</li></ul></div>

=== 섹션 6: 가점추천 ===
<div class="report-section-box"><h3>6. 가점추천: 한도 확대를 위한 추천 인증 및 교육</h3>
<ul><li>[인증명]: 취득시 [기관] 정책자금 최대 [금액] 추가한도 가능 - 형식으로 5개 이상. 벤처인증·이노비즈·메인비즈·ISO·연구소·경영혁신형 포함</li></ul></div>

=== 섹션 7: 자금사용계획 ===
[주의] 총 필요자금=${needFundStr}, 업체자금계획="${fundPlanStr}"
이 금액 안에서 항목별 배분. 금액은 한국식(억원/만원)으로 표기.
<div class="report-section-box"><h3>7. 자금사용계획</h3>
<table class="fund-plan-table"><thead><tr><th>항목</th><th>금액</th><th>비율</th><th>사용 목적</th></tr></thead>
<tbody>[운전자금·시설자금·인건비·마케팅비·연구개발비·기타 6~8행]</tbody>
<tfoot><tr><td>합계</td><td>${needFundStr}</td><td>100%</td><td>-</td></tr></tfoot></table>
<ul><li>자금 집행 전략 li 3개</li></ul></div>

=== 섹션 8: 매출 추이 및 1년 전망 ===
<div class="report-section-box"><h3>8. 매출 추이 및 1년 전망</h3>
<div class="biz-chart-section"><div class="biz-chart-title">「1년 전망」</div><div id="biz-monthly-chart-wrap"><canvas id="biz-monthly-chart"></canvas></div></div>
<div class="growth-phases">
<div class="growth-phase phase-short"><div class="phase-header">⚡ 단기 (1년 이내)</div><ul><li>단기 목표 li 4개, 업체 입력 계획 기반</li></ul></div>
<div class="growth-phase phase-mid"><div class="phase-header">📈 중기 (3년 이내)</div><ul><li>중기 목표 li 4개</li></ul></div>
<div class="growth-phase phase-long"><div class="phase-header">🌟 장기 (5년 이후)</div><ul><li>장기 목표 li 4개</li></ul></div>
</div></div>

=== 섹션 9: 성장비전 ===
<div class="report-section-box"><h3>9. 성장비전</h3>
<ul><li>발전가능성·비전·향후계획 li 5개, 업체 입력 내용 기반 구체적으로</li></ul></div>

=== 섹션 10: 마무리 ===
<div class="report-section-box biz-closing"><h3>10. 마무리</h3>
<p>마무리 문장 4~5문장. 반드시 '~있음' 형식으로 간결하게 마무리.</p></div>

[기업 데이터]
${JSON.stringify({name:cData.name,rep:cData.rep,industry:cData.industry,bizDate:cData.bizDate,empCount:cData.empCount,coreItem:cData.coreItem,bizNum:cData.bizNum,필요자금:needFundStr,자금사용계획:fundPlanStr,매출데이터:fRev},null,2)}`;
        }},
    aiFund:{typeLabel:'정책자금매칭',title:'AI 정책자금매칭',reportKind:'AI 정책자금 매칭 리포트',borderColor:'#ea580c',contentAreaId:'aiFund-content-area',buildPrompt:(cData,fRev,version)=>`너는 중소기업 정책자금 전문 컨설턴트야. 대상: '${cData.name}'\n5개섹션: 1.기업자격요건분석(4~5) 2.자금필요성(3~4) 3.추천정책자금TOP5(각3~4줄) 4.기관별신청전략(5~6) 5.신청준비체크리스트(6~8)\n${COMMON_RULES}출력목적: ${version==='client'?'기업전달용':'컨설턴트용'}\n[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`},
    aiTrade:{typeLabel:'상권분석',title:'AI 상권분석 리포트',reportKind:'AI 빅데이터 상권분석',borderColor:'#0d9488',contentAreaId:'aiTrade-content-area',buildPrompt:(cData,fRev,version)=>`너는 상권분석 전문 컨설턴트야. 대상: '${cData.name}' (업종:${cData.industry||'미입력'})\n5개섹션: 1.상권개요및입지분석(4~5) 2.유동인구및타겟(5~6) 3.경쟁현황및포지셔닝(5~6) 4.상권성장성및리스크(4~5) 5.매출예측및운영전략(5~6)\n${COMMON_RULES}출력목적: ${version==='client'?'기업전달용':'컨설턴트용'}\n[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`},
    aiMarketing:{typeLabel:'마케팅제안',title:'AI 마케팅 제안서',reportKind:'AI 맞춤형 마케팅 제안서',borderColor:'#db2777',contentAreaId:'aiMarketing-content-area',buildPrompt:(cData,fRev,version)=>`너는 디지털 마케팅 전문 컨설턴트야. 대상: '${cData.name}'\n6개섹션: 1.마케팅현황진단(4~5) 2.타겟고객설정(5~6) 3.채널별마케팅전략(6~8) 4.콘텐츠및브랜딩전략(5~6) 5.마케팅예산계획(4~5) 6.월별실행로드맵(6항목)\n${COMMON_RULES}출력목적: ${version==='client'?'기업전달용':'컨설턴트용'}\n[기업데이터] ${JSON.stringify({...cData,rawData:undefined,revenueData:undefined,매출데이터:fRev},null,2)}`}
};

/* =========================================================
   ★ 사업계획서 전용 렌더링 (가로형 + 월별 차트)
========================================================= */
function setupMonthlyChart(el, rev) {
    if (!el) return;
    const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    const curMonth = new Date().getMonth(); // 0-indexed (현재월 index)
    const avgMonthly = rev.cur && curMonth > 0
        ? Math.round(rev.cur / curMonth)
        : rev.y25 ? Math.round(rev.y25 / 12) : 3000;

    const actual = [], forecast = [];
    for (let i = 0; i < 12; i++) {
        if (i < curMonth) {
            actual.push(Math.round(avgMonthly * (0.88 + i * 0.025)));
            forecast.push(null);
        } else {
            actual.push(null);
            forecast.push(Math.round(avgMonthly * Math.pow(1.05, i - curMonth + 1)));
        }
    }
    new Chart(el.getContext('2d'), {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: '실적', data: actual, backgroundColor: 'rgba(22,163,74,0.7)', borderColor: '#16a34a', borderWidth: 1, borderRadius: 4 },
                { label: '예측', data: forecast, backgroundColor: 'rgba(59,130,246,0.45)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'top', labels: { font: { size: 11 } } } },
            scales: { y: { ticks: { callback: v => v >= 10000 ? Math.floor(v/10000) + '억' : Math.round(v/1000) + '천만' } } }
        }
    });
}

function renderBizReport(companyData, cleanHTML, rev, dateStr) {
    _currentReport = { company: companyData.name, type: 'AI 사업계획서', contentAreaId: 'aiBiz-content-area', landscape: true };
    const safeRev = rev || {};
    const coverCfg = { title: 'AI 사업계획서', reportKind: 'AI 맞춤형 사업계획서', version: 'client', borderColor: '#16a34a' };
    const contentArea = document.getElementById('aiBiz-content-area');
    contentArea.innerHTML = `<div class="paper-inner">${buildCoverHTML(companyData, coverCfg, safeRev, dateStr)}${cleanHTML}</div>`;
    setTimeout(() => setupMonthlyChart(document.getElementById('biz-monthly-chart'), safeRev), 150);
}

window.generateAnyReport=async function(type,version,event){
    const tab=event.target.closest('.tab-content');
    const companyName=tab.querySelector('.company-dropdown').value;
    if(!companyName){alert('기업을 선택해주세요.');return;}
    const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const companyData=companies.find(c=>c.name===companyName);
    const rev=companyData.revenueData||{y23:0,y24:0,y25:0,cur:0};
    const fRev=formatRevenueForAI(companyData,rev);
    const cfg=REPORT_CONFIGS[type];if(!cfg)return;
    document.getElementById('ai-loading-overlay').style.display='flex';
    // ★ 사업계획서는 고토큰(65536) API 사용 ★
    const apiCall = type === 'aiBiz' ? callGeminiAPIBiz : callGeminiAPI;
    const aiResponse=await apiCall(cfg.buildPrompt(companyData,fRev,version));
    document.getElementById('ai-loading-overlay').style.display='none';
    if(aiResponse){
        let cleanHTML=cleanAIResponse(aiResponse);
        const todayStr=new Date().toISOString().split('T')[0];
        // ★ 사업계획서: draft=초안, final=완성본 / 기타: client=기업전달용, consultant=컨설턴트용
        let vLabel;
        if(type==='aiBiz') vLabel = version==='draft' ? '초안' : '완성본';
        else vLabel = version==='client' ? '기업전달용' : '컨설턴트용';
        const reportObj={id:'rep_'+Date.now(),type:cfg.typeLabel,company:companyData.name,title:`${cfg.title} (${vLabel})`,date:todayStr,content:cleanHTML,version,revenueData:rev,reportType:type,contentAreaId:cfg.contentAreaId};
        const reports=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]');reports.push(reportObj);localStorage.setItem(DB_REPORTS,JSON.stringify(reports));
        updateDataLists();
        tab.querySelector('[id$="-input-step"]').style.display='none';
        tab.querySelector('[id$="-result-step"]').style.display='block';
        if (type === 'aiBiz') {
            renderBizReport(companyData, cleanHTML, rev, todayStr);
        } else {
            renderGenericReport(cfg.contentAreaId,companyData,cleanHTML,{...cfg,version},rev,todayStr);
        }
    }
};

window.viewReport=function(id){
    const r=JSON.parse(localStorage.getItem(DB_REPORTS)||'[]').find(x=>x.id===id);if(!r)return;
    const companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const companyData=companies.find(c=>c.name===r.company)||{name:r.company};
    const rev=r.revenueData||{cur:0,y25:0,y24:0,y23:0};
    const type=r.reportType||'management';
    if(type==='management'){
        showTab('report');
        document.getElementById('report-input-step').style.display='none';
        document.getElementById('report-result-step').style.display='block';
        renderManagementReport(companyData,r.content,r.version,rev,r.date);
    }else if(type==='aiBiz'){
        showTab('aiBiz');
        document.getElementById('aiBiz-input-step').style.display='none';
        document.getElementById('aiBiz-result-step').style.display='block';
        renderBizReport(companyData,r.content,rev,r.date);
    }else{
        const cfg=REPORT_CONFIGS[type];if(!cfg)return;
        const tabId=cfg.contentAreaId.replace('-content-area','');
        showTab(tabId);
        document.getElementById(tabId+'-input-step').style.display='none';
        document.getElementById(tabId+'-result-step').style.display='block';
        renderGenericReport(cfg.contentAreaId,companyData,r.content,{...cfg,version:r.version},rev,r.date);
    }
};

window.backToInput=function(tab){
    document.getElementById(tab+'-input-step').style.display='block';
    document.getElementById(tab+'-result-step').style.display='none';
};
