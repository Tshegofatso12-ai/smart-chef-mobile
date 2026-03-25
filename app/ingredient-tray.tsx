import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { Shimmer } from "@/components/Shimmer";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useAppContext } from "@/context/AppContext";
import { useAuthContext } from "@/context/AuthContext";
import {
  generateRecipes,
  extractIngredientsFromText,
  extractIngredientsFromImage,
  applyIngredientFix,
} from "@/lib/api";
import type { Ingredient, RecipeSession } from "@/types";

// expo-speech-recognition guard (requires native build)
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: (event: string, cb: (e: any) => void) => void = () => {};
try {
  const speechMod = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = speechMod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechMod.useSpeechRecognitionEvent;
} catch {
  // Expo Go — voice disabled
}

const COLORS = {
  background: "#F9F6F0",
  foreground: "#2C332A",
  primary: "#059669",
  primaryForeground: "#FFFFFF",
  card: "#FFFFFF",
  muted: "#E8E6E1",
  mutedForeground: "#7B8579",
  border: "#E2DFD8",
  destructive: "#C97A7E",
};

const INITIAL_INGREDIENTS: Ingredient[] = [
  {
    id: "1",
    name: "Spinach",
    subtitle: "Fresh Leaves",
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/IXNk5Fj0Ara/components/OPHrdYQYloS.png",
    wide: false,
  },
  {
    id: "2",
    name: "Chicken",
    subtitle: "Lean Breast",
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/placeholder/square.png",
    wide: false,
  },
  {
    id: "3",
    name: "Cherry Tomatoes",
    subtitle: "Ripe & Sweet",
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/IXNk5Fj0Ara/components/qsge76Yy1pd.png",
    wide: true,
    badge: "Antioxidant Rich",
  },
  {
    id: "4",
    name: "Red Onion",
    subtitle: "Whole Bulb",
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/IXNk5Fj0Ara/components/WG28jaAmW65.png",
    wide: false,
  },
  {
    id: "5",
    name: "Garlic",
    subtitle: "Fresh Clove",
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/IXNk5Fj0Ara/components/HtoW8pmfzGR.png",
    wide: false,
  },
];

function IngredientRow({
  item,
  onRemove,
  isLast,
}: {
  item: Ingredient;
  onRemove: () => void;
  isLast: boolean;
}) {
  return (
    <View style={[styles.listItem, !isLast && styles.listItemBorder]}>
      <View style={styles.listDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.listName}>{item.name}</Text>
        {item.subtitle ? <Text style={styles.listSubtitle}>{item.subtitle}</Text> : null}
      </View>
      <Pressable
        onPress={onRemove}
        style={({ pressed }) => [
          styles.listRemoveBtn,
          { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] },
        ]}
        hitSlop={8}
      >
        <Icon icon="hugeicons:cancel-01" size={15} color={COLORS.destructive} />
      </Pressable>
    </View>
  );
}

function ShimmerRow({ isLast }: { isLast: boolean }) {
  return (
    <View style={[styles.listItem, !isLast && styles.listItemBorder]}>
      <View style={[styles.listDot, { backgroundColor: "#E8E6E1" }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ height: 14, width: "55%", borderRadius: 6, backgroundColor: "#E8E6E1", overflow: "hidden" }}>
          <Shimmer />
        </View>
        <View style={{ height: 10, width: "35%", borderRadius: 5, backgroundColor: "#EEEDE9", overflow: "hidden" }}>
          <Shimmer />
        </View>
      </View>
    </View>
  );
}

