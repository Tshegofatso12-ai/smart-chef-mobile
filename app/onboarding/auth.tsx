import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Icon } from "@/components/Icon";

type Mode = "signup" | "signin";

export default function AuthScreen() {
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(
    initialMode === "signin" ? "signin" : "signup"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        router.replace("/onboarding/preferences");
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("id", data.user.id)
          .single();
        if (profile?.onboarding_complete) {
          router.replace("/");
        } else {
          router.replace("/onboarding/preferences");
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Scrollable form */}
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            <Pressable
              style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.back()}
            >
              <Icon icon="solar:alt-arrow-left-linear" size={22} color="#2C332A" />
            </Pressable>

            {/* Header */}
            <Text style={styles.title}>
              {mode === "signup" ? "Create account" : "Welcome back"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "signup"
                ? "Start your smart cooking journey"
                : "Sign in to your Smart Chef account"}
            </Text>

            {/* Toggle */}
            <View style={styles.toggle}>
              <Pressable
                style={[styles.toggleBtn, mode === "signup" && styles.toggleBtnActive]}
                onPress={() => { setMode("signup"); setError(null); }}
              >
                <Text style={[styles.toggleText, mode === "signup" && styles.toggleTextActive]}>
                  Sign Up
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, mode === "signin" && styles.toggleBtnActive]}
                onPress={() => { setMode("signin"); setError(null); }}
              >
                <Text style={[styles.toggleText, mode === "signin" && styles.toggleTextActive]}>
                  Sign In
                </Text>
              </Pressable>
            </View>

            {/* Fields */}
            <View style={styles.fields}>
              <View>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#7B8579"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                />
              </View>

              <View>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="#7B8579"
                  secureTextEntry
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  style={styles.input}
                />
              </View>

              {mode === "signup" && (
                <View>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Repeat your password"
                    placeholderTextColor="#7B8579"
                    secureTextEntry
                    autoComplete="new-password"
                    style={styles.input}
                  />
                </View>
              )}
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Icon icon="solar:danger-triangle-bold" size={16} color="#C97A7E" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Sticky submit button — always visible above keyboard */}
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.submitButton, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === "signup" ? "Create Account" : "Sign In"}
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F6F0" },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 28, paddingTop: 0, paddingBottom: 16 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  title: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 30,
    color: "#2C332A",
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 14,
    color: "#7B8579",
    marginBottom: 28,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#F0EFEA",
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: "#7B8579",
  },
  toggleTextActive: {
    color: "#2C332A",
    fontFamily: "NunitoSans_700Bold",
  },
  fields: { gap: 16, marginBottom: 20 },
  label: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: "#2C332A",
    marginBottom: 6,
  },
  input: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#F0EFEA",
    borderWidth: 2,
    borderColor: "transparent",
    fontFamily: "NunitoSans_400Regular",
    fontSize: 15,
    color: "#2C332A",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(201,122,126,0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: "#C97A7E",
    flex: 1,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: "#F9F6F0",
  },
  submitButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
