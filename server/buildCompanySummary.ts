import { formatAmountKorean } from "../shared/formatAmount.js";

/**
 * 보고서에 포함될 기업현황표 데이터를 생성하는 함수
 * 모든 보고서 타입에 공통으로 포함됨
 */
export function buildCompanySummary(c: any, reportType: string) {
  // 인증 목록 생성
  const certs: string[] = [];
  if (c.hasSMECert) certs.push("중소기업확인");
  if (c.hasStartupCert) certs.push("창업확인");
  if (c.hasVentureCert) certs.push("벤처인증");
  if (c.hasInnobiz) certs.push("이노비즈");
  if (c.hasWomenBizCert) certs.push("여성기업");
  if (c.hasRootBizCert) certs.push("뿌리기업");
  if (c.hasISO) certs.push("ISO");
  if (c.hasHACCP) certs.push("HACCP");

  // 특허 정보
  const patentInfo = c.hasPatent === "yes" ? `특허 ${c.patentCount || "?"}건` : "";
  const certAndPatent = [
    ...certs,
    ...(patentInfo ? [patentInfo] : []),
  ].join(", ") || "없음";

  // 전년도 매출 합계 (가장 최근 연도 데이터 사용)
  const parseNum = (v?: string) => parseInt((v || "0").replace(/,/g, ""), 10) || 0;
  const prevYearSales = parseNum(c.year25Sales) || parseNum(c.year24Sales) || parseNum(c.currentYearSales);

  // 금년 매출 → 예상 매출 자동 계산: (금년 매출 / 경과월수) * 12
  let estimatedCurrentYearSales = "";
  let estimatedCurrentYearSalesRaw = 0;
  const elapsedMonthsGlobal = new Date().getMonth(); // 0-based: 4월=3 (전월마감 기준)
  if (c.currentYearSales) {
    const rawSales = parseNum(c.currentYearSales);
    if (elapsedMonthsGlobal > 0 && rawSales > 0) {
      estimatedCurrentYearSalesRaw = Math.round((rawSales / elapsedMonthsGlobal) * 12);
      estimatedCurrentYearSales = formatAmountKorean(estimatedCurrentYearSalesRaw) + ` (${elapsedMonthsGlobal}개월 기준 연간 환산)`;
    }
  }

  // 매출 데이터 (연도 오름차순: 23년 → 24년 → 25년 → 현재 → 금년예상)
  const salesDataEntries: { label: string; value: string; rawValue: number }[] = [];
  if (parseNum(c.year23Sales) > 0) {
    salesDataEntries.push({ label: "23년", value: formatAmountKorean(c.year23Sales), rawValue: parseNum(c.year23Sales) });
  }
  if (parseNum(c.year24Sales) > 0) {
    salesDataEntries.push({ label: "24년", value: formatAmountKorean(c.year24Sales), rawValue: parseNum(c.year24Sales) });
  }
  if (parseNum(c.year25Sales) > 0) {
    salesDataEntries.push({ label: "25년", value: formatAmountKorean(c.year25Sales), rawValue: parseNum(c.year25Sales) });
  }
  if (parseNum(c.currentYearSales) > 0) {
    salesDataEntries.push({ label: "현재", value: formatAmountKorean(c.currentYearSales), rawValue: parseNum(c.currentYearSales) });
  }
  if (estimatedCurrentYearSalesRaw > 0) {
    salesDataEntries.push({ label: "금년예상", value: formatAmountKorean(estimatedCurrentYearSalesRaw), rawValue: estimatedCurrentYearSalesRaw });
  }

  // 수출 여부
  const exportStatus = c.hasExportSales === "yes" ? "있음" : c.hasPlannedExport === "yes" ? "예정" : "없음";

  const summary: any = {
    name: c.name || "미입력",
    businessNumber: c.businessNumber || "미입력",
    corporateNumber: c.corporateNumber || "미입력",
    businessAddress: c.businessAddress || "미입력",
    industry: c.industry || "미입력",
    representativeName: c.representativeName || "미입력",
    hasExportSales: exportStatus,
    patentAndCerts: certAndPatent,
    previousYearSales: prevYearSales > 0 ? formatAmountKorean(prevYearSales) : "미입력",
    estimatedCurrentYearSales: estimatedCurrentYearSales || undefined,
    salesData: salesDataEntries.length > 0 ? salesDataEntries : undefined,
  };

  // 정책자금 매칭 리포트 전용 필드
  if (reportType === "funding_match") {
    // 매출 세부 (PDF와 동일하게: 금년예상 / 현재 / 25년 / 24년)
    if (estimatedCurrentYearSalesRaw > 0) {
      summary.estimatedCurrentYearSales = formatAmountKorean(estimatedCurrentYearSalesRaw) + ` (${elapsedMonthsGlobal}개월 기준 연간 환산)`;
    }
    if (parseNum(c.currentYearSales) > 0) {
      summary.currentSales = formatAmountKorean(c.currentYearSales);
    }
    if (parseNum(c.year25Sales) > 0) {
      summary.year25SalesAmt = formatAmountKorean(c.year25Sales);
    }
    if (parseNum(c.year24Sales) > 0) {
      summary.year24SalesAmt = formatAmountKorean(c.year24Sales);
    }

    // 총 매출 (funding_match 전용)
    const totalSalesAmt = estimatedCurrentYearSalesRaw > 0 ? estimatedCurrentYearSalesRaw : prevYearSales;
    summary.totalSales = totalSalesAmt > 0 ? formatAmountKorean(totalSalesAmt) : "미입력";

    // 총 부채
    const totalDebt = [c.jungJinGong, c.soJinGong, c.sinbo, c.gibo, c.jaedan,
      c.companyCollateral, c.ceoCredit, c.ceoCollateral
    ].reduce((s: number, v: string | undefined) => s + parseNum(v), 0);
    summary.totalDebt = totalDebt > 0 ? formatAmountKorean(totalDebt) : "없음";

    // 필요 자금
    const reqFunds = parseNum(c.requiredFunding);
    summary.requiredFunding = reqFunds > 0 ? formatAmountKorean(reqFunds) : "미입력";
  }

  return summary;
}
