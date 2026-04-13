/**
 * 정책자금 상품 데이터베이스
 * 
 * 기관별 대표 정책자금 상품 정보를 관리합니다.
 * 2026년 기준 상품 정보이며, 실제 금리/한도는 분기별로 변동될 수 있습니다.
 */

export interface FundingProduct {
  id: string;
  institutionName: string;       // 기관명
  productName: string;           // 상품명
  category: string;              // 상품 분류 (운전자금, 시설자금, 보증 등)
  description: string;           // 상품 설명
  interestRate: string;          // 금리 (범위 또는 고정)
  maxLimit: string;              // 최대 한도
  loanPeriod: string;            // 대출/보증 기간
  targetBusiness: string;        // 지원 대상
  requiredDocs: string[];        // 필요 서류
  applicationUrl: string;        // 신청 URL
  contactInfo: string;           // 문의처
  tags: string[];                // 태그 (창업, 성장, 긴급 등)
  note?: string;                 // 참고사항
}

// ─── 중진공 (중소벤처기업진흥공단) 상품 ───

const KOSME_PRODUCTS: FundingProduct[] = [
  {
    id: "kosme-innovation-startup",
    institutionName: "중진공",
    productName: "혁신창업사업화자금",
    category: "창업자금",
    description: "업력 7년 미만 창업기업의 사업화에 필요한 자금을 저금리로 지원합니다. 청년 창업자(만 39세 이하)에게 우대금리가 적용됩니다.",
    interestRate: "연 2.54% ~ 3.14% (분기별 변동, 청년 우대 시 최대 0.6%p 감면)",
    maxLimit: "기업당 60억원 이내 (지방소재 70억원)",
    loanPeriod: "시설 10년 이내 (거치 4년), 운전 6년 이내 (거치 2년)",
    targetBusiness: "업력 7년 미만 중소기업 (신산업 분야 10년 미만)",
    requiredDocs: ["사업자등록증", "재무제표", "사업계획서", "법인등기부등본", "대표자 신분증"],
    applicationUrl: "https://www.kosmes.or.kr",
    contactInfo: "중진공 콜센터 1357",
    tags: ["창업", "사업화", "청년우대"],
    note: "2026년 1/4분기 기준금리 3.14%",
  },
  {
    id: "kosme-new-growth",
    institutionName: "중진공",
    productName: "신성장기반자금",
    category: "성장자금",
    description: "업력 7년 이상 중소기업의 성장과 도약을 위한 시설·운전자금을 지원합니다. 스마트공장, 수출기업 등에 우대 적용됩니다.",
    interestRate: "연 2.54% ~ 3.14% (분기별 변동, 이차보전 시 추가 감면)",
    maxLimit: "기업당 60억원 이내 (지방소재 70억원, 사업별 우대 100억원)",
    loanPeriod: "시설 10년 이내 (거치 4년), 운전 6년 이내 (거치 2년)",
    targetBusiness: "업력 7년 이상 중소기업 (창업자에 해당하지 않는 7년 미만 기업 포함)",
    requiredDocs: ["사업자등록증", "재무제표 3개년", "사업계획서", "시설투자계획서(시설자금 시)"],
    applicationUrl: "https://www.kosmes.or.kr",
    contactInfo: "중진공 콜센터 1357",
    tags: ["성장", "시설투자", "스마트공장"],
  },
  {
    id: "kosme-emergency",
    institutionName: "중진공",
    productName: "긴급경영안정자금",
    category: "긴급자금",
    description: "경영 위기 상황에 처한 중소기업에 긴급 운전자금을 지원합니다. 재해, 구조조정, 경기침체 등 긴급 상황 시 활용 가능합니다.",
    interestRate: "연 2.54% ~ 3.14% (분기별 변동)",
    maxLimit: "기업당 10억원 이내",
    loanPeriod: "운전 5년 이내 (거치 2년)",
    targetBusiness: "경영 위기 상황의 중소기업 (재해, 구조조정, 경기침체 등)",
    requiredDocs: ["사업자등록증", "재무제표", "피해 입증 서류", "긴급자금 신청서"],
    applicationUrl: "https://www.kosmes.or.kr",
    contactInfo: "중진공 콜센터 1357",
    tags: ["긴급", "경영안정", "위기극복"],
  },
  {
    id: "kosme-re-challenge",
    institutionName: "중진공",
    productName: "재도전특별자금",
    category: "재창업자금",
    description: "실패 경험이 있는 재창업 기업을 지원합니다. 성실 실패 기업인에게 우대 적용됩니다.",
    interestRate: "연 2.54% ~ 3.14% (분기별 변동, 우대금리 적용 가능)",
    maxLimit: "기업당 30억원 이내",
    loanPeriod: "시설 10년 이내 (거치 4년), 운전 6년 이내 (거치 2년)",
    targetBusiness: "재창업 중소기업 (성실 실패 기업인 우대)",
    requiredDocs: ["사업자등록증", "재무제표", "사업계획서", "폐업사실증명원"],
    applicationUrl: "https://www.kosmes.or.kr",
    contactInfo: "중진공 콜센터 1357",
    tags: ["재창업", "재도전"],
  },
];

