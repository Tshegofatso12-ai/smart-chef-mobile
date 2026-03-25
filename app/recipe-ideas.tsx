import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import { Shimmer } from "@/components/Shimmer";
import { useAppContext } from "@/context/AppContext";
import type { Recipe } from "@/types";

const COLORS = {
  background: "#F9F6F0",
  foreground: "#2C332A",
  primary: "#059669",
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { isRecipeSaved, toggleSaved } = useAppContext();
  const imageUrl = recipe.imageUrl ?? null;

  return (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/recipe/[id]",
          params: { id: recipe.id, sessionId },
        })
      }
      style={styles.card}
      activeOpacity={0.92}
    >
      {/* ── Hero ── */}
      <View style={styles.cardHero}>
        {/* Gradient always visible as base / fallback */}
        <LinearGradient
          colors={recipe.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Pexels image fades in on load */}
        {!imageError && imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={[StyleSheet.absoluteFillObject, { opacity: imageLoaded ? 1 : 0 }]}
            resizeMode="cover"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}

        {/* Shimmer sweep while image is loading */}
        {!imageLoaded && !imageError && <Shimmer />}

        {/* Dark vignette at bottom so text stays readable */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.35)"]}
          start={{ x: 0.5, y: 0.4 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Diet badge */}
        {recipe.badges[0] && (
          <View style={[styles.heroBadge, { backgroundColor: "rgba(255,255,255,0.22)" }]}>
            <Text style={styles.heroBadgeText}>{recipe.badges[0].label}</Text>
          </View>
        )}

        {/* Chef icon */}
        <View style={styles.heroIcon}>
          <Icon icon="solar:chef-hat-bold" size={28} color="rgba(255,255,255,0.9)" />
        </View>
      </View>

      {imageUrl && (
        <Text style={styles.photoDisclaimer}>Photo is illustrative — not the actual dish</Text>
      )}

      {/* ── Card body ── */}
      <View style={styles.cardBody}>
        {/* Title row: recipe name + bookmark button */}
        <View style={styles.titleRow}>
          <Text style={[styles.cardTitle, { flex: 1, paddingRight: 8 }]} numberOfLines={2}>
            {recipe.title}
          </Text>
          <TouchableOpacity
            onPress={() => toggleSaved(recipe.id, sessionId)}
            style={styles.bookmarkBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              icon={isRecipeSaved(recipe.id) ? "solar:bookmark-bold" : "solar:bookmark-outline"}
              size={18}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {recipe.stats.map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Icon icon={stat.icon} size={14} color={stat.iconColor} />
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* View Recipe — generous hit area */}
        <View style={styles.cardFooter}>
          <Text style={styles.viewText}>View Recipe</Text>
          <View style={styles.viewArrow}>
            <Icon icon="solar:alt-arrow-right-linear" size={15} color={COLORS.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
          <TouchableOpacity onPress={() => router.replace("/")} style={styles.goHomeButton}>
            <Text style={styles.goHomeText}>Go Home</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} activeOpacity={0.7}>
            <Icon icon="solar:alt-arrow-left-linear" size={22} color={COLORS.foreground} />
          </TouchableOpacity>

          <View style={{ alignItems: "center" }}>
            <Text style={styles.headerTitle}>Recipe Ideas</Text>
            <Text style={styles.headerSubtitle}>
              {activeSession.ingredients.length} ingredient
              {activeSession.ingredients.length !== 1 ? "s" : ""}
            </Text>
          </View>

          <TouchableOpacity onPress={() => router.push("/saved")} style={styles.headerButton} activeOpacity={0.7}>
            <Icon icon="solar:bookmark-outline" size={22} color={COLORS.foreground} />
          </TouchableOpacity>
        </View>

        {/* Ingredient chips */}
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHero: {
    height: 180,
    alignItems: "flex-end",
    justifyContent: "space-between",
    padding: 16,
    flexDirection: "row",
    overflow: "hidden",
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: 20,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bookmarkBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(138,154,134,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  cardTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 18,
    color: "#2C332A",
    lineHeight: 24,
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
    gap: 6,
    paddingTop: 4,
  },
  photoDisclaimer: {
    fontSize: 11,
    color: "#7B8579",
    fontStyle: "italic",
    paddingTop: 6,
  },
  viewText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: "#059669",
  },
  viewArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(138,154,134,0.12)",
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "#059669",
  },
  goHomeText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
