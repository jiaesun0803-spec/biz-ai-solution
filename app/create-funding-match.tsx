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

const ANALYSIS_CRITERIA = [
  { label: "재무건전성", desc: "매출 추이, 부채 구조, 부채비율" },
  { label: "신용 상태", desc: "KCB/NICE 신용점수, 연체·체납 이력" },
  { label: "기술·인증 보유", desc: "벤처·이노비즈·ISO 등 인증 및 특허" },
  { label: "성장 기반", desc: "과거 매출 성장률, 고용 창출 실적" },
  { label: "정부지원 이력", desc: "기존 정책자금 수혜 및 중복 가능성" },
  { label: "사업 경쟁력", desc: "핵심 아이템, 시장 현황, 차별성" },
];

export default function CreateFundingMatchScreen() {
  const { companyId: preselectedCompanyId } = useLocalSearchParams<{ companyId?: string }>();
  const colors = useColors();
  const router = useRouter();
  const { companies, addReport } = useData();

  const [selectedCompanyId, setSelectedCompanyId] = useState(preselectedCompanyId || "");
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [successReportId, setSuccessReportId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [showRetryToast, setShowRetryToast] = useState(false);
  const MAX_RETRY = 3;

  const generateMutation = trpc.reports.generateFundingMatch.useMutation();
  const geminiKeyQuery = trpc.auth.getGeminiApiKey.useQuery(undefined, { retry: false });
  const hasGeminiKey = geminiKeyQuery.data?.hasKey ?? false;

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const handleGenerate = async () => {
    if (!selectedCompanyId || !selectedCompany) {
      Alert.alert("오류", "업체를 선택해주세요.");
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
        additionalNotes: notes || undefined,
      });

        if (result.success && result.data) {
          setShowRetryToast(false);
          const report = await addReport({
            companyId: selectedCompanyId,
            companyName: selectedCompany!.name,
            type: "funding_match",
            title: result.data.title || `${selectedCompany!.name} AI 정책자금매칭 리포트`,
            sections: result.data.sections || [],
            matchingSummary: result.data.matchingSummary,
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
        let msg = "매칭리포트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI 정책자금매칭</Text>
          <View style={{ width: 60 }} />
        </View>

        {successReportId ? (
          <SuccessAnimation
            isVisible={true}
            type="funding_match"
            companyName={selectedCompany?.name}
            onNavigate={() => router.replace(`/report/${successReportId}` as any)}
          />
        ) : isGenerating ? (
          <ProgressSteps isActive={isGenerating} type="funding_match" companyName={selectedCompany?.name} />
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

            {/* Hero Banner */}
            <View style={[styles.heroBanner, { backgroundColor: "#F59E0B" }]}>
              <View style={styles.heroIcon}>
                <IconSymbol name="target" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>AI 정책자금 매칭리포트</Text>
                <Text style={styles.heroDesc}>업체 데이터를 AI가 분석하여 최적의 정책자금을 매칭해드립니다</Text>
              </View>
            </View>

            {/* Company Select */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>매칭 대상 업체 선택</Text>
              <Pressable
                style={[styles.companySelector, { backgroundColor: colors.surface, borderColor: selectedCompany ? "#F59E0B" : colors.border }]}
                onPress={() => setShowCompanyPicker(!showCompanyPicker)}
              >
                {selectedCompany ? (
                  <View style={styles.selectedCompany}>
                    <View style={[styles.companyIcon, { backgroundColor: "#F59E0B18" }]}>
                      <IconSymbol name="building.2.fill" size={18} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.companyName, { color: colors.foreground }]}>{selectedCompany.name}</Text>
                      <Text style={[styles.companyIndustry, { color: colors.muted }]}>
                        {selectedCompany.industry}
                        {selectedCompany.requiredFunding ? ` · 필요자금 ${selectedCompany.requiredFunding}만원` : ''}
                      </Text>
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
                        style={[
                          styles.dropdownItem,
                          { borderBottomColor: colors.border },
                          selectedCompanyId === company.id && { backgroundColor: "#F59E0B10" },
                        ]}
                        onPress={() => {
                          setSelectedCompanyId(company.id);
                          setShowCompanyPicker(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemName, { color: colors.foreground }]}>{company.name}</Text>
                        <Text style={[styles.dropdownItemIndustry, { color: colors.muted }]}>{company.industry}</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* AI 매칭 분석 기준 */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>AI 매칭 분석 기준</Text>
              <View style={[styles.criteriaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {ANALYSIS_CRITERIA.map((item, idx) => (
                  <View key={item.label} style={[styles.criteriaRow, idx < ANALYSIS_CRITERIA.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <View style={[styles.criteriaDot, { backgroundColor: "#F59E0B" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.criteriaLabel, { color: colors.foreground }]}>{item.label}</Text>
                      <Text style={[styles.criteriaDesc, { color: colors.muted }]}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 매칭 리포트 구성 */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>매칭리포트 구성 (7개 섹션)</Text>
              <View style={[styles.reportStructCard, { backgroundColor: "#FFF8E7", borderColor: "#F59E0B40" }]}>
                {[
                  "1. 보증가능성 예측 리포트",
                  "2. 정책자금 가능성 스코어 리포트",
                  "3. 승인 확률 추정 로직",
                  "4. 정책자금 매칭 알고리즘 구조",
                  "5. 최적 정책자금 매칭 Top 3",
                  "6. 기관별 자동 추천 로직 반영 결과",
                  "7. 종합 의견 및 전략 권고",
                ].map((item) => (
                  <Text key={item} style={[styles.reportStructItem, { color: "#92400E" }]}>• {item}</Text>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>추가 메모 (선택)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="특별히 고려할 사항이나 추가 정보를 입력하세요 (예: 특정 기관 선호, 자금 용도 등)..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                returnKeyType="done"
              />
            </View>

            {/* Generate Button */}
            <Pressable
              style={({ pressed }) => [
                styles.generateBtn,
                { backgroundColor: "#F59E0B", opacity: pressed || !selectedCompanyId ? 0.7 : 1 },
              ]}
              onPress={handleGenerate}
              disabled={!selectedCompanyId}
            >
              <IconSymbol name="sparkles" size={20} color="#fff" />
              <Text style={styles.generateBtnText}>AI 정책자금매칭 리포트 생성하기</Text>
            </Pressable>

            <View style={{ height: 40 }} />
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
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 60 },
  backText: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingCard: {
    width: "100%",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    gap: 16,
  },
  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: { fontSize: 20, fontWeight: "700" },
  loadingDesc: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  content: { padding: 16, gap: 0 },
  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  heroDesc: { color: "rgba(255,255,255,0.85)", fontSize: 12, lineHeight: 18 },
  sectionBlock: { marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  companySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  selectedCompany: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  companyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  companyName: { fontSize: 15, fontWeight: "600" },
  companyIndustry: { fontSize: 12, marginTop: 1 },
  placeholderText: { fontSize: 15 },
  dropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownEmpty: { padding: 16, alignItems: "center" },
  dropdownEmptyText: { fontSize: 14 },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
  },
  dropdownItemName: { fontSize: 15, fontWeight: "600" },
  dropdownItemIndustry: { fontSize: 12, marginTop: 2 },
  criteriaCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  criteriaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
  },
  criteriaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  criteriaLabel: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  criteriaDesc: { fontSize: 12, lineHeight: 18 },
  reportStructCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  reportStructItem: { fontSize: 13, lineHeight: 20 },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 8,
  },
  generateBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
