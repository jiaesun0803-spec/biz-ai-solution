const STORAGE_KEY = 'biz_consult_companies';

document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    showTab(urlParams.get('tab') || 'dashboard', false);

    updateCompanyLists();
    initInputHandlers();
});

function initInputHandlers() {
    document.querySelectorAll('.number-only').forEach(input => {
        input.addEventListener('input', function() { this.value = this.value.replace(/[^0-9]/g, ''); });
    });
    document.querySelectorAll('.money-format').forEach(input => {
        input.addEventListener('input', function() {
            let val = this.value.replace(/[^0-9\-]/g, ''); 
            this.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        });
    });
    document.querySelectorAll('.debt-input').forEach(input => {
        input.addEventListener('input', calculateTotalDebt);
    });

    const bizNumber = document.getElementById('biz_number');
    if(bizNumber) bizNumber.addEventListener('input', function() {
        let val = this.value.replace(/[^0-9]/g, '');
        if (val.length < 4) this.value = val;
        else if (val.length < 6) this.value = val.slice(0,3) + '-' + val.slice(3);
        else this.value = val.slice(0,3) + '-' + val.slice(3,5) + '-' + val.slice(5,10);
    });

    const corpNumber = document.getElementById('corp_number');
    if(corpNumber) corpNumber.addEventListener('input', function() {
        let val = this.value.replace(/[^0-9]/g, '');
        if (val.length < 7) this.value = val;
        else this.value = val.slice(0,6) + '-' + val.slice(6,13);
    });

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

    const sliderScore = document.getElementById('slider-score');
    const valScore = document.getElementById('val-score');
    if(sliderScore) sliderScore.addEventListener('input', function() { valScore.innerText = this.value + "점"; });

    const sliderSales = document.getElementById('slider-sales');
    const valSales = document.getElementById('val-sales');
    if(sliderSales) sliderSales.addEventListener('input', function() {
        let val = parseInt(this.value);
        if (val === 0) valSales.innerText = "0원"; else if (val < 10) valSales.innerText = val + "억원"; else valSales.innerText = (val * 10) + "억원";
    });

    document.querySelectorAll('.fin-input').forEach(input => {
        input.addEventListener('input', function() { calcFinance('1'); calcFinance('2'); });
    });
}

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

function showTab(tabId, updateUrl = true) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.menu li, .bottom-menu li').forEach(item => item.classList.remove('active'));

    const selectedTab = document.getElementById(tabId);
    if(selectedTab) selectedTab.classList.add('active');
    const selectedMenu = document.getElementById('menu-' + tabId);
    if(selectedMenu) selectedMenu.classList.add('active');

    if (updateUrl) history.pushState(null, '', `?tab=${tabId}`);
    if (tabId === 'reportList') updateCompanyLists();
}

window.addEventListener('popstate', function() {
    const urlParams = new URLSearchParams(window.location.search);
    showTab(urlParams.get('tab') || 'dashboard', false);
});

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

    const listBody = document.getElementById('company-list-body');
    if (listBody) {
        if (companies.length === 0) {
            listBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #94a3b8; font-size: 14px;">등록된 업체가 없습니다.</td></tr>';
        } else {
            listBody.innerHTML = companies.map(comp => `
                <tr>
                    <td><strong>${comp.name}</strong></td>
                    <td>${comp.rep}</td>
                    <td>${comp.bizNum}</td>
                    <td>${comp.date}</td>
                    <td><button class="btn-small-outline" onclick="showTab('company')">수정/보기</button></td>
                </tr>
            `).join('');
        }
    }
}

function saveCompanyData() {
    const name = document.getElementById('comp_name') ? document.getElementById('comp_name').value : "";
    const rep = document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0] ? document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0].value : "";
    const bizNum = document.getElementById('biz_number') ? document.getElementById('biz_number').value : "";
    const industry = document.getElementById('comp_industry') ? document.getElementById('comp_industry').value : "";
    
    if (!name) { alert('상호명을 입력해주세요.'); return; }

    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newCompany = {
        name: name,
        rep: rep || '-',
        bizNum: bizNum || '-',
        industry: industry || '-',
        date: new Date().toISOString().split('T')[0]
    };

    const existingIdx = companies.findIndex(c => c.name === name);
    if (existingIdx > -1) companies[existingIdx] = newCompany;
    else companies.push(newCompany);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    alert('업체 정보가 안전하게 저장되었습니다!');
    
    updateCompanyLists();
    showTab('reportList');
}

