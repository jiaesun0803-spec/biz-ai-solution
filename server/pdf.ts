import { Router } from "express";
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pdfRouter = Router();

interface ChartData {
  type: "bar" | "line" | "pie" | "doughnut";
  title: string;
  labels: string[];
  values: number[];
}

interface RoadmapCell {
  phase: string;
  items: string[];
}

interface RoadmapRow {
  area: string;
  color: string;
  cells: RoadmapCell[];
}

interface RoadmapData {
  columns: string[];
  rows: RoadmapRow[];
}

interface ReportSection {
  title: string;
  content: string;
  chartData?: ChartData;
  roadmapData?: RoadmapData;
}

interface MatchingSummary {
  rank1: string;
  rank2: string;
  rank3: string;
  rank4: string;
  estimatedLimit: string;
}

interface CompanySummary {
  name: string;
  businessNumber?: string;
  corporateNumber?: string;
  businessAddress?: string;
  industry?: string;
  representativeName?: string;
  hasExportSales?: string;
  patentAndCerts?: string;
  previousYearSales?: string;
  estimatedCurrentYearSales?: string;
  totalSales?: string;
  totalDebt?: string;
  requiredFunding?: string;
  salesData?: { label: string; value: string; rawValue: number }[];
}

interface CompanyData {
  industry?: string;
  kcbScore?: string;
  niceScore?: string;
  hasPatent?: string;
  patentCount?: string;
  hasVentureCert?: boolean;
  hasInnobiz?: boolean;
  hasExportSales?: string;
  hasPlannedExport?: string;
  requiredFunding?: string;
  fundingTypeOperating?: string;
  fundingTypeFacility?: string;
  hasFinancialDelinquency?: string;
  hasTaxDelinquency?: string;
  year25Sales?: string;
  year24Sales?: string;
  patentAndCerts?: string;
}

interface ReportPdfRequest {
  title: string;
  companyName: string;
  type: "diagnosis" | "business_plan" | "funding_match";
  sections: ReportSection[];
  matchingSummary?: MatchingSummary;
  companySummary?: CompanySummary;
  createdAt: string;
  consultantName?: string;
  consultantCompany?: string;
  isConsultant?: boolean;
  companyData?: CompanyData;
}

/**
 * 신용점수(NICE 기준) 구간별 추천 정책자금 상품 매핑
 * - 830점 이상: 중진공, 신보, 기보, 소진공 모두 가능
 * - 800~829점: 신보, 기보, 소진공 가능 (중진공 미달)
 * - 700~799점: 기보, 소진공 가능 (신보·중진공 미달)
 * - 550~699점: 소진공 신용취약자금 전용
 * - 549점 이하 또는 연체/체납: 정책자금 신청 불가 (신용 개선 선행)
 */
function getRecommendedProductsByScore(
  niceScore: number,
  kcbScore: number,
  hasFinancialDelinquency: boolean,
  hasTaxDelinquency: boolean,
  industry: string,
  hasPatent: boolean,
  hasVentureCert: boolean,
  hasInnobiz: boolean
): { products: { institution: string; productName: string; reason: string; url: string }[]; summary: string } {
  const score = niceScore || kcbScore;
  const isManufacturing = industry.includes('제조') || industry.includes('생산');
  const isIT = industry.includes('IT') || industry.includes('소프트') || industry.includes('정보') || industry.includes('기술');

  // 연체/체납 이력 있으면 정책자금 불가
  if (hasFinancialDelinquency || hasTaxDelinquency) {
    return {
      products: [],
      summary: '⚠️ 금융연체 또는 세금체납 이력이 있어 현재 정책자금 신청이 불가합니다. 연체 해소 및 체납 납부 후 신용 회복 절차를 먼저 진행하세요.',
    };
  }

  if (score === 0) {
    return {
      products: [
        { institution: '소진공', productName: '일반경영안정자금', reason: '신용점수 미입력 상태. 소진공은 상대적으로 낮은 신용 요건으로 접근 가능', url: 'https://www.semas.or.kr' },
        { institution: '신용보증재단', productName: '일반보증 (소상공인 신용보증)', reason: '지역 신용보증재단은 신용점수 요건이 유연하여 소상공인에게 적합', url: 'https://www.sinbo.or.kr' },
      ],
      summary: '신용점수가 입력되지 않았습니다. 상담 시 KCB/NICE 신용점수를 반드시 확인하세요.',
    };
  }

  // 830점 이상: 최우량 - 모든 기관 신청 가능
  if (score >= 830) {
    const products: { institution: string; productName: string; reason: string; url: string }[] = [
      {
        institution: '중진공',
        productName: isManufacturing ? '신성장기반자금' : '혁신창업사업화자금',
        reason: `NICE ${score}점 - 중진공 기준(830점) 충족. ${isManufacturing ? '제조업 시설·운전자금 최대 60~70억원' : '사업화 자금 최대 60억원'} 지원 가능`,
        url: 'https://www.kosmes.or.kr',
      },
      {
        institution: '신용보증기금',
        productName: hasPatent ? '지식재산(IP)보증' : (hasVentureCert || hasInnobiz ? '창업기업보증' : '일반신용보증'),
        reason: `NICE ${score}점 - 신보 기준(800점) 충족. ${hasPatent ? 'IP보증으로 특허 활용 보증료 우대' : hasVentureCert ? '벤처인증 우대 보증' : '일반 신용보증 최대 30억원'}`,
        url: 'https://www.kodit.co.kr',
      },
      {
        institution: '기술보증기금',
        productName: hasVentureCert || hasInnobiz ? '벤처·이노비즈 보증' : (isIT ? '일반기술보증' : '창업기업 기술보증'),
        reason: `NICE ${score}점 - 기보 기준(700점) 충족. ${hasVentureCert || hasInnobiz ? '벤처·이노비즈 우대 보증료 0.3~1.0%' : '기술평가 기반 보증 최대 30억원'}`,
        url: 'https://www.kibo.or.kr',
      },
    ];
    return {
      products,
      summary: `NICE ${score}점 - 최우량 신용 구간. 중진공·신보·기보 모두 신청 가능. 중진공 직접대출 → 기보/신보 보증 → 은행권 순서로 단계적 조달 권고.`,
    };
  }

  // 800~829점: 우량 - 신보·기보·소진공 가능, 중진공 미달
  if (score >= 800) {
    const products: { institution: string; productName: string; reason: string; url: string }[] = [
      {
        institution: '신용보증기금',
        productName: hasPatent ? '지식재산(IP)보증' : '일반신용보증',
        reason: `NICE ${score}점 - 신보 기준(800점) 충족. ${hasPatent ? 'IP보증 보증료 우대 (0.2~0.5%p 감면)' : '일반 신용보증 최대 30억원'}. 중진공(830점 미달)은 신용 개선 후 재도전.`,
        url: 'https://www.kodit.co.kr',
      },
      {
        institution: '기술보증기금',
        productName: hasVentureCert || hasInnobiz ? '벤처·이노비즈 보증' : '일반기술보증',
        reason: `NICE ${score}점 - 기보 기준(700점) 충족. ${hasVentureCert || hasInnobiz ? '인증 보유로 우대 보증료 적용' : '기술평가 통해 보증 한도 산정'}`,
        url: 'https://www.kibo.or.kr',
      },
      {
        institution: '소진공',
        productName: '일반경영안정자금',
        reason: `NICE ${score}점 - 소진공 기준(700점) 충족. 소상공인 대상 운전자금 최대 7천만원. 중진공 신청 전 브릿지 자금으로 활용 가능.`,
        url: 'https://www.semas.or.kr',
      },
    ];
    return {
      products,
      summary: `NICE ${score}점 - 우량 신용 구간. 신보·기보·소진공 신청 가능. 중진공은 830점 미달로 신용 개선(약 30점) 후 재신청 권고. 기보/신보 보증 → 은행권 대출 순서로 진행.`,
    };
  }

  // 700~799점: 양호 - 기보·소진공 가능, 신보·중진공 미달
  if (score >= 700) {
    const products: { institution: string; productName: string; reason: string; url: string }[] = [
      {
        institution: '기술보증기금',
        productName: hasPatent ? '일반기술보증' : (hasVentureCert || hasInnobiz ? '벤처·이노비즈 보증' : '창업기업 기술보증'),
        reason: `NICE ${score}점 - 기보 기준(700점) 충족. ${hasPatent ? '특허 보유로 기술평가 가점 기대' : hasVentureCert ? '벤처인증 우대 보증' : '기술력 중심 평가로 담보 부족 보완 가능'}. 신보(800점 미달)·중진공(830점 미달)은 신용 개선 후 재도전.`,
        url: 'https://www.kibo.or.kr',
      },
      {
        institution: '소진공',
        productName: '일반경영안정자금',
        reason: `NICE ${score}점 - 소진공 기준(700점) 충족. 소상공인 운전자금 최대 7천만원. 기보 보증과 병행 활용 가능.`,
        url: 'https://www.semas.or.kr',
      },
      {
        institution: '신용보증재단',
        productName: '일반보증 (소상공인 신용보증)',
        reason: `지역 신용보증재단은 신용점수 요건이 유연. 최대 2억원 보증. 기보·소진공과 중복 활용 가능.`,
        url: 'https://www.sinbo.or.kr',
      },
    ];
    return {
      products,
      summary: `NICE ${score}점 - 양호 신용 구간. 기보·소진공·신용보증재단 신청 가능. 신보는 800점, 중진공은 830점 이상 필요하므로 신용 개선 계획 수립 권고. 기보 기술보증 → 소진공 운전자금 순서로 진행.`,
    };
  }

  // 550~699점: 신용취약 - 소진공 신용취약자금 전용
  if (score >= 550) {
    return {
      products: [
        {
          institution: '소진공',
          productName: '신용취약소상공인자금',
          reason: `NICE ${score}점 - 신용취약 구간(550~839점). 소상공인 지식배움터 신용관리 교육 이수 후 신청 가능. 최대 3천만원. 기보(700점 미달)·신보(800점 미달)·중진공(830점 미달) 모두 현재 미달.`,
          url: 'https://www.semas.or.kr',
        },
        {
          institution: '신용보증재단',
          productName: '일반보증 (소상공인 신용보증)',
          reason: `지역 신용보증재단은 신용점수 요건이 상대적으로 유연. 소상공인 최대 2억원 보증. 신용 개선과 병행 활용 권고.`,
          url: 'https://www.sinbo.or.kr',
        },
      ],
      summary: `NICE ${score}점 - 신용취약 구간. 소진공 신용취약소상공인자금(교육 이수 필수)과 신용보증재단 보증 활용 가능. 신용 개선 목표: 700점(기보), 800점(신보), 830점(중진공). 신용관리 전문 상담 병행 권고.`,
    };
  }

  // 549점 이하: 정책자금 신청 어려움
  return {
    products: [],
    summary: `NICE ${score}점 - 신용 위험 구간. 현재 대부분의 정책자금 신청이 어렵습니다. 신용회복위원회 채무조정, 개인회생 등을 통한 신용 회복이 선행되어야 합니다. 목표: 550점 이상(소진공 신용취약자금) → 700점(기보) 단계적 회복.`,
  };
}

function getTypeLabel(type: string) {
  if (type === "diagnosis") return "경영진단보고서";
  if (type === "funding_match") return "AI 정책자금매칭 리포트";
  return "AI 사업계획서";
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  const num = parseInt(clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getTypeColor(type: string): [number, number, number] {
  if (type === "diagnosis") return [26, 60, 110];
  if (type === "funding_match") return [217, 119, 6];
  return [22, 163, 74];
}

function findKoreanFont(): string | null {
  // TTF 폰트 우선 (브라우저 PDF 뷰어 호환성 최고)
  const nanumTtf = path.join(__dirname, "fonts", "NanumGothic-Regular.ttf");
  const candidates = [
    nanumTtf,
    path.join(__dirname, "fonts", "NotoSansCJK-Regular.otf"),
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansKR-Regular.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.otf",
    "/usr/share/fonts/truetype/unfonts-core/UnDotum.ttf",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttf",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function findFontViaFcList(): Promise<string | null> {
  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    const { stdout } = await execFileAsync("fc-list", [":lang=ko", "--format=%{file}\n"]);
    const fonts = stdout.split("\n").filter((f) => f.trim() && (f.endsWith(".ttf") || f.endsWith(".otf")));
    if (fonts.length > 0) return fonts[0].trim();
  } catch {}
  return null;
}

/** 마크다운 콘텐츠를 구조화된 블록으로 파싱 */
interface ContentBlock {
  type: "heading" | "paragraph" | "bullet" | "ordered" | "blockquote" | "table" | "hr";
  text?: string;
  items?: string[];
  rows?: string[][];
  headers?: string[];
}

function parseMarkdownContent(content: string): ContentBlock[] {
  if (!content) return [];

  let md = content.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/^[•·]\s*/gm, "- ");
  
  // 한 줄로 연결된 파이프 표를 여러 줄로 분리
  // 패턴: | 셀 | 셀 || 셀 | 셀 | 형태 (|| 가 행 구분자)
  md = md.replace(/^(\|[^\n]+)\|\|([^\n]+\|)/gm, (match, before, after) => {
    return before + '|\n|' + after;
  });
  // 여러 번 적용 (여러 개의 || 구분자 처리)
  for (let rep = 0; rep < 10; rep++) {
    const prev = md;
    md = md.replace(/^(\|[^\n]+)\|\|([^\n]+\|)/gm, (match, before, after) => {
      return before + '|\n|' + after;
    });
    if (md === prev) break;
  }
  
  // 표 헤더 다음에 구분선이 없으면 자동 추가
  md = md.replace(/(\|[^\n]+\|\n)(?!\s*\|[-:| ]+\|)/g, (match, headerRow) => {
    const cols = (headerRow.match(/\|/g) || []).length - 1;
    if (cols <= 0) return match;
    const separator = '|' + Array(cols).fill('---').join('|') + '|\n';
    return headerRow + separator;
  });

  const lines = md.split("\n");
  const blocks: ContentBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (line.trim() === "") { i++; continue; }

    if (line.match(/^###\s+(.+)/)) {
      blocks.push({ type: "heading", text: line.replace(/^###\s+/, "").trim() });
      i++; continue;
    }

    if (line.match(/^[-*_]{3,}\s*$/)) {
      blocks.push({ type: "hr" });
      i++; continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimEnd().startsWith(">")) {
        quoteLines.push(lines[i].trimEnd().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && lines[i + 1]?.includes("---")) {
      const headers = line.split("|").map((c) => c.trim()).filter(Boolean);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i]?.includes("|")) {
        const cells = lines[i].split("|").map((c) => c.trim()).filter(Boolean);
        // '---'만으로 이루어진 행(구분선) 완전 제거
        const isSeparatorRow = cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c));
        if (!isSeparatorRow && cells.length > 0) rows.push(cells);
        i++;
      }
      // 헤더도 '---'만인 경우 제거
      const filteredHeaders = headers.filter(h => !/^:?-+:?$/.test(h));
      blocks.push({ type: "table", headers: filteredHeaders, rows });
      continue;
    }

    if (line.match(/^[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i]?.trimEnd().match(/^[-*]\s+/)) {
        items.push(lines[i].trimEnd().replace(/^[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "bullet", items });
      continue;
    }

    if (line.match(/^\d+[.)]\s+/)) {
      const items: string[] = [];
      while (i < lines.length) {
        const curLine = lines[i]?.trimEnd() || "";
        if (curLine.match(/^\d+[.)]\s+/)) {
          // 주항목
          items.push(curLine.replace(/^\d+[.)]\s+/, "").trim());
          i++;
        } else if (curLine.match(/^\s+\S/) && items.length > 0) {
          // 들여쓰기 있는 연속 행 (이전 항목에 이어짐)
          items[items.length - 1] += " " + curLine.trim();
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: "ordered", items });
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i]?.trim() !== "" &&
      !lines[i]?.match(/^###\s+/) &&
      !lines[i]?.match(/^[-*_]{3,}\s*$/) &&
      !lines[i]?.startsWith(">") &&
      !lines[i]?.match(/^[-*]\s+/) &&
      !lines[i]?.match(/^\d+[.)]\s+/) &&
      !(lines[i]?.includes("|") && lines[i + 1]?.includes("---"))
    ) {
      paraLines.push(lines[i].trimEnd());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  return blocks;
}

function stripBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, "$1");
}

