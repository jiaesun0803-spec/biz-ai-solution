import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import * as Api from "@/lib/_core/api";
import { useQueryClient } from "@tanstack/react-query";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth({ autoFetch: true });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const queryClient = useQueryClient();

  // 이미 로그인된 경우 홈으로 이동
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading, router]);

  /**
   * OAuth 콜백 URL에서 세션 토큰/코드를 파싱하여 로그인 처리
   * openAuthSessionAsync가 반환한 URL을 직접 처리 (딥링크 불필요)
   */
  const handleOAuthCallbackUrl = async (callbackUrl: string) => {
    try {
      // 커스텀 스킴(manus*://)은 new URL()로 파싱 불가 → query string 직접 추출
      const queryString = callbackUrl.includes("?") ? callbackUrl.split("?")[1] : "";
      const params = new URLSearchParams(queryString);
      const sessionToken = params.get("sessionToken");
      const code = params.get("code");
      const state = params.get("state");
      const userParam = params.get("user");
      console.log("[Login] OAuth callback URL:", callbackUrl);
      console.log("[Login] Parsed params:", { hasSessionToken: !!sessionToken, hasCode: !!code, hasState: !!state });

      if (sessionToken) {
        await Auth.setSessionToken(sessionToken);
        if (userParam) {
          try {
            const userJson = typeof atob !== "undefined"
              ? atob(userParam)
              : Buffer.from(userParam, "base64").toString("utf-8");
            const userData = JSON.parse(userJson);
            await Auth.setUserInfo({
              id: userData.id,
              openId: userData.openId,
              name: userData.name,
              email: userData.email,
              loginMethod: userData.loginMethod,
              role: userData.role ?? "user",
              status: userData.status ?? "pending",
              lastSignedIn: new Date(userData.lastSignedIn || Date.now()),
            });
          } catch (err) {
            console.error("[Login] Failed to parse user data:", err);
          }
        }
        queryClient.invalidateQueries();
        router.replace("/(tabs)");
        return;
      }

      if (code && state) {
        const result = await Api.exchangeOAuthCode(code, state);
        if (result.sessionToken) {
          await Auth.setSessionToken(result.sessionToken);
          if (result.user) {
            await Auth.setUserInfo({
              id: result.user.id,
              openId: result.user.openId,
              name: result.user.name,
              email: result.user.email,
              loginMethod: result.user.loginMethod,
              role: result.user.role ?? "user",
              status: result.user.status ?? "pending",
              lastSignedIn: new Date(result.user.lastSignedIn || Date.now()),
            });
          }
          queryClient.invalidateQueries();
          router.replace("/(tabs)");
          return;
        }
      }

      throw new Error("로그인 응답에서 세션 정보를 찾을 수 없습니다.");
    } catch (err: any) {
      console.error("[Login] OAuth callback processing error:", err);
      throw err;
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      const callbackUrl = await startOAuthLogin();
      // Web: 리다이렉트됨 (callbackUrl은 null)
      // Native: openAuthSessionAsync가 콜백 URL을 반환
      if (callbackUrl) {
        await handleOAuthCallbackUrl(callbackUrl);
      }
    } catch (e: any) {
      Alert.alert("로그인 오류", e?.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* 로고 영역 */}
        <View style={styles.logoArea}>
          <Image
            source={{ uri: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663522627028/qurEWALgXWmGYXNT.png" }}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.appDesc, { color: colors.muted }]}>
            경영콘설팅 보고서 관리 플랫폼
          </Text>
        </View>

        {/* 기능 소개 */}
        <View style={styles.features}>
          {[
            { icon: "building.2.fill", text: "업체 정보 통합 관리" },
            { icon: "doc.text.fill", text: "AI 경영진단 보고서 자동 생성" },
            { icon: "chart.bar.fill", text: "정책자금 매칭 리포트" },
          ].map((item, idx) => (
            <View key={idx} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + "18" }]}>
                <IconSymbol name={item.icon as any} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* 로그인 버튼 */}
        <View style={styles.loginArea}>
          <Pressable
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
              isLoggingIn && { opacity: 0.6 },
            ]}
            onPress={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <IconSymbol name="person.fill" size={20} color="#fff" />
                <Text style={styles.loginBtnText}>로그인 / 회원가입</Text>
              </>
            )}
          </Pressable>

          <Text style={[styles.loginNote, { color: colors.muted }]}>
            {Platform.OS === "web"
              ? "버튼을 클릭하면 Manus 계정으로 로그인합니다."
              : "버튼을 탭하면 브라우저에서 로그인 페이지가 열립니다."}
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  logoArea: { alignItems: "center", gap: 8 },
  logoImage: {
    width: 220,
    height: 110,
  },
  appDesc: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  features: { gap: 14, paddingHorizontal: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontSize: 15, fontWeight: "500", flex: 1 },
  loginArea: { gap: 14 },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  loginBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  loginNote: { fontSize: 13, textAlign: "center", lineHeight: 18 },
});
