import { supabase } from "@/lib/supabase";
import type { Ingredient, Recipe, DietFilter } from "@/types";

// ─── Extract ingredients from text ──────────────────────────────────────────

export async function extractIngredientsFromText(
  rawText: string
): Promise<Ingredient[]> {
  const { data, error } = await supabase.functions.invoke(
    "extract-ingredients",
    { body: { mode: "text", text: rawText } }
  );
  if (error) throw error;
  return (data.ingredients as Array<{ name: string; subtitle: string; wide: boolean }>).map(
    (item, i) => ({
      id: `txt-${Date.now()}-${i}`,
      name: item.name,
      subtitle: item.subtitle,
      image: "",
      wide: item.wide ?? false,
    })
  );
}

// ─── Extract ingredients from image ─────────────────────────────────────────

export async function extractIngredientsFromImage(
  base64Image: string,
  mimeType: "image/jpeg" | "image/png" = "image/jpeg"
): Promise<Ingredient[]> {
  const { data, error } = await supabase.functions.invoke(
    "extract-ingredients",
    { body: { mode: "image", base64Image, mimeType } }
  );
  if (error) throw error;
  return (data.ingredients as Array<{ name: string; subtitle: string; wide: boolean }>).map(
    (item, i) => ({
      id: `img-${Date.now()}-${i}`,
      name: item.name,
      subtitle: item.subtitle,
      image: "",
      wide: item.wide ?? false,
    })
  );
}

// ─── Apply ingredient fix ────────────────────────────────────────────────────

export async function applyIngredientFix(
  currentIngredients: Ingredient[],
  fixInstruction: string
): Promise<Ingredient[]> {
  const { data, error } = await supabase.functions.invoke(
    "apply-ingredient-fix",
    {
      body: {
        currentIngredients: currentIngredients.map((i) => i.name),
        fixInstruction,
      },
    }
  );
  if (error) throw error;

  const updatedNames = data.updatedNames as string[];
  const existingMap = new Map(
    currentIngredients.map((i) => [i.name.toLowerCase(), i])
  );

  return updatedNames.map((name, idx) => {
    const existing = existingMap.get(name.toLowerCase());
    if (existing) return existing;
    return {
      id: `fix-${Date.now()}-${idx}`,
      name,
      subtitle: "",
      image: "",
      wide: false,
    };
  });
}

// ─── Generate recipes ────────────────────────────────────────────────────────

export async function generateRecipes(
  ingredients: Ingredient[],
  dietFilter: DietFilter | null,
  userPreferences?: {
    dietary_preferences: string[];
    allergies: string[];
    cooking_skill: string;
  }
): Promise<{ sessionId: string; recipes: Recipe[] }> {
  const { data, error } = await supabase.functions.invoke("generate-recipes", {
    body: { ingredients, dietFilter, userPreferences },
  });
  if (error) throw error;
  return data as { sessionId: string; recipes: Recipe[] };
}