// ─── 신용보증기금 상품 ───

const KODIT_PRODUCTS: FundingProduct[] = [
  {
    id: "kodit-general",
    institutionName: "신용보증기금",
    productName: "일반신용보증",
    category: "신용보증",
    description: "담보력이 부족한 중소기업에 신용보증서를 발급하여 금융기관 대출을 지원합니다. 가장 기본적이고 범용적인 보증 상품입니다.",
    interestRate: "보증료 연 0.5% ~ 1.5% (신용등급별 차등) + 은행 대출금리 3~5%",
    maxLimit: "기업당 최대 30억원",
    loanPeriod: "보증기간 1년 (연장 가능)",
    targetBusiness: "사업자등록 후 6개월 이상 경과한 중소기업",
    requiredDocs: ["사업자등록증", "재무제표", "부가세 과세표준증명", "대표자 신분증"],
    applicationUrl: "https://www.kodit.co.kr",
    contactInfo: "신보 콜센터 1588-6565",
    tags: ["일반보증", "운전자금", "시설자금"],
  },
  {
    id: "kodit-startup",
    institutionName: "신용보증기금",
    productName: "창업기업보증",
    category: "창업보증",
    description: "창업 초기 기업의 사업 안정화를 위한 보증 상품입니다. 업력 5년 이내 기업에 보증비율 우대가 적용됩니다.",
    interestRate: "보증료 연 0.5% ~ 1.0% (창업기업 우대) + 은행 대출금리",
    maxLimit: "최대 5억원 (업종·매출 규모에 따라 차등)",
    loanPeriod: "보증기간 1년 (연장 가능, 최대 5년)",
    targetBusiness: "업력 5년 이내 창업기업",
    requiredDocs: ["사업자등록증", "사업계획서", "대표자 신분증", "창업 관련 증빙"],
    applicationUrl: "https://www.kodit.co.kr",
    contactInfo: "신보 콜센터 1588-6565",
    tags: ["창업", "초기기업", "보증우대"],
  },
  {
    id: "kodit-ip",
    institutionName: "신용보증기금",
    productName: "지식재산(IP)보증",
    category: "기술보증",
    description: "우수 지식재산(특허, 상표 등)을 보유한 기업의 R&D, 사업화 자금을 지원합니다. 보증비율 90~100%, 보증료 할인 혜택이 있습니다.",
    interestRate: "보증료 연 0.2% ~ 0.5%p 차감 + 은행 대출금리",
    maxLimit: "IP 가치평가 기반 (최대 30억원)",
    loanPeriod: "보증기간 1년 (연장 가능)",
    targetBusiness: "우수 지식재산(IP) 보유 중소기업",
    requiredDocs: ["사업자등록증", "특허/상표 등록증", "IP 관련 증빙", "재무제표"],
    applicationUrl: "https://www.kodit.co.kr",
    contactInfo: "신보 콜센터 1588-6565",
    tags: ["IP", "특허", "기술사업화"],
  },
  {
    id: "kodit-smart",
    institutionName: "신용보증기금",
    productName: "SMART보증 (비대면)",
    category: "비대면보증",
    description: "온비즈(ON-Biz) 플랫폼을 통해 비대면으로 신청 가능한 보증 상품입니다. 간편한 절차로 빠르게 보증서를 발급받을 수 있습니다.",
    interestRate: "보증료 연 0.5% ~ 1.5% + 은행 대출금리",
    maxLimit: "최대 3억원",
    loanPeriod: "보증기간 1년",
    targetBusiness: "사업자등록 후 1년 이상 경과한 중소기업·소상공인",
    requiredDocs: ["사업자등록증 (온라인 자동 확인)", "대표자 본인인증"],
    applicationUrl: "https://onbiz.kodit.co.kr",
    contactInfo: "신보 콜센터 1588-6565",
    tags: ["비대면", "간편신청", "소상공인"],
  },
];

