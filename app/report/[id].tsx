import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Clipboard,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useData } from "@/lib/data-context";
import type { ReportSection, ChartData } from "@/shared/types";
import { SectionChart } from "@/components/section-chart";
import { RoadmapMatrix } from "@/components/roadmap-matrix";

export default function ReportDetailScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const colors = useColors();
  const router = useRouter();
  const { reports, updateReport, deleteReport, companies } = useData();

  const report = reports.find((r) => r.id === id);
  const company = companies.find((c) => c.id === report?.companyId);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [pdfLoading, setPdfLoading] = useState(false);
  const [consultantPdfLoading, setConsultantPdfLoading] = useState(false);
  // 경영진단보고서 탭: 'client' | 'consultant' (생성 화면에서 tab 파라미터로 초기 탭 설정 가능)
  const [diagnosisTab, setDiagnosisTab] = useState<'client' | 'consultant'>(tab === 'consultant' ? 'consultant' : 'client');

  const isDiagnosis = report?.type === "diagnosis";
  const isFunding = report?.type === "funding_match";
  const typeColor = isDiagnosis ? "#1A3C6E" : isFunding ? "#F59E0B" : "#27AE60";
  const typeLabel = isDiagnosis ? "경영진단보고서" : isFunding ? "AI 정책자금매칭 리포트" : "AI 사업계획서";
  const typeIconName = isDiagnosis ? ("chart.bar.fill" as const) : isFunding ? ("target" as const) : ("lightbulb.fill" as const);

  // 마크다운 스타일 (보고서 타입별 액센트 컬러 적용)
  const mdStyles = useMemo(
    () =>
      StyleSheet.create({
        body: { fontSize: 14, lineHeight: 23, color: colors.foreground },
        heading3: {
          fontSize: 15,
          fontWeight: "700" as const,
          color: colors.foreground,
          marginTop: 14,
          marginBottom: 6,
          paddingBottom: 4,
          borderBottomWidth: 2,
          borderBottomColor: typeColor + "22",
        },
        strong: { fontWeight: "700" as const, color: colors.foreground },
        bullet_list: { marginVertical: 4 },
        ordered_list: { marginVertical: 4 },
        list_item: { marginVertical: 2 },
        bullet_list_icon: { color: typeColor, fontSize: 8, lineHeight: 22, marginRight: 6 },
        ordered_list_icon: { color: typeColor, fontWeight: "700" as const, fontSize: 13, lineHeight: 22, marginRight: 6 },
        blockquote: {
          backgroundColor: typeColor + "08",
          borderLeftWidth: 3,
          borderLeftColor: typeColor,
          borderRadius: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginVertical: 8,
        },
        table: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          marginVertical: 8,
          overflow: "hidden" as const,
        },
        thead: { backgroundColor: typeColor + "18" },
        th: {
          padding: 10,
          fontWeight: "700" as const,
          fontSize: 12,
          color: colors.foreground,
          borderRightWidth: 0.5,
          borderRightColor: colors.border,
          borderBottomWidth: 2,
          borderBottomColor: typeColor + "33",
        },
        td: {
          padding: 10,
          fontSize: 12,
          color: colors.foreground,
          borderRightWidth: 0.5,
          borderRightColor: colors.border,
        },
        tr: {
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        },
        hr: { backgroundColor: colors.border, height: 1, marginVertical: 10 },
        paragraph: { marginVertical: 3 },
      }),
    [colors, typeColor]
  );

  if (!report) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={[styles.notFound, { color: colors.muted }]}>보고서를 찾을 수 없습니다.</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: colors.primary, marginTop: 12 }}>뒤로 가기</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const startEdit = (idx: number, content: string) => {
    setEditingSection(idx);
    setEditedContent(content);
  };

  const saveEdit = async (idx: number) => {
    const updatedSections: ReportSection[] = report.sections.map((s, i) =>
      i === idx ? { ...s, content: editedContent } : s
    );
    await updateReport(id, { sections: updatedSections });
    setEditingSection(null);
  };

  /** 레거시 HTML 태그를 마크다운으로 변환 */
  const normalizeContent = (content: string): string => {
    if (!content) return "";
    let md = content;
    // <br> → 줄바꿈
    md = md.replace(/<br\s*\/?>/gi, "\n");
    // <strong>...</strong> → **...**
    md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
    // 글머리 기호 • → -
    md = md.replace(/^[•·]\s*/gm, "- ");
    return md;
  };

  const buildPdfHtml = (mode: 'client' | 'consultant' = 'client') => {
    const isConsultant = mode === 'consultant';
    const typeColorHex = isDiagnosis ? "#1A3C6E" : isFunding ? "#D97706" : "#16A34A";
    const dateStr = new Date(report.createdAt).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const matchingSummaryHtml =
      isFunding && report.matchingSummary
        ? `<div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:14px;padding:16px;margin-bottom:24px;">
        <div style="font-size:14px;font-weight:700;color:#92400E;margin-bottom:12px;">AI 정책자금 매칭 결과 요약</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px;">
          ${[
            { rank: "1순위", value: report.matchingSummary!.rank1, bg: "#F59E0B" },
            { rank: "2순위", value: report.matchingSummary!.rank2, bg: "#EA580C" },
            { rank: "3순위", value: report.matchingSummary!.rank3, bg: "#CA8A04" },
            { rank: "4순위", value: report.matchingSummary!.rank4, bg: "#65A30D" },
          ].filter(item => item.value && item.value !== '-')
            .map((item) => {
              const parts = item.value.split(' - 예상 한도: ');
              const instName = parts[0];
              const limit = parts[1] || '';
              const isIneligible = instName.includes('(신용점수 미달)');
              const cleanName = instName.replace(' (신용점수 미달)', '');
              const statusBadge = isIneligible
                ? '<span style="background:#FEE2E2;color:#DC2626;font-size:9px;font-weight:600;padding:2px 6px;border-radius:8px;">신용 기준 미달</span>'
                : '<span style="background:#DCFCE7;color:#16A34A;font-size:9px;font-weight:600;padding:2px 6px;border-radius:8px;">자격 충족</span>';
              return `<div style="background:#fff;border:1px solid ${isIneligible ? '#FCA5A5' : '#FDE68A'};border-radius:10px;padding:12px;${isIneligible ? 'opacity:0.7;' : ''}">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <span style="background:${item.bg};color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:8px;">${item.rank}</span>
                  <span style="font-size:13px;font-weight:700;color:#1a1a1a;flex:1;">${cleanName}</span>
                  ${statusBadge}
                </div>
                ${limit ? `<div style="font-size:11px;color:#92400E;margin-left:56px;">예상 한도: <strong>${limit}</strong></div>` : ''}
              </div>`;
            })
            .join("")}
        </div>
        <div style="background:#FEF3C7;border-radius:10px;padding:10px;">
          <div style="font-size:11px;font-weight:600;color:#92400E;margin-bottom:2px;">한도 산정 기준</div>
          <div style="font-size:12px;font-weight:700;color:#78350F;">${report.matchingSummary!.estimatedLimit}</div>
        </div>
      </div>`
        : "";

    // 기업현황표 HTML
    const companySummaryHtml = report.companySummary ? (() => {
      const cs = report.companySummary!;
      const rows: [string, string][] = [
        ["기업명", cs.name || "-"],
        ["사업자등록번호", cs.businessNumber || "-"],
        ["법인등록번호", cs.corporateNumber || "-"],
        ["사업장주소", cs.businessAddress || "-"],
        ["업종", cs.industry || "-"],
        ["대표자명", cs.representativeName || "-"],
        ["수출여부", cs.hasExportSales || "-"],
        ["특허 및 인증", cs.patentAndCerts || "-"],
      ];
      // salesData 배열이 있으면 연도 오름차순(23년→24년→25년→현재→금년예상)으로 표시
      if (cs.salesData && cs.salesData.length > 0) {
        (cs.salesData as Array<{ label: string; value: string }>).forEach((entry) => {
          rows.push([`매출 (${entry.label})`, entry.value]);
        });
      } else {
        rows.push(["전년도 매출합계", cs.previousYearSales || "-"]);
        if (cs.estimatedCurrentYearSales) {
          rows.push(["금년 예상 매출", cs.estimatedCurrentYearSales]);
        }
      }
      if (isFunding) {
        if (cs.totalSales) rows.push(["매출", cs.totalSales]);
        if (cs.totalDebt) rows.push(["부채", cs.totalDebt]);
        if (cs.requiredFunding) rows.push(["필요자금", cs.requiredFunding]);
      }
      const filtered = rows.filter(([, v]) => v && v !== "-" && v !== "미입력");
      if (filtered.length === 0) return "";
      return `<div style="margin-bottom:24px;page-break-inside:avoid;"><table style="width:100%;border-collapse:collapse;border:1px solid #d1d5db;border-radius:8px;overflow:hidden;"><tr style="background:${typeColorHex};"><td colspan="2" style="padding:10px 14px;color:#fff;font-weight:700;font-size:13px;">기업현황</td></tr>${filtered.map(([label, value], i) => `<tr style="background:${i % 2 === 0 ? '#f8f9fa' : '#fff'};"><td style="padding:8px 14px;font-weight:600;color:#374151;font-size:12px;width:140px;border-bottom:1px solid #e5e7eb;">${label}</td><td style="padding:8px 14px;color:#111;font-size:12px;border-bottom:1px solid #e5e7eb;">${value}</td></tr>`).join("")}</table></div>`;
    })() : "";

    // 컨설턴트용 - 로드맵 섹션에 방향성 표 HTML 생성
    const buildRoadmapConsultantHtml = (roadmapData: import('@/shared/types').RoadmapData, color: string) => {
      const headerCells = roadmapData.columns.map(col => `<th style="background:${color};color:#fff;padding:6px 10px;font-size:11px;">${col}</th>`).join('');
      const bodyRows = roadmapData.rows.map((row) => {
        const cells = row.cells.map(cell => {
          const itemsHtml = cell.items.map(item => `<li style="margin:2px 0;font-size:10px;color:#1a1a1a;">${item}</li>`).join('');
          return `<td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;"><div style="font-size:10px;font-weight:700;color:${color};margin-bottom:4px;">${cell.phase}</div><ul style="padding-left:14px;margin:0;">${itemsHtml}</ul></td>`;
        }).join('');
        return `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:${row.color}22;font-weight:700;font-size:11px;">${row.area}</td>${cells}</tr>`;
      }).join('');
      return `<div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:6px;">▶ 단계별 실행 방향성 (컨설턴트 참고용)</div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <thead><tr><th style="background:${color};color:#fff;padding:6px 10px;font-size:11px;">영역</th>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
    };

    // 컨설턴트용 - 업체 데이터 기반 동적 메모 생성
    const buildConsultantNoteHtml = (sectionTitle: string, color: string) => {
      // 업체 데이터 파싱
      const co = company;
      const industry = co?.industry || report.companySummary?.industry || '';
      const companyName = co?.name || report.companyName || '';
      const kcbScore = parseInt(co?.kcbScore || '0', 10);
      const niceScore = parseInt(co?.niceScore || '0', 10);
      const creditScore = kcbScore || niceScore;
      const hasPatent = co?.hasPatent === 'yes';
      const patentCount = parseInt(co?.patentCount || '0', 10);
      const hasVenture = co?.hasVentureCert;
      const hasInnobiz = co?.hasInnobiz;
      const hasExport = co?.hasExportSales === 'yes';
      const hasPlannedExport = co?.hasPlannedExport === 'yes';
      const requiredFunding = co?.requiredFunding || '';
      const fundingOperating = co?.fundingTypeOperating === 'yes';
      const fundingFacility = co?.fundingTypeFacility === 'yes';
      const hasFinancialDelinquency = co?.hasFinancialDelinquency === 'yes';
      const hasTaxDelinquency = co?.hasTaxDelinquency === 'yes';
      const employeeCount = parseInt(co?.employeeCount || '0', 10);
      const year25Sales = parseInt((co?.year25Sales || '0').replace(/[^0-9]/g, ''), 10);
      const year24Sales = parseInt((co?.year24Sales || '0').replace(/[^0-9]/g, ''), 10);
      const salesTrend = year25Sales > 0 && year24Sales > 0
        ? (year25Sales >= year24Sales ? '매출 성장세' : '매출 감소세')
        : '매출 추이 파악 필요';
      const isManufacturing = industry.includes('제조') || industry.includes('생산');
      const isIT = industry.includes('IT') || industry.includes('소프트') || industry.includes('정보') || industry.includes('기술');
      const isFoodBiz = industry.includes('식품') || industry.includes('음식') || industry.includes('외식');

      // 신용 상태 평가
      const creditStatus = hasFinancialDelinquency || hasTaxDelinquency
        ? '⚠️ 금융연체 또는 세금체납 이력이 있어 정책자금 신청 전 반드시 해소 필요'
        : creditScore >= 800 ? `✅ 신용점수 ${creditScore}점 — 기술보증기금·신용보증기금 모두 신청 가능한 우량 신용`
        : creditScore >= 700 ? `✅ 신용점수 ${creditScore}점 — 기보·소진공 신청 가능, 신보(800점 이상) 신청은 신용 개선 후 검토`
        : creditScore >= 550 ? `⚠️ 신용점수 ${creditScore}점 — 신용취약자 전용 상품(소진공 신용취약자보증) 우선 검토`
        : '신용점수 미입력 — 상담 시 KCB/NICE 신용점수 확인 필수';

      // 신용점수 구간별 추천 정책자금 상품 매핑
      const getRecommendedProducts = () => {
        const score = niceScore || kcbScore;
        if (hasFinancialDelinquency || hasTaxDelinquency) {
          return { products: [], summary: '⚠️ 금융연체 또는 세금체납 이력이 있어 현재 정책자금 신청이 불가합니다. 연체 해소 및 체납 납부 후 신용 회복 절차를 먼저 진행하세요.' };
        }
        if (score === 0) {
          return {
            products: [
              { institution: '소진공', productName: '일반경영안정자금', reason: '신용점수 미입력 상태. 소진공은 상대적으로 낮은 신용 요건으로 접근 가능' },
              { institution: '신용보증재단', productName: '일반보증 (소상공인 신용보증)', reason: '지역 신용보증재단은 신용점수 요건이 유연하여 소상공인에게 적합' },
            ],
            summary: '신용점수가 입력되지 않았습니다. 상담 시 KCB/NICE 신용점수를 반드시 확인하세요.',
          };
        }
        if (score >= 830) {
          return {
            products: [
              { institution: '중진공', productName: isManufacturing ? '신성장기반자금' : '혁신창업사업화자금', reason: `NICE ${score}점 - 중진공 기준(830점) 충족. ${isManufacturing ? '제조업 시설·운전자금 최대 60~70억원' : '사업화 자금 최대 60억원'} 지원 가능` },
              { institution: '신용보증기금', productName: hasPatent ? '지식재산(IP)보증' : (hasVenture || hasInnobiz ? '창업기업보증' : '일반신용보증'), reason: `NICE ${score}점 - 신보 기준(800점) 충족. ${hasPatent ? 'IP보증으로 특허 활용 보증료 우대' : hasVenture ? '벤처인증 우대 보증' : '일반 신용보증 최대 30억원'}` },
              { institution: '기술보증기금', productName: hasVenture || hasInnobiz ? '벤처·이노비즈 보증' : (isIT ? '일반기술보증' : '창업기업 기술보증'), reason: `NICE ${score}점 - 기보 기준(700점) 충족. ${hasVenture || hasInnobiz ? '벤처·이노비즈 우대 보증료 0.3~1.0%' : '기술평가 기반 보증 최대 30억원'}` },
            ],
            summary: `NICE ${score}점 - 최우량 신용 구간. 중진공·신보·기보 모두 신청 가능. 중진공 직접대출 → 기보/신보 보증 → 은행권 순서로 단계적 조달 권고.`,
          };
        }
        if (score >= 800) {
          return {
            products: [
              { institution: '신용보증기금', productName: hasPatent ? '지식재산(IP)보증' : '일반신용보증', reason: `NICE ${score}점 - 신보 기준(800점) 충족. ${hasPatent ? 'IP보증 보증료 우대 (0.2~0.5%p 감면)' : '일반 신용보증 최대 30억원'}. 중진공(830점 미달)은 신용 개선 후 재도전.` },
              { institution: '기술보증기금', productName: hasVenture || hasInnobiz ? '벤처·이노비즈 보증' : '일반기술보증', reason: `NICE ${score}점 - 기보 기준(700점) 충족. ${hasVenture || hasInnobiz ? '인증 보유로 우대 보증료 적용' : '기술평가 통해 보증 한도 산정'}` },
              { institution: '소진공', productName: '일반경영안정자금', reason: `NICE ${score}점 - 소진공 기준(700점) 충족. 소상공인 대상 운전자금 최대 7천만원. 중진공 신청 전 브릿지 자금으로 활용 가능.` },
            ],
            summary: `NICE ${score}점 - 우량 신용 구간. 신보·기보·소진공 신청 가능. 중진공은 830점 미달로 신용 개선(약 30점) 후 재신청 권고.`,
          };
        }
        if (score >= 700) {
          return {
            products: [
              { institution: '기술보증기금', productName: hasPatent ? '일반기술보증' : (hasVenture || hasInnobiz ? '벤처·이노비즈 보증' : '창업기업 기술보증'), reason: `NICE ${score}점 - 기보 기준(700점) 충족. ${hasPatent ? '특허 보유로 기술평가 가점 기대' : hasVenture ? '벤처인증 우대 보증' : '기술력 중심 평가로 담보 부족 보완 가능'}. 신보(800점 미달)·중진공(830점 미달)은 신용 개선 후 재도전.` },
              { institution: '소진공', productName: '일반경영안정자금', reason: `NICE ${score}점 - 소진공 기준(700점) 충족. 소상공인 운전자금 최대 7천만원. 기보 보증과 병행 활용 가능.` },
              { institution: '신용보증재단', productName: '일반보증 (소상공인 신용보증)', reason: `지역 신용보증재단은 신용점수 요건이 유연. 최대 2억원 보증. 기보·소진공과 중복 활용 가능.` },
            ],
            summary: `NICE ${score}점 - 양호 신용 구간. 기보·소진공·신용보증재단 신청 가능. 신보는 800점, 중진공은 830점 이상 필요하므로 신용 개선 계획 수립 권고.`,
          };
        }
        if (score >= 550) {
          return {
            products: [
              { institution: '소진공', productName: '신용취약소상공인자금', reason: `NICE ${score}점 - 신용취약 구간(550~839점). 소상공인 지식배움터 신용관리 교육 이수 후 신청 가능. 최대 3천만원.` },
              { institution: '신용보증재단', productName: '일반보증 (소상공인 신용보증)', reason: `지역 신용보증재단은 신용점수 요건이 상대적으로 유연. 소상공인 최대 2억원 보증. 신용 개선과 병행 활용 권고.` },
            ],
            summary: `NICE ${score}점 - 신용취약 구간. 소진공 신용취약소상공인자금(교육 이수 필수)과 신용보증재단 보증 활용 가능. 신용 개선 목표: 700점(기보), 800점(신보), 830점(중진공). 신용관리 전문 상담 병행 권고.`,
          };
        }
        return {
          products: [],
          summary: `NICE ${score}점 - 신용 위험 구간. 현재 대부분의 정책자금 신청이 어렵습니다. 신용회복위원회 채무조정, 개인회생 등을 통한 신용 회복이 선행되어야 합니다. 목표: 550점 이상(소진공 신용취약자금) → 700점(기보) 단계적 회복.`,
        };
      };
      const recommendedResult = getRecommendedProducts();

      // 섹션별 동적 메모 생성
      let memoLines: string[] = [];

      if (sectionTitle.includes('결론') || sectionTitle.includes('종합의견')) {
        // 특허/인증 전략
        if (hasPatent && patentCount > 0) {
          memoLines.push(`• 특허 활용 전략: 보유 특허 ${patentCount}건을 기술보증기금 기술평가에 적극 활용. 특허 1건당 보증 한도 상향 효과 기대. 추가 특허 출원 시 R&D 바우처 사업 연계 검토.`);
        } else {
          memoLines.push(`• 특허 취득 권고: 현재 특허 미보유 상태. ${industry} 업종 핵심 기술에 대한 특허 출원 시 기술보증기금 우대 혜택 및 세제 감면 효과 기대. 특허청 중소기업 특허 지원 프로그램 활용 권고.`);
        }
        if (!hasVenture && !hasInnobiz) {
          memoLines.push(`• 벤처·이노비즈 인증 권고: 현재 미취득 상태. 벤처기업 인증 취득 시 정책자금 우대 금리, 세제 감면(법인세 50% 감면), 조달청 우선구매 혜택 적용 가능.`);
        } else {
          memoLines.push(`• 인증 유지 및 고도화: 보유 인증을 정책자금 신청 시 적극 활용. 인증 갱신 시기 사전 확인 및 이노비즈 → 메인비즈 등 상위 인증 취득 검토.`);
        }
        // 수출 전략
        if (hasExport) {
          memoLines.push(`• 수출 확대 전략: 기존 수출 경험을 바탕으로 KOTRA 수출바우처(최대 1억원 지원), 해외지사화 사업 연계. ${isManufacturing ? '제조업 특성상 OEM 수출 및 해외 전시회 참가 지원사업 활용 권고.' : '온라인 수출 플랫폼(아마존, 알리바바) 확대 검토.'}`);
        } else if (hasPlannedExport) {
          memoLines.push(`• 수출 준비 지원: 수출 예정 기업으로 KOTRA 해외지사화 사업(연 1,200만원 지원), 수출바우처 프로그램 신청 권고. 초기 수출 비용 절감 가능.`);
        } else {
          memoLines.push(`• 수출 진출 검토: ${industry} 업종의 해외 수요 파악 후 단계적 수출 전략 수립 권고. 1단계 온라인 수출(아마존, 알리바바) → 2단계 직접 수출 순서로 접근.`);
        }
        // 마케팅
        memoLines.push(`• 마케팅 전략: ${isManufacturing ? 'B2B 플랫폼(네이버 스마트스토어, 아이마켓코리아) 활용 및 제조업 특화 전시회 참가.' : isIT ? 'IT 서비스 특성상 콘텐츠 마케팅(블로그, 유튜브) 및 SEO 최적화 집중.' : isFoodBiz ? '식품 업종 특성상 SNS 마케팅(인스타그램, 유튜브 쇼츠) 및 배달 플랫폼 연계.' : 'SNS 마케팅(인스타그램/유튜브) 및 B2B 플랫폼 활용.'} 중소기업 마케팅 지원사업(소상공인시장진흥공단) 연계 검토.`);
        // 신용 상태
        memoLines.push(`• 신용 현황: ${creditStatus}`);
        // 정책자금 로드맵
        memoLines.push(`• 정책자금 전략: ${salesTrend} 확인. ${isManufacturing ? '제조업 우대 — 기술보증기금 → 중진공 → 은행권' : '기술보증기금 또는 신용보증기금 → 중진공 → 은행권'} 순서로 단계적 자금 조달 권고.`);
        // 신용점수 구간별 추천 상품 목록
        memoLines.push(`• [신용점수 기반 추천 상품] ${recommendedResult.summary}`);
        if (recommendedResult.products.length > 0) {
          recommendedResult.products.forEach(p => {
            memoLines.push(`   ▸ ${p.institution} - ${p.productName}: ${p.reason}`);
          });
        }
        // 신용점수 개선 로드맵
        const score = niceScore || kcbScore;
        if (score > 0 && !hasFinancialDelinquency && !hasTaxDelinquency) {
          memoLines.push(`• [신용점수 개선 로드맵] 현재 ${score}점 기준 단계별 목표 및 예상 기간:`);
          if (score < 550) {
            memoLines.push(`   ▸ 단계1 (${score}점 → 550점, 예상 6~12개월): 신용회복위원회 접수 후 신용관리사 상담. 체무조정/개인회생 여부 판단. 연체 중인 소액부터 체납 시작. 성공 시 소진공 신용취약자자금 신청 가능.`);
            memoLines.push(`   ▸ 단계2 (550점 → 700점, 예상 12~24개월): 소진공 신용취약자자금 활용하면서 신용 조회 수 줄이기(월 2회 이내). 신용카드 사용량 30% 이내 유지. 기보 신청 가능 수준 도달 목표.`);
            memoLines.push(`   ▸ 단계3 (700점 → 800점, 예상 12~18개월): 신용카드 실적 축적(정시 사용 + 전액 납부). 부동산 담보 대출 유지. 신보 신청 가능 수준 도달 목표.`);
          } else if (score < 700) {
            memoLines.push(`   ▸ 다음 목표 (${score}점 → 700점, 예상 12~24개월): 소진공 신용취약자자금 활용하면서 신용 조회 수 줄이기(월 2회 이내). 신용카드 사용량 30% 이내 유지. 연체 전액 해소 후 신규 연체 발생 방지.`);
            memoLines.push(`   ▸ 다단계 목표 (700점 → 800점, 예상 12~18개월): 신용카드 실적 축적(정시 사용 + 전액 납부). 부동산 담보 대출 유지. 신보 신청 가능 수준 도달 목표.`);
            memoLines.push(`   ▸ 장기 목표 (800점 → 830점, 예상 18~24개월): 신용 거래 실적 누적(다양한 금융기관 거래). 부대이용 없이 신용카드 정시 사용. 중진공 직접대출 신청 가능 수준 도달 목표.`);
          } else if (score < 800) {
            memoLines.push(`   ▸ 다음 목표 (${score}점 → 800점, 예상 12~18개월): 신용카드 실적 축적(정시 사용 + 전액 납부). 부동산 담보 대출 유지. 신규 연체 발생 방지. 신보 신청 가능 수준 도달.`);
            memoLines.push(`   ▸ 장기 목표 (800점 → 830점, 예상 18~24개월): 신용 거래 실적 누적(다양한 금융기관 거래). 부대이용 없이 신용카드 정시 사용. 중진공 직접대출 신청 가능 수준 도달.`);
          } else if (score < 830) {
            memoLines.push(`   ▸ 다음 목표 (${score}점 → 830점, 예상 12~18개월): 신용 거래 실적 누적(다양한 금융기관 거래). 부대이용 없이 신용카드 정시 사용. 중진공 직접대출 신청 가능 수준 도달.`);
            memoLines.push(`   ▸ 탁월한 신용 유지: 부대이용 없이 신용카드 정시 사용 지속. 주기적 신용보고서 확인(연 1회). 중진공 직접대출 신청 시 우대 금리 혜택 유지.`);
          } else {
            memoLines.push(`   ▸ 탁월한 신용 유지 (${score}점): 중진공·신보·기보 모두 신청 가능한 최우량 신용. 부대이용 없이 신용카드 정시 사용 지속. 주기적 신용보고서 확인(연 1회). 중진공 직접대출 신청 시 우대 금리 혜택 유지.`);
          }
        } else if (hasFinancialDelinquency || hasTaxDelinquency) {
          memoLines.push(`• [신용 회복 우선 과제] 연체/체납 해소 전에는 정책자금 신청이 불가합니다. 단계: 1) 연체 전액 납부 → 2) 세금 체납 해소 → 3) 신용관리사 상담 → 4) 신용점수 회복 후 정책자금 신청. 예상 기간: 연체 해소 후 6~12개월.`);
        }

      } else if (sectionTitle.includes('실행 계획') || sectionTitle.includes('로드맵') || sectionTitle.includes('단계별')) {
        memoLines.push(`• 1단계 핵심 과제 (${companyName}): ${!hasPatent ? '특허 출원 및 ' : ''}${!hasVenture ? '벤처인증 취득, ' : ''}내부 역량 강화 및 기반 구축. 핵심 인력 확보, 시스템 정비에 집중.`);
        memoLines.push(`• 2단계 핵심 과제: 시장 확대 및 매출 성장. ${industry} 업종 특화 신규 거래처 발굴, 마케팅 강화, 제품/서비스 고도화. 목표: ${year25Sales > 0 ? `전년(${year25Sales.toLocaleString()}만원) 대비 20% 이상 성장` : '매출 20% 이상 성장'}.`);
        memoLines.push(`• 3단계 핵심 과제: 지속 성장 체계 구축. ${hasExport || hasPlannedExport ? '수출 확대,' : '수출 진출,'} 투자 유치, 브랜드 강화.`);
        memoLines.push(`• 컨설턴트 주의사항: 각 단계 전환 시 자금 소요 시기를 사전에 파악하여 정책자금 신청 타이밍 조율 필요. 신용 현황: ${creditStatus}`);
        memoLines.push(`• 정부지원사업 연계: ${isManufacturing ? '스마트공장 구축 지원, 제조혁신 바우처' : isIT ? 'SW 개발 지원사업, 디지털 전환 바우처' : '소상공인 경영혁신 지원사업'} 등 단계별 매칭 전략 수립.`);

      } else if (sectionTitle.includes('자금 사용')) {
        if (fundingOperating) {
          memoLines.push(`• 운전자금 집행 우선순위: ${isManufacturing ? '원자재/재료비 → 인건비 → 마케팅' : '인건비 → 원자재/재료비 → 마케팅'} 순으로 집행. 초기 3개월 운영자금은 반드시 확보 후 집행.`);
          memoLines.push(`• 운전자금 한도 참고: ${requiredFunding ? `신청 예정 ${requiredFunding}` : '필요자금 미입력'}. ${isManufacturing ? '제조업 기준 전년 매출의 1/3~1/4 수준' : '일반 업종 기준 전년 매출의 1/6~1/10 수준'} 한도 예상.`);
        }
        if (fundingFacility) {
          memoLines.push(`• 시설자금 집행 시 주의: 설비 구입 전 리스 vs 구매 비교 분석 필수. 중소기업 설비 구입 지원사업(중진공 시설자금) 연계 검토. 설비 구입 후 감가상각 계획 수립 권고.`);
        }
        if (!fundingOperating && !fundingFacility) {
          memoLines.push(`• 자금 유형 미선택: 운전자금/시설자금 구분 확인 후 용도에 맞는 정책자금 상품 선택 필요. 혼용 불가 원칙 준수.`);
        }
        memoLines.push(`• 자금 집행 모니터링: 월별 집행 현황 점검 및 잔액 관리. 예상 외 지출 발생 시 즉시 컨설턴트에게 보고. 집행 증빙서류(세금계산서, 계약서) 반드시 보관.`);
        memoLines.push(`• 신용 현황: ${creditStatus}`);
      }

      if (memoLines.length === 0) return '';
      const memoText = memoLines.join('\n');
      return `<div style="margin-top:14px;background:#FFF9E6;border:1.5px dashed #F59E0B;border-radius:8px;padding:12px 14px;">
        <div style="font-size:10px;font-weight:700;color:#92400E;margin-bottom:6px;">📋 컨설턴트 참고 메모 (${companyName} 맞춤)</div>
        <div style="font-size:11px;color:#78350F;line-height:1.8;white-space:pre-wrap;">${memoText}</div>
      </div>`;
    };

    // 마크다운 콘텐츠를 HTML로 변환 (표 '---' 제거 포함)
    const mdToHtml = (md: string): string => {
      if (!md) return '';
      let content = md.replace(/<br\s*\/?>/gi, '\n');
      // 표 구분선 행 (연속된 | --- | 형태) 제거
      content = content.replace(/^\|[\s\-:|]+\|$/gm, '');
      // 모든 셀이 '---'인 행 제거
      content = content.replace(/^\|(?:\s*:?-+:?\s*\|)+$/gm, '');
      // 마크다운 표를 HTML로 변환
      const lines = content.split('\n');
      let html = '';
      let inTable = false;
      let tableRows: string[][] = [];
      let tableHeaders: string[] = [];
      
      const flushTable = () => {
        if (tableHeaders.length === 0 && tableRows.length === 0) return;
        html += `<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:11px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">`;
        if (tableHeaders.length > 0) {
          html += `<thead><tr>${tableHeaders.map(h => `<th style="background:${typeColorHex}18;padding:7px 10px;text-align:left;font-weight:700;border-bottom:2px solid ${typeColorHex}33;font-size:11px;">${h}</th>`).join('')}</tr></thead>`;
        }
        html += `<tbody>`;
        tableRows.forEach((row, ri) => {
          const bg = ri % 2 === 0 ? '#ffffff' : `${typeColorHex}06`;
          html += `<tr style="background:${bg};">${row.map(cell => `<td style="padding:7px 10px;border-bottom:1px solid #f3f4f6;color:#111;line-height:1.5;">${cell}</td>`).join('')}</tr>`;
        });
        html += `</tbody></table>`;
        tableHeaders = [];
        tableRows = [];
        inTable = false;
      };
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
          // 구분선 행 제거
          if (cells.every(c => /^:?-+:?$/.test(c))) return;
          if (!inTable) {
            inTable = true;
            tableHeaders = cells;
          } else {
            tableRows.push(cells);
          }
        } else {
          if (inTable) flushTable();
          // 일반 텍스트 변환
          let processed = trimmed
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');
          if (trimmed.startsWith('### ')) {
            html += `<h3 style="font-size:13px;font-weight:700;margin:12px 0 6px;padding-bottom:4px;border-bottom:2px solid ${typeColorHex}22;color:#111;">${processed.replace(/^###\s*/, '')}</h3>`;
          } else if (trimmed.startsWith('## ')) {
            html += `<h2 style="font-size:14px;font-weight:700;margin:14px 0 6px;color:#111;">${processed.replace(/^##\s*/, '')}</h2>`;
          } else if (trimmed.match(/^[-*]\s+/)) {
            html += `<li style="margin:3px 0;color:#1a1a1a;line-height:1.7;">${processed.replace(/^[-*]\s+/, '')}</li>`;
          } else if (trimmed) {
            html += `<p style="margin:4px 0;color:#1a1a1a;line-height:1.8;">${processed}</p>`;
          }
        }
      });
      if (inTable) flushTable();
      return html;
    };

    // PEST/SWOT 2x2 박스 HTML 생성
    const buildPestSwotHtml = (content: string, type: 'pest' | 'swot'): string => {
      const isPest = type === 'pest';
      const quadrants = isPest ? [
        { label: 'P — 정치적 (Political)', color: '#3B82F6', lightBg: '#EFF6FF', keywords: ['정치', 'political', '규제', '정부', '정책', '법', '제도'] },
        { label: 'E — 경제적 (Economic)', color: '#10B981', lightBg: '#ECFDF5', keywords: ['경제', 'economic', '시장', '성장', '물가', '환율', '수요'] },
        { label: 'S — 사회적 (Social)', color: '#F59E0B', lightBg: '#FFFBEB', keywords: ['사회', 'social', '문화', '인구', '소비', '트렌드', '인식'] },
        { label: 'T — 기술적 (Technological)', color: '#8B5CF6', lightBg: '#F5F3FF', keywords: ['기술', 'technological', '혁신', '디지털', 'ai', '자동화', 'it'] },
      ] : [
        { label: 'S — 강점 (Strengths)', color: '#10B981', lightBg: '#ECFDF5', keywords: ['강점', 'strength', '장점', '우수', '핵심역량', '경쟁력'] },
        { label: 'W — 약점 (Weaknesses)', color: '#EF4444', lightBg: '#FEF2F2', keywords: ['약점', 'weakness', '한계', '부족', '문제점', '미흡'] },
        { label: 'O — 기회 (Opportunities)', color: '#3B82F6', lightBg: '#EFF6FF', keywords: ['기회', 'opportunit', '시장기회', '성장', '확대', '신규'] },
        { label: 'T — 위협 (Threats)', color: '#F59E0B', lightBg: '#FFFBEB', keywords: ['위협', 'threat', '리스크', '경쟁', '규제', '위험'] },
      ];
      const lines = content.split('\n');
      const qContents: string[][] = [[], [], [], []];
      let curQ = -1;
      lines.forEach(line => {
        const t = line.trim();
        if (!t) return;
        const isH = t.startsWith('###') || t.startsWith('##') || (t.startsWith('**') && t.endsWith('**')) || /^\d+\.\s/.test(t);
        if (isH) {
          const ht = t.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/^\d+\.\s*/, '').toLowerCase();
          const idx = quadrants.findIndex(q => q.keywords.some(k => ht.includes(k)));
          if (idx >= 0) { curQ = idx; return; }
        }
        if (!isH) {
          const item = t.replace(/^[-*•]\s*/, '').trim();
          if (item && !/^:?-+:?$/.test(item)) {
            if (curQ >= 0) qContents[curQ].push(item);
            else { const ai = quadrants.findIndex(q => q.keywords.some(k => item.toLowerCase().includes(k))); qContents[ai >= 0 ? ai : 0].push(item); }
          }
        }
      });
      const total = qContents.reduce((s, a) => s + a.length, 0);
      if (total === 0) {
        const all = lines.map(l => l.trim().replace(/^[-*•#]\s*/, '').replace(/\*\*/g, '').trim()).filter(l => l && !/^:?-+:?$/.test(l));
        const pq = Math.ceil(all.length / 4);
        all.forEach((item, idx) => qContents[Math.min(Math.floor(idx / pq), 3)].push(item));
      }
      const cellHtml = (qi: number) => qContents[qi].length === 0
        ? '<p style="font-size:10px;color:#9ca3af;margin:0;">(내용 없음)</p>'
        : qContents[qi].slice(0, 6).map(item => `<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;"><span style="width:5px;height:5px;border-radius:50%;background:${quadrants[qi].color};flex-shrink:0;margin-top:4px;"></span><span style="font-size:10px;color:#1f2937;line-height:1.5;">${item}</span></div>`).join('');
      return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">${quadrants.map((q, qi) => `<div style="border-radius:10px;overflow:hidden;border:1px solid ${q.color}44;"><div style="background:${q.color};color:#fff;font-size:10px;font-weight:700;padding:7px 10px;">${q.label}</div><div style="background:${q.lightBg};padding:10px;min-height:80px;">${cellHtml(qi)}</div></div>`).join('')}</div>`;
    };

    // 연도별 인포그래픽 HTML 생성
    const buildYearInfographicHtml = (content: string): string => {
      const yearColors = [
        { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', icon: '🌱', label: '씨앗' },
        { bg: '#F0FDF4', border: '#10B981', text: '#065F46', icon: '🌿', label: '성장' },
        { bg: '#FDF4FF', border: '#8B5CF6', text: '#5B21B6', icon: '🍎', label: '열매' },
        { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', icon: '🌟', label: '도약' },
      ];
      const lines = content.split('\n');
      const blocks: { year: string; content: string; ci: number }[] = [];
      let curYear = ''; let curContent: string[] = []; let cnt = 0;
      lines.forEach(line => {
        const t = line.trim();
        const m = t.match(/\*?\*?(20\d{2}년(?:\s*\([^)]*\))?)\*?\*?[:\s]/);
        if (m) {
          if (curYear) blocks.push({ year: curYear, content: curContent.join(' '), ci: Math.min(cnt - 1, 3) });
          curYear = m[1]; curContent = [t.replace(/^\*?\*?20\d{2}년(?:\s*\([^)]*\))?\*?\*?[:\s]*/, '').trim()]; cnt++;
        } else if (curYear && t) curContent.push(t.replace(/^[-*•]\s*/, '').trim());
      });
      if (curYear) blocks.push({ year: curYear, content: curContent.join(' '), ci: Math.min(cnt - 1, 3) });
      if (blocks.length === 0) return '';
      return `<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">${blocks.map(b => { const yc = yearColors[b.ci]; return `<div style="border-left:4px solid ${yc.border};background:${yc.bg};border-radius:8px;padding:10px 14px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span style="font-size:16px;">${yc.icon}</span><span style="font-size:12px;font-weight:700;color:${yc.text};">${b.year}</span><span style="font-size:9px;background:${yc.border};color:#fff;padding:2px 8px;border-radius:8px;">${yc.label}</span></div>${b.content ? `<p style="font-size:11px;color:#374151;line-height:1.6;margin:0 0 0 24px;">${b.content}</p>` : ''}</div>`; }).join('')}</div>`;
    };

    const sectionsHtml = report.sections
      .map(
        (s, i) => {
          const isPest = s.title.includes('PEST') || s.title.includes('pest');
          const isSwot = s.title.includes('SWOT') || s.title.includes('swot') || (s.title.includes('강점') && s.title.includes('약점'));
          const isYearSection = (s.title.includes('실행') || s.title.includes('로드맵') || s.title.includes('단계별') || s.title.includes('연도별')) && /20\d{2}년/.test(s.content) && !s.roadmapData;
          let contentHtml = '';
          if (isPest) {
            contentHtml = buildPestSwotHtml(s.content, 'pest');
          } else if (isSwot) {
            contentHtml = buildPestSwotHtml(s.content, 'swot');
          } else {
            contentHtml = `<div style="font-size:12px;color:#1a1a1a;line-height:1.9;">${mdToHtml(s.content)}</div>`;
            if (isYearSection) contentHtml += buildYearInfographicHtml(s.content);
          }
          return `
      <div style="page-break-before:${i > 0 ? 'always' : 'auto'};margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid ${typeColorHex}22;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;background:${typeColorHex};color:#fff;font-size:13px;font-weight:700;flex-shrink:0;">${i + 1}</span>
          <span style="font-size:14px;font-weight:700;color:#111;">${s.title}</span>
        </div>
        ${contentHtml}
        ${isConsultant && s.roadmapData ? buildRoadmapConsultantHtml(s.roadmapData, typeColorHex) : ''}
        ${isConsultant ? buildConsultantNoteHtml(s.title, typeColorHex) : ''}
      </div>`;
        }
      )
      .join("");

    // 표지 페이지 HTML - 네이비 사이드바 디자인
    const cs = report.companySummary;
    const coverInfoRows = cs ? [
      ["사업자번호", cs.businessNumber || "-"],
      ["업종", cs.industry || "-"],
      ["대표자명", cs.representativeName || "-"],
      ["사업장주소", cs.businessAddress || "-"],
    ].filter(([, v]) => v && v !== "-" && v !== "미입력") : [];

    const coverInfoHtml = coverInfoRows.length > 0 ? `
      <div style="background:#f8fafc;border-left:4px solid ${typeColorHex};padding:16px 20px;margin:24px 0;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;">
          ${coverInfoRows.map(([label, value]) =>
            `<div><span style="font-size:10px;font-weight:700;color:${typeColorHex};">${label}</span><br/><span style="font-size:11px;color:#374151;">${value}</span></div>`
          ).join("")}
          ${cs?.previousYearSales ? `<div><span style="font-size:10px;font-weight:700;color:${typeColorHex};">전년도 매출</span><br/><span style="font-size:11px;color:#374151;">${cs.previousYearSales}</span></div>` : ""}
          ${cs?.estimatedCurrentYearSales ? `<div><span style="font-size:10px;font-weight:700;color:${typeColorHex};">금년 예상 매출</span><br/><span style="font-size:11px;color:#374151;">${cs.estimatedCurrentYearSales}</span></div>` : ""}
        </div>
      </div>` : "";

    const coverChartHtml = (cs?.previousYearSales || cs?.estimatedCurrentYearSales) ? `
      <div style="background:#f1f5f9;padding:16px 20px;margin:16px 0;">
        <div style="font-size:10px;font-weight:700;color:#6b7280;margin-bottom:10px;">매출 추이</div>
        <div style="display:flex;align-items:flex-end;gap:16px;height:70px;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:32px;height:40px;background:${typeColorHex}55;border-radius:3px 3px 0 0;"></div>
            <span style="font-size:9px;color:#6b7280;">전전년도</span>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:32px;height:55px;background:${typeColorHex}88;border-radius:3px 3px 0 0;"></div>
            <span style="font-size:9px;color:#6b7280;">전년도</span>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:32px;height:65px;background:${typeColorHex};border-radius:3px 3px 0 0;"></div>
            <span style="font-size:9px;color:#6b7280;">금년 예상</span>
          </div>
        </div>
      </div>` : "";

    const consultantBannerHtml = isConsultant ? `
      <div style="background:#92400E;color:#fff;text-align:center;padding:8px;font-size:11px;font-weight:700;letter-spacing:1px;">
        🔒 컨설턴트 전용 문서 — 외부 배포 금지
      </div>` : '';

    const coverPageHtml = `<div style="page-break-after:always;position:relative;min-height:95vh;margin:0;padding:0;display:flex;flex-direction:column;">
      ${consultantBannerHtml}
      <div style="display:flex;flex:1;">
        <!-- 왼쪽 네이비 사이드바 -->
        <div style="width:28px;min-height:100vh;background:${typeColorHex};flex-shrink:0;"></div>
        <!-- 오른쪽 상단 장식 블록 -->
        <div style="position:absolute;top:${isConsultant ? '40px' : '0'};right:0;width:60px;height:80px;background:${typeColorHex};"></div>
        <div style="position:absolute;top:${isConsultant ? '40px' : '0'};right:60px;width:40px;height:50px;background:${typeColorHex};opacity:0.4;"></div>
        <!-- 본문 영역 -->
        <div style="flex:1;padding:50px 50px 40px 40px;box-sizing:border-box;">
          <!-- 보고서 타입 뱃지 -->
          <div style="font-size:11px;font-weight:700;color:${typeColorHex};margin-bottom:10px;">${typeLabel}</div>
          <!-- 구분선 -->
          <div style="width:60%;height:2px;background:${typeColorHex};margin-bottom:16px;"></div>
          <!-- 큰 제목 -->
          <div style="font-size:36px;font-weight:700;color:#111;line-height:1.3;margin-bottom:12px;">${typeLabel}</div>
          <!-- 회사명 -->
          <div style="font-size:18px;color:#374151;margin-bottom:0;">${report.companyName}</div>
          <!-- 업체 정보 박스 -->
          ${coverInfoHtml}
          <!-- 차트 영역 -->
          ${coverChartHtml}
          <!-- 하단 정보 -->
          <div style="position:absolute;bottom:40px;left:68px;right:50px;">
            <div style="border-top:1px solid #e5e7eb;padding-top:12px;display:flex;gap:24px;">
              <div style="font-size:9px;color:#6b7280;">작성일: ${dateStr}</div>
              <div style="font-size:9px;color:#6b7280;">담당자: AI 콘설턴트</div>
              <div style="font-size:9px;color:#6b7280;">소속: BizConsult AI</div>
              ${isConsultant ? '<div style="font-size:9px;color:#92400E;font-weight:700;">【컨설턴트 전용】</div>' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>`;

    return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${report.title}</title><style>body{font-family:-apple-system,sans-serif;margin:0;padding:0;color:#1a1a1a;} h3{font-size:13px;font-weight:700;margin:14px 0 6px;padding-bottom:4px;border-bottom:2px solid ${typeColorHex}22;} strong{font-weight:700;} blockquote{background:${typeColorHex}08;border-left:3px solid ${typeColorHex};border-radius:0 6px 6px 0;padding:8px 12px;margin:8px 0;font-style:normal;} table{width:100%;border-collapse:collapse;margin:8px 0;font-size:11px;} th{background:${typeColorHex}18;padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid ${typeColorHex}33;} td{padding:6px 8px;border-bottom:1px solid #e5e7eb;color:#111;} ul,ol{padding-left:18px;margin:4px 0;} li{margin:2px 0;color:#1a1a1a;} p{color:#1a1a1a;line-height:1.8;}</style></head><body>${coverPageHtml}<div style="padding:0 32px 40px;">${companySummaryHtml}${matchingSummaryHtml}${sectionsHtml}<div style="margin-top:32px;padding-top:14px;border-top:1px solid #e5e7eb;text-align:center;font-size:10px;color:#9ca3af;">BizConsult AI 경영컨설팅 · 본 보고서는 AI가 생성한 참고 자료입니다.</div></div></body></html>`;
  };

  const handlePdfShare = async (mode: 'client' | 'consultant' = 'client') => {
    if (Platform.OS === "web") {
      Alert.alert("알림", "웹에서는 PC 웹사이트의 PDF 다운로드 기능을 이용해주세요.");
      return;
    }
    const isConsultantMode = mode === 'consultant';
    if (isConsultantMode) setConsultantPdfLoading(true);
    else setPdfLoading(true);
    try {
      const html = buildPdfHtml(mode);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${report.title} PDF ${isConsultantMode ? '(컨설턴트용)' : '(업체전달용)'} 공유`,
          UTI: ".pdf",
        });
      } else {
        Alert.alert("알림", "이 기기에서는 파일 공유가 지원되지 않습니다.");
      }
    } catch (e: any) {
      Alert.alert("오류", "PDF 생성 중 오류가 발생했습니다: " + (e.message || ""));
    } finally {
      if (isConsultantMode) setConsultantPdfLoading(false);
      else setPdfLoading(false);
    }
  };

  const handleShare = async () => {
    const fullText = [
      `【${report.title}】`,
      `업체: ${report.companyName}`,
      `작성일: ${new Date(report.createdAt).toLocaleDateString("ko-KR")}`,
      "",
      ...report.sections.map((s) => `■ ${s.title}\n${s.content}`),
    ].join("\n\n");

    try {
      await Share.share({ message: fullText, title: report.title });
    } catch {
      Clipboard.setString(fullText);
      Alert.alert("복사 완료", "보고서 내용이 클립보드에 복사되었습니다.");
    }
  };

  const handleDelete = () => {
    Alert.alert("보고서 삭제", "이 보고서를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await deleteReport(id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>뒤로</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{typeLabel}</Text>
        <View style={styles.headerActions}>
          <Pressable style={({ pressed }) => [pressed && { opacity: 0.6 }]} onPress={handleShare}>
            <IconSymbol name="square.and.arrow.up" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [{ marginLeft: 12 }, pressed && { opacity: 0.6 }]}
            onPress={handleDelete}
          >
            <IconSymbol name="trash" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Report Header Card */}
        <View style={[styles.reportHeader, { backgroundColor: typeColor }]}>
          <View style={[styles.reportTypeIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <IconSymbol name={typeIconName} size={24} color="#fff" />
          </View>
          <View style={[styles.reportTypeBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.reportTypeBadgeText}>{typeLabel}</Text>
          </View>
          <Text style={styles.reportTitle}>{report.title}</Text>
          <View style={styles.reportMeta}>
            <View style={styles.reportMetaItem}>
              <IconSymbol name="building.2.fill" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.reportMetaText}>{report.companyName}</Text>
            </View>
            <Text style={styles.reportMetaDot}>·</Text>
            <View style={styles.reportMetaItem}>
              <IconSymbol name="calendar" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.reportMetaText}>
                {new Date(report.createdAt).toLocaleDateString("ko-KR")}
              </Text>
            </View>
          </View>
        </View>

        {/* 기업현황표 (모든 보고서 공통) */}
        {report.companySummary && (
          <View style={[styles.companySummaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.companySummaryHeader}>
              <View style={[styles.sectionNumber, { backgroundColor: typeColor }]}>
                <Text style={styles.sectionNumberTextWhite}>{"\u2605"}</Text>
              </View>
              <Text style={[styles.companySummaryTitle, { color: colors.foreground }]}>기업현황</Text>
            </View>
            {[
              ["기업명", report.companySummary.name],
              ["사업자등록번호", report.companySummary.businessNumber],
              ["법인등록번호", report.companySummary.corporateNumber],
              ["사업장주소", report.companySummary.businessAddress],
              ["업종", report.companySummary.industry],
              ["대표자명", report.companySummary.representativeName],
              ["수출여부", report.companySummary.hasExportSales],
              ["특허 및 인증", report.companySummary.patentAndCerts],
              ["전년도 매출합계", report.companySummary.previousYearSales],
              ...(report.companySummary.estimatedCurrentYearSales ? [["금년 예상 매출", report.companySummary.estimatedCurrentYearSales]] as [string, string][] : []),
              ...(isFunding ? [
                ["매출", report.companySummary.totalSales],
                ["부채", report.companySummary.totalDebt],
                ["필요자금", report.companySummary.requiredFunding],
              ] as [string, string | undefined][] : []),
            ].filter(([, val]) => val && val !== "미입력" && val !== "-").map(([label, value], i) => (
              <View key={i} style={[styles.companySummaryRow, i % 2 === 0 && { backgroundColor: typeColor + "06" }]}>
                <Text style={[styles.companySummaryLabel, { color: colors.muted }]}>{label}</Text>
                <Text style={[styles.companySummaryValue, { color: colors.foreground }]}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 정책자금 매칭 요약 카드 */}
        {isFunding && report.matchingSummary && (
          <View style={[styles.matchingSummaryCard, { backgroundColor: "#FFF8E7", borderColor: "#F59E0B40" }]}>
            <View style={styles.matchingSummaryHeader}>
              <IconSymbol name="trophy.fill" size={18} color="#F59E0B" />
              <Text style={[styles.matchingSummaryTitle, { color: "#92400E" }]}>
                AI 정책자금 매칭 결과 요약
              </Text>
            </View>
            <View style={{ gap: 10, marginBottom: 12 }}>
              {[
                { rank: "1순위", value: report.matchingSummary.rank1, bg: "#F59E0B" },
                { rank: "2순위", value: report.matchingSummary.rank2, bg: "#EA580C" },
                { rank: "3순위", value: report.matchingSummary.rank3, bg: "#CA8A04" },
                { rank: "4순위", value: report.matchingSummary.rank4, bg: "#65A30D" },
              ].filter(item => item.value && item.value !== '-').map((item) => {
                const parts = item.value.split(' - 예상 한도: ');
                const institutionName = parts[0];
                const estimatedLimit = parts[1] || '';
                const isIneligible = institutionName.includes('(신용점수 미달)');
                return (
                  <View
                    key={item.rank}
                    style={[styles.matchingRankItem, { backgroundColor: "#fff", borderColor: isIneligible ? "#FCA5A5" : "#FDE68A", opacity: isIneligible ? 0.7 : 1 }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <View style={[styles.matchingRankBadge, { backgroundColor: item.bg }]}>
                        <Text style={styles.matchingRankBadgeText}>{item.rank}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a1a1a', flex: 1 }}>
                        {institutionName.replace(' (신용점수 미달)', '')}
                      </Text>
                      {isIneligible ? (
                        <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: '#DC2626' }}>신용 기준 미달</Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: '#16A34A' }}>자격 충족</Text>
                        </View>
                      )}
                    </View>
                    {estimatedLimit ? (
                      <Text style={{ fontSize: 12, color: '#92400E', marginLeft: 60 }}>
                        예상 한도: <Text style={{ fontWeight: '600' }}>{estimatedLimit}</Text>
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
            <View style={[styles.matchingLimit, { backgroundColor: "#FEF3C7" }]}>
              <Text style={[styles.matchingLimitLabel, { color: "#92400E" }]}>한도 산정 기준</Text>
              <Text style={[styles.matchingLimitValue, { color: "#78350F" }]}>
                {report.matchingSummary.estimatedLimit}
              </Text>
            </View>
          </View>
        )}

        {/* 경영진단보고서 탭 분리 UI */}
        {isDiagnosis && (
          <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row' }}>
              <Pressable
                style={[{
                  flex: 1, paddingVertical: 12, alignItems: 'center',
                  backgroundColor: diagnosisTab === 'client' ? '#1D4ED8' : colors.surface,
                }]}
                onPress={() => setDiagnosisTab('client')}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: diagnosisTab === 'client' ? '#fff' : colors.muted }}>
                  📄 업체전달용
                </Text>
              </Pressable>
              <Pressable
                style={[{
                  flex: 1, paddingVertical: 12, alignItems: 'center',
                  backgroundColor: diagnosisTab === 'consultant' ? '#92400E' : colors.surface,
                }]}
                onPress={() => setDiagnosisTab('consultant')}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: diagnosisTab === 'consultant' ? '#fff' : colors.muted }}>
                  🔒 컨설턴트 확인용
                </Text>
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: diagnosisTab === 'consultant' ? '#FEF3C7' : colors.surface }}>
              <Text style={{ fontSize: 11, color: diagnosisTab === 'consultant' ? '#92400E' : colors.muted }}>
                {diagnosisTab === 'client' ? '핵심 분석 내용만 포함된 업체 전달용 보고서입니다.' : '🔒 전문 컨설턴트 조언 및 참고 메모가 포함된 내부 전용 보고서입니다.'}
              </Text>
            </View>
          </View>
        )}

        {/* Sections */}
        <View style={styles.sectionsContainer}>
          {(() => {
            // 컨설턴트용 전용 섹션 판별
            const isConsultantOnly = (title: string) =>
              title.includes('컨설턴트') || title.includes('전문 조언') || title.includes('실질 조언');
            const visibleSections = isDiagnosis && diagnosisTab === 'client'
              ? report.sections.filter(s => !isConsultantOnly(s.title))
              : report.sections;
            return (
              <>
                <View style={styles.sectionsTitleRow}>
                  <Text style={[styles.sectionsTitle, { color: colors.foreground }]}>
                    상세 내용 ({visibleSections.length}개 섹션)
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (expandedSections.size === visibleSections.length) {
                        setExpandedSections(new Set());
                      } else {
                        setExpandedSections(new Set(visibleSections.map((_, i) => i)));
                      }
                    }}
                  >
                    <Text style={[styles.expandAllText, { color: colors.primary }]}>
                      {expandedSections.size === visibleSections.length ? "모두 접기" : "모두 펼치기"}
                    </Text>
                  </Pressable>
                </View>
              </>
            );
          })()}

          {(() => {
            const isConsultantOnly = (title: string) =>
              title.includes('컨설턴트') || title.includes('전문 조언') || title.includes('실질 조언');
            const visibleSections = isDiagnosis && diagnosisTab === 'client'
              ? report.sections.filter(s => !isConsultantOnly(s.title))
              : report.sections;
            return visibleSections;
          })().map((section, idx) => {
            const isExpanded = expandedSections.has(idx);
            const isEditing = editingSection === idx;

            return (
              <View
                key={idx}
                style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {/* Section Header */}
                <Pressable style={styles.sectionHeader} onPress={() => toggleSection(idx)}>
                  <View style={[styles.sectionNumber, { backgroundColor: typeColor }]}>
                    <Text style={styles.sectionNumberTextWhite}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {section.title}
                  </Text>
                  <IconSymbol
                    name={isExpanded ? "chevron.up" : "chevron.down"}
                    size={14}
                    color={colors.muted}
                  />
                </Pressable>

                {/* Section Content */}
                {isExpanded && (
                  <View style={[styles.sectionContent, { borderTopColor: colors.border }]}>
                    {isEditing ? (
                      <View>
                        <TextInput
                          style={[styles.editInput, { color: colors.foreground, borderColor: typeColor }]}
                          value={editedContent}
                          onChangeText={setEditedContent}
                          multiline
                          textAlignVertical="top"
                          autoFocus
                        />
                        <View style={styles.editActions}>
                          <Pressable
                            style={({ pressed }) => [
                              styles.editCancelBtn,
                              { borderColor: colors.border },
                              pressed && { opacity: 0.7 },
                            ]}
                            onPress={() => setEditingSection(null)}
                          >
                            <Text style={[styles.editCancelText, { color: colors.muted }]}>취소</Text>
                          </Pressable>
                          <Pressable
                            style={({ pressed }) => [
                              styles.editSaveBtn,
                              { backgroundColor: typeColor },
                              pressed && { opacity: 0.8 },
                            ]}
                            onPress={() => saveEdit(idx)}
                          >
                            <Text style={styles.editSaveText}>저장</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View>
                        <Markdown style={mdStyles}>{normalizeContent(section.content)}</Markdown>
                        {section.roadmapData && (
                          <RoadmapMatrix data={section.roadmapData} />
                        )}
                        {section.chartData && !section.roadmapData && (
                          <SectionChart chartData={section.chartData} accentColor={typeColor} sectionTitle={section.title} />
                        )}
                        <Pressable
                          style={({ pressed }) => [
                            styles.editButton,
                            { borderColor: colors.border },
                            pressed && { opacity: 0.7 },
                          ]}
                          onPress={() => startEdit(idx, section.content)}
                        >
                          <IconSymbol name="pencil" size={14} color={colors.muted} />
                          <Text style={[styles.editButtonText, { color: colors.muted }]}>편집</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Bottom Action Buttons */}
        <View style={styles.bottomActions}>
          <Pressable
            style={({ pressed }) => [
              styles.shareButton,
              { backgroundColor: typeColor, flex: 1 },
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleShare}
          >
            <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
            <Text style={styles.shareButtonText}>텍스트 공유</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.shareButton,
              { backgroundColor: "#374151", flex: 1, marginLeft: 10 },
              pdfLoading && { opacity: 0.6 },
              pressed && !pdfLoading && { opacity: 0.8 },
            ]}
            onPress={() => handlePdfShare('client')}
            disabled={pdfLoading || consultantPdfLoading}
          >
            <IconSymbol name="doc.fill" size={18} color="#fff" />
            <Text style={styles.shareButtonText}>{pdfLoading ? "PDF 생성 중..." : "업체전달용 PDF"}</Text>
          </Pressable>
        </View>
        {/* 컨설턴트확인용 PDF 버튼 */}
        <View style={[styles.bottomActions, { marginTop: 8 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.shareButton,
              { backgroundColor: "#92400E", flex: 1 },
              consultantPdfLoading && { opacity: 0.6 },
              pressed && !consultantPdfLoading && { opacity: 0.8 },
            ]}
            onPress={() => handlePdfShare('consultant')}
            disabled={pdfLoading || consultantPdfLoading}
          >
            <IconSymbol name="doc.text.fill" size={18} color="#fff" />
            <Text style={styles.shareButtonText}>{consultantPdfLoading ? "PDF 생성 중..." : "컨설턴트확인용 PDF"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 60 },
  backText: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 60,
    justifyContent: "flex-end",
  },
  content: { paddingBottom: 40 },
  reportHeader: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  reportTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  reportTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  reportTypeBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  reportTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
    marginBottom: 12,
  },
  reportMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  reportMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  reportMetaText: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  reportMetaDot: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  sectionsContainer: { paddingHorizontal: 16 },
  sectionsTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionsTitle: { fontSize: 16, fontWeight: "700" },
  expandAllText: { fontSize: 13, fontWeight: "500" },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumberTextWhite: { fontSize: 13, fontWeight: "700", color: "#fff" },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: "600" },
  sectionContent: {
    borderTopWidth: 0.5,
    padding: 14,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editButtonText: { fontSize: 12 },
  editInput: {
    fontSize: 14,
    lineHeight: 24,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    minHeight: 120,
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    justifyContent: "flex-end",
  },
  editCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  editCancelText: { fontSize: 14 },
  editSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editSaveText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  shareButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  bottomActions: {
    flexDirection: "row",
    marginTop: 16,
    marginBottom: 8,
  },
  matchingSummaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  matchingSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  matchingSummaryTitle: { fontSize: 15, fontWeight: "700" },
  matchingRanks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  matchingRankItem: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  matchingRankBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  matchingRankBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  matchingRankValue: { fontSize: 12, lineHeight: 18, fontWeight: "500" },
  matchingLimit: {
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchingLimitLabel: { fontSize: 12, fontWeight: "600" },
  matchingLimitValue: { fontSize: 13, fontWeight: "700" },
  companySummaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden" as const,
  },
  companySummaryHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 12,
  },
  companySummaryTitle: { fontSize: 16, fontWeight: "700" as const },
  companySummaryRow: {
    flexDirection: "row" as const,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  companySummaryLabel: {
    width: 120,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  companySummaryValue: {
    flex: 1,
    fontSize: 13,
  },
});
