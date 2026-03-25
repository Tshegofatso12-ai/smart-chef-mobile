import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/Icon";
import { useAppContext } from "@/context/AppContext";

const C = {
  bg:              "#F9F6F0",
  fg:              "#2C332A",
  primary:         "#059669",
  primaryFg:       "#FFFFFF",
  card:            "#FFFFFF",
  muted:           "#E8E6E1",
  mutedFg:         "#7B8579",
  border:          "#E2DFD8",
  destructive:     "#C97A7E",
  chart4:          "#859CA9",
};

/** Split "2 Chicken Breasts" → { name: "Chicken Breasts", qty: "2" } */
function parseIngredient(raw: string): { name: string; qty: string } {
  const UNITS = new Set([
    "cup","cups","tbsp","tsp","oz","lb","lbs","g","kg","ml","l",
    "piece","pieces","slice","slices","clove","cloves","handful","pinch","can","bunch",
  ]);
  const parts = raw.trim().split(/\s+/);
  if (parts.length <= 1) return { name: raw, qty: "" };
  const isNum = /^[\d¼½¾⅓⅔⅛⅜⅝⅞./]+$/.test(parts[0]);
  if (!isNum) return { name: raw, qty: "" };
  if (parts.length >= 3 && UNITS.has(parts[1].toLowerCase())) {
    return { name: parts.slice(2).join(" "), qty: `${parts[0]} ${parts[1]}` };
  }
  return { name: parts.slice(1).join(" "), qty: parts[0] };
}

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
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Icon icon="solar:chef-hat-bold" size={48} color={C.mutedFg} />
        <Text style={s.notFoundTitle}>Recipe not found</Text>
        <Text style={s.notFoundSub}>This recipe may no longer be available.</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dietLabel = recipe.dietMatch.replace(/-/g, " ");

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ── Sticky header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
          <Icon icon="solar:alt-arrow-left-linear" size={22} color={C.fg} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity onPress={handleFavoriteToggle} style={s.headerBtn} activeOpacity={0.7}>
            <Icon
              icon={isSaved ? "solar:heart-bold" : "solar:heart-outline"}
              size={20}
              color={C.destructive}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert("Share", "Sharing coming soon.")}
            style={s.headerBtn}
            activeOpacity={0.7}
          >
            <Icon icon="solar:share-bold-duotone" size={20} color={C.fg} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, paddingTop: 8 }}
      >

        {/* ── Title section ── */}
        <View style={{ marginBottom: 28 }}>
          {/* Badges */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {recipe.badges.map((badge) => (
              <View key={badge.label} style={[s.badge, { backgroundColor: badge.bg }]}>
                <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            ))}
          </View>

          {/* Title */}
          <Text style={s.title}>{recipe.title}</Text>
        </View>

        {/* ── Stats grid ── */}
        <View style={s.statsGrid}>
          {/* Time */}
          <View style={s.statCard}>
            <Icon icon="solar:clock-circle-bold-duotone" size={26} color={C.primary} />
            <Text style={s.statLabel}>Time</Text>
            <Text style={s.statValue}>{recipe.cookTime}</Text>
          </View>
          {/* Calories */}
          <View style={s.statCard}>
            <Icon icon="solar:fire-bold-duotone" size={26} color={C.destructive} />
            <Text style={s.statLabel}>Calories</Text>
            <Text style={s.statValue}>{recipe.calories}</Text>
          </View>
          {/* Match */}
          <View style={s.statCard}>
            <Icon icon="solar:leaf-bold-duotone" size={26} color={C.chart4} />
            <Text style={s.statLabel}>Match</Text>
            <Text style={s.statValue} numberOfLines={1}>{dietLabel}</Text>
          </View>
        </View>

        {/* ── Ingredients ── */}
        <View style={{ marginBottom: 32 }}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Ingredients</Text>
            <View style={s.sectionDot} />
          </View>
          <View style={{ gap: 10 }}>
            {recipe.ingredients.map((raw, idx) => {
              const { name, qty } = parseIngredient(raw);
              return (
                <View key={idx} style={s.ingredientRow}>
                  <Text style={s.ingredientName}>{name || raw}</Text>
                  {!!qty && <Text style={s.ingredientQty}>{qty}</Text>}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Preparation steps ── */}
        <View>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Preparation Steps</Text>
            <View style={s.sectionDot} />
          </View>
          <View style={{ gap: 14 }}>
            {recipe.steps.map((step, index) => {
              const num = index + 1;
              const isActive = currentStep === num;
              return (
                <TouchableOpacity
                  key={num}
                  onPress={() => setCurrentStep((prev) => prev === num ? null : num)}
                  style={[s.stepCard, isActive && s.stepCardActive]}
                  activeOpacity={0.85}
                >
                  <View style={[s.stepNum, isActive && s.stepNumActive]}>
                    <Text style={[s.stepNumText, isActive && { color: C.primary }]}>{num}</Text>
                  </View>
                  <Text style={[s.stepText, isActive && { color: C.fg }]}>{step}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* ── Fixed bottom CTA ── */}
      <View style={[s.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={() => setCurrentStep(1)}
          style={s.ctaBtn}
          activeOpacity={0.9}
        >
          <Icon icon="solar:play-bold-duotone" size={24} color={C.bg} />
          <Text style={s.ctaBtnText}>Start Step-by-Step</Text>
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
    paddingBottom: 12,
    backgroundColor: "rgba(249,246,240,0.9)",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
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

  // ── Title ─────────────────────────────────────────────────────────────────
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 28,
    color: "#2C332A",
    lineHeight: 36,
  },

  // ── Stats ─────────────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 9,
    color: "#7B8579",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 13,
    color: "#2C332A",
    textAlign: "center",
  },

  // ── Section headers ───────────────────────────────────────────────────────
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
    backgroundColor: "#059669",
  },

  // ── Ingredients ───────────────────────────────────────────────────────────
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(232,230,225,0.3)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.4)",
  },
  ingredientName: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: "rgba(44,51,42,0.9)",
    flex: 1,
  },
  ingredientQty: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12,
    color: "#7B8579",
    marginLeft: 12,
  },

  // ── Steps ─────────────────────────────────────────────────────────────────
  stepCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  stepCardActive: {
    backgroundColor: "rgba(5,150,105,0.06)",
    borderColor: "rgba(5,150,105,0.25)",
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNumActive: {
    backgroundColor: "rgba(5,150,105,0.12)",
    shadowOpacity: 0,
    elevation: 0,
  },
  stepNumText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  stepText: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 14,
    color: "rgba(44,51,42,0.75)",
    lineHeight: 22,
    flex: 1,
    paddingTop: 4,
  },

  // ── Bottom CTA ────────────────────────────────────────────────────────────
  ctaWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: "transparent",
  },
  ctaBtn: {
    width: "100%",
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2C332A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 17,
    color: "#F9F6F0",
  },

  // ── Not found ─────────────────────────────────────────────────────────────
  notFoundTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 20,
    color: "#2C332A",
    marginTop: 16,
    marginBottom: 8,
  },
  notFoundSub: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 14,
    color: "#7B8579",
    textAlign: "center",
    lineHeight: 20,
  },
  backBtn: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#059669",
  },
  backBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