// ─── 기술보증기금 상품 ───

const KIBO_PRODUCTS: FundingProduct[] = [
  {
    id: "kibo-general",
    institutionName: "기술보증기금",
    productName: "일반기술보증",
    category: "기술보증",
    description: "기술력을 보유한 중소기업에 기술평가를 통해 보증서를 발급합니다. 기술성과 사업성을 종합 평가하여 보증 한도를 결정합니다.",
    interestRate: "보증료 연 0.5% ~ 1.5% (기술등급별 차등) + 은행 대출금리 3~5%",
    maxLimit: "기업당 최대 30억원 (우수기술 50억원)",
    loanPeriod: "보증기간 1년 (연장 가능)",
    targetBusiness: "기술력을 보유한 중소기업",
    requiredDocs: ["사업자등록증", "재무제표", "기술 관련 증빙 (특허, 인증 등)", "사업계획서"],
    applicationUrl: "https://www.kibo.or.kr",
    contactInfo: "기보 콜센터 1544-1120",
    tags: ["기술평가", "운전자금", "시설자금"],
  },
  {
    id: "kibo-venture",
    institutionName: "기술보증기금",
    productName: "벤처·이노비즈 보증",
    category: "벤처보증",
    description: "벤처기업 또는 이노비즈 인증 기업에 우대 보증을 제공합니다. 보증비율 95% 이상, 보증료 할인 혜택이 적용됩니다.",
    interestRate: "보증료 연 0.3% ~ 1.0% (우대 적용) + 은행 대출금리",
    maxLimit: "최대 50억원 (기술혁신형 100억원)",
    loanPeriod: "보증기간 1~2년 (연장 가능)",
    targetBusiness: "벤처기업 확인서 또는 이노비즈 인증 보유 기업",
    requiredDocs: ["사업자등록증", "벤처확인서/이노비즈 인증서", "재무제표", "기술 증빙"],
    applicationUrl: "https://www.kibo.or.kr",
    contactInfo: "기보 콜센터 1544-1120",
    tags: ["벤처", "이노비즈", "기술혁신"],
  },
  {
    id: "kibo-startup",
    institutionName: "기술보증기금",
    productName: "창업기업 기술보증",
    category: "창업보증",
    description: "기술 기반 창업기업에 보증을 제공합니다. 창업 초기 매출이 적더라도 기술력 평가를 통해 보증 한도를 산정합니다.",
    interestRate: "보증료 연 0.5% ~ 1.0% (창업 우대) + 은행 대출금리",
    maxLimit: "최대 10억원 (초기 1~3억원 수준)",
    loanPeriod: "보증기간 1년 (연장 가능)",
    targetBusiness: "업력 7년 이내 기술 기반 창업기업",
    requiredDocs: ["사업자등록증", "사업계획서", "기술 관련 증빙", "대표자 신분증"],
    applicationUrl: "https://www.kibo.or.kr",
    contactInfo: "기보 콜센터 1544-1120",
    tags: ["창업", "기술기반", "초기기업"],
  },
];

// ─── 소진공 (소상공인시장진흥공단) 상품 - 2026년 직접대출 기준 ───

