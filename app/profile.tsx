import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/context/AuthContext";
import { useAppContext } from "@/context/AppContext";
import type { DietFilter } from "@/types";

// ─── Design tokens (from HTML :root) ─────────────────────────────────────────
const C = {
  bg:          "#F8F7F2",
  fg:          "#433935",
  primary:     "#10B981",
  primaryFg:   "#FFFFFF",
  secondary:   "#E2E8F0",   // bg-secondary
  secondaryFg: "#64748B",   // text-secondary-foreground
  card:        "#FFFFFF",
  muted:       "#E8E6E1",
  mutedFg:     "#7B8579",
  border:      "#E2E8F0",
  chart3:      "#DDA77B",
  chart4:      "#859CA9",
  destructive: "#C97A7E",
};

// ─── Diet options with per-option inactive icon color ────────────────────────
// Matches the HTML: leaf (no special = fg), bone (text-chart-3), fire (text-chart-2)
type DietDef = {
  id: DietFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  inactiveColor: string;
};
const DIET_OPTIONS: DietDef[] = [
  { id: "low-fat",      label: "Low-Fat",      icon: "leaf-outline",      inactiveColor: C.fg       },
  { id: "low-carb",     label: "Low-Carb",     icon: "nutrition-outline", inactiveColor: C.chart3   },
  { id: "high-protein", label: "High-Protein", icon: "flame-outline",     inactiveColor: C.destructive },
];

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuthContext();
  const { sessions, savedRecipeIds } = useAppContext();

  const [editingName,   setEditingName]   = useState(false);
  const [displayName,   setDisplayName]   = useState("");
  const [savingName,    setSavingName]    = useState(false);
  const [selectedPrefs, setSelectedPrefs] = useState<DietFilter[]>([]);
  const [savingPrefs,   setSavingPrefs]   = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setSelectedPrefs((profile?.dietary_preferences as DietFilter[]) ?? []);
  }, [profile]);

  const saveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      await supabase.from("profiles").update({
        display_name: displayName.trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", u.id);
      await refreshProfile();
      setEditingName(false);
    } finally {
      setSavingName(false);
    }
  };

  const togglePref = async (id: DietFilter) => {
    const next = selectedPrefs.includes(id)
      ? selectedPrefs.filter((x) => x !== id)
      : [...selectedPrefs, id];
    setSelectedPrefs(next);
    setSavingPrefs(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      await supabase.from("profiles").update({
        dietary_preferences: next,
        updated_at: new Date().toISOString(),
      }).eq("id", u.id);
      await refreshProfile();
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          router.replace("/onboarding/welcome");
          await signOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your account and all your recipes. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase.functions.invoke("delete-account", {});
              if (error) throw error;
              router.replace("/onboarding/welcome");
              await signOut();
            } catch (err: any) {
              Alert.alert("Error", err?.message ?? "Could not delete account.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const initial = (profile?.display_name ?? user?.email ?? "C")[0].toUpperCase();
  const totalRecipes = sessions.reduce((n, s) => n + s.recipes.length, 0);

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>

        {/* ── Header: back button · title · spacer (same width as button) ── */}
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [s.headerBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
          >
            <Ionicons name="chevron-back" size={20} color={C.fg} />
          </Pressable>
          <Text style={s.headerTitle}>My Profile</Text>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* AVATAR SECTION                                                  */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={s.avatarSection}>

            {/*
             * Ring structure (outer → inner):
             *   ringWrap  — rgba(16,185,129,0.1) border  ← ring-4 ring-primary/10
             *   avatar    — white border                  ← border-4 border-card
             *   gradient  — gradient or photo fill
             */}
            <View style={s.avatarWrap}>
              {/* ring-4 ring-primary/10 */}
              <View style={s.avatarRing}>
                {/* border-4 border-card */}
                <View style={s.avatarBorder}>
                  <LinearGradient
                    colors={["#34D399", "#10B981"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.avatarGradient}
                  >
                    {profile?.avatar_url
                      ? <Image source={{ uri: profile.avatar_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      : <Text style={s.avatarInitial}>{initial}</Text>
                    }
                  </LinearGradient>
                </View>
              </View>

              {/* Edit badge — absolute bottom-4 right-0 */}
              <Pressable
                onPress={() => Alert.alert("Coming Soon", "Avatar upload will be available in the next update.")}
                style={({ pressed }) => [s.editBadge, { transform: [{ scale: pressed ? 0.9 : 1 }] }]}
              >
                <Ionicons name="pencil" size={13} color={C.primaryFg} />
              </Pressable>
            </View>

            {/* Name — inline edit on tap of "Edit Account Info" button */}
            {editingName ? (
              <View style={s.nameEditRow}>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={s.nameInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                  placeholder="Display name"
                  placeholderTextColor={C.mutedFg}
                />
                <Pressable
                  onPress={saveName}
                  disabled={savingName}
                  style={({ pressed }) => [s.nameSaveBtn, { opacity: pressed ? 0.8 : 1 }]}
                >
                  {savingName
                    ? <ActivityIndicator size="small" color={C.primary} />
                    : <Text style={s.nameSaveBtnText}>Save</Text>
                  }
                </Pressable>
              </View>
            ) : (
              <Text style={s.profileName} numberOfLines={1}>
                {profile?.display_name ?? user?.email?.split("@")[0] ?? "Chef"}
              </Text>
            )}

            <Text style={s.profileEmail} numberOfLines={1}>{user?.email}</Text>

            {/*
             * bg-secondary = #E2E8F0   text-secondary-foreground = #64748B
             * Matches HTML: mt-4 px-6 py-2 rounded-full bg-secondary border border-border/30
             */}
            <Pressable
              onPress={() => setEditingName(true)}
              style={({ pressed }) => [
                s.editInfoBtn,
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <Ionicons name="person-outline" size={18} color={C.secondaryFg} />
              <Text style={s.editInfoBtnText}>Edit Account Info</Text>
            </Pressable>
          </View>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* DIETARY PREFERENCES                                             */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={s.section}>
            {/* Section header row */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Dietary Preferences</Text>
              {savingPrefs
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Ionicons name="settings-outline" size={20} color={C.primary} />
              }
            </View>

            {/*
             * grid grid-cols-2 gap-3  →  2-column flexWrap row, gap 12
             * Each button: flex items-center gap-3 p-3 rounded-2xl
             * Active:   bg-primary text-primary-foreground border border-white/10
             * Inactive: bg-card text-foreground border border-border/50
             * Icon color on inactive is per-option (fg, chart-3, chart-2)
             */}
            <View style={s.prefsGrid}>
              {DIET_OPTIONS.map((opt) => {
                const isOn = selectedPrefs.includes(opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => togglePref(opt.id)}
                    style={({ pressed }) => [
                      s.prefBtn,
                      isOn ? s.prefBtnOn : s.prefBtnOff,
                      { transform: [{ scale: pressed ? 0.95 : 1 }] },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={isOn ? C.primaryFg : opt.inactiveColor}
                    />
                    <Text style={[s.prefLabel, isOn && s.prefLabelOn]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* RECIPE SUMMARY                                                  */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { marginBottom: 16 }]}>Recipe Summary</Text>

            {/* rounded-[2rem] border border-border/50 overflow-hidden shadow-sm */}
            <View style={s.card}>

              {/* Saved Recipes row — border-b border-border/30 */}
              <Pressable
                onPress={() => router.push("/saved")}
                style={({ pressed }) => [s.cardRow, pressed && s.cardRowPressed]}
              >
                <View style={[s.cardIcon, { backgroundColor: "rgba(16,185,129,0.1)" }]}>
                  <Ionicons name="bookmark-outline" size={20} color={C.primary} />
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardRowTitle}>Saved Recipes</Text>
                  <Text style={s.cardRowSub}>
                    {savedRecipeIds.length > 0
                      ? `${savedRecipeIds.length} recipe${savedRecipeIds.length !== 1 ? "s" : ""} bookmarked`
                      : "No saved recipes yet"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.mutedFg} />
              </Pressable>

              <View style={s.rowDivider} />

              {/* Recipe History row */}
              <Pressable
                onPress={() => router.push({ pathname: "/saved", params: { tab: "history" } })}
                style={({ pressed }) => [s.cardRow, pressed && s.cardRowPressed]}
              >
                <View style={[s.cardIcon, { backgroundColor: "rgba(133,156,169,0.1)" }]}>
                  <Ionicons name="time-outline" size={20} color={C.chart4} />
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardRowTitle}>Recipe History</Text>
                  <Text style={s.cardRowSub}>
                    {totalRecipes > 0
                      ? `${totalRecipes} total generation${totalRecipes !== 1 ? "s" : ""}`
                      : "No history yet"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.mutedFg} />
              </Pressable>

            </View>
          </View>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ACCOUNT (Sign Out + Delete Account) — mb-12                    */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={[s.section, s.lastSection]}>
            <View style={s.card}>

              {/* Sign Out — border-b border-border/30 */}
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [s.cardRow, pressed && s.cardRowPressed]}
              >
                <View style={[s.cardIcon, { backgroundColor: C.muted }]}>
                  <Ionicons name="log-out-outline" size={20} color={`${C.fg}B3`} />
                </View>
                <Text style={[s.cardRowTitle, { flex: 1 }]}>Sign Out</Text>
                <Ionicons name="chevron-forward" size={18} color={C.mutedFg} />
              </Pressable>

              <View style={s.rowDivider} />

              {/* Delete Account — hover:bg-destructive/5 */}
              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleting}
                style={({ pressed }) => [
                  s.cardRow,
                  pressed && { backgroundColor: "rgba(201,122,126,0.1)" },
                ]}
              >
                <View style={[s.cardIcon, { backgroundColor: "rgba(201,122,126,0.1)" }]}>
                  {deleting
                    ? <ActivityIndicator size="small" color={C.destructive} />
                    : <Ionicons name="trash-outline" size={20} color={C.destructive} />
                  }
                </View>
                <Text style={[s.cardRowTitle, { flex: 1, color: C.destructive }]}>
                  Delete Account
                </Text>
                <Ionicons name="chevron-forward" size={18} color={C.mutedFg} />
              </Pressable>

            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────────
  // px-6 pt-12 pb-6 flex items-center justify-between
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  // h-10 w-10 rounded-full bg-card border border-border/50 shadow-sm
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.5)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  // text-xl font-heading font-extrabold
  headerTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 20,
    color: C.fg,
  },
  headerSpacer: { width: 40 },

  scroll: { paddingBottom: 48 },

  // ── Avatar section ───────────────────────────────────────────────────────────
  // px-6 mb-8 flex flex-col items-center
  avatarSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,  // mb-8
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 16,
  },

  // ring-4 ring-primary/10 → border 4px rgba(16,185,129,0.1), rounded-full
  avatarRing: {
    borderWidth: 4,
    borderColor: "rgba(16,185,129,0.1)",
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  // border-4 border-card → white border between ring and gradient
  avatarBorder: {
    borderWidth: 4,
    borderColor: C.card,
    borderRadius: 999,
    overflow: "hidden",
  },
  // h-28 w-28 rounded-full — the gradient circle itself
  avatarGradient: {
    width: 112,
    height: 112,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 40,
    color: "#FFFFFF",
  },

  // absolute bottom-4 right-0 h-8 w-8 rounded-full bg-primary border-2 border-card
  editBadge: {
    position: "absolute",
    bottom: 8,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primary,
    borderWidth: 2,
    borderColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  // text-2xl font-heading font-extrabold
  profileName: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 24,
    color: C.fg,
    marginBottom: 4,
  },
  // text-sm font-medium text-muted-foreground
  profileEmail: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: C.mutedFg,
    marginBottom: 16,  // mt-4 on the button below
  },

  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    width: "100%",
  },
  nameInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.primary,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 15,
    color: C.fg,
  },
  nameSaveBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  nameSaveBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: C.primary,
  },

  // mt-4 px-6 py-2 rounded-full bg-secondary text-secondary-foreground border border-border/30 shadow-sm
  editInfoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.secondary,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  editInfoBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: C.secondaryFg,
  },

  // ── Sections ─────────────────────────────────────────────────────────────────
  // px-6 mb-8
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  lastSection: {
    marginBottom: 48,  // mb-12
  },
  // flex items-center justify-between mb-4
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  // text-lg font-heading font-bold (700, not extrabold)
  sectionTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 18,
    color: C.fg,
  },

  // ── Dietary prefs grid ────────────────────────────────────────────────────────
  // grid grid-cols-2 gap-3 → 2-col flexWrap, gap 12
  prefsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  // flex items-center gap-3 p-3 rounded-2xl — each takes ~(50% - gap/2)
  prefBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,       // rounded-2xl
    borderWidth: 1,
    width: "47%",           // 2-column grid approximation
  },
  // bg-primary text-primary-foreground border border-white/10 shadow-sm
  prefBtnOn: {
    backgroundColor: C.primary,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  // bg-card text-foreground border border-border/50 shadow-sm
  prefBtnOff: {
    backgroundColor: C.card,
    borderColor: "rgba(226,232,240,0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  prefLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: C.fg,
  },
  prefLabelOn: { color: C.primaryFg },

  // ── Card (Recipe Summary + Account) ─────────────────────────────────────────
  // bg-card rounded-[2rem] border border-border/50 overflow-hidden shadow-sm
  card: {
    backgroundColor: C.card,
    borderRadius: 32,         // rounded-[2rem]
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.5)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  // w-full px-6 py-5 flex items-center justify-between
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,    // px-6
    paddingVertical: 20,      // py-5
    gap: 16,                  // gap-4
  },
  // active:bg-muted/50 → slight tint on press
  cardRowPressed: {
    backgroundColor: "rgba(232,230,225,0.5)",
  },
  // h-10 w-10 rounded-xl
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,         // rounded-xl
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  // font-bold
  cardRowTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: C.fg,
    marginBottom: 2,
  },
  // text-xs text-muted-foreground
  cardRowSub: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: C.mutedFg,
  },
  // border-b border-border/30
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(226,232,240,0.3)",
  },
});
