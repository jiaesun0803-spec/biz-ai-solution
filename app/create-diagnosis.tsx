import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useCallback, useRef } from "react";
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

const DIAGNOSIS_AREAS = [
  { id: "finance", label: "재무 분석", icon: "chart.bar.fill" as const },
  { id: "marketing", label: "마케팅", icon: "chart.line.uptrend.xyaxis" as const },
  { id: "operations", label: "운영/생산", icon: "gearshape.fill" as const },
  { id: "hr", label: "인사/조직", icon: "person.fill" as const },
  { id: "it", label: "IT/디지털", icon: "sparkles" as const },
  { id: "strategy", label: "전략", icon: "flag.fill" as const },
];

export default function CreateDiagnosisScreen() {
  const { companyId: preselectedCompanyId } = useLocalSearchParams<{ companyId?: string }>();
  const colors = useColors();
  const router = useRouter();
  const { companies, addReport } = useData();

  const [selectedCompanyId, setSelectedCompanyId] = useState(preselectedCompanyId || "");
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(["finance", "strategy"]);
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [successReportId, setSuccessReportId] = useState<string | null>(null);
  const [successTab, setSuccessTab] = useState<'client' | 'consultant'>('client');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [showRetryToast, setShowRetryToast] = useState(false);
  const MAX_RETRY = 3;

  const generateMutation = trpc.reports.generateDiagnosis.useMutation();
  const geminiKeyQuery = trpc.auth.getGeminiApiKey.useQuery(undefined, { retry: false });
  const hasGeminiKey = geminiKeyQuery.data?.hasKey ?? false;

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const toggleArea = (areaId: string) => {
    setSelectedAreas((prev) =>
      prev.includes(areaId) ? prev.filter((a) => a !== areaId) : [...prev, areaId]
    );
  };

  const handleGenerate = async (reportType: 'client' | 'consultant' = 'client') => {
    if (!selectedCompanyId || !selectedCompany) {
      Alert.alert("오류", "업체를 선택해주세요.");
      return;
    }
    if (selectedAreas.length === 0) {
      Alert.alert("오류", "진단 영역을 하나 이상 선택해주세요.");
      return;
    }

    setIsGenerating(true);
    setRetryAttempt(0);
    setShowRetryToast(false);

    const areaLabels = selectedAreas.map(
      (id) => DIAGNOSIS_AREAS.find((a) => a.id === id)?.label || id
    );

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
        selectedAreas: areaLabels,
        additionalNotes: notes || undefined,
        });

        if (result.success && result.data) {
          setShowRetryToast(false);
          const report = await addReport({
            companyId: selectedCompanyId,
            companyName: selectedCompany!.name,
            type: "diagnosis",
            title: result.data.title || `${selectedCompany!.name} 경영진단보고서`,
            sections: (result.data.sections || []) as unknown as import('@/shared/types').ReportSection[],
            companySummary: result.data.companySummary,
            status: "completed",
          });
          setIsGenerating(false);
          setSuccessTab(reportType);
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
        // RETRYABLE_PARSE_ERROR는 항상 재시도 가능 (치명적 에러 아님)

        if (!isFatal && attempt < MAX_RETRY) {
          setRetryAttempt(attempt);
          setShowRetryToast(true);
          await new Promise((r) => setTimeout(r, 3000));
          return attemptGenerate(attempt + 1);
        }

        setShowRetryToast(false);
        let msg = "보고서 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>경영진단보고서</Text>
          <View style={{ width: 60 }} />
        </View>

        {successReportId ? (
          <SuccessAnimation
            isVisible={true}
            type="diagnosis"
            companyName={selectedCompany?.name}
            onNavigate={() => router.replace(`/report/${successReportId}?tab=${successTab}` as any)}
          />
        ) : isGenerating ? (
          <ProgressSteps isActive={isGenerating} type="diagnosis" companyName={selectedCompany?.name} />
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
                style={[styles.companySelector, { backgroundColor: colors.surface, borderColor: selectedCompany ? colors.primary : colors.border }]}
                onPress={() => setShowCompanyPicker(!showCompanyPicker)}
              >
                {selectedCompany ? (
                  <View style={styles.selectedCompany}>
                    <View style={[styles.companyIcon, { backgroundColor: colors.primary + "18" }]}>
                      <IconSymbol name="building.2.fill" size={18} color={colors.primary} />
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
                      <Pressable onPress={() => router.push("/add-company" as any)}>
                        <Text style={{ color: colors.primary, fontSize: 13, marginTop: 4 }}>업체 등록하기</Text>
                      </Pressable>
                    </View>
                  ) : (
                    companies.map((company) => (
                      <Pressable
                        key={company.id}
                        style={({ pressed }) => [
                          styles.dropdownItem,
                          { borderBottomColor: colors.border },
                          selectedCompanyId === company.id && { backgroundColor: colors.primary + "12" },
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
              <View style={[styles.dataPreview, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "30" }]}>
                <View style={styles.dataPreviewHeader}>
                  <IconSymbol name="checkmark.circle.fill" size={16} color={colors.primary} />
                  <Text style={[styles.dataPreviewTitle, { color: colors.primary }]}>업체 데이터 자동 반영</Text>
                </View>
                <Text style={[styles.dataPreviewDesc, { color: colors.muted }]}>
                  등록된 업체의 매출현황, 신용정보, 부채현황, 보유인증, 특허 등 상세 데이터가 AI 분석에 자동으로 반영됩니다.
                </Text>
                <View style={styles.dataPreviewTags}>
                  {selectedCompany.kcbScore && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>신용점수</Text></View>}
                  {(selectedCompany.currentYearSales || selectedCompany.recentRevenue) && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>매출현황</Text></View>}
                  {(selectedCompany.jungJinGong || selectedCompany.sinbo || selectedCompany.gibo) && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>부채현황</Text></View>}
                  {(selectedCompany.hasSMECert || selectedCompany.hasVentureCert || selectedCompany.hasInnobiz) && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>보유인증</Text></View>}
                  {selectedCompany.hasPatent === 'yes' && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>특허</Text></View>}
                  {selectedCompany.coreItem && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>비즈니스상세</Text></View>}
                  {selectedCompany.memo && <View style={[styles.tag, { backgroundColor: colors.surface }]}><Text style={[styles.tagText, { color: colors.foreground }]}>컨설턴트메모</Text></View>}
                </View>
              </View>
            )}

            {/* Diagnosis Areas */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>진단 영역 선택</Text>
              <View style={styles.areasGrid}>
                {DIAGNOSIS_AREAS.map((area) => {
                  const isSelected = selectedAreas.includes(area.id);
                  return (
                    <Pressable
                      key={area.id}
                      style={({ pressed }) => [
                        styles.areaCard,
                        {
                          backgroundColor: isSelected ? "#1A3C6E" : colors.surface,
                          borderColor: isSelected ? "#1A3C6E" : colors.border,
                        },
                        pressed && { opacity: 0.75 },
                      ]}
                      onPress={() => toggleArea(area.id)}
                    >
                      <IconSymbol
                        name={area.icon}
                        size={20}
                        color={isSelected ? "#fff" : colors.muted}
                      />
                      <Text
                        style={[
                          styles.areaLabel,
                          { color: isSelected ? "#fff" : colors.foreground },
                        ]}
                      >
                        {area.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.areaCheck}>
                          <IconSymbol name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>추가 메모 (선택)</Text>
              <View style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.notesText, { color: colors.foreground }]}
                  placeholder="특이사항이나 추가로 분석할 내용을 입력하세요"
                  placeholderTextColor={colors.muted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* 에러 메시지 표시 */}
            {errorMsg && (
              <View style={{ backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <Text style={{ color: '#DC2626', fontSize: 13 }}>{errorMsg}</Text>
              </View>
            )}

            {/* Generate Buttons - 업체전달용 / 컨설턴트용 분리 */}
            <View style={[styles.generateTypeBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.generateTypeTitle, { color: colors.muted }]}>보고서 유형을 선택하여 생성하세요</Text>
              <View style={styles.generateButtonRow}>
                {/* 업체전달용 */}
                <View style={[styles.generateTypeCard, { backgroundColor: colors.background, borderColor: '#3B82F6' }]}>
                  <View style={styles.generateTypeCardHeader}>
                    <IconSymbol name="building.2.fill" size={18} color="#3B82F6" />
                    <Text style={[styles.generateTypeCardTitle, { color: '#3B82F6' }]}>업체전달용</Text>
                  </View>
                  <Text style={[styles.generateTypeCardDesc, { color: colors.muted }]}>
                    전문 조언 제외{`\n`}담백하고 알찬 내용
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.generateTypeButton,
                      { backgroundColor: selectedCompanyId && selectedAreas.length > 0 ? '#3B82F6' : colors.border },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => { setErrorMsg(null); handleGenerate('client'); }}
                    disabled={!selectedCompanyId || selectedAreas.length === 0}
                  >
                    <IconSymbol name="sparkles" size={15} color="#fff" />
                    <Text style={styles.generateTypeButtonText}>업체전달용 생성</Text>
                  </Pressable>
                </View>

                {/* 컨설턴트용 */}
                <View style={[styles.generateTypeCard, { backgroundColor: colors.background, borderColor: '#F59E0B' }]}>
                  <View style={styles.generateTypeCardHeader}>
                    <IconSymbol name="lock.fill" size={18} color="#F59E0B" />
                    <Text style={[styles.generateTypeCardTitle, { color: '#F59E0B' }]}>컨설턴트용</Text>
                  </View>
                  <Text style={[styles.generateTypeCardDesc, { color: colors.muted }]}>
                    전문 조언 포함{`\n`}내부 전용 보고서
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.generateTypeButton,
                      { backgroundColor: selectedCompanyId && selectedAreas.length > 0 ? '#F59E0B' : colors.border },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => { setErrorMsg(null); handleGenerate('consultant'); }}
                    disabled={!selectedCompanyId || selectedAreas.length === 0}
                  >
                    <IconSymbol name="lock.fill" size={15} color="#fff" />
                    <Text style={styles.generateTypeButtonText}>컨설턴트용 생성</Text>
                  </Pressable>
                </View>
              </View>
            </View>
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
  areasGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  areaCard: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    position: "relative",
  },
  areaLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  areaCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
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
  generateTypeBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  generateTypeTitle: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  generateButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  generateTypeCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    gap: 8,
    alignItems: "center",
  },
  generateTypeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  generateTypeCardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  generateTypeCardDesc: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  generateTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    width: "100%",
  },
  generateTypeButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
