import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Icon } from "@/components/Icon";
import { useAppContext } from "@/context/AppContext";
import type { Recipe, RecipeSession } from "@/types";

const C = {
  bg:          "#F9F6F0",
  fg:          "#2C332A",
  primary:     "#059669",
  primaryFg:   "#FFFFFF",
  card:        "#FFFFFF",
  muted:       "#E8E6E1",
  mutedFg:     "#7B8579",
  border:      "#E2DFD8",
  destructive: "#C97A7E",
  chart3:      "#DDA77B",
  secondary:   "#E2E8F0",
  secondaryFg: "#64748B",
};

type Tab = "saved" | "history";

function formatDate(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function RecipeCard({
  recipe,
  sessionId,
  saved,
  onBookmark,
}: {
  recipe: Recipe;
  sessionId: string;
  saved: boolean;
  onBookmark: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={() =>
        router.push({ pathname: "/recipe/[id]", params: { id: recipe.id, sessionId } })
      }
      style={s.card}
      activeOpacity={0.9}
    >
      <View style={{ flex: 1, gap: 6, paddingRight: 48 }}>
        <Text style={s.cardTitle} numberOfLines={2}>{recipe.title}</Text>
        <View style={s.cardMeta}>
          <View style={s.metaItem}>
            <Icon icon="solar:fire-bold" size={13} color={C.destructive} />
            <Text style={s.metaText}>{recipe.calories}</Text>
          </View>
          <View style={s.metaItem}>
            <Icon icon="solar:clock-circle-bold" size={13} color={C.chart3} />
            <Text style={s.metaText}>{recipe.cookTime}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={onBookmark} style={s.bookmarkBtn} activeOpacity={0.8}>
        <Icon
          icon={saved ? "solar:bookmark-bold" : "solar:bookmark-outline"}
          size={20}
          color={C.primary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SavedScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("saved");
  const insets = useSafeAreaInsets();
  const { savedRecipeIds, sessions, isRecipeSaved, toggleSaved } = useAppContext();

  // ── Saved tab ──────────────────────────────────────────────────────────────
  const savedEntries = savedRecipeIds
    .map((entry) => {
      const session = sessions.find((s) => s.id === entry.sessionId);
      const recipe = session?.recipes.find((r) => r.id === entry.recipeId);
      return recipe && session ? { recipe, session, savedAt: entry.savedAt } : null;
    })
    .filter((x): x is { recipe: Recipe; session: RecipeSession; savedAt: number } => x !== null);

  // ── History tab ────────────────────────────────────────────────────────────
  const historyGroups = sessions.map((session) => ({
    session,
    label: formatDate(session.createdAt),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Icon icon="solar:alt-arrow-left-linear" size={22} color={C.fg} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Recipes</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Tab bar ── */}
        <View style={s.tabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab("saved")}
            style={[s.tab, activeTab === "saved" && s.tabActive]}
            activeOpacity={0.85}
          >
            <Icon
              icon="solar:bookmark-bold"
              size={16}
              color={activeTab === "saved" ? C.primaryFg : C.secondaryFg}
            />
            <Text style={[s.tabLabel, activeTab === "saved" && s.tabLabelActive]}>Saved</Text>
            {savedEntries.length > 0 && (
              <View style={s.tabBadge}>
                <Text style={s.tabBadgeText}>{savedEntries.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("history")}
            style={[s.tab, activeTab === "history" && s.tabActive]}
            activeOpacity={0.85}
          >
            <Icon
              icon="solar:history-linear"
              size={16}
              color={activeTab === "history" ? C.primaryFg : C.secondaryFg}
            />
            <Text style={[s.tabLabel, activeTab === "history" && s.tabLabelActive]}>History</Text>
            {sessions.length > 0 && (
              <View style={s.tabBadge}>
                <Text style={s.tabBadgeText}>{sessions.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Content ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100, gap: 12 }}
        >
          {activeTab === "saved" ? (
            savedEntries.length === 0 ? (
              <View style={s.empty}>
                <Icon icon="solar:bookmark-outline" size={48} color={C.mutedFg} />
                <Text style={s.emptyTitle}>No saved recipes yet</Text>
                <Text style={s.emptySub}>Tap the bookmark on any recipe to save it here.</Text>
                <TouchableOpacity onPress={() => router.replace("/")} style={s.goBtn}>
                  <Text style={s.goBtnText}>Generate a Recipe</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {savedEntries.map(({ recipe, session }) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    sessionId={session.id}
                    saved
                    onBookmark={() => toggleSaved(recipe.id, session.id)}
                  />
                ))}
                {/* Discover more CTA */}
                <TouchableOpacity onPress={() => router.replace("/")} style={s.discoverBtn} activeOpacity={0.8}>
                  <Icon icon="solar:add-circle-bold" size={24} color="rgba(5,150,105,0.4)" />
                  <Text style={s.discoverText}>Discover More Recipes</Text>
                </TouchableOpacity>
              </>
            )
          ) : (
            historyGroups.length === 0 ? (
              <View style={s.empty}>
                <Icon icon="solar:history-linear" size={48} color={C.mutedFg} />
                <Text style={s.emptyTitle}>No history yet</Text>
                <Text style={s.emptySub}>Generate your first recipe and it'll appear here.</Text>
                <TouchableOpacity onPress={() => router.replace("/")} style={s.goBtn}>
                  <Text style={s.goBtnText}>Get Started</Text>
                </TouchableOpacity>
              </View>
            ) : (
              historyGroups.map(({ session, label }) => (
                <View key={session.id} style={{ gap: 10 }}>
                  {/* Session date row */}
                  <View style={s.sessionHeader}>
                    <Text style={s.sessionLabel}>{label}</Text>
                    <Text style={s.sessionCount}>
                      {session.recipes.length} recipe{session.recipes.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  {/* Ingredient chips */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
                    style={{ flexGrow: 0 }}
                  >
                    {session.ingredients.slice(0, 6).map((ing) => (
                      <View key={ing.id} style={s.ingChip}>
                        <Text style={s.ingChipText}>{ing.name}</Text>
                      </View>
                    ))}
                    {session.ingredients.length > 6 && (
                      <View style={s.ingChip}>
                        <Text style={s.ingChipText}>+{session.ingredients.length - 6}</Text>
                      </View>
                    )}
                  </ScrollView>
                  {/* Recipe cards */}
                  {session.recipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      sessionId={session.id}
                      saved={isRecipeSaved(recipe.id)}
                      onBookmark={() => toggleSaved(recipe.id, session.id)}
                    />
                  ))}
                </View>
              ))
            )
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ── Bottom nav ── */}
      <View style={[s.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity onPress={() => router.replace("/")} style={s.navItem} activeOpacity={0.7}>
          <Icon icon="solar:home-2-bold-duotone" size={24} color={C.mutedFg} />
          <Text style={[s.navLabel, { color: C.mutedFg }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace("/")} style={s.navItem} activeOpacity={0.7}>
          <Icon icon="solar:magnifer-bold-duotone" size={24} color={C.mutedFg} />
          <Text style={[s.navLabel, { color: C.mutedFg }]}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navItem} activeOpacity={0.7}>
          <Icon icon="solar:chef-hat-bold-duotone" size={24} color={C.primary} />
          <Text style={[s.navLabel, { color: C.primary }]}>Recipes</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/profile")} style={s.navItem} activeOpacity={0.7}>
          <Icon icon="solar:user-bold-duotone" size={24} color={C.mutedFg} />
          <Text style={[s.navLabel, { color: C.mutedFg }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 20,
    color: "#2C332A",
  },

  // ── Tab bar ───────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 24,
    backgroundColor: "rgba(226,232,240,0.5)",
    borderRadius: 24,
    padding: 6,
    gap: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 20,
    gap: 6,
  },
  tabActive: {
    backgroundColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  tabLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: "#64748B",
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

  // ── Recipe card ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#2C332A",
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12,
    color: "#7B8579",
  },
  bookmarkBtn: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(5,150,105,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Discover CTA ──────────────────────────────────────────────────────────
  discoverBtn: {
    borderRadius: 24,
    backgroundColor: "#F0EFEA",
    borderWidth: 2,
    borderColor: "#E8E6E1",
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 20,
    marginTop: 4,
  },
  discoverText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 11,
    color: "#7B8579",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },

  // ── History ───────────────────────────────────────────────────────────────
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
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

  // ── Empty state ───────────────────────────────────────────────────────────
  empty: {
    alignItems: "center",
    paddingVertical: 56,
  },
  emptyTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 18,
    color: "#2C332A",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 14,
    color: "#7B8579",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  goBtn: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#059669",
  },
  goBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },

  // ── Bottom nav ────────────────────────────────────────────────────────────
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: "rgba(249,246,240,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(226,223,216,0.5)",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  navLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10,
  },
});
