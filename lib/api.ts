import { supabase } from "@/lib/supabase";
import type { Ingredient, Recipe, DietFilter } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract the actual server error message from a FunctionsHttpError. */
async function extractFunctionError(error: unknown): Promise<string> {
  try {
    const context = (error as any).context;
    if (context && typeof context.text === "function") {
      const text: string = await context.text();
      try {
        const body = JSON.parse(text);
        if (body?.error) return String(body.error);
      } catch {
        if (text.trim()) return text.trim();
      }
    }
  } catch {}
  return (error as any)?.message ?? String(error);
}

/**
 * Fallback: parse a comma/semicolon/newline-separated ingredient string
 * without calling any edge function. Used when the AI endpoint is unavailable.
 */
function parseIngredientsFallback(text: string): Ingredient[] {
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
    .map((name, i) => ({
      id: `txt-${Date.now()}-${i}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      subtitle: "",
      image: "",
      wide: false,
    }));
}

// ─── Extract ingredients from text ──────────────────────────────────────────

export async function extractIngredientsFromText(
  rawText: string
): Promise<Ingredient[]> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "extract-ingredients",
      { body: { mode: "text", text: rawText } }
    );

    if (error) {
      // Log server-side error detail for debugging, then fall back gracefully
      const detail = await extractFunctionError(error);
      console.warn("[extract-ingredients] Edge function unavailable:", detail);
      return parseIngredientsFallback(rawText);
    }

    return (data.ingredients as Array<{ name: string; subtitle: string; wide: boolean }>).map(
      (item, i) => ({
        id: `txt-${Date.now()}-${i}`,
        name: item.name,
        subtitle: item.subtitle,
        image: "",
        wide: item.wide ?? false,
      })
    );
  } catch {
    // Network error or function not deployed — fall back to simple parsing
    return parseIngredientsFallback(rawText);
  }
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
  if (error) {
    const detail = await extractFunctionError(error);
    throw new Error(detail);
  }
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
  if (error) {
    const detail = await extractFunctionError(error);
    throw new Error(detail);
  }
  return data as { sessionId: string; recipes: Recipe[] };
}
