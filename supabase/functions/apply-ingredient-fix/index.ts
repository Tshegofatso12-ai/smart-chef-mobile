import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireUser(req);

    const { currentIngredients, fixInstruction } = await req.json();
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const nameList = (currentIngredients as string[]).join(", ");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
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
      }),
    });

    const result = await response.json();
    const raw = (result.content[0] as { text: string }).text.trim();
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
    const updatedNames = JSON.parse(cleaned) as string[];

    return new Response(JSON.stringify({ updatedNames }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
