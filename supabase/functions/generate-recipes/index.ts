import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DIET_LABEL: Record<string, string> = {
  "low-fat":      "Low-Fat (minimize saturated fats, use lean proteins and vegetables)",
  "low-carb":     "Low-Carb (limit starchy foods, favour vegetables and protein)",
  "high-protein": "High-Protein (prioritize protein-dense ingredients in every dish)",
  "keto":         "Keto (very low carb, high fat — avoid grains, legumes, and sugar)",
  "vegan":        "Vegan (no animal products whatsoever — plant-based only)",
};

const DIET_BADGE_COLORS: Record<string, { color: string; bg: string }> = {
  "low-fat":      { color: "#059669", bg: "rgba(5,150,105,0.12)" },
  "low-carb":     { color: "#DDA77B", bg: "rgba(221,167,123,0.12)" },
  "high-protein": { color: "#C97A7E", bg: "rgba(201,122,126,0.12)" },
  "keto":         { color: "#C97A7E", bg: "rgba(201,122,126,0.12)" },
  "vegan":        { color: "#059669", bg: "rgba(5,150,105,0.12)" },
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

/** Try to persist session + recipes to DB. Non-fatal — returns generated ID or null on failure. */
async function persistToDb(
  user: { id: string },
  ingredients: unknown,
  dietFilter: string | null,
  parsed: Array<{
    id: string; title: string; cookTime: string; calories: string;
    dietMatch: string; ingredients: string[]; steps: string[];
  }>,
  imageUrls: (string | null)[]
): Promise<string | null> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: sessionRow, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .insert({ user_id: user.id, ingredients, diet_filter: dietFilter ?? null })
      .select()
      .single();

    if (sessionError) {
      console.error("[generate-recipes] DB session insert failed:", sessionError.message);
      return null;
    }

    const recipesToInsert = parsed.map((r, i) => {
      const dietColors = DIET_BADGE_COLORS[r.dietMatch] ?? DIET_BADGE_COLORS["low-fat"];
      const dietLabel = r.dietMatch.replace(/-/g, " ");
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
          { icon: "solar:clock-circle-bold", iconColor: "#059669", label: "Time",     value: r.cookTime },
          { icon: "solar:fire-bold",         iconColor: "#C97A7E", label: "Calories", value: r.calories },
          { icon: "solar:leaf-bold",         iconColor: "#059669", label: "Match",    value: dietLabel  },
        ],
        ingredients: r.ingredients,
        steps: r.steps,
        image_url: imageUrls[i] ?? null,
      };
    });

    const { error: recipesError } = await supabaseAdmin
      .from("recipes")
      .insert(recipesToInsert);

    if (recipesError) {
      console.error("[generate-recipes] DB recipes insert failed:", recipesError.message);
      return null;
    }

    return sessionRow.id as string;
  } catch (e) {
    console.error("[generate-recipes] DB persist exception:", String(e));
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

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on this server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pexelsApiKey = Deno.env.get("PEXELS_API_KEY") ?? "";

    const ingredientNames = (ingredients as Array<{ name: string }>)
      .map((i) => i.name)
      .join(", ");

    const dietInstruction = dietFilter
      ? (DIET_LABEL[dietFilter] ?? "Make them delicious and creative.")
      : "No specific diet restriction — just make them delicious and creative.";

    let allergyNote = "";
    if (userPreferences?.allergies?.length > 0) {
      allergyNote = `\nIMPORTANT: The user is allergic to: ${userPreferences.allergies.join(", ")}. Do NOT include these in any recipe.`;
    }
    let skillNote = "";
    if (userPreferences?.cooking_skill) {
      const skillMap: Record<string, string> = {
        beginner:     "Keep steps simple with basic techniques.",
        intermediate: "Standard home-cooking techniques are fine.",
        advanced:     "Feel free to use advanced techniques and complex preparations.",
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
- dietMatch: one of "low-fat" | "low-carb" | "high-protein" | "keto" | "vegan"
- ingredients: string[] (each like "2 Chicken Breasts", "1 Cup Spinach")
- steps: string[] (4-5 clear cooking steps, each a complete sentence)

Example of ONE element (your array must have 3):
{"id":"r1","title":"Garlic Seared Chicken","cookTime":"22 min","calories":"410 kcal","dietMatch":"high-protein","ingredients":["2 Chicken Breasts","3 Garlic Cloves"],"steps":["Season chicken with salt and pepper.","Heat oil in a pan over medium-high heat.","Sear chicken 6 minutes per side until golden.","Add minced garlic and baste for 2 minutes.","Rest 3 minutes before serving."]}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const detail = (errBody as any)?.error?.message ?? `Anthropic API error ${response.status}`;
      return new Response(
        JSON.stringify({ error: detail }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Fetch Pexels images in parallel (non-fatal)
    const imageUrls = await Promise.all(
      parsed.map((r) => fetchPexelsImage(r.title, pexelsApiKey))
    );

    // Persist to DB — non-fatal, app works without it
    const dbSessionId = await persistToDb(user, ingredients, dietFilter ?? null, parsed, imageUrls);

    // Build recipe objects using DB IDs when available, fallback to AI IDs
    const recipes = parsed.map((r, i) => {
      const dietColors = DIET_BADGE_COLORS[r.dietMatch] ?? DIET_BADGE_COLORS["low-fat"];
      const dietLabel = r.dietMatch.replace(/-/g, " ");
      return {
        id: dbSessionId ? `${dbSessionId}-${i}` : `local-${Date.now()}-${i}`,
        title: r.title,
        cookTime: r.cookTime,
        calories: r.calories,
        dietMatch: r.dietMatch,
        gradientColors: GRADIENT_PALETTE[i % GRADIENT_PALETTE.length],
        badges: [{ label: dietLabel, ...dietColors }],
        stats: [
          { icon: "solar:clock-circle-bold", iconColor: "#059669", label: "Time",     value: r.cookTime },
          { icon: "solar:fire-bold",         iconColor: "#C97A7E", label: "Calories", value: r.calories },
          { icon: "solar:leaf-bold",         iconColor: "#059669", label: "Match",    value: dietLabel  },
        ],
        ingredients: r.ingredients,
        steps: r.steps,
        imageUrl: imageUrls[i] ?? null,
      };
    });

    const sessionId = dbSessionId ?? `local-${Date.now()}`;

    return new Response(
      JSON.stringify({ sessionId, recipes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[generate-recipes] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
