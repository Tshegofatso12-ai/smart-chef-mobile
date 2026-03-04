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
} from "@/types";
import {
  loadSessions,
  saveSessions,
  loadSavedEntries,
  saveSavedEntries,
} from "@/lib/storage";

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<RecipeSession | null>(
    null
  );
  const [sessions, setSessions] = useState<RecipeSession[]>([]);
  const [savedRecipeIds, setSavedRecipeIds] = useState<SavedRecipeEntry[]>([]);
  const [trayIngredients, setTrayIngredients] = useState<Ingredient[]>([]);
  const [activeDietFilter, setActiveDietFilter] =
    useState<DietFilter>("low-fat");

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    Promise.all([loadSessions(), loadSavedEntries()]).then(
      ([storedSessions, storedSaved]) => {
        setSessions(storedSessions);
        setSavedRecipeIds(storedSaved);
      }
    );
  }, []);

  const addSession = useCallback(async (session: RecipeSession) => {
    setSessions((prev) => {
      const updated = [session, ...prev];
      saveSessions(updated).catch(() => {});
      return updated;
    });
    setActiveSession(session);
  }, []);

  const toggleSaved = useCallback(
    async (recipeId: string, sessionId: string) => {
      setSavedRecipeIds((prev) => {
        const exists = prev.findIndex((e) => e.recipeId === recipeId);
        const updated =
          exists >= 0
            ? prev.filter((e) => e.recipeId !== recipeId)
            : [{ recipeId, sessionId, savedAt: Date.now() }, ...prev];
        saveSavedEntries(updated).catch(() => {});
        return updated;
      });
    },
    []
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
        activeDietFilter,
        setActiveDietFilter,
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
