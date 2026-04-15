document.addEventListener("DOMContentLoaded", function() {
    // 1. URL 파라미터 확인 후 해당 탭 열기 (주소창 연동)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') || 'dashboard';
    showTab(tabParam, false);

    // 2. 숫자만 입력되게 강제 로직
    const numberInputs = document.querySelectorAll('.number-only');
    numberInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    });

    // 3. 금액에 세자리마다 콤마(,) 찍어주는 로직 (.money-format)
    const moneyInputs = document.querySelectorAll('.money-format');
    moneyInputs.forEach(input => {
        input.addEventListener('input', function() {
            let value = this.value.replace(/[^0-9]/g, '');
            this.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        });
    });

    // 4. 부채 입력 시 실시간 합계 계산
    const debtInputs = document.querySelectorAll('.debt-input');
    debtInputs.forEach(input => {
        input.addEventListener('input', calculateTotalDebt);
    });
});

// 탭 전환 함수
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

// 브라우저 뒤로가기 버튼 연동
window.addEventListener('popstate', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') || 'dashboard';
    showTab(tabParam, false);
});

// 개인/법인 사업자 선택 시 법인등록번호 칸 잠금
function toggleCorpNumber() {
    const radios = document.getElementsByName('biz_type');
    const corpInput = document.getElementById('corp_number');
    let selectedValue = "";

    radios.forEach(r => { if(r.checked) selectedValue = r.value; });

    if (selectedValue === '개인') {
        corpInput.value = "";
        corpInput.disabled = true;
    } else {
        corpInput.disabled = false;
    }
}

// 자가 선택 시 보증금, 월임대료 잠금 로직
function toggleRentInputs() {
    const radios = document.getElementsByName('rent_type');
    const depositInput = document.getElementById('rent_deposit');
    const monthlyInput = document.getElementById('rent_monthly');
    let selectedValue = "";

    radios.forEach(r => { if(r.checked) selectedValue = r.value; });

    if (selectedValue === '자가') {
        depositInput.value = "";
        monthlyInput.value = "";
        depositInput.disabled = true;
        monthlyInput.disabled = true;
    } else {
        depositInput.disabled = false;
        monthlyInput.disabled = false;
    }
}

// 수출여부 선택 시 매출 입력창 잠금 로직
function toggleExportInputs() {
    const radios = document.getElementsByName('export');
    const exportInputs = document.querySelectorAll('.export-money');
    let selectedValue = "";

    radios.forEach(r => { if(r.checked) selectedValue = r.value; });

    if (selectedValue === '수출준비중' || selectedValue === '계획없음') {
        exportInputs.forEach(input => {
            input.value = "";
            input.disabled = true;
        });
    } else {
        exportInputs.forEach(input => {
            input.disabled = false;
        });
    }
}

// 총 부채 실시간 합계 계산
function calculateTotalDebt() {
    const debtInputs = document.querySelectorAll('.debt-input');
    let total = 0;

    debtInputs.forEach(input => {
        let numVal = parseInt(input.value.replace(/,/g, ''), 10);
        if (!isNaN(numVal)) total += numVal;
    });

    const totalDisplay = document.getElementById('total-debt');
    totalDisplay.innerText = total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function saveCompanyData() {
    alert('업체 정보가 성공적으로 저장되었습니다!');
    showTab('reportList');
}
