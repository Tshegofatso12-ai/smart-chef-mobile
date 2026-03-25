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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/context/AuthContext";
import { useAppContext } from "@/context/AppContext";
import type { DietFilter } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.84;

// ─── Spacing constants ────────────────────────────────────────────────────────
// All layout values derived from these so every section is consistent.
const S = {
  scrollPad:  20,  // horizontal padding on the scroll container
  cardPad:    16,  // horizontal padding inside every card row
  iconSize:   36,  // fixed width of the icon container column
  iconGap:    12,  // gap between icon column and text block
  rowV:       16,  // vertical padding inside each row
  sectionGap: 24,  // space between sections
  labelGap:   10,  // space between section label and its card
};

// ─── Diet options (icon added so dietary rows match the [icon][text][right] layout) ─
const DIET_OPTIONS: { id: DietFilter; label: string; icon: "flame-outline" | "leaf-outline" | "barbell-outline" }[] = [
  { id: "low-fat",      label: "Low-Fat",      icon: "flame-outline"   },
  { id: "low-carb",     label: "Low-Carb",     icon: "leaf-outline"    },
  { id: "high-protein", label: "High-Protein", icon: "barbell-outline" },
];

type Props = { visible: boolean; onClose: () => void };

export function ProfileDrawer({ visible, onClose }: Props) {
  const { user, profile, signOut, refreshProfile } = useAuthContext();
  const { sessions, savedRecipeIds } = useAppContext();

  const translateX    = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropAlpha = useRef(new Animated.Value(0)).current;

  const [editingName,   setEditingName]   = useState(false);
  const [displayName,   setDisplayName]   = useState("");
  const [savingName,    setSavingName]    = useState(false);
  const [selectedPrefs, setSelectedPrefs] = useState<DietFilter[]>([]);
  const [savingPrefs,   setSavingPrefs]   = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  useEffect(() => {
    if (visible) {
      setDisplayName(profile?.display_name ?? "");
      setSelectedPrefs((profile?.dietary_preferences as DietFilter[]) ?? []);
    }
  }, [visible, profile]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, damping: 22, stiffness: 200, useNativeDriver: true }),
        Animated.timing(backdropAlpha, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAlpha, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

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
      { text: "Sign Out", style: "destructive", onPress: async () => { onClose(); await signOut(); } },
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

  const initial      = (profile?.display_name ?? user?.email ?? "C")[0].toUpperCase();
  const totalRecipes = sessions.reduce((n, s) => n + s.recipes.length, 0);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>

        {/* Backdrop */}
        <Animated.View style={[styles.backdropFill, { opacity: backdropAlpha }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* ── Drawer panel ── */}
        <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
          <SafeAreaView style={styles.safe}>
            {/*
             * scroll paddingHorizontal = S.scrollPad (20)
             * Every card below stretches edge-to-edge within this padding.
             * All rows inside cards use S.cardPad (16) so content starts at
             * 20 + 16 = 36px from the screen edge — consistent everywhere.
             */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

              {/* Close button — aligned to scroll left edge */}
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="close" size={18} color="#2C332A" />
              </Pressable>

              {/* ── Profile header ── */}
              <View style={styles.profileSection}>
                <LinearGradient
                  colors={["#34D399", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatar}
                >
                  {profile?.avatar_url
                    ? <Image source={{ uri: profile.avatar_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    : <Text style={styles.avatarInitial}>{initial}</Text>
                  }
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
                      placeholder="Display name"
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
                    <Text style={styles.profileName} numberOfLines={1}>
                      {profile?.display_name ?? user?.email?.split("@")[0] ?? "Chef"}
                    </Text>
                    <View style={styles.editPill}>
                      <Ionicons name="pencil" size={11} color="#059669" />
                      <Text style={styles.editPillText}>Edit</Text>
                    </View>
                  </Pressable>
                )}

                <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>
              </View>

              {/* ── Stats ── */}
              <LinearGradient
                colors={["rgba(5,150,105,0.07)", "rgba(52,211,153,0.04)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.statsCard}
              >
                <View style={styles.statCol}>
                  <Text style={[styles.statNum, sessions.length > 0 && styles.statNumActive]}>
                    {sessions.length || "—"}
                  </Text>
                  <Text style={styles.statLbl}>SESSIONS</Text>
                </View>
                <View style={styles.statLine} />
                <View style={styles.statCol}>
                  <Text style={[styles.statNum, savedRecipeIds.length > 0 && styles.statNumActive]}>
                    {savedRecipeIds.length || "—"}
                  </Text>
                  <Text style={styles.statLbl}>SAVED</Text>
                </View>
                <View style={styles.statLine} />
                <View style={styles.statCol}>
                  <Text style={[styles.statNum, totalRecipes > 0 && styles.statNumActive]}>
                    {totalRecipes || "—"}
                  </Text>
                  <Text style={styles.statLbl}>RECIPES</Text>
                </View>
              </LinearGradient>

              {/* ── Dietary Preferences ── */}
              <View style={styles.section}>
                {/*
                 * Label row: label left, auto-saving spinner right.
                 * marginBottom = S.labelGap so card sits close to the label.
                 */}
                <View style={styles.sectionLabelRow}>
                  <Text style={styles.sectionLabel}>DIETARY PREFERENCES</Text>
                  {savingPrefs && <ActivityIndicator size="small" color="#059669" />}
                </View>

                <View style={styles.card}>
                  {DIET_OPTIONS.map((opt, i) => {
                    const isOn = selectedPrefs.includes(opt.id);
                    return (
                      <React.Fragment key={opt.id}>
                        {i > 0 && <View style={styles.divider} />}

                        {/*
                         * Dietary row — same [icon][text][toggle] structure as
                         * Activity and Account rows so all text aligns at the same X.
                         *   col 1: rowIcon  — fixed S.iconSize width, centered
                         *   col 2: rowLabel — flex:1, takes remaining space
                         *   col 3: toggle   — fixed width, flexShrink:0
                         */}
                        <Pressable
                          onPress={() => togglePref(opt.id)}
                          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
                        >
                          <View style={styles.rowIcon}>
                            <Ionicons name={opt.icon} size={18} color="#059669" />
                          </View>

                          <Text style={styles.rowLabel}>{opt.label}</Text>

                          <View style={[styles.toggle, isOn && styles.toggleOn]}>
                            <Animated.View style={[styles.toggleThumb, isOn && styles.toggleThumbOn]} />
                          </View>
                        </Pressable>
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>

              {/* ── Activity ── */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>ACTIVITY</Text>

                <View style={styles.card}>
                  {/*
                   * Activity row — [icon][body column][chevron]
                   *   col 1: rowIcon  — fixed S.iconSize, vertically centered
                   *   col 2: rowBody  — flex:1, stacks title + subtitle
                   *   col 3: chevron  — fixed, flush right
                   */}
                  <Pressable
                    onPress={() => navigate("/saved")}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={styles.rowIcon}>
                      <Ionicons name="bookmark-outline" size={18} color="#059669" />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowLabel}>Saved Recipes</Text>
                      <Text style={styles.rowSubtitle}>
                        {savedRecipeIds.length > 0
                          ? `${savedRecipeIds.length} saved`
                          : "No saved recipes yet"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B0ADA6" />
                  </Pressable>

                  <View style={styles.divider} />

                  <Pressable
                    onPress={() => navigate("/saved")}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={styles.rowIcon}>
                      <MaterialCommunityIcons name="history" size={18} color="#059669" />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowLabel}>Recipe History</Text>
                      <Text style={styles.rowSubtitle}>
                        {sessions.length > 0
                          ? `${sessions.length} sessions`
                          : "No history yet"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B0ADA6" />
                  </Pressable>
                </View>
              </View>

              {/* ── Account ── */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>ACCOUNT</Text>

                <View style={styles.card}>
                  {/*
                   * Account rows reuse the same [icon][label][chevron] pattern.
                   * rowLabel has flex:1 so the chevron always sits flush right,
                   * regardless of label length.
                   */}
                  <Pressable
                    onPress={handleSignOut}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={styles.rowIcon}>
                      <Ionicons name="log-out-outline" size={18} color="#C97A7E" />
                    </View>
                    <Text style={[styles.rowLabel, styles.destructiveLabel]}>Sign Out</Text>
                    <Ionicons name="chevron-forward" size={16} color="#B0ADA6" />
                  </Pressable>

                  <View style={styles.divider} />

                  <Pressable
                    onPress={handleDeleteAccount}
                    disabled={deleting}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    {/* Icon column: spinner replaces icon while deleting, same fixed size */}
                    <View style={styles.rowIcon}>
                      {deleting
                        ? <ActivityIndicator size="small" color="#C97A7E" />
                        : <Ionicons name="trash-outline" size={18} color="#C97A7E" />
                      }
                    </View>
                    <Text style={[styles.rowLabel, styles.destructiveLabel]}>Delete Account</Text>
                    <Ionicons name="chevron-forward" size={16} color="#B0ADA6" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.bottomPad} />
            </ScrollView>
          </SafeAreaView>
        </Animated.View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, flexDirection: "row", justifyContent: "flex-end" },
  backdropFill: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(44,51,42,0.45)" },
  panel: {
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: "#F9F6F0",
    shadowColor: "#000",
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
  },
  safe:   { flex: 1 },
  // All content shares this horizontal padding — the single source of truth
  // for the left/right edges of every card and header.
  scroll: { paddingHorizontal: S.scrollPad, paddingTop: 8, paddingBottom: 20 },

  // ── Close ──
  closeBtn: {
    alignSelf: "flex-start",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2DFD8",
  },

  // ── Profile header ──
  profileSection: { alignItems: "center", paddingBottom: 20 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  avatarInitial: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 30,
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
    fontSize: 24,
    color: "#2C332A",
  },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.3)",
  },
  editPillText: {
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
    paddingHorizontal: 4,
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#059669",
  },
  nameSaveBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: "#059669",
  },
  profileEmail: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: "#7B8579",
    opacity: 0.7,
  },

  // ── Stats ──
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 22,
    marginBottom: S.sectionGap,
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.12)",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statCol: { flex: 1, alignItems: "center" },
  statNum: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 30,
    color: "#2C332A",
    marginBottom: 2,
  },
  statNumActive: { color: "#059669" },
  statLbl: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 9,
    color: "#7B8579",
    letterSpacing: 0.8,
  },
  statLine: { width: 1, height: 36, backgroundColor: "rgba(5,150,105,0.15)" },

  // ── Sections ──
  section: { marginBottom: S.sectionGap },

  // Used when a right element (spinner) sits next to the section label
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.labelGap,
  },
  // Standalone section label (no right element)
  sectionLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 11,
    color: "#7B8579",
    letterSpacing: 1.5,
    marginBottom: S.labelGap,
  },

  // ── Card ──
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EAE8E3",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Divider inset to match row horizontal padding so it never touches card edges
  divider: { height: 1, backgroundColor: "#F4F2EE", marginHorizontal: S.cardPad },

  // ── Universal row ──────────────────────────────────────────────────────────
  // Every interactive row in every section uses this one style.
  // Structure: [rowIcon 36px] [gap 12px] [rowLabel or rowBody flex:1] [right element]
  // This guarantees all text in all sections starts at the same X position.
  row: {
    flexDirection: "row",
    alignItems: "center",          // vertical center for icon, text, and right element
    paddingHorizontal: S.cardPad,  // 16px — matches divider inset
    paddingVertical: S.rowV,       // 16px top and bottom
    gap: S.iconGap,                // 12px between every column
  },

  // Fixed-width icon column — same size in dietary, activity, and account rows.
  // This is what guarantees text aligns across all three sections.
  rowIcon: {
    width: S.iconSize,             // 36px fixed — never shrinks
    height: S.iconSize,
    borderRadius: 10,
    backgroundColor: "#F4F2EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,                 // never compress the icon column
  },

  // Flex text column — for rows that only need a single label (no subtitle)
  rowLabel: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: "#2C332A",
    flex: 1,                       // takes all remaining space; pushes right element flush right
  },

  // Flex body column — for rows that need stacked title + subtitle
  rowBody: {
    flex: 1,                       // same as rowLabel: pushes chevron flush right
    gap: 3,
  },
  rowSubtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: "#7B8579",
  },

  // ── Toggle ──
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E2DFD8",
    padding: 4,
    justifyContent: "center",
    flexShrink: 0,                 // never compress the toggle
  },
  toggleOn: { backgroundColor: "#059669" },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: { alignSelf: "flex-end" },

  destructiveLabel: { color: "#C97A7E" },

  bottomPad: { height: 24 },
});
