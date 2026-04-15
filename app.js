// 업체 정보를 담을 로컬 저장소 키
const STORAGE_KEY = 'biz_consult_companies';
const REPORT_KEY = 'biz_consult_reports';

document.addEventListener("DOMContentLoaded", function() {
    // 1. 초기 탭 설정
    const urlParams = new URLSearchParams(window.location.search);
    showTab(urlParams.get('tab') || 'dashboard', false);

    // 2. 드롭다운 및 목록 초기화
    updateCompanyLists();

    // 3. 기존 입력 핸들러 (하이픈, 콤마 등) 유지
    initInputHandlers();
});

// 모든 리포트 탭의 드롭다운을 최신 데이터로 업데이트
function updateCompanyLists() {
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const dropdowns = document.querySelectorAll('.company-dropdown');
    
    dropdowns.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">업체를 선택하세요</option>';
        companies.forEach(comp => {
            const option = document.createElement('option');
            option.value = comp.name;
            option.textContent = comp.name;
            select.appendChild(option);
        });
        select.value = currentValue;
    });

    // 업체 목록 테이블 업데이트
    const listBody = document.getElementById('company-list-body');
    if (listBody) {
        if (companies.length === 0) {
            listBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #94a3b8;">등록된 업체가 없습니다.</td></tr>';
        } else {
            listBody.innerHTML = companies.map(comp => `
                <tr>
                    <td><strong>${comp.name}</strong></td>
                    <td>${comp.bizNum}</td>
                    <td>${comp.industry}</td>
                    <td>${comp.date}</td>
                    <td><button class="btn-small-outline" onclick="showTab('company')">상세보기</button></td>
                </tr>
            `).join('');
        }
    }
}

// 업체 정보 저장 로직
function saveCompanyData() {
    const name = document.getElementById('comp_name').value;
    const bizNum = document.getElementById('biz_number').value;
    const industry = document.getElementById('comp_industry').value;
    
    if (!name) { alert('상호명을 입력해주세요.'); return; }

    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newCompany = {
        name: name,
        bizNum: bizNum,
        industry: industry,
        date: new Date().toISOString().split('T')[0]
    };

    // 중복 체크 후 업데이트 또는 추가
    const existingIdx = companies.findIndex(c => c.name === name);
    if (existingIdx > -1) companies[existingIdx] = newCompany;
    else companies.push(newCompany);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    alert('업체 정보가 안전하게 저장되었습니다.');
    
    updateCompanyLists();
    showTab('reportList');
}

// 리포트 생성 시뮬레이션
function generateReport(type, version) {
    const select = document.getElementById('report-company-select');
    const companyName = select.value;

    if (!companyName) { alert('분석할 업체를 먼저 선택해주세요.'); return; }

    // 생성 로딩 효과 (임시)
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "AI 분석 중...";
    btn.disabled = true;

    setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
        
        // 뷰 전환
        document.getElementById('report-input-step').style.display = 'none';
        document.getElementById('report-result-step').style.display = 'block';

        // 내용 채우기
        renderReportContent(companyName);
    }, 1500);
}

// 리포트 내용 렌더링 (PDF 기반 데이터 활용)
function renderReportContent(name) {
    const area = document.getElementById('report-content-area');
    
    // 주식회사 진에프앤비 데이터 (Source 1-245 활용)
    if (name.includes('진에프앤비')) {
        area.innerHTML = `
            <div class="paper-inner">
                <h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">경영진단보고서</h1>
                <table class="simple-table" style="margin-bottom: 40px;">
                    <tr><th>기업명</th><td>주식회사 진에프앤비</td><th>업종</th><td>제조업</td></tr>
                    <tr><th>대표자</th><td>김서진</td><th>작성일</th><td>2026-04-15</td></tr>
                </table>
                <h3>1. 경영진단 개요</h3>
                <p>본 기업은 2025년 9월 사업을 개시한 신생 법인으로 홍게 양념게장 등 수산물 밀키트를 온라인 유통하고 있습니다. [cite: 16, 17]</p>
                <h3>2. 재무 현황 분석</h3>
                <p>2025년 매출액 3.4억 원을 달성하였으며, 2026년 예상 매출액은 약 8.8억 원으로 가파른 성장세를 보이고 있습니다. [cite: 13, 61]</p>
                <div class="alert-box blue">전략 제언: 급격한 매출 성장에 따른 운전자본 확보를 위해 약 4억 원 규모의 정책자금 조달이 필요합니다. [cite: 66, 72]</div>
                <h3>3. 핵심 리스크</h3>
                <p>현재 4명의 인력으로 늘어나는 온라인 주문량과 생산량을 감당하기에 운영 리스크가 존재합니다. [cite: 154, 155]</p>
            </div>
        `;
    } 
    // 주식회사 대박컴퍼니 데이터 (Source 354-640 활용)
    else if (name.includes('대박컴퍼니')) {
        area.innerHTML = `
            <div class="paper-inner">
                <h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">경영진단보고서</h1>
                <table class="simple-table">
                    <tr><th>기업명</th><td>주식회사 대박컴퍼니</td><th>업종</th><td>제조업 (돈육 코인육수)</td></tr>
                    <tr><th>대표자</th><td>오가은</td><th>작성일</th><td>2026-04-15</td></tr>
                </table>
                <h3>1. 진단 요약</h3>
                <p>창업 1년 만에 13억 원 이상의 매출을 달성한 고성장 초기 기업으로, 독점적인 코인육수 제조 기술력을 보유하고 있습니다. [cite: 419, 633]</p>
                <h3>2. 기술 및 경쟁력</h3>
                <p>현재 특허 1건 보유 및 추가 1건 출원 중으로, 온라인 전용 유통 전략을 통해 효율적인 마진 구조를 형성하고 있습니다. [cite: 451, 455]</p>
                <div class="alert-box green">강점: 대표자의 풍부한 외식업 경력과 우수한 신용도(740점)는 향후 투자 유치에 매우 유리합니다. [cite: 434, 456]</div>
            </div>
        `;
    } 
    // 기타 일반 업체
    else {
        area.innerHTML = `<div style="text-align:center; padding: 100px 0;"><p>해당 업체의 기초 데이터가 부족하여 AI 분석 초안을 구성 중입니다.</p></div>`;
    }
}

function backToInput(tab) {
    document.getElementById(tab + '-input-step').style.display = 'block';
    document.getElementById(tab + '-result-step').style.display = 'none';
}

// 탭 전환 (기존 코드 유지 및 확장)
function showTab(tabId, updateUrl = true) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.menu li').forEach(item => item.classList.remove('active'));

    const selectedTab = document.getElementById(tabId);
    if(selectedTab) selectedTab.classList.add('active');
    const selectedMenu = document.getElementById('menu-' + tabId);
    if(selectedMenu) selectedMenu.classList.add('active');

    if (updateUrl) history.pushState(null, '', `?tab=${tabId}`);
    
    // 업체 목록 탭으로 갈 때마다 리스트 갱신
    if (tabId === 'reportList') updateCompanyLists();
}

function initInputHandlers() {
    // 하이픈, 콤마 등 기존 UX 로직들 여기에 포함
}
