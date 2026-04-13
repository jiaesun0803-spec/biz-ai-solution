import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { RoadmapData } from "@/shared/types";

interface RoadmapMatrixProps {
  data: RoadmapData;
}

/**
 * 기업 장기 로드맵 컴포넌트 (React Native)
 * 분야별 세로 카드 형태 - 각 카드 안에 연도별 단계를 가로로 나열
 * 텍스트 잘림 없이 모바일에서도 깔끔하게 표시
 */
export function RoadmapMatrix({ data }: RoadmapMatrixProps) {
  if (!data || !data.columns || !data.rows) return null;

  return (
    <View style={styles.container}>
      {/* 연도 헤더 범례 */}
      <View style={styles.legendRow}>
        {data.columns.map((col, i) => (
          <View key={i} style={styles.legendBadge}>
            <Text style={styles.legendText}>{col}</Text>
          </View>
        ))}
      </View>

      {/* 분야별 카드 */}
      {data.rows.map((row, rowIdx) => (
        <View
          key={rowIdx}
          style={[styles.areaCard, { borderColor: row.color + "44" }]}
        >
          {/* 분야 헤더 */}
          <View style={[styles.areaHeader, { backgroundColor: row.color }]}>
            <Text style={styles.areaHeaderText}>{row.area}</Text>
          </View>

          {/* 연도별 셀 가로 배열 */}
          <View style={styles.cellsRow}>
            {row.cells.map((cell, cellIdx) => (
              <View
                key={cellIdx}
                style={[
                  styles.cell,
                  { backgroundColor: row.color + "0D" },
                  cellIdx < row.cells.length - 1 && {
                    borderRightWidth: 1,
                    borderRightColor: row.color + "33",
                  },
                ]}
              >
                {/* 연도 레이블 */}
                <Text style={[styles.yearLabel, { color: row.color + "BB" }]}>
                  {data.columns[cellIdx]}
                </Text>
                {/* 단계명 */}
                <Text
                  style={[
                    styles.phaseLabel,
                    { color: row.color, borderBottomColor: row.color + "33" },
                  ]}
                >
                  {cell.phase}
                </Text>
                {/* 항목 목록 */}
                {cell.items.map((item, itemIdx) => (
                  <View key={itemIdx} style={styles.itemRow}>
                    <View
                      style={[styles.bullet, { backgroundColor: row.color }]}
                    />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  legendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  legendText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  areaCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  areaHeader: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  areaHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  cellsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cell: {
    flex: 1,
    padding: 10,
    alignSelf: "flex-start",
  },
  yearLabel: {
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 4,
  },
  phaseLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 1,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginBottom: 4,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 4,
    flexShrink: 0,
  },
  itemText: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 15,
    flex: 1,
  },
});
