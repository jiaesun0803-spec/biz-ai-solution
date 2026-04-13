import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useData } from "@/lib/data-context";
import type { Report, ReportType } from "@/shared/types";

type FilterType = "all" | ReportType;

function getReportMeta(type: ReportType) {
  if (type === "diagnosis") return { icon: "chart.bar.fill" as const, color: "#1A3C6E", label: "경영진단" };
  if (type === "funding_match") return { icon: "target" as const, color: "#F59E0B", label: "AI 정책자금매칭" };
  return { icon: "lightbulb.fill" as const, color: "#27AE60", label: "AI 사업계획서" };
}

export default function ReportsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { reports } = useData();
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = reports.filter((r) => {
    if (filter === "all") return true;
    return r.type === filter;
  });

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "diagnosis", label: "경영진단" },
    { id: "business_plan", label: "AI 사업계획서" },
    { id: "funding_match", label: "정책자금" },
  ];

  const renderItem = ({ item }: { item: Report }) => {
    const meta = getReportMeta(item.type);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.75 },
        ]}
        onPress={() => router.push(`/report/${item.id}` as any)}
      >
        <View style={[styles.typeIcon, { backgroundColor: meta.color + "18" }]}>
          <IconSymbol name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.typeBadge, { backgroundColor: meta.color + "18" }]}>
              <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: item.status === "completed" ? "#27AE6018" : "#F39C1218" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: item.status === "completed" ? "#27AE60" : "#F39C12" },
                ]}
              >
                {item.status === "completed" ? "완료" : "초안"}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.cardMeta}>
            <IconSymbol name="building.2.fill" size={12} color={colors.muted} />
            <Text style={[styles.cardMetaText, { color: colors.muted }]}>{item.companyName}</Text>
            <Text style={[styles.cardMetaDot, { color: colors.muted }]}>·</Text>
            <Text style={[styles.cardMetaText, { color: colors.muted }]}>
              {new Date(item.createdAt).toLocaleDateString("ko-KR")}
            </Text>
          </View>
        </View>
        <IconSymbol name="chevron.right" size={14} color={colors.muted} />
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>보고서</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.createBtn, { backgroundColor: "#1A3C6E" }, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/create-diagnosis" as any)}
          >
            <IconSymbol name="chart.bar.fill" size={14} color="#fff" />
            <Text style={styles.createBtnText}>진단</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.createBtn, { backgroundColor: "#27AE60" }, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/create-business-plan" as any)}
          >
            <IconSymbol name="lightbulb.fill" size={14} color="#fff" />
            <Text style={styles.createBtnText}>계획서</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.createBtn, { backgroundColor: "#F59E0B" }, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/create-funding-match" as any)}
          >
            <IconSymbol name="target" size={14} color="#fff" />
            <Text style={styles.createBtnText}>AI 정책자금</Text>
          </Pressable>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {filters.map((f) => (
          <Pressable
            key={f.id}
            style={[
              styles.filterTab,
              filter === f.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setFilter(f.id)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f.id ? colors.primary : colors.muted },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="doc.text.fill" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>보고서 없음</Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              업체를 선택하고 AI로 보고서를 생성하세요.
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  headerActions: { flexDirection: "row", gap: 6 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
  },
  createBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  filterRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    paddingHorizontal: 8,
  },
  filterTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1, gap: 4 },
  cardHeader: { flexDirection: "row", gap: 6, alignItems: "center" },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "600" },
  cardTitle: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { fontSize: 11 },
  cardMetaDot: { fontSize: 11 },
  emptyState: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 22 },
});
