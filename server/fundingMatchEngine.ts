/**
 * 정책자금 매칭 규칙 엔진
 * 
 * 업종별 추천 순위, 신용점수 컷트라인, 전년도 매출 기반 한도 책정 로직
 */

import { formatAmountKorean } from "../shared/formatAmount.js";

// ─── 타입 정의 ───

export interface FundingMatchInput {
  industry?: string;           // 업종
  niceScore: number;           // NICE 신용점수
  previousYearSales: number;   // 전년도 매출 (만원 단위)
  employeeCount: number;       // 4대보험 가입 직원 수
  hasFinancialDelinquency: boolean;
  hasTaxDelinquency: boolean;
  // 부채 내역 (기존 이용 기관 판별용)
  hasGiboDebt: boolean;        // 기술보증기금 기존 이용 여부
  hasSinboDebt: boolean;       // 신용보증기금 기존 이용 여부
}

export interface RecommendedInstitution {
  rank: number;
  name: string;
  reason: string;
  creditCutline: string;       // 신용점수 컷트라인 설명
  eligible: boolean;           // 신용점수 기준 자격 여부
  estimatedLimit?: string;     // 예상 한도
  note?: string;               // 추가 참고사항
}

export interface FundingMatchResult {
  category: string;            // 적용된 분류 카테고리
  categoryReason: string;      // 카테고리 분류 사유
  recommendations: RecommendedInstitution[];
  creditWarning?: string;      // 신용 관련 경고
  limitBasis: string;          // 한도 산정 기준 설명
  isDelinquent: boolean;       // 연체/체납 여부
  delinquentWarning?: string;  // 연체/체납 경고
}

// ─── 업종 분류 헬퍼 ───

function isManufacturingOrIT(industry?: string): boolean {
  if (!industry) return false;
  const lower = industry.toLowerCase();
  const keywords = [
    "제조", "manufacturing", "생산", "공장",
    "it", "정보통신", "소프트웨어", "sw", "ict", "정보기술",
    "전자", "반도체", "기계", "화학", "금속", "섬유",
    "식품제조", "자동차부품", "플라스틱", "고무",
    "개발", "프로그램", "시스템", "데이터", "ai", "인공지능",
    "통신", "네트워크", "클라우드", "플랫폼"
  ];
  return keywords.some(kw => lower.includes(kw));
}

// ─── 신용점수 컷트라인 ───

const CREDIT_CUTLINES: Record<string, { minScore: number; label: string }> = {
  "중진공": { minScore: 830, label: "NICE 기준 830점 이상" },
  "신용보증기금": { minScore: 800, label: "NICE 기준 800점 이상" },
  "기술보증기금": { minScore: 700, label: "NICE 기준 700점 이상" },
  "소진공": { minScore: 700, label: "NICE 기준 700점 이상" },
  "신용보증재단": { minScore: 0, label: "별도 기준 적용" },
  "은행권 및 지역 특례자금": { minScore: 0, label: "기관별 상이" },
};

function isEligible(institutionName: string, niceScore: number): boolean {
  const cutline = CREDIT_CUTLINES[institutionName];
  if (!cutline || cutline.minScore === 0) return true;
  return niceScore >= cutline.minScore;
}

function getCreditCutlineDesc(institutionName: string): string {
  const cutline = CREDIT_CUTLINES[institutionName];
  return cutline ? cutline.label : "별도 기준 적용";
}

// ─── 한도 산정 ───

function calculateEstimatedLimit(
  previousYearSales: number,
  isManufacturing: boolean,
  niceScore: number,
  rankOffset: number = 0  // 0=1순위, 1=2순위 (약간 낙은 한도)
): { min: number; max: number; description: string } {
  if (previousYearSales <= 0) {
    return { min: 0, max: 0, description: "전년도 매출 데이터 미입력으로 한도 산정 불가" };
  }

  let minRatio: number, maxRatio: number, ratioDesc: string;

  if (isManufacturing) {
    // 제조업: 전년도 매출의 1/4~1/3
    minRatio = 1 / 4;
    maxRatio = 1 / 3;
    ratioDesc = "제조업 기준 전년도 매출의 1/4~1/3";
  } else {
    // 그 외 업종: 전년도 매출의 1/10~1/6
    minRatio = 1 / 10;
    maxRatio = 1 / 6;
    ratioDesc = "비제조업 기준 전년도 매출의 1/10~1/6";
  }

  // 신용도에 따른 차등 (높을수록 상한에 가까움)
  const creditBonus = niceScore >= 800 ? 1.1 : niceScore >= 700 ? 1.0 : 0.9;
  // 2순위는 1순위보다 약 10~15% 낙은 한도 제시 (유동성)
  const rankFactor = rankOffset === 0 ? 1.0 : 0.87;
  const min = Math.round(previousYearSales * minRatio * creditBonus * rankFactor);
  const max = Math.round(previousYearSales * maxRatio * creditBonus * rankFactor);

  return {
    min,
    max,
    description: `${ratioDesc} (신용점수 ${niceScore}점 반영)`,
  };
}