/** 차트 수치를 한국어 단위로 포맷 (만원 단위 입력 가정) */
function formatChartValue(value: number): string {
  if (value === 0) return "0";
  const absVal = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  // 억 단위 (10000만원 = 1억)
  const eok = Math.floor(absVal / 10000);
  const remainder = absVal % 10000;
  const cheonMan = Math.floor(remainder / 1000);
  if (eok > 0 && remainder === 0) return `${sign}${eok}억`;
  if (eok > 0 && cheonMan > 0) return `${sign}${eok}억${cheonMan}천`;
  if (eok > 0) return `${sign}${eok}억`;
  if (cheonMan > 0) return `${sign}${cheonMan}천만`;
  return `${sign}${absVal}만`;
}

pdfRouter.post("/api/pdf/report", async (req, res) => {
  const report = req.body as ReportPdfRequest;

  if (!report || !report.title || !report.sections) {
    res.status(400).json({ error: "Invalid report data" });
    return;
  }

  try {
    let fontPath = findKoreanFont();
    if (!fontPath) {
      fontPath = await findFontViaFcList();
    }

    const typeLabel = getTypeLabel(report.type);
    const [r, g, b] = getTypeColor(report.type);
    const accentHex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    const dateStr = new Date(report.createdAt).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
      info: {
        Title: report.title,
        Author: "BizConsult AI",
        Subject: typeLabel,
      },
    });

    const fontName = "Korean";
    let useKoreanFont = false;
    if (fontPath) {
      try {
        doc.registerFont(fontName, fontPath);
        // 등록 성공 확인: 실제 폰트 설정 시도
        doc.font(fontName);
        useKoreanFont = true;
      } catch (fontErr) {
        console.warn('[PDF] 한국어 폰트 등록 실패:', fontPath, fontErr);
        useKoreanFont = false;
      }
    }
    const setFont = (size: number, _bold = false) => {
      if (useKoreanFont) {
        doc.font(fontName).fontSize(size);
      } else {
        doc.font(_bold ? "Helvetica-Bold" : "Helvetica").fontSize(size);
      }
    };

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const contentW = pageW - 120;
    const leftMargin = 60;

    const ensureSpace = (needed: number) => {
      if (doc.y > doc.page.height - needed) {
        doc.addPage();
      }
    };

    // ══════════════════════════════════════════════════════════
    // ── 표지 페이지 (Cover Page) ─────────────────────────────
    // ══════════════════════════════════════════════════════════

    // 왼쪽 컬러 사이드바 (전체 높이)
    const sidebarW = 28;
    doc.rect(0, 0, sidebarW, pageH).fill([r, g, b]);

    // 오른쪽 상단 작은 컬러 블록 (장식)
    doc.rect(pageW - 60, 0, 60, 80).fill([r, g, b]);
    doc.save();
    doc.opacity(0.5);
    doc.rect(pageW - 100, 0, 40, 50).fill([r, g, b]);
    doc.restore();

    const coverContentX = sidebarW + 40;
    const coverContentW = pageW - sidebarW - 80;

    // ── 상단: 보고서 타입 뱃지 + 구분선 + 큰 제목 ──
    setFont(11, true);
    doc.fillColor([r, g, b]).text(typeLabel, coverContentX, 55, {
      width: coverContentW,
      align: "left",
    });
    doc.moveTo(coverContentX, 75).lineTo(coverContentX + coverContentW * 0.6, 75)
      .strokeColor([r, g, b]).lineWidth(2).stroke();

    setFont(38, true);
    doc.fillColor("#111111").text(typeLabel, coverContentX, 90, {
      width: coverContentW,
      align: "left",
      lineGap: 8,
    });

    // ── 하단 영역: 업체명 + 정보박스 + 차트 (하단 배치, 가운데는 공백) ──
    // 차트 높이 계산: 정보박스(약 90px) + 차트(약 100px) + 업체명(약 40px) + 여백
    const cs = report.companySummary;
    const chartAreaH = 90;
    const infoBoxH = cs ? 3 * 18 + 28 : 0;
    const companyNameH = 40;
    const totalBottomH = companyNameH + (cs ? infoBoxH + 12 : 0) + (cs ? chartAreaH + 18 : 0);
    const bottomStartY = pageH - 80 - 20 - totalBottomH; // 80은 footer 높이

    // 업체명 - 하단에 크게 표시
    setFont(26, true);
    doc.fillColor("#1e3a5f").text(report.companyName, coverContentX, bottomStartY, {
      width: coverContentW,
      align: "left",
    });
    doc.moveDown(0.3);

    // 업체 기본 정보 박스
    if (cs) {
      const infoBoxY = doc.y + 16;
      // 각 항목을 개별 행으로 배치하여 글자 겹침 방지
      const col1X = coverContentX + 16;
      const col2X = coverContentX + coverContentW / 2 + 8;
      const labelW = 60;
      const valueW = coverContentW / 2 - labelW - 24;
      const lineH = 18;
      const rowCount = 3; // 사업자번호/업종, 대표자명/사업장주소, 매출
      const infoBoxH = rowCount * lineH + 28;

      // 박스 배경
      doc.rect(coverContentX, infoBoxY, coverContentW, infoBoxH).fill("#f8fafc");
      doc.rect(coverContentX, infoBoxY, 4, infoBoxH).fill([r, g, b]);

      // 행1: 사업자번호 | 업종
      const row1Y = infoBoxY + 12;
      setFont(8, true);
      doc.fillColor([r, g, b]).text("사업자번호", col1X, row1Y, { width: labelW });
      setFont(8);
      doc.fillColor("#374151").text(cs.businessNumber || "-", col1X + labelW + 4, row1Y, { width: valueW });
      setFont(8, true);
      doc.fillColor([r, g, b]).text("업종", col2X, row1Y, { width: labelW });
      setFont(8);
      doc.fillColor("#374151").text(cs.industry || "-", col2X + labelW + 4, row1Y, { width: valueW });

      // 행2: 대표자명 | 사업장주소
      const row2Y = row1Y + lineH;
      setFont(8, true);
      doc.fillColor([r, g, b]).text("대표자명", col1X, row2Y, { width: labelW });
      setFont(8);
      doc.fillColor("#374151").text(cs.representativeName || "-", col1X + labelW + 4, row2Y, { width: valueW });
      setFont(8, true);
      doc.fillColor([r, g, b]).text("사업장주소", col2X, row2Y, { width: labelW });
      setFont(8);
      doc.fillColor("#374151").text(cs.businessAddress || "-", col2X + labelW + 4, row2Y, { width: valueW });

      // 행3: 전년도 매출 | 금년 예상 매출
      const row3Y = row2Y + lineH;
      if (cs.previousYearSales || cs.estimatedCurrentYearSales) {
        setFont(8, true);
        doc.fillColor([r, g, b]).text("전년도매출", col1X, row3Y, { width: labelW });
        setFont(8);
        doc.fillColor("#374151").text(cs.previousYearSales || "-", col1X + labelW + 4, row3Y, { width: valueW });
        if (cs.estimatedCurrentYearSales) {
          setFont(8, true);
          doc.fillColor([r, g, b]).text("금년예상매출", col2X, row3Y, { width: labelW });
          setFont(8);
          doc.fillColor("#374151").text(cs.estimatedCurrentYearSales, col2X + labelW + 4, row3Y, { width: valueW });
        }
      }

      doc.y = infoBoxY + infoBoxH + 12;
    }

    // 차트 영역 (간단한 막대 그래프 장식)
    if (cs && (cs.previousYearSales || cs.estimatedCurrentYearSales)) {
      const chartAreaY = doc.y + 8;
      const chartAreaH = 90;
      const chartAreaW = coverContentW;

      doc.rect(coverContentX, chartAreaY, chartAreaW, chartAreaH).fill("#f1f5f9");

      const barColors: [number, number, number][] = [
        [r, g, b],
        [Math.min(r + 40, 255), Math.min(g + 40, 255), Math.min(b + 40, 255)],
        [Math.min(r + 70, 255), Math.min(g + 70, 255), Math.min(b + 70, 255)],
      ];
      const barLabels = ["전전년도", "전년도", "금년 예상"];
      const barCount = 3;
      const barW = 30;
      const barGap = (chartAreaW - barCount * barW) / (barCount + 1);
      const maxBarH = chartAreaH - 30;
      const barHeights = [0.55, 0.75, 0.9];

      barLabels.forEach((label, i) => {
        const bx = coverContentX + barGap + i * (barW + barGap);
        const bh = maxBarH * barHeights[i];
        const by = chartAreaY + chartAreaH - 20 - bh;
        doc.rect(bx, by, barW, bh).fill(barColors[i]);
        setFont(7);
        doc.fillColor("#6b7280").text(label, bx - 5, chartAreaY + chartAreaH - 16, { width: barW + 10, align: "center" });
      });

      doc.y = chartAreaY + chartAreaH + 10;
    }

    // ── 하단: 작성일 | 담당자 | 소속 (가운데 정렬) ──
    const footerY = pageH - 80;
    const consultantName = report.consultantName || "AI 컨설턴트";
    const consultantCompany = report.consultantCompany || "BizConsult AI";

    doc.moveTo(coverContentX, footerY).lineTo(coverContentX + coverContentW, footerY)
      .strokeColor("#e5e7eb").lineWidth(0.5).stroke();

    setFont(9);
    doc.fillColor("#6b7280").text(
      `작성일: ${dateStr}`,
      coverContentX, footerY + 12,
      { width: coverContentW / 3, align: "center" }
    );
    doc.fillColor("#6b7280").text(
      `담당자: ${consultantName}`,
      coverContentX + coverContentW / 3, footerY + 12,
      { width: coverContentW / 3, align: "center" }
    );
    doc.fillColor("#6b7280").text(
      `소속: ${consultantCompany}`,
      coverContentX + (coverContentW / 3) * 2, footerY + 12,
      { width: coverContentW / 3, align: "center" }
    );

    // ══════════════════════════════════════════════════════════
    // ── 기업현황표 (새 페이지) ───────────────────────────────
    // ══════════════════════════════════════════════════════════
    if (report.companySummary) {
      doc.addPage();
      const cs2 = report.companySummary;
      const isFunding = report.type === "funding_match";

      const rows: [string, string][] = [
        ["기업명", cs2.name || "-"],
        ["사업자등록번호", cs2.businessNumber || "-"],
        ["법인등록번호", cs2.corporateNumber || "-"],
        ["사업장주소", cs2.businessAddress || "-"],
        ["업종", cs2.industry || "-"],
        ["대표자명", cs2.representativeName || "-"],
        ["수출여부", cs2.hasExportSales || "-"],
        ["특허 및 인증", cs2.patentAndCerts || "-"],
      ];

      // 매출 데이터: salesData가 있으면 최신순으로 표시 (금년예상-현재-25년-24년)
      // salesData가 없으면 기존 방식으로 표시
      if (cs2.salesData && cs2.salesData.length > 0) {
        cs2.salesData.forEach(entry => {
          rows.push([`매출 (${entry.label})`, entry.value]);
        });
      } else {
        // 기존 방식 (하위 호환)
        if (cs2.estimatedCurrentYearSales) {
          rows.push(["금년 예상 매출", cs2.estimatedCurrentYearSales]);
        }
        rows.push(["전년도 매출합계", cs2.previousYearSales || "-"]);
      }

      if (isFunding) {
        if (cs2.totalDebt) rows.push(["부채", cs2.totalDebt]);
        if (cs2.requiredFunding) rows.push(["필요자금", cs2.requiredFunding]);
      }

      // 미입력 항목 필터링
      const filteredRows = rows.filter(([, val]) => val && val !== "-" && val !== "미입력");

      if (filteredRows.length > 0) {
        // 섹션 제목
        setFont(14, true);
        doc.fillColor("#111111").text("기업현황", leftMargin, doc.y, { width: contentW });
        doc.moveDown(0.5);

        const tableStartY = doc.y;
        const labelW = 130;
        const valueW = contentW - labelW;
        const rowH = 28;

        // 테이블 헤더
        doc.rect(leftMargin, tableStartY, contentW, rowH).fill([r, g, b]);
        setFont(10, true);
        doc.fillColor("#ffffff").text("항목", leftMargin + 12, tableStartY + 8, { width: labelW - 20 });
        doc.fillColor("#ffffff").text("내용", leftMargin + labelW + 8, tableStartY + 8, { width: valueW - 20 });
        doc.y = tableStartY + rowH;

        filteredRows.forEach(([label, value], ri) => {
          const rowY = doc.y;

          // zebra striping
          if (ri % 2 === 0) {
            doc.save();
            doc.rect(leftMargin, rowY, contentW, rowH).fill("#f8f9fa");
            doc.restore();
          }

          // label
          setFont(10, true);
          doc.fillColor("#1f2937").text(label, leftMargin + 12, rowY + 8, { width: labelW - 20 });

          // value
          setFont(10);
          doc.fillColor("#111827").text(value, leftMargin + labelW + 8, rowY + 8, { width: valueW - 16 });

          // 행 구분선
          doc.moveTo(leftMargin, rowY + rowH).lineTo(leftMargin + contentW, rowY + rowH)
            .strokeColor("#e5e7eb").lineWidth(0.5).stroke();
          doc.y = rowY + rowH;
        });

        // 테이블 외곽선
        doc.rect(leftMargin, tableStartY, contentW, doc.y - tableStartY)
          .strokeColor("#d1d5db").lineWidth(0.5).stroke();

        doc.y += 20;
      }
    }

    // ── Matching Summary (funding_match only) ─────────────────
    if (report.type === "funding_match" && report.matchingSummary) {
      // 순위별 1줄 표시를 위해 동적 높이 계산
      const rankRowH = 26;
      const rankTitleH = 36;
      const rankFooterH = 28;
      const rankBoxH = rankTitleH + 4 * rankRowH + rankFooterH;
      ensureSpace(rankBoxH + 20);
      const ms = report.matchingSummary;
      const boxY = doc.y;
      doc.rect(leftMargin, boxY, contentW, rankBoxH).fillAndStroke("#FFFBEB", "#FDE68A");

      setFont(11, true);
      doc.fillColor("#92400E").text("AI 정책자금 매칭 결과 요약", leftMargin + 15, boxY + 12);

      // 순위별 1줄씩 표시
      const rankItems = [
        { rank: "1순위", value: ms.rank1 },
        { rank: "2순위", value: ms.rank2 },
        { rank: "3순위", value: ms.rank3 },
        { rank: "4순위", value: ms.rank4 },
      ];
      rankItems.forEach((item, i) => {
        const y = boxY + rankTitleH + i * rankRowH;

        doc.rect(leftMargin + 15, y + 4, 34, 16).fill([r, g, b]);
        setFont(7, true);
        doc.fillColor("#ffffff").text(item.rank, leftMargin + 17, y + 8, { width: 30, align: "center" });

        setFont(9);
        // 순위 텍스트에서 괄호 내용 제거 (예상한도: ... 부분의 괄호 제거)
        const cleanValue = item.value.replace(/\s*\([^)]*\)/g, "").trim();
        doc.fillColor("#78350F").text(cleanValue, leftMargin + 55, y + 7, { width: contentW - 70 });
      });

      // 예상한도 표시 (괄호 내용 제거 + 단독 닫는 괄호 제거)
      const cleanLimit = ms.estimatedLimit
        .replace(/\s*\([^)]*\)/g, "")  // (내용) 형태 제거
        .replace(/\s*\)/g, "")          // 단독 닫는 괄호 제거
        .replace(/\s*\(/g, "")          // 단독 여는 괄호 제거
        .trim();
      // 예상한도 표시 - continued 대신 명시적 x 좌표 사용
      setFont(9, true);
      doc.fillColor("#92400E").text("예상한도: ", leftMargin + 15, boxY + rankBoxH - 22, { width: 60, lineBreak: false });
      setFont(9);
      doc.fillColor("#78350F").text(cleanLimit, leftMargin + 75, boxY + rankBoxH - 22, { width: contentW - 90 });

      doc.y = boxY + rankBoxH + 16;
    }

    // ══════════════════════════════════════════════════════════
    // ── Sections (카테고리별 새 페이지) ──────────────────────
    // ══════════════════════════════════════════════════════════

    // 정책자금 리포트: 섹션 내용 높이를 추정하여 동적으로 페이지 그룹핑
    const isFundingMatchReport = report.type === "funding_match";

    // 섹션 내용 높이 추정 함수 (대략적인 높이 계산)
    const estimateSectionHeight = (section: ReportSection): number => {
      let h = 60; // 섹션 제목 + 구분선
      const blocks = parseMarkdownContent(section.content);
      blocks.forEach(block => {
        switch (block.type) {
          case "heading": h += 36; break;
          case "paragraph": {
            const lines = Math.ceil((block.text || "").length / 60);
            h += lines * 16 + 10;
            break;
          }
          case "bullet": h += (block.items?.length || 0) * 18 + 8; break;
          case "ordered": h += (block.items?.length || 0) * 18 + 8; break;
          case "blockquote": {
            const lines = Math.ceil((block.text || "").length / 55);
            h += lines * 16 + 24;
            break;
          }
          case "table": {
            h += 24 + (block.rows?.length || 0) * 22 + 10;
            break;
          }
          case "hr": h += 12; break;
        }
      });
      // 차트가 있으면 추가 높이
      if (section.chartData?.values?.length) h += 160;
      // 로드맵이 있으면 추가 높이 (행 수 × 셀 높이)
      if (section.roadmapData?.rows?.length) {
        const rowCount = section.roadmapData.rows.length;
        const colCount = section.roadmapData.columns?.length || 3;
        const maxItemsPerCell = Math.max(...section.roadmapData.rows.flatMap(r => r.cells.map(c => c.items.length)), 2);
        const cellH = 28 + maxItemsPerCell * 14;
        h += 40 + rowCount * (cellH + 8) + (colCount > 0 ? 0 : 0); // 헤더 + 행들
      }
      return h;
    };

    // 동적 페이지 그룹핑: 한 페이지 가용 높이(약 650px) 기준으로 섹션 묶기
    const buildFundingPageGroups = (): number[][] => {
      const groups: number[][] = [];
      const pageAvailH = 650; // A4 가용 높이 (여백 제외)
      let i = 0;
      while (i < report.sections.length) {
        const h1 = estimateSectionHeight(report.sections[i]);
        if (h1 >= pageAvailH) {
          // 단독 섹션 (내용이 많아서 혼자 한 페이지)
          groups.push([i]);
          i++;
        } else if (i + 1 < report.sections.length) {
          const h2 = estimateSectionHeight(report.sections[i + 1]);
          if (h1 + h2 + 40 <= pageAvailH) {
            // 두 섹션 합쳐도 한 페이지에 들어감
            groups.push([i, i + 1]);
            i += 2;
          } else {
            // 두 번째 섹션이 너무 커서 단독 페이지
            groups.push([i]);
            i++;
          }
        } else {
          groups.push([i]);
          i++;
        }
      }
      return groups;
    };

    const fundingPageGroups: number[][] = isFundingMatchReport
      ? buildFundingPageGroups()
      : [];

    // 소제목 박스 카운터 (섹션 전체에서 순환)
    let headingBoxCounter = 0;

    // 섹션을 렌더링하는 내부 함수 (페이지 추가 없이 현재 위치에서 렌더링)
    const renderSectionContent = (section: ReportSection, idx: number, isSecondOnPage: boolean = false) => {
      const sectionY = doc.y;

      // 두 번째 섹션일 경우 구분선 추가
      if (isSecondOnPage) {
        doc.moveDown(0.5);
        doc.moveTo(leftMargin, doc.y).lineTo(pageW - leftMargin, doc.y)
          .strokeColor([r, g, b]).opacity(0.2).stroke();
        doc.opacity(1);
        doc.moveDown(0.5);
      }

      const actualSectionY = doc.y;

      // Section number badge
      doc.roundedRect(leftMargin, actualSectionY, 26, 26, 4).fill([r, g, b]);
      setFont(11, true);
      doc.fillColor("#ffffff").text(`${idx + 1}`, leftMargin, actualSectionY + 6, { width: 26, align: "center" });

      // Section title
      setFont(13, true);
      doc.fillColor("#111111").text(section.title, leftMargin + 36, actualSectionY + 5, {
        width: contentW - 36,
      });

      // Divider under title
      const dividerY = Math.max(doc.y + 4, actualSectionY + 32);
      doc.moveTo(leftMargin, dividerY).lineTo(pageW - leftMargin, dividerY)
        .strokeColor([r, g, b]).opacity(0.3).stroke();

      doc.opacity(1);
      doc.y = dividerY + 10;

      // Parse and render markdown content blocks
      const blocks = parseMarkdownContent(section.content);
      const textLeft = leftMargin + 16;
      const textWidth = contentW - 16;

      // ── PEST/SWOT 2x2 박스 렌더링 ──────────────────────────────
      const isPestSection = section.title.includes('PEST') || section.title.includes('pest');
      const isSwotSection = section.title.includes('SWOT') || section.title.includes('swot') || section.title.includes('강점') || section.title.includes('약점');
      
      if (isPestSection || isSwotSection) {
        // 2x2 박스 레이아웃
        const boxGap = 8;
        const boxW = (textWidth - boxGap) / 2;
        const boxMinH = 120;
        
        // PEST 또는 SWOT 항목 정의
        const quadrants = isPestSection ? [
          { label: 'P — 정치적 (Political)', color: [59, 130, 246] as [number,number,number], lightBg: '#EFF6FF', keywords: ['정치', 'Political', '규제', '정부', '정책', '법', '제도'] },
          { label: 'E — 경제적 (Economic)', color: [16, 185, 129] as [number,number,number], lightBg: '#ECFDF5', keywords: ['경제', 'Economic', '시장', '성장', '물가', '환율', '수요'] },
          { label: 'S — 사회적 (Social)', color: [245, 158, 11] as [number,number,number], lightBg: '#FFFBEB', keywords: ['사회', 'Social', '문화', '인구', '소비', '트렌드', '인식'] },
          { label: 'T — 기술적 (Technological)', color: [139, 92, 246] as [number,number,number], lightBg: '#F5F3FF', keywords: ['기술', 'Technological', '혁신', '디지털', 'AI', '자동화', 'IT'] },
        ] : [
          { label: 'S — 강점 (Strengths)', color: [16, 185, 129] as [number,number,number], lightBg: '#ECFDF5', keywords: ['강점', 'Strength', '장점', '우수', '핵심역량', '경쟁력'] },
          { label: 'W — 약점 (Weaknesses)', color: [239, 68, 68] as [number,number,number], lightBg: '#FEF2F2', keywords: ['약점', 'Weakness', '한계', '부족', '문제점', '미흡'] },
          { label: 'O — 기회 (Opportunities)', color: [59, 130, 246] as [number,number,number], lightBg: '#EFF6FF', keywords: ['기회', 'Opportunit', '시장기회', '성장', '확대', '신규'] },
          { label: 'T — 위협 (Threats)', color: [245, 158, 11] as [number,number,number], lightBg: '#FFFBEB', keywords: ['위협', 'Threat', '리스크', '경쟁', '규제', '위험'] },
        ];
        
        // content에서 각 사분면 내용 파싱 (AI 자동 분류 강화)
        const contentLines = section.content.split('\n');
        const quadrantContents: string[][] = [[], [], [], []];
        let currentQuadrant = -1;
        
        // 전략 섹션 감지 (SO·ST·WO·WT 전략 도출 등) - 사분면에 포함하지 않음
        let inStrategySection = false;
        
        // 1차: 헤딩 기반 분류
        contentLines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) return;
          
          // 마크다운 표 행 필터링: | 로 시작하거나 |---| 형태의 표 구분선은 건너뜀
          if (trimmed.startsWith('|') || /^\|[-:\s|]+\|$/.test(trimmed)) return;
          
          // 소제목(서브헤딩) 감지: ###, ##, **, 숫자. 형태 모두 처리
          const isHeading = trimmed.startsWith('###') || trimmed.startsWith('##') ||
            (trimmed.startsWith('**') && trimmed.endsWith('**')) ||
            /^\d+\.\s/.test(trimmed) ||
            /^[PEST|SWOT]\s*[—\-:]/i.test(trimmed);
          if (isHeading) {
            const headingText = trimmed
              .replace(/^#+\s*/, '')
              .replace(/\*\*/g, '')
              .replace(/^\d+\.\s*/, '');
            // 전략 섹션 감지 (SO·ST·WO·WT 전략 도출 등)
            if (/SO|ST|WO|WT|전략\s*도출|전략\s*매트릭스|종합\s*시사점|시사점/i.test(headingText)) {
              inStrategySection = true;
              currentQuadrant = -1;
              return;
            }
            inStrategySection = false;
            const matchedIdx = quadrants.findIndex(q => 
              q.keywords.some(k => headingText.toLowerCase().includes(k.toLowerCase()))
            );
            if (matchedIdx >= 0) {
              currentQuadrant = matchedIdx;
              return;
            }
          }
          // 전략 섹션이면 건너뜀
          if (inStrategySection) return;
          // 항목 내용 추가 (헤딩이 아닌 경우)
          if (currentQuadrant >= 0 && trimmed && !isHeading) {
            const cleanItem = trimmed.replace(/^[-*•]\s*/, '').trim();
            // 표 형태 항목 필터링 (| 포함, --- 만 있는 항목 등)
            if (cleanItem && !/^:?-+:?$/.test(cleanItem) && !cleanItem.includes('|')) {
              // 전략 키워드가 포함된 항목은 건너뜀 (SO전략, ST전략 등)
              if (!/^(SO|ST|WO|WT)\s*(전략|전략:|:)/i.test(cleanItem) &&
                  !cleanItem.startsWith('**SO') && !cleanItem.startsWith('**ST') &&
                  !cleanItem.startsWith('**WO') && !cleanItem.startsWith('**WT')) {
                quadrantContents[currentQuadrant].push(cleanItem);
              }
            }
          } else if (currentQuadrant < 0 && trimmed && !isHeading) {
            // 헤딩 없이 시작하는 항목: 키워드로 자동 분류 시도
            const cleanItem = trimmed.replace(/^[-*•]\s*/, '').trim();
            if (cleanItem && !/^:?-+:?$/.test(cleanItem) && !cleanItem.includes('|')) {
              const autoIdx = quadrants.findIndex(q =>
                q.keywords.some(k => cleanItem.toLowerCase().includes(k.toLowerCase()))
              );
              if (autoIdx >= 0) {
                quadrantContents[autoIdx].push(cleanItem);
              } else {
                // 분류 불가 항목은 첫 번째 사분면에 배치
                quadrantContents[0].push(cleanItem);
              }
            }
          }
        });
        
        // 2차: 모든 사분면이 비어있으면 내용 전체를 균등 분배
        const totalItems = quadrantContents.reduce((sum, arr) => sum + arr.length, 0);
        if (totalItems === 0) {
          const allItems = contentLines
            .map(l => l.trim().replace(/^[-*•#]\s*/, '').replace(/\*\*/g, '').trim())
            .filter(l => l && !/^:?-+:?$/.test(l) && !l.startsWith('|'));
          const perQ = Math.ceil(allItems.length / 4);
          allItems.forEach((item, idx) => {
            quadrantContents[Math.min(Math.floor(idx / perQ), 3)].push(item);
          });
        }
        
        // 2x2 박스 렌더링
        const positions = [
          { col: 0, row: 0 }, // 좌상
          { col: 1, row: 0 }, // 우상
          { col: 0, row: 1 }, // 좌하
          { col: 1, row: 1 }, // 우하
        ];
        
        // 각 행의 최대 높이 계산 (2개 박스씩)
        const rowHeights = [0, 1].map(rowIdx => {
          const rowQuadrants = [0, 1].map(colIdx => rowIdx * 2 + colIdx);
          return Math.max(
            ...rowQuadrants.map(qi => {
              const items = quadrantContents[qi];
              const itemsH = items.reduce((sum, item) => {
                return sum + doc.heightOfString(`• ${item}`, { width: boxW - 24, lineGap: 2 }) + 4;
              }, 0);
              return Math.max(boxMinH, 36 + itemsH + 12);
            })
          );
        });
        
        let gridStartY = doc.y;
        // 전체 그리드가 한 페이지에 들어가는지 확인
        const totalGridH = rowHeights[0] + boxGap + rowHeights[1];
        const pageBottom2 = doc.page.height - doc.page.margins.bottom;
        if (gridStartY + totalGridH > pageBottom2 - 20) {
          doc.addPage();
          gridStartY = doc.y;
        }
        
        quadrants.forEach((q, qi) => {
          const pos = positions[qi];
          const bx = textLeft + pos.col * (boxW + boxGap);
          const by = gridStartY + (pos.row === 0 ? 0 : rowHeights[0] + boxGap);
          const bh = rowHeights[pos.row];
          
          // 박스 배경
          doc.rect(bx, by, boxW, bh).fill(q.lightBg);
          // 상단 헤더 바
          doc.rect(bx, by, boxW, 30).fill(q.color);
          // 헤더 텍스트
          setFont(9, true);
          doc.fillColor('#ffffff').text(q.label, bx + 10, by + 9, { width: boxW - 20, lineBreak: false });
          
          // 내용 항목
          let itemY = by + 36;
          const items = quadrantContents[qi];
          if (items.length === 0) {
            setFont(8);
            doc.fillColor('#9ca3af').text('(내용 없음)', bx + 10, itemY, { width: boxW - 20 });
          } else {
            items.slice(0, 6).forEach(item => {
              setFont(8);
              const itemText = `• ${item}`;
              doc.fillColor('#1f2937').text(itemText, bx + 10, itemY, { width: boxW - 20, lineGap: 2 });
              itemY = doc.y + 2;
            });
          }
          
          // 박스 테두리
          doc.rect(bx, by, boxW, bh).stroke('#e5e7eb');
        });
        
        doc.y = gridStartY + totalGridH + 12;
        return; // PEST/SWOT 렌더링 완료, 일반 블록 렌더링 건너맴
      }
      // ────────────────────────────────────────────────────────────

      blocks.forEach((block) => {
        ensureSpace(40);

        switch (block.type) {
          case "heading": {
            const hY = doc.y;
            // 파스텔 박스 색상 순환 (소제목마다 다른 파스텔 배경)
            const pastelColors = [
              { bg: "#EFF6FF", border: "#BFDBFE", bar: [59, 130, 246] as [number,number,number] },   // 파스텔 블루
              { bg: "#F0FDF4", border: "#BBF7D0", bar: [34, 197, 94] as [number,number,number] },    // 파스텔 그린
              { bg: "#FFF7ED", border: "#FED7AA", bar: [249, 115, 22] as [number,number,number] },   // 파스텔 오렌지
              { bg: "#FDF4FF", border: "#E9D5FF", bar: [168, 85, 247] as [number,number,number] },   // 파스텔 퍼플
              { bg: "#FFFBEB", border: "#FDE68A", bar: [245, 158, 11] as [number,number,number] },   // 파스텔 앰버
              { bg: "#F0FDFA", border: "#99F6E4", bar: [20, 184, 166] as [number,number,number] },   // 파스텔 틸
            ];
            // headingCounter를 클로저로 추적 (section 렌더링 함수 외부에서 관리)
            const pastelIdx = (headingBoxCounter++) % pastelColors.length;
            const pastel = pastelColors[pastelIdx];
            setFont(11, true);
            const headingTextH = doc.heightOfString(stripBold(block.text || ""), { width: textWidth - 24 });
            const boxH = Math.max(headingTextH + 12, 28);
            // 파스텔 배경 박스
            doc.rect(textLeft, hY, textWidth, boxH).fillAndStroke(pastel.bg, pastel.border);
            // 왼쪽 강조 바
            doc.rect(textLeft, hY, 4, boxH).fill(pastel.bar);
            doc.fillColor("#111827").text(stripBold(block.text || ""), textLeft + 14, hY + 7, { width: textWidth - 24 });
            doc.y = hY + boxH + 6;
            break;
          }

          case "paragraph": {
            const paraText = block.text || "";
            
            // 연도별 인포그래픽 박스 감지: "2026년 (기반 구축):" 또는 "2026년:" 패턴
            const yearPattern = /^\*?\*?(20\d{2}년)\s*(?:\([^)]*\))?\*?\*?[:\s]/;
            const yearMatch = paraText.match(yearPattern);
            const isYearSection = section.title.includes('연도별') || section.title.includes('로드맵') || section.title.includes('실행 계획') || section.title.includes('매출') || section.title.includes('재무');
            if (isYearSection && yearMatch) {
              // 연도 추출
              const yearLabel = yearMatch[1];
              const yearNum = parseInt(yearLabel);
              // 연도별 색상 (2026: 파랑, 2027: 초록, 2028: 보라, 그 이후: 오렌지)
              const yearColors = [
                { bg: '#EFF6FF', border: '#3B82F6', bar: [59, 130, 246] as [number,number,number], text: '#1E40AF', icon: '\uD83C\uDF31' }, // 씨앗 🌱
                { bg: '#F0FDF4', border: '#10B981', bar: [16, 185, 129] as [number,number,number], text: '#065F46', icon: '\uD83C\uDF3F' }, // 성장 🌿
                { bg: '#FDF4FF', border: '#8B5CF6', bar: [139, 92, 246] as [number,number,number], text: '#5B21B6', icon: '\uD83C\uDF4E' }, // 열매 🍎
                { bg: '#FFFBEB', border: '#F59E0B', bar: [245, 158, 11] as [number,number,number], text: '#92400E', icon: '\uD83C\uDF1F' }, // 별 🌟
              ];
              const yearIdx = Math.max(0, Math.min(yearNum - 2026, 3));
              const yc = yearColors[yearIdx];
              // 연도 레이블 추출 (괄호 포함)
              const yearFullMatch = paraText.match(/^\*?\*?(20\d{2}년(?:\s*\([^)]*\))?)\*?\*?[:\s]/);
              const yearFullLabel = yearFullMatch ? yearFullMatch[1].replace(/\*\*/g, '').trim() : yearLabel;
              const yearContent = paraText.replace(/^\*?\*?20\d{2}년(?:\s*\([^)]*\))?\*?\*?[:\s]*/, '').trim();
              const yearIconLabel = `${yc.icon} ${yearFullLabel}`;
              
              ensureSpace(70);
              const yBoxStartY = doc.y;
              setFont(9);
              const yContentH = yearContent ? doc.heightOfString(yearContent, { width: textWidth - 30, lineGap: 3 }) : 0;
              const yBoxH = Math.max(yContentH + 38, 60);
              // 박스 배경
              doc.rect(textLeft, yBoxStartY, textWidth, yBoxH).fillAndStroke(yc.bg, yc.border);
              // 왼쪽 강조 바
              doc.rect(textLeft, yBoxStartY, 5, yBoxH).fill(yc.bar);
              // 연도 레이블 + 아이콘 (상단)
              setFont(10, true);
              doc.fillColor(yc.text).text(yearIconLabel, textLeft + 14, yBoxStartY + 8, { width: textWidth - 24, lineBreak: false });
              // 연도 내용
              if (yearContent) {
                setFont(9);
                doc.fillColor('#1a1a1a').text(yearContent, textLeft + 14, yBoxStartY + 26, { width: textWidth - 30, lineGap: 3 });
              }
              doc.y = yBoxStartY + yBoxH + 6;
              break;
            }
            
            // 로드맵 섹션에서 단계별 텍스트 (**N단계 ...**) 감지 → 박스 형태로 렌더링
            const isRoadmapLikeSec = section.title.includes('실행 계획') || section.title.includes('로드맵') || section.title.includes('단계별');
            const stageMatch = paraText.match(/^\*\*([1-9]단계[^*]*)\*\*:?\s*(.*)/);
            if (isRoadmapLikeSec && stageMatch) {
              // 단계 헤더 + 내용을 박스로 분리
              const stageLabel = stageMatch[1].trim();
              const stageContent = stageMatch[2].trim();
              // 단계 번호 추출 (1단계 → 0, 2단계 → 1, ...)
              const stageNum = parseInt(stageLabel.charAt(0), 10) - 1;
              const stageColors = [
                { bg: '#EFF6FF', border: '#3B82F6', bar: [59, 130, 246] as [number,number,number], text: '#1E40AF' },
                { bg: '#F0FDF4', border: '#10B981', bar: [16, 185, 129] as [number,number,number], text: '#065F46' },
                { bg: '#FDF4FF', border: '#8B5CF6', bar: [139, 92, 246] as [number,number,number], text: '#5B21B6' },
                { bg: '#FFFBEB', border: '#F59E0B', bar: [245, 158, 11] as [number,number,number], text: '#92400E' },
              ];
              const sc = stageColors[stageNum % stageColors.length];
              ensureSpace(60);
              const boxStartY = doc.y;
              // 내용 높이 계산
              setFont(9);
              const contentH = stageContent ? doc.heightOfString(stageContent, { width: textWidth - 24, lineGap: 3 }) : 0;
              const boxH = Math.max(contentH + 36, 52);
              // 박스 배경
              doc.rect(textLeft, boxStartY, textWidth, boxH).fillAndStroke(sc.bg, sc.border);
              // 왼쪽 강조 바
              doc.rect(textLeft, boxStartY, 5, boxH).fill(sc.bar);
              // 단계 레이블
              setFont(9, true);
              doc.fillColor(sc.text).text(stageLabel, textLeft + 14, boxStartY + 8, { width: textWidth - 24, lineBreak: false });
              // 단계 내용
              if (stageContent) {
                setFont(9);
                doc.fillColor('#1a1a1a').text(stageContent, textLeft + 14, boxStartY + 24, { width: textWidth - 24, lineGap: 3 });
              }
              doc.y = boxStartY + boxH + 6;
            } else {
              setFont(10);
              doc.fillColor("#1a1a1a").text(stripBold(paraText), textLeft, doc.y, {
                width: textWidth,
                lineGap: 4,
                paragraphGap: 3,
              });
              doc.moveDown(0.4);
            }
            break;
          }

          case "bullet": {
            (block.items || []).forEach((item) => {
              ensureSpace(20);
              doc.circle(textLeft + 4, doc.y + 5, 2.5).fill([r, g, b]);
              setFont(10);
              doc.fillColor("#1a1a1a").text(stripBold(item), textLeft + 14, doc.y, {
                width: textWidth - 14,
                lineGap: 3,
              });
              doc.moveDown(0.15);
            });
            doc.moveDown(0.3);
            break;
          }

          case "ordered": {
            const isRoadmapSection = section.title.includes("실행 로드맵") || section.title.includes("실행로드맵");
            if (isRoadmapSection) {
              const items = block.items || [];
              items.forEach((item, oi) => {
                ensureSpace(50);
                const tY = doc.y;
                const nodeX = textLeft + 12;
                const lineX = nodeX;
                const textX = textLeft + 30;
                const itemTextW = textWidth - 30;

                if (oi > 0) {
                  doc.moveTo(lineX, tY - 8).lineTo(lineX, tY + 4)
                    .strokeColor([r, g, b]).opacity(0.4).lineWidth(1.5).stroke();
                  doc.opacity(1);
                }

                doc.circle(nodeX, tY + 8, 7).fill([r, g, b]);
                setFont(7, true);
                doc.fillColor("#ffffff").text(`${oi + 1}`, nodeX - 4, tY + 4, { width: 8, align: "center" });

                setFont(10);
                doc.fillColor("#1a1a1a").text(stripBold(item), textX, tY, {
                  width: itemTextW,
                  lineGap: 3,
                });
                doc.moveDown(0.4);
              });
            } else {
              (block.items || []).forEach((item, oi) => {
                ensureSpace(20);
                const itemY = doc.y;
                setFont(10, true);
                doc.fillColor([r, g, b]).text(`${oi + 1}.`, textLeft, itemY, { width: 18, lineBreak: false });
                setFont(10);
                doc.fillColor("#1a1a1a").text(stripBold(item), textLeft + 20, itemY, {
                  width: textWidth - 20,
                  lineGap: 3,
                });
                doc.moveDown(0.15);
              });
            }
            doc.moveDown(0.3);
            break;
          }

          case "blockquote": {
            const qText = stripBold(block.text || "");
            setFont(10);
            const qHeight = doc.heightOfString(qText, { width: textWidth - 28 }) + 24;
            // 페이지 하단에 공간이 부족하면 새 페이지로 이동
            const pageBottom = doc.page.height - doc.page.margins.bottom;
            if (doc.y + qHeight > pageBottom - 10) {
              doc.addPage();
            }
            const qY = doc.y;
            doc.rect(textLeft, qY, textWidth, qHeight).fill("#f0f4ff");
            doc.rect(textLeft, qY, 4, qHeight).fill([r, g, b]);
            doc.fillColor("#1e293b").text(qText, textLeft + 14, qY + 12, {
              width: textWidth - 28,
              lineGap: 4,
            });
            doc.y = qY + qHeight + 8;
            break;
          }

          case "table": {
            let headers = block.headers || [];
            let rows = block.rows || [];

            // ── 정책자금 신청 로드맵 표: '예상한도' 열 제거 ──────────────────────────
            const isRoadmapTable = headers.some(h =>
              h.includes('신청시기') || h.includes('예상승인') || h.includes('신청 시기') || h.includes('예상 승인')
            );
            if (isRoadmapTable) {
              const limitColIdx = headers.findIndex(h =>
                h.includes('예상한도') || h.includes('한도') || h.includes('예상 한도')
              );
              if (limitColIdx >= 0) {
                headers = headers.filter((_, i) => i !== limitColIdx);
                rows = rows.map(r => r.filter((_, i) => i !== limitColIdx));
              }
            }
            // ────────────────────────────────────────────────────────────

            const colCount = headers.length || (rows[0]?.length || 2);

            const isDiagnosisTable = headers.length > 0 && headers[0].includes("진단영역");
            // 종합 평가 표 (평가항목/점수/등급/평가의견) 열 너비 동적 조정
            const isSummaryTable = headers.length > 0 && (
              headers.some(h => h.includes('평가항목') || h.includes('점수') || h.includes('등급') || h.includes('평가의견'))
            );
            // KPI 표 (지표/현재/목표) 열 너비 동적 조정
            const isKpiTable = headers.length > 0 && (
              headers.some(h => h.includes('KPI') || h.includes('지표') || h.includes('현재') || h.includes('목표'))
            );
            // 권고사항 이행 표 (기간/효과/목표) 열 너비 동적 조정
            const isEffectTable = headers.length > 0 && (
              headers.some(h => h.includes('기간') || h.includes('효과') || h.includes('정량적 목표'))
            );
            // 정책자금 1/2/3순위 표 (항목/내용 2열 표)
            const isFundingRankTable = headers.length === 2 && (
              headers[0].includes('항목') && headers[1].includes('내용')
            );
            let colWidths: number[];
            if (isRoadmapTable) {
              // 정책자금 신청 로드맵 표: 기관/상품/신청시기/예상승인시기 (3-4열)
              if (colCount === 4) {
                colWidths = [textWidth * 0.20, textWidth * 0.30, textWidth * 0.25, textWidth * 0.25];
              } else if (colCount === 3) {
                colWidths = [textWidth * 0.22, textWidth * 0.38, textWidth * 0.40];
              } else {
                colWidths = Array(colCount).fill(textWidth / Math.max(colCount, 1));
              }
            } else if (isFundingRankTable) {
              // 정책자금 순위 표: 항목/내용 동일 폭
              colWidths = [textWidth * 0.30, textWidth * 0.70];
            } else if (isDiagnosisTable && colCount === 3) {
              colWidths = [textWidth * 0.20, textWidth * 0.40, textWidth * 0.40];
            } else if (isDiagnosisTable && colCount === 4) {
              colWidths = [textWidth * 0.18, textWidth * 0.27, textWidth * 0.27, textWidth * 0.28];
            } else if (isSummaryTable && colCount === 4) {
              // 평가항목(좌)/점수(좌)/등급(좌)/평가의견(우)
              colWidths = [textWidth * 0.28, textWidth * 0.12, textWidth * 0.10, textWidth * 0.50];
            } else if (isKpiTable && colCount === 4) {
              // KPI(좌)/현재/3개월/6개월/1년
              colWidths = [textWidth * 0.30, textWidth * 0.175, textWidth * 0.175, textWidth * 0.175, textWidth * 0.175];
              if (colCount === 4) colWidths = [textWidth * 0.30, textWidth * 0.23, textWidth * 0.23, textWidth * 0.24];
            } else if (isEffectTable && colCount === 3) {
              // 기간(좌)/효과(중)/목표(우)
              colWidths = [textWidth * 0.18, textWidth * 0.42, textWidth * 0.40];
            } else {
              // 기본: 내용 길이 기반 동적 열 너비 계산 (한글 2바이트 가중치 적용)
              // 한글은 영문보다 약 1.8배 넓으므로 가중치 적용
              const calcVisualLen = (text: string, maxChars = 40): number => {
                let len = 0;
                const capped = text.slice(0, maxChars);
                for (const ch of capped) {
                  const code = ch.charCodeAt(0);
                  // 한글 유니코드 범위: AC00-D7A3 (완성형), 1100-11FF (자모)
                  if (code >= 0xAC00 && code <= 0xD7A3) len += 1.8;
                  else if (code >= 0x4E00 && code <= 0x9FFF) len += 1.8; // CJK
                  else len += 1.0;
                }
                return len;
              };

              // 열별 최대 시각적 길이 계산 (헤더 + 모든 데이터 행)
              const maxVisualLens = Array(colCount).fill(0);
              headers.forEach((h, ci) => {
                maxVisualLens[ci] = Math.max(maxVisualLens[ci], calcVisualLen(h));
              });
              rows.forEach(row2 => {
                row2.forEach((cell2, ci) => {
                  if (ci < colCount) {
                    maxVisualLens[ci] = Math.max(maxVisualLens[ci], calcVisualLen(cell2));
                  }
                });
              });

              // 최소 너비 보장 (전체의 8%) 및 최대 너비 제한 (전체의 60%)
              const minW = textWidth * 0.08;
              const maxW = textWidth * 0.60;
              const totalVisual = maxVisualLens.reduce((a, b) => a + b, 0) || 1;
              colWidths = maxVisualLens.map(len =>
                Math.min(Math.max((len / totalVisual) * textWidth, minW), maxW)
              );

              // 정규화: 합계가 정확히 textWidth가 되도록
              const totalW = colWidths.reduce((a, b) => a + b, 0);
              colWidths = colWidths.map(w => (w / totalW) * textWidth);
            }

            // 테이블 헤더 + 최소 2행 이상 들어갈 공간이 없으면 새 페이지로 이동
            const tablePageBottom = doc.page.height - doc.page.margins.bottom;
            const minTableH = 24 + (rows.length > 0 ? Math.min(rows.length, 2) * 22 : 22);
            if (doc.y + minTableH > tablePageBottom - 10) {
              doc.addPage();
            }

            const tableStartY = doc.y;
            const thY = doc.y;
            const headerRowH = 24;

            doc.save();
            doc.rect(textLeft, thY, textWidth, headerRowH).fill(accentHex);
            setFont(8, true);
            let hx = textLeft;
            headers.forEach((h, ci) => {
              const hColW = colWidths[ci] ?? (textWidth / Math.max(headers.length, 1));
              doc.fillColor("#ffffff").text(stripBold(h), hx + 6, thY + 7, {
                width: Math.max(hColW - 12, 10),
                lineBreak: false,
              });
              hx += hColW;
            });
            doc.restore();
            doc.y = thY + headerRowH;

            rows.forEach((row, ri) => {
              // '---'만인 행 건너뜀 (PDF 렌더링 시 추가 안전장치)
              const isSepRow = row.every(c => /^:?-+:?$/.test(c.trim()));
              if (isSepRow) return;
              let maxCellH = 22;
              row.forEach((cell, ci) => {
                setFont(8);
                const w = colWidths[ci] ? colWidths[ci] - 12 : 60;
                const cellH = doc.heightOfString(stripBold(cell), { width: w, lineGap: 2 }) + 14;
                if (cellH > maxCellH) maxCellH = cellH;
              });
              ensureSpace(maxCellH + 4);
              const rowY = doc.y;

              if (ri % 2 === 0) {
                doc.save();
                doc.rect(textLeft, rowY, textWidth, maxCellH).fill("#f8f9fa");
                doc.restore();
              }

              let cx = textLeft;
              row.forEach((cell, ci) => {
                if (ci === 0) {
                  setFont(8, true);
                  doc.fillColor("#111827");
                } else {
                  setFont(8);
                  doc.fillColor("#1f2937");
                }
                const cellColW = colWidths[ci] ?? (textWidth / Math.max(colWidths.length, 1));
                doc.text(stripBold(cell), cx + 6, rowY + 5, {
                  width: Math.max(cellColW - 12, 10),
                  lineGap: 2,
                });
                cx += cellColW;
              });

              doc.moveTo(textLeft, rowY + maxCellH).lineTo(textLeft + textWidth, rowY + maxCellH)
                .strokeColor("#e5e7eb").lineWidth(0.5).stroke();
              doc.y = rowY + maxCellH;
            });

            const tableEndY = doc.y;
            doc.rect(textLeft, tableStartY, textWidth, tableEndY - tableStartY)
              .strokeColor("#d1d5db").lineWidth(0.5).stroke();

            doc.moveDown(0.5);
            break;
          }

          case "hr": {
            doc.moveTo(textLeft, doc.y).lineTo(textLeft + textWidth, doc.y)
              .strokeColor("#e5e7eb").stroke();
            doc.moveDown(0.5);
            break;
          }
        }
      });

      // 로드맵 데이터 렌더링 (roadmapData가 있는 경우) - 이미지2 스타일: 영역별 색상 헤더 + 컬럼 구조
      if (section.roadmapData?.rows?.length) {
        const rm = section.roadmapData;
        const cols = rm.columns || [];
        const rows = rm.rows || [];
        const colCount = cols.length;
        const roadmapLeft = leftMargin + 4;
        const roadmapWidth = contentW - 4;
        const dataColW = roadmapWidth / Math.max(colCount, 1);

        // 영역별 색상 팔레트 (이미지2 스타일 - 진한 배경색)
        const areaBgColors: [number, number, number][] = [
          [59, 130, 246],   // 블루 (#3B82F6)
          [16, 185, 129],   // 그린 (#10B981)
          [139, 92, 246],   // 퍼플 (#8B5CF6)
          [245, 158, 11],   // 오렌지 (#F59E0B)
          [239, 68, 68],    // 레드 (#EF4444)
          [20, 184, 166],   // 틸 (#14B8A6)
        ];
        // 영역별 연한 배경색 (셀 배경용)
        const areaLightBgs: [number, number, number][] = [
          [239, 246, 255],  // 연한 블루
          [236, 253, 245],  // 연한 그린
          [245, 243, 255],  // 연한 퍼플
          [255, 251, 235],  // 연한 오렌지
          [254, 242, 242],  // 연한 레드
          [240, 253, 250],  // 연한 틸
        ];
        // 영역별 텍스트 강조색 (단계명, 항목 불릿)
        const areaAccentColors: string[] = [
          "#2563EB",  // 블루
          "#059669",  // 그린
          "#7C3AED",  // 퍼플
          "#D97706",  // 오렌지
          "#DC2626",  // 레드
          "#0D9488",  // 틸
        ];

        // 인증/정책지원 영역 분리 여부 판단
        const certPolicyAreas = ['인증', '정책지원', '정책', '지원', '인증/정책'];
        const mainRows = rows.filter(row => !certPolicyAreas.some(k => row.area.includes(k)));
        const certRows = rows.filter(row => certPolicyAreas.some(k => row.area.includes(k)));

        // 각 영역(row)을 독립적인 블록으로 렌더링하는 함수
        const renderRoadmapRows = (targetRows: typeof rows) => {
          targetRows.forEach((row, ri) => {
            // 각 셀의 실제 항목 높이를 개별 계산
            const cellItemLines = row.cells.map(c =>
              Math.max(c.items.reduce((sum, item) => {
                const cleanItem = item.replace(/^[-•●]\s*/, '').trim();
                return sum + Math.ceil(doc.heightOfString(`• ${cleanItem}`, { width: dataColW - 20, lineGap: 1 }) / 11);
              }, 0), 1)
            );
            // 각 셀별 높이: 단계명행(26) + 항목행(해당 셀 항목 수*13) + 여백(6)
            const cellHeights = cellItemLines.map(lines => 26 + lines * 13 + 6);
            // 블록 전체 높이는 헤더(28) + 가장 높은 셀 높이
            const maxCellH = Math.max(...cellHeights);
            const blockH = 28 + maxCellH;
            ensureSpace(blockH + 10);
            const blockY = doc.y;

            const areaBg = areaBgColors[ri % areaBgColors.length];
            const lightBg = areaLightBgs[ri % areaLightBgs.length];
            const accentColor = areaAccentColors[ri % areaAccentColors.length];

            // ── 영역 헤더 (색상 배경 + 흰색 텍스트, 전체 너비) ──
            doc.rect(roadmapLeft, blockY, roadmapWidth, 28).fill(areaBg);
            setFont(10, true);
            doc.fillColor("#ffffff").text(row.area, roadmapLeft + 12, blockY + 8, {
              width: roadmapWidth - 24,
              lineBreak: false,
            });

            // ── 셀 영역 (단계명 + 항목) ──
            const cellsY = blockY + 28;

            row.cells.forEach((cell, ci) => {
              const cx = roadmapLeft + ci * dataColW;
              const isLast = ci === colCount - 1;
              // 각 셀의 실제 높이 사용 (내용에 맞게 조절)
              const thisCellH = cellHeights[ci];

              // 셀 배경 (연한 영역색, 모든 셀 동일 높이 = maxCellH)
              doc.rect(cx, cellsY, dataColW - (isLast ? 0 : 1), maxCellH).fill(lightBg);

              // 단계 레이블 (1단계/2단계 등)
              const colLabel = cols[ci] ? cols[ci].replace(/\n/g, " ") : "";
              setFont(7.5, true);
              doc.fillColor(accentColor).text(colLabel, cx + 8, cellsY + 6, {
                width: dataColW - 16,
                lineBreak: false,
              });
              // 단계 핵심 목표명
              setFont(9, true);
              doc.fillColor("#1e293b").text(cell.phase, cx + 8, cellsY + 17, {
                width: dataColW - 16,
                lineBreak: false,
              });

              // 구분선 (단계명 아래)
              doc.moveTo(cx + 8, cellsY + 30).lineTo(cx + dataColW - 8, cellsY + 30)
                .strokeColor("#e5e7eb").lineWidth(0.5).stroke();

              // 항목들 (줄바꿈 허용, 글머리표 포함)
              setFont(8);
              doc.fillColor("#374151");
              let itemY = cellsY + 34;
              cell.items.forEach((item) => {
                const cleanItem = item.replace(/^[-•●]\s*/, "").trim();
                const itemText = `• ${cleanItem}`;
                doc.text(itemText, cx + 8, itemY, {
                  width: dataColW - 18,
                  lineGap: 1,
                });
                itemY = doc.y + 1;
              });

              // 셀 우측 구분선 (마지막 셀 제외, 가장 높은 셀 기준)
              if (!isLast) {
                doc.moveTo(cx + dataColW, cellsY).lineTo(cx + dataColW, cellsY + maxCellH)
                  .strokeColor("#d1d5db").lineWidth(0.5).stroke();
              }
            });

            // 블록 하단 여백 (가장 높은 셀 기준) - 최소화
            doc.y = cellsY + maxCellH + 4;
          });
        };

        // 메인 로드맵 영역 렌더링 - 전체 높이를 계산하여 한 페이지에 모두 렌더링
        if (mainRows.length > 0) {
          // 각 영역 블록의 높이 계산
          const mainRowHeights = mainRows.map(row => {
            const cellItemLines = row.cells.map(c =>
              Math.max(c.items.reduce((sum, item) => {
                const cleanItem = item.replace(/^[-•●]\s*/, '').trim();
                const lineCount = Math.ceil(cleanItem.length / 20) + 1;
                return sum + lineCount;
              }, 0), 2)
            );
            const maxCellH = Math.max(...cellItemLines.map(lines => 26 + lines * 13 + 6));
            return 28 + maxCellH + 10; // 헤더 + 셀 + 여백
          });
          const totalMainHeight = mainRowHeights.reduce((sum, h) => sum + h, 0);
          const availableSpace = doc.page.height - doc.y - 40; // 하단 여백 40pt
          // 전체 높이가 남은 공간보다 크면 새 페이지 추가
          if (totalMainHeight > availableSpace && totalMainHeight < doc.page.height * 0.85) {
            doc.addPage();
          }
        }
        renderRoadmapRows(mainRows);

        // 인증/정책지원 영역이 있으면 별도 페이지에 렌더링
        if (certRows.length > 0) {
          doc.addPage();
          // 별도 페이지 제목
          setFont(13, true);
          doc.fillColor("#111111").text("인증 및 정책지원 단계별 실행 계획", leftMargin, doc.y, { width: contentW });
          doc.moveDown(0.3);
          doc.moveTo(leftMargin, doc.y).lineTo(pageW - leftMargin, doc.y)
            .strokeColor([r, g, b]).opacity(0.3).stroke();
          doc.opacity(1);
          doc.moveDown(0.5);
          renderRoadmapRows(certRows);

          // 인증/정책지원 추천 및 대안 상세 내용
          if (report.isConsultant || true) {
            doc.moveDown(0.5);
            const co2 = report.companyData;
            const hasPatent2 = co2?.hasPatent === 'yes';
            const hasVenture2 = co2?.hasVentureCert;
            const hasInnobiz2 = co2?.hasInnobiz;
            const hasHaccp2 = co2?.patentAndCerts?.includes('HACCP') || co2?.patentAndCerts?.includes('haccp');
            const industry2 = co2?.industry || '';
            const isManuf2 = industry2.includes('제조') || industry2.includes('생산');
            const isIT2 = industry2.includes('IT') || industry2.includes('소프트') || industry2.includes('정보') || industry2.includes('기술');

            // 추천 인증 상세 표
            const certRecommendations: string[][] = [];
            if (!hasVenture2) certRecommendations.push(['벤처기업 인증', '중소벤처기업부', '법인세 50% 감면, 정책자금 우대금리 적용', '기술성 평가 통과 필요. 이노비즈 선취득 후 벤처 전환 권고.']);
            if (!hasInnobiz2) certRecommendations.push(['이노비즈(기술혁신형)', '중소기업기술정보진흥원', '정책자금 우대, 연구개발비 세액공제', '기술혁신 활동 3년 이상 필요. 신청 전 자가진단 점수 확인.']);
            if (!hasPatent2) certRecommendations.push(['특허 출원', '특허청', '기보 기술평가 가점, R&D 바우처 연계', isManuf2 ? '핵심 제조공정 특허 우선 출원. 특허청 IP 나래 프로그램 활용.' : 'SW 특허 또는 디자인 특허 검토. 특허 전문가 상담 권고.']);
            if (!hasHaccp2 && (isManuf2 || industry2.includes('식품'))) certRecommendations.push(['HACCP 인증', '식품안전관리인증원', '식품 수출 필수, 바이어 신뢰도 향상', '위생관리 시스템 구축 선행. 컨설팅 지원사업 연계 가능.']);
            certRecommendations.push(['소상공인 확인서', '소상공인시장진흥공단', '소진공 정책자금 신청 필수 서류', '매출액·상시근로자 수 기준 충족 여부 사전 확인.']);
            if (isManuf2) certRecommendations.push(['스마트공장 도입', '중소벤처기업부', '생산성 향상, 정부 보조금 최대 1억원', '스마트제조혁신추진단 통해 진단 후 단계별 지원 신청.']);

            if (certRecommendations.length > 0) {
              setFont(11, true);
              doc.fillColor("#111827").text("인증별 추천 이유 및 대안 전략", textLeft, doc.y, { width: textWidth });
              doc.moveDown(0.3);

              const certHeaders = ['인증/지원', '주관기관', '핵심 혜택', '취득 전략 및 대안'];
              const certColWidths = [textWidth * 0.18, textWidth * 0.17, textWidth * 0.30, textWidth * 0.35];
              const certThY = doc.y;
              const certThH = 22;
              doc.rect(textLeft, certThY, textWidth, certThH).fill([r, g, b]);
              setFont(8, true);
              let chx = textLeft;
              certHeaders.forEach((h, ci) => {
                doc.fillColor("#ffffff").text(h, chx + 5, certThY + 6, { width: certColWidths[ci] - 10, lineBreak: false });
                chx += certColWidths[ci];
              });
              doc.y = certThY + certThH;

              certRecommendations.forEach((row2, ri2) => {
                // 각 셀 높이 계산
                setFont(8);
                let maxH = 18;
                row2.forEach((cell2, ci2) => {
                  const h2 = doc.heightOfString(cell2, { width: certColWidths[ci2] - 10, lineGap: 1 }) + 8;
                  if (h2 > maxH) maxH = h2;
                });
                ensureSpace(maxH + 4);
                const rowY2 = doc.y;
                if (ri2 % 2 === 0) doc.rect(textLeft, rowY2, textWidth, maxH).fill("#f8f9fa");
                let cx2 = textLeft;
                row2.forEach((cell2, ci2) => {
                  if (ci2 === 0) { setFont(8, true); doc.fillColor("#1e3a5f"); }
                  else { setFont(8); doc.fillColor("#1f2937"); }
                  doc.text(cell2, cx2 + 5, rowY2 + 4, { width: certColWidths[ci2] - 10, lineGap: 1 });
                  cx2 += certColWidths[ci2];
                });
                doc.moveTo(textLeft, rowY2 + maxH).lineTo(textLeft + textWidth, rowY2 + maxH)
                  .strokeColor("#e5e7eb").lineWidth(0.5).stroke();
                doc.y = rowY2 + maxH;
              });
              doc.rect(textLeft, certThY, textWidth, doc.y - certThY)
                .strokeColor("#d1d5db").lineWidth(0.5).stroke();
              doc.moveDown(0.5);
            }

            // 정책지원 연계 프로그램 상세 표
            const policyPrograms: string[][] = [
              ['중진공 정책자금', '중소벤처기업진흥공단', '시설·운전자금 최대 45억원', '830점 이상 신용 필요. 직접대출 우선 신청 후 대리대출 검토.'],
              ['기보 기술보증', '기술보증기금', '기술력 기반 보증 최대 30억원', '700점 이상 신용 필요. 특허·이노비즈 보유 시 우대.'],
              ['소진공 정책자금', '소상공인시장진흥공단', '운전·시설자금 최대 7천만원', '소상공인 확인서 필수. 신용취약자 전용 상품 별도 운영.'],
              isManuf2 ? ['스마트제조 바우처', '중소벤처기업부', '스마트공장 구축비 최대 1억원 지원', '스마트제조혁신추진단 진단 후 신청. 자부담 30% 필요.'] : ['디지털전환 바우처', '중소벤처기업부', 'SW·클라우드 도입비 최대 3천만원 지원', '수요기업 신청 후 공급기업 매칭. 자부담 30% 필요.'],
              ['KOTRA 수출바우처', 'KOTRA', '수출 지원 최대 1억원', '수출 실적 또는 수출 계획 필요. 해외지사화 사업과 병행 가능.'],
            ];

            doc.moveDown(0.3);
            setFont(11, true);
            doc.fillColor("#111827").text("정책지원 연계 프로그램 상세", textLeft, doc.y, { width: textWidth });
            doc.moveDown(0.3);

            const polHeaders = ['프로그램', '주관기관', '지원 내용', '신청 전략 및 조건'];
            const polColWidths = [textWidth * 0.20, textWidth * 0.20, textWidth * 0.28, textWidth * 0.32];
            const polThY = doc.y;
            const polThH = 22;
            doc.rect(textLeft, polThY, textWidth, polThH).fill([r, g, b]);
            setFont(8, true);
            let phx = textLeft;
            polHeaders.forEach((h, ci) => {
              doc.fillColor("#ffffff").text(h, phx + 5, polThY + 6, { width: polColWidths[ci] - 10, lineBreak: false });
              phx += polColWidths[ci];
            });
            doc.y = polThY + polThH;

            policyPrograms.forEach((row3, ri3) => {
              setFont(8);
              let maxH3 = 18;
              row3.forEach((cell3, ci3) => {
                const h3 = doc.heightOfString(cell3, { width: polColWidths[ci3] - 10, lineGap: 1 }) + 8;
                if (h3 > maxH3) maxH3 = h3;
              });
              ensureSpace(maxH3 + 4);
              const rowY3 = doc.y;
              if (ri3 % 2 === 0) doc.rect(textLeft, rowY3, textWidth, maxH3).fill("#f8f9fa");
              let cx3 = textLeft;
              row3.forEach((cell3, ci3) => {
                if (ci3 === 0) { setFont(8, true); doc.fillColor("#1e3a5f"); }
                else { setFont(8); doc.fillColor("#1f2937"); }
                doc.text(cell3, cx3 + 5, rowY3 + 4, { width: polColWidths[ci3] - 10, lineGap: 1 });
                cx3 += polColWidths[ci3];
              });
              doc.moveTo(textLeft, rowY3 + maxH3).lineTo(textLeft + textWidth, rowY3 + maxH3)
                .strokeColor("#e5e7eb").lineWidth(0.5).stroke();
              doc.y = rowY3 + maxH3;
            });
            doc.rect(textLeft, polThY, textWidth, doc.y - polThY)
              .strokeColor("#d1d5db").lineWidth(0.5).stroke();
          }
        }

        doc.moveDown(0.5);
        return; // 로드맵 렌더링 완료, 차트 건너뜀
      }

      // 실행 로드맵 섹션: 차트 건너롱 (로드맵 데이터 없는 경우)
      if (section.title.includes("실행 로드맵") || section.title.includes("실행로드맵")) {
        return;
      }

      // 차트 렌더링
      const chartValuesAllZero = !section.chartData?.values?.length || section.chartData.values.every(v => v === 0);
      const chartSinglePoint = (section.chartData?.labels?.length ?? 0) <= 1 && (section.chartData?.type === 'bar' || section.chartData?.type === 'line');
      const skipChartSections = [
        "신용 및 금융현황", "신용및금융현황", "신용점수", "대표자 신용점수",
        "최적정책자금 매칭", "최적 정책자금 매칭",
        "기관별 자금 추천", "기관별 자도 용 추천", "기관별 자동 추천",
        "정책자금 매칭 그래프", "정책자금 매칭 엔진", "정책자금 가능성",
        "보증가능성 예측", "승인 확률", "정책자금 매칭 알고리즘",
        "상시근로자", "근로자 수", "인력 현황", "인력현황",
        "정부지원 수혜", "수혜 이력", "정부지원이력", "정부 지원 이력", "지원 수혜", "수혜이력",
        "자금 사용계획", "자금사용계획", "자금 사용 계획",
      ];
      const shouldSkipChart = skipChartSections.some(keyword => section.title.includes(keyword)) || chartValuesAllZero || chartSinglePoint;
      if (!shouldSkipChart && section.chartData && section.chartData.labels?.length && section.chartData.values?.length) {
        const chart = section.chartData;
        const chartLeft = leftMargin + 16;
        const chartWidth = contentW - 16;
        // 정책자금 리포트에서 2섹션 묶음 페이지는 차트 높이를 줄임
        // 사업계획서/경영진단보고서는 차트 높이를 110으로 줄여 페이지 넘침 방지
        const isBusinessOrDiagnosis = report.type === 'business_plan' || report.type === 'diagnosis';
        const chartHeight = isSecondOnPage ? 100 : (isBusinessOrDiagnosis ? 110 : 140);
        const chartPadding = { top: 30, right: 10, bottom: 30, left: 50 };
        const plotW = chartWidth - chartPadding.left - chartPadding.right;
        const plotH = chartHeight - chartPadding.top - chartPadding.bottom;

        ensureSpace(chartHeight + 40);

        const chartBoxY = doc.y;
        doc.save();
        doc.roundedRect(chartLeft, chartBoxY, chartWidth, chartHeight + 10, 6).fill("#f9fafb");
        doc.roundedRect(chartLeft, chartBoxY, chartWidth, chartHeight + 10, 6).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
        doc.restore();

        setFont(8, true);
        const cleanChartTitle = chart.title.replace(/\s*\(단위[:\s][^)]*\)/g, "").trim();
        doc.fillColor("#374151").text(cleanChartTitle, chartLeft, chartBoxY + 6, { width: chartWidth, align: "center" });

        const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#0EA5E9", "#22C55E"];

        const isOrgSection = section.title.includes("운영") && (section.title.includes("조직") || section.title.includes("인력"));
        const isFundingSection = section.title.includes("자금집행") || section.title.includes("자금 집행") || section.title.includes("재무 계획") || section.title.includes("재무계획");
        const maxChartVal = Math.max(...chart.values, 1);
        const isEokUnit = isFundingSection && maxChartVal < 10000;
        const allValuesSmallInt = chart.values.every(v => v >= 0 && v < 1000 && Number.isInteger(v));
        const formatVal = (v: number): string => {
          if (isOrgSection) return `${v}명`;
          if (isFundingSection) {
            if (isEokUnit) {
              const eok = Math.floor(v);
              const cheon = Math.round((v - eok) * 10);
              if (eok > 0 && cheon > 0) return `${eok}억${cheon}천`;
              if (eok > 0) return `${eok}억`;
              return `${Math.round(v * 1000)}천만`;
            }
            return formatChartValue(v);
          }
          if (allValuesSmallInt) return `${v}`;
          return formatChartValue(v);
        };

        const maxVal = Math.max(...chart.values, 1);
        const originX = chartLeft + chartPadding.left;
        const originY = chartBoxY + chartPadding.top + plotH;

        if (chart.type === "pie" || chart.type === "doughnut") {
          const total = chart.values.reduce((a, b) => a + b, 0) || 1;
          // 차트 박스 내부를 최대한 활용: 원의 중심은 왼쪽 45% 영역, 오른쪽 55%는 레전드
          const pieAreaW = chartWidth * 0.50; // 원형 영역 너비
          const legendAreaW = chartWidth * 0.50; // 레전드 영역 너비
          // 원 반지름: 영역 너비/높이 중 작은 값의 45%
          const pieR = Math.min(pieAreaW / 2, (chartHeight - 20) / 2) * 0.85;
          const innerR = chart.type === "doughnut" ? pieR * 0.50 : 0;
          const pieCx = chartLeft + pieAreaW / 2;
          const pieCy = chartBoxY + chartHeight / 2 + 4;

          let startAngle = -Math.PI / 2;
          chart.values.forEach((v, i) => {
            const angle = (v / total) * 2 * Math.PI;
            const color = COLORS[i % COLORS.length];
            const steps = Math.max(Math.ceil(angle / 0.05), 4);
            doc.save();
            if (innerR > 0) {
              doc.moveTo(pieCx + innerR * Math.cos(startAngle), pieCy + innerR * Math.sin(startAngle));
              for (let s = 0; s <= steps; s++) {
                const a = startAngle + (angle * s) / steps;
                doc.lineTo(pieCx + pieR * Math.cos(a), pieCy + pieR * Math.sin(a));
              }
              for (let s = steps; s >= 0; s--) {
                const a = startAngle + (angle * s) / steps;
                doc.lineTo(pieCx + innerR * Math.cos(a), pieCy + innerR * Math.sin(a));
              }
            } else {
              doc.moveTo(pieCx, pieCy);
              for (let s = 0; s <= steps; s++) {
                const a = startAngle + (angle * s) / steps;
                doc.lineTo(pieCx + pieR * Math.cos(a), pieCy + pieR * Math.sin(a));
              }
              doc.lineTo(pieCx, pieCy);
            }
            doc.fill(color);
            doc.restore();
            startAngle += angle;
          });

          // 레전드: 오른쪽 영역에 수직 중앙 정렬
          const legendX = chartLeft + pieAreaW + 8;
          const legendItemH = 16;
          const totalLegendH = chart.labels.length * legendItemH;
          const legendStartY = chartBoxY + (chartHeight - totalLegendH) / 2 + 4;
          chart.labels.forEach((label, i) => {
            const ly = legendStartY + i * legendItemH;
            if (ly < chartBoxY + chartHeight - 8) {
              doc.rect(legendX, ly + 2, 10, 10).fill(COLORS[i % COLORS.length]);
              setFont(7.5);
              const pct = Math.round((chart.values[i] / total) * 100);
              const legendLabel = label.length > 12 ? label.slice(0, 12) + ".." : label;
              doc.fillColor("#1f2937").text(`${legendLabel} (${pct}%)`, legendX + 14, ly + 2, { width: legendAreaW - 22 });
            }
          });
        } else {
          const stepX = chart.labels.length > 1 ? plotW / (chart.labels.length - 1) : plotW;

          for (let gi = 0; gi <= 4; gi++) {
            const gy = originY - (plotH * gi) / 4;
            doc.moveTo(originX, gy).lineTo(originX + plotW, gy).strokeColor("#f3f4f6").lineWidth(0.5).stroke();
            setFont(7);
            const rawGridVal = (maxVal * gi) / 4;
            doc.fillColor("#6b7280").text(formatVal(Math.round(rawGridVal)), chartLeft + 4, gy - 4, { width: chartPadding.left - 8, align: "right" });
          }

          const points = chart.values.map((v, i) => ({
            x: chart.labels.length > 1 ? originX + stepX * i : originX + plotW / 2,
            y: originY - (v / maxVal) * plotH,
          }));

          doc.save();
          doc.moveTo(points[0].x, points[0].y);
          points.slice(1).forEach((p) => doc.lineTo(p.x, p.y));
          doc.lineTo(points[points.length - 1].x, originY);
          doc.lineTo(points[0].x, originY);
          doc.closePath();
          doc.fillOpacity(0.08).fill(accentHex);
          doc.restore();

          doc.save();
          doc.moveTo(points[0].x, points[0].y);
          points.slice(1).forEach((p) => doc.lineTo(p.x, p.y));
          doc.strokeColor(accentHex).lineWidth(2).stroke();
          doc.restore();

          points.forEach((p, i) => {
            doc.circle(p.x, p.y, 4).fill(accentHex);
            doc.circle(p.x, p.y, 2.5).fill("#ffffff");

            setFont(7, true);
            doc.fillColor("#1f2937").text(formatVal(chart.values[i]), p.x - 20, p.y - 12, { width: 40, align: "center" });

            setFont(6);
            const label = chart.labels[i].length > 8 ? chart.labels[i].slice(0, 8) + ".." : chart.labels[i];
            doc.fillColor("#374151").text(label, p.x - 20, originY + 4, { width: 40, align: "center" });
          });
        }

        doc.y = chartBoxY + chartHeight + 16;
      }

      // ── 컨설턴트 확인용 동적 메모 삽입 ──────────────────────────
      if (report.isConsultant) {
        const co = report.companyData;
        const companyName = report.companyName || '';
        const industry = co?.industry || '';
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
        const year25Sales = parseInt((co?.year25Sales || '0').replace(/[^0-9]/g, ''), 10);
        const year24Sales = parseInt((co?.year24Sales || '0').replace(/[^0-9]/g, ''), 10);
        const salesTrend = year25Sales > 0 && year24Sales > 0
          ? (year25Sales >= year24Sales ? '매출 성장세' : '매출 감소세')
          : '매출 추이 파악 필요';
        const isManufacturing = industry.includes('제조') || industry.includes('생산');
        const isIT = industry.includes('IT') || industry.includes('소프트') || industry.includes('정보') || industry.includes('기술');
        const isFoodBiz = industry.includes('식품') || industry.includes('음식') || industry.includes('외식');

        const creditStatus = hasFinancialDelinquency || hasTaxDelinquency
          ? '금융연체/세금체납 이력 있음 - 정책자금 신청 전 반드시 해소 필요'
          : creditScore >= 800 ? `신용점수 ${creditScore}점 - 기보·신보 모두 신청 가능한 우량 신용`
          : creditScore >= 700 ? `신용점수 ${creditScore}점 - 기보·소진공 신청 가능, 신보는 신용 개선 후 검토`
          : creditScore >= 550 ? `신용점수 ${creditScore}점 - 신용취약자 전용 상품 우선 검토`
          : '신용점수 미입력 - 상담 시 KCB/NICE 신용점수 확인 필수';

        // 신용점수 구간별 추천 상품 계산
        const recommendedResult = getRecommendedProductsByScore(
          niceScore,
          kcbScore,
          hasFinancialDelinquency,
          hasTaxDelinquency,
          industry,
          hasPatent,
          !!hasVenture,
          !!hasInnobiz
        );

        let memoLines: string[] = [];

        if (section.title.includes('결론') || section.title.includes('종합의견')) {
          // 특허 활용/취득 권고
          memoLines.push(hasPatent && patentCount > 0
            ? `특허 활용: 보유 특허 ${patentCount}건을 기보 기술평가에 적극 활용 → 기보 보증 한도 최대 30% 우대 가능. 추가 출원 시 R&D 바우처(최대 1억원) 연계 검토. 특허 기술평가보증 신청 시 보증료 0.5% 감면.`
            : `특허 취득 권고: ${industry} 업종 핵심 기술 특허 출원 시 기보 기술평가보증 신청 가능(보증한도 최대 5억원, 보증료 연 0.8~1.0%). 출원 비용 약 100~200만원, 등록까지 약 1~2년 소요. 취득 후 법인세 최대 50% 감면(벤처기업 인증 연계 시).`);
          // 벤처·이노비즈 인증 권고
          memoLines.push(!hasVenture && !hasInnobiz
            ? `벤처·이노비즈 인증 권고: 미취득 상태. 벤처인증 취득 시 정책자금 우대금리(연 0.3~0.5%p 인하), 법인세 50% 감면(5년간), 취득세 75% 감면. 이노비즈 취득 시 기보 보증한도 최대 30억원까지 확대. 심사 기간 약 2~3개월, 비용 무료.`
            : `인증 유지·활용: 보유 인증을 정책자금 신청 시 우대 조건으로 적극 활용. 인증 갱신 시기(통상 3년) 사전 확인 필수. 상위 인증(이노비즈→월드클래스300) 취득 검토 시 중진공 전담 컨설팅 무료 지원 가능.`);
          // 수출 전략
          memoLines.push(hasExport
            ? `수출 확대: KOTRA 수출바우처(최대 1억원, 자부담 30%), 해외지사화 사업(연 1,200만원 지원) 연계. ${isManufacturing ? 'OEM 수출 및 해외 전시회 지원(건당 최대 500만원) 활용.' : '온라인 수출 플랫폼(아마존·알리바바) 입점 지원 사업 신청.'} FTA 원산지 증명 활용 시 관세 절감 가능.`
            : hasPlannedExport
            ? `수출 준비: KOTRA 해외지사화 사업(연 1,200만원 지원), 수출바우처(최대 1억원, 자부담 30%) 신청 권고. 수출보험공사 단기수출보험(보험료율 0.3~1.5%) 가입으로 미수금 리스크 헤지 검토.`
            : `수출 진출 검토: ${industry} 업종 해외 수요 파악 후 단계적 수출 전략 수립. KOTRA 시장조사 지원(무료) 활용 후 수출바우처 신청(최대 1억원) 순서로 진행 권고.`);
          // 마케팅
          memoLines.push(`마케팅: ${isManufacturing ? 'B2B 플랫폼(기업마당·조달청 나라장터) 등록 및 제조업 전시회 참가(건당 지원 최대 500만원).' : isIT ? '콘텐츠 마케팅·SEO 최적화 및 구글 애즈 활용(초기 예산 월 100~200만원 권고).' : isFoodBiz ? 'SNS·배달 플랫폼 연계 및 소상공인 온라인 판로 지원(최대 200만원).' : 'SNS·B2B 플랫폼 활용.'} 소상공인시장진흥공단 마케팅 지원사업(최대 500만원, 자부담 20%) 연계 검토.`);
          // 신용 현황
          memoLines.push(`신용 현황: ${creditStatus}`);
          // 정책자금 전략
          const fundingAmt = requiredFunding ? `(희망 자금: ${requiredFunding})` : '';
          memoLines.push(`정책자금 전략 ${fundingAmt}: ${salesTrend}. ${isManufacturing ? '기보(보증료 연 0.8~1.2%, 한도 최대 30억) → 중진공 직접대출(금리 연 2.9~3.9%, 한도 최대 45억) → 은행권' : '기보/신보(보증료 연 0.5~1.0%) → 중진공(금리 연 2.9~3.9%) → 은행권'} 단계적 조달 권고. 운전자금 대출 기간 통상 1년(연장 가능), 시설자금 5~10년 분할 상환.`);
          // 신용점수 구간별 추천 상품 목록 삽입
          memoLines.push(`[신용점수 기반 추천 상품] ${recommendedResult.summary}`);
          if (recommendedResult.products.length > 0) {
            recommendedResult.products.forEach(p => {
              memoLines.push(`  • ${p.institution} - ${p.productName}: ${p.reason}`);
            });
          }
          // 신용점수 개선 로드맵
          const score = niceScore || kcbScore;
          if (score > 0 && !hasFinancialDelinquency && !hasTaxDelinquency) {
            memoLines.push(`[신용점수 개선 로드맵] 현재 ${score}점 기준 단계별 목표 및 예상 기간:`);
            if (score < 550) {
              memoLines.push(`  ▸ 단계1 (${score}점 → 550점, 예상 6~12개월): 신용회복위원회 접수 후 신용관리사 상담 진행. 채무조정/개인회생 여부 판단. 연체 중인 소액 체납부터 시작. 성공 시 소진공 신용취약자자금 신청 가능.`);
              memoLines.push(`  ▸ 단계2 (550점 → 700점, 예상 12~24개월): 소진공 신용취약자자금 활용하면서 신용 조회 수 줄이기(월 2회 이내). 신용카드 사용량 30% 이내 유지. 기보 신청 가능 수준 도달 목표.`);
              memoLines.push(`  ▸ 단계3 (700점 → 800점, 예상 12~18개월): 신용카드 실적 축적(정시 사용 + 전액 납부). 부동산 담보 대출 유지. 신보 신청 가능 수준 도달 목표.`);
            } else if (score < 700) {
              memoLines.push(`  ▸ 다음 목표 (${score}점 → 700점, 예상 12~24개월): 소진공 신용취약자자금 활용하면서 신용 조회 수 줄이기(월 2회 이내). 신용카드 사용량 30% 이내 유지. 연체 전액 해소 후 신규 연체 발생 방지.`);
              memoLines.push(`  ▸ 다단계 목표 (700점 → 800점, 예상 12~18개월): 신용카드 실적 축적(정시 사용 + 전액 납부). 부동산 담보 대출 유지. 신보 신청 가능 수준 도달 목표.`);
              memoLines.push(`  ▸ 장기 목표 (800점 → 830점, 예상 18~24개월): 신용 거래 실적 누적(다양한 금융기관 거래). 부대이용 없이 신용카드 정시 사용. 중진공 직접대출 신청 가능 수준 도달 목표.`);
            } else if (score < 800) {
              memoLines.push(`  ▸ 다음 목표 (${score}점 → 800점, 예상 12~18개월): 신용카드 실적 축적(정시 사용 + 전액 납부). 부동산 담보 대출 유지. 신규 연체 발생 방지. 신보 신청 가능 수준 도달.`);
              memoLines.push(`  ▸ 장기 목표 (800점 → 830점, 예상 18~24개월): 신용 거래 실적 누적(다양한 금융기관 거래). 부대이용 없이 신용카드 정시 사용. 중진공 직접대출 신청 가능 수준 도달.`);
            } else if (score < 830) {
              memoLines.push(`  ▸ 다음 목표 (${score}점 → 830점, 예상 12~18개월): 신용 거래 실적 누적(다양한 금융기관 거래). 부대이용 없이 신용카드 정시 사용. 중진공 직접대출 신청 가능 수준 도달.`);
              memoLines.push(`  ▸ 탁월한 신용 유지: 부대이용 없이 신용카드 정시 사용 지속. 주기적 신용보고서 확인(연 1회). 중진공 직접대출 신청 시 우대 금리 혜택 유지.`);
            } else {
              memoLines.push(`  ▸ 탁월한 신용 유지 (${score}점): 중진공·신보·기보 모두 신청 가능한 최우량 신용. 부대이용 없이 신용카드 정시 사용 지속. 주기적 신용보고서 확인(연 1회). 중진공 직접대출 신청 시 우대 금리 혜택 유지.`);
            }
          } else if (hasFinancialDelinquency || hasTaxDelinquency) {
            memoLines.push(`[신용 회복 우선 과제] 연체/체납 해소 전에는 정책자금 신청이 불가합니다. 단계: 1) 연체 전액 납부 → 2) 찮아오는 세금 체납 → 3) 신용관리사 상담 → 4) 신용점수 회복 후 정책자금 신청. 예상 기간: 연체 해소 후 6~12개월.`);
          }

        } else if (section.title.includes('실행 계획') || section.title.includes('로드맵') || section.title.includes('단계별')) {
          const salesTarget20 = year25Sales > 0 ? Math.round(year25Sales * 1.2).toLocaleString() : '';
          memoLines.push(`1단계 (1~3개월, ${companyName}): ${!hasPatent ? '핵심 기술 특허 출원 착수(비용 약 100~200만원, 등록까지 1~2년), ' : ''}${!hasVenture ? '벤처인증 신청(심사 2~3개월, 비용 무료), ' : ''}운영자금 확보를 위한 기보 보증 신청(한도 최대 ${isManufacturing ? '30억원' : '10억원'}, 보증료 연 0.8~1.2%). 신용점수 관리 시작.`);
          memoLines.push(`2단계 (4~6개월): 시장 확대·매출 성장. ${industry} 특화 거래처 발굴, 마케팅 강화. 목표: ${salesTarget20 ? `${salesTarget20}만원(전년 대비 20%+ 성장)` : '전년 대비 20%+ 성장'}. 중진공 직접대출(금리 연 2.9~3.9%) 또는 정책자금 추가 조달 검토.`);
          memoLines.push(`3단계 (7~12개월): 지속 성장 체계 구축. ${hasExport || hasPlannedExport ? `수출 확대(KOTRA 수출바우처 최대 1억원 활용),` : `수출 진출 준비(KOTRA 시장조사 → 수출바우처 신청),`} 핵심 인력 채용(고용장려금 최대 월 80만원 지원 가능), 브랜드 강화.`);
          memoLines.push(`4단계 (1~2년): 재무 목표 달성 및 시장 리더십 확립. 시설자금 투자 시 중진공 시설자금(금리 연 2.9~3.9%, 상환 5~10년) 활용. 투자 유치 시 벤처투자 연계 또는 크라우드펀딩 검토.`);
          memoLines.push(`주의: 단계 전환 시 자금 소요 시기 사전 파악 → 정책자금 신청 타이밍 조율(심사 기간 통상 2~4주). 신용: ${creditStatus}`);
          memoLines.push(`정부지원 연계: ${isManufacturing ? '스마트공장 구축 지원(최대 1억원, 자부담 30%)·제조혁신 바우처' : isIT ? 'SW개발 바우처(최대 3,000만원)·디지털전환 바우처(최대 1억원)' : '소상공인 경영혁신 지원(최대 500만원)'} 단계별 매칭. 고용 증가 시 고용장려금(월 최대 80만원/인) 별도 신청 가능.`);

        } else if (section.title.includes('자금 사용')) {
          if (fundingOperating) {
            memoLines.push(`운전자금 집행 순서: ${isManufacturing ? '원자재/재료비 → 인건비 → 마케팅' : '인건비 → 원자재 → 마케팅'}. 초기 3개월 운영자금 반드시 확보 후 집행.`);
            const opEstimate = year25Sales > 0 ? `(전년 매출 ${year25Sales.toLocaleString()}만원 기준 ${isManufacturing ? Math.round(year25Sales/3.5).toLocaleString() : Math.round(year25Sales/8).toLocaleString()}만원 내외 예상)` : '';
          memoLines.push(`운전자금 한도: ${requiredFunding || '미입력'} ${opEstimate}. ${isManufacturing ? '제조업 기준 전년 매출의 1/3~1/4' : '일반 업종 전년 매출의 1/6~1/10'} 수준. 기보 보증(보증료 연 0.8~1.2%) 또는 신보 보증(보증료 연 0.5~1.0%) 활용 시 은행 대출금리 연 3.5~5.0% 수준 예상.`);
          }
          if (fundingFacility) {
            memoLines.push(`시설자금 주의: 설비 구입 전 리스(초기 비용 절감, 월 리스료 발생) vs 구매(감가상각 비용 처리) 비교 필수. 중진공 시설자금(금리 연 2.9~3.9%, 상환 5~10년, 거치 1~2년) 연계 검토. 감가상각 계획(정액법 5~10년) 수립 후 세무사 확인 권고.`);
          }
          if (!fundingOperating && !fundingFacility) {
            memoLines.push(`자금 유형 미선택: 운전/시설자금 구분 확인 후 용도에 맞는 상품 선택 필요.`);
          }
          memoLines.push(`집행 모니터링: 월별 집행 현황 점검, 잔액 관리. 증빙서류(세금계산서, 계약서) 반드시 보관.`);
          memoLines.push(`신용 현황: ${creditStatus}`);
        }

        // 정책자금 리포트 전용: 기관별 추천자금 상세 정보 추가
        if (report.type === 'funding_match' && (section.title.includes('최적') || section.title.includes('매칭') || section.title.includes('기관') || section.title.includes('전략') || section.title.includes('종합') || section.title.includes('결론'))) {
          const ms = report.matchingSummary;
          if (ms) {
            memoLines.push(`[기관별 추천자금 상세] ${companyName} 맞춤 기관별 자금 정보:`);
            // 1순위 기관 상세
            const rank1Org = ms.rank1.split('-')[0].trim();
            if (rank1Org.includes('기보') || rank1Org.includes('기술보증')) {
              memoLines.push(`  ▸ 1순위 기보(기술보증기금): 기술평가보증 한도 최대 30억원(특허 보유 시 30% 우대), 보증료 연 0.8~1.2%, 보증비율 85~100%. 신청 후 심사 2~4주. 기술력 중심 평가로 신용점수 보완 가능. 신청서류: 사업자등록증, 재무제표(2년), 기술 관련 자료.`);
            } else if (rank1Org.includes('중진공') || rank1Org.includes('중소기업진흥')) {
              memoLines.push(`  ▸ 1순위 중진공(중소기업진흥공단): 직접대출 금리 연 2.9~3.9%(분기별 변동), 한도 최대 45억원(운전 5억·시설 45억), 상환기간 운전 1년(연장)/시설 5~10년. 심사 3~5주. 신청: 중소기업 통합관리시스템(www.smes.go.kr).`);
            } else if (rank1Org.includes('신보') || rank1Org.includes('신용보증')) {
              memoLines.push(`  ▸ 1순위 신보(신용보증기금): 일반보증 한도 최대 30억원, 보증료 연 0.5~1.0%, 보증비율 85~100%. 신용점수 700점 이상 권장. 신청 후 심사 1~3주. 신청서류: 사업자등록증, 재무제표, 신용정보 동의서.`);
            } else if (rank1Org.includes('소진공') || rank1Org.includes('소상공인')) {
              memoLines.push(`  ▸ 1순위 소진공(소상공인시장진흥공단): 경영안정자금 한도 7천만원(금리 3.0~4.5%), 성장촉진자금 1억원(3.5~5.0%), 일반경영안정자금 2억원(3.5~5.5%). 소상공인 자격(5인 미만) 필수. 심사 2~3주.`);
            } else {
              memoLines.push(`  ▸ 1순위 ${rank1Org}: ${ms.rank1}. 신청 전 해당 기관 홈페이지에서 최신 금리·한도 확인 권고.`);
            }
            // 2순위 기관 상세
            const rank2Org = ms.rank2.split('-')[0].trim();
            if (rank2Org.includes('기보') || rank2Org.includes('기술보증')) {
              memoLines.push(`  ▸ 2순위 기보: 1순위 기관과 중복 신청 가능(단, 기보+신보 중복 불가). 기술평가보증 한도 최대 30억원, 보증료 0.8~1.2%. 1순위 승인 후 추가 자금 필요 시 활용.`);
            } else if (rank2Org.includes('중진공') || rank2Org.includes('중소기업진흥')) {
              memoLines.push(`  ▸ 2순위 중진공: 직접대출 금리 연 2.9~3.9%, 한도 최대 45억원. 1순위 보증기관 승인 후 은행 대출 실행 시 중진공 자금과 병행 활용 가능. 운전+시설 동시 신청 가능.`);
            } else if (rank2Org.includes('신보') || rank2Org.includes('신용보증')) {
              memoLines.push(`  ▸ 2순위 신보: 일반보증 한도 30억원, 보증료 0.5~1.0%. 기보와 중복 신청 불가이므로 1순위 결과에 따라 선택. 신용점수 700점 이상 시 유리.`);
            } else if (rank2Org.includes('소진공') || rank2Org.includes('소상공인')) {
              memoLines.push(`  ▸ 2순위 소진공: 경영안정자금(7천만원, 3.0~4.5%) 또는 성장촉진자금(1억원, 3.5~5.0%) 중 기업 상황에 맞게 선택. 1순위 기관 승인 후 추가 자금 필요 시 활용.`);
            } else {
              memoLines.push(`  ▸ 2순위 ${rank2Org}: ${ms.rank2}. 1순위 승인 후 추가 자금 필요 시 활용 검토.`);
            }
            // 3순위 기관 상세
            const rank3Org = ms.rank3.split('-')[0].trim();
            if (rank3Org.includes('소진공') || rank3Org.includes('소상공인')) {
              memoLines.push(`  ▸ 3순위 소진공: 소상공인 자격 충족 시 경영안정자금(7천만원, 3.0~4.5%), 성장촉진자금(1억원, 3.5~5.0%), 일반경영안정자금(2억원, 3.5~5.5%) 중 선택. 스마트화자금(1억원, 3.0~4.0%)은 설비 도입 시 추가 신청 가능.`);
            } else {
              memoLines.push(`  ▸ 3순위 ${rank3Org}: ${ms.rank3}. 신청 전 해당 기관 홈페이지에서 최신 금리·한도 확인 권고.`);
            }
            // 중복 신청 전략
            memoLines.push(`  ▸ 중복 신청 전략: 기보+중진공 병행 가능(기보 보증 → 은행 대출 + 중진공 직접대출). 기보+신보 중복 불가. 소진공은 소상공인 자격 충족 시 별도 신청 가능. 총 조달 가능 금액: ${ms.estimatedLimit} 수준.`);
            memoLines.push(`  ▸ 신청 타이밍: 정책자금 예산 소진 전 조기 신청 권고(통상 상반기 예산 소진율 높음). 심사 기간 2~5주 감안하여 자금 필요 시점 2개월 전 신청 시작.`);
          }
        }

        if (memoLines.length > 0) {
          // 실제 텍스트 높이 계산으로 박스 크기 결정 (글 잘림 방지)
          setFont(8);
          let totalTextH = 0;
          memoLines.forEach(line => {
            const lineH = doc.heightOfString(`• ${line}`, { width: textWidth - 24, lineGap: 2 });
            totalTextH += lineH + 4;
          });
          const memoBoxH = totalTextH + 36; // 제목 행 + 상하 여백
          ensureSpace(memoBoxH + 20);
          const memoBoxY = doc.y + 8;
          doc.rect(textLeft, memoBoxY, textWidth, memoBoxH).fillAndStroke('#FFF9E6', '#F59E0B');
          // 왼쪽 강조 바
          doc.rect(textLeft, memoBoxY, 4, memoBoxH).fill('#F59E0B');
          setFont(8, true);
          doc.fillColor('#92400E').text(`📋 컨설턴트 참고 메모 (${companyName} 맞춤)`, textLeft + 12, memoBoxY + 8);
          doc.y = memoBoxY + 24;
          memoLines.forEach(line => {
            setFont(8);
            const lineH = doc.heightOfString(`• ${line}`, { width: textWidth - 24, lineGap: 2 });
            // 페이지 하단 초과 시 새 페이지 (박스는 이미 그렸으므로 텍스트만 이동)
            if (doc.y + lineH > doc.page.height - doc.page.margins.bottom - 10) {
              doc.addPage();
              // 새 페이지에 이어지는 메모 박스
              const contBoxY = doc.y;
              const contBoxH = (memoLines.length - memoLines.indexOf(line)) * 20 + 20;
              doc.rect(textLeft, contBoxY, textWidth, contBoxH).fillAndStroke('#FFF9E6', '#F59E0B');
              doc.rect(textLeft, contBoxY, 4, contBoxH).fill('#F59E0B');
              doc.y = contBoxY + 8;
            }
            doc.fillColor('#78350F').text(`• ${line}`, textLeft + 12, doc.y, { width: textWidth - 24, lineGap: 2 });
            doc.y += 4;
          });
          doc.y = Math.max(doc.y, memoBoxY + memoBoxH) + 10;
        }
      }
    };

    // ── 정책자금 리포트: 그룹별로 페이지 렌더링 ──────────────────
    if (isFundingMatchReport && fundingPageGroups.length > 0) {
      fundingPageGroups.forEach((group) => {
        doc.addPage();
        if (group.length === 1) {
          // 단독 섹션 페이지
          const sectionIdx = group[0];
          if (sectionIdx < report.sections.length) {
            renderSectionContent(report.sections[sectionIdx], sectionIdx, false);
          }
        } else {
          // 2섹션 묶음 페이지
          const [firstIdx, secondIdx] = group;
          if (firstIdx < report.sections.length) {
            renderSectionContent(report.sections[firstIdx], firstIdx, false);
          }
          if (secondIdx < report.sections.length) {
            renderSectionContent(report.sections[secondIdx], secondIdx, true);
          }
        }
      });
      // 그룹에 포함되지 않은 나머지 섹션 (8번째 이후) 처리
      const coveredIndices = new Set(fundingPageGroups.flat());
      report.sections.forEach((section, idx) => {
        if (!coveredIndices.has(idx)) {
          doc.addPage();
          renderSectionContent(section, idx, false);
        }
      });
    } else {
      // 경영진단보고서 / 사업계획서: 기존 방식 (섹션당 새 페이지)
      // 업체전달용: '컨설턴트 실질 조언 및 참고 메모' 섹션 제외
      // 컨설턴트용: 해당 섹션을 마지막에 배치
      const isConsultantMemoSection = (s: ReportSection) =>
        s.title.includes('컨설턴트 실질') || s.title.includes('컨설턴트 참고') || s.title.includes('참고 메모');
      // 업체전달용 PDF에서 제외할 섹션 (SWOT 등 업체에게 불필요한 섹션)
      const isClientExcludedSection = (s: ReportSection) =>
        s.title.includes('SWOT') || s.title.includes('swot');

      if (report.isConsultant) {
        // 컨설턴트용: 일반 섹션 먼저, 컨설턴트 메모 섹션을 마지막에
        const normalSections = report.sections.filter(s => !isConsultantMemoSection(s));
        const memoSections = report.sections.filter(s => isConsultantMemoSection(s));
        const orderedSections = [...normalSections, ...memoSections];
        orderedSections.forEach((section, idx) => {
          doc.addPage();
          renderSectionContent(section, idx, false);
        });
      } else {
        // 업체전달용: 컨설턴트 메모 섹션 및 SWOT 섹션 제외
        const clientSections = report.sections.filter(s => !isConsultantMemoSection(s) && !isClientExcludedSection(s));
        clientSections.forEach((section, idx) => {
          doc.addPage();
          renderSectionContent(section, idx, false);
        });
      }
    }


    // ── Footer ────────────────────────────────────────────────
    ensureSpace(40);
    doc.moveDown(0.5);
    doc.moveTo(leftMargin, doc.y).lineTo(pageW - leftMargin, doc.y).strokeColor("#e5e7eb").stroke();
    doc.moveDown(0.5);
    setFont(8);
    doc.fillColor("#9ca3af").text(
      "BizConsult AI 경영컨설팅 · 본 보고서는 AI가 생성한 참고 자료입니다.",
      leftMargin, doc.y,
      { align: "center", width: contentW }
    );

    doc.end();

    await new Promise<void>((resolve) => doc.on("end", resolve));
    const pdfBuffer = Buffer.concat(chunks);
    const suffix = report.isConsultant ? '_컨설턴트용' : '_업체전달용';
    const baseTitle = report.title.replace(/[/\\?%*:|"<>]/g, "_");
    const filename = encodeURIComponent(baseTitle + suffix) + ".pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${filename}`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error("[PDF] Error generating PDF:", err);
    res.status(500).json({ error: "PDF 생성 실패: " + (err.message || "Unknown error") });
  }
});
