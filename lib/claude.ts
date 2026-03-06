import Anthropic from "@anthropic-ai/sdk";
import type { Ingredient, Recipe, DietFilter } from "@/types";

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "",
  dangerouslyAllowBrowser: true,
});

const MODEL = "claude-sonnet-4-6";

// ─── Ingredient extraction from text ──────────────────────────────────────

export async function extractIngredientsFromText(
  rawText: string
): Promise<Ingredient[]> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Extract a structured list of food ingredients from this text.
Return ONLY a valid JSON array, no markdown fences, no explanation.
Each element must have: name (string), subtitle (string — a short descriptor like "Fresh", "Whole", "Lean Breast"), wide (boolean, always false for text input).

Text: "${rawText}"

Example output:
[{"name":"Eggs","subtitle":"Large","wide":false},{"name":"Kale","subtitle":"Fresh Leaves","wide":false}]`,
      },
    ],
  });

  const raw = (response.content[0] as { text: string }).text.trim();
  // Strip potential markdown fences defensively
  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as Array<{
    name: string;
    subtitle: string;
    wide: boolean;
  }>;

  return parsed.map((item, i) => ({
    id: `txt-${Date.now()}-${i}`,
    name: item.name,
    subtitle: item.subtitle,
    image: "",
    wide: item.wide ?? false,
  }));
}

// ─── Ingredient extraction from image ─────────────────────────────────────

export async function extractIngredientsFromImage(
  base64Image: string,
  mimeType: "image/jpeg" | "image/png" = "image/jpeg"
): Promise<Ingredient[]> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 768,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `Identify all food ingredients visible in this image.
Return ONLY a valid JSON array, no markdown fences, no explanation.
Each element: name (string), subtitle (string — brief descriptor like "Ripe", "Fresh", "Whole"), wide (boolean — true for the single most prominent ingredient, false for all others).

Example output:
[{"name":"Avocado","subtitle":"Ripe Half","wide":true},{"name":"Cherry Tomatoes","subtitle":"Fresh","wide":false}]`,
          },
        ],
      },
    ],
  });

  const raw = (response.content[0] as { text: string }).text.trim();
  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as Array<{
    name: string;
    subtitle: string;
    wide: boolean;
  }>;

  return parsed.map((item, i) => ({
    id: `img-${Date.now()}-${i}`,
    name: item.name,
    subtitle: item.subtitle,
    image: "",
    wide: item.wide ?? false,
  }));
}

// ─── Recipe generation ─────────────────────────────────────────────────────

const DIET_LABEL: Record<DietFilter, string> = {
  "low-fat": "Low-Fat (minimize saturated fats, use lean proteins and vegetables)",
  "low-carb": "Low-Carb (limit starchy foods, favour vegetables and protein)",
  "high-protein": "High-Protein (prioritize protein-dense ingredients in every dish)",
};

const DIET_BADGE_COLORS: Record<DietFilter, { color: string; bg: string }> = {
  "low-fat": { color: "#8A9A86", bg: "rgba(138,154,134,0.12)" },
  "low-carb": { color: "#DDA77B", bg: "rgba(221,167,123,0.12)" },
  "high-protein": { color: "#C97A7E", bg: "rgba(201,122,126,0.12)" },
};

const GRADIENT_PALETTE: Array<[string, string]> = [
  ["#9EAE9A", "#758471"],
  ["#C97A7E", "#A5595D"],
  ["#DDA77B", "#B8845A"],
  ["#859CA9", "#5E7A87"],
];

// ─── Apply ingredient fix from user instruction ────────────────────────────

export async function applyIngredientFix(
  currentIngredients: Ingredient[],
  fixInstruction: string
): Promise<Ingredient[]> {
  const nameList = currentIngredients.map((i) => i.name).join(", ");
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Current ingredient list: ${nameList}

Fix instruction: "${fixInstruction}"

Apply the fix to the list. Examples:
- "Lemon not pomelo" → replace pomelo with lemon
- "Add lime" → append lime
- "Remove garlic" → remove garlic

Return ONLY a valid JSON array of the corrected ingredient names (strings), no markdown, no explanation.
Example: ["Chicken","Spinach","Lemon","Garlic"]`,
      },
    ],
  });

  const raw = (response.content[0] as { text: string }).text.trim();
  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
  const updatedNames = JSON.parse(cleaned) as string[];

  const existingMap = new Map(currentIngredients.map((i) => [i.name.toLowerCase(), i]));

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

// ─── Recipe generation ─────────────────────────────────────────────────────

export async function generateRecipes(
  ingredients: Ingredient[],
  dietFilter: DietFilter | null
): Promise<Recipe[]> {
  const ingredientNames = ingredients.map((i) => i.name).join(", ");
  const dietInstruction = dietFilter
    ? DIET_LABEL[dietFilter]
    : "No specific diet restriction — just make them delicious and creative.";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are a professional chef AI. Create exactly 3 distinct, creative recipes using ONLY these ingredients (common pantry staples like salt, pepper, oil, water, and basic spices are permitted):

Ingredients: ${ingredientNames}
Diet requirement: ${dietInstruction}

Return ONLY a valid JSON array of exactly 3 recipe objects, no markdown fences, no explanation.
Each object must have these exact fields:
- id: string (e.g. "r1", "r2", "r3")
- title: string (creative, descriptive name)
- cookTime: string (e.g. "20 min")
- calories: string (estimated, e.g. "380 kcal")
- dietMatch: one of "low-fat" | "low-carb" | "high-protein"
- ingredients: string[] (each like "2 Chicken Breasts", "1 Cup Spinach")
- steps: string[] (4-5 clear cooking steps, each a complete sentence)

Example of ONE element (your array must have 3):
{"id":"r1","title":"Garlic Seared Chicken","cookTime":"22 min","calories":"410 kcal","dietMatch":"high-protein","ingredients":["2 Chicken Breasts","3 Garlic Cloves"],"steps":["Season chicken with salt and pepper.","Heat oil in a pan over medium-high heat.","Sear chicken 6 minutes per side until golden.","Add minced garlic and baste for 2 minutes.","Rest 3 minutes before serving."]}`,
      },
    ],
  });

  const raw = (response.content[0] as { text: string }).text.trim();
  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();

  const parsed = JSON.parse(cleaned) as Array<{
    id: string;
    title: string;
    cookTime: string;
    calories: string;
    dietMatch: DietFilter;
    ingredients: string[];
    steps: string[];
  }>;

  return parsed.map((r, i) => {
    const dietColors =
      DIET_BADGE_COLORS[r.dietMatch] ?? DIET_BADGE_COLORS["low-fat"];
    const dietLabel = r.dietMatch.replace("-", " ");
    return {
      id: r.id,
      title: r.title,
      cookTime: r.cookTime,
      calories: r.calories,
      dietMatch: r.dietMatch,
      gradientColors: GRADIENT_PALETTE[i % GRADIENT_PALETTE.length],
      badges: [{ label: dietLabel, ...dietColors }],
      stats: [
        {
          icon: "solar:clock-circle-bold",
          iconColor: "#8A9A86",
          label: "Time",
          value: r.cookTime,
        },
        {
          icon: "solar:fire-bold",
          iconColor: "#C97A7E",
          label: "Calories",
          value: r.calories,
        },
        {
          icon: "solar:leaf-bold",
          iconColor: "#8A9A86",
          label: "Match",
          value: dietLabel,
        },
      ],
      ingredients: r.ingredients,
      steps: r.steps,
    };
  });
}
