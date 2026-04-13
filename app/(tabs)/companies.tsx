import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useData } from "@/lib/data-context";
import { useState } from "react";
import type { Company } from "@/shared/types";

export default function CompaniesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { companies } = useData();
  const [search, setSearch] = useState("");

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: Company }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.75 },
      ]}
      onPress={() => router.push(`/company/${item.id}` as any)}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary + "18" }]}>
        <IconSymbol name="building.2.fill" size={22} color={colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.name}</Text>
        <Text style={[styles.cardSub, { color: colors.muted }]}>
          {item.industry} · {item.employeeCount ? `${item.employeeCount}명` : ""}
        </Text>
        <Text style={[styles.cardDate, { color: colors.muted }]}>
          등록일: {new Date(item.createdAt).toLocaleDateString("ko-KR")}
        </Text>
      </View>
      <IconSymbol name="chevron.right" size={16} color={colors.muted} />
    </Pressable>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>업체 관리</Text>
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => router.push("/add-company" as any)}
        >
          <IconSymbol name="plus" size={18} color="#fff" />
          <Text style={styles.addButtonText}>업체 등록</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="업체명, 업종 검색..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
          </Pressable>
        )}
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
            <IconSymbol name="building.2.fill" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search ? "검색 결과 없음" : "등록된 업체 없음"}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              {search
                ? "다른 키워드로 검색해보세요."
                : "업체를 등록하고 보고서를 생성하세요."}
            </Text>
            {!search && (
              <Pressable
                style={({ pressed }) => [
                  styles.emptyButton,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => router.push("/add-company" as any)}
              >
                <Text style={styles.emptyButtonText}>업체 등록하기</Text>
              </Pressable>
            )}
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
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
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSub: { fontSize: 13, marginTop: 2 },
  cardDate: { fontSize: 11, marginTop: 3 },
  emptyState: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  emptyButton: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
