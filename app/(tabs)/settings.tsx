import { useState, useEffect } from "react";
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
import { trpc } from "@/lib/trpc";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useData } from "@/lib/data-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

export default function SettingsScreen() {
  const colors = useColors();
  const { profile, updateProfile, companies, reports } = useData();
  const colorScheme = useColorScheme();
  const router = useRouter();

  const { user, isAuthenticated, logout } = useAuth({ autoFetch: true });
  const [isEditing, setIsEditing] = useState(false);

  // Gemini API 키 상태
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [maskedGeminiKey, setMaskedGeminiKey] = useState<string | null>(null);
  const [geminiKeySaving, setGeminiKeySaving] = useState(false);

  const geminiKeyQuery = trpc.auth.getGeminiApiKey.useQuery(undefined, { retry: false });
  const saveGeminiKeyMutation = trpc.auth.saveGeminiApiKey.useMutation();

  useEffect(() => {
    if (geminiKeyQuery.data) {
      setHasGeminiKey(geminiKeyQuery.data.hasKey);
      setMaskedGeminiKey(geminiKeyQuery.data.maskedKey);
    }
  }, [geminiKeyQuery.data]);

  const handleSaveGeminiKey = async () => {
    if (!geminiKeyInput.trim()) return;
    if (!geminiKeyInput.trim().startsWith('AIza')) {
      Alert.alert('오류', 'Gemini API 키는 AIza로 시작해야 합니다.');
      return;
    }
    setGeminiKeySaving(true);
    try {
      await saveGeminiKeyMutation.mutateAsync({ apiKey: geminiKeyInput.trim() });
      setHasGeminiKey(true);
      const masked = geminiKeyInput.length > 8 ? geminiKeyInput.slice(0, 8) + '...' + geminiKeyInput.slice(-4) : '***';
      setMaskedGeminiKey(masked);
      setGeminiKeyInput('');
      Alert.alert('저장 완료', 'Gemini API 키가 저장되었습니다.');
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? 'Gemini API 키 저장에 실패했습니다.');
    } finally {
      setGeminiKeySaving(false);
    }
  };

  const handleDeleteGeminiKey = async () => {
    Alert.alert('삭제 확인', '저장된 Gemini API 키를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setGeminiKeySaving(true);
          try {
            await saveGeminiKeyMutation.mutateAsync({ apiKey: null });
            setHasGeminiKey(false);
            setMaskedGeminiKey(null);
            setGeminiKeyInput('');
          } catch (e: any) {
            Alert.alert('오류', e?.message ?? 'Gemini API 키 삭제에 실패했습니다.');
          } finally {
            setGeminiKeySaving(false);
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert(
      "로그아웃",
      "로그아웃 하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "로그아웃",
          style: "destructive",
          onPress: async () => {
            await logout();
            if (Platform.OS !== "web") {
              router.replace("/login");
            }
          },
        },
      ]
    );
  };
  const [name, setName] = useState(profile.name);
  const [company, setCompany] = useState(profile.company);
  const [title, setTitle] = useState(profile.title);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);

  const handleSave = async () => {
    await updateProfile({ name, company, title, phone, email });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(profile.name);
    setCompany(profile.company);
    setTitle(profile.title);
    setPhone(profile.phone);
    setEmail(profile.email);
    setIsEditing(false);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>설정</Text>
          {isEditing ? (
            <View style={styles.editActions}>
              <Pressable
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                onPress={handleCancel}
              >
                <Text style={[styles.cancelText, { color: colors.muted }]}>취소</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>저장</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              onPress={() => setIsEditing(true)}
            >
              <IconSymbol name="pencil" size={20} color={colors.primary} />
            </Pressable>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
            <View style={[styles.profileAvatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <IconSymbol name="person.fill" size={28} color="#fff" />
            </View>
            <Text style={styles.profileName}>{profile.name || "이름 없음"}</Text>
            <Text style={styles.profileTitle}>{profile.title}</Text>
            {profile.company && (
              <Text style={styles.profileCompany}>{profile.company}</Text>
            )}
          </View>

          {/* Profile Fields */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>컨설턴트 정보</Text>
            <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[
                { label: "이름", value: name, setter: setName, placeholder: "이름을 입력하세요", keyboardType: "default" as const },
                { label: "직함", value: title, setter: setTitle, placeholder: "예: 수석 컨설턴트", keyboardType: "default" as const },
                { label: "회사명", value: company, setter: setCompany, placeholder: "소속 회사명", keyboardType: "default" as const },
                { label: "연락처", value: phone, setter: setPhone, placeholder: "010-0000-0000", keyboardType: "phone-pad" as const },
                { label: "이메일", value: email, setter: setEmail, placeholder: "이메일 주소", keyboardType: "email-address" as const },
              ].map((field, idx, arr) => (
                <View key={field.label}>
                  <View style={styles.inputRow}>
                    <Text style={[styles.inputLabel, { color: colors.foreground }]}>{field.label}</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.inputField, { color: colors.foreground }]}
                        value={field.value}
                        onChangeText={field.setter}
                        placeholder={field.placeholder}
                        placeholderTextColor={colors.muted}
                        keyboardType={field.keyboardType}
                        returnKeyType="next"
                      />
                    ) : (
                      <Text style={[styles.inputValue, { color: field.value ? colors.foreground : colors.muted }]}>
                        {field.value || field.placeholder}
                      </Text>
                    )}
                  </View>
                  {idx < arr.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Stats */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>사용 현황</Text>
            <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{companies.length}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>관리 업체</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: "#1A3C6E" }]}>
                  {reports.filter((r) => r.type === "diagnosis").length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>경영진단</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: "#27AE60" }]}>
                  {reports.filter((r) => r.type === "business_plan").length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>AI 사업계획서</Text>
              </View>
            </View>
          </View>

          {/* Gemini API 키 설정 */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={[styles.sectionLabel, { color: colors.muted, marginBottom: 0 }]}>Google Gemini API 키</Text>
              {!hasGeminiKey && (
                <View style={{ backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>⚠ 필수 설정</Text>
                </View>
              )}
            </View>
            {/* 미등록 경고 배너 */}
            {!hasGeminiKey && (
              <View style={{ backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#C2410C', marginBottom: 4 }}>🔑 AI 보고서 생성을 위해 API 키 등록이 필요합니다</Text>
                <Text style={{ fontSize: 12, color: '#92400E', lineHeight: 18 }}>
                  Gemini API 키가 없으면 경영진단보고서, AI사업계획서, AI정책자금매칭 생성이 불안정할 수 있습니다.{"\n"}
                  키는 무료로 발급 가능합니다. (1분 소요)
                </Text>
              </View>
            )}
            <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: hasGeminiKey ? colors.border : '#FED7AA', borderWidth: hasGeminiKey ? 1 : 1.5 }]}>
              <View style={{ padding: 14 }}>
                <Text style={{ fontSize: 13, color: '#1A56DB', marginBottom: 8, lineHeight: 18 }}>
                  📌 발급 방법: aistudio.google.com/apikey 접속 → "Create API key" 클릭 → 복사{"\n"}
                  (AIzaSy...로 시작하는 키를 아래에 붙여넣으세요)
                </Text>
                {hasGeminiKey && maskedGeminiKey && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: 10, backgroundColor: colors.border + '33', borderRadius: 8 }}>
                    <Text style={{ fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: colors.foreground }}>{maskedGeminiKey}</Text>
                    <Pressable
                      onPress={handleDeleteGeminiKey}
                      style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                    >
                      <Text style={{ fontSize: 13, color: colors.error }}>삭제</Text>
                    </Pressable>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={[{ flex: 1, fontSize: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: colors.foreground, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}
                    value={geminiKeyInput}
                    onChangeText={setGeminiKeyInput}
                    placeholder="AIzaSy..."
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showGeminiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                  <Pressable
                    onPress={() => setShowGeminiKey(v => !v)}
                    style={({ pressed }) => [{ padding: 8 }, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={{ fontSize: 12, color: colors.primary }}>{showGeminiKey ? '숨김' : '표시'}</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={handleSaveGeminiKey}
                  disabled={geminiKeySaving || !geminiKeyInput.trim()}
                  style={({ pressed }) => [{
                    backgroundColor: geminiKeySaving || !geminiKeyInput.trim() ? colors.muted : colors.primary,
                    borderRadius: 10,
                    paddingVertical: 10,
                    alignItems: 'center',
                  }, pressed && { opacity: 0.8 }]}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                    {geminiKeySaving ? '저장 중...' : hasGeminiKey ? 'Gemini 키 교체' : 'Gemini API 키 저장'}
                  </Text>
                </Pressable>
                {hasGeminiKey && (
                  <Text style={{ fontSize: 12, color: '#27AE60', marginTop: 6, textAlign: 'center' }}>✓ Gemini API 키 등록됨</Text>
                )}
              </View>
            </View>
          </View>

          {/* 관리 메뉴 */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>관리</Text>
            <Pressable
              onPress={() => router.push("/product-management" as any)}
              style={({ pressed }) => [
                styles.infoCard,
                { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <IconSymbol name="archivebox.fill" size={20} color={colors.primary} />
                <Text style={{ fontSize: 15, fontWeight: "500", color: colors.foreground }}>정책자금 상품 관리</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          </View>

          {/* 계정 */}
          {isAuthenticated && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>계정</Text>
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.foreground }]}>이름</Text>
                  <Text style={[styles.infoValue, { color: colors.muted }]}>{user?.name || "-"}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.foreground }]}>이메일</Text>
                  <Text style={[styles.infoValue, { color: colors.muted }]}>{user?.email || "-"}</Text>
                </View>
              </View>
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.infoCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <IconSymbol name="arrow.right.square.fill" size={20} color={colors.error} />
                  <Text style={{ fontSize: 15, fontWeight: "500", color: colors.error }}>로그아웃</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
            </View>
          )}

          {/* App Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>앱 정보</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.foreground }]}>앱 이름</Text>
                <Text style={[styles.infoValue, { color: colors.muted }]}>BizConsult</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.foreground }]}>버전</Text>
                <Text style={[styles.infoValue, { color: colors.muted }]}>1.0.0</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.foreground }]}>AI 엔진</Text>
                <Text style={[styles.infoValue, { color: colors.muted }]}>Gemini 2.5 Flash</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  editActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  cancelText: { fontSize: 16 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  content: { paddingBottom: 40 },
  profileCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  profileName: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 4 },
  profileTitle: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 2 },
  profileCompany: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  inputGroup: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  inputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  inputLabel: { fontSize: 15, fontWeight: "500", width: 60 },
  inputField: { flex: 1, fontSize: 15 },
  inputValue: { flex: 1, fontSize: 15 },
  divider: { height: 0.5, marginLeft: 14 },
  statsCard: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    padding: 16,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 0.5, marginVertical: 4 },
  infoCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 13 },
  infoLabel: { fontSize: 15 },
  infoValue: { fontSize: 14 },
});
