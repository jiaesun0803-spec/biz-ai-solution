import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

interface FundingProduct {
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

const INSTITUTION_COLORS: Record<string, { bg: string; text: string }> = {
  "중진공": { bg: "#DBEAFE", text: "#1E40AF" },
  "신용보증기금": { bg: "#D1FAE5", text: "#065F46" },
  "기술보증기금": { bg: "#EDE9FE", text: "#5B21B6" },
  "소진공": { bg: "#FED7AA", text: "#9A3412" },
  "신용보증재단": { bg: "#CCFBF1", text: "#134E4A" },
  "은행권 및 지역 특례자금": { bg: "#F3F4F6", text: "#374151" },
};

function getInstColor(name: string) {
  return INSTITUTION_COLORS[name] ?? { bg: "#F3F4F6", text: "#374151" };
}

// ─── 상품 폼 모달 ───
function ProductFormModal({
  product,
  institutions,
  visible,
  onSave,
  onClose,
  colors,
}: {
  product: FundingProduct | null;
  institutions: string[];
  visible: boolean;
  onSave: (data: Omit<FundingProduct, "id">) => Promise<void>;
  onClose: () => void;
  colors: any;
}) {
  const [form, setForm] = useState({
    institutionName: product?.institutionName ?? (institutions[0] ?? ""),
    productName: product?.productName ?? "",
    category: product?.category ?? "",
    description: product?.description ?? "",
    interestRate: product?.interestRate ?? "",
    maxLimit: product?.maxLimit ?? "",
    loanPeriod: product?.loanPeriod ?? "",
    targetBusiness: product?.targetBusiness ?? "",
    requiredDocs: product?.requiredDocs?.join("\n") ?? "",
    applicationUrl: product?.applicationUrl ?? "",
    contactInfo: product?.contactInfo ?? "",
    tags: product?.tags?.join(", ") ?? "",
    note: product?.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [showInstPicker, setShowInstPicker] = useState(false);

  const handleSave = async () => {
    if (!form.productName.trim() || !form.institutionName.trim()) {
      Alert.alert("필수 항목", "기관명과 상품명은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        institutionName: form.institutionName.trim(),
        productName: form.productName.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        interestRate: form.interestRate.trim(),
        maxLimit: form.maxLimit.trim(),
        loanPeriod: form.loanPeriod.trim(),
        targetBusiness: form.targetBusiness.trim(),
        requiredDocs: form.requiredDocs.split("\n").map((d) => d.trim()).filter(Boolean),
        applicationUrl: form.applicationUrl.trim(),
        contactInfo: form.contactInfo.trim(),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        note: form.note.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        {/* 헤더 */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>취소</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            {product ? "상품 수정" : "새 상품 추가"}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={{ color: saving ? colors.muted : colors.primary, fontSize: 16, fontWeight: "600" }}>
              {saving ? "저장 중..." : "저장"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* 기관명 선택 */}
          <Text style={[styles.label, { color: colors.foreground }]}>기관명 *</Text>
          <TouchableOpacity
            onPress={() => setShowInstPicker(true)}
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: form.institutionName ? colors.foreground : colors.muted }}>
              {form.institutionName || "기관 선택"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </TouchableOpacity>

          {/* 기관 선택 드롭다운 */}
          {showInstPicker && (
            <View style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {institutions.map((inst) => (
                <TouchableOpacity
                  key={inst}
                  onPress={() => {
                    setForm({ ...form, institutionName: inst });
                    setShowInstPicker(false);
                  }}
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.border },
                    form.institutionName === inst && { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 14 }}>{inst}</Text>
                  {form.institutionName === inst && (
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 상품명 */}
          <Text style={[styles.label, { color: colors.foreground }]}>상품명 *</Text>
          <TextInput
            value={form.productName}
            onChangeText={(v) => setForm({ ...form, productName: v })}
            placeholder="예: 혁신창업사업화자금"
            placeholderTextColor={colors.muted}
            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />

          {/* 분류 */}
          <Text style={[styles.label, { color: colors.foreground }]}>분류</Text>
          <TextInput
            value={form.category}
            onChangeText={(v) => setForm({ ...form, category: v })}
            placeholder="예: 창업자금, 신용보증"
            placeholderTextColor={colors.muted}
            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />

          {/* 설명 */}
          <Text style={[styles.label, { color: colors.foreground }]}>상품 설명</Text>
          <TextInput
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
            placeholder="상품에 대한 상세 설명"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            style={[styles.textInput, styles.textArea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />

          {/* 금리 */}
          <Text style={[styles.label, { color: colors.foreground }]}>금리</Text>
          <TextInput
            value={form.interestRate}
            onChangeText={(v) => setForm({ ...form, interestRate: v })}
            placeholder="예: 연 2.54% ~ 3.14%"
            placeholderTextColor={colors.muted}
            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />

          {/* 최대 한도 */}
          <Text style={[styles.label, { color: colors.foreground }]}>최대 한도</Text>
          <TextInput
            value={form.maxLimit}
            onChangeText={(v) => setForm({ ...form, maxLimit: v })}
            placeholder="예: 기업당 60억원 이내"
            placeholderTextColor={colors.muted}
            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />

          {/* 대출기간 */}
          <Text style={[styles.label, { color: colors.foreground }]}>대출/보증 기간</Text>
          <TextInput
            value={form.loanPeriod}
            onChangeText={(v) => setForm({ ...form, loanPeriod: v })}
            placeholder="예: 시설 10년, 운전 6년"
            placeholderTextColor={colors.muted}
            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />

          {/* 지원 대상 */}
          <Text style={[styles.label, { color: colors.foreground }]}>지원 대상</Text>
          <TextInput
            value={form.targetBusiness}
            onChangeText={(v) => setForm({ ...form, targetBusiness: v })}
            placeholder="예: 업력 7년 미만 중소기업"
            placeholderTextColor={colors.muted}
            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />

          {/* 필요 서류 */}
          <Text style={[styles.label, { color: colors.foreground }]}>필요 서류 (줄바꿈 구분)</Text>
          <TextInput
            value={form.requiredDocs}
            onChangeText={(v) => setForm({ ...form, requiredDocs: v })}
            placeholder={"사업자등록증\n재무제표\n사업계획서"}
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            style={[styles.textInput, styles.textArea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />

          {/* 신청 URL */}
          <Text style={[styles.label, { color: colors.foreground }]}>신청 URL</Text>
          <TextInput
            value={form.applicationUrl}
            onChangeText={(v) => setForm({ ...form, applicationUrl: v })}
            placeholder="https://..."
            placeholderTextColor={colors.muted}
            keyboardType="url"
            autoCapitalize="none"
            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />

          {/* 문의처 */}
          <Text style={[styles.label, { color: colors.foreground }]}>문의처</Text>
          <TextInput
            value={form.contactInfo}
            onChangeText={(v) => setForm({ ...form, contactInfo: v })}
            placeholder="예: 콜센터 1357"
            placeholderTextColor={colors.muted}
            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />

          {/* 태그 */}
          <Text style={[styles.label, { color: colors.foreground }]}>태그 (쉼표 구분)</Text>
          <TextInput
            value={form.tags}
            onChangeText={(v) => setForm({ ...form, tags: v })}
            placeholder="창업, 사업화, 청년우대"
            placeholderTextColor={colors.muted}
            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />

          {/* 참고사항 */}
          <Text style={[styles.label, { color: colors.foreground }]}>참고사항</Text>
          <TextInput
            value={form.note}
            onChangeText={(v) => setForm({ ...form, note: v })}
            placeholder="추가 참고사항"
            placeholderTextColor={colors.muted}
            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── 상품 카드 ───
function ProductCard({
  product,
  colors,
  onEdit,
  onDelete,
}: {
  product: FundingProduct;
  colors: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const instColor = getInstColor(product.institutionName);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: instColor.bg }]}>
              <Text style={[styles.badgeText, { color: instColor.text }]}>{product.institutionName}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.border + "40" }]}>
              <Text style={[styles.badgeText, { color: colors.muted }]}>{product.category}</Text>
            </View>
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {product.productName}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onEdit} style={[styles.iconBtn, { backgroundColor: "#DBEAFE" }]}>
            <Ionicons name="pencil" size={14} color="#1E40AF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[styles.iconBtn, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="trash" size={14} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 설명 */}
      <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={2}>
        {product.description}
      </Text>

      {/* 요약 정보 */}
      <View style={styles.infoRow}>
        <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.infoLabel, { color: colors.muted }]}>금리</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>
            {product.interestRate || "-"}
          </Text>
        </View>
        <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.infoLabel, { color: colors.muted }]}>한도</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>
            {product.maxLimit || "-"}
          </Text>
        </View>
      </View>

      {/* 태그 */}
      {product.tags.length > 0 && (
        <View style={styles.tagRow}>
          {product.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
            </View>
          ))}
          {product.tags.length > 3 && (
            <Text style={{ fontSize: 10, color: colors.muted }}>+{product.tags.length - 3}</Text>
          )}
        </View>
      )}

      {/* 상세 토글 */}
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.toggleBtn}>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.muted} />
        <Text style={{ fontSize: 12, color: colors.muted }}>{expanded ? "접기" : "상세 보기"}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.detailSection, { borderTopColor: colors.border }]}>
          {product.loanPeriod ? (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>대출/보증 기간</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{product.loanPeriod}</Text>
            </View>
          ) : null}
          {product.targetBusiness ? (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>지원 대상</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{product.targetBusiness}</Text>
            </View>
          ) : null}
          {product.requiredDocs.length > 0 && (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>필요 서류</Text>
              {product.requiredDocs.map((doc, i) => (
                <Text key={i} style={[styles.detailValue, { color: colors.foreground }]}>
                  {"\u2022"} {doc}
                </Text>
              ))}
            </View>
          )}
          {product.contactInfo ? (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>문의처</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{product.contactInfo}</Text>
            </View>
          ) : null}
          {product.note ? (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>참고</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{product.note}</Text>
            </View>
          ) : null}
          {product.applicationUrl ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(product.applicationUrl)}
              style={styles.linkBtn}
            >
              <Ionicons name="open-outline" size={14} color="#2563EB" />
              <Text style={{ fontSize: 12, color: "#2563EB" }}>신청 페이지 바로가기</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ─── 메인 화면 ───