const SEMAS_PRODUCTS: FundingProduct[] = [
  {
    id: "semas-innovation",
    institutionName: "소진공",
    productName: "혁신성장촉진자금",
    category: "성장자금",
    description: "(혁신형) 수출, 2년 연속 매출 10% 이상 신장, 스마트 공장 도입, 강한소상공인·로컬크리에이터, 소상공인 졸업후보기업, 직접대출 성실상환\n(일반형) 스마트기술, 백년가게, 사회연대경제조직, 신사업창업사관학교 수료생",
    interestRate: "정책자금 기준금리 연동",
    maxLimit: "(일반형) 운전 1억원, 시설 5억원 / (혁신형) 운전 2억원, 시설 10억원",
    loanPeriod: "(운전) 5년(비거치 또는 거치 2년 이내) / (시설) 8년(비거치 또는 거치 3년 이내)",
    targetBusiness: "혁신형 또는 일반형 요건을 충족하는 소상공인",
    requiredDocs: ["사업자등록증", "부가세 과세표준증명", "매출 증빙", "대표자 신분증"],
    applicationUrl: "https://www.semas.or.kr",
    contactInfo: "소진공 콜센터 1357",
    tags: ["혁신", "성장", "수출", "스마트공장"],
  },
  {
    id: "semas-private-invest",
    institutionName: "소진공",
    productName: "민간투자연계형 매칭융자",
    category: "투자연계자금",
    description: "민간투자 연계형 매칭융자 주관기관으로부터 투자금을 지원받고 '소상공인 선투자 추천서'를 발급받은 소상공인",
    interestRate: "정책자금 기준금리 연동",
    maxLimit: "5억원",
    loanPeriod: "8년(비거치 또는 거치 3년 이내)",
    targetBusiness: "민간투자 연계형 매칭융자 주관기관으로부터 투자금을 지원받고 소상공인 선투자 추천서를 발급받은 소상공인",
    requiredDocs: ["사업자등록증", "소상공인 선투자 추천서", "투자 증빙서류", "대표자 신분증"],
    applicationUrl: "https://www.semas.or.kr",
    contactInfo: "소진공 콜센터 1357",
    tags: ["민간투자", "매칭융자", "투자연계"],
  },
  {
    id: "semas-coexist",
    institutionName: "소진공",
    productName: "상생성장지원자금",
    category: "성장자금",
    description: "(일반형) TOPS 프로그램 1단계에 선정된 소상공인\n(성장형) TOPS 프로그램 2단계에 선정된 소상공인, 소진공과 상생협약을 맺은 온라인 플랫폼의 입점 소상공인\n(도약형) Post-Tops 프로그램에 선정된 소상공인",
    interestRate: "정책자금 기준금리 연동",
    maxLimit: "(일반형) 운전 7천만원 / (성장형) 운전 1억원, 시설 5억원 / (도약형) 운전 2억원, 시설 10억원",
    loanPeriod: "(운전) 5년(비거치 또는 거치 2년 이내) / (시설) 8년(비거치 또는 거치 3년 이내)",
    targetBusiness: "TOPS 프로그램 선정 소상공인 또는 소진공 상생협약 온라인 플랫폼 입점 소상공인",
    requiredDocs: ["사업자등록증", "TOPS 선정 확인서 또는 상생협약 확인서", "매출 증빙", "대표자 신분증"],
    applicationUrl: "https://www.semas.or.kr",
    contactInfo: "소진공 콜센터 1357",
    tags: ["TOPS", "상생", "성장", "온라인플랫폼"],
  },
  {
    id: "semas-temporary",
    institutionName: "소진공",
    productName: "일시적경영애로자금",
    category: "경영안정자금",
    description: "연매출 1억 4백만원 미만이고 업력 7년 미만이면서 일시적경영애로 사유가 있는 소상공인",
    interestRate: "정책자금 기준금리 연동",
    maxLimit: "7천만원",
    loanPeriod: "5년(거치 2년)",
    targetBusiness: "연매출 1억 4백만원 미만, 업력 7년 미만, 일시적 경영애로 사유 보유 소상공인",
    requiredDocs: ["사업자등록증", "부가세 과세표준증명", "경영애로 사유 증빙", "대표자 신분증"],
    applicationUrl: "https://www.semas.or.kr",
    contactInfo: "소진공 콜센터 1357",
    tags: ["경영애로", "일시적", "소상공인"],
  },
  {
    id: "semas-credit-weak",
    institutionName: "소진공",
    productName: "신용취약소상공인자금",
    category: "신용취약자금",
    description: "소상공인 지식배움터(http://edu.sbiz.or.kr) 내 신용관리 교육을 사전에 이수한 중·저신용(NCB 839점 이하) 소상공인",
    interestRate: "정책자금 기준금리 연동",
    maxLimit: "3천만원",
    loanPeriod: "5년(거치 2년)",
    targetBusiness: "NCB 839점 이하 소상공인 중 신용관리 교육 이수자",
    requiredDocs: ["사업자등록증", "신용관리 교육 이수 확인서", "신용정보조회 동의서", "대표자 신분증"],
    applicationUrl: "https://www.semas.or.kr",
    contactInfo: "소진공 콜센터 1357",
    tags: ["신용취약", "저신용", "중신용", "NCB839점이하"],
  },
  {
    id: "semas-restart",
    institutionName: "소진공",
    productName: "재도전특별자금",
    category: "재창업자금",
    description: "(일반형① 재창업 준비단계) 최근 1년 이내 소상공인희망리턴패키지사업의 재창업교육을 수료한 소상공인\n(일반형② 재창업 초기단계) 공단에서 요구하는 조건 중 1개 이상의 요건을 충족하는 소상공인\n(일반형③ 채무조정) '채무해소 재기지원종합패키지 참여기관'에서 인정한 성실상환 소상공인 등\n(희망형) '25년 소상공인희망리턴패키지사업의 재기사업화를 완료한 소상공인 등\n(도약형) 재창업(업력 2년 이상) 후 성장하는 성실상환 소상공인",
    interestRate: "정책자금 기준금리 연동",
    maxLimit: "(일반형) 7천만원 / (희망형) 1억원 / (도약형) 2억원",
    loanPeriod: "5년(거치 2년)",
    targetBusiness: "재창업 소상공인 (준비단계/초기단계/채무조정/희망형/도약형 요건 충족자)",
    requiredDocs: ["사업자등록증", "재창업 교육 수료증 또는 요건 충족 증빙", "대표자 신분증"],
    applicationUrl: "https://www.semas.or.kr",
    contactInfo: "소진공 콜센터 1357",
    tags: ["재창업", "재도전", "희망리턴", "채무조정"],
  },
];

