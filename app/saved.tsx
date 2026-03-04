import React, { useState } from "react";
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
import type { Recipe, RecipeSession } from "@/types";

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

type Tab = "saved" | "history";

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function RecipeRow({
  recipe,
  sessionId,
  isSaved,
}: {
  recipe: Recipe;
  sessionId: string;
  isSaved?: boolean;
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
        styles.recipeRow,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {/* Gradient mini swatch */}
      <LinearGradient
        colors={recipe.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.rowSwatch}
      />

      {/* Info */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {recipe.title}
        </Text>
        <View style={styles.rowMeta}>
          {recipe.badges[0] && (
            <View
              style={[
                styles.rowBadge,
                { backgroundColor: recipe.badges[0].bg },
              ]}
            >
              <Text
                style={[styles.rowBadgeText, { color: recipe.badges[0].color }]}
              >
                {recipe.badges[0].label}
              </Text>
            </View>
          )}
          <Text style={styles.rowStat}>{recipe.cookTime}</Text>
          <Text style={styles.rowStat}>·</Text>
          <Text style={styles.rowStat}>{recipe.calories}</Text>
        </View>
      </View>

      {/* Arrow + saved indicator */}
      <View style={{ alignItems: "center", gap: 4 }}>
        {isSaved && (
          <Icon icon="solar:bookmark-bold" size={14} color={COLORS.primary} />
        )}
        <Icon
          icon="solar:alt-arrow-right-linear"
          size={18}
          color={COLORS.mutedForeground}
        />
      </View>
    </Pressable>
  );
}

export default function SavedScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("saved");
  const { savedRecipeIds, sessions, isRecipeSaved } = useAppContext();

  // ─── Saved tab data ──────────────────────────────────────────────────────
  const savedEntries = savedRecipeIds
    .map((entry) => {
      const session = sessions.find((s) => s.id === entry.sessionId);
      const recipe = session?.recipes.find((r) => r.id === entry.recipeId);
      return recipe && session ? { recipe, session, savedAt: entry.savedAt } : null;
    })
    .filter(
      (x): x is { recipe: Recipe; session: RecipeSession; savedAt: number } =>
        x !== null
    );

  // ─── History tab data ───────────────────────────────────────────────────
  // sessions is already newest-first
  const historyGroups = sessions.map((session) => ({
    session,
    label: formatDate(session.createdAt),
  }));

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.headerButton,
              {
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <Icon
              icon="solar:alt-arrow-left-linear"
              size={22}
              color={COLORS.foreground}
            />
          </Pressable>

          <Text style={styles.headerTitle}>My Recipes</Text>

          <View style={{ width: 40 }} />
        </View>

        {/* Tab switcher */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab("saved")}
            style={[styles.tab, activeTab === "saved" && styles.tabActive]}
          >
            <Icon
              icon="solar:bookmark-bold"
              size={16}
              color={activeTab === "saved" ? COLORS.primaryForeground : COLORS.mutedForeground}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "saved" && styles.tabLabelActive,
              ]}
            >
              Saved
            </Text>
            {savedEntries.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{savedEntries.length}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("history")}
            style={[styles.tab, activeTab === "history" && styles.tabActive]}
          >
            <Icon
              icon="solar:history-bold"
              size={16}
              color={activeTab === "history" ? COLORS.primaryForeground : COLORS.mutedForeground}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "history" && styles.tabLabelActive,
              ]}
            >
              History
            </Text>
            {sessions.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{sessions.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Tab content */}
        {activeTab === "saved" ? (
          <ScrollView
            contentContainerStyle={styles.tabContent}
            showsVerticalScrollIndicator={false}
          >
            {savedEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon
                  icon="solar:bookmark-outline"
                  size={48}
                  color={COLORS.mutedForeground}
                />
                <Text style={styles.emptyTitle}>No saved recipes yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap the save button on any recipe to bookmark it here.
                </Text>
                <Pressable
                  onPress={() => router.replace("/")}
                  style={styles.goButton}
                >
                  <Text style={styles.goButtonText}>Generate a Recipe</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.listCard}>
                {savedEntries.map(({ recipe, session }, idx) => (
                  <React.Fragment key={recipe.id}>
                    {idx > 0 && <View style={styles.divider} />}
                    <RecipeRow
                      recipe={recipe}
                      sessionId={session.id}
                      isSaved
                    />
                  </React.Fragment>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.tabContent}
            showsVerticalScrollIndicator={false}
          >
            {historyGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon
                  icon="solar:history-bold"
                  size={48}
                  color={COLORS.mutedForeground}
                />
                <Text style={styles.emptyTitle}>No history yet</Text>
                <Text style={styles.emptySubtext}>
                  Generate your first recipe and it'll appear here.
                </Text>
                <Pressable
                  onPress={() => router.replace("/")}
                  style={styles.goButton}
                >
                  <Text style={styles.goButtonText}>Get Started</Text>
                </Pressable>
              </View>
            ) : (
              historyGroups.map(({ session, label }) => (
                <View key={session.id} style={{ gap: 8 }}>
                  {/* Session date header */}
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionLabel}>{label}</Text>
                    <Text style={styles.sessionCount}>
                      {session.recipes.length} recipe
                      {session.recipes.length !== 1 ? "s" : ""}
                    </Text>
                  </View>

                  {/* Ingredient chips */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
                    style={{ flexGrow: 0 }}
                  >
                    {session.ingredients.slice(0, 6).map((ing) => (
                      <View key={ing.id} style={styles.ingChip}>
                        <Text style={styles.ingChipText}>{ing.name}</Text>
                      </View>
                    ))}
                    {session.ingredients.length > 6 && (
                      <View style={styles.ingChip}>
                        <Text style={styles.ingChipText}>
                          +{session.ingredients.length - 6}
                        </Text>
                      </View>
                    )}
                  </ScrollView>

                  {/* Recipe rows */}
                  <View style={styles.listCard}>
                    {session.recipes.map((recipe, idx) => (
                      <React.Fragment key={recipe.id}>
                        {idx > 0 && <View style={styles.divider} />}
                        <RecipeRow
                          recipe={recipe}
                          sessionId={session.id}
                          isSaved={isRecipeSaved(recipe.id)}
                        />
                      </React.Fragment>
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
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
    fontSize: 19,
    color: "#2C332A",
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 24,
    backgroundColor: "#E8E6E1",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: "#8A9A86",
    shadowColor: "#8A9A86",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: "#7B8579",
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  tabBadge: {
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  tabBadgeText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10,
    color: "#FFFFFF",
  },
  tabContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 20,
  },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  rowSwatch: {
    width: 56,
    height: 56,
    borderRadius: 18,
    flexShrink: 0,
  },
  rowTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#2C332A",
    marginBottom: 1,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  rowBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rowBadgeText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rowStat: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: "#7B8579",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(226,223,216,0.6)",
    marginHorizontal: 16,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: "#7B8579",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sessionCount: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: "#7B8579",
  },
  ingChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.7)",
  },
  ingChipText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 11,
    color: "#2C332A",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 18,
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
    maxWidth: 260,
  },
  goButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#8A9A86",
  },
  goButtonText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
