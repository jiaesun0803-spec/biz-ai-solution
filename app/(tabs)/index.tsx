import { useRouter } from "expo-router";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useData } from "@/lib/data-context";
import { useAuth } from "@/hooks/use-auth";
import { PendingApprovalScreen } from "@/components/pending-approval-screen";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { companies, reports } = useData();
  const { user, isAuthenticated, isApproved } = useAuth();

  // 로그인되었지만 승인되지 않은 사용자
  if (isAuthenticated && !isApproved) {
    return <PendingApprovalScreen status={user?.status === 'rejected' ? 'rejected' : 'pending'} userName={user?.name || user?.email} />;
  }

  const diagnosisCount = reports.filter((r) => r.type === "diagnosis").length;
  const cardColor = colors.surface;
  const businessPlanCount = reports.filter((r) => r.type === "business_plan").length;
  const recentCompanies = companies.slice(0, 3);
  const recentReports = reports.slice(0, 5); // PC화면은 공간이 넓으니 5개까지 보여주자!

  const quickActions = [
    {
      id: "company",
      label: "업체등록",
      icon: "building.2.fill" as const,
      color: "#F39C12",
      route: "/add-company",
    },
    {
      id: "diagnosis",
      label: "경영진단보고서",
      icon: "chart.bar.fill" as const,
      color: "#1A3C6E",
      route: "/create-diagnosis",
    },
    {
      id: "business_plan",
      label: "AI사업계획서",
      icon: "lightbulb.fill" as const,
      color: "#27AE60",
      route: "/create-business-plan",
    },
    {
      id: "funding",
      label: "정책자금매칭",
      icon: "target" as const,
      color: "#5B21B6",
      route: "/create-funding-match",
    },
  ];

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header (상단 배너) */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View>
            <Text style={styles.headerGreeting}>안녕하세요 👋</Text>
            <Text style={styles.headerTitle}>BizConsult</Text>
            <Text style={styles.headerSubtitle}>경영컨설팅 보고서 관리 대시보드</Text>
          </View>
          <View style={styles.headerIcon}>
            <Image
              source={{ uri: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663522627028/qurEWALgXWmGYXNT.png" }}
              style={{ width: 72, height: 36 }}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Stats (통계 카드 영역) */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{companies.length}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>관리 업체</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: "#4A90D9" }]}>{diagnosisCount}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>경영진단</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: "#27AE60" }]}>{businessPlanCount}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>AI 사업계획서</Text>
          </View>
        </View>

        {/* PC 레이아웃: 좌/우 2단 분리 */}
        <View style={styles.pcLayoutRow}>
          
          {/* 왼쪽 단: 빠른 실행 + 최근 관리업체 */}
          <View style={styles.leftColumn}>
            {/* Quick Actions (2x2 그리드 형태) */}
            <View style={styles.sectionInner}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 16 }]}>빠른 실행</Text>
              <View style={styles.quickActionsGrid}>
                {quickActions.map((action) => (
                  <Pressable
                    key={action.id}
                    style={({ pressed }) => [
                      styles.quickActionCard,
                      { backgroundColor: cardColor, borderColor: colors.border },
                      pressed && { opacity: 0.75 },
                    ]}
                    onPress={() => router.push(action.route as any)}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: action.color + "18" }]}>
                      <IconSymbol name={action.icon} size={28} color={action.color} />
                    </View>
                    <Text style={[styles.quickActionLabel, { color: colors.foreground }]} numberOfLines={1}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Recent Companies */}
            {recentCompanies.length > 0 && (
              <View style={[styles.sectionInner, { marginTop: 20 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>최근 관리업체</Text>
                  <Pressable onPress={() => router.push("/(tabs)/companies" as any)}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>전체보기</Text>
                  </Pressable>
                </View>
                {recentCompanies.map((company) => (
                  <Pressable
                    key={company.id}
                    style={({ pressed }) => [
                      styles.listCard,
                      { backgroundColor: cardColor, borderColor: colors.border },
                      pressed && { opacity: 0.75 },
                    ]}
                    onPress={() => router.push(`/company/${company.id}` as any)}
                  >
                    <View style={[styles.companyAvatar, { backgroundColor: colors.primary + "18" }]}>
                      <IconSymbol name="building.2.fill" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.listCardContent}>
                      <Text style={[styles.listCardTitle, { color: colors.foreground }]}>{company.name}</Text>
                      <Text style={[styles.listCardSub, { color: colors.muted }]}>{company.industry}</Text>
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* 오른쪽 단: 최근 보고서 */}
          <View style={styles.rightColumn}>
            {recentReports.length > 0 && (
              <View style={styles.sectionInner}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>최근 보고서</Text>
                  <Pressable onPress={() => router.push("/(tabs)/reports" as any)}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>전체보기</Text>
                  </Pressable>
                </View>
                {recentReports.map((report) => (
                  <Pressable
                    key={report.id}
                    style={({ pressed }) => [
                      styles.listCard,
                      { backgroundColor: cardColor, borderColor: colors.border },
                      pressed && { opacity: 0.75 },
                    ]}
                    onPress={() => router.push(`/report/${report.id}` as any)}
                  >
                    <View
                      style={[
                        styles.reportBadge,
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
                    <View style={styles.listCardContent}>
                      <Text style={[styles.listCardTitle, { color: colors.foreground }]} numberOfLines={1}>
                        {report.title}
                      </Text>
                      <Text style={[styles.listCardSub, { color: colors.muted }]}>{report.companyName}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            report.status === "completed" ? "#27AE6018" : "#F39C1218",
                        },
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
          </View>
          
        </View>

        {/* Empty State (데이터가 없을 때) */}
        {companies.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="briefcase.fill" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>시작해보세요!</Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              업체를 등록하고 AI로 경영진단보고서와{"\n"}AI 사업계획서를 자동으로 생성하세요.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.emptyButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => router.push("/add-company" as any)}
            >
              <Text style={styles.emptyButtonText}>첫 업체 등록하기</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerGreeting: { color: "rgba(255,255,255,0.75)", fontSize: 16, marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 32, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { color: "rgba(255,255,255,0.75)", fontSize: 14, marginTop: 4 },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 16,
    marginTop: -24,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 13, marginTop: 4, fontWeight: "500" },
  
  // PC 화면용 좌우 레이아웃 스타일 추가
  pcLayoutRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 24,
  },
  leftColumn: {
    flex: 1,
    minWidth: 320, // 화면이 좁아지면 아래로 떨어지도록 반응형 설정
  },
  rightColumn: {
    flex: 1.5, // 오른쪽(최근 보고서) 영역을 살짝 더 넓게 배치
    minWidth: 320,
  },
  sectionInner: {
    width: '100%',
  },
  
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  seeAll: { fontSize: 14, fontWeight: "600" },
  
  // 빠른 실행 2x2 그리드 스타일
  quickActionsGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: "48%", // 한 줄에 두 개씩 들어가도록 비율 설정
    flexGrow: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  quickActionLabel: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  companyAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  reportBadge: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  listCardContent: { flex: 1, marginLeft: 12 },
  listCardTitle: { fontSize: 16, fontWeight: "600" },
  listCardSub: { fontSize: 13, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "600" },
  
  emptyState: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 24, fontWeight: "700", marginTop: 20, marginBottom: 8 },
  emptyDesc: { fontSize: 15, textAlign: "center", lineHeight: 24 },
  emptyButton: {
    marginTop: 32,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
  },
  emptyButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});