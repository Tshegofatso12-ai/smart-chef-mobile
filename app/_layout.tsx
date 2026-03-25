import "../global.css";
import { useEffect } from "react";
import { View } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuthContext } from "@/context/AuthContext";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from "@expo-google-fonts/nunito-sans";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, profile, isLoading } = useAuthContext();

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      router.replace("/onboarding/welcome");
    } else if (profile && !profile.onboarding_complete) {
      router.replace("/onboarding/preferences");
    }
  }, [isLoading, session, profile]);

  // Hold render until auth state is known to prevent flash + cascade errors
  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: "#F9F6F0" }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="ingredient-tray" />
      <Stack.Screen name="recipe-ideas" />
      <Stack.Screen name="recipe/[id]" />
      <Stack.Screen name="saved" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AppProvider>
    </AuthProvider>
  );
}
