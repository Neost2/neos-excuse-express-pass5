import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { C } from "@/constants/theme";
export const Card = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => <View style={[s.card, style]}>{children}</View>;
export const Btn = ({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) => (
  <Pressable
    disabled={disabled}
    onPress={onPress}
    style={[s.btn, secondary && s.secondary, disabled && { opacity: 0.45 }]}
  >
    <Text style={s.bt}>{title}</Text>
  </Pressable>
);
export const Label = ({ children }: { children: React.ReactNode }) => (
  <Text style={s.label}>{children}</Text>
);
const s = StyleSheet.create({
  card: {
    backgroundColor: C.panel,
    borderRadius: 18,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "#24486d",
  },
  btn: {
    backgroundColor: C.cyan,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  secondary: {
    backgroundColor: C.panel2,
    borderWidth: 1,
    borderColor: "#35618c",
  },
  bt: { color: C.bg, fontWeight: "900", fontSize: 16 },
  label: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