export default function IngredientTrayScreen() {
  const { trayIngredients, activeDietFilter, addSession, scannedImageUri, setScannedImageUri } = useAppContext();
  const { profile } = useAuthContext();
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    trayIngredients.length > 0 ? trayIngredients : INITIAL_INGREDIENTS
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // Brief shimmer reveal when arriving from an AI scan
  const [isInitialLoading, setIsInitialLoading] = useState(
    () => trayIngredients.length > 0
  );
  useEffect(() => {
    if (!isInitialLoading) return;
    const t = setTimeout(() => setIsInitialLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  // ─── Add ingredients sheet state ────────────────────────────────────────
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<"menu" | "text">("menu");
  const [textInput, setTextInput] = useState("");
  const [isAddingText, setIsAddingText] = useState(false);
  const [isAddingScan, setIsAddingScan] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const transcriptRef = useRef("");
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ─── Fix Issue sheet state ───────────────────────────────────────────────
  const [fixSheetVisible, setFixSheetVisible] = useState(false);
  const [fixInput, setFixInput] = useState("");
  const [isFixing, setIsFixing] = useState(false);
  const [isFixListening, setIsFixListening] = useState(false);
  const [isFixVoiceLoading, setIsFixVoiceLoading] = useState(false);
  const [liveFixTranscript, setLiveFixTranscript] = useState("");
  const fixTranscriptRef = useRef("");
  const fixSlideAnim = useRef(new Animated.Value(0)).current;
  // tracks which flow owns the current voice session
  const voicePurposeRef = useRef<"add" | "fix">("add");

  const openSheet = () => {
    setSheetMode("menu");
    setTextInput("");
    setSheetVisible(true);
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setSheetVisible(false);
      setSheetMode("menu");
      setTextInput("");
    });
  };

  const openFixSheet = () => {
    setFixInput("");
    setFixSheetVisible(true);
    Animated.spring(fixSlideAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
  };

  const closeFixSheet = () => {
    Animated.timing(fixSlideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setFixSheetVisible(false);
      setFixInput("");
    });
  };

  const handleApplyFix = async (instruction: string) => {
    if (!instruction.trim()) return;
    setIsFixing(true);
    try {
      const updated = await applyIngredientFix(ingredients, instruction);
      setIngredients(updated);
      closeFixSheet();
    } catch {
      Alert.alert("Error", "Could not apply fix. Please try again.");
    } finally {
      setIsFixing(false);
    }
  };

  const handleFixVoice = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert("Voice Input", "Voice requires a native build. Run `npx expo run:ios`.");
      return;
    }
    if (isFixListening) { ExpoSpeechRecognitionModule.stop(); return; }
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) { Alert.alert("Permission Denied", "Microphone access is required."); return; }
    voicePurposeRef.current = "fix";
    fixTranscriptRef.current = "";
    setIsFixListening(true);
    ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: false, maxAlternatives: 1 });
  };

  const mergeIngredients = (newItems: Ingredient[]) => {
    setIngredients((prev) => [...prev, ...newItems]);
  };

  // Voice events (shared — voicePurposeRef tracks which flow owns the session)
  useSpeechRecognitionEvent("result", (e) => {
    const t = e.results[0]?.transcript ?? "";
    if (voicePurposeRef.current === "fix") {
      fixTranscriptRef.current = t;
      setLiveFixTranscript(t);
    } else {
      transcriptRef.current = t;
      setLiveTranscript(t);
    }
  });

  useSpeechRecognitionEvent("end", async () => {
    if (voicePurposeRef.current === "fix") {
      setIsFixListening(false);
      setLiveFixTranscript("");
      const transcript = fixTranscriptRef.current;
      fixTranscriptRef.current = "";
      if (!transcript) return;
      setIsFixVoiceLoading(true);
      try {
        await handleApplyFix(transcript);
      } finally {
        setIsFixVoiceLoading(false);
      }
    } else {
      setIsListening(false);
      setLiveTranscript("");
      const transcript = transcriptRef.current;
      transcriptRef.current = "";
      if (!transcript) return;
      setIsVoiceLoading(true);
      try {
        const items = await extractIngredientsFromText(transcript);
        mergeIngredients(items);
        closeSheet();
      } catch {
        Alert.alert("Error", "Could not extract ingredients from voice.");
      } finally {
        setIsVoiceLoading(false);
      }
    }
  });

  useSpeechRecognitionEvent("error", () => {
    if (voicePurposeRef.current === "fix") {
      setIsFixListening(false);
      setLiveFixTranscript("");
    } else {
      setIsListening(false);
      setLiveTranscript("");
    }
    Alert.alert("Voice Error", "Speech recognition failed. Please try again.");
  });

  const handleAddText = async () => {
    const text = textInput.trim();
    if (!text) return;
    setIsAddingText(true);
    try {
      const items = await extractIngredientsFromText(text);
      mergeIngredients(items);
      closeSheet();
    } catch {
      Alert.alert("Error", "Could not extract ingredients.");
    } finally {
      setIsAddingText(false);
    }
  };

  const handleAddScan = () => {
    closeSheet();
    setTimeout(() => pickImageForAdd(), 300);
  };

  const pickImageForAdd = async () => {
    Alert.alert("Add via Photo", "Choose a source", [
      { text: "Camera", onPress: () => doPickImage("camera") },
      { text: "Photo Library", onPress: () => doPickImage("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const doPickImage = async (source: "camera" | "library") => {
    let result;
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission Denied", "Camera access is required."); return; }
      result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7, mediaTypes: ["images"] });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission Denied", "Photo library access is required."); return; }
      result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ["images"] });
    }
    if (result.canceled || !result.assets[0]?.base64) return;
    const { base64, mimeType } = result.assets[0];
    setIsAddingScan(true);
    try {
      const items = await extractIngredientsFromImage(base64!, mimeType === "image/png" ? "image/png" : "image/jpeg");
      mergeIngredients(items);
      setScannedImageUri(result.assets[0].uri);
    } catch {
      Alert.alert("Error", "Could not detect ingredients from image.");
    } finally {
      setIsAddingScan(false);
    }
  };

  const handleAddVoice = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert("Voice Input", "Voice requires a native build. Run `npx expo run:ios`.");
      return;
    }
    if (isListening) { ExpoSpeechRecognitionModule.stop(); return; }
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) { Alert.alert("Permission Denied", "Microphone access is required."); return; }
    voicePurposeRef.current = "add";
    transcriptRef.current = "";
    setIsListening(true);
    ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: false, maxAlternatives: 1 });
  };

  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  const handleGenerateRecipe = async () => {
    if (ingredients.length === 0) {
      Alert.alert("No Ingredients", "Please add at least one ingredient to generate a recipe.");
      return;
    }

    setIsGenerating(true);
    try {
      const userPreferences = profile
        ? {
            dietary_preferences: profile.dietary_preferences,
            allergies: profile.allergies,
            cooking_skill: profile.cooking_skill,
          }
        : undefined;
      const { sessionId, recipes } = await generateRecipes(
        ingredients,
        activeDietFilter,
        userPreferences
      );
      const session: RecipeSession = {
        id: sessionId,
        createdAt: Date.now(),
        ingredients,
        dietFilter: activeDietFilter,
        recipes,
      };
      addSession(session);
      router.push("/recipe-ideas");
    } catch (err) {
      Alert.alert("Error", "Failed to generate recipes. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderShimmerList = () =>
    [0, 1, 2, 3, 4].map((i) => <ShimmerRow key={`sk-${i}`} isLast={i === 4} />);

  const renderList = () =>
    ingredients.map((item, i) => (
      <IngredientRow
        key={item.id}
        item={item}
        isLast={i === ingredients.length - 1}
        onRemove={() => removeIngredient(item.id)}
      />
    ));


  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Icon icon="solar:alt-arrow-left-linear" size={22} color={COLORS.foreground} />
          </Pressable>

          <Text style={styles.headerTitle}>Detected Items</Text>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openSheet(); }}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Icon icon="solar:add-circle-linear" size={28} color={COLORS.foreground} />
          </Pressable>
        </View>

        {/* Ingredient Grid */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
        >
          {scannedImageUri ? (
            <View style={styles.scannedPreview}>
              <Image
                source={{ uri: scannedImageUri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              <View style={styles.scannedLabel}>
                <Icon icon="solar:scanner-2-bold-duotone" size={14} color="#fff" />
                <Text style={styles.scannedLabelText}>Scanned Photo</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.listContainer}>
            {isInitialLoading ? (
              renderShimmerList()
            ) : ingredients.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No ingredients detected.</Text>
                <Text style={styles.emptySubtext}>Tap the + button to add ingredients manually.</Text>
              </View>
            ) : (
              renderList()
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Generate Recipe — floating pill FAB */}
      <View style={styles.bottomContainer} pointerEvents="box-none">
        <Pressable
          onPress={handleGenerateRecipe}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
          pointerEvents="auto"
        >
          <View style={styles.generateShadow}>
            <LinearGradient
              colors={["#6EE7B7", "#059669", "#047857"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.generateButton}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.28)", "transparent"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.generateButtonText}>Generate Recipe</Text>
              <Icon icon="solar:magic-stick-3-bold" size={22} color="#fff" />
            </LinearGradient>
          </View>
        </Pressable>

        {/* Fix Issue button */}
        <View style={{ marginTop: 10 }} pointerEvents="auto">
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openFixSheet(); }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <View style={styles.fixButton}>
              <Icon icon="solar:pen-new-square-linear" size={15} color={COLORS.mutedForeground} />
              <Text style={styles.fixButtonText}>Fix an ingredient</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── Add Ingredients Bottom Sheet ── */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeSheet} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetWrapper}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [{
                  translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }),
                }],
              },
            ]}
          >
            {/* Handle */}
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Add Ingredients</Text>
            <Text style={styles.sheetSubtitle}>Choose how you'd like to add more</Text>

            {/* Method tiles */}
            <View style={styles.sheetTiles}>
              <Pressable
                onPress={() => setSheetMode(sheetMode === "text" ? "menu" : "text")}
                style={[styles.sheetTile, sheetMode === "text" && styles.sheetTileActive]}
              >
                <Icon icon="solar:pen-new-square-bold-duotone" size={28} color={sheetMode === "text" ? COLORS.primaryForeground : COLORS.primary} />
                <Text style={[styles.sheetTileLabel, sheetMode === "text" && { color: COLORS.primaryForeground }]}>Type</Text>
              </Pressable>

              <Pressable onPress={handleAddScan} style={styles.sheetTile}>
                <Icon icon="solar:scanner-2-bold-duotone" size={28} color={COLORS.primary} />
                <Text style={styles.sheetTileLabel}>Scan</Text>
              </Pressable>

              <Pressable
                onPress={handleAddVoice}
                style={[styles.sheetTile, isListening && styles.sheetTileActive]}
              >
                {isVoiceLoading ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <Icon
                    icon={isListening ? "solar:soundwave-bold" : "solar:microphone-3-bold"}
                    size={28}
                    color={isListening ? COLORS.primaryForeground : COLORS.primary}
                  />
                )}
                <Text style={[styles.sheetTileLabel, isListening && { color: COLORS.primaryForeground }]}>
                  {isListening ? "Listening…" : "Voice"}
                </Text>
              </Pressable>
            </View>

            {/* Live transcript */}
            {isListening && liveTranscript ? (
              <Text style={styles.sheetTranscript} numberOfLines={2}>{liveTranscript}</Text>
            ) : null}

            {/* Text input (shown when Type is active) */}
            {sheetMode === "text" && (
              <View style={styles.sheetInputRow}>
                <TextInput
                  value={textInput}
                  onChangeText={setTextInput}
                  placeholder="e.g. eggs, spinach, garlic…"
                  placeholderTextColor={COLORS.mutedForeground}
                  style={styles.sheetInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleAddText}
                />
                <Pressable
                  onPress={handleAddText}
                  disabled={!textInput.trim() || isAddingText}
                  style={[styles.sheetInputBtn, { opacity: textInput.trim() ? 1 : 0.4 }]}
                >
                  {isAddingText
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Icon icon="solar:send-bold" size={18} color="#fff" />
                  }
                </Pressable>
              </View>
            )}

            <View style={{ height: 32 }} />
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Fix Issue Bottom Sheet ── */}
      <Modal
        visible={fixSheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeFixSheet}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeFixSheet} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetWrapper}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [{
                  translateY: fixSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }),
                }],
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Fix an Ingredient</Text>
            <Text style={styles.sheetSubtitle}>e.g. "Lemon not pomelo" or "Remove garlic"</Text>

            <View style={styles.sheetInputRow}>
              <TextInput
                value={fixInput}
                onChangeText={setFixInput}
                placeholder="Describe the correction…"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.sheetInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => handleApplyFix(fixInput)}
              />
              <Pressable
                onPress={() => handleApplyFix(fixInput)}
                disabled={!fixInput.trim() || isFixing}
                style={[styles.sheetInputBtn, { opacity: fixInput.trim() ? 1 : 0.4 }]}
              >
                {isFixing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Icon icon="solar:send-bold" size={18} color="#fff" />
                }
              </Pressable>
            </View>

            <View style={styles.fixVoiceRow}>
              <Pressable
                onPress={handleFixVoice}
                style={[styles.fixVoiceBtn, isFixListening && styles.sheetTileActive]}
              >
                {isFixVoiceLoading ? (
                  <ActivityIndicator color={isFixListening ? "#fff" : COLORS.primary} />
                ) : (
                  <Icon
                    icon={isFixListening ? "solar:soundwave-bold" : "solar:microphone-3-bold"}
                    size={20}
                    color={isFixListening ? COLORS.primaryForeground : COLORS.primary}
                  />
                )}
                <Text style={[styles.sheetTileLabel, isFixListening && { color: COLORS.primaryForeground }]}>
                  {isFixListening ? "Listening…" : "Use Voice"}
                </Text>
              </Pressable>
            </View>

            {isFixListening && liveFixTranscript ? (
              <Text style={styles.sheetTranscript} numberOfLines={2}>{liveFixTranscript}</Text>
            ) : null}

            <View style={{ height: 32 }} />
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      <LoadingOverlay visible={isGenerating || isAddingScan} message={isAddingScan ? "Scanning ingredients..." : "Crafting your recipes..."} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
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
    color: "#2C332A",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226,223,216,0.6)",
  },
  listDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#059669",
    flexShrink: 0,
  },
  listName: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
    color: "#2C332A",
  },
  listSubtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: "#7B8579",
    marginTop: 1,
  },
  listRemoveBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(201,122,126,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  listContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
    color: "#2C332A",
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 13,
    color: "#7B8579",
    textAlign: "center",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 44,
    left: 24,
    right: 24,
  },
  generateShadow: {
    shadowColor: "#4A6647",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  generateButtonText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 17,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FAFAF7",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D9D7D2",
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 20,
    color: "#2C332A",
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 13,
    color: "#7B8579",
    marginBottom: 24,
  },
  sheetTiles: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  sheetTile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sheetTileActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
    shadowColor: "#059669",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sheetTileLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: "#2C332A",
  },
  sheetTranscript: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: "#059669",
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 12,
  },
  sheetInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetInput: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    backgroundColor: "#F0EFEA",
    paddingHorizontal: 20,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: "#2C332A",
    borderWidth: 2,
    borderColor: "transparent",
  },
  sheetInputBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scannedPreview: {
    width: "100%",
    height: 180,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#E8E6E1",
  },
  scannedLabel: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  scannedLabelText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  fixButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.7)",
  },
  fixButtonText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: "#7B8579",
  },
  fixVoiceRow: {
    alignItems: "center",
    marginTop: 16,
  },
  fixVoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});