// ─── 신용보증재단 상품 ───

const SINBO_FOUNDATION_PRODUCTS: FundingProduct[] = [
  {
    id: "sinbo-foundation-general",
    institutionName: "신용보증재단",
    productName: "일반보증 (소상공인 신용보증)",
    category: "신용보증",
    description: "소상공인 및 소기업에 신용보증서를 발급하여 금융기관 대출을 지원합니다. 지역 신용보증재단을 통해 신청합니다.",
    interestRate: "보증료 연 0.5% ~ 1.0% + 은행 대출금리 3~5%",
    maxLimit: "최대 2억원 (같은기업당 재단보증 2억원 미만)",
    loanPeriod: "보증기간 1년 (연장 가능)",
    targetBusiness: "매출 5억원 이하 소상공인·소기업",
    requiredDocs: ["사업자등록증", "부가세 과세표준증명", "대표자 신분증", "임대차계약서"],
    applicationUrl: "https://www.sinbo.or.kr",
    contactInfo: "지역 신용보증재단 (각 시·도별)",
    tags: ["소상공인", "소기업", "지역보증"],
  },
  {
    id: "sinbo-foundation-startup",
    institutionName: "신용보증재단",
    productName: "창업자금 보증",
    category: "창업보증",
    description: "창업 초기 소상공인에게 창업자금 및 임차자금을 보증 지원합니다.",
    interestRate: "보증료 연 0.5% ~ 0.8% (창업 우대) + 은행 대출금리",
    maxLimit: "창업자금 7천만원, 임차자금 5천만원",
    loanPeriod: "보증기간 1년 (연장 가능)",
    targetBusiness: "창업 초기 소상공인",
    requiredDocs: ["사업자등록증", "사업계획서", "대표자 신분증", "임대차계약서(임차자금 시)"],
    applicationUrl: "https://www.sinbo.or.kr",
    contactInfo: "지역 신용보증재단 (각 시·도별)",
    tags: ["창업", "임차자금", "소상공인"],
  },
];

// ─── 은행권 및 지역 특례자금 ───

