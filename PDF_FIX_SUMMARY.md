# BizConsult AI PDF 리포트 생성 기능 개선 - 수정 사항 정리

## 문제점
1. **사업계획서 표지 렌더링 오류**: PDF 다운로드 시 표지가 누락되거나 제대로 렌더링되지 않음
2. **섹션 페이지 분리 문제**: 정책자금 매칭 리포트 등에서 섹션 박스 내용이 페이지를 넘어갈 때 잘려서 표시됨
3. **미리보기와 PDF 불일치**: 웹 미리보기 화면과 PDF 다운로드 결과가 다르게 렌더링됨

## 수정 사항

### 1. `downloadReportById` 함수 내 `printCSS` 개선 (라인 1170)

#### 추가된 스타일:
- `.rp-cover{page-break-after:always!important;break-after:page!important;}`: 표지 다음에 항상 페이지 분리
- `.rp-page-break{page-break-before:always!important;break-before:page!important;}`: 각 섹션이 새로운 페이지에서 시작
- `.rp-flow-tight .rp-cat{page-break-inside:avoid!important;break-inside:avoid!important;}`: 정책자금 매칭 리포트 등의 카테고리 박스가 페이지를 넘어갈 때 잘리지 않도록 방지
- `.rp-cat{page-break-inside:avoid!important;break-inside:avoid!important;}`: 모든 카테고리 박스에 동일한 스타일 적용

#### 효과:
- 표지가 항상 첫 페이지에 표시되고 다음 페이지로 명확하게 분리됨
- 각 섹션이 페이지 경계에서 잘리지 않고 새로운 페이지에서 시작함
- 박스 내용이 페이지를 넘어갈 때 자동으로 다음 페이지로 이동하여 가독성 향상

### 2. `buildBizPlanHTML` 함수 개선 (라인 3639-3644)

#### 변경 사항:
```javascript
// 각 섹션에 페이지 나누기 적용
var sections = [s1, s2, s4, s3].map(function(sec) {
  return '<div class="rp-page-break">' + sec + '</div>';
}).join('');

return tplStyle(color, 'portrait') + '<div class="rp-wrap rp-flow rp-flow-tight">' + cover + sections + '</div>';
```

#### 효과:
- 사업계획서의 각 주요 섹션(SWOT, 전략, 재무, 로드맵)이 `.rp-page-break` 클래스로 감싸짐
- PDF 출력 시 각 섹션이 새로운 페이지에서 시작하도록 강제

## 테스트 항목

### 1. 사업계획서 (AI Business Plan)
- [ ] 표지가 올바르게 렌더링되는지 확인
- [ ] 각 섹션이 새로운 페이지에서 시작하는지 확인
- [ ] 웹 미리보기와 PDF가 동일하게 나오는지 확인
- [ ] 표지 배경(네이비 그라데이션)이 보존되는지 확인

### 2. 정책자금 매칭 리포트
- [ ] 박스 내용이 페이지를 넘어갈 때 잘리지 않는지 확인
- [ ] 각 섹션이 보기 편하게 레이아웃되는지 확인
- [ ] 웹 미리보기와 PDF가 동일하게 나오는지 확인

### 3. 기타 보고서 유형
- [ ] 경영진단 리포트 PDF 다운로드 확인
- [ ] 마케팅 리포트 PDF 다운로드 확인
- [ ] 무역 리포트 PDF 다운로드 확인
- [ ] 재무 리포트 PDF 다운로드 확인

## 기술 상세

### CSS 페이지 분리 속성
- `page-break-before: always !important`: 요소 앞에 페이지 분리 강제
- `page-break-after: always !important`: 요소 뒤에 페이지 분리 강제
- `page-break-inside: avoid !important`: 요소 내부에서 페이지 분리 방지
- `break-before: page !important`: 최신 CSS 표준 (page-break-before 대체)
- `break-after: page !important`: 최신 CSS 표준 (page-break-after 대체)
- `break-inside: avoid !important`: 최신 CSS 표준 (page-break-inside 대체)

### 호환성
- `-webkit-print-color-adjust: exact !important`: 웹킷 브라우저에서 색상 정확도 유지
- `print-color-adjust: exact !important`: 표준 CSS 색상 정확도 유지
- `color-adjust: exact !important`: 레거시 CSS 호환성

## 예상 효과

1. **사용자 경험 개선**: PDF 다운로드 시 미리보기와 동일한 레이아웃으로 표시되어 혼동 감소
2. **가독성 향상**: 섹션 박스가 페이지 경계에서 잘리지 않아 내용을 명확하게 읽을 수 있음
3. **전문성 강화**: 깔끔한 페이지 분리로 보고서가 더욱 전문적으로 보임
4. **데이터 무결성**: 중요한 정보가 누락되거나 손상되지 않음

## 향후 개선 사항

1. 각 보고서 유형별로 최적의 페이지 높이 설정 검토
2. 큰 표나 차트가 포함된 섹션의 동적 페이지 분리 로직 추가
3. 사용자가 페이지 분리 옵션을 선택할 수 있는 UI 추가 고려
