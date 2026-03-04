import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import { useAppContext } from "@/context/AppContext";

const COLORS = {
  background: "#F9F6F0",
  foreground: "#2C332A",
  primary: "#8A9A86",
  primaryForeground: "#FFFFFF",
  card: "#FFFFFF",
  muted: "#E8E6E1",
  mutedForeground: "#7B8579",
  border: "#E2DFD8",
};

export default function RecipeCardScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const { activeSession, sessions, toggleSaved, isRecipeSaved } = useAppContext();
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const insets = useSafeAreaInsets();

  const session =
    activeSession?.id === sessionId
      ? activeSession
      : sessions.find((s) => s.id === sessionId);
  const recipe = session?.recipes.find((r) => r.id === id);
  const isSaved = recipe ? isRecipeSaved(recipe.id) : false;

  const handleFavoriteToggle = () => {
    if (!recipe || !session) return;
    toggleSaved(recipe.id, session.id);
  };

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Icon icon="solar:chef-hat-bold" size={48} color={COLORS.mutedForeground} />
        <Text style={styles.notFoundTitle}>Recipe not found</Text>
        <Text style={styles.notFoundSubtext}>This recipe may no longer be available.</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Hero gradient ── */}
        <View style={{ height: 260, position: "relative" }}>
          <LinearGradient
            colors={recipe.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Bottom fade */}
          <LinearGradient
            colors={["transparent", COLORS.background]}
            locations={[0.55, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Nav */}
          <View style={[styles.heroNav, { top: insets.top + 12 }]}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.heroButton, { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            >
              <Icon icon="solar:alt-arrow-left-linear" size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={handleFavoriteToggle}
              style={({ pressed }) => [styles.heroButton, { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            >
              <Icon icon={isSaved ? "solar:bookmark-bold" : "solar:bookmark-outline"} size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* ── Title + Badges ── */}
        <View style={styles.titleSection}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {recipe.badges.map((badge) => (
              <View key={badge.label} style={[styles.pill, { backgroundColor: badge.bg }]}>
                <Text style={[styles.pillText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            ))}
            {isSaved && (
              <View style={[styles.pill, { backgroundColor: "rgba(138,154,134,0.15)" }]}>
                <Text style={[styles.pillText, { color: COLORS.primary }]}>Saved</Text>
              </View>
            )}
          </View>

          <Text style={styles.recipeTitle}>{recipe.title}</Text>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsCard}>
          {recipe.stats.map((stat, idx) => (
            <React.Fragment key={stat.label}>
              {idx > 0 && <View style={styles.statDivider} />}
              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <Icon icon={stat.icon} size={20} color={stat.iconColor} />
                </View>
                <View>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── Ingredients ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <View style={styles.sectionDot} />
          </View>
          <View style={styles.chipWrap}>
            {recipe.ingredients.map((ingredient) => (
              <View key={ingredient} style={styles.chip}>
                <Text style={styles.chipText}>{ingredient}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Preparation ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Preparation</Text>
            <View style={styles.sectionDot} />
          </View>
          <View style={{ gap: 12 }}>
            {recipe.steps.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = currentStep === stepNumber;
              return (
                <Pressable
                  key={stepNumber}
                  onPress={() => setCurrentStep((prev) => prev === stepNumber ? null : stepNumber)}
                  style={[styles.stepRow, isActive && styles.stepRowActive]}
                >
                  <View style={[styles.stepBadge, isActive && styles.stepBadgeActive]}>
                    <Text style={[styles.stepNumber, isActive && { color: COLORS.primary }]}>
                      {stepNumber}
                    </Text>
                  </View>
                  <Text style={[styles.stepText, isActive && { color: COLORS.foreground }]}>{step}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── CTAs ── */}
        <View style={{ marginTop: 8, paddingHorizontal: 24, gap: 12 }}>
          <Pressable
            onPress={handleFavoriteToggle}
            style={({ pressed }) => [styles.saveButton, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Icon icon={isSaved ? "solar:bookmark-bold" : "solar:bookmark-outline"} size={20} color={COLORS.primary} />
            <Text style={styles.saveButtonText}>{isSaved ? "Saved to My Recipes" : "Save Recipe"}</Text>
          </Pressable>

          <Pressable
            onPress={() => setCurrentStep(1)}
            style={({ pressed }) => [styles.ctaButton, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <Icon icon="solar:play-circle-bold" size={24} color={COLORS.background} />
            <Text style={styles.ctaButtonText}>Start Step-by-Step</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroNav: {
    position: "absolute",
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleSection: {
    paddingHorizontal: 28,
    paddingTop: 4,
    paddingBottom: 8,
  },
  recipeTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 26,
    color: "#2C332A",
    lineHeight: 34,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statsCard: {
    marginHorizontal: 24,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E2DFD8",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0EFEA",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 9,
    color: "#7B8579",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 13,
    color: "#2C332A",
  },
  section: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 20,
    color: "#2C332A",
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8A9A86",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chipText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: "#2C332A",
  },
  stepRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
  },
  stepRowActive: {
    backgroundColor: "rgba(138,154,134,0.08)",
    borderColor: "rgba(138,154,134,0.3)",
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#8A9A86",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepBadgeActive: {
    backgroundColor: "rgba(138,154,134,0.15)",
  },
  stepNumber: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  stepText: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 15,
    color: "rgba(44,51,42,0.75)",
    lineHeight: 23,
    flex: 1,
    paddingTop: 4,
  },
  saveButton: {
    width: "100%",
    height: 54,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#8A9A86",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  saveButtonText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#8A9A86",
  },
  ctaButton: {
    width: "100%",
    height: 64,
    borderRadius: 24,
    backgroundColor: "#2C332A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaButtonText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 17,
    color: "#F9F6F0",
  },
  notFoundTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 20,
    color: "#2C332A",
    marginTop: 16,
    marginBottom: 8,
  },
  notFoundSubtext: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 14,
    color: "#7B8579",
    textAlign: "center",
    lineHeight: 20,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#8A9A86",
  },
  backButtonText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
