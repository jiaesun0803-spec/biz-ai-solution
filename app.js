document.addEventListener("DOMContentLoaded", function() {
    // URL 파라미터 연동
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') || 'dashboard';
    showTab(tabParam, false);

    // 숫자만 입력
    document.querySelectorAll('.number-only').forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    });

    // 금액 콤마
    document.querySelectorAll('.money-format').forEach(input => {
        input.addEventListener('input', function() {
            let value = this.value.replace(/[^0-9]/g, '');
            this.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        });
    });

    // 부채 합계
    document.querySelectorAll('.debt-input').forEach(input => {
        input.addEventListener('input', calculateTotalDebt);
    });

    // 자동 하이픈 (사업자번호)
    const bizNumber = document.getElementById('biz_number');
    if(bizNumber) {
        bizNumber.addEventListener('input', function() {
            let val = this.value.replace(/[^0-9]/g, '');
            if (val.length < 4) this.value = val;
            else if (val.length < 6) this.value = val.slice(0,3) + '-' + val.slice(3);
            else this.value = val.slice(0,3) + '-' + val.slice(3,5) + '-' + val.slice(5,10);
        });
    }

    // 자동 하이픈 (법인번호)
    const corpNumber = document.getElementById('corp_number');
    if(corpNumber) {
        corpNumber.addEventListener('input', function() {
            let val = this.value.replace(/[^0-9]/g, '');
            if (val.length < 7) this.value = val;
            else this.value = val.slice(0,6) + '-' + val.slice(6,13);
        });
    }

    // 자동 하이픈 (날짜)
    const dateInputs = ['biz_date', 'rep_birth', 'write_date'];
    dateInputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', function() {
                let val = this.value.replace(/[^0-9]/g, '');
                if (val.length < 5) this.value = val;
                else if (val.length < 7) this.value = val.slice(0,4) + '-' + val.slice(4);
                else this.value = val.slice(0,4) + '-' + val.slice(4,6) + '-' + val.slice(6,8);
            });
        }
    });

    // 자동 하이픈 (전화번호)
    const phoneInputs = ['biz_phone', 'rep_phone'];
    phoneInputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', function() {
                let val = this.value.replace(/[^0-9]/g, '');
                let res = '';
                if(val.startsWith('02')) { 
                    if(val.length < 3) res = val;
                    else if(val.length < 6) res = val.slice(0,2) + '-' + val.slice(2);
                    else if(val.length < 10) res = val.slice(0,2) + '-' + val.slice(2,5) + '-' + val.slice(5);
                    else res = val.slice(0,2) + '-' + val.slice(2,6) + '-' + val.slice(6,10);
                } else {
                    if(val.length < 4) res = val;
                    else if(val.length < 7) res = val.slice(0,3) + '-' + val.slice(3);
                    else if(val.length < 11) res = val.slice(0,3) + '-' + val.slice(3,6) + '-' + val.slice(6);
                    else res = val.slice(0,3) + '-' + val.slice(3,7) + '-' + val.slice(7,11);
                }
                this.value = res;
            });
        }
    });

    // 시뮬레이터 슬라이더
    const sliderScore = document.getElementById('slider-score');
    const valScore = document.getElementById('val-score');
    if(sliderScore) sliderScore.addEventListener('input', function() { valScore.innerText = this.value + "점"; });

    const sliderSales = document.getElementById('slider-sales');
    const valSales = document.getElementById('val-sales');
    if(sliderSales) {
        sliderSales.addEventListener('input', function() {
            let val = parseInt(this.value);
            if (val === 0) valSales.innerText = "0원";
            else if (val < 10) valSales.innerText = val + "억원";
            else valSales.innerText = (val * 10) + "억원";
        });
    }

    const sliderEmp = document.getElementById('slider-emp');
    const valEmp = document.getElementById('val-emp');
    if(sliderEmp) sliderEmp.addEventListener('input', function() { valEmp.innerText = this.value + "명"; });
});

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

// 폼 로직
function toggleCorpNumber() {
    const radios = document.getElementsByName('biz_type');
    const corpInput = document.getElementById('corp_number');
    let selectedValue = "";
    radios.forEach(r => { if(r.checked) selectedValue = r.value; });
    if (selectedValue === '개인') { corpInput.value = ""; corpInput.disabled = true; } 
    else { corpInput.disabled = false; }
}

function toggleRentInputs() {
    const radios = document.getElementsByName('rent_type');
    const depositInput = document.getElementById('rent_deposit');
    const monthlyInput = document.getElementById('rent_monthly');
    let selectedValue = "";
    radios.forEach(r => { if(r.checked) selectedValue = r.value; });
    if (selectedValue === '자가') { depositInput.value = ""; monthlyInput.value = ""; depositInput.disabled = true; monthlyInput.disabled = true; } 
    else { depositInput.disabled = false; monthlyInput.disabled = false; }
}

function toggleExportInputs() {
    const radios = document.getElementsByName('export');
    const exportInputs = document.querySelectorAll('.export-money');
    let selectedValue = "";
    radios.forEach(r => { if(r.checked) selectedValue = r.value; });
    if (selectedValue === '수출준비중' || selectedValue === '계획없음') { exportInputs.forEach(input => { input.value = ""; input.disabled = true; }); } 
    else { exportInputs.forEach(input => { input.disabled = false; }); }
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

function saveCompanyData() {
    alert('업체 정보가 성공적으로 저장되었습니다!');
    showTab('reportList');
}