// 소진공 한도 산정 (매출 기반 동적 계산 + 상품 한도 캡)
function calculateSemasLimit(
  previousYearSales: number,
  niceScore: number
): string {
  if (previousYearSales <= 0) return "1억원 ~ 2억원 (소진공 직접대출 기준)";

  // 소진공 소상공인 자금: 매출의 1/6~1/4 (최대 2억, 최소 2천만)
  const rawMin = Math.round(previousYearSales / 6);
  const rawMax = Math.round(previousYearSales / 4);

  // 소진공 상품별 한도 캡 적용
  // - 소상공인 경영안정자금: 최대 7천만원
  // - 소상공인 성장촉진자금: 최대 1억원
  // - 소상공인 스마트화자금: 최대 1억원
  // - 일반경영안정자금: 최대 2억원
  const cappedMin = Math.max(2000, Math.min(rawMin, 10000));
  const cappedMax = Math.max(5000, Math.min(rawMax, 20000));

  // 신용점수에 따른 추천 상품 안내
  const productNote = niceScore >= 700
    ? "(소상공인 성장촉진자금·일반경영안정자금 신청 가능)"
    : "(소상공인 경영안정자금 우선 신청 권고)";

  return `${formatAmountKorean(cappedMin)} ~ ${formatAmountKorean(cappedMax)} ${productNote}`;
}

// ─── 메인 매칭 엔진 ───

