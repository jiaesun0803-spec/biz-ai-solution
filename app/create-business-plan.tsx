import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import {
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
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ProgressSteps } from "@/components/progress-steps";
import { SuccessAnimation } from "@/components/success-animation";
import { RetryToast } from "@/components/retry-toast";
import { useColors } from "@/hooks/use-colors";
import { useData } from "@/lib/data-context";
import { trpc } from "@/lib/trpc";

const PLAN_PERIODS = ["1년", "3년", "5년"] as const;

const STRATEGIC_DIRECTIONS = [
  "시장 점유율 확대",
  "신규 시장 진출",
  "제품/서비스 다각화",
  "비용 절감 및 효율화",
  "디지털 전환",
  "글로벌 진출",
  "브랜드 강화",
  "기술 혁신",
] as const;

export default function CreateBusinessPlanScreen() {
  const { companyId: preselectedCompanyId } = useLocalSearchParams<{ companyId?: string }>();
  const colors = useColors();
  const router = useRouter();
  const { companies, addReport } = useData();

  const [selectedCompanyId, setSelectedCompanyId] = useState(preselectedCompanyId || "");
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [planPeriod, setPlanPeriod] = useState<"1년" | "3년" | "5년">("3년");
  const [targetRevenue, setTargetRevenue] = useState("");
  const [growthRate, setGrowthRate] = useState("");
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
  const [customDirection, setCustomDirection] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const toggleDirection = (dir: string) => {
    setSelectedDirections(prev =>
      prev.includes(dir) ? prev.filter(d => d !== dir) : [...prev, dir]
    );
  };

  const strategicDirection = [
    ...selectedDirections,
    ...(showCustomInput && customDirection.trim() ? [customDirection.trim()] : []),
  ].join(", ");
  const [isGenerating, setIsGenerating] = useState(false);
  const [successReportId, setSuccessReportId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [showRetryToast, setShowRetryToast] = useState(false);
  const MAX_RETRY = 3;

  const generateMutation = trpc.reports.generateBusinessPlan.useMutation();
  const geminiKeyQuery = trpc.auth.getGeminiApiKey.useQuery(undefined, { retry: false });
  const hasGeminiKey = geminiKeyQuery.data?.hasKey ?? false;
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const handleGenerate = async () => {
    if (!selectedCompanyId || !selectedCompany) {
      Alert.alert("오류", "업체를 선택해주세요.");
      return;
    }
    if (!strategicDirection.trim()) {
      Alert.alert("오류", "핵심 전략 방향을 1개 이상 선택해주세요.");
      return;
    }

    setIsGenerating(true);
    setRetryAttempt(0);
    setShowRetryToast(false);

    const attemptGenerate = async (attempt: number): Promise<void> => {
      try {
        const result = await generateMutation.mutateAsync({
        companyData: {
          name: selectedCompany.name,
          businessType: selectedCompany.businessType,
          businessNumber: selectedCompany.businessNumber,
          corporateNumber: selectedCompany.corporateNumber,
          establishedDate: selectedCompany.establishedDate || selectedCompany.foundedYear,
          businessPhone: selectedCompany.businessPhone,
          employeeCount: selectedCompany.employeeCount,
          industry: selectedCompany.industry,
          officeOwnership: selectedCompany.officeOwnership,
          businessAddress: selectedCompany.businessAddress,
          deposit: selectedCompany.deposit,
          monthlyRent: selectedCompany.monthlyRent,
          hasAdditionalBranch: selectedCompany.hasAdditionalBranch,
          representativeName: selectedCompany.representativeName,
          birthDate: selectedCompany.birthDate,
          contactNumber: selectedCompany.contactNumber,
          telecom: selectedCompany.telecom,
          homeAddress: selectedCompany.homeAddress,
          homeOwnership: selectedCompany.homeOwnership,
          education: selectedCompany.education,
          major: selectedCompany.major,
          career1: selectedCompany.career1,
          career2: selectedCompany.career2,
          hasFinancialDelinquency: selectedCompany.hasFinancialDelinquency,
          hasTaxDelinquency: selectedCompany.hasTaxDelinquency,
          kcbScore: selectedCompany.kcbScore,
          niceScore: selectedCompany.niceScore,
          hasExportSales: selectedCompany.hasExportSales,
          hasPlannedExport: selectedCompany.hasPlannedExport,
          currentYearSales: selectedCompany.currentYearSales || selectedCompany.recentRevenue,
          year25Sales: selectedCompany.year25Sales,
          year24Sales: selectedCompany.year24Sales,
          year23Sales: selectedCompany.year23Sales,
          currentYearExport: selectedCompany.currentYearExport,
          year25Export: selectedCompany.year25Export,
          year24Export: selectedCompany.year24Export,
          year23Export: selectedCompany.year23Export,
          jungJinGong: selectedCompany.jungJinGong,
          soJinGong: selectedCompany.soJinGong,
          sinbo: selectedCompany.sinbo,
          gibo: selectedCompany.gibo,
          jaedan: selectedCompany.jaedan,
          companyCollateral: selectedCompany.companyCollateral,
          ceoCredit: selectedCompany.ceoCredit,
          ceoCollateral: selectedCompany.ceoCollateral,
          hasSMECert: selectedCompany.hasSMECert,
          hasStartupCert: selectedCompany.hasStartupCert,
          hasWomenBizCert: selectedCompany.hasWomenBizCert,
          hasInnobiz: selectedCompany.hasInnobiz,
          hasVentureCert: selectedCompany.hasVentureCert,
          hasRootBizCert: selectedCompany.hasRootBizCert,
          hasISO: selectedCompany.hasISO,
          hasHACCP: selectedCompany.hasHACCP,
          hasPatent: selectedCompany.hasPatent,
          patentCount: selectedCompany.patentCount,
          patentDetails: selectedCompany.patentDetails,
          hasGovSupport: selectedCompany.hasGovSupport,
          govSupportCount: selectedCompany.govSupportCount,
          govSupportDetails: selectedCompany.govSupportDetails,
          coreItem: selectedCompany.coreItem || selectedCompany.mainProducts,
          salesRoute: selectedCompany.salesRoute,
          competitiveness: selectedCompany.competitiveness,
          marketStatus: selectedCompany.marketStatus,
          processDetail: selectedCompany.processDetail,
          targetCustomer: selectedCompany.targetCustomer,
          revenueModel: selectedCompany.revenueModel,
          futurePlan: selectedCompany.futurePlan || selectedCompany.challenges,
          requiredFunding: selectedCompany.requiredFunding,
          fundingPlanDetail: selectedCompany.fundingPlanDetail,
          memo: selectedCompany.memo,
        },
        planPeriod,
        targetRevenue: targetRevenue || undefined,
        growthRate: growthRate || undefined,
        strategicDirection,
        });

        if (result.success && result.data) {
          setShowRetryToast(false);
          const report = await addReport({
            companyId: selectedCompanyId,
            companyName: selectedCompany!.name,
            type: "business_plan",
            title: result.data.title || `${selectedCompany!.name} ${planPeriod} AI 사업계획서`,
            sections: (result.data.sections || []) as unknown as import('../shared/types').ReportSection[],
            companySummary: result.data.companySummary,
            status: "completed",
          });
          setIsGenerating(false);
          setSuccessReportId(report.id);
        }
      } catch (e: any) {
        const raw = e.message || "";
        const isFatal =
          raw.includes("usage exhausted") ||
          raw.includes("412") ||
          raw.includes("Precondition Failed") ||
          raw.includes("UNAUTHORIZED") ||
          raw.includes("401");

        if (!isFatal && attempt < MAX_RETRY) {
          setRetryAttempt(attempt);
          setShowRetryToast(true);
          await new Promise((r) => setTimeout(r, 3000));
          return attemptGenerate(attempt + 1);
        }

        setShowRetryToast(false);
        let msg = "AI 사업계획서 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
        if (raw.includes("usage exhausted") || raw.includes("412") || raw.includes("Precondition Failed")) {
          msg = "AI 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
        } else if (raw.includes("UNAUTHORIZED") || raw.includes("401")) {
          msg = "로그인이 필요합니다. 다시 로그인해 주세요.";
        } else if (raw.includes("timeout") || raw.includes("TIMEOUT")) {
          msg = "요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
        } else if (raw.includes("RETRYABLE_PARSE_ERROR") || raw.includes("파싱")) {
          msg = "AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
        }
        setErrorMsg(msg);
        setIsGenerating(false);
      }
    };

    try {
      await attemptGenerate(1);
    } catch {
      setIsGenerating(false);
    }
  };

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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI 사업계획서</Text>
          <View style={{ width: 60 }} />
        </View>

        {successReportId ? (
          <SuccessAnimation
            isVisible={true}
            type="business_plan"
            companyName={selectedCompany?.name}
            onNavigate={() => router.replace(`/report/${successReportId}` as any)}
          />
        ) : isGenerating ? (
          <ProgressSteps isActive={isGenerating} type="business_plan" companyName={selectedCompany?.name} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Gemini 키 미등록 경고 */}
            {!geminiKeyQuery.isLoading && !hasGeminiKey && (
              <Pressable
                onPress={() => router.push("/(tabs)/settings" as any)}
                style={({ pressed }) => [{ backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, pressed && { opacity: 0.8 }]}
              >
                <Text style={{ fontSize: 20 }}>🔑</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#C2410C' }}>Gemini API 키 미등록 — AI 생성이 불안정할 수 있습니다</Text>
                  <Text style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>설정 화면에서 무료 API 키를 등록하면 안정적으로 생성됩니다 →</Text>
                </View>
              </Pressable>
            )}

            {/* Company Select */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>대상 업체 선택</Text>
              <Pressable
                style={[styles.companySelector, { backgroundColor: colors.surface, borderColor: selectedCompany ? "#27AE60" : colors.border }]}
                onPress={() => setShowCompanyPicker(!showCompanyPicker)}
              >
                {selectedCompany ? (
                  <View style={styles.selectedCompany}>
                    <View style={[styles.companyIcon, { backgroundColor: "#27AE6018" }]}>
                      <IconSymbol name="building.2.fill" size={18} color="#27AE60" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.companyName, { color: colors.foreground }]}>{selectedCompany.name}</Text>
                      <Text style={[styles.companyIndustry, { color: colors.muted }]}>{selectedCompany.industry}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.placeholderText, { color: colors.muted }]}>업체를 선택하세요</Text>
                )}
                <IconSymbol
                  name={showCompanyPicker ? "chevron.up" : "chevron.down"}
                  size={14}
                  color={colors.muted}
                />
              </Pressable>

              {showCompanyPicker && (
                <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {companies.length === 0 ? (
                    <View style={styles.dropdownEmpty}>
                      <Text style={[styles.dropdownEmptyText, { color: colors.muted }]}>등록된 업체가 없습니다.</Text>
                    </View>
                  ) : (
                    companies.map((company) => (
                      <Pressable
                        key={company.id}
                        style={({ pressed }) => [
                          styles.dropdownItem,
                          { borderBottomColor: colors.border },
                          selectedCompanyId === company.id && { backgroundColor: "#27AE6012" },
                          pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => {
                          setSelectedCompanyId(company.id);
                          setShowCompanyPicker(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{company.name}</Text>
                        <Text style={[styles.dropdownItemSub, { color: colors.muted }]}>{company.industry}</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Company Data Preview (when selected) */}
            {selectedCompany && (
              <View style={[styles.dataPreview, { backgroundColor: "#27AE6008", borderColor: "#27AE6030" }]}>
                <View style={styles.dataPreviewHeader}>
                  <IconSymbol name="checkmark.circle.fill" size={16} color="#27AE60" />
                  <Text style={[styles.dataPreviewTitle, { color: "#27AE60" }]}>업체 데이터 자동 반영</Text>
                </View>
                <Text style={[styles.dataPreviewDesc, { color: colors.muted }]}>
                  등록된 업체의 매출현황, 자금계획, 비즈니스 상세, 보유인증 등 상세 데이터가 AI 사업계획서에 자동으로 반영됩니다.
                </Text>
                <View style={styles.dataPreviewTags}>
                  {(selectedCompany.currentYearSales || selectedCompany.recentRevenue) && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>매출현황</Text></View>}
                  {selectedCompany.requiredFunding && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>자금계획</Text></View>}
                  {selectedCompany.coreItem && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>핵심아이템</Text></View>}
                  {selectedCompany.competitiveness && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>경쟁력</Text></View>}
                  {(selectedCompany.hasSMECert || selectedCompany.hasVentureCert) && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>보유인증</Text></View>}
                  {selectedCompany.hasPatent === 'yes' && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>특허</Text></View>}
                  {selectedCompany.memo && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>컨설턴트메모</Text></View>}
                </View>
              </View>
            )}

            {/* Plan Period */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>계획 기간</Text>
              <View style={styles.periodRow}>
                {PLAN_PERIODS.map((period) => (
                  <Pressable
                    key={period}
                    style={({ pressed }) => [
                      styles.periodButton,
                      {
                        backgroundColor: planPeriod === period ? "#27AE60" : colors.surface,
                        borderColor: planPeriod === period ? "#27AE60" : colors.border,
                      },
                      pressed && { opacity: 0.75 },
                    ]}
                    onPress={() => setPlanPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        { color: planPeriod === period ? "#fff" : colors.foreground },
                      ]}
                    >
                      {period}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Financial Targets */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>재무 목표 (선택)</Text>
              <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>목표 매출</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.foreground }]}
                    placeholder="예: 100억원"
                    placeholderTextColor={colors.muted}
                    value={targetRevenue}
                    onChangeText={setTargetRevenue}
                    returnKeyType="next"
                  />
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>목표 성장률</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.foreground }]}
                    placeholder="예: 연 20%"
                    placeholderTextColor={colors.muted}
                    value={growthRate}
                    onChangeText={setGrowthRate}
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>

            {/* Strategic Direction */}
            <View style={styles.sectionBlock}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>핵심 전략 방향 (필수)</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>{selectedDirections.length + (showCustomInput && customDirection.trim() ? 1 : 0)}개 선택됨</Text>
              </View>
              <View style={styles.directionGrid}>
                {STRATEGIC_DIRECTIONS.map((dir) => {
                  const isSelected = selectedDirections.includes(dir);
                  return (
                    <Pressable
                      key={dir}
                      style={({ pressed }) => [
                        styles.directionChip,
                        {
                          backgroundColor: isSelected ? "#27AE6018" : colors.surface,
                          borderColor: isSelected ? "#27AE60" : colors.border,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => toggleDirection(dir)}
                    >
                      <Text style={[styles.directionChipText, { color: isSelected ? "#27AE60" : colors.foreground }]}>
                        {isSelected ? "\u2713 " : ""}{dir}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={({ pressed }) => [
                    styles.directionChip,
                    {
                      backgroundColor: showCustomInput ? "#27AE6018" : colors.surface,
                      borderColor: showCustomInput ? "#27AE60" : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setShowCustomInput(!showCustomInput)}
                >
                  <Text style={[styles.directionChipText, { color: showCustomInput ? "#27AE60" : colors.foreground }]}>
                    {showCustomInput ? "\u2713 " : ""}직접 입력...
                  </Text>
                </Pressable>
              </View>
              {showCustomInput && (
                <View style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: "#27AE60" }]}>
                  <TextInput
                    style={[styles.notesText, { color: colors.foreground }]}
                    placeholder="전략 방향을 직접 입력하세요"
                    placeholderTextColor={colors.muted}
                    value={customDirection}
                    onChangeText={setCustomDirection}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    autoFocus
                  />
                </View>
              )}
              {strategicDirection.trim() !== "" && (
                <View style={[styles.selectedPreview, { backgroundColor: "#27AE6008", borderColor: "#27AE6030" }]}>
                  <Text style={{ fontSize: 12, color: "#27AE60", fontWeight: "600" }}>선택된 전략: {strategicDirection}</Text>
                </View>
              )}
            </View>

            {/* 에러 메시지 표시 */}
            {errorMsg && (
              <View style={{ backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <Text style={{ color: '#DC2626', fontSize: 13 }}>{errorMsg}</Text>
              </View>
            )}

            {/* Generate Button */}
            <Pressable
              style={({ pressed }) => [
                styles.generateButton,
                {
                  backgroundColor:
                    selectedCompanyId && strategicDirection ? "#27AE60" : colors.border,
                },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => { setErrorMsg(null); handleGenerate(); }}
              disabled={!selectedCompanyId || !strategicDirection.trim()}
            >
              <IconSymbol name="sparkles" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>AI 사업계획서 생성</Text>
            </Pressable>

            <Text style={[styles.generateNote, { color: colors.muted }]}>
              AI가 등록된 업체의 상세 데이터(매출, 자금계획, 비즈니스 상세 등)를 분석하여 맞춤형 AI 사업계획서를 자동으로 작성합니다.
            </Text>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      <RetryToast visible={showRetryToast} attempt={retryAttempt} maxAttempts={MAX_RETRY} />
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
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  backText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  loadingDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  companySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  selectedCompany: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  companyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  companyName: {
    fontSize: 15,
    fontWeight: "600",
  },
  companyIndustry: {
    fontSize: 12,
    marginTop: 1,
  },
  placeholderText: {
    fontSize: 15,
  },
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownEmpty: {
    padding: 16,
    alignItems: "center",
  },
  dropdownEmptyText: {
    fontSize: 14,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: "500",
  },
  dropdownItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  dataPreview: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  dataPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dataPreviewTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  dataPreviewDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  dataPreviewTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  periodRow: {
    flexDirection: "row",
    gap: 10,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  periodText: {
    fontSize: 15,
    fontWeight: "600",
  },
  inputGroup: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    width: 90,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    textAlign: "right",
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 80,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  generateNote: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: -4,
  },
  directionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  directionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  directionChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  selectedPreview: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 4,
  },
});
