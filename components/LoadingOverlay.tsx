import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

type Props = {
  visible: boolean;
  message?: string;
};

export function LoadingOverlay({ visible, message = "Thinking..." }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#8A9A86" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(249,246,240,0.88)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    minWidth: 200,
  },
  message: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 15,
    color: "#7B8579",
    textAlign: "center",
    maxWidth: 180,
  },
});