const BANK_PRODUCTS: FundingProduct[] = [
  {
    id: "bank-sme-loan",
    institutionName: "은행권 및 지역 특례자금",
    productName: "중소기업 정책연계 대출",
    category: "은행대출",
    description: "시중은행에서 정부 정책과 연계하여 중소기업에 제공하는 대출 상품입니다. 은행별로 상품명과 조건이 다를 수 있습니다.",
    interestRate: "연 3.5% ~ 6.0% (은행별·신용등급별 차등)",
    maxLimit: "은행별 상이 (통상 1~10억원)",
    loanPeriod: "1~5년 (은행별 상이)",
    targetBusiness: "중소기업·소상공인",
    requiredDocs: ["사업자등록증", "재무제표", "대표자 신분증", "은행별 추가 서류"],
    applicationUrl: "https://www.fss.or.kr",
    contactInfo: "각 은행 기업금융 창구",
    tags: ["은행대출", "정책연계"],
  },
  {
    id: "bank-local-special",
    institutionName: "은행권 및 지역 특례자금",
    productName: "지역 특례보증 연계 대출",
    category: "지역특례",
    description: "지방자치단체와 신용보증재단이 협력하여 지역 소상공인·중소기업에 제공하는 특례 보증 연계 대출입니다. 이자 지원 혜택이 있습니다.",
    interestRate: "연 2.0% ~ 4.0% (지자체 이자보전 포함)",
    maxLimit: "지역별 상이 (통상 2천만원 ~ 7천만원)",
    loanPeriod: "1~3년 (지역별 상이)",
    targetBusiness: "해당 지역 소재 소상공인·중소기업",
    requiredDocs: ["사업자등록증", "사업장 소재지 증빙", "대표자 신분증"],
    applicationUrl: "https://www.sinbo.or.kr",
    contactInfo: "해당 지역 신용보증재단 또는 지자체",
    tags: ["지역특례", "이자보전", "지자체"],
  },
];

// ─── 전체 상품 목록 ───

export const ALL_FUNDING_PRODUCTS: FundingProduct[] = [
  ...KOSME_PRODUCTS,
  ...KODIT_PRODUCTS,
  ...KIBO_PRODUCTS,
  ...SEMAS_PRODUCTS,
  ...SINBO_FOUNDATION_PRODUCTS,
  ...BANK_PRODUCTS,
];

// ─── 기관명으로 상품 조회 ───

/**
 * 기관명에 해당하는 정책자금 상품 목록을 반환합니다.
 * 기관명이 "기술보증기금 또는 신용보증기금"처럼 복합인 경우 양쪽 모두 반환합니다.
 */
export function getProductsByInstitution(institutionName: string): FundingProduct[] {
  const name = institutionName.trim();
  
  // 복합 기관명 처리
  if (name.includes("또는") || name.includes("/")) {
    const parts = name.split(/또는|\//).map(p => p.trim());
    const results: FundingProduct[] = [];
    for (const part of parts) {
      results.push(...ALL_FUNDING_PRODUCTS.filter(p => p.institutionName.includes(part)));
    }
    return results;
  }
  
  return ALL_FUNDING_PRODUCTS.filter(p => p.institutionName.includes(name));
}

/**
 * 신용취약자금 해당 여부에 따라 추가 상품을 반환합니다.
 */
export function getVulnerableCreditProducts(): FundingProduct[] {
  return ALL_FUNDING_PRODUCTS.filter(p => p.tags.includes("신용취약"));
}

/**
 * 추천 기관 목록에 대해 관련 상품을 매핑하여 반환합니다.
 */
export function mapProductsToRecommendations(
  recommendations: Array<{ rank: number; name: string; eligible: boolean }>,
  isVulnerableCredit: boolean,
): Array<{
  rank: number;
  institutionName: string;
  products: FundingProduct[];
}> {
  const result = recommendations.map(rec => ({
    rank: rec.rank,
    institutionName: rec.name,
    products: rec.eligible ? getProductsByInstitution(rec.name) : [],
  }));

  // 신용취약자금 추가
  if (isVulnerableCredit) {
    const vulnerableProducts = getVulnerableCreditProducts();
    const existingRanks = result.map(r => r.rank);
    // 기존 소진공 추천에 신용취약자금 상품 추가
    const sojingongEntry = result.find(r => r.institutionName.includes("소진공"));
    if (sojingongEntry) {
      for (const vp of vulnerableProducts) {
        if (!sojingongEntry.products.find(p => p.id === vp.id)) {
          sojingongEntry.products.push(vp);
        }
      }
    }
  }

  return result;
}
