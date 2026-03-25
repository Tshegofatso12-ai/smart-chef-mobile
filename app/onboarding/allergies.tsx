import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/Icon";

type AllergyDef = { id: string; label: string; icon: string };

const ALLERGIES: AllergyDef[] = [
  { id: "gluten", label: "Gluten", icon: "solar:bread-bold" },
  { id: "dairy", label: "Dairy", icon: "solar:cup-hot-bold" },
  { id: "nuts", label: "Nuts", icon: "solar:leaf-bold" },
  { id: "shellfish", label: "Shellfish", icon: "solar:fish-bold" },
  { id: "soy", label: "Soy", icon: "solar:planet-bold" },
  { id: "eggs", label: "Eggs", icon: "solar:sun-bold" },
  { id: "fish", label: "Fish", icon: "solar:swimming-bold" },
  { id: "vegetarian", label: "Vegetarian", icon: "solar:leaf-bold" },
];

export default function AllergiesScreen() {
  const { preferences } = useLocalSearchParams<{ preferences?: string }>();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    router.push({
      pathname: "/onboarding/skill",
      params: {
        preferences,
        allergies: JSON.stringify(selected),
      },
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Progress */}
        <View style={styles.progress}>
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={[styles.dot, step <= 2 && styles.dotActive]}
            />
          ))}
        </View>

        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.title}>Allergies &{"\n"}Restrictions</Text>
        <Text style={styles.subtitle}>
          We'll exclude these from all generated recipes.
        </Text>

        <View style={styles.grid}>
          {ALLERGIES.map((a) => {
            const isSelected = selected.includes(a.id);
            return (
              <Pressable
                key={a.id}
                onPress={() => toggle(a.id)}
                style={({ pressed }) => [
                  styles.chip,
                  isSelected && styles.chipSelected,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Icon
                  icon={a.icon}
                  size={18}
                  color={isSelected ? "#059669" : "#7B8579"}
                />
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {a.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleContinue}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Icon
              icon="solar:alt-arrow-right-linear"
              size={18}
              color="#FFFFFF"
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              { opacity: pressed ? 0.7 : 1 },
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
  safe: { flex: 1, paddingHorizontal: 28 },
  progress: { flexDirection: "row", gap: 6, marginTop: 12, marginBottom: 20 },
  dot: { width: 28, height: 4, borderRadius: 2, backgroundColor: "#E8E6E1" },
  dotActive: { backgroundColor: "#059669" },
  step: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12,
    color: "#059669",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 28,
    color: "#2C332A",
    marginBottom: 6,
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 14,
    color: "#7B8579",
    marginBottom: 28,
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    flex: 1,
    alignContent: "flex-start",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  chipSelected: {
    borderColor: "#059669",
    backgroundColor: "rgba(5,150,105,0.06)",
  },
  chipText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: "#7B8579",
  },
  chipTextSelected: {
    color: "#059669",
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
  primaryButtonText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  skipButton: { alignItems: "center", paddingVertical: 12 },
  skipText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: "#7B8579",
  },
});
