import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, approvedProcedure, adminProcedure, router } from "./_core/trpc";
import { getAllUsers, getUsersByStatus, updateUserStatus, updateUserRole, deleteUser,
  getCompaniesByUserId, getCompanyById, createCompany, updateCompanyDb, deleteCompanyDb,
  getReportsByUserId, getReportsByCompanyId, getReportById, createReport, updateReportDb, deleteReportDb,
  updateUserApiKey, getUserApiKey, updateUserGeminiApiKey, getUserGeminiApiKey,
  getNotices, getNoticeById, createNotice, updateNotice, deleteNotice
} from "./db.js";
import { invokeLLM } from "./_core/llm";
import { formatAmountKorean } from "../shared/formatAmount.js";
import { buildCompanySummary } from "./buildCompanySummary.js";
import { runFundingMatchEngine, formatMatchResultForPrompt, buildMatchingSummaryFromEngine } from "./fundingMatchEngine.js";
import { mapProductsToRecommendations, type FundingProduct } from "./fundingProducts.js";
import { getAllManagedProducts, getProductById, addProduct, updateProduct, deleteProduct, resetToDefaults, mapManagedProductsToRecommendations } from "./productStore.js";

// ── 비동기 작업 저장소 (in-memory) ──────────────────────────────────────────
type JobStatus = 'pending' | 'running' | 'done' | 'error';
interface DiagJob {
  id: string;
  status: JobStatus;
  progress: number;  // 0~100
  step: string;
  result?: { title: string; sections: unknown[]; companySummary?: string };
  error?: string;
  createdAt: number;
}
const diagJobs = new Map<string, DiagJob>();
// 30분 이상 된 작업 자동 정리
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of diagJobs.entries()) {
    if (now - job.createdAt > 30 * 60 * 1000) diagJobs.delete(id);
  }
}, 5 * 60 * 1000);

// 업체 상세 데이터 스키마 (10개 섹션 전체)
const companyDetailSchema = z.object({
  // 1. 기업 현황
  name: z.string(),
  businessType: z.string().optional(),
  businessNumber: z.string().optional(),
  corporateNumber: z.string().optional(),
  establishedDate: z.string().optional(),
  businessPhone: z.string().optional(),
  employeeCount: z.string().optional(),
  industry: z.string().optional(),
  officeOwnership: z.string().optional(),
  businessAddress: z.string().optional(),
  deposit: z.string().optional(),
  monthlyRent: z.string().optional(),
  hasAdditionalBranch: z.string().optional(),
  // 2. 대표자 정보
  representativeName: z.string().optional(),
  birthDate: z.string().optional(),
  contactNumber: z.string().optional(),
  telecom: z.string().optional(),
  homeAddress: z.string().optional(),
  homeOwnership: z.string().optional(),
  education: z.string().optional(),
  major: z.string().optional(),
  career1: z.string().optional(),
  career2: z.string().optional(),
  // 3. 신용정보
  hasFinancialDelinquency: z.string().optional(),
  hasTaxDelinquency: z.string().optional(),
  kcbScore: z.string().optional(),
  niceScore: z.string().optional(),
  // 4. 매출현황
  hasExportSales: z.string().optional(),
  hasPlannedExport: z.string().optional(),
  currentYearSales: z.string().optional(),
  year25Sales: z.string().optional(),
  year24Sales: z.string().optional(),
  year23Sales: z.string().optional(),
  currentYearExport: z.string().optional(),
  year25Export: z.string().optional(),
  year24Export: z.string().optional(),
  year23Export: z.string().optional(),
  // 5. 부채현황
  jungJinGong: z.string().optional(),
  soJinGong: z.string().optional(),
  sinbo: z.string().optional(),
  gibo: z.string().optional(),
  jaedan: z.string().optional(),
  companyCollateral: z.string().optional(),
  ceoCredit: z.string().optional(),
  ceoCollateral: z.string().optional(),
  // 6. 보유 인증
  hasSMECert: z.boolean().optional(),
  hasStartupCert: z.boolean().optional(),
  hasWomenBizCert: z.boolean().optional(),
  hasInnobiz: z.boolean().optional(),
  hasVentureCert: z.boolean().optional(),
  hasRootBizCert: z.boolean().optional(),
  hasISO: z.boolean().optional(),
  hasHACCP: z.boolean().optional(),
  // 7. 특허 및 정부지원
  hasPatent: z.string().optional(),
  patentCount: z.string().optional(),
  patentDetails: z.string().optional(),
  hasGovSupport: z.string().optional(),
  govSupportCount: z.string().optional(),
  govSupportDetails: z.string().optional(),
  // 8. 비즈니스 상세
  coreItem: z.string().optional(),
  salesRoute: z.string().optional(),
  competitiveness: z.string().optional(),
  marketStatus: z.string().optional(),
  processDetail: z.string().optional(),
  targetCustomer: z.string().optional(),
  revenueModel: z.string().optional(),
  futurePlan: z.string().optional(),
  // 9. 자금 계획
  requiredFunding: z.string().optional(),
  fundingTypeOperating: z.string().optional(),  // 호환성 유지
  fundingTypeFacility: z.string().optional(),   // 호환성 유지
  fundingType: z.array(z.string()).optional(),   // 새 방식: ['운전자금', '시설자금']
  fundingPlanDetail: z.string().optional(),
  // 10. 콘설턴트 메모
  memo: z.string().optional(),
});

type CompanyDetail = z.infer<typeof companyDetailSchema>;

// 업체 데이터를 프롬프트용 텍스트로 변환하는 함수
function buildCompanyContext(c: CompanyDetail): string {
  const lines: string[] = [];

  // 1. 기업 현황
  lines.push("=== 기업 현황 ===");
  lines.push(`기업명: ${c.name}`);
  if (c.businessType) lines.push(`사업자유형: ${c.businessType}`);
  if (c.industry) lines.push(`업종: ${c.industry}`);
  if (c.establishedDate) lines.push(`사업개시일: ${c.establishedDate}`);
  if (c.employeeCount) lines.push(`상시근로자 수: ${c.employeeCount}명`);
  if (c.businessAddress) lines.push(`사업장 주소: ${c.businessAddress}`);
  if (c.officeOwnership) lines.push(`사업장 임대여부: ${c.officeOwnership === 'own' ? '자가' : '임대'}`);
  if (c.officeOwnership === 'lease') {
    if (c.deposit) lines.push(`보증금: ${formatAmountKorean(c.deposit)}`);
    if (c.monthlyRent) lines.push(`월임대료: ${formatAmountKorean(c.monthlyRent)}`);
  }

  // 2. 대표자 정보
  lines.push("\n=== 대표자 정보 ===");
  if (c.representativeName) lines.push(`대표자명: ${c.representativeName}`);
  if (c.education) lines.push(`최종학력: ${c.education}`);
  if (c.major) lines.push(`전공: ${c.major}`);
  if (c.career1) lines.push(`경력사항 1: ${c.career1}`);
  if (c.career2) lines.push(`경력사항 2: ${c.career2}`);
  if (c.homeOwnership) lines.push(`거주지 상태: ${c.homeOwnership === 'own' ? '자가' : '임대'}`);

  // 3. 신용정보
  lines.push("\n=== 대표자 신용정보 ===");
  if (c.hasFinancialDelinquency) lines.push(`금융연체여부: ${c.hasFinancialDelinquency === 'yes' ? '있음' : '없음'}`);
  if (c.hasTaxDelinquency) lines.push(`세금체납여부: ${c.hasTaxDelinquency === 'yes' ? '있음' : '없음'}`);
  if (c.kcbScore) lines.push(`KCB 신용점수: ${c.kcbScore}점`);
  if (c.niceScore) lines.push(`NICE 신용점수: ${c.niceScore}점`);
  const kcb = parseInt(c.kcbScore || '0');
  const nice = parseInt(c.niceScore || '0');
  const avg = kcb && nice ? Math.round((kcb + nice) / 2) : kcb || nice;
  if (avg > 0) {
    const grade = avg >= 900 ? '1등급' : avg >= 800 ? '2등급' : avg >= 700 ? '3등급' : avg >= 600 ? '4등급' : '5등급 이하';
    lines.push(`신용등급(추정): ${grade} (평균 ${avg}점)`);
  }
  const delinquent = c.hasFinancialDelinquency === 'yes' || c.hasTaxDelinquency === 'yes';
  lines.push(`정책자금 신청 적격 여부: ${delinquent ? '검토 필요 (금융/세금 이력 확인 필요)' : '적격'}`);

  // 4. 매출현황
  lines.push("\n=== 매출현황 ===");
  // 금년 매출 → 예상 매출 자동 계산: (금년 매출 / 경과월수) * 12
  if (c.currentYearSales) {
    const rawSales = parseFloat(c.currentYearSales.replace(/[^\d.]/g, ''));
    const now = new Date();
    const elapsedMonths = now.getMonth(); // 0-based: 1월=0, 4월=3 → 전월까지 마감된 월수
    if (elapsedMonths > 0 && rawSales > 0) {
      const estimatedAnnual = Math.round((rawSales / elapsedMonths) * 12);
      lines.push(`금년 매출(현재까지): ${formatAmountKorean(c.currentYearSales)}`);
      lines.push(`금년 예상 매출(${elapsedMonths}개월 기준 연간 환산): ${formatAmountKorean(String(estimatedAnnual))}`);
    } else {
      lines.push(`금년 매출: ${formatAmountKorean(c.currentYearSales)}`);
    }
  }
  if (c.year25Sales) lines.push(`2025년 매출: ${formatAmountKorean(c.year25Sales)}`);
  if (c.year24Sales) lines.push(`2024년 매출: ${formatAmountKorean(c.year24Sales)}`);
  if (c.year23Sales) lines.push(`2023년 매출: ${formatAmountKorean(c.year23Sales)}`);
  if (c.hasExportSales === 'yes') {
    lines.push(`수출매출: 있음`);
    if (c.currentYearExport) {
      const rawExport = parseFloat(c.currentYearExport.replace(/[^\d.]/g, ''));
      const now2 = new Date();
      const elapsedMonths2 = now2.getMonth();
      if (elapsedMonths2 > 0 && rawExport > 0) {
        const estimatedExport = Math.round((rawExport / elapsedMonths2) * 12);
        lines.push(`금년 수출액(현재까지): ${formatAmountKorean(c.currentYearExport)}`);
        lines.push(`금년 예상 수출액(연간 환산): ${formatAmountKorean(String(estimatedExport))}`);
      } else {
        lines.push(`금년 수출액: ${formatAmountKorean(c.currentYearExport)}`);
      }
    }
    if (c.year25Export) lines.push(`2025년 수출액: ${formatAmountKorean(c.year25Export)}`);
    if (c.year24Export) lines.push(`2024년 수출액: ${formatAmountKorean(c.year24Export)}`);
    if (c.year23Export) lines.push(`2023년 수출액: ${formatAmountKorean(c.year23Export)}`);
  }
  if (c.hasPlannedExport === 'yes') lines.push(`수출 예정: 있음`);

  // 5. 부채현황
  const debtFields = [
    { key: c.jungJinGong, label: '중진공' },
    { key: c.soJinGong, label: '소진공' },
    { key: c.sinbo, label: '신보' },
    { key: c.gibo, label: '기보' },
    { key: c.jaedan, label: '재단' },
    { key: c.companyCollateral, label: '회사담보' },
    { key: c.ceoCredit, label: '대표신용' },
    { key: c.ceoCollateral, label: '대표담보' },
  ].filter(f => f.key && f.key.trim() !== '' && f.key !== '0');
  if (debtFields.length > 0) {
    lines.push("\n=== 부채현황 ===");
    debtFields.forEach(f => lines.push(`${f.label}: ${formatAmountKorean(f.key)}`));
    const totalDebt = debtFields.reduce((sum, f) => {
      const num = parseInt((f.key || '').replace(/,/g, '')) || 0;
      return sum + num;
    }, 0);
    if (totalDebt > 0) lines.push(`총 부채(추정): ${formatAmountKorean(totalDebt)}`);
  }

  // 6. 보유 인증
  const certs: string[] = [];
  if (c.hasSMECert) certs.push('중소기업확인서(소상공인)');
  if (c.hasStartupCert) certs.push('창업확인서');
  if (c.hasWomenBizCert) certs.push('여성기업확인서');
  if (c.hasInnobiz) certs.push('이노비즈');
  if (c.hasVentureCert) certs.push('벤처인증');
  if (c.hasRootBizCert) certs.push('뿌리기업확인서');
  if (c.hasISO) certs.push('ISO인증');
  if (c.hasHACCP) certs.push('HACCP인증');
  if (certs.length > 0) {
    lines.push("\n=== 보유 인증 ===");
    lines.push(`인증 목록: ${certs.join(', ')}`);
  }

  // 7. 특허 및 정부지원
  lines.push("\n=== 특허 및 정부지원 ===");
  if (c.hasPatent === 'yes') {
    lines.push(`특허 보유: 있음 (${c.patentCount || '?'}건)`);
    if (c.patentDetails) lines.push(`특허 상세: ${c.patentDetails}`);
  } else {
    lines.push(`특허 보유: 없음`);
  }
  if (c.hasGovSupport === 'yes') {
    lines.push(`정부지원 수혜이력: 있음 (${c.govSupportCount || '?'}건)`);
    if (c.govSupportDetails) lines.push(`수혜 사업 상세: ${c.govSupportDetails}`);
  } else {
    lines.push(`정부지원 수혜이력: 없음`);
  }

  // 8. 비즈니스 상세
  lines.push("\n=== 비즈니스 상세 정보 ===");
  if (c.coreItem) lines.push(`핵심 아이템: ${c.coreItem}`);
  if (c.salesRoute) lines.push(`판매 루트(유통망): ${c.salesRoute}`);
  if (c.competitiveness) lines.push(`경쟁력 및 차별성: ${c.competitiveness}`);
  if (c.marketStatus) lines.push(`시장 현황: ${c.marketStatus}`);
  if (c.processDetail) lines.push(`공정도: ${c.processDetail}`);
  if (c.targetCustomer) lines.push(`타겟 고객: ${c.targetCustomer}`);
  if (c.revenueModel) lines.push(`수익 모델: ${c.revenueModel}`);
  if (c.futurePlan) lines.push(`앞으로의 계획: ${c.futurePlan}`);

  // 9. 자금 계획
  if (c.requiredFunding || c.fundingPlanDetail || c.fundingTypeOperating || c.fundingTypeFacility || (c.fundingType && c.fundingType.length > 0)) {
    lines.push("\n=== 자금 계획 ===");
    if (c.requiredFunding) lines.push(`이번 조달 필요 자금: ${formatAmountKorean(c.requiredFunding)}`);
    // 새 fundingType 배열 방식 우선, 없으면 호환성 필드 사용
    const fundingTypes: string[] = c.fundingType && c.fundingType.length > 0
      ? c.fundingType
      : [
          ...(c.fundingTypeOperating === 'yes' ? ['운전자금'] : []),
          ...(c.fundingTypeFacility === 'yes' ? ['시설자금'] : []),
        ];
    if (fundingTypes.length > 0) lines.push(`자금 종류: ${fundingTypes.join(', ')}`);
    if (c.fundingPlanDetail) lines.push(`자금 상세 사용 계획: ${c.fundingPlanDetail}`);
  }

  // 10. 컨설턴트 메모
  if (c.memo) {
    lines.push("\n=== 컨설턴트 메모 ===");
    lines.push(c.memo);
  }

  return lines.join('\n');
}

