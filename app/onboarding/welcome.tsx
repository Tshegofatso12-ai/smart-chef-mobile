import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={["#34D399", "#059669", "#047857"]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.iconCircle}
          >
            <Icon icon="solar:chef-hat-bold" size={56} color="#FFFFFF" />
          </LinearGradient>

          <Text style={styles.appName}>Smart Chef</Text>
          <Text style={styles.headline}>Cook smarter,{"\n"}eat better.</Text>
          <Text style={styles.subtitle}>
            Scan your ingredients and get personalised recipes in seconds — powered by AI.
          </Text>
        </View>

        {/* CTAs */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push({ pathname: "/onboarding/auth", params: { mode: "signup" } })}
          >
            <LinearGradient
              colors={["#34D399", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryGradient}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Icon icon="solar:alt-arrow-right-linear" size={18} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push({ pathname: "/onboarding/auth", params: { mode: "signin" } })}
          >
            <Text style={styles.secondaryButtonText}>Already have an account? Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F6F0" },
  safe: { flex: 1, paddingHorizontal: 32 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: 0 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  appName: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: "#059669",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  headline: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 40,
    color: "#2C332A",
    textAlign: "center",
    lineHeight: 50,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 15,
    color: "#7B8579",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  actions: { paddingBottom: 16, gap: 12 },
  primaryButton: {
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 40,
  },
  primaryButtonText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: "#7B8579",
  },
});
