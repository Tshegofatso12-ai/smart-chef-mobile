import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import { useAppContext } from "@/context/AppContext";
import type { Recipe } from "@/types";

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

function RecipeIdeaCard({
  recipe,
  sessionId,
}: {
  recipe: Recipe;
  sessionId: string;
}) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/recipe/[id]",
          params: { id: recipe.id, sessionId },
        })
      }
      style={({ pressed }) => [
        styles.card,
        { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {/* Gradient hero */}
      <LinearGradient
        colors={recipe.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardHero}
      >
        {/* Diet badge */}
        {recipe.badges[0] && (
          <View style={[styles.heroBadge, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
            <Text style={styles.heroBadgeText}>{recipe.badges[0].label}</Text>
          </View>
        )}
        {/* Chef hat icon */}
        <View style={styles.heroIcon}>
          <Icon icon="solar:chef-hat-bold" size={32} color="rgba(255,255,255,0.9)" />
        </View>
      </LinearGradient>

      {/* Card body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {recipe.stats.map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Icon icon={stat.icon} size={14} color={stat.iconColor} />
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* View recipe arrow */}
        <View style={styles.cardFooter}>
          <Text style={styles.viewText}>View Recipe</Text>
          <Icon icon="solar:alt-arrow-right-linear" size={16} color={COLORS.primary} />
        </View>
      </View>
    </Pressable>
  );
}

export default function RecipeIdeasScreen() {
  const { activeSession } = useAppContext();

  if (!activeSession) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Icon icon="solar:chef-hat-bold" size={48} color={COLORS.mutedForeground} />
          <Text style={styles.emptyTitle}>No recipes yet</Text>
          <Text style={styles.emptySubtext}>
            Go back to the ingredient tray and tap Generate Recipe.
          </Text>
          <Pressable
            onPress={() => router.replace("/")}
            style={styles.goHomeButton}
          >
            <Text style={styles.goHomeText}>Go Home</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Icon icon="solar:alt-arrow-left-linear" size={22} color={COLORS.foreground} />
          </Pressable>

          <View style={{ alignItems: "center" }}>
            <Text style={styles.headerTitle}>Recipe Ideas</Text>
            <Text style={styles.headerSubtitle}>
              {activeSession.ingredients.length} ingredient
              {activeSession.ingredients.length !== 1 ? "s" : ""}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/saved")}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Icon icon="solar:bookmark-outline" size={22} color={COLORS.foreground} />
          </Pressable>
        </View>

        {/* Ingredient chips row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingBottom: 4 }}
          style={{ flexGrow: 0, marginBottom: 8 }}
        >
          {activeSession.ingredients.map((ing) => (
            <View key={ing.id} style={styles.ingChip}>
              <Text style={styles.ingChipText}>{ing.name}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Recipe cards */}
        <ScrollView
          contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {activeSession.recipes.map((recipe) => (
            <RecipeIdeaCard
              key={recipe.id}
              recipe={recipe}
              sessionId={activeSession.id}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F6F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.6)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  headerTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 18,
    color: "#2C332A",
  },
  headerSubtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 11,
    color: "#7B8579",
    marginTop: 1,
  },
  ingChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.7)",
  },
  ingChipText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12,
    color: "#2C332A",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHero: {
    height: 160,
    alignItems: "flex-end",
    justifyContent: "space-between",
    padding: 16,
    flexDirection: "row",
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  heroBadgeText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10,
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 17,
    color: "#2C332A",
    lineHeight: 23,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statValue: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12,
    color: "#7B8579",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: "#8A9A86",
  },
  emptyTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 20,
    color: "#2C332A",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 14,
    color: "#7B8579",
    textAlign: "center",
    lineHeight: 20,
  },
  goHomeButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#8A9A86",
  },
  goHomeText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