// AI 응답 텍스트 파싱 헬퍼
function sanitizeForJSON(text: string): string {
  // JSON 문자열 값 내부의 제어 문자(탭, 줄바꿈 등)를 이스케이프 처리
  // JSON 구조 외부의 불필요한 텍스트 제거 후 파싱 시도
  return text
    .replace(/\r\n/g, '\\n')  // Windows 줄바꿈
    .replace(/\r/g, '\\n')    // 구형 Mac 줄바꿈
    // JSON 구조 내부의 실제 줄바꿈만 이스케이프 (문자열 값 안의 줄바꿈)
    .replace(/(?<!\\)\n(?=[^"]*"(?:[^"\\]|\\.)*"(?:[^"]*"(?:[^"\\]|\\.)*")*[^"]*$)/g, '\\n');
}

function parseAIResponse(result: Awaited<ReturnType<typeof invokeLLM>>) {
  const responseText = result.choices[0]?.message?.content;
  const textContent = typeof responseText === "string"
    ? responseText
    : Array.isArray(responseText)
      ? responseText.filter((c): c is import("./_core/llm").TextContent => c.type === "text").map(c => c.text).join("")
      : "";

  // JSON 블록 추출 (```json ... ``` 또는 { ... } 형태)
  const extractJSON = (text: string): string => {
    // ```json ... ``` 코드 블록 제거
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();
    // { ... } 블록 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];
    return text;
  };

  // JSON 문자열 내부의 제어 문자 정리
  const cleanControlChars = (text: string): string => {
    // JSON 문자열 값 내부의 리터럴 제어 문자를 이스케이프 시퀀스로 변환
    let result = '';
    let inString = false;
    let escaped = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (escaped) {
        result += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        result += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        result += ch;
        continue;
      }
      if (inString) {
        // 문자열 내부의 제어 문자 처리
        const code = ch.charCodeAt(0);
        if (code === 0x0A) { result += '\\n'; continue; }  // 줄바꿈
        if (code === 0x0D) { result += '\\r'; continue; }  // 캐리지 리턴
        if (code === 0x09) { result += '\\t'; continue; }  // 탭
        if (code < 0x20) { result += '\\u' + code.toString(16).padStart(4, '0'); continue; }  // 기타 제어문자
      }
      result += ch;
    }
    return result;
  };

  const jsonText = extractJSON(textContent);
  const cleaned = cleanControlChars(jsonText);

  // AI 응답에서 '---' 셀 제거 후처리
  const removeDashCells = (obj: unknown): unknown => {
    if (Array.isArray(obj)) return obj.map(removeDashCells);
    if (obj && typeof obj === 'object') {
      const o = obj as Record<string, unknown>;
      // content 문자열에서 '---'만 있는 표 행 제거
      if (typeof o.content === 'string') {
        o.content = o.content
          .split('\n')
          .filter((line: string) => {
            // |---|---| 형태의 구분선 행 제거
            if (/^\|[\s\-|]+\|$/.test(line.trim())) return false;
            // 모든 셀이 '---'만인 행 제거
            if (/^\|/.test(line)) {
              const cells = line.split('|').filter((c: string) => c.trim() !== '');
              if (cells.length > 0 && cells.every((c: string) => /^\s*-{2,}\s*$/.test(c))) return false;
            }
            return true;
          })
          .join('\n');
      }
      for (const key of Object.keys(o)) {
        o[key] = removeDashCells(o[key]);
      }
    }
    return obj;
  };

    try {
      return removeDashCells(JSON.parse(cleaned));
    } catch {
      // 마지막 시도: 원본 텍스트에서 직접 파싱
      try {
        return JSON.parse(textContent);
      } catch {
        // 3차 시도: JSON 끝부분 잘린 경우 복구 시도
        try {
          const truncated = cleaned.replace(/,\s*$/, '').replace(/,\s*"[^"]*"\s*:\s*[^,}]*$/, '');
          const fixed = truncated + (truncated.match(/\{[^}]*$/) ? '}' : '') + (truncated.match(/\[[^\]]*$/) ? ']' : '');
          return JSON.parse(fixed);
        } catch {
          // 재시도 가능한 에러임을 명시 (클라이언트에서 자동 재시도 처리)
          throw new Error("AI 응답 파싱에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
      }
    }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    getApiKey: approvedProcedure.query(async ({ ctx }) => {
      const key = await getUserApiKey(ctx.user!.id);
      // 보안을 위해 키를 마스킹하여 반환 (sk-...XXXX 형태)
      if (!key) return { hasKey: false, maskedKey: null };
      const masked = key.length > 8 ? key.slice(0, 7) + '...' + key.slice(-4) : '***';
      return { hasKey: true, maskedKey: masked };
    }),
    saveApiKey: approvedProcedure
      .input(z.object({ apiKey: z.string().nullable() }))
      .mutation(async ({ ctx, input }) => {
        const key = input.apiKey;
        // 빈 문자열이면 null로 저장 (삭제)
        const normalized = key && key.trim().length > 0 ? key.trim() : null;
        if (normalized && !normalized.startsWith('sk-')) {
          throw new Error('OpenAI API 키는 sk-로 시작해야 합니다.');
        }
        await updateUserApiKey(ctx.user!.id, normalized);
        return { success: true };
      }),
    getGeminiApiKey: approvedProcedure.query(async ({ ctx }) => {
      const key = await getUserGeminiApiKey(ctx.user!.id);
      if (!key) return { hasKey: false, maskedKey: null };
      const masked = key.length > 8 ? key.slice(0, 8) + '...' + key.slice(-4) : '***';
      return { hasKey: true, maskedKey: masked };
    }),
    saveGeminiApiKey: approvedProcedure
      .input(z.object({ apiKey: z.string().nullable() }))
      .mutation(async ({ ctx, input }) => {
        const key = input.apiKey;
        const normalized = key && key.trim().length > 0 ? key.trim() : null;
        if (normalized && !normalized.startsWith('AIza')) {
          throw new Error('Gemini API 키는 AIza로 시작해야 합니다.');
        }
        await updateUserGeminiApiKey(ctx.user!.id, normalized);
        return { success: true };
      }),
  }),

  reports: router({
    generateDiagnosis: approvedProcedure
      .input(
        z.object({
          companyData: companyDetailSchema,
          selectedAreas: z.array(z.string()),
          additionalNotes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userApiKey = await getUserApiKey(ctx.user!.id).catch(() => null);
        const userGeminiKey = await getUserGeminiApiKey(ctx.user!.id).catch(() => null);
        const companyContext = buildCompanyContext(input.companyData);
        const areasText = input.selectedAreas.join(", ");

        // ── 공통 지침 (모든 그룹 프롬프트에 포함) ──────────────────────────────
        const commonDiagContext = `## 기업 데이터
${companyContext}

## 진단 요청 영역
${areasText}
${input.additionalNotes ? `\n## 추가 요청사항\n${input.additionalNotes}` : ''}

## 필수 작성 지침
1. 위 기업 데이터에 기반한 구체적이고 맞춤화된 분석 제공 - 기업명, 업종, 매출, 직원수 등 실제 데이터를 모든 섹션에 녹여낼 것
2. 매출 추이, 부채 현황, 신용 상태, 인증 보유 현황 등 실제 수치를 반드시 표와 함께 제시
3. 정책자금 신청 적격 여부를 고려한 실질적 권고사항 포함 (신보/기보/중진공/소진공 각 기관 기준 명시)
4. 컨설턴트 메모에 언급된 특이사항 반드시 반영
5. 금액은 반드시 한글 단위 사용 (예: 3억 7천만원, 150억원)
6. 모든 문장 종결어미는 간결형 (~있음, ~됨, ~필요, ~예상됨, ~분석됨)
7. content: 소제목(###) 3~4개, 각 소제목 아래 2~3문단 + 불릿/표, 블록인용(>) 2개 이상, 각 섹션 반드시 1200자 이상
8. 표 데이터 행에 '---'만 있는 셀 절대 금지
9. chartData: type/title/labels/values 필드 반드시 포함, values는 양수 정수
10. 각 섹션은 반드시 구체적 수치, 비교 데이터, 실행 가능한 권고사항 포함 (추상적 표현 절대 금지)
11. 업종 관련 최신 시장 동향, 정부 정책, 지원 제도 등 외부 데이터 적극 활용
12. 동종업계 평균 데이터와 비교 분석 반드시 포함
13. 각 섹션은 실제 현장 경험 20년의 컨설턴트가 직접 작성한 수준의 깊이와 전문성 유지
14. 단순 나열이 아닌 분석→원인→결론→권고 흐름으로 작성`;

        // ── 그룹별 섹션 프롬프트 생성 함수 ──────────────────────────────────
        const makeDiagGroupPrompt = (sections: string, jsonTemplate: string) =>
          `당신은 20년 경력의 전문 경영컨설턴트입니다. 경영진단보고서의 일부 섹션을 작성하세요.

${commonDiagContext}

## 작성할 섹션
${sections}

다음 JSON 형식으로만 응답하세요:
${jsonTemplate}

반드시 유효한 JSON 형식으로만 응답하세요.`;

        // ── 그룹 1: 경영진단 개요 + 기업현황 + 진단영역 (3개 섹션) ──────────
        const diagGroup1Prompt = makeDiagGroupPrompt('경영진단 개요, 기업 현황 분석, 진단 영역별 심층 분석',
`{
  "sections": [
    {"title": "경영진단 개요", "content": "[마크다운 반드시 1200자 이상: ### 진단 배경 및 목적 (기업명·업종·설립연도·직원수·주요제품 포함, 진단 의뢰 배경 및 현재 경영 상황 3문단 상세 기술, 업종 내 위치와 경쟁력 평가) / ### 기업 핵심 현황 요약 (매출·부채·신용상태·인증현황·직원수·주요제품·수출여부·특허현황 포함 8행 이상 표, 각 항목별 평가 코멘트 포함) / ### 업종 환경 개요 및 시장 동향 (해당 업종 국내외 시장 규모·성장률·주요 정부 지원 정책·경쟁 구도 외부 데이터 활용 3문단, 업종 특유 리스크 및 기회 요인 분석) / ### 진단 범위 및 평가 방법론 (진단 5개 영역별 평가 방법, 진단 결과 활용 방안) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "doughnut", "title": "진단 영역 분포", "labels": ["재무", "영업/마케팅", "운영/인력", "기술/인증"], "values": [30, 25, 25, 20]}},
    {"title": "기업 현황 분석", "content": "[마크다운 반드시 1200자 이상: ### 재무 현황 3개년 추이 분석 (연도별 매출·영업이익·부채비율·유동비율·순이익 포함 5열 표, 실제 수치 기반 추이 분석 3문단, 동종업계 평균 대비 강약점 평가) / ### 경영 자원 현황 종합 (인력구성·보유인증·특허·주요 거래체·핵심 역량·설비현황 불릿 목록 10개 이상, 각 자원의 경쟁력 기여도 평가) / ### 업종 벤치마크 비교 (동종업계 평균 대비 당사 재무비율·매출성장률·수익성 비교표, 강점 강화 및 약점 보완 방안 2문단) / ### 시장 내 위상 및 경쟁력 평가 (주요 경쟁사 대비 차별화 요소, 시장 점유율 추정, 성장 가능성 평가) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "bar", "title": "연도별 매출 추이 (만원)", "labels": ["23년", "24년", "25년"], "values": [5000, 8000, 12000]}},
    {"title": "진단 영역별 심층 분석", "content": "[마크다운 반드시 1200자 이상: ### 진단 영역별 종합 평가 (재무·영업·운영·기술·리스크 5개 영역 점수·강점·약점·개선방향·우선순위 포함 5열 표, 각 영역 평가 근거 상세 서술) / ### 영역별 세부 분석 (각 영역별 핵심 현황·문제점·원인·대응방안 불릿, 영역당 3개 이상 항목, 실제 수치 근거 포함) / ### 핵심 과제 우선순위 매트릭스 (즉시/단기/중기 과제 구분 표, 각 과제 예상기간·담당·예산·기대효과 포함) / ### 업종 특유 성공요인 및 시사점 (해당 업종에서 성공한 기업들의 공통점, 당사가 벤치마크해야 할 요소) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "bar", "title": "영역별 평가 점수 (100점)", "labels": ["재무", "영업/마케팅", "운영/인력", "기술/인증", "리스크관리"], "values": [75, 65, 70, 80, 60]}}
  ]
}`);

        // ── 그룹 2: 신용금융 + 핵심문제 + 개선방향 (3개 섹션) ──────────────
        const diagGroup2Prompt = makeDiagGroupPrompt('신용 및 금융 현황, 핵심 문제점 및 리스크, 개선 방향 및 권고사항',
`{
  "sections": [
    {"title": "신용 및 금융 현황", "content": "[마크다운 반드시 1200자 이상: ### 신용 현황 상세 분석 (KCB/NICE 신용점수·등급·연체이력·체납이력·대출 현황 포함 상세 표, 신용등급별 정책자금 신청 가능 여부 평가, 신용 상태 개선 시 기대 효과 3문단) / ### 부채 구조 및 상환 능력 심층 분석 (부채 종류별 구성비율 표, 이자보상배율·부채비율·유동비율 수치 분석, 상환 능력 평가 및 위험 신호 3문단) / ### 정책자금 활용 가능성 심층 평가 (기보/신보/소진공/중진공 각 기관별 신청 가능 여부·한도·금리·주요 요건 상세 표, 신용점수 기반 최적 신청 경로 권고 3문단) / ### 신용 개선 로드맵 (현재 점수 기준 단계별 목표 점수·예상 기간·실행 방법 표) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "doughnut", "title": "부채 구성", "labels": ["정책자금", "신용대출", "담보대출", "기타"], "values": [35, 30, 25, 10]}},
    {"title": "핵심 문제점 및 리스크", "content": "[마크다운 반드시 1200자 이상: ### 재무적 리스크 심층 분석 (유동성 위기·부채과다·수익성 저하·매출 집중 리스크 등 구체적 수치 근거 불릿 7개 이상, 각 리스크별 심각도·발생가능성·영향도 평가) / ### 사업적 리스크 종합 분석 (시장 경쟁·고객 집중·인력 의존·기술 노화·공급망 리스크 등 유형·수준·대응방안 포함 상세 표, 각 리스크 대응 실행 방안 3문단) / ### 업종 특유 외부 위협 및 환경 분석 (정부 규제 변화·원자재 가격·경제 슬럼프·기술 변화 등 업종 특유 외부 위협 3문단, PEST 분석 프레임워크 활용) / ### 리스크 관리 우선순위 매트릭스 (영향도×발생가능성 기준 우선순위 표, 즉시 대응 vs 모니터링 구분) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "bar", "title": "리스크 수준 평가 (점수)", "labels": ["재무리스크", "시장리스크", "운영리스크", "인력리스크"], "values": [70, 55, 45, 40]}},
    {"title": "개선 방향 및 권고사항", "content": "[마크다운 반드시 1200자 이상: ### 단기 개선 방향 (1~6개월 실행 가능한 구체적 과제 7개 이상 번호목록, 각 과제에 담당·예상기간·필요자원·예산·기대효과 포함, 실행 시 예상 성과 수치 명시) / ### 중장기 전략 방향 (단계별 전략 목표·기대성과·실행방안·예산 포함 상세 표, 단계별 성과 지표 KPI 설정 3문단) / ### 정책자금 활용 실질 권고 (신청 가능 정책자금 종류·한도·금리·주요 요건·신청 시기 상세 표, 신청 절차 및 준비 서류 안내 3문단) / ### 실행 로드맵 요약 (월별 주요 실행 일정표, 우선순위 구분) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "bar", "title": "개선 과제 우선순위 (점수)", "labels": ["재무구조개선", "영업력강화", "인력관리", "마케팅강화", "기술개발"], "values": [90, 80, 70, 65, 55]}}
  ]
}`);

        // ── 그룹 3: 실행계획(로드맵) + 결론 + 컨설턴트조언 (3개 섹션) ───────
        const diagGroup3Prompt = makeDiagGroupPrompt('실행 계획 (로드맵), 결론 및 종합 의견, 컨설턴트 실질 조언 및 참고 메모',
`{
  "sections": [
    {"title": "실행 계획 (로드맵)", "content": "[마크다운: ### 단계별 실행 로드맵 개요(4단계 설명) / ### 핵심 성과 지표 KPI(표) - 블록인용 1개]", "chartData": {"type": "line", "title": "예상 성과 달성률 (%)", "labels": ["1개월", "3개월", "6개월", "9개월", "12개월"], "values": [10, 30, 55, 75, 100]}, "roadmapData": {"columns": ["1단계\n(1~3개월)", "2단계\n(4~6개월)", "3단계\n(7~12개월)", "4단계\n(1~2년)"], "rows": [{"area": "재무/자금", "color": "#3B82F6", "cells": [{"phase": "즉시 개선", "items": ["[재무 즉시 개선 과제]", "[자금 조달 준비]"]}, {"phase": "구조 개선", "items": ["[정책자금 신청]", "[부채 구조 개선]"]}, {"phase": "건전성 강화", "items": ["[수익성 개선]", "[재무 안정화]"]}, {"phase": "성장 투자", "items": ["[성장 자금 확보]", "[재무 목표 달성]"]}]}, {"area": "영업/마케팅", "color": "#10B981", "cells": [{"phase": "기반 정비", "items": ["[영업 채널 점검]", "[고객 데이터 정비]"]}, {"phase": "강화 추진", "items": ["[신규 고객 확보]", "[마케팅 활동 강화]"]}, {"phase": "성과 창출", "items": ["[매출 목표 달성]", "[고객 만족도 향상]"]}, {"phase": "시장 확대", "items": ["[시장 점유율 확대]", "[브랜드 강화]"]}]}, {"area": "운영/인력", "color": "#8B5CF6", "cells": [{"phase": "현황 파악", "items": ["[프로세스 점검]", "[인력 현황 파악]"]}, {"phase": "개선 실행", "items": ["[핵심 인력 확보]", "[운영 효율화]"]}, {"phase": "역량 강화", "items": ["[교육/훈련]", "[성과 관리 체계]"]}, {"phase": "조직 완성", "items": ["[목표 인원 달성]", "[성과 문화 정착]"]}]}, {"area": "인증/정책지원", "color": "#F59E0B", "cells": [{"phase": "준비", "items": ["[신청 가능 정책자금 파악]", "[인증 취득 준비]"]}, {"phase": "신청/취득", "items": ["[정책자금 신청]", "[인증 취득]"]}, {"phase": "활용", "items": ["[정책자금 집행]", "[인증 활용 영업]"]}, {"phase": "확대", "items": ["[추가 지원 확보]", "[인증 갱신/추가]"]}]}]}},
    {"title": "결론 및 종합 의견", "content": "[마크다운 반드시 1200자 이상: ### 종합 평가 (재무·영업·운영·기술·리스크 5개 영역 점수·강점·약점·개선방향·우선순위 포함 5열 표, 각 영역 평가 근거 상세 서술, 전체 종합 평가 엄주평 3문단) / ### 권고사항 이행 시 기대 효과 (단기·중기·장기 기대 성과 수치 포함 상세 표, 이행 전후 재무 지표 비교 예시, 이행 로드맵 요약 3문단) / ### 컨설턴트 최종 의견 (기업의 성장 가능성 평가·핵심 성공 요인·주의 사항·최우선 실행 과제 3문단) / ### 다음 단계 액션 플랜 (이번 달 내 실행 과제 3가지·다음 분기 목표·컨설턴트 후속 지원 방안) - 블록인용 2개 필수, 반드시 1200자 이상]","chartData": {"type": "doughnut", "title": "종합 평가 분포", "labels": ["강점영역", "개선필요", "위험요인"], "values": [55, 30, 15]}},
    {"title": "컨설턴트 실질 조언 및 참고 메모", "content": "[마크다운으로 아래 모든 항목을 반드시 포함하여 2000자 이상 작성:\n### 특허·인증 전략 실질 조언\n- 보유 특허/인증 현황 분석 및 기보 기술평가 활용 방안 (기보 기술평가보증 신청 시 보증료 0.5% 감면, 한도 최대 30억원 등 구체 수치 포함)\n- 벤처·이노비즈 인증 취득 로드맵 (취득 시 정책자금 우대금리 연 0.3~0.5%p 인하, 법인세 50% 감면(5년간), 취득세 75% 감면 등 혜택 명시)\n- 추가 특허 출원 전략 및 R&D 바우처 연계 방안\n### 수출 진출 전략 실질 조언\n- 업종 특성에 맞는 수출 가능성 분석 및 단계적 전략\n- KOTRA 시장조사 지원(무료) 활용 후 수출바우처 신청(최대 1억원) 절차\n- 수출 초기 단계 리스크 관리 및 해외 바이어 발굴 방법\n### 마케팅·영업 채널 실질 조언\n- B2B 플랫폼(기업마당·조달청 나라장터) 등록 전략 및 기대 효과\n- 소상공인시장진흥공단 마케팅 지원사업(최대 500만원, 자부담 20%) 활용 방안\n- 제조업 전시회 참가 지원(건당 최대 500만원) 연계 전략\n### 정책자금 신청 전략 실질 조언\n- 기업 신용점수 기반 신청 가능 기관 분석 (신보 700점, 기보 700점, 중진공 830점 기준 명시)\n- 희망 자금 규모별 최적 신청 경로 (기보→소진공→은행권 단계적 조달)\n- 운전자금 대출 기간(통상 1년, 연장 가능) 및 시설자금(5~10년 분할 상환) 조건 명시\n### 신용 개선 로드맵\n- 현재 신용점수 기준 단계별 목표 및 예상 기간 (예: 740점→800점 12~18개월, 800점→830점 18~24개월)\n- 신용카드 실적 적립, 부동산 담보 대출 유지, 신규 연체 방지 등 구체 실행 방법\n- 신보 신청 가능 수준 도달 후 중진공 직접대출 신청 전략\n### 시급 이슈 및 즉시 실행 사항\n- 이번 달 내 즉시 실행해야 할 최우선 과제 3가지 (구체적 액션 아이템)\n- 3개월 내 완료해야 할 중기 과제 (준비 서류, 신청 기관, 예상 일정)\n- 컨설턴트 최종 총평 및 성공 가능성 평가\n> 블록인용으로 핵심 전략 메시지 2개 이상 포함]", "chartData": {"type": "bar", "title": "전략 우선순위 평가", "labels": ["특허/인증", "수출진입", "마케팅강화", "정책자금"], "values": [85, 70, 80, 90]}}
  ]
}`);

        // ── 3그룹 병렬 분할 생성 ─────────────────────────────────────────────────────
        const callDiagGroup = async (groupPrompt: string, maxTok: number, groupName = '') => {
          let lastErr: Error | null = null;
          const maxAtt = 5;
          for (let attempt = 0; attempt < maxAtt; attempt++) {
            try {
              const result = await invokeLLM({
                messages: [{ role: "user", content: [{ type: "text", text: groupPrompt }] }],
                userApiKey,
                userGeminiKey,
                maxTokens: maxTok,
                responseFormat: { type: 'json_object' }, // Gemini에게 순수 JSON만 반환하도록 강제
              });
              return parseAIResponse(result) as { sections: Array<Record<string, unknown>> };
            } catch (err) {
              lastErr = err instanceof Error ? err : new Error(String(err));
              if (attempt < maxAtt - 1) {
                const delay = Math.min(2000 * Math.pow(2, attempt), 12000);
                console.log(`[Diagnosis${groupName}] 시도 ${attempt + 1} 실패, ${delay}ms 후 재시도... 에러: ${lastErr.message}`);
                await new Promise(r => setTimeout(r, delay));
              }
            }
          }
          throw lastErr ?? new Error('AI 응답 생성에 실패했습니다.');        };

        // ── 비동기 백그라운드 실행 (Railway 타임아웃 우회) ──────────────────
        const jobId = `diag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const job: DiagJob = {
          id: jobId,
          status: 'running',
          progress: 5,
          step: '재무 지표 분석 중...',
          createdAt: Date.now(),
        };
        diagJobs.set(jobId, job);

        // 백그라운드에서 비동기 실행 (await 없이)
        (async () => {
          try {
            job.step = '재무 지표 분석 중...';
            job.progress = 10;

            // 3그룹 병렬 실행
            job.step = 'AI 경영진단 분석 중 (1/3)...';
            job.progress = 20;
            const dg1 = await callDiagGroup(diagGroup1Prompt, 8000, 'G1');

            job.step = 'AI 경영진단 분석 중 (2/3)...';
            job.progress = 50;
            const dg2 = await callDiagGroup(diagGroup2Prompt, 8000, 'G2');

            job.step = 'AI 경영진단 분석 중 (3/3)...';
            job.progress = 75;
            const dg3 = await callDiagGroup(diagGroup3Prompt, 8000, 'G3');

            job.step = '보고서 최종 정리 중...';
            job.progress = 90;

            // 섹션 병합
            const allDiagSections = [
              ...(dg1.sections ?? []),
              ...(dg2.sections ?? []),
              ...(dg3.sections ?? []),
            ];
            const diagTitle = `경영진단보고서 - ${input.companyData.name}`;
            const parsed = {
              title: diagTitle,
              sections: allDiagSections,
              companySummary: buildCompanySummary(input.companyData, 'diagnosis'),
            };

            job.result = parsed;
            job.status = 'done';
            job.progress = 100;
            job.step = '완료';
          } catch (err) {
            job.status = 'error';
            job.error = err instanceof Error ? err.message : String(err);
            job.step = '오류 발생';
            console.error('[DiagJob] 오류:', job.error);
          }
        })();

        return { success: true, jobId };
      }),

    getDiagnosisJob: approvedProcedure
      .input(z.object({ jobId: z.string() }))
      .query(({ input }) => {
        const job = diagJobs.get(input.jobId);
        if (!job) return { status: 'not_found' as const, progress: 0, step: '작업을 찾을 수 없습니다.' };
        return {
          status: job.status,
          progress: job.progress,
          step: job.step,
          result: job.result,
          error: job.error,
        };
      }),
    generateBusinessPlan: approvedProcedure
      .input(
        z.object({
          companyData: companyDetailSchema,
          planPeriod: z.string(),
          targetRevenue: z.string().optional(),
          growthRate: z.string().optional(),
          strategicDirection: z.string().optional(),
          additionalNotes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userApiKey = await getUserApiKey(ctx.user!.id).catch(() => null);
        const userGeminiKey = await getUserGeminiApiKey(ctx.user!.id).catch(() => null);
        const companyContext = buildCompanyContext(input.companyData);
        const currentYear = new Date().getFullYear();
        const year1 = currentYear;
        const year2 = currentYear + 1;
        const year3 = currentYear + 2;

        const year4 = year3 + 1;
        const year5 = year3 + 2;

        // ── 공통 지침 (모든 그룹 프롬프트에 포함) ──────────────────────────────
        const commonContext = `## 기업 데이터
${companyContext}

## 사업계획 요청
- 계획 기간: ${input.planPeriod}
${input.targetRevenue ? `- 목표 매출: ${input.targetRevenue}` : ''}
${input.growthRate ? `- 목표 성장률: ${input.growthRate}` : ''}
${input.strategicDirection ? `- 핵심 전략 방향: ${input.strategicDirection}` : ''}
${input.additionalNotes ? `- 추가 요청사항: ${input.additionalNotes}` : ''}

## 필수 작성 지침
1. 기업 실제 데이터 + 업종 외부 시장 데이터 결합하여 구체적으로 작성
2. content: 소제목(###) 3~4개, 각 소제목 아래 2~3문단 + 불릿/표, 블록인용(>) 1~2개
3. content 반드시 700자 이상 마크다운 텍스트 (내용이 꽉 차도록 풍성하게)
4. 구체적 수치 포함 필수 (%, 금액, 건수 등), 금액: 한글 단위, 문체: ~있음/~됨/~예상됨
5. 표 데이터 행에 '---'만 있는 셀 절대 금지
6. 각 섹션은 실제 컨설팅 보고서 수준의 전문성과 깊이로 작성
7. 업종 특성, 시장 트렌드, 경쟁 환경을 반드시 반영`;

        // ── 그룹별 섹션 프롬프트 생성 함수 ──────────────────────────────────
        const makeGroupPrompt = (groupNum: number, sections: string, jsonTemplate: string) =>
          `당신은 20년 경력의 전문 경영컨설턴트입니다. AI 사업계획서의 일부 섹션을 작성하세요.

${commonContext}

## 작성할 섹션 (${sections})

다음 JSON 형식으로만 응답하세요 (유효한 JSON, content는 풍부한 마크다운):
${jsonTemplate}`;

        // ── 그룹 1: 개요/시장/PEST/SWOT/경쟁 (5개 섹션) ──────────────────────────
        const group1Prompt = makeGroupPrompt(1, '사업 개요 및 비전, 시장 환경 분석, PEST 분석, SWOT 분석, 경쟁사 비교분석',
`{
  "sections": [
    {"title": "사업 개요 및 비전", "content": "[반드시 1200자 이상 마크다운: ### 기업 소개 및 핵심 역량 (기업명·업종·설립연도·직원수·주요제품·매출현황 포함, 업종 내 위치와 차별성 3문단) / ### 비전 및 미션 (장기 비전·미션·핵심 가치 명시, 비전 달성을 위한 전략 방향 3문단) / ### 사업 목표 (매출·이익·인력·시장점유율 3개년 수치 목표 포함 상세 표, 목표 달성 근거 및 전략 3문단) / ### 핵심 경쟁력 요약 (동종업계 대비 당사만의 차별화 요소 5개 이상 불릿, 경쟁력 수치화 근거 제시) - 상세 표 2개 이상, 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "doughnut", "title": "사업 목표 구성", "labels": ["매출성장", "신사업", "운영효율", "인재확보"], "values": [40, 25, 20, 15]}},    {"title": "시장 환경 분석", "content": "[반드시 1200자 이상 마크다운: ### 국내외 시장 규모 및 성장 전망 (반드시 아래 가로형 2행 표 포함: 1행=연도(| 구분 | ${year1}년 | ${year2}년 | ${year3}년 | ${year4}년 | ${year5}년 |), 2행=시장규모(| 시장규모(억원) | [실제 업종 시장 규모 추정치] | ... |) 형식, 시장 성장률 근거 3문단) / ### 주요 시장 트렌드 및 기회 요인 (업종 특유 메가트렌드 3개 이상, 정부 지원 정책 연계 기회, 각 트렌드별 당사 연계 방안) / ### 고객 세그먼트 분석 (주요 고객군별 규모·특성·요구사항·접근방법 표, 핵심 타겟 세그먼트 선정 근거) / ### 시장 진입 전략 (단계별 시장 진입 로드맵, 진입 장벽 분석 및 극복 방안) - 블록인용 2개 필수, 반드시 1200자 이상]","chartData": {"type": "line", "title": "시장 규모 성장 전망 (억원)", "labels": ["${year1}년", "${year2}년", "${year3}년", "${year4}년", "${year5}년"], "values": [1000, 1150, 1320, 1520, 1750]}},
    {"title": "PEST 분석", "content": "[반드시 1200자 이상 마크다운: ### 정치·규제 환경 (Political) (해당 업종 관련 정부 정책·규제 변화·지원 제도 기회요인과 위협요인 각 3개 이상, 정책자금 연계 기회 명시) / ### 경제 환경 (Economic) (국내 경제 성장률·금리·환율·소비자 심리 등 기회요인과 위협요인 각 3개 이상, 업종 특유 경제 영향 분석) / ### 사회·문화 환경 (Social) (인구구조 변화·소비 트렌드·생활방식 변화 등 기회요인과 위협요인 각 3개 이상, 당사 연계 방안) / ### 기술 환경 (Technological) (AI·디지털화·자동화 등 기술 변화 기회요인과 위협요인 각 3개 이상, 당사 기술 대응 전략) / ### PEST 종합 시사점 (업종에 가장 큰 영향을 미치는 요인 우선순위 표, 당사 대응 전략 요약) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "bar", "title": "PEST 요인 영향도 평가 (10점)", "labels": ["정치·규제", "경제", "사회·문화", "기술"], "values": [7, 8, 6, 9]}},
    {"title": "SWOT 분석", "content": "[반드시 1200자 이상 마크다운: ### 강점 (Strengths) (실제 기업 데이터 기반 강점 5개 이상, 각 강점별 수치 근거 제시) / ### 약점 (Weaknesses) (실제 데이터 기반 약점 5개 이상, 각 약점별 개선 방안) / ### 기회 (Opportunities) (업종 시장 기회 요인 5개 이상, 정부 지원 정책 연계 기회 포함) / ### 위협 (Threats) (업종 위협 요인 5개 이상, 각 위협별 대응 방안) / ### SO·ST·WO·WT 전략 도출 (각 전략 유형별 2개 이상 구체적 전략, 전략 매트릭스 표, 핵심 전략 우선순위 선정 근거) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "doughnut", "title": "SWOT 전략 우선순위", "labels": ["SO전략", "ST전략", "WO전략", "WT전략"], "values": [40, 25, 25, 10]}},
    {"title": "경쟁사 비교분석", "content": "[반드시 1200자 이상 마크다운: ### 주요 경쟁사 현황 (업종 내 주요 경쟁사 3개 이상 연매출·직원수·주요제품·시장점유율 포함 표) / ### 경쟁사 대비 종합 비교 (당사/경쟁사A/경쟁사B 주요제품·고객층·유통채널·가격대·품질인증·시장점유율·기술력·서비스 8개 이상 항목 비교표, 당사 우위 항목 강조 표시) / ### 경쟁 우위 확보 전략 (당사만의 차별화 요소 5개 이상 상세 서술, 각 차별화 요소별 수치 근거) / ### 포지셔닝 전략 (시장 내 당사 위치 설정, 타겟 고객층 접근 전략, 지속적 경쟁우위 유지 방안) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "bar", "title": "경쟁사 역량 비교 (5점 만점)", "labels": ["당사", "경쟁사A", "경쟁사B"], "values": [4.2, 3.5, 3.8]}}
  ]
}`);

        // ── 그룹 2: 전략/마케팅/운영/재무 (4개 섹션) ────────────────────────
        const group2Prompt = makeGroupPrompt(2, '핵심 사업 전략, 마케팅 및 영업 계획, 운영 및 조직 계획, 재무 계획 및 자금 조달',
`{
  "sections": [
    {"title": "핵심 사업 전략", "content": "[반드시 1200자 이상 마크다운: ### 전략 방향 및 핵심 가치 제안 (당사만의 독자적 가치 제안 3개 이상, 각 가치 제안별 고객 편익 수치화, 시장 차별화 전략 3문단) / ### 단기·중장기 전략 로드맵 (단계별 전략 목표·실행방안·예산·기대성과 포함 상세 표, 단계별 성과 KPI 설정) / ### 핵심 역량 강화 방안 (기술·인재·브랜드·네트워크 역량 강화 계획, 각 역량별 예산·기간·기대효과) / ### 전략 실행 우선순위 (영향도×실행가능성 기준 우선순위 매트릭스 표, 즉시 실행 vs 중장기 구분) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "bar", "title": "전략 우선순위 점수", "labels": ["기술개발", "시장확대", "원가절감", "고객확보"], "values": [85, 70, 60, 75]}},
    {"title": "마케팅 및 영업 계획", "content": "[반드시 1200자 이상 마크다운: ### 타겟 고객 및 시장 세분화 (주요 고객군별 규모·특성·구매의사결정요인·접근방법 상세 표, 핵심 타겟 세그먼트 선정 근거 3문단) / ### 마케팅 채널 전략 (온라인·오프라인·직접영업·파트너십 채널별 전략·예산·기대효과 포함 상세 표, 디지털 마케팅 세부 실행 계획) / ### 영업 프로세스 및 목표 (리드 발굴·제안·계약·유지 단계별 프로세스, 연간/분기/월별 영업 목표 수치 표) / ### 연도별 마케팅 예산 계획 (연도별 예산 배분표, ROI 예상 수치, 예산 집행 우선순위) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "pie", "title": "마케팅 예산 배분", "labels": ["디지털", "오프라인", "PR", "전시/행사"], "values": [45, 30, 15, 10]}},
    {"title": "운영 및 조직 계획", "content": "[반드시 1200자 이상 마크다운: ### 조직 구조 및 핵심 인력 계획 (현재 조직 구조 및 역할별 주요 업무 설명, 핵심 인력 포지션별 요구역량·채용 계획 표) / ### 연도별 채용 계획 (직무별·연도별 채용 인원·예산·주요 업무 상세 표, 인력 확보 전략 3문단) / ### 운영 프로세스 개선 방안 (현재 프로세스 문제점·개선 방안·기대효과 상세 표, 디지털화·자동화 연계 방안) / ### 생산성 향상 전략 (인력생산성·운영효율·원가절감 목표 수치 및 달성 방안, 성과관리 체계 구축 계획) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "bar", "title": "연도별 인력 계획 (명)", "labels": ["금년(${year1}년)", "${year2}년", "${year3}년"], "values": [5, 8, 12]}},
    {"title": "재무 계획 및 자금 조달", "content": "[반드시 1200자 이상 마크다운: ### 3개년 매출 목표 및 근거 (매출 목표 수치와 달성 근거 3문단, 연도별 매출 성장률 예상 근거 제시) / ### 손익 계획 (매출액·매출원가·매출이익·판관비·영업이익·순이익 3개년 상세 표, 수익성 개선 계획 3문단) / ### 자금 조달 계획 (정책자금·자체자금·투자유치 비율 및 각 조달체별 한도·금리·조건·신청 시기 상세 표, 자금 조달 전략 3문단) / ### 자금 집행 계획 (연도별 용도별 집행 계획 표, 시설자금·운전자금·연구개발금 용도별 집행 우선순위) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "line", "title": "매출 목표 추이 (만원)", "labels": ["금년(${year1}년)", "${year2}년", "${year3}년"], "values": [10000, 15000, 25000]}}
  ]
}`);

        // ── 그룹 3: 정부지원/리스크/실행로드맵 (3개 섹션) ──────────────────
        const group3Prompt = makeGroupPrompt(3, '정부지원 및 인증 활용 전략, 리스크 관리, 실행 로드맵',
`{
  "sections": [
    {"title": "정부지원 및 인증 활용 전략", "content": "[반드시 1200자 이상 마크다운: ### 활용 가능한 정책자금 현황 (기보·신보·중진공·소진공·은행권 신청 가능 정책자금 종류·한도·금리·주요 요건·신청 시기 상세 표, 신청 1순위 권고 3문단) / ### 인증 취득 전략 (벤처·이노비즈·메인비즈·ISO 인증 취득 시 혜택 상세 표, 취득 로드맵·소요 기간·준비 사항 3문단) / ### 정부 지원사업 신청 로드맵 (월별 신청 일정 표, 준비 서류 체크리스트) / ### 예상 지원 금액 및 활용 계획 (종류별 예상 지원 금액·활용 목적·집행 시기 표, 지원금 활용 우선순위) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "doughnut", "title": "자금 조달 구성", "labels": ["정책자금", "자체자금", "투자유치"], "values": [50, 35, 15]}},
    {"title": "리스크 관리", "content": "[반드시 1200자 이상 마크다운: ### 주요 리스크 유형 및 수준 평가 (재무·시장·운영·기술·인력·규제 리스크 유형별 심각도·발생가능성·영향도·대응방안 포함 매트릭스 표) / ### 리스크별 심층 분석 (각 리스크 유형별 발생 시나리오·예상 피해·조기 경보 신호·대응 실행 방안 3문단) / ### 리스크별 대응 전략 (즉시 대응 vs 예방 조치 구분, 각 리스크별 구체적 실행 방안 불릿) / ### 비상 계획 (Contingency Plan) (시나리오별 비상 대응 절차·담당자·예비 자금 표, 리스크 심화 시 사업 지속성 확보 방안) - 블록인용 2개 필수, 반드시 1200자 이상]", "chartData": {"type": "bar", "title": "리스크 수준 평가", "labels": ["시장", "재무", "기술", "인력", "규제"], "values": [60, 45, 35, 30, 25]}},
    {"title": "실행 로드맵", "content": "[반드시 400자 이상 마크다운: ### 로드맵 개요 (3개년 핵심 목표 및 단계별 전략 방향 설명) / ### 연도별 핵심 마일스톤 (각 연도별 달성 목표 3개 이상 불릿) - 블록인용 1개 필수]", "chartData": {"type": "line", "title": "마일스톤 달성률 (%)", "labels": ["Q1", "Q2", "Q3", "Q4"], "values": [15, 40, 70, 100]}, "roadmapData": {"columns": ["${year1}년", "${year2}년", "${year3}년"], "rows": [{"area": "매출/재무", "color": "#3B82F6", "cells": [{"phase": "기반 구축", "items": ["[${year1}년 매출 목표 달성 핵심 과제 - 기업 실제 데이터 기반 구체적 내용 작성]", "[자금 조달 및 재무 구조 개선 과제]"]}, {"phase": "성장 가속", "items": ["[${year2}년 매출 성장 전략 - 구체적 수치 포함]", "[수익성 개선 및 투자 계획]"]}, {"phase": "도약", "items": ["[${year3}년 목표 매출 달성 전략]", "[재무 건전성 완성 계획]"]}]}, {"area": "영업/마케팅", "color": "#10B981", "cells": [{"phase": "채널 정비", "items": ["[주요 영업 채널 구축 및 정비 과제]", "[핵심 고객 확보 전략]"]}, {"phase": "시장 확대", "items": ["[신규 시장 진출 전략]", "[마케팅 예산 및 채널 확대]"]}, {"phase": "시장 지배", "items": ["[시장 점유율 목표 달성 전략]", "[브랜드 강화 계획]"]}]}, {"area": "제품/서비스", "color": "#8B5CF6", "cells": [{"phase": "핵심 역량 강화", "items": ["[핵심 제품/서비스 품질 향상 과제]", "[기술 개발 및 특허 전략]"]}, {"phase": "라인업 확장", "items": ["[신제품/서비스 출시 계획]", "[R&D 투자 계획]"]}, {"phase": "포트폴리오 완성", "items": ["[제품/서비스 포트폴리오 완성 계획]", "[차세대 성장 동력 확보]"]}]}, {"area": "조직/인력", "color": "#F59E0B", "cells": [{"phase": "팀 정비", "items": ["[핵심 인력 채용 계획 - 직무/인원 명시]", "[조직 체계 정비 과제]"]}, {"phase": "역량 강화", "items": ["[직원 교육/훈련 계획]", "[성과 관리 체계 구축]"]}, {"phase": "조직 완성", "items": ["[목표 조직 규모 달성 계획]", "[조직 문화 및 성과 문화 정착]"]}]}, {"area": "정부지원/인증", "color": "#EF4444", "cells": [{"phase": "신청 준비", "items": ["[신청 가능 정책자금 파악 및 서류 준비]", "[인증 취득 준비 - 벤처/이노비즈 등]"]}, {"phase": "지원 활용", "items": ["[정책자금 신청 및 집행 계획]", "[인증 취득 및 영업 활용]"]}, {"phase": "지속 활용", "items": ["[추가 정부 지원 확보 전략]", "[인증 갱신 및 추가 취득 계획]"]}]}]}}
  ]
}`);

        // ── 3그룹 병렬 분할 생성 (각 그룹 15초 이내 완료 목표) ─────────────
        const callGroup = async (groupPrompt: string, maxTok: number, groupName = '') => {
          let lastErr: Error | null = null;
          const maxAtt = 5;
          for (let attempt = 0; attempt < maxAtt; attempt++) {
            try {
              const result = await invokeLLM({
                messages: [{ role: "user", content: [{ type: "text", text: groupPrompt }] }],
                userApiKey,
                userGeminiKey,
                maxTokens: maxTok,
                responseFormat: { type: 'json_object' }, // Gemini에게 순수 JSON만 반환하도록 강제
              });
              return parseAIResponse(result) as { sections: Array<Record<string, unknown>> };
            } catch (err) {
              lastErr = err instanceof Error ? err : new Error(String(err));
              if (attempt < maxAtt - 1) {
                const delay = Math.min(2000 * Math.pow(2, attempt), 12000);
                console.log(`[BusinessPlan${groupName}] 시도 ${attempt + 1} 실패, ${delay}ms 후 재시도... 에러: ${lastErr.message}`);
                await new Promise(r => setTimeout(r, delay));
              }
            }
          }
          throw lastErr ?? new Error('AI 응답 생성에 실패했습니다.');
        };

        // 3그룹 병렬 실행
        const [g1, g2, g3] = await Promise.all([
          callGroup(group1Prompt, 8000),
          callGroup(group2Prompt, 8000),
          callGroup(group3Prompt, 6000),
        ]);

        // 섹션 병합
        const allSections = [
          ...(g1.sections ?? []),
          ...(g2.sections ?? []),
          ...(g3.sections ?? []),
        ];

        const merged = {
          title: `AI 사업계획서 - ${input.companyData.name} (${input.planPeriod})`,
          sections: allSections,
          companySummary: buildCompanySummary(input.companyData, 'business_plan'),
        };

        return { success: true, data: merged };
      }),

    generateFundingMatch: approvedProcedure
      .input(
        z.object({
          companyData: companyDetailSchema,
          additionalNotes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userApiKey = await getUserApiKey(ctx.user!.id).catch(() => null);
        const userGeminiKey = await getUserGeminiApiKey(ctx.user!.id).catch(() => null);
        const c = input.companyData;
        const companyContext = buildCompanyContext(c);

        // 수치 계산 헬퍼
        const parseNum = (v?: string) => parseInt((v || '0').replace(/,/g, '')) || 0;
        const sales25 = parseNum(c.year25Sales);
        const totalDebt = [c.jungJinGong, c.soJinGong, c.sinbo, c.gibo, c.jaedan,
          c.companyCollateral, c.ceoCredit, c.ceoCollateral].reduce((s, v) => s + parseNum(v), 0);
        const reqFunds = parseNum(c.requiredFunding);
        const kcb = parseInt(c.kcbScore || '0');
        const nice = parseInt(c.niceScore || '0');
        const avgScore = kcb && nice ? Math.round((kcb + nice) / 2) : kcb || nice;
        const delinquent = c.hasFinancialDelinquency === 'yes' || c.hasTaxDelinquency === 'yes';
        const certList = [
          c.hasSMECert && '중소기업확인',
          c.hasStartupCert && '창업확인',
          c.hasVentureCert && '벤처인증',
          c.hasInnobiz && '이노비즈',
          c.hasWomenBizCert && '여성기업',
          c.hasRootBizCert && '뿌리기업',
          c.hasISO && 'ISO인증',
          c.hasHACCP && 'HACCP인증',
        ].filter(Boolean).join(', ');

        // 정책자금 매칭 규칙 엔진 실행
        const matchEngineResult = runFundingMatchEngine({
          industry: c.industry,
          niceScore: nice || avgScore,
          previousYearSales: sales25,
          employeeCount: parseInt(c.employeeCount || '0') || 0,
          hasFinancialDelinquency: c.hasFinancialDelinquency === 'yes',
          hasTaxDelinquency: c.hasTaxDelinquency === 'yes',
          hasGiboDebt: parseNum(c.gibo) > 0,
          hasSinboDebt: parseNum(c.sinbo) > 0,
        });
        const matchEngineText = formatMatchResultForPrompt(matchEngineResult);
        const engineSummary = buildMatchingSummaryFromEngine(matchEngineResult);

        const fundingTypes = (() => { const types = c.fundingType && c.fundingType.length > 0 ? c.fundingType : [...(c.fundingTypeOperating === 'yes' ? ['운전자금'] : []), ...(c.fundingTypeFacility === 'yes' ? ['시설자금'] : [])]; return types.length > 0 ? types.join(', ') : '미선택'; })();

        // 현재 날짜 기준 신청 로드맵 월 계산
        const _nowFm = new Date();
        const _yrFm = _nowFm.getFullYear();
        const _moFm = _nowFm.getMonth() + 1; // 1-based
        const _addMonth = (offset: number) => {
          const totalMonth = _moFm - 1 + offset;
          const y = _yrFm + Math.floor(totalMonth / 12);
          const m = (totalMonth % 12) + 1;
          return `${y}년 ${m}월`;
        };
        const roadmapMonths = {
          m0: _addMonth(0),   // 현재 월
          m1: _addMonth(1),   // 1개월 후
          m2: _addMonth(2),   // 2개월 후
          m1approval: _addMonth(2), // 1순위 예상 승인 (신청 후 ~2개월)
          m2approval: _addMonth(3), // 2순위 예상 승인
          m3approval: _addMonth(4), // 3순위 예상 승인
        };

        const prompt = `당신은 20년 경력의 정책자금 전문 컨설턴트입니다. 아래 기업 데이터와 매칭 엔진 결과를 바탕으로 매우 상세하고 전문적인 AI 정책자금 매칭리포트를 작성하세요.

## 기업 데이터
${companyContext}

## 주요 수치
- 전년 매출: ${sales25 > 0 ? formatAmountKorean(sales25) : '미입력'} | 총 부채: ${totalDebt > 0 ? formatAmountKorean(totalDebt) : '없음'}
- 필요 자금: ${reqFunds > 0 ? formatAmountKorean(reqFunds) : '미입력'} | 자금 유형: ${fundingTypes}
- 자금 사용 계획: ${c.fundingPlanDetail || '미입력'}
- 신용점수: ${avgScore > 0 ? avgScore + '점' : '미입력'} | 연체/체납: ${delinquent ? '있음' : '없음'}
- 보유 인증: ${certList || '없음'} | 특허: ${c.hasPatent === 'yes' ? (c.patentCount || '?') + '건' : '없음'}
${input.additionalNotes ? `- 추가 요청: ${input.additionalNotes}` : ''}

## 매칭 엔진 결과 (반드시 이 순위 그대로 반영)
${matchEngineText}

## 2026년 기준 정책자금 상품 데이터베이스 (실제 수치 활용 필수)
### 중진공(중소벤처기업진흥공단) 직접대출
- 혁신창업사업화자금: 업력 7년 미만 | 금리 연 2.54~3.14% | 한도 60억원(지방 70억원) | 시설 10년(거치4년)/운전 6년(거치2년) | 콜센터 1357
- 신성장기반자금: 업력 7년 이상 | 금리 연 2.54~3.14% | 한도 60억원(지방 70억원) | 시설 10년/운전 6년 | 콜센터 1357
- 긴급경영안정자금: 경영위기 기업 | 금리 연 2.54~3.14% | 한도 10억원 | 운전 5년(거치2년)
- 재도전특별자금: 재창업기업 | 금리 연 2.54~3.14% | 한도 30억원

### 신용보증기금(신보) 보증
- 일반신용보증: 사업자 6개월 이상 | 보증료 연 0.5~1.5% + 은행금리 3~5% | 한도 최대 30억원 | 보증기간 1년(연장가능) | 콜센터 1588-6565
- 창업기업보증: 업력 5년 이내 | 보증료 연 0.5~1.0% | 한도 최대 5억원 | 보증기간 1~5년
- 지식재산(IP)보증: 특허/상표 보유 기업 | 보증료 0.2~0.5%p 차감 | 한도 최대 30억원
- SMART보증(비대면): 사업자 1년 이상 | 보증료 연 0.5~1.5% | 한도 최대 3억원 | 온라인 간편신청

### 기술보증기금(기보) 보증
- 일반기술보증: 기술력 보유 기업 | 보증료 연 0.5~1.5% + 은행금리 3~5% | 한도 최대 30억원(우수기술 50억원) | 콜센터 1544-1120
- 벤처·이노비즈 보증: 벤처/이노비즈 인증 기업 | 보증료 연 0.3~1.0% | 한도 최대 50억원(기술혁신형 100억원)
- 창업기업 기술보증: 업력 7년 이내 기술창업 | 보증료 연 0.5~1.0% | 한도 최대 10억원

### 소진공(소상공인시장진흥공단) 직접대출
- 혁신성장촉진자금(혁신형): 수출/매출성장/스마트공장 | 운전 2억원/시설 10억원 | 운전 5년(거치2년)/시설 8년(거치3년)
- 혁신성장촉진자금(일반형): 스마트기술/백년가게 | 운전 1억원/시설 5억원
- 상생성장지원자금(성장형): TOPS 2단계 선정 | 운전 1억원/시설 5억원
- 일시적경영애로자금: 연매출 1억400만원 미만, 업력 7년 미만 | 한도 7천만원 | 5년(거치2년)
- 신용취약소상공인자금: NCB 839점 이하 + 신용관리교육 이수 | 한도 3천만원 | 5년(거치2년)

## 작성 규칙
1. 엔진 결과의 추천 순위/기관명을 그대로 사용. matchingSummary rank1~rank4는 엔진 결과 기반.
2. 신용점수 수치 노출 금지 (신용 기준 충족/미달 표현만 가능)
3. 금액은 한글 단위: 3억 7천만원, 150억원, 500만원 형식
4. 자금 유형이 운전자금만이면 시설자금 항목은 '해당없음', 시설자금만이면 운전자금 항목은 '해당없음'
5. 위 상품 데이터베이스의 실제 금리·한도·기간·콜센터 번호를 반드시 활용하여 구체적으로 작성
6. 각 섹션 content: ### 소제목 3~4개, 불릿/표 포함, 구체적 수치(금리·한도·기간·신청방법) 포함, 반드시 1000자 이상
7. 종결어미는 ~있음, ~됨, ~필요, ~예상됨 등 간결형 사용
8. 표 데이터 행에 '---' 셀 절대 금지
9. 각 섹션은 실제 컨설턴트가 작성한 수준의 전문적이고 구체적인 내용으로 채울 것
10. 블록인용(>) 각 섹션 1~2개 필수 포함

다음 JSON 형식으로만 응답 (유효한 JSON 필수):
{
  "title": "AI 정책자금 매칭리포트 - ${c.name}",
  "matchingSummary": {
    "rank1": "1순위 기관명 및 자금명 (예상 한도)",
    "rank2": "2순위 기관명 및 자금명 (예상 한도)",
    "rank3": "3순위 기관명 및 자금명 (예상 한도)",
    "rank4": "4순위 기관명 및 자금명 (예상 한도)",
    "estimatedLimit": "총 예상 한도 및 설명"
  },
  "sections": [
    {"title": "보증가능성 예측 리포트", "content": "[### 기업 신용 현황 종합 평가 / ### 기관별 보증 가능성 분석 (신보/기보/중진공/소진공 각각 가능 여부, 예상 한도, 주요 조건, 강점/약점 상세 분석) / ### 보증 가능성 향상 전략 (단기 실행 방안 5개 이상 불릿) / ### 신청 우선순위 및 타임라인 (표: 기관명/신청시기/예상한도/준비서류/비고) - 블록인용 2개 포함, 반드시 1000자 이상]", "chartData": {"type": "bar", "title": "기관별 보증 가능성 (%)", "labels": ["신보", "기보", "중진공", "소진공"], "values": [80, 70, 60, 50]}},
    {"title": "정책자금 가능성 스코어 리포트", "content": "[### 종합 평가 점수 및 등급 (재무건전성/성장성/기술인증/신용도/업종적합성 5개 영역 점수표, 각 영역 평가 근거 상세 서술) / ### 강점 요인 분석 (기업의 정책자금 신청 강점 5개 이상 불릿, 각 강점이 심사에 미치는 영향 설명) / ### 약점 및 보완 방안 (개선 필요 항목 불릿, 단기 보완 전략) / ### 업종별 정책자금 지원 현황 (해당 업종 정부 지원 트렌드, 최근 지원 실적 및 성공 사례) - 블록인용 2개 포함, 반드시 1000자 이상]", "chartData": {"type": "bar", "title": "평가 영역별 점수", "labels": ["재무건전성", "성장성", "기술/인증", "신용도", "업종적합성"], "values": [75, 65, 80, 70, 72]}},
    {"title": "승인 확률 추정 로직", "content": "[### 기관별 심사 기준 상세 분석 (신보/기보/중진공/소진공 각 기관의 주요 심사 항목, 가중치, 당사 현황 대비 평가) / ### 승인 확률 추정 근거 (재무비율 분석: 부채비율/유동비율/영업이익률 등 실제 수치 활용, 동종업계 평균 비교) / ### 심사 통과 핵심 전략 (각 기관별 심사관이 중점 보는 항목과 대응 방안 5개 이상 불릿) / ### 서류 준비 완성도 체크리스트 (기관별 필수 서류 표: 서류명/준비상태/비고) - 블록인용 2개 포함, 반드시 1000자 이상]", "chartData": {"type": "doughnut", "title": "승인 확률 분포", "labels": ["승인가능", "조건부", "불확실"], "values": [60, 25, 15]}},
    {"title": "정책자금 매칭 알고리즘 구조", "content": "[### 매칭 알고리즘 핵심 요소 (신용도/재무상태/업종적합성/인증보유/매출규모/부채현황 6개 팩터 가중치 표, 각 팩터 당사 현황 평가) / ### 기관별 특성 및 차별점 (신보 vs 기보 vs 중진공 vs 소진공 비교표: 지원대상/한도/금리/심사기간/특이사항) / ### 최적 신청 조합 전략 (중복 신청 가능 여부, 순차 신청 전략, 기관 간 시너지 효과) / ### 정책자금 활용 성공 사례 (업종 유사 기업의 정책자금 활용 성공 패턴 2~3가지) - 블록인용 2개 포함, 반드시 1000자 이상]", "chartData": {"type": "pie", "title": "매칭 팩터 가중치", "labels": ["신용도", "재무상태", "업종적합", "인증보유", "매출규모"], "values": [28, 22, 22, 18, 10]}},
    {"title": "최적 정책자금 매칭 Top 3", "content": "[### 1순위 추천 자금 상세 (기관명/상품명/지원대상/금리 항목만 명시. 한도·대출기간·신청방법·콜센터·필요서류는 절대 포함 금지. 당사 적합 이유 2~3문단) / ### 2순위 추천 자금 상세 (동일 형식) / ### 3순위 추천 자금 상세 (동일 형식) / ### 추천 자금 비교 요약표 (기관명/상품명/금리/지원대상 4열 표만 작성. 한도·기간·신청처 열 포함 금지) - 블록인용 2개 포함, 반드시 1200자 이상]", "chartData": {"type": "bar", "title": "기관별 적합도 (%)", "labels": ["1순위", "2순위", "3순위"], "values": [88, 75, 62]}},
    {"title": "기관별 자동 추천 로직 반영 결과", "content": "[### 기관별 적합도 종합 평가 (신보/기보/중진공/소진공 각 기관별 적합도 점수, 평가 근거, 추천 여부 판단) / ### 기관별 심사 특성 및 준비 전략 (각 기관 심사관 관점에서 강조할 포인트, 서류 준비 팁) / ### 중복 신청 전략 및 주의사항 (동시 신청 가능 조합, 불가 조합, 최적 신청 순서 및 시기) / ### 정책자금 신청 로드맵 (아래 날짜 기준 실제 연월로 작성. 예상한도 열 절대 포함 금지. 기관/상품/신청시기/예상승인시기 3열 표만 작성. 1순위=${roadmapMonths.m0} 신청→${roadmapMonths.m1approval} 승인예상, 2순위=${roadmapMonths.m1} 신청→${roadmapMonths.m2approval} 승인예상, 3순위=${roadmapMonths.m2} 신청→${roadmapMonths.m3approval} 승인예상) - 블록인용 2개 포함, 반드시 1000자 이상]", "chartData": {"type": "bar", "title": "기관별 적합도 점수 (%)", "labels": ["신보", "기보", "중진공", "소진공"], "values": [85, 75, 65, 55]}},
    {"title": "자금 사용계획", "content": "[### 자금 사용 목적 및 필요성 (필요 자금 총액, 운전자금/시설자금 구분, 각 항목별 필요 이유 상세 서술) / ### 운전자금 세부 집행 계획 (항목별 금액 배분표: 원자재/인건비/마케팅/운영비 등, 월별 집행 일정) / ### 시설자금 세부 집행 계획 (시설 투자 항목별 금액 배분표, 설치/구매 일정, 기대 효과) / ### 자금 집행 후 기대 효과 (매출 증가 목표, ROI 추정, 고용 창출 효과 수치 포함) - 블록인용 2개 포함, 반드시 1000자 이상]"},
    {"title": "종합 의견 및 전략 권고", "content": "[### 종합 평가 및 정책자금 활용 적합성 (기업 현황 종합 평가, 정책자금 활용 가능성 총평, 예상 조달 가능 총액) / ### 단계별 실행 로드맵 (1단계 즉시실행/2단계 단기/3단계 중기/4단계 장기 각 단계별 구체적 실행 과제 5개 이상 불릿) / ### 신용 관리 및 개선 방안 (현재 신용 상태 평가, 단계별 신용 개선 목표 및 방법, 정책자금 신청 가능 수준 도달 시기 추정) / ### 컨설턴트 최종 권고사항 (최우선 실행 과제 3가지, 주의사항, 성공 가능성 평가, 격려 메시지) - 블록인용 2개 포함, 반드시 1200자 이상]", "chartData": {"type": "bar", "title": "단계별 실행 우선순위", "labels": ["즉시실행", "단기(1~3개월)", "중기(3~6개월)", "장기(6개월~)"], "values": [4, 3, 2, 1]}}
  ]
}`;

        // 서버 사이드 재시도 (최대 5회, 지수 백오프)
        let fmLastError: Error | null = null;
        const maxAttempts = 5;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const result = await invokeLLM({
              messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
              userApiKey,
              userGeminiKey,
              maxTokens: 10000, // 응답 크기 제한으로 타임아웃 방지
              responseFormat: { type: 'json_object' }, // Gemini에게 순수 JSON만 반환하도록 강제
            });
            const parsed = parseAIResponse(result);
            // 엔진 결과로 matchingSummary 덮어쓰기 (AI가 임의로 변경하지 못하도록)
            parsed.matchingSummary = engineSummary;
            parsed.companySummary = buildCompanySummary(input.companyData, 'funding_match');
            return { success: true, data: parsed };
          } catch (err) {
            fmLastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < maxAttempts - 1) {
              // 지수 백오프: 1시도=2초, 2시도=4초, 3시도=8초, 4시도=12초
              const delay = Math.min(2000 * Math.pow(2, attempt), 12000);
              console.log(`[FundingMatch] 시도 ${attempt + 1} 실패, ${delay}ms 후 재시도... 에러: ${fmLastError.message}`);
              await new Promise(r => setTimeout(r, delay));
            }
          }
        }
        throw fmLastError ?? new Error('AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }),
  }),

  // 정책자금 매칭 시뮬레이터 (AI 호출 없이 엔진만 실행)
  simulator: router({
    fundingMatch: approvedProcedure
      .input(
        z.object({
          industry: z.string().optional(),
          niceScore: z.number().min(0).max(1000),
          previousYearSales: z.number().min(0),
          employeeCount: z.number().min(0),
          hasFinancialDelinquency: z.boolean(),
          hasTaxDelinquency: z.boolean(),
          hasGiboDebt: z.boolean(),
          hasSinboDebt: z.boolean(),
        })
      )
      .mutation(({ input }) => {
        const result = runFundingMatchEngine(input);
        const summary = buildMatchingSummaryFromEngine(result);
        const isVulnerableCredit = input.niceScore >= 550 && input.niceScore <= 839;
        // 관리 데이터 기반 상품 매핑 사용
        const productMapping = mapManagedProductsToRecommendations(
          result.recommendations,
          isVulnerableCredit,
        );
        const recommendationsWithProducts = result.recommendations.map((rec) => {
          const mapping = productMapping.find(m => m.rank === rec.rank);
          return {
            ...rec,
            products: mapping?.products ?? [],
          };
        });
        return {
          success: true,
          data: {
            ...result,
            recommendations: recommendationsWithProducts,
            summary,
          },
        };
      }),
  }),

  // 정책자금 상품 관리 CRUD
  products: router({
    list: approvedProcedure
      .input(z.object({
        institution: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(({ input }) => {
        let products = getAllManagedProducts();
        if (input?.institution) {
          products = products.filter(p => p.institutionName === input.institution);
        }
        if (input?.search) {
          const q = input.search.toLowerCase();
          products = products.filter(p =>
            p.productName.toLowerCase().includes(q) ||
            p.institutionName.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.tags.some(t => t.toLowerCase().includes(q))
          );
        }
        return { success: true, data: products };
      }),

    getById: approvedProcedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => {
        const product = getProductById(input.id);
        if (!product) return { success: false, error: "상품을 찾을 수 없습니다." };
        return { success: true, data: product };
      }),

    create: adminProcedure
      .input(z.object({
        institutionName: z.string().min(1),
        productName: z.string().min(1),
        category: z.string().min(1),
        description: z.string(),
        interestRate: z.string(),
        maxLimit: z.string(),
        loanPeriod: z.string(),
        targetBusiness: z.string(),
        requiredDocs: z.array(z.string()),
        applicationUrl: z.string(),
        contactInfo: z.string(),
        tags: z.array(z.string()),
        note: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const product = addProduct(input);
        return { success: true, data: product };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.string(),
        institutionName: z.string().min(1).optional(),
        productName: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        description: z.string().optional(),
        interestRate: z.string().optional(),
        maxLimit: z.string().optional(),
        loanPeriod: z.string().optional(),
        targetBusiness: z.string().optional(),
        requiredDocs: z.array(z.string()).optional(),
        applicationUrl: z.string().optional(),
        contactInfo: z.string().optional(),
        tags: z.array(z.string()).optional(),
        note: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...updates } = input;
        const product = updateProduct(id, updates);
        if (!product) return { success: false, error: "상품을 찾을 수 없습니다." };
        return { success: true, data: product };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input }) => {
        const deleted = deleteProduct(input.id);
        if (!deleted) return { success: false, error: "상품을 찾을 수 없습니다." };
        return { success: true };
      }),

    reset: adminProcedure
      .mutation(() => {
        const products = resetToDefaults();
        return { success: true, data: products };
      }),

    institutions: approvedProcedure
      .query(() => {
        const products = getAllManagedProducts();
        const institutions = [...new Set(products.map(p => p.institutionName))];
        return { success: true, data: institutions };
      }),
  }),
  // ─── 관리자: 사용자 관리 ───
  users: router({
    /** 전체 사용자 목록 조회 */
    list: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "approved", "rejected", "all"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        const status = input?.status;
        if (status && status !== "all") {
          const list = await getUsersByStatus(status);
          return { success: true, data: list };
        }
        const list = await getAllUsers();
        return { success: true, data: list };
      }),

    /** 사용자 승인 */
    approve: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await updateUserStatus(input.userId, "approved");
        return { success: true };
      }),

    /** 사용자 거절 */
    reject: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await updateUserStatus(input.userId, "rejected");
        return { success: true };
      }),

    /** 사용자 역할 변경 */
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    /** 사용자 삭제 */
    delete: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteUser(input.userId);
        return { success: true };
      }),
  }),

  // ─── 업체 관리 (DB 연동) ───────────────────────────────────────────────────
  clients: router({
    /** 업체 목록 조회 */
    list: approvedProcedure
      .query(async ({ ctx }) => {
        const list = await getCompaniesByUserId(ctx.user!.id);
        return { success: true, data: list };
      }),

    /** 업체 단건 조회 */
    get: approvedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const company = await getCompanyById(input.id, ctx.user!.id);
        if (!company) return { success: false, error: '업체를 찾을 수 없습니다.' };
        return { success: true, data: company };
      }),

    /** 업체 등록 */
    create: approvedProcedure
      .input(z.object({
        name: z.string().min(1),
        businessType: z.string().optional(),
        businessNumber: z.string().optional(),
        corporateNumber: z.string().optional(),
        establishedDate: z.string().optional(),
        businessPhone: z.string().optional(),
        employeeCount: z.string().optional(),
        industry: z.string().optional(),
        officeOwnership: z.string().optional(),
        businessAddress: z.string().optional(),
        deposit: z.string().optional(),
        monthlyRent: z.string().optional(),
        hasAdditionalBranch: z.string().optional(),
        additionalBranchNumber: z.string().optional(),
        representativeName: z.string().optional(),
        birthDate: z.string().optional(),
        contactNumber: z.string().optional(),
        telecom: z.string().optional(),
        homeAddress: z.string().optional(),
        homeOwnership: z.string().optional(),
        education: z.string().optional(),
        major: z.string().optional(),
        career1: z.string().optional(),
        career2: z.string().optional(),
        hasFinancialDelinquency: z.string().optional(),
        hasTaxDelinquency: z.string().optional(),
        kcbScore: z.string().optional(),
        niceScore: z.string().optional(),
        hasExportSales: z.string().optional(),
        hasPlannedExport: z.string().optional(),
        currentYearSales: z.string().optional(),
        year25Sales: z.string().optional(),
        year24Sales: z.string().optional(),
        year23Sales: z.string().optional(),
        currentYearExport: z.string().optional(),
        year25Export: z.string().optional(),
        year24Export: z.string().optional(),
        year23Export: z.string().optional(),
        jungJinGong: z.string().optional(),
        soJinGong: z.string().optional(),
        sinbo: z.string().optional(),
        gibo: z.string().optional(),
        jaedan: z.string().optional(),
        companyCollateral: z.string().optional(),
        ceoCredit: z.string().optional(),
        ceoCollateral: z.string().optional(),
        certifications: z.string().optional(),
        hasPatent: z.string().optional(),
        patentCount: z.string().optional(),
        patentDetails: z.string().optional(),
        hasGovSupport: z.string().optional(),
        govSupportCount: z.string().optional(),
        govSupportDetails: z.string().optional(),
        coreItem: z.string().optional(),
        salesRoute: z.string().optional(),
        competitiveness: z.string().optional(),
        marketStatus: z.string().optional(),
        processDetail: z.string().optional(),
        targetCustomer: z.string().optional(),
        revenueModel: z.string().optional(),
        futurePlan: z.string().optional(),
        requiredFunding: z.string().optional(),
        fundingPlanDetail: z.string().optional(),
        memo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createCompany({ ...input, userId: ctx.user!.id });
        const company = await getCompanyById(id, ctx.user!.id);
        return { success: true, data: company };
      }),

    /** 업체 수정 */
    update: approvedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        businessType: z.string().optional(),
        businessNumber: z.string().optional(),
        corporateNumber: z.string().optional(),
        establishedDate: z.string().optional(),
        businessPhone: z.string().optional(),
        employeeCount: z.string().optional(),
        industry: z.string().optional(),
        officeOwnership: z.string().optional(),
        businessAddress: z.string().optional(),
        deposit: z.string().optional(),
        monthlyRent: z.string().optional(),
        hasAdditionalBranch: z.string().optional(),
        additionalBranchNumber: z.string().optional(),
        representativeName: z.string().optional(),
        birthDate: z.string().optional(),
        contactNumber: z.string().optional(),
        telecom: z.string().optional(),
        homeAddress: z.string().optional(),
        homeOwnership: z.string().optional(),
        education: z.string().optional(),
        major: z.string().optional(),
        career1: z.string().optional(),
        career2: z.string().optional(),
        hasFinancialDelinquency: z.string().optional(),
        hasTaxDelinquency: z.string().optional(),
        kcbScore: z.string().optional(),
        niceScore: z.string().optional(),
        hasExportSales: z.string().optional(),
        hasPlannedExport: z.string().optional(),
        currentYearSales: z.string().optional(),
        year25Sales: z.string().optional(),
        year24Sales: z.string().optional(),
        year23Sales: z.string().optional(),
        currentYearExport: z.string().optional(),
        year25Export: z.string().optional(),
        year24Export: z.string().optional(),
        year23Export: z.string().optional(),
        jungJinGong: z.string().optional(),
        soJinGong: z.string().optional(),
        sinbo: z.string().optional(),
        gibo: z.string().optional(),
        jaedan: z.string().optional(),
        companyCollateral: z.string().optional(),
        ceoCredit: z.string().optional(),
        ceoCollateral: z.string().optional(),
        certifications: z.string().optional(),
        hasPatent: z.string().optional(),
        patentCount: z.string().optional(),
        patentDetails: z.string().optional(),
        hasGovSupport: z.string().optional(),
        govSupportCount: z.string().optional(),
        govSupportDetails: z.string().optional(),
        coreItem: z.string().optional(),
        salesRoute: z.string().optional(),
        competitiveness: z.string().optional(),
        marketStatus: z.string().optional(),
        processDetail: z.string().optional(),
        targetCustomer: z.string().optional(),
        revenueModel: z.string().optional(),
        futurePlan: z.string().optional(),
        requiredFunding: z.string().optional(),
        fundingPlanDetail: z.string().optional(),
        memo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateCompanyDb(id, ctx.user!.id, data);
        const company = await getCompanyById(id, ctx.user!.id);
        return { success: true, data: company };
      }),

    /** 업체 삭제 */
    delete: approvedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteCompanyDb(input.id, ctx.user!.id);
        return { success: true };
      }),
  }),

  // ─── 보고서 관리 (DB 연동) ────────────────────────────────────────────────
  dbReports: router({
    /** 보고서 목록 조회 */
    list: approvedProcedure
      .input(z.object({ companyId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (input?.companyId) {
          const list = await getReportsByCompanyId(input.companyId, ctx.user!.id);
          return { success: true, data: list };
        }
        const list = await getReportsByUserId(ctx.user!.id);
        return { success: true, data: list };
      }),

    /** 보고서 단건 조회 */
    get: approvedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const report = await getReportById(input.id, ctx.user!.id);
        if (!report) return { success: false, error: '보고서를 찾을 수 없습니다.' };
        return { success: true, data: report };
      }),

    /** 보고서 저장 */
    create: approvedProcedure
      .input(z.object({
        companyId: z.number(),
        companyName: z.string(),
        type: z.string(),
        title: z.string(),
        sectionsJson: z.string(),
        matchingSummaryJson: z.string().optional(),
        companySummaryJson: z.string().optional(),
        status: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createReport({ ...input, userId: ctx.user!.id, status: input.status ?? 'completed' });
        const report = await getReportById(id, ctx.user!.id);
        return { success: true, data: report };
      }),

    /** 보고서 삭제 */
    delete: approvedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteReportDb(input.id, ctx.user!.id);
        return { success: true };
      }),
  }),

  /** 이미지 파싱: 업로드한 이미지(JPG/PNG 등)를 AI OCR로 분석하여 업체 정보 추출 */
  parseImageCompany: approvedProcedure
    .input(z.object({
      fileName: z.string(),
      base64: z.string(),
      mimeType: z.string(), // e.g. "image/jpeg", "image/png"
    }))
    .mutation(async ({ input }) => {
      const dataUri = `data:${input.mimeType};base64,${input.base64}`;

      const result = await invokeLLM({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUri },
              },
              {
                type: "text",
                text: `이 이미지에서 기업/업체 정보를 추출하여 아래 JSON 형식으로 반환해주세요.
없는 정보는 빈 문자열("")로 두세요. boolean 필드는 true/false로 반환하세요.

반환 형식 (JSON만 반환, 다른 텍스트 없이):
{
  "name": "업체명",
  "industry": "업종",
  "businessType": "법인사업자 또는 개인사업자",
  "businessNumber": "사업자번호",
  "corporateNumber": "법인등록번호",
  "establishedDate": "사업개시일(YYYY-MM-DD)",
  "businessPhone": "사업장 전화번호",
  "employeeCount": "상시근로자 수(숫자만)",
  "officeOwnership": "자가 또는 임대",
  "businessAddress": "사업장 주소",
  "deposit": "보증금(만원 단위 숫자)",
  "monthlyRent": "월임대료(만원 단위 숫자)",
  "representativeName": "대표자명",
  "birthDate": "생년월일(YYYY-MM-DD)",
  "contactNumber": "연락처",
  "telecom": "통신사",
  "homeAddress": "자택 주소",
  "homeOwnership": "자가 또는 임대",
  "education": "최종학력",
  "major": "전공",
  "career1": "경력사항 1",
  "career2": "경력사항 2",
  "hasFinancialDelinquency": "예 또는 아니오",
  "hasTaxDelinquency": "예 또는 아니오",
  "kcbScore": "KCB 신용점수(숫자)",
  "niceScore": "NICE 신용점수(숫자)",
  "currentYearSales": "금년 매출(만원 단위 숫자)",
  "year25Sales": "2025년 매출(만원 단위 숫자)",
  "year24Sales": "2024년 매출(만원 단위 숫자)",
  "year23Sales": "2023년 매출(만원 단위 숫자)",
  "hasExportSales": "예 또는 아니오",
  "currentYearExport": "금년 수출액(만원 단위 숫자)",
  "year25Export": "2025년 수출액(만원 단위 숫자)",
  "year24Export": "2024년 수출액(만원 단위 숫자)",
  "year23Export": "2023년 수출액(만원 단위 숫자)",
  "jungJinGong": "중진공 부채(만원)",
  "soJinGong": "소진공 부채(만원)",
  "sinbo": "신보 부채(만원)",
  "gibo": "기보 부채(만원)",
  "jaedan": "재단 부채(만원)",
  "companyCollateral": "회사담보(만원)",
  "ceoCredit": "대표신용(만원)",
  "ceoCollateral": "대표담보(만원)",
  "hasSMECert": false,
  "hasStartupCert": false,
  "hasWomenBizCert": false,
  "hasInnobiz": false,
  "hasVentureCert": false,
  "hasRootBizCert": false,
  "hasISO": false,
  "hasHACCP": false,
  "hasPatent": "예 또는 아니오",
  "patentCount": "특허 건수(숫자)",
  "patentDetails": "특허 상세내용",
  "hasGovSupport": "예 또는 아니오",
  "govSupportCount": "수혜 건수(숫자)",
  "govSupportDetails": "수혜 상세내용",
  "coreItem": "핵심 아이템",
  "salesRoute": "판매 루트",
  "competitiveness": "경쟁력 및 차별성",
  "marketStatus": "시장 현황",
  "targetCustomer": "타겟 고객",
  "revenueModel": "수익 모델",
  "futurePlan": "앞으로의 계획",
  "requiredFunding": "필요 자금(만원 단위 숫자)",
  "fundingPlanDetail": "자금 집행 계획",
  "memo": ""
}`,
              },
            ],
          },
        ],
        maxTokens: 2000,
      });

      const responseText = result.choices[0]?.message?.content;
      const textContent = typeof responseText === "string"
        ? responseText
        : Array.isArray(responseText)
          ? responseText.filter((c): c is import("./_core/llm").TextContent => c.type === "text").map(c => c.text).join("")
          : "";

      try {
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        const rawJson = jsonMatch ? jsonMatch[0] : textContent;
        // 제어 문자 정리
        let cleaned = '';
        let inStr = false, esc = false;
        for (const ch of rawJson) {
          if (esc) { cleaned += ch; esc = false; continue; }
          if (ch === '\\') { cleaned += ch; esc = true; continue; }
          if (ch === '"') { inStr = !inStr; cleaned += ch; continue; }
          if (inStr) {
            const code = ch.charCodeAt(0);
            if (code === 0x0A) { cleaned += '\\n'; continue; }
            if (code === 0x0D) { cleaned += '\\r'; continue; }
            if (code === 0x09) { cleaned += '\\t'; continue; }
            if (code < 0x20) { cleaned += '\\u' + code.toString(16).padStart(4, '0'); continue; }
          }
          cleaned += ch;
        }
        return JSON.parse(cleaned);
      } catch {
        throw new Error("이미지에서 정보를 추출하지 못했습니다. 더 선명한 이미지를 시도해주세요.");
      }
    }),

  /** PDF 파싱: 모바일에서 업로드한 PDF를 AI로 분석하여 업체 정보 추출 */
  parsePdfCompany: approvedProcedure
    .input(z.object({
      fileName: z.string(),
      base64: z.string(),
    }))
    .mutation(async ({ input }) => {
      // base64 → Buffer → Blob URL (data URI) 방식으로 LLM에 전달
      const dataUri = `data:application/pdf;base64,${input.base64}`;

      const result = await invokeLLM({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file_url",
                file_url: {
                  url: dataUri,
                  mime_type: "application/pdf",
                },
              },
              {
                type: "text",
                text: `이 PDF 문서에서 기업/업체 정보를 추출하여 아래 JSON 형식으로 반환해주세요.
없는 정보는 빈 문자열("")로 두세요. boolean 필드는 true/false로 반환하세요.

반환 형식 (JSON만 반환, 다른 텍스트 없이):
{
  "name": "업체명",
  "industry": "업종",
  "businessType": "법인사업자 또는 개인사업자",
  "businessNumber": "사업자번호",
  "corporateNumber": "법인등록번호",
  "establishedDate": "사업개시일(YYYY-MM-DD)",
  "businessPhone": "사업장 전화번호",
  "employeeCount": "상시근로자 수(숫자만)",
  "officeOwnership": "자가 또는 임대",
  "businessAddress": "사업장 주소",
  "deposit": "보증금(만원 단위 숫자)",
  "monthlyRent": "월임대료(만원 단위 숫자)",
  "representativeName": "대표자명",
  "birthDate": "생년월일(YYYY-MM-DD)",
  "contactNumber": "연락처",
  "telecom": "통신사",
  "homeAddress": "자택 주소",
  "homeOwnership": "자가 또는 임대",
  "education": "최종학력",
  "major": "전공",
  "career1": "경력사항 1",
  "career2": "경력사항 2",
  "hasFinancialDelinquency": "예 또는 아니오",
  "hasTaxDelinquency": "예 또는 아니오",
  "kcbScore": "KCB 신용점수(숫자)",
  "niceScore": "NICE 신용점수(숫자)",
  "currentYearSales": "금년 매출(만원 단위 숫자)",
  "year25Sales": "2025년 매출(만원 단위 숫자)",
  "year24Sales": "2024년 매출(만원 단위 숫자)",
  "year23Sales": "2023년 매출(만원 단위 숫자)",
  "hasExportSales": "예 또는 아니오",
  "currentYearExport": "금년 수출액(만원 단위 숫자)",
  "year25Export": "2025년 수출액(만원 단위 숫자)",
  "year24Export": "2024년 수출액(만원 단위 숫자)",
  "year23Export": "2023년 수출액(만원 단위 숫자)",
  "jungJinGong": "중진공 부채(만원)",
  "soJinGong": "소진공 부채(만원)",
  "sinbo": "신보 부채(만원)",
  "gibo": "기보 부채(만원)",
  "jaedan": "재단 부채(만원)",
  "companyCollateral": "회사담보(만원)",
  "ceoCredit": "대표신용(만원)",
  "ceoCollateral": "대표담보(만원)",
  "hasSMECert": false,
  "hasStartupCert": false,
  "hasWomenBizCert": false,
  "hasInnobiz": false,
  "hasVentureCert": false,
  "hasRootBizCert": false,
  "hasISO": false,
  "hasHACCP": false,
  "hasPatent": "예 또는 아니오",
  "patentCount": "특허 건수(숫자)",
  "patentDetails": "특허 상세내용",
  "hasGovSupport": "예 또는 아니오",
  "govSupportCount": "수혜 건수(숫자)",
  "govSupportDetails": "수혜 상세내용",
  "coreItem": "핵심 아이템",
  "salesRoute": "판매 루트",
  "competitiveness": "경쟁력 및 차별성",
  "marketStatus": "시장 현황",
  "targetCustomer": "타겟 고객",
  "revenueModel": "수익 모델",
  "futurePlan": "앞으로의 계획",
  "requiredFunding": "필요 자금(만원 단위 숫자)",
  "fundingPlanDetail": "자금 집행 계획",
  "memo": ""
}`,
              },
            ],
          },
        ],
        maxTokens: 2000,
      });

      // JSON 파싱 (parseAIResponse와 동일한 방식)
      const responseText = result.choices[0]?.message?.content;
      const textContent = typeof responseText === "string"
        ? responseText
        : Array.isArray(responseText)
          ? responseText.filter((c): c is import("./_core/llm").TextContent => c.type === "text").map(c => c.text).join("")
          : "";

      try {
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        const rawJson = jsonMatch ? jsonMatch[0] : textContent;
        let cleaned = '';
        let inStr = false, esc = false;
        for (const ch of rawJson) {
          if (esc) { cleaned += ch; esc = false; continue; }
          if (ch === '\\') { cleaned += ch; esc = true; continue; }
          if (ch === '"') { inStr = !inStr; cleaned += ch; continue; }
          if (inStr) {
            const code = ch.charCodeAt(0);
            if (code === 0x0A) { cleaned += '\\n'; continue; }
            if (code === 0x0D) { cleaned += '\\r'; continue; }
            if (code === 0x09) { cleaned += '\\t'; continue; }
            if (code < 0x20) { cleaned += '\\u' + code.toString(16).padStart(4, '0'); continue; }
          }
          cleaned += ch;
        }
        return JSON.parse(cleaned);
      } catch {
        throw new Error("PDF에서 정보를 추출하지 못했습니다. 다른 PDF를 시도해주세요.");
      }
    }),

  // ─── 서류 업로드 → 정책자금 자동 추천 (원스텝) ───
  parseDocumentAndMatchFunding: approvedProcedure
    .input(z.object({
      fileName: z.string(),
      base64: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input }) => {
      // 1단계: 서류에서 업체 정보 추출
      const dataUri = `data:${input.mimeType};base64,${input.base64}`;
      const extractPrompt = `이 문서에서 기업/업체 정보를 추출하여 아래 JSON 형식으로 반환해주세요.
없는 정보는 빈 문자열("") 또는 0으로 두세요. boolean 필드는 true/false로 반환하세요.
반환 형식 (JSON만 반환, 다른 텍스트 없이):
{
  "name": "업체명",
  "industry": "업종",
  "businessType": "법인사업자 또는 개인사업자",
  "businessNumber": "사업자번호",
  "representativeName": "대표자명",
  "employeeCount": 0,
  "niceScore": 0,
  "kcbScore": 0,
  "previousYearSales": 0,
  "currentYearSales": 0,
  "year25Sales": 0,
  "year24Sales": 0,
  "year23Sales": 0,
  "hasFinancialDelinquency": false,
  "hasTaxDelinquency": false,
  "hasGiboDebt": false,
  "hasSinboDebt": false,
  "jungJinGong": 0,
  "soJinGong": 0,
  "sinbo": 0,
  "gibo": 0,
  "jaedan": 0,
  "hasSMECert": false,
  "hasVentureCert": false,
  "hasInnobiz": false,
  "hasPatent": false,
  "requiredFunding": 0,
  "businessAddress": "",
  "establishedDate": ""
}`;

      const isPdf = input.mimeType === "application/pdf";
      type LLMContent = import("./_core/llm").MessageContent;
      const contentParts: LLMContent[] = isPdf
        ? [
            { type: "file_url", file_url: { url: dataUri, mime_type: "application/pdf" } } as LLMContent,
            { type: "text", text: extractPrompt },
          ]
        : [
            { type: "image_url", image_url: { url: dataUri } } as LLMContent,
            { type: "text", text: extractPrompt },
          ];

      const extractResult = await invokeLLM({
        messages: [{ role: "user", content: contentParts }],
        maxTokens: 2000,
      });

      const extractRaw = extractResult.choices[0]?.message?.content;
      const extractText = typeof extractRaw === "string"
        ? extractRaw
        : Array.isArray(extractRaw)
          ? extractRaw.filter((c): c is import("./_core/llm").TextContent => c.type === "text").map((c) => c.text).join("")
          : "";

      let extractedData: Record<string, unknown> = {};
      try {
        const jsonMatch2 = extractText.match(/\{[\s\S]*\}/);
        const rawJson2 = jsonMatch2 ? jsonMatch2[0] : extractText;
        let cleaned2 = '';
        let inStr2 = false, esc2 = false;
        for (const ch of rawJson2) {
          if (esc2) { cleaned2 += ch; esc2 = false; continue; }
          if (ch === '\\') { cleaned2 += ch; esc2 = true; continue; }
          if (ch === '"') { inStr2 = !inStr2; cleaned2 += ch; continue; }
          if (inStr2) {
            const code = ch.charCodeAt(0);
            if (code === 0x0A) { cleaned2 += '\\n'; continue; }
            if (code === 0x0D) { cleaned2 += '\\r'; continue; }
            if (code === 0x09) { cleaned2 += '\\t'; continue; }
            if (code < 0x20) { cleaned2 += '\\u' + code.toString(16).padStart(4, '0'); continue; }
          }
          cleaned2 += ch;
        }
        extractedData = JSON.parse(cleaned2);
      } catch {
        throw new Error("서류에서 정보를 추출하지 못했습니다. 다른 파일을 시도해주세요.");
      }

      // 2단계: 추출된 데이터로 정책자금 매칭 엔진 실행
      const previousYearSales = Number(extractedData.previousYearSales) ||
        Number(extractedData.year25Sales) ||
        Number(extractedData.year24Sales) || 0;
      const niceScore = Number(extractedData.niceScore) || 0;
      const employeeCount = Number(extractedData.employeeCount) || 0;

      const matchInput: import("./fundingMatchEngine.js").FundingMatchInput = {
        industry: String(extractedData.industry || ""),
        niceScore,
        previousYearSales,
        employeeCount,
        hasFinancialDelinquency: Boolean(extractedData.hasFinancialDelinquency),
        hasTaxDelinquency: Boolean(extractedData.hasTaxDelinquency),
        hasGiboDebt: Boolean(extractedData.hasGiboDebt) || Number(extractedData.gibo) > 0,
        hasSinboDebt: Boolean(extractedData.hasSinboDebt) || Number(extractedData.sinbo) > 0,
      };

      const matchResult = runFundingMatchEngine(matchInput);
      const summary = buildMatchingSummaryFromEngine(matchResult);
      const isVulnerableCredit = niceScore >= 550 && niceScore <= 839;
      const productMapping = mapManagedProductsToRecommendations(
        matchResult.recommendations,
        isVulnerableCredit,
      );
      const recommendationsWithProducts = matchResult.recommendations.map((rec) => {
        const mapping = productMapping.find(m => m.rank === rec.rank);
        return { ...rec, products: mapping?.products ?? [] };
      });

      return {
        success: true,
        extractedData,
        matchResult: {
          ...matchResult,
          recommendations: recommendationsWithProducts,
          summary,
        },
        extractedSummary: {
          companyName: String(extractedData.name || ""),
          industry: String(extractedData.industry || ""),
          niceScore,
          previousYearSales,
          employeeCount,
          hasDelinquency: Boolean(extractedData.hasFinancialDelinquency) || Boolean(extractedData.hasTaxDelinquency),
        },
      };
    }),
  notices: router({
    /** 목록 조회 - 모든 로그인 사용자 가능 */
    list: approvedProcedure
      .input(z.object({ type: z.enum(["document", "notice"]).optional() }))
      .query(async ({ input }) => {
        return getNotices(input.type);
      }),

    /** 단건 조회 */
    getById: approvedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getNoticeById(input.id);
      }),

    /** 등록 - 관리자 전용 */
    create: adminProcedure
      .input(z.object({
        type: z.enum(["document", "notice"]),
        title: z.string().min(1).max(512),
        content: z.string().optional(),
        attachmentUrl: z.string().optional(),
        attachmentName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createNotice({
          type: input.type,
          title: input.title,
          content: input.content,
          attachmentUrl: input.attachmentUrl,
          attachmentName: input.attachmentName,
          createdBy: ctx.user!.id,
          createdByName: ctx.user!.name ?? "",
        });
        return { success: true, id };
      }),

    /** 수정 - 관리자 전용 */
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(512).optional(),
        content: z.string().optional(),
        attachmentUrl: z.string().optional(),
        attachmentName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateNotice(id, data);
        return { success: true };
      }),

    /** 삭제 - 관리자 전용 */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteNotice(input.id);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
