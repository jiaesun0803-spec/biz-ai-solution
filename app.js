// === 시뮬레이터 슬라이더 값 실시간 변경 로직 ===
document.addEventListener("DOMContentLoaded", function() {
    // 1. 신용점수 슬라이더
    const sliderScore = document.getElementById('slider-score');
    const valScore = document.getElementById('val-score');
    if(sliderScore) {
        sliderScore.addEventListener('input', function() {
            valScore.innerText = this.value + "점";
        });
    }

    // 2. 매출 슬라이더 (단위 변환 로직 포함)
    const sliderSales = document.getElementById('slider-sales');
    const valSales = document.getElementById('val-sales');
    if(sliderSales) {
        sliderSales.addEventListener('input', function() {
            let val = parseInt(this.value);
            if (val === 0) valSales.innerText = "0원";
            else if (val < 10) valSales.innerText = val + "억원";
            else valSales.innerText = (val * 10) + "억원"; // 단순 예시 비례식
        });
    }

    // 3. 직원수 슬라이더
    const sliderEmp = document.getElementById('slider-emp');
    const valEmp = document.getElementById('val-emp');
    if(sliderEmp) {
        sliderEmp.addEventListener('input', function() {
            valEmp.innerText = this.value + "명";
        });
    }
});
