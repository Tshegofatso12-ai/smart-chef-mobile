import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RecipeSession, SavedRecipeEntry } from "@/types";

const KEYS = {
  SESSIONS: "smartchef:sessions",
  SAVED: "smartchef:saved_recipe_ids",
} as const;

export async function loadSessions(): Promise<RecipeSession[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SESSIONS);
    return raw ? (JSON.parse(raw) as RecipeSession[]) : [];
  } catch {
    return [];
  }
}

export async function saveSessions(sessions: RecipeSession[]): Promise<void> {
  const trimmed = sessions.slice(0, 50);
  await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(trimmed));
}

export async function loadSavedEntries(): Promise<SavedRecipeEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SAVED);
    return raw ? (JSON.parse(raw) as SavedRecipeEntry[]) : [];
  } catch {
    return [];
  }
}

export async function saveSavedEntries(
  entries: SavedRecipeEntry[]
): Promise<void> {
  await AsyncStorage.setItem(KEYS.SAVED, JSON.stringify(entries));
}
