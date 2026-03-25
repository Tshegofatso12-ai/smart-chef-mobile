import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DIET_LABEL: Record<string, string> = {
  "low-fat": "Low-Fat (minimize saturated fats, use lean proteins and vegetables)",
  "low-carb": "Low-Carb (limit starchy foods, favour vegetables and protein)",
  "high-protein": "High-Protein (prioritize protein-dense ingredients in every dish)",
};

const DIET_BADGE_COLORS: Record<string, { color: string; bg: string }> = {
  "low-fat": { color: "#059669", bg: "rgba(5,150,105,0.12)" },
  "low-carb": { color: "#DDA77B", bg: "rgba(221,167,123,0.12)" },
  "high-protein": { color: "#C97A7E", bg: "rgba(201,122,126,0.12)" },
};

const GRADIENT_PALETTE: Array<[string, string]> = [
  ["#34D399", "#059669"],
  ["#C97A7E", "#A5595D"],
  ["#DDA77B", "#B8845A"],
  ["#859CA9", "#5E7A87"],
];

async function fetchPexelsImage(title: string, pexelsKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(title)}+food&per_page=1&orientation=landscape`,
      { headers: { Authorization: pexelsKey } }
    );
    const data = await res.json();
    return (data.photos?.[0]?.src?.landscape as string) ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);

    const { ingredients, dietFilter, userPreferences } = await req.json();
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
    const pexelsApiKey = Deno.env.get("PEXELS_API_KEY")!;

    const ingredientNames = (ingredients as Array<{ name: string }>)
      .map((i) => i.name)
      .join(", ");
    const dietInstruction = dietFilter
      ? DIET_LABEL[dietFilter] ?? "Make them delicious and creative."
      : "No specific diet restriction — just make them delicious and creative.";

    let allergyNote = "";
    if (userPreferences?.allergies?.length > 0) {
      allergyNote = `\nIMPORTANT: The user is allergic to: ${userPreferences.allergies.join(", ")}. Do NOT include these in any recipe.`;
    }
    let skillNote = "";
    if (userPreferences?.cooking_skill) {
      const skillMap: Record<string, string> = {
        beginner: "Keep steps simple with basic techniques.",
        intermediate: "Standard home-cooking techniques are fine.",
        advanced: "Feel free to use advanced techniques and complex preparations.",
      };
      skillNote = `\nCooking skill level: ${skillMap[userPreferences.cooking_skill] ?? ""}`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `You are a professional chef AI. Create exactly 3 distinct, creative recipes using ONLY these ingredients (common pantry staples like salt, pepper, oil, water, and basic spices are permitted):

Ingredients: ${ingredientNames}
Diet requirement: ${dietInstruction}${allergyNote}${skillNote}

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
      }),
    });

    const result = await response.json();
    const raw = (result.content[0] as { text: string }).text.trim();
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();

    const parsed = JSON.parse(cleaned) as Array<{
      id: string;
      title: string;
      cookTime: string;
      calories: string;
      dietMatch: string;
      ingredients: string[];
      steps: string[];
    }>;

    // Fetch Pexels images in parallel
    const imageUrls = await Promise.all(
      parsed.map((r) => fetchPexelsImage(r.title, pexelsApiKey))
    );

    // Persist to Supabase
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: sessionRow, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .insert({
        user_id: user.id,
        ingredients,
        diet_filter: dietFilter ?? null,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    const recipesToInsert = parsed.map((r, i) => {
      const dietColors = DIET_BADGE_COLORS[r.dietMatch] ?? DIET_BADGE_COLORS["low-fat"];
      const dietLabel = r.dietMatch.replace("-", " ");
      return {
        session_id: sessionRow.id,
        user_id: user.id,
        title: r.title,
        cook_time: r.cookTime,
        calories: r.calories,
        diet_match: r.dietMatch,
        gradient_colors: GRADIENT_PALETTE[i % GRADIENT_PALETTE.length],
        badges: [{ label: dietLabel, ...dietColors }],
        stats: [
          { icon: "solar:clock-circle-bold", iconColor: "#059669", label: "Time", value: r.cookTime },
          { icon: "solar:fire-bold", iconColor: "#C97A7E", label: "Calories", value: r.calories },
          { icon: "solar:leaf-bold", iconColor: "#059669", label: "Match", value: dietLabel },
        ],
        ingredients: r.ingredients,
        steps: r.steps,
        image_url: imageUrls[i] ?? null,
      };
    });

    const { data: recipeRows, error: recipesError } = await supabaseAdmin
      .from("recipes")
      .insert(recipesToInsert)
      .select();

    if (recipesError) throw recipesError;

    const recipes = recipeRows.map((row) => ({
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
      imageUrl: row.image_url,
    }));

    return new Response(
      JSON.stringify({ sessionId: sessionRow.id, recipes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
