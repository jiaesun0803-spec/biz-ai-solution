import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useData } from "@/lib/data-context";
import { trpc } from "@/lib/trpc";
import { PdfReviewModal, type ParsedCompanyData } from "@/components/pdf-review-modal";

const INDUSTRIES = [
  "제조업", "IT/소프트웨어", "유통/물류", "서비스업", "건설/부동산",
  "금융/보험", "의료/헬스케어", "교육", "식품/외식", "기타",
];

const BUSINESS_TYPES = ["법인사업자", "개인사업자"];
const OFFICE_OWNERSHIP = ["자가", "임대"];
const HOME_OWNERSHIP = ["자가", "임대", "전세", "월세"];
const EDUCATION_LEVELS = ["고졸", "전문대졸", "대졸", "대학원졸", "기타"];
const TELECOM_LIST = ["SKT", "KT", "LG U+", "알뜰폰", "기타"];
const YES_NO = ["예", "아니오"];

type SectionKey =
  | "basic"
  | "representative"
  | "credit"
  | "sales"
  | "debt"
  | "certs"
  | "patent"
  | "business"
  | "funding"
  | "memo";

export default function AddCompanyScreen() {
  const colors = useColors();
  const router = useRouter();
  const { addCompany } = useData();
  const parsePdfMutation = trpc.parsePdfCompany.useMutation();

  // 섹션 펼침 상태
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    basic: true,
    representative: false,
    credit: false,
    sales: false,
    debt: false,
    certs: false,
    patent: false,
    business: false,
    funding: false,
    memo: false,
  });

  // 1. 기업 현황
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);
  const [businessType, setBusinessType] = useState("");
  const [showBusinessTypePicker, setShowBusinessTypePicker] = useState(false);
  const [businessNumber, setBusinessNumber] = useState("");
  const [corporateNumber, setCorporateNumber] = useState("");
  const [establishedDate, setEstablishedDate] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [officeOwnership, setOfficeOwnership] = useState("");
  const [showOfficeOwnershipPicker, setShowOfficeOwnershipPicker] = useState(false);
  const [businessAddress, setBusinessAddress] = useState("");
  const [deposit, setDeposit] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");

  // 2. 대표자 정보
  const [representativeName, setRepresentativeName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [telecom, setTelecom] = useState("");
  const [showTelecomPicker, setShowTelecomPicker] = useState(false);
  const [homeAddress, setHomeAddress] = useState("");
  const [homeOwnership, setHomeOwnership] = useState("");
  const [showHomeOwnershipPicker, setShowHomeOwnershipPicker] = useState(false);
  const [education, setEducation] = useState("");
  const [showEducationPicker, setShowEducationPicker] = useState(false);
  const [major, setMajor] = useState("");
  const [career1, setCareer1] = useState("");
  const [career2, setCareer2] = useState("");

  // 3. 신용정보
  const [hasFinancialDelinquency, setHasFinancialDelinquency] = useState("");
  const [showFinDelPicker, setShowFinDelPicker] = useState(false);
  const [hasTaxDelinquency, setHasTaxDelinquency] = useState("");
  const [showTaxDelPicker, setShowTaxDelPicker] = useState(false);
  const [kcbScore, setKcbScore] = useState("");
  const [niceScore, setNiceScore] = useState("");

  // 4. 매출현황
  const [hasExportSales, setHasExportSales] = useState("");
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [currentYearSales, setCurrentYearSales] = useState("");
  const [year25Sales, setYear25Sales] = useState("");
  const [year24Sales, setYear24Sales] = useState("");
  const [year23Sales, setYear23Sales] = useState("");
  const [currentYearExport, setCurrentYearExport] = useState("");
  const [year25Export, setYear25Export] = useState("");
  const [year24Export, setYear24Export] = useState("");
  const [year23Export, setYear23Export] = useState("");

  // 5. 부채현황
  const [jungJinGong, setJungJinGong] = useState("");
  const [soJinGong, setSoJinGong] = useState("");
  const [sinbo, setSinbo] = useState("");
  const [gibo, setGibo] = useState("");
  const [jaedan, setJaedan] = useState("");
  const [companyCollateral, setCompanyCollateral] = useState("");
  const [ceoCredit, setCeoCredit] = useState("");
  const [ceoCollateral, setCeoCollateral] = useState("");

  // 6. 보유 인증
  const [hasSMECert, setHasSMECert] = useState(false);
  const [hasStartupCert, setHasStartupCert] = useState(false);
  const [hasWomenBizCert, setHasWomenBizCert] = useState(false);
  const [hasInnobiz, setHasInnobiz] = useState(false);
  const [hasVentureCert, setHasVentureCert] = useState(false);
  const [hasRootBizCert, setHasRootBizCert] = useState(false);
  const [hasISO, setHasISO] = useState(false);
  const [hasHACCP, setHasHACCP] = useState(false);

  // 7. 특허 및 정부지원
  const [hasPatent, setHasPatent] = useState("");
  const [showPatentPicker, setShowPatentPicker] = useState(false);
  const [patentCount, setPatentCount] = useState("");
  const [patentDetails, setPatentDetails] = useState("");
  const [hasGovSupport, setHasGovSupport] = useState("");
  const [showGovSupportPicker, setShowGovSupportPicker] = useState(false);
  const [govSupportCount, setGovSupportCount] = useState("");
  const [govSupportDetails, setGovSupportDetails] = useState("");

  // 8. 비즈니스 상세
  const [coreItem, setCoreItem] = useState("");
  const [salesRoute, setSalesRoute] = useState("");
  const [competitiveness, setCompetitiveness] = useState("");
  const [marketStatus, setMarketStatus] = useState("");
  const [processDetail, setProcessDetail] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [revenueModel, setRevenueModel] = useState("");
  const [futurePlan, setFuturePlan] = useState("");

  // 9. 자금 계획
  const [requiredFunding, setRequiredFunding] = useState("");
  const [fundingTypeOperating, setFundingTypeOperating] = useState(false);
  const [fundingTypeFacility, setFundingTypeFacility] = useState(false);
  const [fundingPlanDetail, setFundingPlanDetail] = useState("");

  // 10. 컨설턴트 메모
  const [memo, setMemo] = useState("");

  // PDF 업로드
  const [pdfName, setPdfName] = useState("");
  const [isPdfParsing, setIsPdfParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // PDF 검토 모달
  const [showPdfReview, setShowPdfReview] = useState(false);
  const [parsedPdfData, setParsedPdfData] = useState<ParsedCompanyData>({});

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      setPdfName(asset.name);
      setIsPdfParsing(true);

      // 파일을 base64로 읽어서 서버에 전송
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const parsed = await parsePdfMutation.mutateAsync({
        fileName: asset.name,
        base64,
      });

      // 파싱 완료 후 검토 모달 표시
      if (parsed) {
        setParsedPdfData(parsed as ParsedCompanyData);
        setShowPdfReview(true);
      }
    } catch (e: any) {
      Alert.alert("오류", "PDF 파싱에 실패했습니다: " + (e?.message || "알 수 없는 오류"));
    } finally {
      setIsPdfParsing(false);
    }
  };

  // PDF 검토 모달에서 확인 시 폼에 일괄 적용
  const handlePdfConfirm = (data: ParsedCompanyData) => {
    if (data.name) setName(data.name);
    if (data.industry) setIndustry(data.industry);
    if (data.businessType) setBusinessType(data.businessType);
    if (data.businessNumber) setBusinessNumber(data.businessNumber);
    if (data.corporateNumber) setCorporateNumber(data.corporateNumber);
    if (data.establishedDate) setEstablishedDate(data.establishedDate);
    if (data.businessPhone) setBusinessPhone(data.businessPhone);
    if (data.employeeCount) setEmployeeCount(data.employeeCount);
    if (data.officeOwnership) setOfficeOwnership(data.officeOwnership);
    if (data.businessAddress) setBusinessAddress(data.businessAddress);
    if (data.deposit) setDeposit(data.deposit);
    if (data.monthlyRent) setMonthlyRent(data.monthlyRent);
    if (data.representativeName) setRepresentativeName(data.representativeName);
    if (data.birthDate) setBirthDate(data.birthDate);
    if (data.contactNumber) setContactNumber(data.contactNumber);
    if (data.telecom) setTelecom(data.telecom);
    if (data.homeAddress) setHomeAddress(data.homeAddress);
    if (data.homeOwnership) setHomeOwnership(data.homeOwnership);
    if (data.education) setEducation(data.education);
    if (data.major) setMajor(data.major);
    if (data.career1) setCareer1(data.career1);
    if (data.career2) setCareer2(data.career2);
    if (data.hasFinancialDelinquency) setHasFinancialDelinquency(data.hasFinancialDelinquency);
    if (data.hasTaxDelinquency) setHasTaxDelinquency(data.hasTaxDelinquency);
    if (data.kcbScore) setKcbScore(data.kcbScore);
    if (data.niceScore) setNiceScore(data.niceScore);
    if (data.currentYearSales) setCurrentYearSales(data.currentYearSales);
    if (data.year25Sales) setYear25Sales(data.year25Sales);
    if (data.year24Sales) setYear24Sales(data.year24Sales);
    if (data.year23Sales) setYear23Sales(data.year23Sales);
    if (data.hasExportSales) setHasExportSales(data.hasExportSales);
    if (data.currentYearExport) setCurrentYearExport(data.currentYearExport);
    if (data.year25Export) setYear25Export(data.year25Export);
    if (data.year24Export) setYear24Export(data.year24Export);
    if (data.year23Export) setYear23Export(data.year23Export);
    if (data.jungJinGong) setJungJinGong(data.jungJinGong);
    if (data.soJinGong) setSoJinGong(data.soJinGong);
    if (data.sinbo) setSinbo(data.sinbo);
    if (data.gibo) setGibo(data.gibo);
    if (data.jaedan) setJaedan(data.jaedan);
    if (data.companyCollateral) setCompanyCollateral(data.companyCollateral);
    if (data.ceoCredit) setCeoCredit(data.ceoCredit);
    if (data.ceoCollateral) setCeoCollateral(data.ceoCollateral);
    if (data.hasPatent) setHasPatent(data.hasPatent);
    if (data.patentCount) setPatentCount(data.patentCount);
    if (data.patentDetails) setPatentDetails(data.patentDetails);
    if (data.hasGovSupport) setHasGovSupport(data.hasGovSupport);
    if (data.govSupportCount) setGovSupportCount(data.govSupportCount);
    if (data.govSupportDetails) setGovSupportDetails(data.govSupportDetails);
    if (data.coreItem) setCoreItem(data.coreItem);
    if (data.salesRoute) setSalesRoute(data.salesRoute);
    if (data.competitiveness) setCompetitiveness(data.competitiveness);
    if (data.marketStatus) setMarketStatus(data.marketStatus);
    if (data.targetCustomer) setTargetCustomer(data.targetCustomer);
    if (data.revenueModel) setRevenueModel(data.revenueModel);
    if (data.futurePlan) setFuturePlan(data.futurePlan);
    if (data.requiredFunding) setRequiredFunding(data.requiredFunding);
    if (data.fundingPlanDetail) setFundingPlanDetail(data.fundingPlanDetail);
    if (data.memo) setMemo(data.memo);
    if (data.hasSMECert !== undefined) setHasSMECert(data.hasSMECert);
    if (data.hasStartupCert !== undefined) setHasStartupCert(data.hasStartupCert);
    if (data.hasWomenBizCert !== undefined) setHasWomenBizCert(data.hasWomenBizCert);
    if (data.hasInnobiz !== undefined) setHasInnobiz(data.hasInnobiz);
    if (data.hasVentureCert !== undefined) setHasVentureCert(data.hasVentureCert);
    if (data.hasRootBizCert !== undefined) setHasRootBizCert(data.hasRootBizCert);
    if (data.hasISO !== undefined) setHasISO(data.hasISO);
    if (data.hasHACCP !== undefined) setHasHACCP(data.hasHACCP);
    // 모든 섹션 열기
    setOpenSections({
      basic: true, representative: true, credit: true, sales: true,
      debt: true, certs: true, patent: true, business: true, funding: true, memo: true,
    });
    setShowPdfReview(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("입력 오류", "업체명을 입력해주세요.");
      return;
    }
    if (!industry) {
      Alert.alert("입력 오류", "업종을 선택해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      await addCompany({
        name: name.trim(),
        industry,
        businessType,
        businessNumber,
        corporateNumber,
        establishedDate,
        businessPhone,
        employeeCount,
        officeOwnership,
        businessAddress,
        deposit,
        monthlyRent,
        representativeName,
        birthDate,
        contactNumber,
        telecom,
        homeAddress,
        homeOwnership,
        education,
        major,
        career1,
        career2,
        hasFinancialDelinquency,
        hasTaxDelinquency,
        kcbScore,
        niceScore,
        hasExportSales,
        currentYearSales,
        year25Sales,
        year24Sales,
        year23Sales,
        currentYearExport,
        year25Export,
        year24Export,
        year23Export,
        jungJinGong,
        soJinGong,
        sinbo,
        gibo,
        jaedan,
        companyCollateral,
        ceoCredit,
        ceoCollateral,
        hasSMECert,
        hasStartupCert,
        hasWomenBizCert,
        hasInnobiz,
        hasVentureCert,
        hasRootBizCert,
        hasISO,
        hasHACCP,
        hasPatent,
        patentCount,
        patentDetails,
        hasGovSupport,
        govSupportCount,
        govSupportDetails,
        coreItem,
        salesRoute,
        competitiveness,
        marketStatus,
        processDetail,
        targetCustomer,
        revenueModel,
        futurePlan,
        requiredFunding,
        fundingTypeOperating: fundingTypeOperating ? "yes" : "no",
        fundingTypeFacility: fundingTypeFacility ? "yes" : "no",
        fundingPlanDetail,
        memo,
      });
      router.back();
    } catch (e) {
      Alert.alert("오류", "업체 등록에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 섹션 헤더 렌더링
  const renderSectionHeader = (key: SectionKey, title: string, icon: string) => (
    <Pressable
      style={({ pressed }) => [
        styles.sectionHeader,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.75 },
      ]}
      onPress={() => toggleSection(key)}
    >
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.primary + "18" }]}>
          <IconSymbol name={icon as any} size={16} color={colors.primary} />
        </View>
        <Text style={[styles.sectionHeaderText, { color: colors.foreground }]}>{title}</Text>
      </View>
      <IconSymbol
        name={openSections[key] ? "chevron.up" : "chevron.down"}
        size={16}
        color={colors.muted}
      />
    </Pressable>
  );

  // 입력 행 렌더링 (텍스트)
  const renderInputRow = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { placeholder?: string; keyboardType?: any; multiline?: boolean; last?: boolean }
  ) => (
    <View>
      <View style={styles.inputRow}>
        <Text style={[styles.inputLabel, { color: colors.foreground }]}>{label}</Text>
        <TextInput
          style={[styles.inputField, { color: colors.foreground }, opts?.multiline && styles.multilineField]}
          placeholder={opts?.placeholder || `${label} 입력`}
          placeholderTextColor={colors.muted}
          value={value}
          onChangeText={onChange}
          keyboardType={opts?.keyboardType || "default"}
          returnKeyType="next"
          multiline={opts?.multiline}
          numberOfLines={opts?.multiline ? 3 : 1}
          textAlignVertical={opts?.multiline ? "top" : "center"}
        />
      </View>
      {!opts?.last && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
    </View>
  );

  // 피커 행 렌더링
  const renderPickerRow = (
    label: string,
    value: string,
    options: string[],
    showPicker: boolean,
    setShowPicker: (v: boolean) => void,
    onSelect: (v: string) => void,
    opts?: { last?: boolean }
  ) => (
    <View>
      <Pressable
        style={({ pressed }) => [styles.inputRow, pressed && { opacity: 0.7 }]}
        onPress={() => setShowPicker(!showPicker)}
      >
        <Text style={[styles.inputLabel, { color: colors.foreground }]}>{label}</Text>
        <View style={styles.pickerValue}>
          <Text style={[styles.inputField, { color: value ? colors.foreground : colors.muted }]}>
            {value || `${label} 선택`}
          </Text>
          <IconSymbol name={showPicker ? "chevron.up" : "chevron.down"} size={14} color={colors.muted} />
        </View>
      </Pressable>
      {showPicker && (
        <View style={[styles.pickerDropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {options.map((opt, i) => (
            <Pressable
              key={opt}
              style={({ pressed }) => [
                styles.pickerItem,
                { borderBottomColor: colors.border },
                i === options.length - 1 && { borderBottomWidth: 0 },
                pressed && { backgroundColor: colors.surface },
              ]}
              onPress={() => {
                onSelect(opt);
                setShowPicker(false);
              }}
            >
              <Text style={[styles.pickerItemText, { color: colors.foreground }]}>{opt}</Text>
              {value === opt && <IconSymbol name="checkmark" size={14} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      )}
      {!opts?.last && !showPicker && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
    </View>
  );

  // 체크박스 렌더링
  const renderCheckbox = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <Pressable
      style={({ pressed }) => [styles.checkboxRow, pressed && { opacity: 0.7 }]}
      onPress={() => onChange(!value)}
    >
      <View style={[
        styles.checkbox,
        { borderColor: value ? colors.primary : colors.border },
        value && { backgroundColor: colors.primary },
      ]}>
        {value && <IconSymbol name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={[styles.checkboxLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={22} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>뒤로</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>업체 등록</Text>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 },
              (isSaving || isPdfParsing) && { opacity: 0.5 },
            ]}
            onPress={handleSave}
            disabled={isSaving || isPdfParsing}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.saveBtnText, { color: "#fff" }]}>저장</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* PDF 업로드 (모바일 전용) */}
          {Platform.OS !== "web" && (
            <View style={styles.pdfSection}>
              <Text style={[styles.pdfTitle, { color: colors.foreground }]}>
                📄 PDF로 자동 입력
              </Text>
              <Text style={[styles.pdfDesc, { color: colors.muted }]}>
                사업자등록증, 기업현황표 등 PDF를 업로드하면 AI가 자동으로 정보를 추출합니다.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.pdfButton,
                  { borderColor: colors.primary, backgroundColor: colors.primary + "10" },
                  pressed && { opacity: 0.75 },
                  isPdfParsing && { opacity: 0.5 },
                ]}
                onPress={handlePickPdf}
                disabled={isPdfParsing}
              >
                {isPdfParsing ? (
                  <View style={styles.pdfButtonInner}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.pdfButtonText, { color: colors.primary }]}>
                      AI 분석 중...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.pdfButtonInner}>
                    <IconSymbol name="doc.fill" size={18} color={colors.primary} />
                    <Text style={[styles.pdfButtonText, { color: colors.primary }]}>
                      {pdfName ? `✓ ${pdfName}` : "PDF 파일 선택"}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          )}

          {/* 1. 기업 현황 */}
          {renderSectionHeader("basic", "1. 기업 현황", "building.2.fill")}
          {openSections.basic && (
            <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderInputRow("업체명 *", name, setName, { placeholder: "업체명을 입력하세요" })}
              {renderPickerRow("업종 *", industry, INDUSTRIES, showIndustryPicker, setShowIndustryPicker, setIndustry)}
              {renderPickerRow("사업자 구분", businessType, BUSINESS_TYPES, showBusinessTypePicker, setShowBusinessTypePicker, setBusinessType)}
              {renderInputRow("사업자번호", businessNumber, setBusinessNumber, { placeholder: "000-00-00000", keyboardType: "numeric" })}
              {renderInputRow("법인등록번호", corporateNumber, setCorporateNumber, { placeholder: "000000-0000000" })}
              {renderInputRow("사업개시일", establishedDate, setEstablishedDate, { placeholder: "예: 2010-01-01" })}
              {renderInputRow("사업장 전화", businessPhone, setBusinessPhone, { placeholder: "02-0000-0000", keyboardType: "phone-pad" })}
              {renderInputRow("상시근로자 수", employeeCount, setEmployeeCount, { placeholder: "예: 10", keyboardType: "numeric" })}
              {renderPickerRow("사업장 임대여부", officeOwnership, OFFICE_OWNERSHIP, showOfficeOwnershipPicker, setShowOfficeOwnershipPicker, setOfficeOwnership)}
              {renderInputRow("사업장 주소", businessAddress, setBusinessAddress, { placeholder: "사업장 주소 입력" })}
              {officeOwnership === "임대" && renderInputRow("보증금", deposit, setDeposit, { placeholder: "예: 5000만원", keyboardType: "numeric" })}
              {officeOwnership === "임대" && renderInputRow("월임대료", monthlyRent, setMonthlyRent, { placeholder: "예: 100만원", keyboardType: "numeric", last: true })}
              {officeOwnership !== "임대" && <View style={{ height: 4 }} />}
            </View>
          )}

          {/* 2. 대표자 정보 */}
          {renderSectionHeader("representative", "2. 대표자 정보", "person.fill")}
          {openSections.representative && (
            <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderInputRow("대표자명", representativeName, setRepresentativeName, { placeholder: "대표자 성명" })}
              {renderInputRow("생년월일", birthDate, setBirthDate, { placeholder: "예: 1975-03-15" })}
              {renderInputRow("연락처", contactNumber, setContactNumber, { placeholder: "010-0000-0000", keyboardType: "phone-pad" })}
              {renderPickerRow("통신사", telecom, TELECOM_LIST, showTelecomPicker, setShowTelecomPicker, setTelecom)}
              {renderInputRow("자택 주소", homeAddress, setHomeAddress, { placeholder: "자택 주소 입력" })}
              {renderPickerRow("거주지 상태", homeOwnership, HOME_OWNERSHIP, showHomeOwnershipPicker, setShowHomeOwnershipPicker, setHomeOwnership)}
              {renderPickerRow("최종학력", education, EDUCATION_LEVELS, showEducationPicker, setShowEducationPicker, setEducation)}
              {renderInputRow("전공", major, setMajor, { placeholder: "전공 분야" })}
              {renderInputRow("경력사항 1", career1, setCareer1, { placeholder: "주요 경력 1", multiline: true })}
              {renderInputRow("경력사항 2", career2, setCareer2, { placeholder: "주요 경력 2", multiline: true, last: true })}
            </View>
          )}

          {/* 3. 신용정보 */}
          {renderSectionHeader("credit", "3. 신용정보", "creditcard.fill")}
          {openSections.credit && (
            <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderPickerRow("금융연체여부", hasFinancialDelinquency, YES_NO, showFinDelPicker, setShowFinDelPicker, setHasFinancialDelinquency)}
              {renderPickerRow("세금체납여부", hasTaxDelinquency, YES_NO, showTaxDelPicker, setShowTaxDelPicker, setHasTaxDelinquency)}
              {renderInputRow("KCB 신용점수", kcbScore, setKcbScore, { placeholder: "예: 750", keyboardType: "numeric" })}
              {renderInputRow("NICE 신용점수", niceScore, setNiceScore, { placeholder: "예: 780", keyboardType: "numeric", last: true })}
            </View>
          )}

          {/* 4. 매출현황 */}
          {renderSectionHeader("sales", "4. 매출현황", "chart.bar.fill")}
          {openSections.sales && (
            <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderPickerRow("수출매출여부", hasExportSales, YES_NO, showExportPicker, setShowExportPicker, setHasExportSales)}
              {renderInputRow("금년 매출", currentYearSales, setCurrentYearSales, { placeholder: "예: 5억원", keyboardType: "numeric" })}
              {renderInputRow("2025년 매출", year25Sales, setYear25Sales, { placeholder: "예: 4억원", keyboardType: "numeric" })}
              {renderInputRow("2024년 매출", year24Sales, setYear24Sales, { placeholder: "예: 3억원", keyboardType: "numeric" })}
              {renderInputRow("2023년 매출", year23Sales, setYear23Sales, { placeholder: "예: 2억원", keyboardType: "numeric" })}
              {renderInputRow("금년 수출액", currentYearExport, setCurrentYearExport, { placeholder: "예: 1억원", keyboardType: "numeric" })}
              {renderInputRow("2025년 수출액", year25Export, setYear25Export, { placeholder: "예: 8천만원", keyboardType: "numeric" })}
              {renderInputRow("2024년 수출액", year24Export, setYear24Export, { placeholder: "예: 6천만원", keyboardType: "numeric" })}
              {renderInputRow("2023년 수출액", year23Export, setYear23Export, { placeholder: "예: 4천만원", keyboardType: "numeric", last: true })}
            </View>
          )}

          {/* 5. 부채현황 */}
          {renderSectionHeader("debt", "5. 부채현황", "banknote.fill")}
          {openSections.debt && (
            <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.debtNote, { color: colors.muted }]}>단위: 만원</Text>
              {renderInputRow("중진공", jungJinGong, setJungJinGong, { placeholder: "0", keyboardType: "numeric" })}
              {renderInputRow("소진공", soJinGong, setSoJinGong, { placeholder: "0", keyboardType: "numeric" })}
              {renderInputRow("신보", sinbo, setSinbo, { placeholder: "0", keyboardType: "numeric" })}
              {renderInputRow("기보", gibo, setGibo, { placeholder: "0", keyboardType: "numeric" })}
              {renderInputRow("재단", jaedan, setJaedan, { placeholder: "0", keyboardType: "numeric" })}
              {renderInputRow("회사담보", companyCollateral, setCompanyCollateral, { placeholder: "0", keyboardType: "numeric" })}
              {renderInputRow("대표신용", ceoCredit, setCeoCredit, { placeholder: "0", keyboardType: "numeric" })}
              {renderInputRow("대표담보", ceoCollateral, setCeoCollateral, { placeholder: "0", keyboardType: "numeric", last: true })}
            </View>
          )}

          {/* 6. 보유 인증 */}
          {renderSectionHeader("certs", "6. 보유 인증", "checkmark.seal.fill")}
          {openSections.certs && (
            <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.checkboxGrid}>
                {renderCheckbox("중소기업확인서(소상공인)", hasSMECert, setHasSMECert)}
                {renderCheckbox("창업확인서", hasStartupCert, setHasStartupCert)}
                {renderCheckbox("여성기업확인서", hasWomenBizCert, setHasWomenBizCert)}
                {renderCheckbox("이노비즈", hasInnobiz, setHasInnobiz)}
                {renderCheckbox("벤처인증", hasVentureCert, setHasVentureCert)}
                {renderCheckbox("뿌리기업확인서", hasRootBizCert, setHasRootBizCert)}
                {renderCheckbox("ISO인증", hasISO, setHasISO)}
                {renderCheckbox("HACCP인증", hasHACCP, setHasHACCP)}
              </View>
            </View>
          )}

          {/* 7. 특허 및 정부지원 */}
          {renderSectionHeader("patent", "7. 특허 및 정부지원", "star.fill")}
          {openSections.patent && (
            <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderPickerRow("특허 보유여부", hasPatent, YES_NO, showPatentPicker, setShowPatentPicker, setHasPatent)}
              {hasPatent === "예" && renderInputRow("특허 보유건수", patentCount, setPatentCount, { placeholder: "예: 3", keyboardType: "numeric" })}
              {hasPatent === "예" && renderInputRow("특허 상세내용", patentDetails, setPatentDetails, { placeholder: "특허 내용 입력", multiline: true })}
              {renderPickerRow("정부지원 수혜이력", hasGovSupport, YES_NO, showGovSupportPicker, setShowGovSupportPicker, setHasGovSupport)}
              {hasGovSupport === "예" && renderInputRow("수혜건수", govSupportCount, setGovSupportCount, { placeholder: "예: 2", keyboardType: "numeric" })}
              {hasGovSupport === "예" && renderInputRow("수혜 상세내용", govSupportDetails, setGovSupportDetails, { placeholder: "정부지원 수혜 내용 입력", multiline: true, last: true })}
              {hasGovSupport !== "예" && hasPatent !== "예" && <View style={{ height: 4 }} />}
            </View>
          )}

          {/* 8. 비즈니스 상세 */}
          {renderSectionHeader("business", "8. 비즈니스 상세", "lightbulb.fill")}
          {openSections.business && (
            <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderInputRow("핵심 아이템", coreItem, setCoreItem, { placeholder: "주요 제품/서비스", multiline: true })}
              {renderInputRow("판매 루트(유통망)", salesRoute, setSalesRoute, { placeholder: "판매 경로 입력", multiline: true })}
              {renderInputRow("경쟁력 및 차별성", competitiveness, setCompetitiveness, { placeholder: "경쟁력 설명", multiline: true })}
              {renderInputRow("시장 현황", marketStatus, setMarketStatus, { placeholder: "시장 현황 설명", multiline: true })}
              {renderInputRow("공정도", processDetail, setProcessDetail, { placeholder: "제조/서비스 공정 설명", multiline: true })}
              {renderInputRow("타겟 고객", targetCustomer, setTargetCustomer, { placeholder: "주요 고객층", multiline: true })}
              {renderInputRow("수익 모델", revenueModel, setRevenueModel, { placeholder: "수익 창출 방법", multiline: true })}
              {renderInputRow("앞으로의 계획", futurePlan, setFuturePlan, { placeholder: "향후 사업 계획", multiline: true, last: true })}
            </View>
          )}

          {/* 9. 자금 계획 */}
          {renderSectionHeader("funding", "9. 자금 계획", "dollarsign.circle.fill")}
          {openSections.funding && (
            <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderInputRow("이번 조달 필요 자금", requiredFunding, setRequiredFunding, { placeholder: "예: 3억원", keyboardType: "numeric" })}
              <View style={[styles.inputRow, { flexDirection: "column", alignItems: "flex-start", paddingVertical: 12 }]}>
                <Text style={[styles.inputLabel, { color: colors.foreground, marginBottom: 8 }]}>자금 종류</Text>
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <Pressable
                    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                    onPress={() => setFundingTypeOperating(!fundingTypeOperating)}
                  >
                    <View style={{
                      width: 22, height: 22, borderRadius: 4, borderWidth: 2,
                      borderColor: fundingTypeOperating ? "#1A3C6E" : colors.border,
                      backgroundColor: fundingTypeOperating ? "#1A3C6E" : "transparent",
                      alignItems: "center", justifyContent: "center"
                    }}>
                      {fundingTypeOperating && <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>✓</Text>}
                    </View>
                    <Text style={{ color: colors.foreground, fontSize: 14 }}>운전자금</Text>
                  </Pressable>
                  <Pressable
                    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                    onPress={() => setFundingTypeFacility(!fundingTypeFacility)}
                  >
                    <View style={{
                      width: 22, height: 22, borderRadius: 4, borderWidth: 2,
                      borderColor: fundingTypeFacility ? "#1A3C6E" : colors.border,
                      backgroundColor: fundingTypeFacility ? "#1A3C6E" : "transparent",
                      alignItems: "center", justifyContent: "center"
                    }}>
                      {fundingTypeFacility && <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>✓</Text>}
                    </View>
                    <Text style={{ color: colors.foreground, fontSize: 14 }}>시설자금</Text>
                  </Pressable>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {renderInputRow("자금 상세 사용 계획", fundingPlanDetail, setFundingPlanDetail, { placeholder: "운전자금/시설자금 상세 사용 계획 입력", multiline: true, last: true })}
            </View>
          )}

          {/* 10. 컨설턴트 메모 */}
          {renderSectionHeader("memo", "10. 컨설턴트 메모", "note.text")}
          {openSections.memo && (
            <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderInputRow("메모", memo, setMemo, { placeholder: "컨설턴트 메모 입력", multiline: true, last: true })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* PDF 검토 모달 */}
      <PdfReviewModal
        visible={showPdfReview}
        pdfName={pdfName}
        parsedData={parsedPdfData}
        onConfirm={handlePdfConfirm}
        onCancel={() => setShowPdfReview(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, minWidth: 60, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "600" },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 60 },

  // PDF 섹션
  pdfSection: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1A3C6E30",
    backgroundColor: "#1A3C6E08",
  },
  pdfTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  pdfDesc: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  pdfButton: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderStyle: "dashed",
  },
  pdfButtonInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  pdfButtonText: { fontSize: 14, fontWeight: "600" },

  // 섹션 헤더
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 2,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionHeaderText: { fontSize: 15, fontWeight: "600" },
  sectionBody: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
  },

  // 입력 행
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    minHeight: 50,
  },
  inputLabel: { fontSize: 14, fontWeight: "500", width: 90, flexShrink: 0 },
  inputField: { flex: 1, fontSize: 14 },
  multilineField: { minHeight: 60, paddingTop: 4 },
  divider: { height: 0.5, marginLeft: 14 },

  // 피커
  pickerValue: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerDropdown: { borderRadius: 10, borderWidth: 1, marginHorizontal: 14, marginBottom: 8, overflow: "hidden" },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  pickerItemText: { fontSize: 14 },

  // 체크박스
  checkboxGrid: { paddingHorizontal: 14, paddingVertical: 10 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: { fontSize: 14 },

  // 부채현황 노트
  debtNote: { fontSize: 12, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2 },
});
