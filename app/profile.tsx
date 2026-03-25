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

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:         "#F9F6F0",
  fg:         "#2C332A",
  primary:    "#059669",
  primaryFg:  "#FFFFFF",
  card:       "#FFFFFF",
  muted:      "#E8E6E1",
  mutedFg:    "#7B8579",
  border:     "#E2DFD8",
  input:      "#F0EFEA",
  chart3:     "#DDA77B",
  chart4:     "#859CA9",
  destructive:"#C97A7E",
};

// ─── Diet options ─────────────────────────────────────────────────────────────
type DietDef = { id: DietFilter; label: string; icon: "flame-outline" | "leaf-outline" | "barbell-outline" };
const DIET_OPTIONS: DietDef[] = [
  { id: "low-fat",      label: "Low-Fat",      icon: "flame-outline"   },
  { id: "low-carb",     label: "Low-Carb",     icon: "leaf-outline"    },
  { id: "high-protein", label: "High-Protein", icon: "barbell-outline" },
];

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuthContext();
  const { sessions, savedRecipeIds } = useAppContext();

  // ─── Local state ──────────────────────────────────────────────────────────
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

  // ─── Handlers ─────────────────────────────────────────────────────────────
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

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="chevron-back" size={22} color={C.fg} />
          </Pressable>
          <Text style={styles.headerTitle}>My Profile</Text>
          {/* Spacer keeps title centred */}
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Avatar ── */}
          <View style={styles.avatarSection}>
            {/* Avatar circle */}
            <View style={styles.avatarWrap}>
              <LinearGradient
                colors={["#34D399", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                {profile?.avatar_url
                  ? <Image source={{ uri: profile.avatar_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  : <Text style={styles.avatarInitial}>{initial}</Text>
                }
              </LinearGradient>

              {/* Edit overlay badge */}
              <Pressable
                style={({ pressed }) => [styles.avatarEditBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => Alert.alert("Coming Soon", "Avatar upload will be available in the next update.")}
              >
                <Ionicons name="pencil" size={14} color={C.primaryFg} />
              </Pressable>
            </View>

            {/* Name / edit inline */}
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={styles.nameInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                  placeholder="Display name"
                  placeholderTextColor={C.mutedFg}
                />
                <Pressable
                  onPress={saveName}
                  disabled={savingName}
                  style={({ pressed }) => [styles.nameSaveBtn, { opacity: pressed ? 0.8 : 1 }]}
                >
                  {savingName
                    ? <ActivityIndicator size="small" color={C.primary} />
                    : <Text style={styles.nameSaveBtnText}>Save</Text>
                  }
                </Pressable>
              </View>
            ) : (
              <Text style={styles.profileName} numberOfLines={1}>
                {profile?.display_name ?? user?.email?.split("@")[0] ?? "Chef"}
              </Text>
            )}

            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>

            {/* Edit account info button */}
            <Pressable
              onPress={() => setEditingName(true)}
              style={({ pressed }) => [styles.editInfoBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="person-outline" size={16} color={C.fg} />
              <Text style={styles.editInfoBtnText}>Edit Account Info</Text>
            </Pressable>
          </View>

          {/* ── Dietary Preferences ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Dietary Preferences</Text>
              {savingPrefs
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Ionicons name="settings-outline" size={20} color={C.primary} />
              }
            </View>

            {/*
             * 2-column grid of toggle buttons.
             * Active: primary background. Inactive: card background with border.
             */}
            <View style={styles.prefsGrid}>
              {DIET_OPTIONS.map((opt) => {
                const isOn = selectedPrefs.includes(opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => togglePref(opt.id)}
                    style={({ pressed }) => [
                      styles.prefBtn,
                      isOn ? styles.prefBtnOn : styles.prefBtnOff,
                      { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={isOn ? C.primaryFg : C.mutedFg}
                    />
                    <Text style={[styles.prefBtnLabel, isOn && styles.prefBtnLabelOn]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Recipe Summary ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recipe Summary</Text>
            <View style={styles.card}>

              {/* Saved Recipes row */}
              <Pressable
                onPress={() => router.push("/saved")}
                style={({ pressed }) => [styles.cardRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.cardRowIcon, { backgroundColor: "rgba(5,150,105,0.1)" }]}>
                  <Ionicons name="bookmark-outline" size={20} color={C.primary} />
                </View>
                <View style={styles.cardRowBody}>
                  <Text style={styles.cardRowTitle}>Saved Recipes</Text>
                  <Text style={styles.cardRowSub}>
                    {savedRecipeIds.length > 0
                      ? `${savedRecipeIds.length} recipe${savedRecipeIds.length !== 1 ? "s" : ""} bookmarked`
                      : "No saved recipes yet"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.mutedFg} />
              </Pressable>

              <View style={styles.rowDivider} />

              {/* Recipe History row */}
              <Pressable
                onPress={() => router.push({ pathname: "/saved", params: { tab: "history" } })}
                style={({ pressed }) => [styles.cardRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.cardRowIcon, { backgroundColor: `${C.chart4}18` }]}>
                  <Ionicons name="time-outline" size={20} color={C.chart4} />
                </View>
                <View style={styles.cardRowBody}>
                  <Text style={styles.cardRowTitle}>Recipe History</Text>
                  <Text style={styles.cardRowSub}>
                    {sessions.length > 0
                      ? `${sessions.reduce((n, s) => n + s.recipes.length, 0)} total generations`
                      : "No history yet"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.mutedFg} />
              </Pressable>

            </View>
          </View>

          {/* ── Account ── */}
          <View style={[styles.section, styles.lastSection]}>
            <View style={styles.card}>

              {/* Sign Out */}
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [styles.cardRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.cardRowIcon, { backgroundColor: C.muted }]}>
                  <Ionicons name="log-out-outline" size={20} color={`${C.fg}B3`} />
                </View>
                <Text style={[styles.cardRowTitle, { flex: 1 }]}>Sign Out</Text>
                <Ionicons name="chevron-forward" size={18} color={C.mutedFg} />
              </Pressable>

              <View style={styles.rowDivider} />

              {/* Delete Account */}
              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleting}
                style={({ pressed }) => [styles.cardRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.cardRowIcon, { backgroundColor: "rgba(201,122,126,0.1)" }]}>
                  {deleting
                    ? <ActivityIndicator size="small" color={C.destructive} />
                    : <Ionicons name="trash-outline" size={20} color={C.destructive} />
                  }
                </View>
                <Text style={[styles.cardRowTitle, { flex: 1, color: C.destructive }]}>Delete Account</Text>
                <Ionicons name="chevron-forward" size={18} color={C.mutedFg} />
              </Pressable>

            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: C.card,
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
    color: C.fg,
  },
  headerSpacer: { width: 40 },

  scroll: { paddingBottom: 48 },

  // ── Avatar section ──
  avatarSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 8,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 16,
  },
  avatarGradient: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    // Ring effect via shadow
    shadowColor: "rgba(5,150,105,0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarInitial: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 40,
    color: "#FFFFFF",
  },
  avatarEditBtn: {
    position: "absolute",
    bottom: 4,
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
  profileName: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 24,
    color: C.fg,
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 13,
    color: C.mutedFg,
    marginBottom: 16,
  },
  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    width: "100%",
    paddingHorizontal: 0,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.muted,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  editInfoBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: C.fg,
  },

  // ── Sections ──
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  lastSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 17,
    color: C.fg,
    marginBottom: 14,
  },

  // ── Dietary prefs grid ──
  prefsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  prefBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    // width is auto — 2 per row on most devices
    minWidth: "45%",
    flex: 1,
  },
  prefBtnOn: {
    backgroundColor: C.primary,
    borderColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  prefBtnOff: {
    backgroundColor: C.card,
    borderColor: "rgba(226,223,216,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  prefBtnLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: C.fg,
  },
  prefBtnLabelOn: {
    color: C.primaryFg,
  },

  // ── Card ──
  card: {
    backgroundColor: C.card,
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
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  cardRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardRowBody: {
    flex: 1,
    gap: 3,
  },
  cardRowTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: C.fg,
  },
  cardRowSub: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: C.mutedFg,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(226,223,216,0.5)",
    marginHorizontal: 20,
  },
});
