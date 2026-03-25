import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
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

  const toggle = (id: DietFilter) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    router.push({
      pathname: "/onboarding/allergies",
      params: { preferences: JSON.stringify(selected) },
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Progress indicator */}
        <View style={styles.progress}>
          {[1, 2, 3].map((step) => (
            <View key={step} style={[styles.dot, step === 1 && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.step}>Step 1 of 3</Text>
        <Text style={styles.title}>Dietary Preferences</Text>
        <Text style={styles.subtitle}>Select all that apply — we'll tailor recipes for you.</Text>

        <View style={styles.options}>
          {FILTERS.map((f) => {
            const isSelected = selected.includes(f.id);
            return (
              <Pressable
                key={f.id}
                onPress={() => toggle(f.id)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && { backgroundColor: f.activeBg, borderColor: f.activeColor },
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <View style={[styles.optionIcon, isSelected && { backgroundColor: f.activeColor }]}>
                  <Icon icon={f.icon} size={22} color={isSelected ? "#FFFFFF" : "#7B8579"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, isSelected && { color: f.activeColor }]}>
                    {f.label}
                  </Text>
                  <Text style={styles.optionDesc}>{f.desc}</Text>
                </View>
                <View style={[styles.check, isSelected && { backgroundColor: f.activeColor, borderColor: f.activeColor }]}>
                  {isSelected && <Icon icon="solar:check-read-bold" size={14} color="#FFFFFF" />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleContinue}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Icon icon="solar:alt-arrow-right-linear" size={18} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.skipButton, { opacity: pressed ? 0.7 : 1 }]}
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
  safe: { flex: 1, paddingHorizontal: 28 },
  progress: { flexDirection: "row", gap: 6, marginTop: 12, marginBottom: 20 },
  dot: { width: 28, height: 4, borderRadius: 2, backgroundColor: "#E8E6E1" },
  dotActive: { backgroundColor: "#059669" },
  step: { fontFamily: "NunitoSans_600SemiBold", fontSize: 12, color: "#059669", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontFamily: "NunitoSans_800ExtraBold", fontSize: 28, color: "#2C332A", marginBottom: 6 },
  subtitle: { fontFamily: "NunitoSans_400Regular", fontSize: 14, color: "#7B8579", marginBottom: 28, lineHeight: 20 },
  options: { gap: 12, flex: 1 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F0EFEA",
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: { fontFamily: "NunitoSans_700Bold", fontSize: 15, color: "#2C332A", marginBottom: 2 },
  optionDesc: { fontFamily: "NunitoSans_400Regular", fontSize: 12, color: "#7B8579" },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2DFD8",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { paddingBottom: 16, gap: 8, marginTop: 20 },
  primaryButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: { fontFamily: "NunitoSans_800ExtraBold", fontSize: 16, color: "#FFFFFF" },
  skipButton: { alignItems: "center", paddingVertical: 12 },
  skipText: { fontFamily: "NunitoSans_600SemiBold", fontSize: 14, color: "#7B8579" },
});
