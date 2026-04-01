import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const C = {
  bg:          "#F8F7F2",
  fg:          "#433935",
  primary:     "#10B981",
  primaryFg:   "#FFFFFF",
  card:        "#FFFFFF",
  muted:       "#E8E6E1",
  mutedFg:     "#7B8579",
  border:      "#E2E8F0",
  input:       "#F0EFEA",
  destructive: "#C97A7E",
};

type Mode = "signup" | "signin";

export default function AuthScreen() {
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const [mode,            setMode]            = useState<Mode>(initialMode === "signin" ? "signin" : "signup");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword,    setShowPassword]    = useState(false);
  const [loading,         setLoading]         = useState<false | "email" | "google" | "apple">(false);
  const [error,           setError]           = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setConfirmPassword("");
  };

  const redirectAfterAuth = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", userId)
      .single();
    router.replace(profile?.onboarding_complete ? "/" : "/onboarding/preferences");
  };

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

    setLoading("email");
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
        router.replace("/onboarding/preferences");
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        await redirectAfterAuth(data.user.id);
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading("google");
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "smart-chef://auth-callback",
          skipBrowserRedirect: true,
        },
      });
      if (oauthError) throw oauthError;
      if (!data.url) throw new Error("No OAuth URL returned.");

      const result = await WebBrowser.openAuthSessionAsync(data.url, "smart-chef://");
      if (result.type !== "success") return;

      // If the redirect landed on localhost the Google provider isn't configured in Supabase yet
      if (result.url.includes("localhost")) {
        throw new Error(
          "Google sign-in is not configured yet. Enable the Google provider in your Supabase Dashboard under Authentication → Providers."
        );
      }

      // Parse access_token and refresh_token from the redirect hash
      const hash = result.url.split("#")[1] ?? result.url.split("?")[1] ?? "";
      const params = Object.fromEntries(
        hash.split("&").map((p) => p.split("=").map(decodeURIComponent))
      );
      if (!params.access_token || !params.refresh_token) {
        throw new Error("Authentication failed. Please try again.");
      }

      await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await redirectAfterAuth(user.id);
    } catch (err: any) {
      setError(err?.message ?? "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setLoading("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("No identity token from Apple.");

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (signInError) throw signInError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) await redirectAfterAuth(user.id);
    } catch (err: any) {
      if ((err as any)?.code === "ERR_REQUEST_CANCELED") return; // user dismissed
      setError(err?.message ?? "Apple sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isSigning = mode === "signin";

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scroll}
          >
            {/* ── Header: back button ── */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={s.backBtn}
            >
              <Ionicons name="chevron-back" size={20} color={C.fg} />
            </TouchableOpacity>

            {/* ── Copy ── */}
            <Text style={s.title}>
              {isSigning ? "Welcome Back! 👋" : "Join SmartChef! 👋"}
            </Text>
            <Text style={s.subtitle}>
              {isSigning
                ? "Log in to your SmartChef account to sync your saved recipes and preferences."
                : "Create your account and start cooking smarter with AI."}
            </Text>

            {/* ── Fields ── */}
            <View style={s.fields}>
              {/* Email */}
              <View>
                <Text style={s.label}>Email Address</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="mail-outline" size={20} color={C.primary} style={s.inputIcon} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="chef@example.com"
                    placeholderTextColor={`${C.mutedFg}80`}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    style={s.input}
                  />
                </View>
              </View>

              {/* Password */}
              <View>
                <Text style={s.label}>Password</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={20} color={C.primary} style={s.inputIcon} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={`${C.mutedFg}80`}
                    secureTextEntry={!showPassword}
                    autoComplete={isSigning ? "current-password" : "new-password"}
                    style={[s.input, { paddingRight: 52 }]}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    activeOpacity={0.7}
                    style={s.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={C.mutedFg}
                    />
                  </TouchableOpacity>
                </View>
                {isSigning && (
                  <TouchableOpacity
                    onPress={() => Alert.alert("Coming Soon", "Password reset will be available soon.")}
                    activeOpacity={0.7}
                    style={s.forgotBtn}
                  >
                    <Text style={s.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Confirm password (sign up only) */}
              {!isSigning && (
                <View>
                  <Text style={s.label}>Confirm Password</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={20} color={C.primary} style={s.inputIcon} />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="••••••••"
                      placeholderTextColor={`${C.mutedFg}80`}
                      secureTextEntry
                      autoComplete="new-password"
                      style={s.input}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* ── Error ── */}
            {error && (
              <View style={s.errorBox}>
                <Ionicons name="warning-outline" size={16} color={C.destructive} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Primary submit ── */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading !== false}
              activeOpacity={0.9}
              style={[s.submitBtn, loading !== false && { opacity: 0.7 }]}
            >
              {loading === "email"
                ? <ActivityIndicator color={C.primaryFg} />
                : <Text style={s.submitBtnText}>{isSigning ? "Sign In" : "Create Account"}</Text>
              }
            </TouchableOpacity>

            {/* ── Divider ── */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerLabel}>Or continue with</Text>
              <View style={s.dividerLine} />
            </View>

            {/* ── Social buttons ── */}
            <View style={s.socialRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[s.socialBtn, loading !== false && { opacity: 0.6 }]}
                disabled={loading !== false}
                onPress={handleGoogleSignIn}
              >
                {loading === "google"
                  ? <ActivityIndicator size="small" color={C.fg} />
                  : <Ionicons name="logo-google" size={22} color={C.fg} />
                }
                <Text style={s.socialBtnText}>Google</Text>
              </TouchableOpacity>
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[s.socialBtn, loading !== false && { opacity: 0.6 }]}
                  disabled={loading !== false}
                  onPress={handleAppleSignIn}
                >
                  {loading === "apple"
                    ? <ActivityIndicator size="small" color={C.fg} />
                    : <Ionicons name="logo-apple" size={22} color={C.fg} />
                  }
                  <Text style={s.socialBtnText}>Apple</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Mode switch ── */}
            <View style={s.switchRow}>
              <Text style={s.switchText}>
                {isSigning ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => switchMode(isSigning ? "signup" : "signin")}
              >
                <Text style={s.switchLink}>
                  {isSigning ? "Sign Up" : "Sign In"}
                </Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },

  // ── Copy ──────────────────────────────────────────────────────────────────
  title: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 30,
    color: C.fg,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 15,
    color: C.mutedFg,
    lineHeight: 22,
    marginBottom: 32,
  },

  // ── Fields ────────────────────────────────────────────────────────────────
  fields: { gap: 20, marginBottom: 24 },
  label: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: C.mutedFg,
    marginBottom: 8,
    marginLeft: 16,
  },
  inputWrap: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 18,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 64,
    paddingLeft: 52,
    paddingRight: 20,
    borderRadius: 32,
    backgroundColor: C.input,
    borderWidth: 2,
    borderColor: "transparent",
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 15,
    color: C.fg,
  },
  eyeBtn: {
    position: "absolute",
    right: 18,
    padding: 4,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  forgotText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: C.primary,
  },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(201,122,126,0.08)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: C.destructive,
    flex: 1,
  },

  // ── Submit ────────────────────────────────────────────────────────────────
  submitBtn: {
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  submitBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 18,
    color: C.primaryFg,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(226,232,240,0.5)",
  },
  dividerLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 11,
    color: C.mutedFg,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  // ── Social ────────────────────────────────────────────────────────────────
  socialRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 32,
  },
  socialBtn: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.5)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  socialBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: C.fg,
  },

  // ── Mode switch ───────────────────────────────────────────────────────────
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  switchText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: C.mutedFg,
  },
  switchLink: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: C.primary,
  },
});
