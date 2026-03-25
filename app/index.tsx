import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

// expo-speech-recognition requires a native build — guard for Expo Go
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: (event: string, cb: (e: any) => void) => void = () => {};
try {
  const speechMod = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = speechMod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechMod.useSpeechRecognitionEvent;
} catch {
  // running in Expo Go — voice input disabled
}

import { Icon } from "@/components/Icon";
import { RecipeRow } from "@/components/RecipeRow";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useAppContext } from "@/context/AppContext";
import { useAuthContext } from "@/context/AuthContext";
import {
  extractIngredientsFromText,
  extractIngredientsFromImage,
} from "@/lib/api";
import type { DietFilter, Ingredient, Recipe } from "@/types";

const COLORS = {
  background: "#F9F6F0",
  foreground: "#2C332A",
  primary: "#059669",
  primaryForeground: "#FFFFFF",
  card: "#FFFFFF",
  muted: "#E8E6E1",
  mutedForeground: "#7B8579",
  border: "#E2DFD8",
  input: "#F0EFEA",
  chart2: "#C97A7E",
  chart3: "#DDA77B",
};

type FilterDef = { id: DietFilter; label: string; icon: string; activeColor: string };

const DIET_FILTERS: FilterDef[] = [
  { id: "low-fat", label: "Low-Fat", icon: "solar:leaf-bold", activeColor: COLORS.primary },
  { id: "low-carb", label: "Low-Carb", icon: "solar:bone-bold", activeColor: COLORS.chart3 },
  { id: "high-protein", label: "High-Protein", icon: "solar:fire-bold", activeColor: COLORS.chart2 },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning,";
  if (hour < 18) return "Good Afternoon,";
  return "Good Evening,";
}

