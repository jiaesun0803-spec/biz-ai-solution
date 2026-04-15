document.addEventListener("DOMContentLoaded", function() {
    // 1. URL 연동
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') || 'dashboard';
    showTab(tabParam, false);

    // 2. 숫자만 입력
    document.querySelectorAll('.number-only').forEach(input => {
        input.addEventListener('input', function() { this.value = this.value.replace(/[^0-9]/g, ''); });
    });

    // 3. 금액 콤마 포맷
    document.querySelectorAll('.money-format').forEach(input => {
        input.addEventListener('input', function() {
            let val = this.value.replace(/[^0-9\-]/g, ''); 
            this.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        });
    });

    // 4. 부채 실시간 합계
    document.querySelectorAll('.debt-input').forEach(input => {
        input.addEventListener('input', calculateTotalDebt);
    });

    // 5. 자동 하이픈 (사업자번호)
    const bizNumber = document.getElementById('biz_number');
    if(bizNumber) bizNumber.addEventListener('input', function() {
        let val = this.value.replace(/[^0-9]/g, '');
        if (val.length < 4) this.value = val;
        else if (val.length < 6) this.value = val.slice(0,3) + '-' + val.slice(3);
        else this.value = val.slice(0,3) + '-' + val.slice(3,5) + '-' + val.slice(5,10);
    });

    // 6. 자동 하이픈 (법인번호)
    const corpNumber = document.getElementById('corp_number');
    if(corpNumber) corpNumber.addEventListener('input', function() {
        let val = this.value.replace(/[^0-9]/g, '');
        if (val.length < 7) this.value = val;
        else this.value = val.slice(0,6) + '-' + val.slice(6,13);
    });

    // 7. 자동 하이픈 (날짜)
    const dateInputs = ['biz_date', 'rep_birth', 'write_date'];
    dateInputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', function() {
            let val = this.value.replace(/[^0-9]/g, '');
            if (val.length < 5) this.value = val;
            else if (val.length < 7) this.value = val.slice(0,4) + '-' + val.slice(4);
            else this.value = val.slice(0,4) + '-' + val.slice(4,6) + '-' + val.slice(6,8);
        });
    });

    // 8. 자동 하이픈 (전화번호)
    const phoneInputs = ['biz_phone', 'rep_phone'];
    phoneInputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', function() {
            let val = this.value.replace(/[^0-9]/g, '');
            let res = '';
            if(val.startsWith('02')) { 
                if(val.length < 3) res = val; else if(val.length < 6) res = val.slice(0,2) + '-' + val.slice(2); else if(val.length < 10) res = val.slice(0,2) + '-' + val.slice(2,5) + '-' + val.slice(5); else res = val.slice(0,2) + '-' + val.slice(2,6) + '-' + val.slice(6,10);
            } else {
                if(val.length < 4) res = val; else if(val.length < 7) res = val.slice(0,3) + '-' + val.slice(3); else if(val.length < 11) res = val.slice(0,3) + '-' + val.slice(3,6) + '-' + val.slice(6); else res = val.slice(0,3) + '-' + val.slice(3,7) + '-' + val.slice(7,11);
            }
            this.value = res;
        });
    });

    // 9. 시뮬레이터 슬라이더 연동
    const sliderScore = document.getElementById('slider-score');
    const valScore = document.getElementById('val-score');
    if(sliderScore) sliderScore.addEventListener('input', function() { valScore.innerText = this.value + "점"; });

    const sliderSales = document.getElementById('slider-sales');
    const valSales = document.getElementById('val-sales');
    if(sliderSales) sliderSales.addEventListener('input', function() {
        let val = parseInt(this.value);
        if (val === 0) valSales.innerText = "0원"; else if (val < 10) valSales.innerText = val + "억원"; else valSales.innerText = (val * 10) + "억원";
    });

    // 10. 상세 재무진단 탭 자동 계산 로직
    document.querySelectorAll('.fin-input').forEach(input => {
        input.addEventListener('input', function() { calcFinance('1'); calcFinance('2'); });
    });
});

