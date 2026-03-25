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

const DIET_OPTIONS: { id: DietFilter; label: string; color: string }[] = [
  { id: "low-fat",      label: "Low-Fat",      color: "#059669" },
  { id: "low-carb",     label: "Low-Carb",     color: "#DDA77B" },
  { id: "high-protein", label: "High-Protein", color: "#C97A7E" },
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

  const initial = (profile?.display_name ?? user?.email ?? "C")[0].toUpperCase();
  const totalRecipes = sessions.reduce((n, s) => n + s.recipes.length, 0);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>

        {/* Backdrop */}
        <Animated.View style={[styles.backdropFill, { opacity: backdropAlpha }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Drawer */}
        <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
          <SafeAreaView style={styles.safe}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

              {/* Close button */}
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="close" size={18} color="#2C332A" />
              </Pressable>

              {/* ── Avatar + name ── */}
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
                <View style={styles.sectionLabelRow}>
                  <Text style={styles.sectionLabel}>DIETARY PREFERENCES</Text>
                  {savingPrefs && <ActivityIndicator size="small" color="#059669" />}
                </View>
                <View style={styles.card}>
                  {DIET_OPTIONS.map((opt, i) => {
                    const isOn = selectedPrefs.includes(opt.id);
                    return (
                      <React.Fragment key={opt.id}>
                        {i > 0 && <View style={styles.rowDivider} />}
                        <Pressable
                          onPress={() => togglePref(opt.id)}
                          style={({ pressed }) => [styles.prefRow, { opacity: pressed ? 0.7 : 1 }]}
                        >
                          <View style={styles.prefRowLeft}>
                            <View style={[styles.prefDot, { backgroundColor: isOn ? opt.color : "#E2DFD8" }]} />
                            <Text style={styles.prefRowLabel}>{opt.label}</Text>
                          </View>
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
                  <Pressable
                    onPress={() => navigate("/saved")}
                    style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={styles.menuRowIcon}>
                      <Ionicons name="bookmark-outline" size={18} color="#059669" />
                    </View>
                    <Text style={styles.menuRowLabel}>Saved Recipes</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{savedRecipeIds.length}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B0ADA6" />
                  </Pressable>

                  <View style={styles.rowDivider} />

                  <Pressable
                    onPress={() => navigate("/saved")}
                    style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={styles.menuRowIcon}>
                      <MaterialCommunityIcons name="history" size={18} color="#059669" />
                    </View>
                    <Text style={styles.menuRowLabel}>Recipe History</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{sessions.length}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B0ADA6" />
                  </Pressable>
                </View>
              </View>

              {/* ── Account ── */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>ACCOUNT</Text>
                <View style={styles.card}>
                  <Pressable
                    onPress={handleSignOut}
                    style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={styles.menuRowIcon}>
                      <Ionicons name="log-out-outline" size={18} color="#C97A7E" />
                    </View>
                    <Text style={[styles.menuRowLabel, styles.signOutLabel]}>Sign Out</Text>
                    <Ionicons name="chevron-forward" size={16} color="#B0ADA6" />
                  </Pressable>

                  <View style={styles.rowDivider} />

                  <Pressable
                    onPress={handleDeleteAccount}
                    disabled={deleting}
                    style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    {deleting
                      ? <ActivityIndicator size="small" color="#C97A7E" style={styles.menuRowIcon} />
                      : (
                        <View style={styles.menuRowIcon}>
                          <Ionicons name="trash-outline" size={18} color="#C97A7E" />
                        </View>
                      )
                    }
                    <Text style={[styles.menuRowLabel, styles.destructiveLabel]}>Delete Account</Text>
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
  overlay: { flex: 1, flexDirection: "row", justifyContent: "flex-end" },
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
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },

  // Close
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

  // Profile
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

  // Stats
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 22,
    marginBottom: 24,
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

  // Sections
  section: { marginBottom: 26 },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 11,
    color: "#7B8579",
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  // Card container
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
  rowDivider: { height: 1, backgroundColor: "#F4F2EE", marginLeft: 62 },

  // Preference row
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  prefRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  prefDot: { width: 10, height: 10, borderRadius: 5 },
  prefRowLabel: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: "#2C332A",
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E2DFD8",
    padding: 4,
    justifyContent: "center",
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

  // Menu row
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F4F2EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  menuRowLabel: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: "#2C332A",
    flexGrow: 1,
    flexShrink: 1,
  },
  countBadge: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F0EFEA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    flexShrink: 0,
  },
  countBadgeText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12,
    color: "#7B8579",
  },
  signOutLabel: { color: "#C97A7E" },
  destructiveLabel: { color: "#C97A7E" },

  bottomPad: { height: 24 },
});
