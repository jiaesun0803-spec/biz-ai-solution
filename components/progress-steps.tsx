import { useEffect, useState, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface ProgressStep {
  label: string;
  duration: number; // seconds to stay on this step
}

interface ProgressStepsProps {
  isActive: boolean;
  type: "diagnosis" | "business_plan" | "funding_match";
  companyName?: string;
}

const STEPS: Record<string, ProgressStep[]> = {
  diagnosis: [
    { label: "업체 데이터 수집 및 검증 중", duration: 3 },
    { label: "재무 지표 분석 중", duration: 5 },
    { label: "신용 정보 평가 중", duration: 4 },
    { label: "산업 동향 비교 분석 중", duration: 5 },
    { label: "AI 경영진단 초안 작성 중", duration: 8 },
    { label: "차트 데이터 생성 중", duration: 4 },
    { label: "최종 보고서 검토 및 정리 중", duration: 0 },
  ],
  business_plan: [
    { label: "업체 데이터 수집 및 검증 중", duration: 3 },
    { label: "시장 환경 분석 중", duration: 5 },
    { label: "사업 전략 수립 중", duration: 5 },
    { label: "재무 계획 작성 중", duration: 5 },
    { label: "AI 사업계획서 초안 작성 중", duration: 8 },
    { label: "차트 데이터 생성 중", duration: 4 },
    { label: "최종 보고서 검토 및 정리 중", duration: 0 },
  ],
  funding_match: [
    { label: "업체 데이터 수집 및 검증 중", duration: 3 },
    { label: "신용 상태 종합 평가 중", duration: 5 },
    { label: "보증 가능성 예측 중", duration: 5 },
    { label: "정책자금 매칭 알고리즘 실행 중", duration: 6 },
    { label: "기관별 한도 추정 중", duration: 5 },
    { label: "차트 데이터 생성 중", duration: 4 },
    { label: "최종 매칭 결과 정리 중", duration: 0 },
  ],
};

const TYPE_COLORS: Record<string, { primary: string; bg: string; light: string }> = {
  diagnosis: { primary: "#1A3C6E", bg: "#EBF0F7", light: "#C5D4E8" },
  business_plan: { primary: "#059669", bg: "#ECFDF5", light: "#A7F3D0" },
  funding_match: { primary: "#D97706", bg: "#FFFBEB", light: "#FDE68A" },
};

const TYPE_TITLES: Record<string, string> = {
  diagnosis: "경영진단보고서",
  business_plan: "AI 사업계획서",
  funding_match: "AI 정책자금매칭 리포트",
};

export function ProgressSteps({ isActive, type, companyName }: ProgressStepsProps) {
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const steps = STEPS[type] || STEPS.diagnosis;
  const typeColor = TYPE_COLORS[type] || TYPE_COLORS.diagnosis;
  const typeTitle = TYPE_TITLES[type] || "보고서";

  // Reset when activation changes
  useEffect(() => {
    if (isActive) {
      setCurrentStep(0);
      setElapsed(0);
    }
  }, [isActive]);

  // Timer to advance steps
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  // Advance step based on elapsed time
  useEffect(() => {
    if (!isActive) return;
    let accumulatedTime = 0;
    for (let i = 0; i < steps.length; i++) {
      accumulatedTime += steps[i].duration;
      if (elapsed < accumulatedTime || i === steps.length - 1) {
        setCurrentStep(i);
        break;
      }
    }
  }, [elapsed, isActive, steps]);

  // Progress percentage
  const totalDuration = useMemo(() => steps.reduce((sum, s) => sum + s.duration, 0), [steps]);
  const progressPercent = Math.min((elapsed / totalDuration) * 100, 95);

  if (!isActive) return null;

  return (
    <View style={styles.container}>
      {/* Header Card */}
      <View style={[styles.headerCard, { backgroundColor: typeColor.bg }]}>
        <View style={[styles.iconCircle, { backgroundColor: typeColor.primary + "18" }]}>
          <IconSymbol name="sparkles" size={28} color={typeColor.primary} />
        </View>
        <Text style={[styles.headerTitle, { color: typeColor.primary }]}>
          AI {typeTitle} 생성 중
        </Text>
        {companyName && (
          <Text style={[styles.headerSubtitle, { color: typeColor.primary + "99" }]}>
            {companyName}
          </Text>
        )}
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBarContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.progressBarHeader}>
          <Text style={[styles.progressLabel, { color: colors.muted }]}>진행률</Text>
          <Text style={[styles.elapsedText, { color: colors.muted }]}>{elapsed}초 경과</Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: typeColor.light + "40" }]}>
          <View
            style={[
              styles.progressBarFill,
              { backgroundColor: typeColor.primary, width: `${progressPercent}%` },
            ]}
          />
        </View>
      </View>

      {/* Steps List */}
      <View style={[styles.stepsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <View
              key={idx}
              style={[
                styles.stepRow,
                isCurrent && { backgroundColor: typeColor.bg },
                idx < steps.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
              ]}
            >
              {/* Icon */}
              <View style={styles.stepIconContainer}>
                {isCompleted ? (
                  <View style={[styles.stepIconDone, { backgroundColor: typeColor.primary }]}>
                    <IconSymbol name="checkmark" size={10} color="#fff" />
                  </View>
                ) : isCurrent ? (
                  <View style={[styles.stepIconActive, { backgroundColor: typeColor.primary }]} />
                ) : (
                  <View style={[styles.stepIconPending, { backgroundColor: colors.border }]} />
                )}
              </View>

              {/* Label */}
              <Text
                style={[
                  styles.stepLabel,
                  isCompleted && { color: typeColor.primary + "80", textDecorationLine: "line-through" },
                  isCurrent && { color: typeColor.primary, fontWeight: "700" },
                  !isCompleted && !isCurrent && { color: colors.muted },
                ]}
              >
                {step.label}
              </Text>

              {/* Current indicator */}
              {isCurrent && (
                <Text style={[styles.stepStatus, { color: typeColor.primary + "99" }]}>진행 중</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Tip */}
      <Text style={[styles.tipText, { color: colors.muted }]}>
        AI가 분석 중입니다. 보통 20~60초 정도 소요됩니다.{"\n"}화면을 닫지 마세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 14,
  },
  progressBarContainer: {
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  progressBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  elapsedText: {
    fontSize: 12,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  stepsCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  stepIconContainer: {
    width: 20,
    alignItems: "center",
  },
  stepIconDone: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIconActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepIconPending: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepLabel: {
    flex: 1,
    fontSize: 14,
  },
  stepStatus: {
    fontSize: 11,
    fontWeight: "600",
  },
  tipText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
