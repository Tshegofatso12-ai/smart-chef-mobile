import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useAppContext } from "@/context/AppContext";
import { useAuthContext } from "@/context/AuthContext";
import {
  extractIngredientsFromText,
  extractIngredientsFromImage,
  searchRecipeByQuery,
} from "@/lib/api";
import type { DietFilter, Recipe, RecipeSession } from "@/types";

const C = {
  background:        "#F9F6F0",
  foreground:        "#2C332A",
  primary:           "#059669",
  primaryForeground: "#FFFFFF",
  card:              "#FFFFFF",
  muted:             "#E8E6E1",
  mutedForeground:   "#7B8579",
  border:            "#E2DFD8",
  input:             "#F0EFEA",
  chart2:            "#C97A7E",
  chart3:            "#DDA77B",
};

type FilterDef = { id: DietFilter; label: string; icon: string; activeColor: string };

const DIET_FILTERS: FilterDef[] = [
  { id: "low-fat",      label: "Low-Fat",      icon: "solar:leaf-bold",  activeColor: C.primary },
  { id: "low-carb",     label: "Low-Carb",     icon: "solar:bone-bold",  activeColor: C.chart3  },
  { id: "high-protein", label: "High-Protein", icon: "solar:fire-bold",  activeColor: C.chart2  },
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
    sessions,
    isRecipeSaved,
    toggleSaved,
    addSession,
  } = useAppContext();
  const { profile, user } = useAuthContext();
  const insets = useSafeAreaInsets();

  // ─── Magic Scan spring animation ─────────────────────────────────────────
  const scanScale = useSharedValue(1);
  const scanAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanScale.value }],
  }));

  const [searchMode, setSearchMode] = useState<"ingredients" | "recipes">("ingredients");
  const [ingredientInput, setIngredientInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isScanLoading, setIsScanLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [isAiSearchLoading, setIsAiSearchLoading] = useState(false);

  // ─── Recipe search results ────────────────────────────────────────────────
  const recipeResults = useMemo<{ recipe: Recipe; session: RecipeSession }[]>(() => {
    if (searchMode !== "recipes" || !ingredientInput.trim()) return [];
    const q = ingredientInput.trim().toLowerCase();
    const results: { recipe: Recipe; session: RecipeSession }[] = [];
    for (const session of sessions) {
      for (const recipe of session.recipes) {
        if (
          recipe.title.toLowerCase().includes(q) ||
          recipe.ingredients.some((ing) => ing.toLowerCase().includes(q))
        ) {
          results.push({ recipe, session });
        }
      }
    }
    return results;
  }, [searchMode, ingredientInput, sessions]);
  const transcriptRef = useRef("");

  // ─── Speech recognition events ────────────────────────────────────────────
  useSpeechRecognitionEvent("result", (event) => {
    const t = event.results[0]?.transcript ?? "";
    transcriptRef.current = t;
  });

  useSpeechRecognitionEvent("end", async () => {
    setIsListening(false);
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
    Alert.alert("Voice Error", "Speech recognition failed. Please try again.");
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleAiSearch = async (query: string) => {
    setIsAiSearchLoading(true);
    try {
      const { sessionId, recipe, session } = await searchRecipeByQuery(query, activeDietFilter);
      await addSession(session);
      router.push({ pathname: "/recipe/[id]", params: { id: recipe.id, sessionId } });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not generate recipe. Please try again.");
    } finally {
      setIsAiSearchLoading(false);
    }
  };

  const handleTextSubmit = async () => {
    const text = ingredientInput.trim();
    if (!text) return;

    // Recipes mode: navigate to best local match or trigger AI generation
    if (searchMode === "recipes") {
      if (recipeResults.length > 0) {
        const { recipe, session } = recipeResults[0];
        router.push({ pathname: "/recipe/[id]", params: { id: recipe.id, sessionId: session.id } });
      } else {
        handleAiSearch(text);
      }
      return;
    }

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
      { text: "Camera",        onPress: () => pickImage("camera")  },
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
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.name}>
              {profile?.display_name ?? user?.email?.split("@")[0] ?? "Chef"} 👨‍🍳
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/profile")} style={s.avatarContainer} activeOpacity={0.75}>
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
                style={s.avatarGradient}
              >
                <Text style={s.avatarInitial}>
                  {(profile?.display_name ?? user?.email ?? "C")[0].toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
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
              <TouchableOpacity
                key={filter.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveDietFilter(isActive ? null : filter.id);
                }}
                style={[
                  s.filterPill,
                  isActive
                    ? [s.filterPillActive, { backgroundColor: filter.activeColor, shadowColor: filter.activeColor }]
                    : s.filterPillInactive,
                ]}
                activeOpacity={0.85}
              >
                <Icon icon={filter.icon} size={16} color={isActive ? C.primaryForeground : C.mutedForeground} />
                <Text style={[s.filterLabel, { color: isActive ? C.primaryForeground : C.foreground }]}>
                  {filter.label}
                </Text>
                {isActive && (
                  <Icon icon="hugeicons:cancel-01" size={12} color="rgba(255,255,255,0.7)" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Search section ── */}
        <View style={{ paddingHorizontal: 24, gap: 14, marginBottom: 8 }}>
          {/* Segmented toggle */}
          <View style={s.segmentWrap}>
            <TouchableOpacity
              onPress={() => setSearchMode("ingredients")}
              style={[s.segmentBtn, searchMode === "ingredients" && s.segmentBtnActive]}
              activeOpacity={0.85}
            >
              <Text style={[s.segmentLabel, searchMode === "ingredients" && s.segmentLabelActive]}>
                Ingredients
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSearchMode("recipes")}
              style={[s.segmentBtn, searchMode === "recipes" && s.segmentBtnActive]}
              activeOpacity={0.85}
            >
              <Text style={[s.segmentLabel, searchMode === "recipes" && s.segmentLabelActive]}>
                Recipes
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <View style={s.inputWrapper}>
            <View style={s.inputIconLeft}>
              <Icon icon="solar:magnifer-linear" size={20} color={C.primary} />
            </View>
            <TextInput
              value={ingredientInput}
              onChangeText={setIngredientInput}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={handleTextSubmit}
              placeholder={
                searchMode === "ingredients"
                  ? "Type ingredients (e.g. eggs, kale...)"
                  : "Search for recipes..."
              }
              placeholderTextColor={C.mutedForeground}
              returnKeyType="search"
              style={[s.input, inputFocused && s.inputFocused, { fontFamily: "NunitoSans_600SemiBold" }]}
            />
            <TouchableOpacity
              style={s.filterBtn}
              activeOpacity={0.85}
              onPress={searchMode === "ingredients" && ingredientInput.trim() ? handleTextSubmit : undefined}
            >
              {isTextLoading
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Icon icon="solar:filter-bold-duotone" size={20} color={C.primary} />
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Recipe search results (recipes mode + query active) ── */}
        {searchMode === "recipes" && ingredientInput.trim() ? (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100, paddingTop: 8, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {recipeResults.length > 0 ? (
              recipeResults.map(({ recipe, session }) => (
                <TouchableOpacity
                  key={recipe.id}
                  onPress={() =>
                    router.push({ pathname: "/recipe/[id]", params: { id: recipe.id, sessionId: session.id } })
                  }
                  style={s.resultCard}
                  activeOpacity={0.9}
                >
                  <View style={{ flex: 1, gap: 6, paddingRight: 48 }}>
                    <Text style={s.resultTitle} numberOfLines={2}>{recipe.title}</Text>
                    <View style={s.resultMeta}>
                      <View style={s.resultMetaItem}>
                        <Icon icon="solar:fire-bold" size={13} color={C.chart2} />
                        <Text style={s.resultMetaText}>{recipe.calories}</Text>
                      </View>
                      <View style={s.resultMetaItem}>
                        <Icon icon="solar:clock-circle-bold" size={13} color={C.chart3} />
                        <Text style={s.resultMetaText}>{recipe.cookTime}</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleSaved(recipe.id, session.id)}
                    style={s.resultBookmark}
                    activeOpacity={0.8}
                  >
                    <Icon
                      icon={isRecipeSaved(recipe.id) ? "solar:bookmark-bold" : "solar:bookmark-outline"}
                      size={20}
                      color={C.primary}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              <View style={s.noResults}>
                <Icon icon="solar:magnifer-bold-duotone" size={40} color={C.mutedForeground} />
                <Text style={s.noResultsTitle}>No recipes found</Text>
                <Text style={s.noResultsSub}>
                  No saved recipes match "{ingredientInput.trim()}". Let AI generate one for you.
                </Text>
                <TouchableOpacity
                  onPress={() => handleAiSearch(ingredientInput.trim())}
                  style={s.aiGenerateBtn}
                  activeOpacity={0.88}
                  disabled={isAiSearchLoading}
                >
                  {isAiSearchLoading ? (
                    <ActivityIndicator size="small" color={C.primaryForeground} />
                  ) : (
                    <Icon icon="solar:magic-stick-3-bold" size={20} color={C.primaryForeground} />
                  )}
                  <Text style={s.aiGenerateBtnText}>
                    {isAiSearchLoading ? "Generating…" : `Generate "${ingredientInput.trim()}"`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        ) : (
          /* ── Hero (default state) ── */
          <View style={s.main}>
            {/* Magic Scan 3D button */}
            <Animated.View style={scanAnimStyle}>
              <TouchableOpacity
                onPress={handleMagicScan}
                onPressIn={() => { scanScale.value = withSpring(0.92, { damping: 14, stiffness: 450 }); }}
                onPressOut={() => { scanScale.value = withSpring(1,    { damping: 11, stiffness: 280 }); }}
                activeOpacity={1}
              >
                <View style={s.scanShadowWrap}>
                  <LinearGradient
                    colors={["#6EE7B7", "#059669", "#047857"]}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.85, y: 1 }}
                    style={s.scanButton}
                  >
                    <LinearGradient
                      colors={["rgba(255,255,255,0.38)", "rgba(255,255,255,0.10)", "transparent"]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={s.scanGloss}
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.18)"]}
                      start={{ x: 0.5, y: 0.6 }}
                      end={{ x: 0.5, y: 1 }}
                      style={s.scanRim}
                    />
                    <View style={s.scanIconCircle}>
                      <Icon icon="solar:scanner-2-bold-duotone" size={44} color={C.primaryForeground} />
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontFamily: "NunitoSans_800ExtraBold", fontSize: 20, color: C.primaryForeground, letterSpacing: -0.5 }}>
                        Magic Scan
                      </Text>
                      <Text style={{ fontFamily: "NunitoSans_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>
                        Tap to scan ingredients
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Voice button */}
            <View style={s.voiceWrap}>
              <TouchableOpacity
                onPress={handleVoice}
                style={[s.voiceBtn, isListening && s.voiceBtnActive]}
                activeOpacity={0.85}
              >
                {isVoiceLoading ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <Icon
                    icon={isListening ? "solar:soundwave-bold" : "solar:microphone-3-bold"}
                    size={24}
                    color={isListening ? C.primaryForeground : C.primary}
                  />
                )}
                <Text style={[s.voiceBtnText, isListening && { color: C.primaryForeground }]}>
                  {isListening ? "Listening…" : isVoiceLoading ? "Processing…" : "Speak Your Ingredients"}
                </Text>
              </TouchableOpacity>
              <Text style={s.voiceTagline}>
                Don't feel like scanning? Just tell SmartChef what you have.
              </Text>
            </View>
          </View>
        )}

      </SafeAreaView>

      {/* ── Bottom nav ── */}
      <View style={[s.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={s.navItem} activeOpacity={0.7}>
          <Icon icon="solar:home-2-bold-duotone" size={24} color={C.primary} />
          <Text style={[s.navLabel, { color: C.primary }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navItem} activeOpacity={0.7}>
          <Icon icon="solar:magnifer-bold-duotone" size={24} color={C.mutedForeground} />
          <Text style={[s.navLabel, { color: C.mutedForeground }]}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/saved")} style={s.navItem} activeOpacity={0.7}>
          <Icon icon="solar:chef-hat-bold-duotone" size={24} color={C.mutedForeground} />
          <Text style={[s.navLabel, { color: C.mutedForeground }]}>Recipes</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/profile")} style={s.navItem} activeOpacity={0.7}>
          <Icon icon="solar:user-bold-duotone" size={24} color={C.mutedForeground} />
          <Text style={[s.navLabel, { color: C.mutedForeground }]}>Profile</Text>
        </TouchableOpacity>
      </View>

      <LoadingOverlay
        visible={isScanLoading || isVoiceLoading || isAiSearchLoading}
        message={
          isScanLoading ? "Scanning ingredients..." :
          isVoiceLoading ? "Processing voice..." :
          "Generating recipe…"
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  // ── Header ────────────────────────────────────────────────────────────────
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

  // ── Diet filter pills ──────────────────────────────────────────────────────
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

  // ── Segmented toggle ──────────────────────────────────────────────────────
  segmentWrap: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "#E8E6E1",
    borderRadius: 16,
    padding: 6,
    gap: 4,
  },
  segmentBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 12,
  },
  segmentBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: "#7B8579",
  },
  segmentLabelActive: {
    color: "#2C332A",
  },

  // ── Search input ──────────────────────────────────────────────────────────
  inputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  inputIconLeft: {
    position: "absolute",
    left: 20,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 60,
    paddingLeft: 52,
    paddingRight: 60,
    borderRadius: 32,
    backgroundColor: "#F0EFEA",
    borderWidth: 2,
    borderColor: "transparent",
    fontSize: 14,
    color: "#2C332A",
  },
  inputFocused: {
    borderColor: "rgba(5,150,105,0.3)",
    backgroundColor: "#FFFFFF",
  },
  filterBtn: {
    position: "absolute",
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  // ── Main centred area ──────────────────────────────────────────────────────
  main: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 24,
    gap: 28,
  },

  // ── Scan button ───────────────────────────────────────────────────────────
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

  // ── Voice button ──────────────────────────────────────────────────────────
  voiceWrap: {
    alignItems: "center",
    width: 280,
    gap: 12,
  },
  voiceBtn: {
    width: "100%",
    height: 56,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceBtnActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
    shadowColor: "#059669",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  voiceBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#2C332A",
  },
  voiceTagline: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10,
    color: "#7B8579",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 16,
  },

  // ── Recipe search results ─────────────────────────────────────────────────
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#2C332A",
    lineHeight: 20,
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  resultMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resultMetaText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12,
    color: "#7B8579",
  },
  resultBookmark: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(5,150,105,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  noResults: {
    alignItems: "center",
    paddingVertical: 64,
    gap: 12,
  },
  noResultsTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 18,
    color: "#2C332A",
  },
  noResultsSub: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 14,
    color: "#7B8579",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  aiGenerateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 32,
    backgroundColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  aiGenerateBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },

  // ── Bottom nav ────────────────────────────────────────────────────────────
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: "rgba(249,246,240,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(226,223,216,0.5)",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  navLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10,
  },
});
