document.addEventListener("DOMContentLoaded", function() {
    // 1. URL 파라미터 확인 후 해당 탭 열기 (주소창 연동)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
        showTab(tabParam, false); // 새로고침 시 해당 탭 유지
    } else {
        showTab('dashboard', false); // 기본은 대시보드
    }

    // 2. 숫자만 입력되게 강제하는 로직 (.number-only 클래스)
    const numberInputs = document.querySelectorAll('.number-only');
    numberInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            // 숫자가 아닌 모든 문자를 지워버림
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    });

    // 3. 금액에 세자리마다 콤마(,) 찍어주는 로직 (.money-format 클래스)
    const moneyInputs = document.querySelectorAll('.money-format');
    moneyInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            // 먼저 숫자 외 문자 제거
            let value = this.value.replace(/[^0-9]/g, '');
            // 세자리마다 콤마 추가
            this.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        });
    });

    // 4. 부채 입력 시 실시간 합계 계산 로직
    const debtInputs = document.querySelectorAll('.debt-input');
    debtInputs.forEach(input => {
        input.addEventListener('input', calculateTotalDebt);
    });
});

// 탭 전환 함수 (URL 주소도 함께 변경됨)
function showTab(tabId, updateUrl = true) {
    // 모든 탭 숨기기
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // 사이드바 메뉴 활성화 디자인 변경
    const menuItems = document.querySelectorAll('.menu li, .bottom-menu li');
    menuItems.forEach(item => item.classList.remove('active'));

    // 선택한 탭 보이기
    const selectedTab = document.getElementById(tabId);
    if(selectedTab) selectedTab.classList.add('active');

    // 선택한 메뉴 디자인 활성화
    const selectedMenu = document.getElementById('menu-' + tabId);
    if(selectedMenu) selectedMenu.classList.add('active');

    // ★ 브라우저 주소창 업데이트 (예: ?tab=company) ★
    if (updateUrl) {
        const newUrl = window.location.pathname + '?tab=' + tabId;
        window.history.pushState({path: newUrl}, '', newUrl);
    }
}

// 브라우저 뒤로가기 버튼 눌렀을 때 탭 맞추기
window.addEventListener('popstate', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') || 'dashboard';
    showTab(tabParam, false);
});

// 개인/법인 사업자 선택 시 법인등록번호 칸 잠금/해제
function toggleCorpNumber() {
    const radios = document.getElementsByName('biz_type');
    const corpInput = document.getElementById('corp_number');
    let selectedValue = "";

    for (let i = 0; i < radios.length; i++) {
        if (radios[i].checked) {
            selectedValue = radios[i].value;
            break;
        }
    }

    if (selectedValue === '개인') {
        corpInput.value = ""; // 입력된 값 지우기
        corpInput.disabled = true; // 입력 창 잠금
        corpInput.style.backgroundColor = "#e2e8f0"; // 회색으로 변경
    } else {
        corpInput.disabled = false; // 입력 창 해제
        corpInput.style.backgroundColor = "#fafafa"; // 원래 색으로 복귀
    }
}

// 총 부채 실시간 합계 계산기
function calculateTotalDebt() {
    const debtInputs = document.querySelectorAll('.debt-input');
    let total = 0;

    debtInputs.forEach(input => {
        // 콤마(,)를 모두 제거하고 순수 숫자로 변환
        let numVal = parseInt(input.value.replace(/,/g, ''), 10);
        if (!isNaN(numVal)) {
            total += numVal;
        }
    });

    // 계산된 총합에 다시 콤마를 찍어서 화면에 표시
    const totalDisplay = document.getElementById('total-debt');
    totalDisplay.innerText = total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 업체 저장 버튼 클릭 시 액션 (임시 모의 로직)
function saveCompanyData() {
    alert('업체 정보가 성공적으로 저장되었습니다! \n\n(실제 데이터베이스 연동 시 이 데이터가 서버로 전송되고 "보고서 목록" 탭에 추가됩니다.)');
    // 저장 후 보고서 목록 탭으로 이동시킴
    showTab('reportList');
}
