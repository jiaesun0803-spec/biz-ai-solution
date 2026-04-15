/* =========================================
   Gemini API 연동 엔진
========================================= */

// API 호출 핵심 함수
async function callGeminiAPI(prompt) {
    const session = JSON.parse(localStorage.getItem('biz_session'));
    const apiKey = session ? session.apiKey : null;

    if (!apiKey) {
        alert("설정 탭에서 Gemini API 키를 먼저 등록해주세요.");
        showTab('settings');
        return null;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 4096,
                }
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("API 호출 오류:", error);
        alert("AI 분석 중 오류가 발생했습니다: " + error.message);
        return null;
    }
}

// 리포트 생성 통합 컨트롤러
async function generateReport(reportType, version, event) {
    const selectId = event.target.closest('.tab-content').querySelector('.company-dropdown').id;
    const companyName = document.getElementById(selectId).value;

    if (!companyName) {
        alert('분석할 업체를 먼저 선택해주세요.');
        return;
    }

    // 1. 업체 데이터 가져오기
    const companies = JSON.parse(localStorage.getItem('biz_consult_companies') || '[]');
    const companyData = companies.find(c => c.name === companyName);

    // 2. 로딩 표시
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "Gemini AI가 심층 분석 중...";
    btn.disabled = true;

    // 3. 리포트 타입별 맞춤형 프롬프트 구성
    let reportTitle = "";
    let systemInstruction = "";

    switch(reportType) {
        case 'management':
            reportTitle = "경영진단보고서";
            systemInstruction = `너는 20년 경력의 전문 경영컨설턴트야. 다음 기업 데이터를 바탕으로 [1.개요, 2.현황분석, 3.재무진단, 4.전략, 5.운영, 6.IT활용, 7.리스크, 8.로드맵] 순서로 아주 상세하고 전문적인 보고서를 작성해줘. 
            문체는 신뢰감 있는 비즈니스 문체를 사용하고, HTML 태그(h3, p, table, div class='alert-box')를 활용해서 시각적으로 예쁘게 구성해줘.`;
            break;
        case 'bizPlan':
            reportTitle = "AI 사업계획서";
            systemInstruction = "정부지원사업 합격을 위한 논리적이고 설득력 있는 사업계획서를 작성해줘.";
            break;
        // ... 다른 리포트 타입도 동일하게 확장 가능
    }

    const fullPrompt = `${systemInstruction}\n\n[기업 데이터]\n${JSON.stringify(companyData)}\n\n분석 대상: ${reportTitle}\n출력 버전: ${version === 'client' ? '업체 전달용' : '컨설턴트 내부 피드백용'}`;

    // 4. API 호출
    const aiResponse = await callGeminiAPI(fullPrompt);

    if (aiResponse) {
        btn.innerText = originalText;
        btn.disabled = false;

        // 결과 화면 전환
        const tabContent = event.target.closest('.tab-content');
        tabContent.querySelector('[id$="-input-step"]').style.display = 'none';
        tabContent.querySelector('[id$="-result-step"]').style.display = 'block';

        // 결과 삽입
        const contentArea = tabContent.querySelector('[id$="-content-area"]');
        contentArea.innerHTML = `
            <div class="paper-inner">
                <h1 style="text-align:center; font-size: 28px; margin-bottom: 50px;">${reportTitle} (${version === 'client' ? '업체전달용' : '컨설턴트용'})</h1>
                ${aiResponse}
            </div>
        `;
    } else {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

/* (기존의 checkAuth, showTab, loadUserProfile 등 인증/설정 관련 코드는 그대로 아래에 유지합니다) */