export default function ProductManagementScreen() {
  const router = useRouter();
  const colors = useColors();
  const [products, setProducts] = useState<FundingProduct[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterInst, setFilterInst] = useState("");
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FundingProduct | null>(null);

  const listQuery = trpc.products.list.useQuery({});
  const instQuery = trpc.products.institutions.useQuery();
  const createMutation = trpc.products.create.useMutation();
  const updateMutation = trpc.products.update.useMutation();
  const deleteMutation = trpc.products.delete.useMutation();
  const resetMutation = trpc.products.reset.useMutation();

  const loadData = useCallback(() => {
    listQuery.refetch();
    instQuery.refetch();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // 데이터 동기화
  const allProducts = (listQuery.data as any)?.data ?? [];
  const allInstitutions = (instQuery.data as any)?.data ?? [];

  // 필터링
  const filtered = allProducts.filter((p: FundingProduct) => {
    if (filterInst && p.institutionName !== filterInst) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.productName.toLowerCase().includes(q) ||
        p.institutionName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSave = async (data: Omit<FundingProduct, "id">) => {
    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({ id: editingProduct.id, ...data } as any);
      } else {
        await createMutation.mutateAsync(data as any);
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setShowForm(false);
      setEditingProduct(null);
      loadData();
    } catch (err) {
      Alert.alert("오류", "저장에 실패했습니다.");
    }
  };

  const handleDelete = (product: FundingProduct) => {
    Alert.alert(
      "상품 삭제",
      `"${product.productName}" 상품을 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync({ id: product.id });
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              loadData();
            } catch {
              Alert.alert("오류", "삭제에 실패했습니다.");
            }
          },
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      "기본값 초기화",
      "모든 상품 데이터를 기본값으로 초기화합니다. 직접 추가하거나 수정한 상품이 모두 삭제됩니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "초기화",
          style: "destructive",
          onPress: async () => {
            try {
              await resetMutation.mutateAsync();
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              loadData();
            } catch {
              Alert.alert("오류", "초기화에 실패했습니다.");
            }
          },
        },
      ]
    );
  };

  const isLoading = listQuery.isLoading || instQuery.isLoading;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>상품 관리</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleReset} style={[styles.headerBtn, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="refresh" size={16} color="#92400E" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setEditingProduct(null); setShowForm(true); }}
            style={[styles.headerBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 검색 & 필터 */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="상품명, 기관명, 태그 검색..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => setShowFilterPicker(!showFilterPicker)}
          style={[styles.filterBtn, { backgroundColor: filterInst ? colors.primary + "15" : colors.surface, borderColor: filterInst ? colors.primary : colors.border }]}
        >
          <Ionicons name="filter" size={14} color={filterInst ? colors.primary : colors.muted} />
          <Text style={{ fontSize: 12, color: filterInst ? colors.primary : colors.muted }} numberOfLines={1}>
            {filterInst || "전체"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 필터 드롭다운 */}
      {showFilterPicker && (
        <View style={[styles.filterDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => { setFilterInst(""); setShowFilterPicker(false); }}
            style={[styles.filterItem, { borderBottomColor: colors.border }, !filterInst && { backgroundColor: colors.primary + "10" }]}
          >
            <Text style={{ fontSize: 13, color: colors.foreground }}>전체 기관</Text>
          </TouchableOpacity>
          {allInstitutions.map((inst: string) => (
            <TouchableOpacity
              key={inst}
              onPress={() => { setFilterInst(inst); setShowFilterPicker(false); }}
              style={[styles.filterItem, { borderBottomColor: colors.border }, filterInst === inst && { backgroundColor: colors.primary + "10" }]}
            >
              <Text style={{ fontSize: 13, color: colors.foreground }}>{inst}</Text>
              {filterInst === inst && <Ionicons name="checkmark" size={14} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 상품 수 */}
      <View style={styles.countRow}>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          총 {filtered.length}개 상품 {filterInst ? `(${filterInst})` : ""}
        </Text>
      </View>

      {/* 상품 목록 */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={48} color={colors.muted} style={{ opacity: 0.5 }} />
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8 }}>등록된 상품이 없습니다</Text>
          <TouchableOpacity
            onPress={() => { setEditingProduct(null); setShowForm(true); }}
            style={{ marginTop: 12 }}
          >
            <Text style={{ fontSize: 14, color: colors.primary }}>+ 새 상품 추가</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {filtered.map((product: FundingProduct) => (
            <ProductCard
              key={product.id}
              product={product}
              colors={colors}
              onEdit={() => { setEditingProduct(product); setShowForm(true); }}
              onDelete={() => handleDelete(product)}
            />
          ))}
        </ScrollView>
      )}

      {/* 폼 모달 */}
      {showForm && (
        <ProductFormModal
          product={editingProduct}
          institutions={allInstitutions}
          visible={showForm}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingProduct(null); }}
          colors={colors}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    maxWidth: 100,
  },
  filterDropdown: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  filterItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  countRow: { paddingHorizontal: 16, paddingBottom: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  badgeRow: { flexDirection: "row", gap: 4, marginBottom: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "600" },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  cardDesc: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  cardActions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  infoRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  infoBox: { flex: 1, borderRadius: 8, padding: 8 },
  infoLabel: { fontSize: 10, marginBottom: 2 },
  infoValue: { fontSize: 11, fontWeight: "600" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: "500" },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  detailSection: { borderTopWidth: 0.5, marginTop: 8, paddingTop: 8, gap: 8 },
  detailItem: { gap: 2 },
  detailLabel: { fontSize: 11, fontWeight: "500" },
  detailValue: { fontSize: 12, lineHeight: 17 },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "600", marginTop: 14, marginBottom: 6 },
  input: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  picker: { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: "hidden" },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
});
