import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/context/AuthContext";
import { useAppContext } from "@/context/AppContext";
import type { DietFilter } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

const DIET_OPTIONS: { id: DietFilter; label: string; emoji: string; color: string }[] = [
  { id: "low-fat",      label: "Low-Fat",      emoji: "🥗", color: "#059669" },
  { id: "low-carb",     label: "Low-Carb",     emoji: "🥩", color: "#DDA77B" },
  { id: "high-protein", label: "High-Protein", emoji: "💪", color: "#C97A7E" },
];

type Props = { visible: boolean; onClose: () => void };

export function ProfileDrawer({ visible, onClose }: Props) {
  const { user, profile, signOut, refreshProfile } = useAuthContext();
  const { sessions, savedRecipeIds } = useAppContext();

  const translateX    = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropAlpha = useRef(new Animated.Value(0)).current;

  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingName,  setSavingName]  = useState(false);
  const [selectedPrefs, setSelectedPrefs] = useState<DietFilter[]>([]);
  const [savingPrefs,   setSavingPrefs]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync local state when drawer opens
  useEffect(() => {
    if (visible) {
      setDisplayName(profile?.display_name ?? "");
      setSelectedPrefs((profile?.dietary_preferences as DietFilter[]) ?? []);
    }
  }, [visible, profile]);

  // Slide animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          damping: 22,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAlpha, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAlpha, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const saveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      await supabase
        .from("profiles")
        .update({ display_name: displayName.trim(), updated_at: new Date().toISOString() })
        .eq("id", u.id);
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
      await supabase
        .from("profiles")
        .update({ dietary_preferences: next, updated_at: new Date().toISOString() })
        .eq("id", u.id);
      await refreshProfile();
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          onClose();
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
              onClose();
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

  const navigate = (path: string) => {
    onClose();
    setTimeout(() => router.push(path as any), 260);
  };

  const initial = (profile?.display_name ?? user?.email ?? "C")[0].toUpperCase();
  const totalRecipes = sessions.reduce((n, s) => n + s.recipes.length, 0);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>

        {/* Backdrop */}
        <Animated.View style={[styles.backdropFill, { opacity: backdropAlpha }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Drawer panel */}
        <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
          <SafeAreaView style={styles.safe}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Close */}
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>

              {/* ── Profile header ── */}
              <View style={styles.profileSection}>
                <LinearGradient
                  colors={["#34D399", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bigAvatar}
                >
                  {profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.bigAvatarInitial}>{initial}</Text>
                  )}
                </LinearGradient>

                {editingName ? (
                  <View style={styles.nameEditRow}>
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      style={styles.nameInput}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={saveName}
                      placeholder="Your display name"
                      placeholderTextColor="#7B8579"
                    />
                    <Pressable
                      onPress={saveName}
                      disabled={savingName}
                      style={({ pressed }) => [styles.nameSaveBtn, { opacity: pressed ? 0.8 : 1 }]}
                    >
                      {savingName
                        ? <ActivityIndicator size="small" color="#FFFFFF" />
                        : <Text style={styles.nameSaveBtnText}>Save</Text>
                      }
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setEditingName(true)}
                    style={({ pressed }) => [styles.nameRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={styles.profileName}>
                      {profile?.display_name ?? user?.email?.split("@")[0] ?? "Chef"}
                    </Text>
                    <View style={styles.editBadge}>
                      <Text style={styles.editBadgeText}>Edit</Text>
                    </View>
                  </Pressable>
                )}

                <Text style={styles.profileEmail}>{user?.email}</Text>
              </View>

              {/* ── Stats ── */}
              <LinearGradient
                colors={["rgba(5,150,105,0.08)", "rgba(52,211,153,0.05)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.statsCard}
              >
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{sessions.length}</Text>
                  <Text style={styles.statLabel}>Sessions</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{savedRecipeIds.length}</Text>
                  <Text style={styles.statLabel}>Saved</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{totalRecipes}</Text>
                  <Text style={styles.statLabel}>Recipes</Text>
                </View>
              </LinearGradient>

              {/* ── Dietary preferences ── */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Dietary Preferences</Text>
                  {savingPrefs && <ActivityIndicator size="small" color="#059669" />}
                </View>
                <View style={styles.prefChips}>
                  {DIET_OPTIONS.map((opt) => {
                    const isOn = selectedPrefs.includes(opt.id);
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => togglePref(opt.id)}
                        style={({ pressed }) => [
                          styles.prefChip,
                          isOn && { borderColor: opt.color },
                          { opacity: pressed ? 0.75 : 1 },
                        ]}
                      >
                        {isOn && (
                          <LinearGradient
                            colors={[`${opt.color}18`, `${opt.color}08`]}
                            style={StyleSheet.absoluteFill}
                          />
                        )}
                        <Text style={styles.prefEmoji}>{opt.emoji}</Text>
                        <Text style={[styles.prefLabel, isOn && { color: opt.color }]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* ── Activity ── */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Activity</Text>
                <View style={styles.menuCard}>
                  <Pressable
                    onPress={() => navigate("/saved")}
                    style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={styles.menuEmoji}>🔖</Text>
                    <Text style={styles.menuLabel}>Saved Recipes</Text>
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{savedRecipeIds.length}</Text>
                    </View>
                    <Text style={styles.menuArrow}>›</Text>
                  </Pressable>

                  <View style={styles.menuDivider} />

                  <Pressable
                    onPress={() => navigate("/saved")}
                    style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={styles.menuEmoji}>📋</Text>
                    <Text style={styles.menuLabel}>Recipe History</Text>
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{sessions.length}</Text>
                    </View>
                    <Text style={styles.menuArrow}>›</Text>
                  </Pressable>
                </View>
              </View>

              {/* ── Account ── */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.menuCard}>
                  <Pressable
                    onPress={handleSignOut}
                    style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={styles.menuEmoji}>🚪</Text>
                    <Text style={styles.menuLabel}>Sign Out</Text>
                    <Text style={styles.menuArrow}>›</Text>
                  </Pressable>

                  <View style={styles.menuDivider} />

                  <Pressable
                    onPress={handleDeleteAccount}
                    disabled={deleting}
                    style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    {deleting
                      ? <ActivityIndicator size="small" color="#C97A7E" style={{ marginRight: 12 }} />
                      : <Text style={styles.menuEmoji}>🗑️</Text>
                    }
                    <Text style={[styles.menuLabel, { color: "#C97A7E" }]}>Delete Account</Text>
                    <Text style={styles.menuArrow}>›</Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ height: 32 }} />
            </ScrollView>
          </SafeAreaView>
        </Animated.View>

      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(44,51,42,0.5)",
  },
  panel: {
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: "#F9F6F0",
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },

  closeBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2DFD8",
  },
  closeBtnText: {
    fontSize: 14,
    color: "#2C332A",
    fontFamily: "NunitoSans_700Bold",
  },

  // Profile header
  profileSection: { alignItems: "center", marginBottom: 20 },
  bigAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    overflow: "hidden",
  },
  bigAvatarInitial: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 32,
    color: "#FFFFFF",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 20,
    color: "#2C332A",
  },
  editBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(5,150,105,0.1)",
  },
  editBadgeText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 11,
    color: "#059669",
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
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#059669",
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 15,
    color: "#2C332A",
  },
  nameSaveBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  nameSaveBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  profileEmail: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 13,
    color: "#7B8579",
    marginTop: 2,
  },

  // Stats
  statsCard: {
    flexDirection: "row",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.15)",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 22,
    color: "#2C332A",
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 11,
    color: "#7B8579",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(5,150,105,0.15)",
    marginVertical: 4,
  },

  // Sections
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: "#7B8579",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  // Pref chips
  prefChips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  prefChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2DFD8",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  prefEmoji: { fontSize: 14 },
  prefLabel: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: "#2C332A",
  },

  // Menu card
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2DFD8",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F0EFEA",
    marginHorizontal: 16,
  },
  menuEmoji: { fontSize: 18, marginRight: 12 },
  menuLabel: {
    flex: 1,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 15,
    color: "#2C332A",
  },
  menuBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(5,150,105,0.1)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginRight: 8,
  },
  menuBadgeText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 11,
    color: "#059669",
  },
  menuArrow: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 20,
    color: "#7B8579",
    lineHeight: 22,
  },
});
