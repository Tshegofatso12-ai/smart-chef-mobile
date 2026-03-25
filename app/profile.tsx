import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:          "#F8F7F2",
  fg:          "#433935",
  primary:     "#10B981",
  primaryFg:   "#FFFFFF",
  secondary:   "#E2E8F0",
  secondaryFg: "#64748B",
  card:        "#FFFFFF",
  muted:       "#E8E6E1",
  mutedFg:     "#7B8579",
  border:      "#E2E8F0",
  chart3:      "#DDA77B",
  chart4:      "#859CA9",
  destructive: "#C97A7E",
};

type DietDef = {
  id: DietFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  inactiveColor: string;
};

const DIET_OPTIONS: DietDef[] = [
  { id: "low-fat",  label: "Low-Fat",  icon: "leaf-outline",      inactiveColor: C.primary     },
  { id: "low-carb", label: "Low-Carb", icon: "nutrition-outline", inactiveColor: C.chart3      },
  { id: "keto",     label: "Keto",     icon: "flame-outline",     inactiveColor: C.destructive },
  { id: "vegan",    label: "Vegan",    icon: "heart-outline",     inactiveColor: "#E896B0"     },
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

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.headerBtn}>
            <Ionicons name="chevron-back" size={20} color={C.fg} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Profile</Text>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* AVATAR SECTION                                             */}
          {/* ══════════════════════════════════════════════════════════ */}
          <View style={s.avatarSection}>

            {/* Avatar with ring */}
            <View style={s.avatarWrap}>
              {/* Outer ring: rgba(16,185,129,0.1) border */}
              <View style={s.avatarRing}>
                {/* White border */}
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

              {/* Edit badge — absolute bottom-right */}
              <TouchableOpacity
                onPress={() => Alert.alert("Coming Soon", "Avatar upload will be available in the next update.")}
                activeOpacity={0.8}
                style={s.editBadge}
              >
                <Ionicons name="pencil" size={13} color={C.primaryFg} />
              </TouchableOpacity>
            </View>

            {/* Name */}
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
                <TouchableOpacity
                  onPress={saveName}
                  disabled={savingName}
                  activeOpacity={0.8}
                  style={s.nameSaveBtn}
                >
                  {savingName
                    ? <ActivityIndicator size="small" color={C.primary} />
                    : <Text style={s.nameSaveBtnText}>Save</Text>
                  }
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={s.profileName} numberOfLines={1}>
                {profile?.display_name ?? user?.email?.split("@")[0] ?? "Chef"}
              </Text>
            )}

            <Text style={s.profileEmail} numberOfLines={1}>{user?.email}</Text>

            {/* Edit Account Info pill button */}
            <TouchableOpacity
              onPress={() => setEditingName(true)}
              activeOpacity={0.8}
              style={s.editInfoBtn}
            >
              <Ionicons name="person-outline" size={16} color={C.secondaryFg} />
              <Text style={s.editInfoBtnText}>Edit Account Info</Text>
            </TouchableOpacity>
          </View>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* DIETARY PREFERENCES                                        */}
          {/* ══════════════════════════════════════════════════════════ */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Dietary Preferences</Text>
              {savingPrefs
                ? <ActivityIndicator size="small" color={C.primary} />
                : <View style={s.sectionDot} />
              }
            </View>

            {/* 2×2 grid — explicit rows to avoid percentage-width issues */}
            <View style={s.prefsGrid}>
              <View style={s.prefsRow}>
                {DIET_OPTIONS.slice(0, 2).map((opt) => {
                  const isOn = selectedPrefs.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => togglePref(opt.id)}
                      activeOpacity={0.8}
                      style={[s.prefBtn, isOn ? s.prefBtnOn : s.prefBtnOff]}
                    >
                      <Ionicons name={opt.icon} size={20} color={isOn ? C.primaryFg : opt.inactiveColor} />
                      <Text style={[s.prefLabel, isOn && s.prefLabelOn]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={s.prefsRow}>
                {DIET_OPTIONS.slice(2, 4).map((opt) => {
                  const isOn = selectedPrefs.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => togglePref(opt.id)}
                      activeOpacity={0.8}
                      style={[s.prefBtn, isOn ? s.prefBtnOn : s.prefBtnOff]}
                    >
                      <Ionicons name={opt.icon} size={20} color={isOn ? C.primaryFg : opt.inactiveColor} />
                      <Text style={[s.prefLabel, isOn && s.prefLabelOn]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* RECIPE SUMMARY                                             */}
          {/* ══════════════════════════════════════════════════════════ */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { marginBottom: 16 }]}>Recipe Summary</Text>

            <View style={s.card}>
              <TouchableOpacity
                onPress={() => router.push("/saved")}
                activeOpacity={0.7}
                style={s.cardRow}
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
              </TouchableOpacity>

              <View style={s.rowDivider} />

              <TouchableOpacity
                onPress={() => router.push({ pathname: "/saved", params: { tab: "history" } })}
                activeOpacity={0.7}
                style={s.cardRow}
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
              </TouchableOpacity>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ACCOUNT                                                    */}
          {/* ══════════════════════════════════════════════════════════ */}
          <View style={[s.section, s.lastSection]}>
            <View style={s.card}>
              <TouchableOpacity
                onPress={handleSignOut}
                activeOpacity={0.7}
                style={s.cardRow}
              >
                <View style={[s.cardIcon, { backgroundColor: C.muted }]}>
                  <Ionicons name="log-out-outline" size={20} color={`${C.fg}B3`} />
                </View>
                <Text style={[s.cardRowTitle, s.cardRowFlex]}>Sign Out</Text>
                <Ionicons name="chevron-forward" size={18} color={C.mutedFg} />
              </TouchableOpacity>

              <View style={s.rowDivider} />

              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={deleting}
                activeOpacity={0.7}
                style={s.cardRow}
              >
                <View style={[s.cardIcon, { backgroundColor: "rgba(201,122,126,0.1)" }]}>
                  {deleting
                    ? <ActivityIndicator size="small" color={C.destructive} />
                    : <Ionicons name="trash-outline" size={20} color={C.destructive} />
                  }
                </View>
                <Text style={[s.cardRowTitle, s.cardRowFlex, { color: C.destructive }]}>
                  Delete Account
                </Text>
                <Ionicons name="chevron-forward" size={18} color={C.mutedFg} />
              </TouchableOpacity>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  headerTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 20,
    color: C.fg,
  },
  headerSpacer: { width: 40 },

  scroll: { paddingBottom: 48 },

  // ── Avatar section ──────────────────────────────────────────────────────────
  avatarSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  avatarWrap: {
    marginBottom: 16,
    width: 136,
    height: 136,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 4,
    borderColor: "rgba(16,185,129,0.12)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: C.card,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGradient: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 40,
    color: "#FFFFFF",
  },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
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

  profileName: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 24,
    color: C.fg,
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: C.mutedFg,
    marginBottom: 16,
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

  editInfoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.secondary,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.5)",
  },
  editInfoBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: C.secondaryFg,
  },

  // ── Sections ─────────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  lastSection: {
    marginBottom: 48,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 18,
    color: C.fg,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },

  // ── Dietary grid ──────────────────────────────────────────────────────────────
  prefsGrid: {
    gap: 12,
  },
  prefsRow: {
    flexDirection: "row",
    gap: 12,
  },
  prefBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  prefBtnOn: {
    backgroundColor: C.primary,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  prefBtnOff: {
    backgroundColor: C.card,
    borderColor: "rgba(226,232,240,0.6)",
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
    flexShrink: 1,
  },
  prefLabelOn: { color: C.primaryFg },

  // ── Cards ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.5)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardRowFlex: { flex: 1 },
  cardRowTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: C.fg,
    marginBottom: 2,
  },
  cardRowSub: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: C.mutedFg,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(226,232,240,0.4)",
  },
});
