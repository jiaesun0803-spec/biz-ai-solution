/**
 * PdfReviewModal
 *
 * PDF 파싱 결과를 사용자가 검토하고 수정한 뒤 "폼에 적용"할 수 있는 바텀 시트 스타일 모달.
 * - 추출된 필드만 표시 (빈 값은 숨김)
 * - 각 항목을 인라인 TextInput으로 수정 가능
 * - 확인 버튼 → 수정된 데이터를 부모에 콜백
 * - 취소 버튼 → 모달 닫기
 */

import { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// 파싱 결과 타입 (Company 인터페이스와 동일)
export type ParsedCompanyData = {
  name?: string;
  industry?: string;
  businessType?: string;
  businessNumber?: string;
  corporateNumber?: string;
  establishedDate?: string;
  businessPhone?: string;
  employeeCount?: string;
  officeOwnership?: string;
  businessAddress?: string;
  deposit?: string;
  monthlyRent?: string;
  representativeName?: string;
  birthDate?: string;
  contactNumber?: string;
  telecom?: string;
  homeAddress?: string;
  homeOwnership?: string;
  education?: string;
  major?: string;
  career1?: string;
  career2?: string;
  hasFinancialDelinquency?: string;
  hasTaxDelinquency?: string;
  kcbScore?: string;
  niceScore?: string;
  currentYearSales?: string;
  year25Sales?: string;
  year24Sales?: string;
  year23Sales?: string;
  hasExportSales?: string;
  currentYearExport?: string;
  year25Export?: string;
  year24Export?: string;
  year23Export?: string;
  jungJinGong?: string;
  soJinGong?: string;
  sinbo?: string;
  gibo?: string;
  jaedan?: string;
  companyCollateral?: string;
  ceoCredit?: string;
  ceoCollateral?: string;
  hasSMECert?: boolean;
  hasStartupCert?: boolean;
  hasWomenBizCert?: boolean;
  hasInnobiz?: boolean;
  hasVentureCert?: boolean;
  hasRootBizCert?: boolean;
  hasISO?: boolean;
  hasHACCP?: boolean;
  hasPatent?: string;
  patentCount?: string;
  patentDetails?: string;
  hasGovSupport?: string;
  govSupportCount?: string;
  govSupportDetails?: string;
  coreItem?: string;
  salesRoute?: string;
  competitiveness?: string;
  marketStatus?: string;
  targetCustomer?: string;
  revenueModel?: string;
  futurePlan?: string;
  requiredFunding?: string;
  fundingPlanDetail?: string;
  memo?: string;
};

// 섹션별 필드 정의
type FieldDef = {
  key: keyof ParsedCompanyData;
  label: string;
  multiline?: boolean;
};

type SectionDef = {
  title: string;
  icon: string;
  fields: FieldDef[];
};

const SECTIONS: SectionDef[] = [
  {
    title: "기업 현황",
    icon: "building.2.fill",
    fields: [
      { key: "name", label: "업체명" },
      { key: "industry", label: "업종" },
      { key: "businessType", label: "사업자 구분" },
      { key: "businessNumber", label: "사업자번호" },
      { key: "corporateNumber", label: "법인등록번호" },
      { key: "establishedDate", label: "사업개시일" },
      { key: "businessPhone", label: "사업장 전화" },
      { key: "employeeCount", label: "상시근로자 수" },
      { key: "officeOwnership", label: "사업장 임대여부" },
      { key: "businessAddress", label: "사업장 주소" },
      { key: "deposit", label: "보증금(만원)" },
      { key: "monthlyRent", label: "월임대료(만원)" },
    ],
  },
  {
    title: "대표자 정보",
    icon: "person.fill",
    fields: [
      { key: "representativeName", label: "대표자명" },
      { key: "birthDate", label: "생년월일" },
      { key: "contactNumber", label: "연락처" },
      { key: "telecom", label: "통신사" },
      { key: "homeAddress", label: "자택 주소" },
      { key: "homeOwnership", label: "거주지 상태" },
      { key: "education", label: "최종학력" },
      { key: "major", label: "전공" },
      { key: "career1", label: "경력사항 1", multiline: true },
      { key: "career2", label: "경력사항 2", multiline: true },
    ],
  },
  {
    title: "신용정보",
    icon: "creditcard.fill",
    fields: [
      { key: "hasFinancialDelinquency", label: "금융연체여부" },
      { key: "hasTaxDelinquency", label: "세금체납여부" },
      { key: "kcbScore", label: "KCB 신용점수" },
      { key: "niceScore", label: "NICE 신용점수" },
    ],
  },
  {
    title: "매출현황",
    icon: "chart.bar.fill",
    fields: [
      { key: "currentYearSales", label: "금년 매출(만원)" },
      { key: "year25Sales", label: "2025년 매출(만원)" },
      { key: "year24Sales", label: "2024년 매출(만원)" },
      { key: "year23Sales", label: "2023년 매출(만원)" },
      { key: "hasExportSales", label: "수출매출여부" },
      { key: "currentYearExport", label: "금년 수출액(만원)" },
      { key: "year25Export", label: "2025년 수출액(만원)" },
      { key: "year24Export", label: "2024년 수출액(만원)" },
      { key: "year23Export", label: "2023년 수출액(만원)" },
    ],
  },
  {
    title: "부채현황",
    icon: "banknote.fill",
    fields: [
      { key: "jungJinGong", label: "중진공(만원)" },
      { key: "soJinGong", label: "소진공(만원)" },
      { key: "sinbo", label: "신보(만원)" },
      { key: "gibo", label: "기보(만원)" },
      { key: "jaedan", label: "재단(만원)" },
      { key: "companyCollateral", label: "회사담보(만원)" },
      { key: "ceoCredit", label: "대표신용(만원)" },
      { key: "ceoCollateral", label: "대표담보(만원)" },
    ],
  },
  {
    title: "특허 및 정부지원",
    icon: "star.fill",
    fields: [
      { key: "hasPatent", label: "특허 보유여부" },
      { key: "patentCount", label: "특허 건수" },
      { key: "patentDetails", label: "특허 상세내용", multiline: true },
      { key: "hasGovSupport", label: "정부지원 수혜이력" },
      { key: "govSupportCount", label: "수혜 건수" },
      { key: "govSupportDetails", label: "수혜 상세내용", multiline: true },
    ],
  },
  {
    title: "비즈니스 상세",
    icon: "lightbulb.fill",
    fields: [
      { key: "coreItem", label: "핵심 아이템", multiline: true },
      { key: "salesRoute", label: "판매 루트", multiline: true },
      { key: "competitiveness", label: "경쟁력 및 차별성", multiline: true },
      { key: "marketStatus", label: "시장 현황", multiline: true },
      { key: "targetCustomer", label: "타겟 고객", multiline: true },
      { key: "revenueModel", label: "수익 모델", multiline: true },
      { key: "futurePlan", label: "앞으로의 계획", multiline: true },
    ],
  },
  {
    title: "자금 계획",
    icon: "dollarsign.circle.fill",
    fields: [
      { key: "requiredFunding", label: "필요 자금(만원)" },
      { key: "fundingPlanDetail", label: "자금 집행 계획", multiline: true },
    ],
  },
];

// 보유 인증 체크박스 목록
const CERT_FIELDS: { key: keyof ParsedCompanyData; label: string }[] = [
  { key: "hasSMECert", label: "중소기업확인서(소상공인)" },
  { key: "hasStartupCert", label: "창업확인서" },
  { key: "hasWomenBizCert", label: "여성기업확인서" },
  { key: "hasInnobiz", label: "이노비즈" },
  { key: "hasVentureCert", label: "벤처인증" },
  { key: "hasRootBizCert", label: "뿌리기업확인서" },
  { key: "hasISO", label: "ISO인증" },
  { key: "hasHACCP", label: "HACCP인증" },
];

interface PdfReviewModalProps {
  visible: boolean;
  pdfName: string;
  parsedData: ParsedCompanyData;
  onConfirm: (data: ParsedCompanyData) => void;
  onCancel: () => void;
}

export function PdfReviewModal({
  visible,
  pdfName,
  parsedData,
  onConfirm,
  onCancel,
}: PdfReviewModalProps) {
  const colors = useColors();
  const [editData, setEditData] = useState<ParsedCompanyData>(parsedData);
  const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];

  // parsedData가 바뀔 때마다 editData 초기화
  useEffect(() => {
    setEditData(parsedData);
  }, [parsedData]);

  // 슬라이드 인/아웃 애니메이션
  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const updateField = (key: keyof ParsedCompanyData, value: string | boolean) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  // 섹션에서 실제로 값이 있는 필드만 필터링
  const getFilledFields = (fields: FieldDef[]) =>
    fields.filter((f) => {
      const val = parsedData[f.key];
      return val !== undefined && val !== "" && val !== null;
    });

  // 추출된 총 필드 수 계산
  const totalExtracted = (() => {
    let count = 0;
    SECTIONS.forEach((s) =>
      s.fields.forEach((f) => {
        const val = parsedData[f.key];
        if (val !== undefined && val !== "" && val !== null) count++;
      })
    );
    CERT_FIELDS.forEach((f) => {
      if (parsedData[f.key]) count++;
    });
    return count;
  })();

  const activeCerts = CERT_FIELDS.filter((f) => parsedData[f.key]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      {/* 배경 딤 */}
      <Pressable style={styles.backdrop} onPress={onCancel} />

      {/* 바텀 시트 */}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.background, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* 핸들 */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* 헤더 */}
        <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.sheetHeaderLeft}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + "18" }]}>
              <IconSymbol name="doc.fill" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                PDF 파싱 결과 검토
              </Text>
              <Text style={[styles.sheetSubtitle, { color: colors.muted }]} numberOfLines={1}>
                {pdfName} · {totalExtracted}개 항목 추출
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            onPress={onCancel}
          >
            <IconSymbol name="xmark" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* 안내 배너 */}
        <View style={[styles.infoBanner, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <IconSymbol name="info.circle" size={15} color={colors.primary} />
          <Text style={[styles.infoBannerText, { color: colors.primary }]}>
            AI가 추출한 정보입니다. 잘못된 내용은 직접 수정 후 "폼에 적용"을 눌러주세요.
          </Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={20}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* 섹션별 필드 렌더링 */}
            {SECTIONS.map((section) => {
              const filledFields = getFilledFields(section.fields);
              if (filledFields.length === 0) return null;

              return (
                <View key={section.title} style={styles.sectionBlock}>
                  {/* 섹션 타이틀 */}
                  <View style={styles.sectionTitleRow}>
                    <IconSymbol name={section.icon as any} size={14} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                      {section.title}
                    </Text>
                  </View>

                  {/* 필드 목록 */}
                  <View style={[styles.fieldCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {filledFields.map((field, idx) => {
                      const val = editData[field.key];
                      const strVal = typeof val === "boolean" ? (val ? "예" : "아니오") : (val ?? "");
                      return (
                        <View key={field.key}>
                          <View style={[styles.fieldRow, field.multiline && styles.fieldRowMultiline]}>
                            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
                              {field.label}
                            </Text>
                            <TextInput
                              style={[
                                styles.fieldInput,
                                { color: colors.foreground },
                                field.multiline && styles.fieldInputMultiline,
                              ]}
                              value={strVal}
                              onChangeText={(v) => updateField(field.key, v)}
                              multiline={field.multiline}
                              numberOfLines={field.multiline ? 3 : 1}
                              textAlignVertical={field.multiline ? "top" : "center"}
                              returnKeyType="next"
                            />
                          </View>
                          {idx < filledFields.length - 1 && (
                            <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {/* 보유 인증 (체크박스) */}
            {activeCerts.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <IconSymbol name="checkmark.seal.fill" size={14} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>보유 인증</Text>
                </View>
                <View style={[styles.fieldCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.certGrid}>
                    {activeCerts.map((cert) => {
                      const isChecked = !!editData[cert.key];
                      return (
                        <Pressable
                          key={cert.key}
                          style={({ pressed }) => [styles.certItem, pressed && { opacity: 0.7 }]}
                          onPress={() => updateField(cert.key, !isChecked)}
                        >
                          <View style={[
                            styles.certCheckbox,
                            { borderColor: isChecked ? colors.primary : colors.border },
                            isChecked && { backgroundColor: colors.primary },
                          ]}>
                            {isChecked && <IconSymbol name="checkmark" size={11} color="#fff" />}
                          </View>
                          <Text style={[styles.certLabel, { color: colors.foreground }]}>
                            {cert.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* 하단 버튼 */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelBtn,
              { borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
            onPress={onCancel}
          >
            <Text style={[styles.cancelBtnText, { color: colors.muted }]}>취소</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => onConfirm(editData)}
          >
            <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
            <Text style={styles.confirmBtnText}>폼에 적용</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.88,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  sheetHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: { fontSize: 16, fontWeight: "700" },
  sheetSubtitle: { fontSize: 12, marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoBannerText: { fontSize: 12, lineHeight: 17, flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  // 섹션
  sectionBlock: { marginBottom: 14 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  sectionTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },
  fieldCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },

  // 필드 행
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    minHeight: 46,
  },
  fieldRowMultiline: { alignItems: "flex-start", paddingTop: 12 },
  fieldLabel: { fontSize: 13, width: 100, flexShrink: 0 },
  fieldInput: { flex: 1, fontSize: 14, fontWeight: "500" },
  fieldInputMultiline: { minHeight: 56, paddingTop: 2 },
  fieldDivider: { height: 0.5, marginLeft: 14 },

  // 인증 체크박스
  certGrid: { paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  certItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  certCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  certLabel: { fontSize: 14 },

  // 하단 버튼
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: 0.5,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  confirmBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
