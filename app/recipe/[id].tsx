import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  const { id, sessionId } = useLocalSearchParams<{
    id: string;
    sessionId: string;
  }>();
  const { activeSession, sessions, toggleSaved, isRecipeSaved } =
    useAppContext();
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Resolve recipe: prefer in-memory activeSession, fall back to persisted sessions
  const session =
    activeSession?.id === sessionId
      ? activeSession
      : sessions.find((s) => s.id === sessionId);
  const recipe = session?.recipes.find((r) => r.id === id);

  const isSaved = recipe ? isRecipeSaved(recipe.id) : false;
  const heroHeight = screenHeight * 0.42;

  const handleFavoriteToggle = () => {
    if (!recipe || !session) return;
    toggleSaved(recipe.id, session.id);
  };

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <SafeAreaView
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Icon icon="solar:chef-hat-bold" size={48} color={COLORS.mutedForeground} />
          <Text style={styles.notFoundTitle}>Recipe not found</Text>
          <Text style={styles.notFoundSubtext}>
            This recipe may no longer be available.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero gradient section */}
        <View style={{ height: heroHeight, position: "relative" }}>
          <LinearGradient
            colors={recipe.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: "100%", height: "100%" }}
          />

          {/* Fade to background at bottom */}
          <LinearGradient
            colors={["transparent", "transparent", COLORS.background]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Top nav */}
          <View style={[styles.heroNav, { top: insets.top + 12 }]}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.heroButton,
                {
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Icon
                icon="solar:alt-arrow-left-linear"
                size={22}
                color="#FFFFFF"
              />
            </Pressable>

            <Pressable
              onPress={handleFavoriteToggle}
              style={({ pressed }) => [
                styles.heroButton,
                {
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Icon
                icon={isSaved ? "solar:bookmark-bold" : "solar:bookmark-outline"}
                size={22}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          {/* Recipe info card */}
          <View style={styles.recipeInfoCard}>
            {/* Badges */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              {recipe.badges.map((badge) => (
                <View
                  key={badge.label}
                  style={[styles.pill, { backgroundColor: badge.bg }]}
                >
                  <Text style={[styles.pillText, { color: badge.color }]}>
                    {badge.label}
                  </Text>
                </View>
              ))}
              {isSaved && (
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: "rgba(138,154,134,0.15)" },
                  ]}
                >
                  <Text style={[styles.pillText, { color: COLORS.primary }]}>
                    Saved
                  </Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={styles.recipeTitle}>{recipe.title}</Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              {recipe.stats.map((stat, idx) => (
                <React.Fragment key={stat.label}>
                  {idx > 0 && <View style={styles.statDivider} />}
                  <View style={styles.statItem}>
                    <View style={styles.statIcon}>
                      <Icon
                        icon={stat.icon}
                        size={18}
                        color={stat.iconColor}
                      />
                    </View>
                    <View>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                      <Text style={styles.statValue}>{stat.value}</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={{ paddingHorizontal: 28, marginTop: 24 }}>
          {/* Ingredients */}
          <View style={{ marginBottom: 32 }}>
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

          {/* Preparation */}
          <View style={{ marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Preparation</Text>
              <View style={styles.sectionDot} />
            </View>

            <View style={{ gap: 20 }}>
              {recipe.steps.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = currentStep === stepNumber;
                return (
                  <Pressable
                    key={stepNumber}
                    onPress={() =>
                      setCurrentStep((prev) =>
                        prev === stepNumber ? null : stepNumber
                      )
                    }
                    style={[
                      styles.stepRow,
                      isActive && styles.stepRowActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.stepBadge,
                        isActive && styles.stepBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepNumber,
                          isActive && { color: COLORS.primary },
                        ]}
                      >
                        {stepNumber}
                      </Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Save + Start CTAs */}
        <View style={{ marginTop: 32, paddingHorizontal: 24, gap: 12 }}>
          <Pressable
            onPress={handleFavoriteToggle}
            style={({ pressed }) => [
              styles.saveButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Icon
              icon={isSaved ? "solar:bookmark-bold" : "solar:bookmark-outline"}
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.saveButtonText}>
              {isSaved ? "Saved to My Recipes" : "Save Recipe"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setCurrentStep(1)}
            style={({ pressed }) => [
              styles.ctaButton,
              {
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Icon
              icon="solar:play-circle-bold"
              size={24}
              color={COLORS.background}
            />
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
  recipeInfoCard: {
    position: "absolute",
    bottom: 0,
    left: 24,
    right: 24,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 36,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  recipeTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 18,
    color: "#2C332A",
    lineHeight: 25,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(226,223,216,0.6)",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E2DFD8",
    opacity: 0.5,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8E6E1",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 9,
    color: "#7B8579",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 12,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 12,
    color: "#2C332A",
    lineHeight: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 19,
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
    paddingVertical: 8,
    borderRadius: 16,
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
    padding: 12,
    borderRadius: 16,
  },
  stepRowActive: {
    backgroundColor: "rgba(138,154,134,0.08)",
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#8A9A86",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: "#8A9A86",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  stepBadgeActive: {
    backgroundColor: "rgba(138,154,134,0.15)",
    shadowOpacity: 0,
    elevation: 0,
  },
  stepNumber: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  stepText: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 15,
    color: "rgba(44,51,42,0.85)",
    lineHeight: 22,
    flex: 1,
    paddingTop: 3,
  },
  saveButton: {
    width: "100%",
    height: 52,
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
