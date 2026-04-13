import { useRef, useState, useCallback } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform, Alert } from "react-native";
import Svg, { Rect, Circle, Line, G, Text as SvgText, Path } from "react-native-svg";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { ChartData } from "@/shared/types";

const CHART_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#0EA5E9", "#22C55E",
];

interface Props {
  chartData: ChartData;
  accentColor: string;
  sectionTitle?: string;
}

function BarChart({ labels, values, accentColor }: { labels: string[]; values: number[]; accentColor: string }) {
  const width = 300;
  const height = 180;
  const padding = { top: 10, right: 10, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...values, 1);
  const barW = Math.min(chartW / labels.length * 0.65, 40);
  const gap = chartW / labels.length;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((r) => {
        const y = padding.top + chartH * (1 - r);
        return (
          <G key={`g-${r}`}>
            <Line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f3f4f6" strokeWidth={1} />
            <SvgText x={padding.left - 5} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">
              {Math.round(maxVal * r).toLocaleString()}
            </SvgText>
          </G>
        );
      })}
      {values.map((v, i) => {
        const barH = (v / maxVal) * chartH;
        const x = padding.left + gap * i + (gap - barW) / 2;
        const y = padding.top + chartH - barH;
        return (
          <G key={`bar-${i}`}>
            <Rect x={x} y={y} width={barW} height={barH} rx={4} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            <SvgText x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fontWeight="600" fill="#374151">
              {v.toLocaleString()}
            </SvgText>
            <SvgText x={padding.left + gap * i + gap / 2} y={height - padding.bottom + 14} textAnchor="middle" fontSize={8} fill="#6b7280">
              {labels[i].length > 6 ? labels[i].slice(0, 6) + ".." : labels[i]}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function LineChart({ labels, values, accentColor }: { labels: string[]; values: number[]; accentColor: string }) {
  const width = 300;
  const height = 180;
  const padding = { top: 10, right: 10, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...values, 1);
  const gap = chartW / Math.max(labels.length - 1, 1);

  const points = values.map((v, i) => ({
    x: padding.left + gap * i,
    y: padding.top + chartH - (v / maxVal) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((r) => {
        const y = padding.top + chartH * (1 - r);
        return (
          <G key={`g-${r}`}>
            <Line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f3f4f6" strokeWidth={1} />
            <SvgText x={padding.left - 5} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">
              {Math.round(maxVal * r).toLocaleString()}
            </SvgText>
          </G>
        );
      })}
      <Path d={areaPath} fill={`${accentColor}15`} />
      <Path d={linePath} fill="none" stroke={accentColor} strokeWidth={2.5} strokeLinejoin="round" />
      {points.map((p, i) => (
        <G key={`pt-${i}`}>
          <Circle cx={p.x} cy={p.y} r={4} fill={accentColor} stroke="#fff" strokeWidth={2} />
          <SvgText x={p.x} y={p.y - 8} textAnchor="middle" fontSize={9} fontWeight="600" fill="#374151">
            {values[i].toLocaleString()}
          </SvgText>
          <SvgText x={p.x} y={height - padding.bottom + 14} textAnchor="middle" fontSize={8} fill="#6b7280">
            {labels[i].length > 6 ? labels[i].slice(0, 6) + ".." : labels[i]}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

function PieChart({ labels, values, isDoughnut }: { labels: string[]; values: number[]; isDoughnut: boolean }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 70;
  const innerR = isDoughnut ? 40 : 0;
  const total = values.reduce((a, b) => a + b, 0) || 1;

  let startAngle = -Math.PI / 2;
  const slices = values.map((v, i) => {
    const angle = (v / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);

    let d: string;
    if (innerR > 0) {
      const ix1 = cx + innerR * Math.cos(startAngle);
      const iy1 = cy + innerR * Math.sin(startAngle);
      const ix2 = cx + innerR * Math.cos(endAngle);
      const iy2 = cy + innerR * Math.sin(endAngle);
      d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
    } else {
      d = `M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }

    const pct = Math.round((v / total) * 100);
    startAngle = endAngle;
    return { d, color: CHART_COLORS[i % CHART_COLORS.length], label: labels[i], pct };
  });

  return (
    <View style={pieStyles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <Path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth={2} />
        ))}
      </Svg>
      <View style={pieStyles.legend}>
        {slices.map((s, i) => (
          <View key={i} style={pieStyles.legendItem}>
            <View style={[pieStyles.legendDot, { backgroundColor: s.color }]} />
            <Text style={pieStyles.legendText} numberOfLines={1}>
              {s.label} ({s.pct}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const pieStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 12 },
  legend: { flex: 1, gap: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: "#374151", flex: 1 },
});

export function SectionChart({ chartData, accentColor, sectionTitle }: Props) {
  const viewShotRef = useRef<ViewShot>(null);
  const [saving, setSaving] = useState(false);

  const handleSaveChart = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("알림", "웹에서는 PC 버전의 PNG 다운로드를 이용해주세요.");
      return;
    }
    if (!viewShotRef.current?.capture) return;
    setSaving(true);
    try {
      const uri = await viewShotRef.current.capture();
      const fileName = `chart_${(sectionTitle || chartData.title || "chart").replace(/[^a-zA-Z0-9가-힣]/g, "_")}.png`;
      const destUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: destUri });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(destUri, {
          mimeType: "image/png",
          dialogTitle: "차트 이미지 저장",
        });
      } else {
        Alert.alert("완료", "차트 이미지가 저장되었습니다.");
      }
    } catch (e: any) {
      Alert.alert("오류", "차트 이미지 저장에 실패했습니다.");
      console.error("Chart save failed:", e);
    } finally {
      setSaving(false);
    }
  }, [sectionTitle, chartData.title]);

  if (!chartData?.labels?.length || !chartData?.values?.length) return null;

  const { type, title, labels, values } = chartData;

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.header}>
        <Text style={chartStyles.title}>{title}</Text>
        <TouchableOpacity
          onPress={handleSaveChart}
          disabled={saving}
          style={[chartStyles.saveBtn, saving && { opacity: 0.5 }]}
          activeOpacity={0.7}
        >
          <IconSymbol name="square.and.arrow.up" size={14} color="#6b7280" />
          <Text style={chartStyles.saveBtnText}>{saving ? "저장 중..." : "이미지 저장"}</Text>
        </TouchableOpacity>
      </View>
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1, result: "tmpfile" }}>
        <View style={chartStyles.chartArea}>
          {(type === "bar" || type === "line") && <LineChart labels={labels} values={values} accentColor={accentColor} />}
          {(type === "pie" || type === "doughnut") && (
            <PieChart labels={labels} values={values} isDoughnut={type === "doughnut"} />
          )}
        </View>
      </ViewShot>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    flex: 1,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  saveBtnText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
  },
  chartArea: {
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
});
