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
import {
  extractIngredientsFromText,
  extractIngredientsFromImage,
} from "@/lib/claude";

const COLORS = {
  background: "#F9F6F0",
  foreground: "#2C332A",
  primary: "#8A9A86",
  primaryForeground: "#FFFFFF",
  card: "#FFFFFF",
  muted: "#E8E6E1",
  mutedForeground: "#7B8579",
  border: "#E2DFD8",
  input: "#F0EFEA",
  chart2: "#C97A7E",
  chart3: "#DDA77B",
};

type DietFilter = { id: string; label: string; icon: string; iconColor: string };

const DIET_FILTERS: DietFilter[] = [
  { id: "low-fat", label: "Low-Fat", icon: "solar:leaf-bold", iconColor: COLORS.primaryForeground },
  { id: "low-carb", label: "Low-Carb", icon: "solar:bone-bold", iconColor: COLORS.chart3 },
  { id: "high-protein", label: "High-Protein", icon: "solar:fire-bold", iconColor: COLORS.chart2 },
];

type RecentScan = { id: string; name: string; calories: number; image: string };

const RECENT_SCANS: RecentScan[] = [
  {
    id: "1",
    name: "Avocado Half",
    calories: 160,
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/IXNk5Fj0Ara/components/UnViRxuKCIA.png",
  },
  {
    id: "2",
    name: "Salmon Fillet",
    calories: 208,
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/IXNk5Fj0Ara/components/sj6XeY4B2qx.png",
  },
  {
    id: "3",
    name: "Fresh Broccoli",
    calories: 55,
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/IXNk5Fj0Ara/components/qDi8Mwgq0ou.png",
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning,";
  if (hour < 18) return "Good Afternoon,";
  return "Good Evening,";
}

export default function HomeScreen() {
  const { activeDietFilter, setActiveDietFilter, setTrayIngredients } = useAppContext();
  const [ingredientInput, setIngredientInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isScanLoading, setIsScanLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const transcriptRef = useRef("");

  // Speech recognition events
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript ?? "";
    transcriptRef.current = transcript;
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

  const handleTextSubmit = async () => {
    const text = ingredientInput.trim();
    if (!text) return;

    setIsTextLoading(true);
    try {
      const ingredients = await extractIngredientsFromText(text);
      setTrayIngredients(ingredients);
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
      {
        text: "Camera",
        onPress: () => pickImage("camera"),
      },
      {
        text: "Photo Library",
        onPress: () => pickImage("library"),
      },
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
      result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.7,
        mediaTypes: ["images"],
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Photo library access is required.");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        base64: true,
        quality: 0.7,
        mediaTypes: ["images"],
      });
    }

    if (result.canceled || !result.assets[0]?.base64) return;

    const { base64, mimeType } = result.assets[0];
    setIsScanLoading(true);
    try {
      const ingredients = await extractIngredientsFromImage(
        base64!,
        (mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif") ?? "image/jpeg"
      );
      setTrayIngredients(ingredients);
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

    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission Denied", "Microphone access is required for voice input.");
      return;
    }

    transcriptRef.current = "";
    setIsListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: false,
      maxAlternatives: 1,
    });
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-2 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-semibold text-muted-foreground mb-0.5">
              {getGreeting()}
            </Text>
            <Text
              style={{ fontFamily: "NunitoSans_800ExtraBold", fontSize: 24, color: COLORS.foreground }}
            >
              Tshegofatso 👨‍🍳
            </Text>
          </View>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: "https://lh3.googleusercontent.com/a/ACg8ocKqtIkGkSMwNo8noobbQHviRPKyY_ZVEQMrnjVJvhb__3E2Udw_=s96-c",
              }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Diet Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingBottom: 8 }}
          className="mb-5 flex-grow-0"
        >
          {DIET_FILTERS.map((filter) => {
            const isActive = activeDietFilter === filter.id;
            return (
              <Pressable
                key={filter.id}
                onPress={() => setActiveDietFilter(filter.id as any)}
                style={[
                  styles.filterPill,
                  isActive ? styles.filterPillActive : styles.filterPillInactive,
                ]}
              >
                <Icon
                  icon={filter.icon}
                  size={18}
                  color={isActive ? COLORS.primaryForeground : filter.iconColor}
                />
                <Text
                  style={[
                    styles.filterLabel,
                    { color: isActive ? COLORS.primaryForeground : COLORS.foreground },
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Ingredient Input */}
        <View className="px-6 mb-4">
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
              style={[
                styles.input,
                inputFocused && styles.inputFocused,
                { fontFamily: "NunitoSans_600SemiBold", paddingRight: 56 },
              ]}
            />
            {/* Send button */}
            <Pressable
              onPress={handleTextSubmit}
              style={[styles.sendButton, { opacity: ingredientInput.trim() ? 1 : 0.4 }]}
              disabled={!ingredientInput.trim() || isTextLoading}
            >
              {isTextLoading ? (
                <ActivityIndicator size="small" color={COLORS.primaryForeground} />
              ) : (
                <Icon icon="solar:send-bold" size={16} color={COLORS.primaryForeground} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Magic Scan Button */}
        <View className="flex-1 items-center justify-center px-6 my-2">
          <Pressable
            onPress={handleMagicScan}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
          >
            <LinearGradient
              colors={["#9EAE9A", "#8A9A86", "#758471"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanButton}
            >
              <View style={styles.scanIconCircle}>
                <Icon icon="solar:scanner-2-bold-duotone" size={48} color={COLORS.primaryForeground} />
              </View>
              <View className="items-center">
                <Text
                  style={{
                    fontFamily: "NunitoSans_800ExtraBold",
                    fontSize: 22,
                    color: COLORS.primaryForeground,
                    letterSpacing: -0.5,
                  }}
                >
                  Magic Scan
                </Text>
                <Text
                  style={{
                    fontFamily: "NunitoSans_400Regular",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.8)",
                    marginTop: 4,
                  }}
                >
                  Tap to scan ingredients
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Recent Scans */}
        <View className="mb-2">
          <View className="px-6 flex-row items-center justify-between mb-3">
            <Text
              style={{ fontFamily: "NunitoSans_700Bold", fontSize: 17, color: COLORS.foreground }}
            >
              Recent Scans
            </Text>
            <Pressable onPress={() => router.push("/saved")}>
              <Text
                style={{ fontFamily: "NunitoSans_600SemiBold", fontSize: 14, color: COLORS.primary }}
              >
                View All
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 16, paddingBottom: 24 }}
          >
            {RECENT_SCANS.map((scan) => (
              <View key={scan.id} style={styles.scanCard}>
                <View style={styles.scanImageContainer}>
                  <Image
                    source={{ uri: scan.image }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                  <View style={styles.checkBadge}>
                    <Icon icon="solar:check-circle-bold" size={14} color={COLORS.primary} />
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: "NunitoSans_600SemiBold",
                    fontSize: 13,
                    color: COLORS.foreground,
                    marginTop: 2,
                  }}
                >
                  {scan.name}
                </Text>
                <Text
                  style={{
                    fontFamily: "NunitoSans_400Regular",
                    fontSize: 11,
                    color: COLORS.mutedForeground,
                    marginTop: 2,
                  }}
                >
                  {scan.calories} kcal
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Voice FAB */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <Pressable
          onPress={handleVoice}
          style={({ pressed }) => [
            styles.fab,
            isListening && styles.fabListening,
            { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.93 : 1 }] },
          ]}
        >
          <Icon
            icon={isListening ? "solar:soundwave-bold" : "solar:microphone-3-bold"}
            size={26}
            color={COLORS.background}
          />
        </Pressable>
      </View>

      <LoadingOverlay
        visible={isScanLoading || isVoiceLoading}
        message={isScanLoading ? "Scanning ingredients..." : "Processing voice..."}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: "#E8E6E1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  filterPillActive: {
    backgroundColor: "#8A9A86",
    shadowColor: "#8A9A86",
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
    fontSize: 14,
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
    height: 56,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#8A9A86",
    alignItems: "center",
    justifyContent: "center",
  },
  scanButton: {
    width: 256,
    height: 256,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    shadowColor: "#8A9A86",
    shadowOffset: { width: 8, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  scanIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanCard: {
    width: 144,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
  },
  scanImageContainer: {
    height: 112,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E8E6E1",
    marginBottom: 10,
    position: "relative",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  fabContainer: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2C332A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  fabListening: {
    backgroundColor: "#8A9A86",
    shadowColor: "#8A9A86",
    shadowOpacity: 0.4,
  },
});
