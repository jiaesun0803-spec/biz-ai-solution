import { useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  Linking,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

interface SimulatorInput {
  industry: string;
  niceScore: number;
  previousYearSales: number;
  employeeCount: number;
  hasFinancialDelinquency: boolean;
  hasTaxDelinquency: boolean;
  hasGiboDebt: boolean;
  hasSinboDebt: boolean;
}

interface FundingProductInfo {
  id: string;
  institutionName: string;
  productName: string;
  category: string;
  description: string;
  interestRate: string;
  maxLimit: string;
  loanPeriod: string;
  targetBusiness: string;
  requiredDocs: string[];
  applicationUrl: string;
  contactInfo: string;
  tags: string[];
  note?: string;
}

interface Recommendation {
  rank: number;
  name: string;
  reason: string;
  creditCutline: string;
  eligible: boolean;
  estimatedLimit?: string;
  note?: string;
  products?: FundingProductInfo[];
}

interface SimResult {
  category: string;
  categoryReason: string;
  recommendations: Recommendation[];
  creditWarning?: string;
  limitBasis: string;
  isDelinquent: boolean;
  delinquentWarning?: string;
}

const INDUSTRY_OPTIONS = [
  "제조업",
  "IT/소프트웨어",
  "정보통신업",
  "도소매업",
  "서비스업",
  "음식/숙박업",
  "건설업",
  "운수업",
  "교육서비스업",
  "기타",
];

const SCORE_PRESETS = [550, 700, 750, 800, 830, 850, 900];
const SALES_PRESETS = [
  { label: "1억", value: 10000 },
  { label: "3억", value: 30000 },
  { label: "5억", value: 50000 },
  { label: "10억", value: 100000 },
  { label: "30억", value: 300000 },
  { label: "50억", value: 500000 },
];

export default function FundingSimulatorScreen() {
  const colors = useColors();
  const router = useRouter();

  const [form, setForm] = useState<SimulatorInput>({
    industry: "",
    niceScore: 800,
    previousYearSales: 0,
    employeeCount: 0,
    hasFinancialDelinquency: false,
    hasTaxDelinquency: false,
    hasGiboDebt: false,
    hasSinboDebt: false,
  });

  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);

  const simulateMutation = trpc.simulator.fundingMatch.useMutation();

  const formatSales = (v: number) => {
    if (v >= 10000) return `${(v / 10000).toFixed(1)}억원`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}천만원`;
    if (v > 0) return `${v}만원`;
    return "0원";
  };

  const handleSimulate = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setLoading(true);
    try {
      const res = await simulateMutation.mutateAsync(form);
      setResult(res.data as SimResult);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      Alert.alert("오류", e.message || "시뮬레이션 실행 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [form]);

  const handleReset = () => {
    setForm({
      industry: "",
      niceScore: 800,
      previousYearSales: 0,
      employeeCount: 0,
      hasFinancialDelinquency: false,
      hasTaxDelinquency: false,
      hasGiboDebt: false,
      hasSinboDebt: false,
    });
    setResult(null);
  };

  const updateField = (field: keyof SimulatorInput, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* 헤더 */}
        <View style={[styles.header, { backgroundColor: "#5B21B6" }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.backBtnText}>← 뒤로</Text>
          </Pressable>
          <Text style={styles.headerTitle}>정책자금 매칭 시뮬레이터</Text>
          <Text style={styles.headerSubtitle}>
            조건을 설정하고 매칭 결과를 즉시 확인하세요
          </Text>
        </View>

        <View style={styles.content}>
          {/* 업종 선택 */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>업종</Text>
            <Pressable
              onPress={() => setShowIndustryPicker(!showIndustryPicker)}
              style={({ pressed }) => [
                styles.selectBtn,
                { borderColor: colors.border, backgroundColor: colors.background },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.selectBtnText, { color: form.industry ? colors.foreground : colors.muted }]}>
                {form.industry || "업종을 선택하세요"}
              </Text>
              <Text style={{ color: colors.muted }}>{showIndustryPicker ? "▲" : "▼"}</Text>
            </Pressable>
            {showIndustryPicker && (
              <View style={styles.optionGrid}>
                {INDUSTRY_OPTIONS.map((ind) => (
                  <Pressable
                    key={ind}
                    onPress={() => {
                      updateField("industry", ind);
                      setShowIndustryPicker(false);
                    }}
                    style={({ pressed }) => [
                      styles.optionChip,
                      {
                        backgroundColor: form.industry === ind ? "#5B21B6" : colors.background,
                        borderColor: form.industry === ind ? "#5B21B6" : colors.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        { color: form.industry === ind ? "#fff" : colors.foreground },
                      ]}
                    >
                      {ind}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            <TextInput
              placeholder="또는 직접 입력"
              placeholderTextColor={colors.muted}
              value={INDUSTRY_OPTIONS.includes(form.industry) ? "" : form.industry}
              onChangeText={(t) => updateField("industry", t)}
              style={[
                styles.textInput,
                { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background },
              ]}
            />
          </View>

          {/* NICE 신용점수 */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.labelRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>대표자 NICE 신용점수</Text>
              <Text style={[styles.valueLabel, { color: "#5B21B6" }]}>{form.niceScore}점</Text>
            </View>
            <Slider
              minimumValue={300}
              maximumValue={1000}
              step={10}
              value={form.niceScore}
              onValueChange={(v: number) => updateField("niceScore", v)}
              minimumTrackTintColor="#5B21B6"
              maximumTrackTintColor={colors.border}
              thumbTintColor="#5B21B6"
              style={{ marginVertical: 8 }}
            />
            <View style={styles.presetRow}>
              {SCORE_PRESETS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => updateField("niceScore", s)}
                  style={({ pressed }) => [
                    styles.presetChip,
                    {
                      backgroundColor: form.niceScore === s ? "#5B21B6" : colors.background,
                      borderColor: form.niceScore === s ? "#5B21B6" : colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      { color: form.niceScore === s ? "#fff" : colors.muted },
                    ]}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 전년도 매출 */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.labelRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>전년도 매출</Text>
              <Text style={[styles.valueLabel, { color: "#5B21B6" }]}>{formatSales(form.previousYearSales)}</Text>
            </View>
            <Slider
              minimumValue={0}
              maximumValue={1000000}
              step={5000}
              value={form.previousYearSales}
              onValueChange={(v: number) => updateField("previousYearSales", v)}
              minimumTrackTintColor="#5B21B6"
              maximumTrackTintColor={colors.border}
              thumbTintColor="#5B21B6"
              style={{ marginVertical: 8 }}
            />
            <View style={styles.presetRow}>
              {SALES_PRESETS.map(({ label, value }) => (
                <Pressable
                  key={value}
                  onPress={() => updateField("previousYearSales", value)}
                  style={({ pressed }) => [
                    styles.presetChip,
                    {
                      backgroundColor: form.previousYearSales === value ? "#5B21B6" : colors.background,
                      borderColor: form.previousYearSales === value ? "#5B21B6" : colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      { color: form.previousYearSales === value ? "#fff" : colors.muted },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 직원수 */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.labelRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>4대보험 가입 직원수</Text>
              <Text style={[styles.valueLabel, { color: "#5B21B6" }]}>{form.employeeCount}명</Text>
            </View>
            <Slider
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={form.employeeCount}
              onValueChange={(v: number) => updateField("employeeCount", v)}
              minimumTrackTintColor="#5B21B6"
              maximumTrackTintColor={colors.border}
              thumbTintColor="#5B21B6"
              style={{ marginVertical: 8 }}
            />
          </View>

          {/* 토글 옵션 */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>추가 조건</Text>
            {[
              { key: "hasFinancialDelinquency" as const, label: "금융연체 이력", warn: true },
              { key: "hasTaxDelinquency" as const, label: "세금체납 이력", warn: true },
              { key: "hasGiboDebt" as const, label: "기술보증기금 기존 이용", warn: false },
              { key: "hasSinboDebt" as const, label: "신용보증기금 기존 이용", warn: false },
            ].map(({ key, label, warn }) => (
              <Pressable
                key={key}
                onPress={() => updateField(key, !form[key])}
                style={({ pressed }) => [
                  styles.toggleRow,
                  { borderBottomColor: colors.border },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.toggleLabel,
                    {
                      color: warn && form[key] ? "#EF4444" : colors.foreground,
                      fontWeight: warn && form[key] ? "600" : "400",
                    },
                  ]}
                >
                  {label}
                  {warn && form[key] ? " (주의)" : ""}
                </Text>
                <View
                  style={[
                    styles.toggleTrack,
                    {
                      backgroundColor: form[key]
                        ? warn
                          ? "#EF4444"
                          : "#5B21B6"
                        : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      { transform: [{ translateX: form[key] ? 18 : 2 }] },
                    ]}
                  />
                </View>
              </Pressable>
            ))}
          </View>

          {/* 실행 버튼 */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleSimulate}
              disabled={loading}
              style={({ pressed }) => [
                styles.simulateBtn,
                { backgroundColor: "#5B21B6", opacity: loading ? 0.6 : pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={styles.simulateBtnText}>
                {loading ? "분석 중..." : "시뮬레이션 실행"}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [
                styles.resetBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.resetBtnText, { color: colors.muted }]}>초기화</Text>
            </Pressable>
          </View>

          {/* 결과 영역 */}
          {result && (
            <View style={styles.resultSection}>
              {/* 분류 카드 */}
              <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.resultCardHeader}>
                  <View style={[styles.resultIcon, { backgroundColor: "#EDE9FE" }]}>
                    <Text style={{ fontSize: 16 }}>📋</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultCardTitle, { color: colors.foreground }]}>기업 분류</Text>
                    <Text style={[styles.resultCategory, { color: "#5B21B6" }]}>{result.category}</Text>
                    <Text style={[styles.resultSubtext, { color: colors.muted }]}>{result.categoryReason}</Text>
                  </View>
                </View>
                <View style={[styles.limitBasis, { backgroundColor: colors.background }]}>
                  <Text style={[styles.limitBasisText, { color: colors.muted }]}>
                    한도 산정 기준: {result.limitBasis}
                  </Text>
                </View>
              </View>

              {/* 경고 */}
              {result.isDelinquent && result.delinquentWarning && (
                <View style={[styles.warningCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                  <Text style={{ fontSize: 14 }}>⚠️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.warningTitle, { color: "#991B1B" }]}>연체/체납 경고</Text>
                    <Text style={[styles.warningText, { color: "#B91C1C" }]}>{result.delinquentWarning}</Text>
                  </View>
                </View>
              )}

              {result.creditWarning && (
                <View style={[styles.warningCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
                  <Text style={{ fontSize: 14 }}>📋</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.warningTitle, { color: "#92400E" }]}>신용 참고사항</Text>
                    <Text style={[styles.warningText, { color: "#B45309" }]}>{result.creditWarning}</Text>
                  </View>
                </View>
              )}

              {/* 추천 기관 순위 */}
              <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.resultSectionTitle, { color: colors.foreground }]}>추천 기관 순위</Text>
                {result.recommendations.map((rec) => (
                  <View
                    key={rec.rank}
                    style={[
                      styles.recCard,
                      {
                        backgroundColor: rec.eligible ? "#F0FDF4" : "#FEF2F2",
                        borderColor: rec.eligible ? "#BBF7D0" : "#FECACA",
                      },
                    ]}
                  >
                    <View style={styles.recHeader}>
                      <View
                        style={[
                          styles.rankBadge,
                          {
                            backgroundColor:
                              rec.rank === 1
                                ? "#FBBF24"
                                : rec.rank === 2
                                ? "#D1D5DB"
                                : rec.rank === 3
                                ? "#FDBA74"
                                : "#E5E7EB",
                          },
                        ]}
                      >
                        <Text style={styles.rankText}>{rec.rank}</Text>
                      </View>
                      <Text style={[styles.recName, { color: colors.foreground }]}>{rec.name}</Text>
                      <View
                        style={[
                          styles.eligibleBadge,
                          { backgroundColor: rec.eligible ? "#DCFCE7" : "#FEE2E2" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.eligibleText,
                            { color: rec.eligible ? "#166534" : "#991B1B" },
                          ]}
                        >
                          {rec.eligible ? "✓ 충족" : "✗ 미달"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.recReason, { color: colors.muted }]}>{rec.reason}</Text>
                    <View style={styles.recDetails}>
                      <Text style={[styles.recDetailText, { color: colors.muted }]}>
                        신용 기준: <Text style={{ color: colors.foreground, fontWeight: "500" }}>{rec.creditCutline}</Text>
                      </Text>
                      {rec.estimatedLimit && (
                        <Text style={[styles.recDetailText, { color: colors.muted }]}>
                          예상 한도: <Text style={{ color: "#5B21B6", fontWeight: "600" }}>{rec.estimatedLimit}</Text>
                        </Text>
                      )}
                    </View>
                    {rec.note && (
                      <View style={[styles.recNote, { backgroundColor: "#FFFBEB" }]}>
                        <Text style={{ color: "#92400E", fontSize: 12 }}>{rec.note}</Text>
                      </View>
                    )}

                    {/* 정책자금 상품 카드 */}
                    {rec.products && rec.products.length > 0 && (
                      <View style={{ marginTop: 10, gap: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted }}>
                          신청 가능 상품 ({rec.products.length}개)
                        </Text>
                        {rec.products.map((product) => (
                          <ProductCard key={product.id} product={product} colors={colors} />
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* 신용점수 컷트라인 참고표 */}
              <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.resultSectionTitle, { color: colors.foreground }]}>신용점수 컷트라인</Text>
                {[
                  { name: "중진공", min: 830 },
                  { name: "신용보증기금", min: 800 },
                  { name: "기술보증기금", min: 700 },
                  { name: "소진공", min: 700 },
                ].map(({ name, min }) => (
                  <View key={name} style={[styles.cutlineRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cutlineName, { color: colors.foreground }]}>{name}</Text>
                    <Text style={[styles.cutlineScore, { color: colors.muted }]}>NICE {min}점</Text>
                    <View
                      style={[
                        styles.cutlineBadge,
                        { backgroundColor: form.niceScore >= min ? "#DCFCE7" : "#FEE2E2" },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: form.niceScore >= min ? "#166534" : "#991B1B",
                        }}
                      >
                        {form.niceScore >= min ? "충족" : `${min - form.niceScore}점 부족`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function ProductCard({ product, colors }: { product: FundingProductInfo; colors: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[productStyles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {/* 상품 헤더 */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => [
          productStyles.header,
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[productStyles.productName, { color: colors.foreground }]}>
              {product.productName}
            </Text>
            <View style={productStyles.categoryBadge}>
              <Text style={productStyles.categoryBadgeText}>{product.category}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: colors.muted }}>금리 {product.interestRate.split("(")[0].trim()}</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>한도 {product.maxLimit}</Text>
          </View>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>

      {/* 상세 정보 */}
      {expanded && (
        <View style={[productStyles.details, { borderTopColor: colors.border }]}>
          <Text style={[productStyles.description, { color: colors.muted }]}>
            {product.description}
          </Text>

          <View style={productStyles.infoGrid}>
            <View style={[productStyles.infoItem, { backgroundColor: colors.surface }]}>
              <Text style={[productStyles.infoLabel, { color: colors.muted }]}>금리</Text>
              <Text style={[productStyles.infoValue, { color: colors.foreground }]}>{product.interestRate}</Text>
            </View>
            <View style={[productStyles.infoItem, { backgroundColor: colors.surface }]}>
              <Text style={[productStyles.infoLabel, { color: colors.muted }]}>최대 한도</Text>
              <Text style={[productStyles.infoValue, { color: colors.foreground }]}>{product.maxLimit}</Text>
            </View>
            <View style={[productStyles.infoItem, { backgroundColor: colors.surface }]}>
              <Text style={[productStyles.infoLabel, { color: colors.muted }]}>대출/보증 기간</Text>
              <Text style={[productStyles.infoValue, { color: colors.foreground }]}>{product.loanPeriod}</Text>
            </View>
            <View style={[productStyles.infoItem, { backgroundColor: colors.surface }]}>
              <Text style={[productStyles.infoLabel, { color: colors.muted }]}>지원 대상</Text>
              <Text style={[productStyles.infoValue, { color: colors.foreground }]}>{product.targetBusiness}</Text>
            </View>
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted }}>필요 서류</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
              {product.requiredDocs.map((doc, i) => (
                <View key={i} style={[productStyles.docTag, { backgroundColor: colors.surface }]}>
                  <Text style={{ fontSize: 10, color: colors.muted }}>{doc}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <Text style={{ fontSize: 10, color: colors.muted }}>{product.contactInfo}</Text>
            <Pressable
              onPress={() => Linking.openURL(product.applicationUrl)}
              style={({ pressed }) => [
                productStyles.applyBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={productStyles.applyBtnText}>신청 바로가기 →</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const productStyles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
  },
  categoryBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#5B21B6",
  },
  details: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 0.5,
    gap: 10,
    paddingTop: 10,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  infoItem: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: "48%" as any,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
  },
  docTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  applyBtn: {
    backgroundColor: "#5B21B6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  headerSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  content: { padding: 16, gap: 12 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  selectBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectBtnText: { fontSize: 14 },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionChipText: { fontSize: 13, fontWeight: "500" },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 10,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  valueLabel: { fontSize: 16, fontWeight: "800" },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetChipText: { fontSize: 12, fontWeight: "500" },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  toggleLabel: { fontSize: 14 },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  simulateBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  simulateBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  resetBtn: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  resetBtnText: { fontSize: 14, fontWeight: "600" },
  resultSection: { gap: 12, marginTop: 8 },
  resultCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  resultCardHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resultCardTitle: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  resultCategory: { fontSize: 15, fontWeight: "700" },
  resultSubtext: { fontSize: 12, marginTop: 2 },
  limitBasis: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  limitBasisText: { fontSize: 12 },
  warningCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  warningTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  warningText: { fontSize: 12, lineHeight: 18 },
  resultSectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  recCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  recHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 13, fontWeight: "800" },
  recName: { fontSize: 14, fontWeight: "700", flex: 1 },
  eligibleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  eligibleText: { fontSize: 11, fontWeight: "600" },
  recReason: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  recDetails: { gap: 4 },
  recDetailText: { fontSize: 12 },
  recNote: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
  },
  cutlineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  cutlineName: { flex: 1, fontSize: 13, fontWeight: "500" },
  cutlineScore: { fontSize: 12 },
  cutlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
});