function loadCompanyData() {
    alert('테스트용 데이터(주식회사 대박컴퍼니)를 불러옵니다.');
    
    if(document.getElementById('comp_name')) document.getElementById('comp_name').value = "주식회사 대박컴퍼니";
    if(document.querySelector('input[value="법인"]')) document.querySelector('input[value="법인"]').checked = true;
    if(document.getElementById('biz_number')) document.getElementById('biz_number').value = "732-86-03582";
    if(document.getElementById('corp_number')) { document.getElementById('corp_number').value = "170111-0974982"; document.getElementById('corp_number').disabled = false; }
    if(document.getElementById('comp_industry')) document.getElementById('comp_industry').value = "제조업"; 
    if(document.getElementById('biz_date')) document.getElementById('biz_date').value = "2023-01-15";
    if(document.getElementById('biz_phone')) document.getElementById('biz_phone').value = "053-123-4567";
    if(document.querySelector('input[placeholder="명 (4대보험 가입 기준)"]')) document.querySelector('input[placeholder="명 (4대보험 가입 기준)"]').value = "4";
    if(document.querySelector('input[value="임대"]')) document.querySelector('input[value="임대"]').checked = true; 
    if(document.querySelector('input[placeholder="상세 주소를 입력하세요"]')) document.querySelector('input[placeholder="상세 주소를 입력하세요"]').value = "대구 달성군 화원읍 비슬로 479길 10";
    if(document.getElementById('rent_deposit')) document.getElementById('rent_deposit').value = "5,000";
    if(document.getElementById('rent_monthly')) document.getElementById('rent_monthly').value = "200";

    if(document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0]) document.querySelectorAll('input[placeholder="대표자명을 입력하세요"]')[0].value = "오가은";
    if(document.getElementById('rep_birth')) document.getElementById('rep_birth').value = "1985-05-20";
    if(document.querySelectorAll('input[name="home_rent"]')[0]) document.querySelectorAll('input[name="home_rent"]')[0].checked = true; 
    if(document.querySelectorAll('input[placeholder="상세 주소를 입력하세요"]')[1]) document.querySelectorAll('input[placeholder="상세 주소를 입력하세요"]')[1].value = "대구 수성구 달구벌대로 123";
    if(document.getElementById('rep_phone')) document.getElementById('rep_phone').value = "010-1234-5678";
    if(document.querySelector('input[placeholder="전공분야"]')) document.querySelector('input[placeholder="전공분야"]').value = "식품공학";

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    if(checkboxes.length > 10) {
        checkboxes[4].checked = true; 
        checkboxes[8].checked = true; 
        checkboxes[10].checked = true; 
        checkboxes[14].checked = true; 
    }

    const numberInputs = document.querySelectorAll('.number-only');
    if(numberInputs.length > 2) { numberInputs[1].value = "710"; numberInputs[2].value = "740"; }

    const moneyInputs = document.querySelectorAll('.money-format');
    if(moneyInputs.length > 5) {
        moneyInputs[2].value = "11,000"; 
        moneyInputs[3].value = "138,000"; 
        moneyInputs[4].value = "114,000"; 
        moneyInputs[5].value = "0"; 
    }
    if(document.querySelector('input[value="계획없음"]')) document.querySelector('input[value="계획없음"]').checked = true; 

    const debtInputs = document.querySelectorAll('.debt-input');
    if(debtInputs.length > 4) {
        debtInputs[0].value = "20,000"; 
        debtInputs[3].value = "10,000"; 
        debtInputs[4].value = "7,000";  
        calculateTotalDebt(); 
    }

    const textareas = document.querySelectorAll('textarea');
    if(textareas.length > 6) {
        textareas[0].value = "돼지 사골을 농축·압축한 코인 형태의 간편 육수.";
        textareas[1].value = "1~2인 가구 증가 및 집밥 문화 정착으로 HMR 육수 시장 급성장 중.";
        textareas[2].value = "현재 자사몰 및 스마트스토어 중심 온라인 판매.";
        textareas[3].value = "개별 포장된 코인육수 세트 판매 (B2C 중심).";
        textareas[4].value = "경쟁사 대비 돈육 특화로 차별화된 맛. 독점 기술력 확보.";
        textareas[5].value = "온라인 채널 확장 및 생산 설비 확충.";
        textareas[6].value = "매출 성장세가 매우 가파르나, 부채가 전액 정책자금으로 구성되어 추가 조달 시 한도 심사가 깐깐할 수 있음.";
    }
    if(document.getElementById('write_date')) document.getElementById('write_date').value = "2026-04-15";
}

