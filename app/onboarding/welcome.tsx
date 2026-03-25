import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const C = {
  bg:        "#F8F7F2",
  fg:        "#433935",
  primary:   "#10B981",
  primaryFg: "#FFFFFF",
  muted:     "#E8E6E1",
  mutedFg:   "#7B8579",
};

export default function WelcomeScreen() {
  return (
    <View style={s.root}>
      {/* Top-half green tint */}
      <View style={s.topGlow} pointerEvents="none" />

      <SafeAreaView style={s.safe}>

        {/* ── Hero ── */}
        <View style={s.heroSection}>
          {/* Blurred green glow behind image */}
          <View style={s.imageGlow} />
          <Image
            source={{ uri: "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/IXNk5Fj0Ara/components/cuS9v6ffnRD.png" }}
            style={s.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* ── Copy ── */}
        <View style={s.copySection}>
          <Text style={s.headline}>
            {"Cook Smarter with "}
            <Text style={s.headlinePrimary}>Magic Scan</Text>
          </Text>
          <Text style={s.subtitle}>
            Transform your ingredients into gourmet recipes using AI vision.
          </Text>
        </View>

        {/* ── Pagination dots ── */}
        <View style={s.dots}>
          <View style={[s.dot, s.dotActive]} />
          <View style={s.dot} />
          <View style={s.dot} />
        </View>

        {/* ── Actions ── */}
        <View style={s.actions}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={s.primaryBtn}
            onPress={() => router.push({ pathname: "/onboarding/auth", params: { mode: "signup" } })}
          >
            <Text style={s.primaryBtnText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={22} color={C.primaryFg} />
          </TouchableOpacity>

          <View style={s.signInRow}>
            <Text style={s.signInText}>Already have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: "/onboarding/auth", params: { mode: "signin" } })}
            >
              <Text style={s.signInLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Soft green wash over the top half of the screen
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(16,185,129,0.07)",
  },

  safe: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 8,
    paddingBottom: 12,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(16,185,129,0.18)",
    // blur approximated with a large, soft shadow
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    elevation: 0,
  },
  heroImage: {
    width: 300,
    height: 300,
  },

  // ── Copy ─────────────────────────────────────────────────────────────────
  copySection: {
    alignItems: "center",
    marginBottom: 28,
    gap: 12,
  },
  headline: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 34,
    color: C.fg,
    textAlign: "center",
    lineHeight: 42,
  },
  headlinePrimary: {
    color: C.primary,
    textDecorationLine: "underline",
    textDecorationColor: "rgba(16,185,129,0.3)",
  },
  subtitle: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 16,
    color: C.mutedFg,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
  },

  // ── Dots ──────────────────────────────────────────────────────────────────
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.muted,
  },
  dotActive: {
    width: 32,
    backgroundColor: C.primary,
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  actions: {
    gap: 16,
    paddingBottom: 8,
  },
  primaryBtn: {
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 18,
    color: C.primaryFg,
    letterSpacing: -0.3,
  },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: C.mutedFg,
  },
  signInLink: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: C.primary,
  },
});