// 재무 지표 자동 계산 함수
function calcFinance(idx) {
    const ca = parseFloat(document.getElementById('ca_' + idx).value.replace(/,/g, '')) || 0;
    const cl = parseFloat(document.getElementById('cl_' + idx).value.replace(/,/g, '')) || 0;
    const cap = parseFloat(document.getElementById('cap_' + idx).value.replace(/,/g, '')) || 0;
    const eq = parseFloat(document.getElementById('eq_' + idx).value.replace(/,/g, '')) || 0;
    const resLiq = document.getElementById('res_liq_' + idx);
    const resImp = document.getElementById('res_imp_' + idx);

    if (cl > 0) {
        let liqRatio = (ca / cl) * 100;
        resLiq.innerText = liqRatio.toFixed(1) + " %";
        resLiq.style.color = liqRatio >= 150 ? "#10b981" : (liqRatio < 100 ? "#ef4444" : "#f59e0b");
    } else { resLiq.innerText = "- %"; resLiq.style.color = "#64748b"; }

    if (cap > 0) {
        if (eq < 0) { resImp.innerText = "완전 자본잠식"; resImp.style.color = "#ef4444"; } 
        else {
            let impRatio = ((cap - eq) / cap) * 100;
            resImp.innerText = impRatio <= 0 ? "정상" : "부분 잠식 (" + impRatio.toFixed(1) + "%)";
            resImp.style.color = impRatio <= 0 ? "#10b981" : "#f59e0b";
        }
    } else { resImp.innerText = "- %"; resImp.style.color = "#64748b"; }
}

// 탭 전환
function showTab(tabId, updateUrl = true) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    const menuItems = document.querySelectorAll('.menu li, .bottom-menu li');
    menuItems.forEach(item => item.classList.remove('active'));
    const selectedTab = document.getElementById(tabId);
    if(selectedTab) selectedTab.classList.add('active');
    const selectedMenu = document.getElementById('menu-' + tabId);
    if(selectedMenu) selectedMenu.classList.add('active');
    if (updateUrl) {
        const newUrl = window.location.pathname + '?tab=' + tabId;
        window.history.pushState({path: newUrl}, '', newUrl);
    }
}

window.addEventListener('popstate', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') || 'dashboard';
    showTab(tabParam, false);
});