function generateReport(type, version, event) {
    const select = document.getElementById('report-company-select');
    const companyName = select ? select.value : "";
    if (!companyName) { alert('분석할 업체를 먼저 선택해주세요.'); return; }

    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "AI 분석 중...";
    btn.disabled = true;

    setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
        
        document.getElementById('report-input-step').style.display = 'none';
        document.getElementById('report-result-step').style.display = 'block';
        renderReportContent(companyName, version);
    }, 1500);
}

function renderReportContent(name, version) {
    const area = document.getElementById('report-content-area');
    
    let titleAdd = version === 'client' ? "(업체전달용)" : "<span style='color:#ef4444;'>(컨설턴트 피드백용)</span>";
    
    if (name.includes('대박컴퍼니')) {
        area.innerHTML = `
            <div class="paper-inner">
                <h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">경영진단보고서 ${titleAdd}</h1>
                <table class="simple-table">
                    <tr><th>기업명</th><td>주식회사 대박컴퍼니</td><th>업종</th><td>제조업 (돈육 코인육수)</td></tr>
                    <tr><th>대표자</th><td>오가은</td><th>작성일</th><td>2026-04-15</td></tr>
                </table>
                <h3>1. 진단 요약</h3>
                <p>창업 1년 만에 13억 원 이상의 매출을 달성한 고성장 초기 기업으로, 독점적인 코인육수 제조 기술력을 보유하고 있습니다.</p>
                <h3>2. 기술 및 경쟁력</h3>
                <p>현재 특허 1건 보유 및 추가 1건 출원 중으로, 온라인 전용 유통 전략을 통해 효율적인 마진 구조를 형성하고 있습니다.</p>
                ${version === 'client' ? 
                    `<div class="alert-box green">강점: 대표자님의 풍부한 외식업 경력과 우수한 신용도(740점)는 향후 투자 유치에 매우 유리합니다.</div>` : 
                    `<div class="alert-box blue">컨설턴트 액션 플랜: 부채가 전액 정책자금(3.7억)이므로, 추가 4억 조달을 위해서는 '벤처인증'을 통한 기술성 어필 전략을 즉시 수립해야 함.</div>`
                }
            </div>
        `;
    } 
    else {
        area.innerHTML = `
            <div class="paper-inner">
                <h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">경영진단보고서 ${titleAdd}</h1>
                <p style="text-align:center; padding: 100px 0; color:#64748b;">해당 업체(${name})의 데이터가 부족하여 AI 분석 초안을 구성 중입니다.</p>
            </div>
        `;
    }
}

function backToInput(tab) {
    document.getElementById(tab + '-input-step').style.display = 'block';
    document.getElementById(tab + '-result-step').style.display = 'none';
}

function toggleCorpNumber() {
    const radios = document.getElementsByName('biz_type');
    const corpInput = document.getElementById('corp_number');
    let selectedValue = ""; radios.forEach(r => { if(r.checked) selectedValue = r.value; });
    corpInput.disabled = selectedValue === '개인'; if (selectedValue === '개인') corpInput.value = "";
}
function toggleRentInputs() {
    const radios = document.getElementsByName('rent_type');
    const depositInput = document.getElementById('rent_deposit');
    const monthlyInput = document.getElementById('rent_monthly');
    let selectedValue = ""; radios.forEach(r => { if(r.checked) selectedValue = r.value; });
    depositInput.disabled = monthlyInput.disabled = selectedValue === '자가';
    if (selectedValue === '자가') depositInput.value = monthlyInput.value = "";
}
function toggleExportInputs() {
    const radios = document.getElementsByName('export');
    const exportInputs = document.querySelectorAll('.export-money');
    let selectedValue = ""; radios.forEach(r => { if(r.checked) selectedValue = r.value; });
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