export function runFundingMatchEngine(input: FundingMatchInput): FundingMatchResult {
  const {
    industry,
    niceScore,
    previousYearSales,
    employeeCount,
    hasFinancialDelinquency,
    hasTaxDelinquency,
    hasGiboDebt,
    hasSinboDebt,
  } = input;

  const isDelinquent = hasFinancialDelinquency || hasTaxDelinquency;
  const isManufacturing = isManufacturingOrIT(industry);
  const salesOver50 = previousYearSales >= 500000; // 50억 = 500,000만원
  const employees5Plus = employeeCount >= 5;

  // 한도 산정 (1순위/2순위 차별화)
  const limitCalc1 = calculateEstimatedLimit(previousYearSales, isManufacturing, niceScore, 0);
  const limitCalc2 = calculateEstimatedLimit(previousYearSales, isManufacturing, niceScore, 1);
  const limitStr = limitCalc1.min > 0
    ? `${formatAmountKorean(limitCalc1.min)} ~ ${formatAmountKorean(limitCalc1.max)}`
    : "산정 불가 (매출 데이터 필요)";
  const limitStr2 = limitCalc2.min > 0
    ? `${formatAmountKorean(limitCalc2.min)} ~ ${formatAmountKorean(limitCalc2.max)}`
    : "산정 불가 (매출 데이터 필요)";

  // 신용취약자금 체크 (NICE 839~550점)
  const isVulnerableCredit = niceScore >= 550 && niceScore <= 839;
  const creditWarning = isVulnerableCredit
    ? `대표 신용점수 NICE 기준 ${niceScore}점으로 신용취약자금 추천 대상 (NICE 839~550점 구간)`
    : undefined;

  // 연체/체납 경고
  const delinquentWarning = isDelinquent
    ? "금융연체 또는 세금체납 이력이 있어 정부 정책자금 및 지원사업 진행이 불가할 수 있음. 사전 해소 후 재신청 권고."
    : undefined;

  let category: string;
  let categoryReason: string;
  const recommendations: RecommendedInstitution[] = [];

  // ─── 카테고리 1: 매출 50억 이상 또는 4대보험 5명 이상 ───
  if (salesOver50 || employees5Plus) {
    category = "대형 기업 (매출 50억 이상 또는 4대보험 5명 이상)";
    const reasons: string[] = [];
    if (salesOver50) reasons.push(`전년도 매출 ${formatAmountKorean(previousYearSales)} (50억 이상)`);
    if (employees5Plus) reasons.push(`4대보험 가입직원 ${employeeCount}명 (5명 이상)`);
    categoryReason = reasons.join(", ");

    recommendations.push({
      rank: 1,
      name: "중진공",
      reason: "매출 50억 이상 또는 4대보험 5명 이상 기업 1순위 추천",
      creditCutline: getCreditCutlineDesc("중진공"),
      eligible: isEligible("중진공", niceScore),
      estimatedLimit: limitStr,
      note: niceScore > 0 && niceScore < 830 ? `현재 NICE ${niceScore}점으로 중진공 기준(830점) 미달. 신용 개선 후 재검토 권고.` : undefined,
    });

    recommendations.push({
      rank: 2,
      name: "신용보증기금",
      reason: "대형 기업 2순위 추천 기관",
      creditCutline: getCreditCutlineDesc("신용보증기금"),
      eligible: isEligible("신용보증기금", niceScore),
      estimatedLimit: limitStr2,
    });

    recommendations.push({
      rank: 3,
      name: "은행권 및 지역 특례자금",
      reason: "보완적 자금 조달 채널",
      creditCutline: getCreditCutlineDesc("은행권 및 지역 특례자금"),
      eligible: true,
      estimatedLimit: "기관별 상이",
    });

  // ─── 카테고리 2: 제조업/IT업 ───
  } else if (isManufacturing) {
    category = "제조업/IT업";
    categoryReason = `업종: ${industry || "제조/IT 관련"}`;

    recommendations.push({
      rank: 1,
      name: "중진공",
      reason: "제조업/IT업 1순위 추천 기관",
      creditCutline: getCreditCutlineDesc("중진공"),
      eligible: isEligible("중진공", niceScore),
      estimatedLimit: limitStr,
      note: niceScore > 0 && niceScore < 830 ? `현재 NICE ${niceScore}점으로 중진공 기준(830점) 미달. 신용 개선 후 재검토 권고.` : undefined,
    });

    // 2순위: 기보/신보 (중복 불가, 부체 내역 기반 추천)
    if (hasGiboDebt && !hasSinboDebt) {
      recommendations.push({
        rank: 2,
        name: "기술보증기금",
        reason: "기존 기술보증기금 이용 이력이 있어 기보 우선 추천 (기보/신보 중복 불가)",
        creditCutline: getCreditCutlineDesc("기술보증기금"),
        eligible: isEligible("기술보증기금", niceScore),
        estimatedLimit: limitStr2,
      });
    } else if (hasSinboDebt && !hasGiboDebt) {
      recommendations.push({
        rank: 2,
        name: "신용보증기금",
        reason: "기존 신용보증기금 이용 이력이 있어 신보 우선 추천 (기보/신보 중복 불가)",
        creditCutline: getCreditCutlineDesc("신용보증기금"),
        eligible: isEligible("신용보증기금", niceScore),
        estimatedLimit: limitStr2,
      });
    } else {
      // 둘 다 없거나 둘 다 있는 경우 → 기보/신보 병기
      recommendations.push({
        rank: 2,
        name: "기술보증기금 또는 신용보증기금",
        reason: "제조업/IT업 2순위 (기보/신보 중 탁1, 중복 불가). 기술력 기반 기업은 기보, 신용 기반 기업은 신보 추천.",
        creditCutline: `기보: ${getCreditCutlineDesc("기술보증기금")} / 신보: ${getCreditCutlineDesc("신용보증기금")}`,
        eligible: isEligible("기술보증기금", niceScore) || isEligible("신용보증기금", niceScore),
        estimatedLimit: limitStr2,
        note: "기술보증기금과 신용보증기금은 중복 이용 불가. 기존 이용 기관이 있으면 해당 기관으로 추천.",
      });
    }

    recommendations.push({
      rank: 3,
      name: "소진공",
      reason: "제조업/IT업 3순위 추천 기관 - 소상공인 대상 직접대출 상품 다수 보유",
      creditCutline: getCreditCutlineDesc("소진공"),
      eligible: isEligible("소진공", niceScore),
      estimatedLimit: calculateSemasLimit(previousYearSales, niceScore),
      note: "소진공 직접대출 주요 상품: 경영안정자금(최대 7천만), 성장촉진자금(최대 1억), 일반경영안정자금(최대 2억). 소상공인 자격 확인 필요.",
    });

    recommendations.push({
      rank: 4,
      name: "은행권 및 지역 특례자금",
      reason: "보완적 자금 조달 채널 - 지역신용보증재단 연계 특례보증 활용 가능",
      creditCutline: getCreditCutlineDesc("은행권 및 지역 특례자금"),
      eligible: true,
      estimatedLimit: "기관별 상이 (지역 특례보증 최대 1억~3억)",
    });

  // ─── 카테고리 3: 그 외 업종 ───
  } else {
    category = "그 외 업종 (서비스/유통/도소매 등)";
    categoryReason = `업종: ${industry || "비제조업"}`;

    // 1순위: 전년도 매출 5억 기준
    const salesOver5 = previousYearSales >= 50000; // 5억 = 50,000만원
    if (salesOver5) {
      recommendations.push({
        rank: 1,
        name: "신용보증기금",
        reason: `전년도 매출 ${formatAmountKorean(previousYearSales)} (5억 이상)으로 신용보증기금 1순위 추천`,
        creditCutline: getCreditCutlineDesc("신용보증기금"),
        eligible: isEligible("신용보증기금", niceScore),
        estimatedLimit: limitStr,
      });
    } else {
      recommendations.push({
        rank: 1,
        name: "신용보증재단",
        reason: previousYearSales > 0
          ? `전년도 매출 ${formatAmountKorean(previousYearSales)} (5억 이하)으로 신용보증재단 1순위 추천`
          : "전년도 매출 5억 이하 기업 대상 신용보증재단 1순위 추천",
        creditCutline: getCreditCutlineDesc("신용보증재단"),
        eligible: true,
        estimatedLimit: limitStr,
      });
    }

    recommendations.push({
      rank: 2,
      name: "소진공",
      reason: "비제조업 2순위 추천 기관 - 소상공인 직접대출 및 경영안정자금 활용 가능",
      creditCutline: getCreditCutlineDesc("소진공"),
      eligible: isEligible("소진공", niceScore),
      estimatedLimit: calculateSemasLimit(previousYearSales, niceScore),  // 소진공은 별도 산정 로직 유지
      note: "소진공 직접대출 주요 상품: 경영안정자금(최대 7천만), 성장촉진자금(최대 1억), 일반경영안정자금(최대 2억). 소상공인 자격 확인 필요.",
    });

    recommendations.push({
      rank: 3,
      name: "은행권 및 지역 특례자금",
      reason: "보완적 자금 조달 채널",
      creditCutline: getCreditCutlineDesc("은행권 및 지역 특례자금"),
      eligible: true,
      estimatedLimit: "기관별 상이",
    });
  }

  return {
    category,
    categoryReason,
    recommendations,
    creditWarning,
    limitBasis: limitCalc1.description,
    isDelinquent,
    delinquentWarning,
  };
}

