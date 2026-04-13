import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useData } from "@/lib/data-context";

export default function CompanyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { companies, reports, deleteCompany } = useData();

  const company = companies.find((c) => c.id === id);
  const companyReports = reports.filter((r) => r.companyId === id);

  if (!company) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={[styles.notFound, { color: colors.muted }]}>업체를 찾을 수 없습니다.</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: colors.primary, marginTop: 12 }}>뒤로 가기</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      "업체 삭제",
      `"${company.name}"을 삭제하면 관련 보고서도 모두 삭제됩니다. 계속하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            await deleteCompany(id);
            router.back();
          },
        },
      ]
    );
  };

  // 최근 매출: currentYearSales → year25Sales → year24Sales → recentRevenue 순서로 표시
  const latestSales = company.currentYearSales || company.year25Sales || company.year24Sales || company.recentRevenue;
  const fmtWon = (val?: string) => {
    if (!val) return "-";
    const n = parseInt(val.replace(/[^0-9]/g, ""), 10);
    if (isNaN(n) || n === 0) return val;
    const eok = Math.floor(n / 10000);
    const cheon = Math.floor((n % 10000) / 1000);
    if (eok > 0 && cheon > 0) return `${eok}억 ${cheon}천만원`;
    if (eok > 0) return `${eok}억원`;
    if (cheon > 0) return `${cheon}천만원`;
    return `${n}만원`;
  };

  const infoItems = [
    { label: "업종", value: company.industry },
    { label: "설립연도", value: company.establishedDate || company.foundedYear || "-" },
    { label: "직원 수", value: company.employeeCount ? `${company.employeeCount}명` : "-" },
    { label: "최근 매출", value: fmtWon(latestSales) },
  ];

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>업체 상세</Text>
        <Pressable
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          onPress={handleDelete}
        >
          <IconSymbol name="trash" size={20} color={colors.error} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Company Card */}
        <View style={[styles.companyCard, { backgroundColor: colors.primary }]}>
          <View style={styles.companyCardIcon}>
            <IconSymbol name="building.2.fill" size={28} color="#fff" />
          </View>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyIndustry}>{company.industry}</Text>
          <Text style={styles.companyDate}>
            등록일: {new Date(company.createdAt).toLocaleDateString("ko-KR")}
          </Text>
        </View>

        {/* Info Table */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>기업 정보</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {infoItems.map((item, idx) => (
              <View key={item.label}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.muted }]}>{item.label}</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
                </View>
                {idx < infoItems.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Main Products */}
        {company.mainProducts && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>주요 제품/서비스</Text>
            <View style={[styles.textCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.textContent, { color: colors.foreground }]}>{company.mainProducts}</Text>
            </View>
          </View>
        )}

        {/* Challenges */}
        {company.challenges && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>주요 과제/문제점</Text>
            <View style={[styles.textCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.textContent, { color: colors.foreground }]}>{company.challenges}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>보고서 생성</Text>
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: "#1A3C6E" },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() =>
                router.push({ pathname: "/create-diagnosis", params: { companyId: id } } as any)
              }
            >
              <IconSymbol name="chart.bar.fill" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>경영진단보고서</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: "#27AE60" },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() =>
                router.push({ pathname: "/create-business-plan", params: { companyId: id } } as any)
              }
            >
              <IconSymbol name="lightbulb.fill" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>AI 사업계획서</Text>
            </Pressable>
          </View>
        </View>

        {/* Reports */}
        {companyReports.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              보고서 목록 ({companyReports.length})
            </Text>
            {companyReports.map((report) => (
              <Pressable
                key={report.id}
                style={({ pressed }) => [
                  styles.reportCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => router.push(`/report/${report.id}` as any)}
              >
                <View
                  style={[
                    styles.reportIcon,
                    {
                      backgroundColor:
                        report.type === "diagnosis" ? "#1A3C6E18" : "#27AE6018",
                    },
                  ]}
                >
                  <IconSymbol
                    name={report.type === "diagnosis" ? "chart.bar.fill" : "lightbulb.fill"}
                    size={18}
                    color={report.type === "diagnosis" ? "#1A3C6E" : "#27AE60"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reportTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {report.title}
                  </Text>
                  <Text style={[styles.reportDate, { color: colors.muted }]}>
                    {new Date(report.createdAt).toLocaleDateString("ko-KR")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: report.status === "completed" ? "#27AE6018" : "#F39C1218" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: report.status === "completed" ? "#27AE60" : "#F39C12" },
                    ]}
                  >
                    {report.status === "completed" ? "완료" : "초안"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
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
  content: { paddingBottom: 40 },
  companyCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  companyCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  companyName: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  companyIndustry: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 4 },
  companyDate: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  infoCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 13 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "500" },
  divider: { height: 0.5, marginHorizontal: 14 },
  textCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  textContent: { fontSize: 14, lineHeight: 22 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  reportIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  reportTitle: { fontSize: 14, fontWeight: "600" },
  reportDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "600" },
});
