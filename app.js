// 1. 탭 화면 전환 기능
function showTab(tabId) {
    // 모든 탭 내용을 숨김
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // 클릭한 탭만 보여줌
    document.getElementById(tabId).classList.add('active');
}

// 2. 개별 API 키 저장 기능 (보안을 위해 localStorage에 저장)
function saveApiKey() {
    const key = document.getElementById('apiKeyInput').value;
    if (key) {
        localStorage.setItem('bizConsultApiKey', key);
        alert('API 키가 브라우저에 안전하게 저장되었습니다.');
    } else {
        alert('API 키를 입력해주세요.');
    }
}

// 3. AI 경영진단보고서 생성 임시 함수 (나중에 여기에 진짜 OpenAI 연동 코드를 넣습니다)
function generateAIReport() {
    const apiKey = localStorage.getItem('bizConsultApiKey');
    
    if (!apiKey) {
        alert('먼저 설정 탭에서 API 키를 등록해주세요!');
        showTab('settings');
        return;
    }

    const resultArea = document.getElementById('ai-result-area');
    resultArea.innerHTML = "🔄 AI가 기업 데이터를 분석 중입니다... (여기에 실제 API 호출 로직이 들어갈 예정입니다.)";
    
    // 이 위치에 향후 OpenAI API로 프롬프트를 보내고 결과를 받아오는 코드를 작성합니다.
}