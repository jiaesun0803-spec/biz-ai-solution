// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols → Material Icons mappings
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  // Business / Consulting
  "building.2.fill": "business",
  "doc.text.fill": "description",
  "chart.bar.fill": "bar-chart",
  "gearshape.fill": "settings",
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "pencil": "edit",
  "trash": "delete",
  "trash.fill": "delete",
  "square.and.arrow.up": "share",
  "magnifyingglass": "search",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "person.fill": "person",
  "person.circle.fill": "account-circle",
  "doc.fill": "insert-drive-file",
  "doc.badge.plus": "note-add",
  "list.bullet": "list",
  "clock.fill": "schedule",
  "star.fill": "star",
  "info.circle": "info",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  "ellipsis": "more-horiz",
  "ellipsis.circle": "more-horiz",
  "bell.fill": "notifications",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "wand.and.stars": "auto-fix-high",
  "sparkles": "auto-awesome",
  "briefcase.fill": "work",
  "chart.line.uptrend.xyaxis": "trending-up",
  "lightbulb.fill": "lightbulb",
  "flag.fill": "flag",
  "calendar": "calendar-today",
  "folder.fill": "folder",
  "arrow.clockwise": "refresh",
  "square.and.pencil": "edit-note",
  "target": "gps-fixed",
  "trophy.fill": "emoji-events",
  "archivebox.fill": "inventory",
  "arrow.right.square.fill": "logout",
  // Add-company form icons
  "creditcard.fill": "credit-card",
  "banknote.fill": "attach-money",
  "checkmark.seal.fill": "verified",
  "dollarsign.circle.fill": "monetization-on",
  "note.text": "notes",
  "lock.fill": "lock",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
