import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";

type AllergyDef = { id: string; label: string; emoji: string };

const ALLERGIES: AllergyDef[] = [
  { id: "gluten", label: "Gluten", emoji: "🌾" },
  { id: "dairy", label: "Dairy", emoji: "🥛" },
  { id: "nuts", label: "Nuts", emoji: "🥜" },
  { id: "shellfish", label: "Shellfish", emoji: "🦐" },
  { id: "soy", label: "Soy", emoji: "🫘" },
  { id: "eggs", label: "Eggs", emoji: "🥚" },
  { id: "fish", label: "Fish", emoji: "🐟" },
  { id: "vegetarian", label: "Vegetarian", emoji: "🥗" },
];

export default function AllergiesScreen() {
  const { preferences } = useLocalSearchParams<{ preferences?: string }>();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleContinue = () =>
    router.push({
      pathname: "/onboarding/skill",
      params: { preferences, allergies: JSON.stringify(selected) },
    });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.progress}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.dot, i <= 1 && styles.dotActive]}
              />
            ))}
          </View>
          <Text style={styles.step}>Step 2 of 3</Text>
          <Text style={styles.title}>Allergies &{"\n"}Restrictions</Text>
          <Text style={styles.subtitle}>
            We'll exclude these from all generated recipes.
          </Text>
        </View>

        {/* Grid */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
                  <Text style={styles.chipEmoji}>{a.emoji}</Text>
                  <Text
                    style={[
                      styles.chipLabel,
                      isSelected && styles.chipLabelSelected,
                    ]}
                  >
                    {a.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.chipCheck}>
                      <Icon icon="solar:check-read-bold" size={10} color="#059669" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {selected.length > 0 && (
            <View style={styles.selectedNote}>
              <Icon icon="solar:info-circle-bold" size={14} color="#059669" />
              <Text style={styles.selectedNoteText}>
                {selected.length} restriction{selected.length > 1 ? "s" : ""} selected
              </Text>
            </View>
          )}
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
            <Text style={styles.skipText}>No restrictions</Text>
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
  scrollContent: { paddingBottom: 8 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2DFD8",
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
  chipEmoji: {
    fontSize: 16,
  },
  chipLabel: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: "#2C332A",
  },
  chipLabelSelected: {
    color: "#059669",
  },
  chipCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(5,150,105,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  selectedNoteText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: "#059669",
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