/**
 * 매칭 결과를 텍스트 형태로 변환 (AI 프롬프트 주입용)
 */
export function formatMatchResultForPrompt(result: FundingMatchResult): string {
  const lines: string[] = [];

  lines.push("=== 정책자금 매칭 규칙 엔진 분석 결과 ===");
  lines.push(`분류: ${result.category}`);
  lines.push(`분류 사유: ${result.categoryReason}`);
  lines.push(`한도 산정 기준: ${result.limitBasis}`);

  if (result.isDelinquent && result.delinquentWarning) {
    lines.push(`\n⚠️ 경고: ${result.delinquentWarning}`);
  }
  if (result.creditWarning) {
    lines.push(`\n📋 신용 참고: ${result.creditWarning}`);
  }

  lines.push("\n--- 추천 기관 순위 ---");
  for (const rec of result.recommendations) {
    lines.push(`\n[${rec.rank}순위] ${rec.name}`);
    lines.push(`  추천 사유: ${rec.reason}`);
    lines.push(`  신용점수 기준: ${rec.creditCutline}`);
    lines.push(`  자격 충족: ${rec.eligible ? "충족" : "미달 (신용점수 개선 필요)"}`);
    if (rec.estimatedLimit) lines.push(`  예상 한도: ${rec.estimatedLimit}`);
    if (rec.note) lines.push(`  참고: ${rec.note}`);
  }

  return lines.join("\n");
}

/**
 * 매칭 결과를 matchingSummary 형태로 변환 (UI 표시용)
 */
export function buildMatchingSummaryFromEngine(result: FundingMatchResult): {
  rank1: string;
  rank2: string;
  rank3: string;
  rank4: string;
  estimatedLimit: string;
} {
  const recs = result.recommendations;
  const getRankText = (rank: number): string => {
    const rec = recs.find(r => r.rank === rank);
    if (!rec) return "-";
    const eligibleText = rec.eligible ? "" : " (신용점수 미달)";
    return `${rec.name}${eligibleText}${rec.estimatedLimit ? ` - 예상 한도: ${rec.estimatedLimit}` : ""}`;
  };

  // 전체 예상 한도 합산 (가장 높은 한도 기준)
  const topRec = recs.find(r => r.rank === 1);
  const limitText = topRec?.estimatedLimit || "산정 불가";

  return {
    rank1: getRankText(1),
    rank2: getRankText(2),
    rank3: getRankText(3),
    rank4: getRankText(4),
    estimatedLimit: `${result.category} 기준 - ${limitText} (${result.limitBasis})`,
  };
}