// ★ [신규] '기존 업체 불러오기' 클릭 시 가짜 데이터(Mock Data) 자동 채우기 ★
function loadCompanyData() {
    // 확인 메시지
    alert('테스트용 데이터(주식회사 대박컴퍼니)를 불러옵니다.');

    // 1. 기업 기본 정보
    document.querySelector('input[placeholder="상호명을 입력하세요"]').value = "주식회사 대박컴퍼니";
    document.querySelector('input[value="법인"]').checked = true;
    document.getElementById('biz_number').value = "732-86-03582";
    document.getElementById('corp_number').value = "170111-0974982";
    document.getElementById('corp_number').disabled = false;
    document.querySelector('select').value = "제조업"; // 업종
    document.getElementById('biz_date').value = "2023-01-15";
    document.getElementById('biz_phone').value = "053-123-4567";
    document.querySelector('input[placeholder="명 (4대보험 가입 기준)"]').value = "4";
    document.querySelector('input[value="임대"]').checked = true; // 사업장 주소 임대 선택
    document.querySelector('input[placeholder="상세 주소를 입력하세요"]').value = "대구 달성군 화원읍 비슬로 479길 10";
    document.getElementById('rent_deposit').value = "5,000";
    document.getElementById('rent_monthly').value = "200";

    // 2. 대표자 정보
    document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0].value = "오가은";
    document.getElementById('rep_birth').value = "1985-05-20";
    document.querySelectorAll('input[name="home_rent"]')[0].checked = true; // 거주지 자가 선택
    document.querySelectorAll('input[placeholder="상세 주소를 입력하세요"]')[1].value = "대구 수성구 달구벌대로 123";
    document.getElementById('rep_phone').value = "010-1234-5678";
    document.querySelectorAll('select')[1].value = "대졸"; // 최종학력
    document.querySelector('input[placeholder="전공분야"]').value = "식품공학";

    // 3. 신용정보
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes[4].checked = true; // 통신사 SKT
    checkboxes[8].checked = true; // 금융연체 없음
    checkboxes[10].checked = true; // 세금체납 없음
    const numberInputs = document.querySelectorAll('.number-only');
    numberInputs[1].value = "710"; // KCB
    numberInputs[2].value = "740"; // NICE

    // 4. 경력사항
    const inputRows = document.querySelectorAll('.input-row input[type="text"]');
    inputRows[6].value = "2015.03~2022.12"; // 경력 기간 1
    inputRows[7].value = "유명 외식 프랜차이즈 R&D 팀장"; // 경력 내용 1

    // 5. 매출현황
    const moneyInputs = document.querySelectorAll('.money-format');
    moneyInputs[2].value = "11,000"; // 금년매출 (예: 1억 1천만)
    moneyInputs[3].value = "138,000"; // 25년도
    moneyInputs[4].value = "114,000"; // 24년도
    moneyInputs[5].value = "0"; // 23년도
    document.querySelector('input[value="계획없음"]').checked = true; // 수출여부

    // 6. 부채현황
    const debtInputs = document.querySelectorAll('.debt-input');
    debtInputs[0].value = "20,000"; // 중진공 2억
    debtInputs[3].value = "10,000"; // 기보 1억
    debtInputs[4].value = "7,000";  // 재단 7천만
    calculateTotalDebt(); // 합계 자동 계산 실행

    // 7. 보유 인증
    // 이노비즈(12), 벤처기업(14)
    checkboxes[14].checked = true; // 벤처기업 선택

    // 8. 비즈니스 상세 정보
    const textareas = document.querySelectorAll('textarea');
    textareas[0].value = "돼지 사골을 농축·압축한 코인 형태의 간편 육수. 물에 넣기만 하면 90초 이내에 깊은 국물 맛 완성.";
    textareas[1].value = "1~2인 가구 증가 및 집밥 문화 정착으로 HMR(가정간편식) 육수 시장 급성장 중.";
    textareas[2].value = "현재 자사몰 및 스마트스토어 중심 온라인 판매.";
    textareas[3].value = "개별 포장된 코인육수 세트 판매 (B2C 중심, 향후 식당용 B2B 납품 계획).";
    textareas[4].value = "경쟁사 대비 돈육 특화로 차별화된 맛. 특허 출원 준비 중인 독점 기술력 확보.";
    textareas[5].value = "온라인 판매 채널 확장 및 생산 설비 2배 확충(정책자금 4억 조달 예정).";

    // 9. 컨설턴트 메모
    textareas[6].value = "매출 성장세가 매우 가파르나, 현재 부채가 전액 정책자금(3.7억)으로 구성되어 추가 조달 시 한도 심사가 깐깐할 수 있음. 벤처인증과 특허를 무기로 기보/중진공 어필 필요.";
    document.getElementById('write_date').value = "2026-04-15";
}

// 폼 잠금 관련 함수 (기존 동일)
function toggleCorpNumber() {
    const radios = document.getElementsByName('biz_type');
    const corpInput = document.getElementById('corp_number');
    let selectedValue = "";
    radios.forEach(r => { if(r.checked) selectedValue = r.value; });
    corpInput.disabled = selectedValue === '개인';
    if (selectedValue === '개인') corpInput.value = "";
}

function toggleRentInputs() {
    const radios = document.getElementsByName('rent_type');
    const depositInput = document.getElementById('rent_deposit');
    const monthlyInput = document.getElementById('rent_monthly');
    let selectedValue = "";
    radios.forEach(r => { if(r.checked) selectedValue = r.value; });
    depositInput.disabled = monthlyInput.disabled = selectedValue === '자가';
    if (selectedValue === '자가') depositInput.value = monthlyInput.value = "";
}

function toggleExportInputs() {
    const radios = document.getElementsByName('export');
    const exportInputs = document.querySelectorAll('.export-money');
    let selectedValue = "";
    radios.forEach(r => { if(r.checked) selectedValue = r.value; });
    exportInputs.forEach(input => { input.disabled = selectedValue !== '수출중'; if(selectedValue !== '수출중') input.value = ""; });
}

function calculateTotalDebt() {
    const debtInputs = document.querySelectorAll('.debt-input');
    let total = 0;
    debtInputs.forEach(input => {
        let numVal = parseInt(input.value.replace(/,/g, ''), 10);
        if (!isNaN(numVal)) total += numVal;
    });
    document.getElementById('total-debt').innerText = total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function saveCompanyData() { alert('업체 정보가 성공적으로 저장되었습니다!'); showTab('reportList'); }
