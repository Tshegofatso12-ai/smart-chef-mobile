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

async function fetchPexelsImage(title: string, pexelsKey: string): Promise<string | null> {
  if (!pexelsKey) return null;
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

    const { query, dietFilter } = await req.json() as { query: string; dietFilter?: string };

    if (!query?.trim()) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on this server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pexelsApiKey = Deno.env.get("PEXELS_API_KEY") ?? "";

    const dietInstruction = dietFilter
      ? (DIET_LABEL[dietFilter] ?? "Make it delicious and creative.")
      : "No specific diet restriction — just make it delicious and creative.";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a professional chef AI. Create a single, detailed recipe for: "${query.trim()}".
Diet requirement: ${dietInstruction}

Return ONLY a valid JSON object — no markdown fences, no explanation — with these exact fields:
- id: "r1"
- title: string (the recipe name, may refine the query slightly)
- cookTime: string (e.g. "25 min")
- calories: string (estimated per serving, e.g. "420 kcal")
- dietMatch: one of "low-fat" | "low-carb" | "high-protein" | "keto" | "vegan"
- ingredients: string[] (each like "2 Chicken Breasts" or "1 Cup Spinach")
- steps: string[] (4-6 clear cooking steps, each a complete sentence)

Example:
{"id":"r1","title":"Classic Pasta Carbonara","cookTime":"20 min","calories":"540 kcal","dietMatch":"high-protein","ingredients":["200g Spaghetti","150g Pancetta","2 Eggs","50g Parmesan","2 Garlic Cloves","Black Pepper"],"steps":["Boil spaghetti in salted water until al dente.","Fry pancetta with garlic until crispy.","Whisk eggs with grated parmesan.","Drain pasta, reserving 100ml water.","Toss pasta with pancetta, then remove from heat and add egg mixture, stirring quickly.","Season with black pepper and serve immediately."]}`,
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
    const parsed = JSON.parse(cleaned) as {
      id: string; title: string; cookTime: string; calories: string;
      dietMatch: string; ingredients: string[]; steps: string[];
    };

    const imageUrl = await fetchPexelsImage(parsed.title, pexelsApiKey);

    // Persist to DB
    let sessionId = `local-${Date.now()}`;
    let recipeId = `local-${Date.now()}-0`;

    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Store the search query as a synthetic ingredient so it appears in history
      const syntheticIngredients = [{ id: "search", name: query.trim(), subtitle: "AI Search", wide: false }];

      const { data: sessionRow, error: sessionErr } = await supabaseAdmin
        .from("sessions")
        .insert({ user_id: user.id, ingredients: syntheticIngredients, diet_filter: dietFilter ?? null })
        .select()
        .single();

      if (!sessionErr && sessionRow) {
        sessionId = sessionRow.id as string;

        const dietColors = DIET_BADGE_COLORS[parsed.dietMatch] ?? DIET_BADGE_COLORS["low-fat"];
        const dietLabel = parsed.dietMatch.replace(/-/g, " ");

        const { data: recipeRow, error: recipeErr } = await supabaseAdmin
          .from("recipes")
          .insert({
            session_id: sessionId,
            user_id: user.id,
            title: parsed.title,
            cook_time: parsed.cookTime,
            calories: parsed.calories,
            diet_match: parsed.dietMatch,
            gradient_colors: ["#34D399", "#059669"],
            badges: [{ label: dietLabel, ...dietColors }],
            stats: [
              { icon: "solar:clock-circle-bold", iconColor: "#059669", label: "Time",     value: parsed.cookTime },
              { icon: "solar:fire-bold",         iconColor: "#C97A7E", label: "Calories", value: parsed.calories },
              { icon: "solar:leaf-bold",         iconColor: "#059669", label: "Match",    value: dietLabel },
            ],
            ingredients: parsed.ingredients,
            steps: parsed.steps,
            image_url: imageUrl ?? null,
          })
          .select("id")
          .single();

        if (!recipeErr && recipeRow) {
          recipeId = (recipeRow as { id: string }).id;
        }
      }
    } catch (dbErr) {
      console.error("[search-recipe] DB persist failed:", String(dbErr));
    }

    const dietColors = DIET_BADGE_COLORS[parsed.dietMatch] ?? DIET_BADGE_COLORS["low-fat"];
    const dietLabel = parsed.dietMatch.replace(/-/g, " ");

    const recipe = {
      id: recipeId,
      title: parsed.title,
      cookTime: parsed.cookTime,
      calories: parsed.calories,
      dietMatch: parsed.dietMatch,
      gradientColors: ["#34D399", "#059669"] as [string, string],
      badges: [{ label: dietLabel, ...dietColors }],
      stats: [
        { icon: "solar:clock-circle-bold", iconColor: "#059669", label: "Time",     value: parsed.cookTime },
        { icon: "solar:fire-bold",         iconColor: "#C97A7E", label: "Calories", value: parsed.calories },
        { icon: "solar:leaf-bold",         iconColor: "#059669", label: "Match",    value: dietLabel },
      ],
      ingredients: parsed.ingredients,
      steps: parsed.steps,
      imageUrl: imageUrl ?? null,
    };

    return new Response(
      JSON.stringify({ sessionId, recipe }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[search-recipe] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
