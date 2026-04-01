import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type {
  AppContextValue,
  RecipeSession,
  Ingredient,
  DietFilter,
  SavedRecipeEntry,
  Recipe,
} from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/context/AuthContext";

const AppContext = createContext<AppContextValue | null>(null);

function mapDbRecipe(row: any): Recipe {
  return {
    id: row.id,
    title: row.title,
    cookTime: row.cook_time,
    calories: row.calories,
    dietMatch: row.diet_match,
    gradientColors: row.gradient_colors as [string, string],
    badges: row.badges,
    stats: row.stats,
    ingredients: row.ingredients,
    steps: row.steps,
    imageUrl: row.image_url ?? null,
  };
}

function mapDbSession(row: any): RecipeSession {
  return {
    id: row.id,
    createdAt: new Date(row.created_at).getTime(),
    ingredients: row.ingredients as Ingredient[],
    dietFilter: row.diet_filter as DietFilter | null,
    recipes: (row.recipes ?? []).map(mapDbRecipe),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuthContext();
  const [activeSession, setActiveSession] = useState<RecipeSession | null>(null);
  const [sessions, setSessions] = useState<RecipeSession[]>([]);
  const [savedRecipeIds, setSavedRecipeIds] = useState<SavedRecipeEntry[]>([]);
  const [trayIngredients, setTrayIngredients] = useState<Ingredient[]>([]);
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);
  const [activeDietFilter, setActiveDietFilter] = useState<DietFilter | null>(null);
  const [temperatureUnit, setTemperatureUnit] = useState<"fahrenheit" | "celsius">("fahrenheit");

  // Hydrate from Supabase when user logs in
  useEffect(() => {
    if (!session?.user) {
      setSessions([]);
      setSavedRecipeIds([]);
      setActiveSession(null);
      return;
    }

    const userId = session.user.id;

    Promise.all([
      supabase
        .from("sessions")
        .select("*, recipes(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("saved_recipes")
        .select("recipe_id, session_id:recipes(session_id), saved_at")
        .eq("user_id", userId)
        .order("saved_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("temperature_unit")
        .eq("id", userId)
        .single(),
    ]).then(([{ data: sessionRows }, { data: savedRows }, { data: profileData }]) => {
      if (sessionRows) setSessions(sessionRows.map(mapDbSession));
      if (savedRows) {
        setSavedRecipeIds(
          savedRows.map((row: any) => ({
            recipeId: row.recipe_id,
            sessionId: row.session_id?.session_id ?? "",
            savedAt: new Date(row.saved_at).getTime(),
          }))
        );
      }
      if (profileData?.temperature_unit) {
        setTemperatureUnit(profileData.temperature_unit);
      }
    });
  }, [session?.user?.id]);

  // addSession: edge function already persisted to DB, just update local state
  const addSession = useCallback(
    async (session: RecipeSession) => {
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
    },
    []
  );

  const toggleSaved = useCallback(
    async (recipeId: string, sessionId: string) => {
      if (!session?.user) return;
      const exists = savedRecipeIds.some((e) => e.recipeId === recipeId);

      if (exists) {
        await supabase
          .from("saved_recipes")
          .delete()
          .match({ user_id: session.user.id, recipe_id: recipeId });
        setSavedRecipeIds((prev) => prev.filter((e) => e.recipeId !== recipeId));
      } else {
        const { data } = await supabase
          .from("saved_recipes")
          .insert({ user_id: session.user.id, recipe_id: recipeId })
          .select()
          .single();
        if (data) {
          setSavedRecipeIds((prev) => [
            { recipeId, sessionId, savedAt: new Date(data.saved_at).getTime() },
            ...prev,
          ]);
        }
      }
    },
    [session?.user, savedRecipeIds]
  );

  const isRecipeSaved = useCallback(
    (recipeId: string) => savedRecipeIds.some((e) => e.recipeId === recipeId),
    [savedRecipeIds]
  );

  return (
    <AppContext.Provider
      value={{
        activeSession,
        setActiveSession,
        sessions,
        savedRecipeIds,
        addSession,
        toggleSaved,
        isRecipeSaved,
        trayIngredients,
        setTrayIngredients,
        scannedImageUri,
        setScannedImageUri,
        activeDietFilter,
        setActiveDietFilter,
        temperatureUnit,
        setTemperatureUnit,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