export default function HomeScreen() {
  const {
    activeDietFilter,
    setActiveDietFilter,
    setTrayIngredients,
    setScannedImageUri,
    savedRecipeIds,
    sessions,
  } = useAppContext();
  const { profile, user } = useAuthContext();

  // ─── Magic Scan spring animation ─────────────────────────────────────────
  const scanScale = useSharedValue(1);
  const scanAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanScale.value }],
  }));

  const [ingredientInput, setIngredientInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isScanLoading, setIsScanLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const transcriptRef = useRef("");

  // ─── Recent scans: ingredients from the last session that has images ────────
  const recentIngredients: Ingredient[] = sessions.length > 0
    ? sessions[0].ingredients.filter((ing) => ing.image).slice(0, 5)
    : [];

  // ─── Saved recipes (last 4, shown below scans if available) ─────────────────
  const savedEntries = savedRecipeIds
    .slice(0, 4)
    .map((entry) => {
      const session = sessions.find((s) => s.id === entry.sessionId);
      const recipe = session?.recipes.find((r) => r.id === entry.recipeId);
      return recipe && session ? { recipe, session } : null;
    })
    .filter((x): x is { recipe: Recipe; session: any } => x !== null);

  // ─── Speech recognition events ────────────────────────────────────────────
  useSpeechRecognitionEvent("result", (event) => {
    const t = event.results[0]?.transcript ?? "";
    transcriptRef.current = t;
    setLiveTranscript(t);
  });

  useSpeechRecognitionEvent("end", async () => {
    setIsListening(false);
    setLiveTranscript("");
    const transcript = transcriptRef.current;
    transcriptRef.current = "";
    if (!transcript) return;
    setIsVoiceLoading(true);
    try {
      const ingredients = await extractIngredientsFromText(transcript);
      setTrayIngredients(ingredients);
      setScannedImageUri(null);
      router.push("/ingredient-tray");
    } catch {
      Alert.alert("Error", "Could not extract ingredients from voice. Please try again.");
    } finally {
      setIsVoiceLoading(false);
    }
  });

  useSpeechRecognitionEvent("error", () => {
    setIsListening(false);
    setLiveTranscript("");
    Alert.alert("Voice Error", "Speech recognition failed. Please try again.");
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleTextSubmit = async () => {
    const text = ingredientInput.trim();
    if (!text) return;
    setIsTextLoading(true);
    try {
      const ingredients = await extractIngredientsFromText(text);
      setTrayIngredients(ingredients);
      setScannedImageUri(null);
      setIngredientInput("");
      router.push("/ingredient-tray");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? String(err));
    } finally {
      setIsTextLoading(false);
    }
  };

  const handleMagicScan = () => {
    Alert.alert("Magic Scan", "Choose a source", [
      { text: "Camera", onPress: () => pickImage("camera") },
      { text: "Photo Library", onPress: () => pickImage("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickImage = async (source: "camera" | "library") => {
    let result;
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Camera access is required to scan ingredients.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7, mediaTypes: ["images"] });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Photo library access is required.");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ["images"] });
    }
    if (result.canceled || !result.assets[0]?.base64) return;
    const { base64, mimeType, uri } = result.assets[0];
    setIsScanLoading(true);
    try {
      const ingredients = await extractIngredientsFromImage(
        base64!,
        (mimeType === "image/png" ? "image/png" : "image/jpeg")
      );
      setTrayIngredients(ingredients);
      setScannedImageUri(uri);
      router.push("/ingredient-tray");
    } catch {
      Alert.alert("Error", "Could not detect ingredients from image. Please try again.");
    } finally {
      setIsScanLoading(false);
    }
  };

  const handleVoice = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert("Voice Input", "Voice input requires a native build. Run `npx expo run:ios` to enable it.");
      return;
    }
    if (isListening) { ExpoSpeechRecognitionModule.stop(); return; }
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) { Alert.alert("Permission Denied", "Microphone access is required for voice input."); return; }
    transcriptRef.current = "";
    setIsListening(true);
    ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: false, maxAlternatives: 1 });
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>
              {profile?.display_name ?? user?.email?.split("@")[0] ?? "Chef"} 👨‍🍳
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/profile")}
            style={({ pressed }) => [styles.avatarContainer, { opacity: pressed ? 0.75 : 1 }]}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={["#34D399", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarInitial}>
                  {(profile?.display_name ?? user?.email ?? "C")[0].toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </Pressable>
        </View>

        {/* ── Diet Filters ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 10, paddingBottom: 8 }}
          style={{ flexGrow: 0, marginBottom: 16 }}
        >
          {DIET_FILTERS.map((filter) => {
            const isActive = activeDietFilter === filter.id;
            return (
              <Pressable
                key={filter.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveDietFilter(isActive ? null : filter.id);
                }}
                style={[
                  styles.filterPill,
                  isActive
                    ? [styles.filterPillActive, { backgroundColor: filter.activeColor, shadowColor: filter.activeColor }]
                    : styles.filterPillInactive,
                ]}
              >
                <Icon icon={filter.icon} size={16} color={isActive ? COLORS.primaryForeground : COLORS.mutedForeground} />
                <Text style={[styles.filterLabel, { color: isActive ? COLORS.primaryForeground : COLORS.foreground }]}>
                  {filter.label}
                </Text>
                {isActive && (
                  <Icon icon="hugeicons:cancel-01" size={12} color="rgba(255,255,255,0.7)" />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Text Input ── */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <View style={styles.inputWrapper}>
            <View style={styles.inputIcon}>
              <Icon icon="solar:pen-new-square-bold-duotone" size={20} color={COLORS.primary} />
            </View>
            <TextInput
              value={ingredientInput}
              onChangeText={setIngredientInput}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={handleTextSubmit}
              placeholder="Type ingredients (e.g. eggs, kale...)"
              placeholderTextColor={COLORS.mutedForeground}
              returnKeyType="send"
              style={[styles.input, inputFocused && styles.inputFocused, { fontFamily: "NunitoSans_600SemiBold", paddingRight: 56 }]}
            />
            <Pressable
              onPress={handleTextSubmit}
              style={[styles.sendButton, { opacity: ingredientInput.trim() ? 1 : 0.4 }]}
              disabled={!ingredientInput.trim() || isTextLoading}
            >
              {isTextLoading
                ? <ActivityIndicator size="small" color={COLORS.primaryForeground} />
                : <Icon icon="solar:send-bold" size={16} color={COLORS.primaryForeground} />
              }
            </Pressable>
          </View>
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Magic Scan Button — 3D squishy */}
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Animated.View style={scanAnimStyle}>
              <Pressable
                onPress={handleMagicScan}
                onPressIn={() => {
                  scanScale.value = withSpring(0.92, { damping: 14, stiffness: 450 });
                }}
                onPressOut={() => {
                  scanScale.value = withSpring(1, { damping: 11, stiffness: 280 });
                }}
              >
                <View style={styles.scanShadowWrap}>
                  <LinearGradient
                    colors={["#6EE7B7", "#059669", "#047857"]}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.85, y: 1 }}
                    style={styles.scanButton}
                  >
                    <LinearGradient
                      colors={["rgba(255,255,255,0.38)", "rgba(255,255,255,0.10)", "transparent"]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.scanGloss}
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.18)"]}
                      start={{ x: 0.5, y: 0.6 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.scanRim}
                    />
                    <View style={styles.scanIconCircle}>
                      <Icon icon="solar:scanner-2-bold-duotone" size={44} color={COLORS.primaryForeground} />
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontFamily: "NunitoSans_800ExtraBold", fontSize: 20, color: COLORS.primaryForeground, letterSpacing: -0.5 }}>
                        Magic Scan
                      </Text>
                      <Text style={{ fontFamily: "NunitoSans_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>
                        Tap to scan ingredients
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              </Pressable>
            </Animated.View>
          </View>

          {/* ── Voice Input ── */}
          <View style={styles.section}>
            <View style={styles.voiceCard}>
              <Pressable
                onPress={handleVoice}
                style={({ pressed }) => [
                  styles.voiceMicButton,
                  isListening && styles.voiceMicButtonActive,
                  { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
                ]}
              >
                {isVoiceLoading ? (
                  <ActivityIndicator size="large" color={COLORS.primaryForeground} />
                ) : (
                  <Icon
                    icon={isListening ? "solar:soundwave-bold" : "solar:microphone-3-bold"}
                    size={32}
                    color={isListening ? COLORS.primaryForeground : COLORS.foreground}
                  />
                )}
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text style={styles.voiceTitle}>
                  {isListening ? "Listening…" : isVoiceLoading ? "Processing…" : "Voice Input"}
                </Text>
                {isListening && liveTranscript ? (
                  <Text style={styles.voiceTranscript} numberOfLines={2}>{liveTranscript}</Text>
                ) : (
                  <Text style={styles.voiceSubtitle}>
                    {isListening ? "Speak your ingredients" : "Tap mic and say your ingredients"}
                  </Text>
                )}
              </View>

              {isListening && (
                <Pressable
                  onPress={handleVoice}
                  style={styles.voiceStopButton}
                >
                  <Text style={styles.voiceStopText}>Stop</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* ── Recent Scans carousel ── */}
          {recentIngredients.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Scans</Text>
                <Pressable onPress={() => router.push({ pathname: "/saved", params: { tab: "history" } })}>
                  <Text style={styles.sectionLink}>View All</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scanCarouselContent}
              >
                {recentIngredients.map((ing) => (
                  <View key={ing.id} style={styles.scanCard}>
                    {/* Ingredient photo */}
                    <View style={styles.scanCardImageWrap}>
                      <Image
                        source={{ uri: ing.image }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                      {/* Check badge */}
                      <View style={styles.scanCardCheck}>
                        <Icon icon="solar:check-circle-bold" size={14} color={COLORS.primary} />
                      </View>
                    </View>
                    <Text style={styles.scanCardName} numberOfLines={1}>{ing.name}</Text>
                    <Text style={styles.scanCardSub} numberOfLines={1}>{ing.subtitle}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Saved Recipes ── */}
          {savedEntries.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Saved Recipes</Text>
                <Pressable onPress={() => router.push("/saved")}>
                  <Text style={styles.sectionLink}>View All</Text>
                </Pressable>
              </View>
              <View style={styles.listCard}>
                {savedEntries.map(({ recipe, session }, idx) => (
                  <React.Fragment key={recipe.id}>
                    {idx > 0 && <View style={styles.divider} />}
                    <RecipeRow recipe={recipe} sessionId={session.id} isSaved />
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>

      <LoadingOverlay
        visible={isScanLoading || isVoiceLoading}
        message={isScanLoading ? "Scanning ingredients..." : "Processing voice..."}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 12,
  },
  greeting: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: "#7B8579",
    marginBottom: 2,
  },
  name: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 22,
    color: "#2C332A",
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  filterPillActive: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterPillInactive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  filterLabel: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
  },
  inputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 52,
    paddingLeft: 48,
    paddingRight: 16,
    borderRadius: 999,
    backgroundColor: "#F0EFEA",
    borderWidth: 2,
    borderColor: "transparent",
    fontSize: 14,
    color: "#2C332A",
  },
  inputFocused: {
    borderColor: "rgba(138,154,134,0.3)",
    backgroundColor: "#FFFFFF",
  },
  sendButton: {
    position: "absolute",
    right: 6,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  scanShadowWrap: {
    shadowColor: "#5A7056",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
  },
  scanButton: {
    width: 220,
    height: 220,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  scanGloss: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
  },
  scanRim: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
  },
  scanIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
    color: "#2C332A",
  },
  sectionLink: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: "#059669",
  },
  listCard: {
    marginHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    padding: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(226,223,216,0.6)",
    marginHorizontal: 16,
    
  },
  voiceCard: {
    marginHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceMicButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0EFEA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.6)",
    flexShrink: 0,
  },
  voiceMicButtonActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  voiceTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: "#2C332A",
    marginBottom: 3,
  },
  voiceSubtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: "#7B8579",
  },
  voiceTranscript: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12,
    color: "#059669",
    fontStyle: "italic",
  },
  voiceStopButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(201,122,126,0.1)",
  },
  voiceStopText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12,
    color: "#C97A7E",
  },

  // ── Recent Scans carousel ──────────────────────────────────────────────────
  scanCarouselContent: {
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 4,
  },
  scanCard: {
    width: 136,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    flexShrink: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scanCardImageWrap: {
    height: 108,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E8E6E1",
    marginBottom: 10,
    position: "relative",
  },
  scanCardCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanCardName: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: "#2C332A",
    marginBottom: 2,
  },
  scanCardSub: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 11,
    color: "#7B8579",
  },
});
