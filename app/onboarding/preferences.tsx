import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import type { DietFilter } from "@/types";

type FilterDef = {
  id: DietFilter;
  label: string;
  icon: string;
  activeColor: string;
  activeBg: string;
  desc: string;
};

const FILTERS: FilterDef[] = [
  {
    id: "low-fat",
    label: "Low-Fat",
    icon: "solar:leaf-bold",
    activeColor: "#059669",
    activeBg: "rgba(5,150,105,0.08)",
    desc: "Lean proteins, veggies, minimal saturated fats",
  },
  {
    id: "low-carb",
    label: "Low-Carb",
    icon: "solar:bone-bold",
    activeColor: "#DDA77B",
    activeBg: "rgba(221,167,123,0.1)",
    desc: "Limit starchy foods, favour protein and veg",
  },
  {
    id: "high-protein",
    label: "High-Protein",
    icon: "solar:fire-bold",
    activeColor: "#C97A7E",
    activeBg: "rgba(201,122,126,0.08)",
    desc: "Protein-dense ingredients in every dish",
  },
];

export default function PreferencesScreen() {
  const [selected, setSelected] = useState<DietFilter[]>([]);

  const toggle = (id: DietFilter) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleContinue = () =>
    router.push({
      pathname: "/onboarding/allergies",
      params: { preferences: JSON.stringify(selected) },
    });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.progress}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
            ))}
          </View>
          <Text style={styles.step}>Step 1 of 3</Text>
          <Text style={styles.title}>Dietary{"\n"}Preferences</Text>
          <Text style={styles.subtitle}>
            Select all that apply — we'll tailor recipes for you.
          </Text>
        </View>

        {/* Options */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {FILTERS.map((f) => {
            const isSelected = selected.includes(f.id);
            return (
              <Pressable
                key={f.id}
                onPress={() => toggle(f.id)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && {
                    backgroundColor: f.activeBg,
                    borderColor: f.activeColor,
                  },
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <View
                  style={[
                    styles.optionIconBox,
                    isSelected && { backgroundColor: f.activeColor },
                  ]}
                >
                  <Icon
                    icon={f.icon}
                    size={22}
                    color={isSelected ? "#FFFFFF" : "#7B8579"}
                  />
                </View>

                <View style={styles.optionBody}>
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && { color: f.activeColor },
                    ]}
                  >
                    {f.label}
                  </Text>
                  <Text style={styles.optionDesc}>{f.desc}</Text>
                </View>

                <View
                  style={[
                    styles.checkCircle,
                    isSelected && {
                      backgroundColor: f.activeColor,
                      borderColor: f.activeColor,
                    },
                  ]}
                >
                  {isSelected && (
                    <Icon icon="solar:check-read-bold" size={12} color="#FFFFFF" />
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { opacity: pressed ? 0.88 : 1 },
            ]}
            onPress={handleContinue}
          >
            <LinearGradient
              colors={["#34D399", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryGradient}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Icon icon="solar:alt-arrow-right-linear" size={18} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={handleContinue}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F6F0" },
  safe: { flex: 1, paddingHorizontal: 24 },

  header: { paddingTop: 12, paddingBottom: 20 },
  progress: { flexDirection: "row", gap: 6, marginBottom: 20 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#E8E6E1" },
  dotActive: { backgroundColor: "#059669" },
  step: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12,
    color: "#059669",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 32,
    color: "#2C332A",
    lineHeight: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 14,
    color: "#7B8579",
    lineHeight: 20,
  },

  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 8 },

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  optionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F0EFEA",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionBody: {
    flex: 1,
    gap: 3,
  },
  optionLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#2C332A",
  },
  optionDesc: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: "#7B8579",
    lineHeight: 16,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2DFD8",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  footer: { paddingTop: 12, paddingBottom: 8, gap: 4 },
  primaryButton: {
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
  },
  primaryButtonText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  skipButton: { alignItems: "center", paddingVertical: 14 },
  skipText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: "#7B8579",
  },
});
