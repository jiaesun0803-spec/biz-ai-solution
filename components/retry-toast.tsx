import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface RetryToastProps {
  visible: boolean;
  attempt: number;
  maxAttempts: number;
}

/**
 * AI 자동 재시도 시 화면 하단에 토스트 메시지를 표시하는 컴포넌트.
 * visible=true 이면 슬라이드 인, false 이면 슬라이드 아웃.
 */
export function RetryToast({ visible, attempt, maxAttempts }: RetryToastProps) {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 80, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
      <View style={styles.toast}>
        <Text style={styles.icon}>🔄</Text>
        <View style={styles.textWrap}>
          <Text style={styles.title}>AI 응답을 다시 받고 있습니다...</Text>
          <Text style={styles.sub}>
            재시도 {attempt}/{maxAttempts} · 잠시만 기다려 주세요
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 999,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: { fontSize: 20 },
  textWrap: { flex: 1 },
  title: { color: "#f1f5f9", fontSize: 13, fontWeight: "600" },
  sub: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
});
