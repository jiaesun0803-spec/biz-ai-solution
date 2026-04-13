import { useEffect, useState, useRef, useCallback } from "react";
import { StyleSheet, Text, View, Pressable, Animated, Easing, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";

interface SuccessAnimationProps {
  isVisible: boolean;
  type: "diagnosis" | "business_plan" | "funding_match";
  companyName?: string;
  onNavigate: () => void;
}

const TYPE_CONFIG: Record<
  string,
  {
    title: string;
    subtitle: string;
    primary: string;
    bg: string;
    light: string;
  }
> = {
  diagnosis: {
    title: "경영진단보고서 생성 완료!",
    subtitle: "AI가 경영진단보고서를 성공적으로 작성했습니다.",
    primary: "#1A3C6E",
    bg: "#EBF0F7",
    light: "#C5D4E8",
  },
  business_plan: {
    title: "AI 사업계획서 생성 완료!",
    subtitle: "AI 사업계획서가 성공적으로 작성되었습니다.",
    primary: "#059669",
    bg: "#ECFDF5",
    light: "#A7F3D0",
  },
  funding_match: {
    title: "매칭리포트 생성 완료!",
    subtitle: "AI 정책자금매칭 리포트가 성공적으로 작성되었습니다.",
    primary: "#D97706",
    bg: "#FFFBEB",
    light: "#FDE68A",
  },
};

interface Particle {
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
  anim: Animated.Value;
}

function generateParticles(primary: string, light: string): Particle[] {
  const colors = [primary, light, primary + "CC", light + "CC", primary + "88"];
  const particles: Particle[] = [];
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: Math.random() * 100,
      y: -5 - Math.random() * 15,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 6,
      delay: Math.random() * 600,
      anim: new Animated.Value(0),
    });
  }
  return particles;
}

export function SuccessAnimation({ isVisible, type, companyName, onNavigate }: SuccessAnimationProps) {
  const colors = useColors();
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.diagnosis;

  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.5)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [particles, setParticles] = useState<Particle[]>([]);
  const [countdown, setCountdown] = useState(3);

  // Trigger haptic on success
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) {
      fadeIn.setValue(0);
      scaleIn.setValue(0.5);
      checkScale.setValue(0);
      textFade.setValue(0);
      buttonFade.setValue(0);
      setCountdown(3);
      return;
    }

    triggerHaptic();

    // Generate confetti particles
    const newParticles = generateParticles(config.primary, config.light);
    setParticles(newParticles);

    // Animate particles falling
    newParticles.forEach((p) => {
      Animated.timing(p.anim, {
        toValue: 1,
        duration: 1500 + Math.random() * 1000,
        delay: p.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });

    // Main entrance animation sequence
    Animated.sequence([
      // Fade in + scale card
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleIn, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
      // Pop in check icon
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      // Fade in text
      Animated.timing(textFade, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      // Fade in button
      Animated.timing(buttonFade, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for check icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Countdown timer
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-navigate after 3 seconds
    const navTimer = setTimeout(() => {
      onNavigate();
    }, 3000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(navTimer);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeIn,
          transform: [{ scale: scaleIn }],
        },
      ]}
    >
      {/* Confetti particles */}
      <View style={styles.confettiContainer}>
        {particles.map((p, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.particle,
              {
                left: `${p.x}%`,
                backgroundColor: p.color,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                opacity: p.anim.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [1, 0.8, 0],
                }),
                transform: [
                  {
                    translateY: p.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [p.y, 400],
                    }),
                  },
                  {
                    rotate: p.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "720deg"],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* Success Card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Top gradient bar */}
        <View style={[styles.topBar, { backgroundColor: config.primary }]} />

        {/* Check icon */}
        <Animated.View
          style={[
            styles.checkContainer,
            { backgroundColor: config.bg },
            {
              transform: [{ scale: Animated.multiply(checkScale, pulseAnim) }],
            },
          ]}
        >
          <View style={[styles.checkInner, { backgroundColor: config.primary }]}>
            <IconSymbol name="checkmark" size={28} color="#fff" />
          </View>
        </Animated.View>

        {/* Title & subtitle */}
        <Animated.View style={[styles.textContainer, { opacity: textFade }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>{config.title}</Text>
          {companyName && (
            <Text style={[styles.companyText, { color: config.primary }]}>{companyName}</Text>
          )}
          <Text style={[styles.subtitle, { color: colors.muted }]}>{config.subtitle}</Text>
        </Animated.View>

        {/* Navigate button */}
        <Animated.View style={[styles.buttonContainer, { opacity: buttonFade }]}>
          <Pressable
            style={({ pressed }) => [
              styles.navigateButton,
              { backgroundColor: config.primary },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={onNavigate}
          >
            <Text style={styles.navigateButtonText}>보고서 확인하기</Text>
            <IconSymbol name="arrow.right" size={16} color="#fff" />
          </Pressable>

          <Text style={[styles.autoRedirect, { color: colors.muted }]}>
            {countdown > 0 ? `${countdown}초 후 자동으로 이동합니다` : "이동 중..."}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    pointerEvents: "none",
  },
  particle: {
    position: "absolute",
    top: 0,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 28,
  },
  topBar: {
    width: "100%",
    height: 4,
  },
  checkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    marginBottom: 16,
  },
  checkInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
  },
  companyText: {
    fontSize: 14,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  navigateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  navigateButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  autoRedirect: {
    fontSize: 11,
  },
});
