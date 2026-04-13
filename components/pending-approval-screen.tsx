import { Text, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface PendingApprovalScreenProps {
  status: "pending" | "rejected";
  userName?: string | null;
}

export function PendingApprovalScreen({ status, userName }: PendingApprovalScreenProps) {
  const colors = useColors();

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: status === "rejected" ? "#FEE2E2" : "#FEF3C7" }]}>
          <Text style={styles.iconText}>{status === "rejected" ? "✕" : "⏳"}</Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {status === "rejected" ? "승인 거절됨" : "승인 대기 중"}
        </Text>

        <Text style={[styles.description, { color: colors.muted }]}>
          {status === "rejected"
            ? "계정 승인이 거절되었습니다.\n관리자에게 문의해주세요."
            : "회원가입이 완료되었습니다.\n관리자의 승인 후 이용하실 수 있습니다."}
        </Text>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>계정</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{userName || "사용자"}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>상태</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: status === "rejected" ? "#FEE2E2" : "#FEF3C7" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: status === "rejected" ? "#DC2626" : "#D97706" },
                ]}
              >
                {status === "rejected" ? "거절됨" : "승인 대기"}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.hint, { color: colors.muted }]}>
          승인이 완료되면 앱을 다시 실행해주세요.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  infoCard: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  hint: {
    fontSize: 12,
    textAlign: "center",
  },
});
