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

    const { mode, text, base64Image, mimeType } = await req.json();
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on this server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let messages: unknown[];

    if (mode === "text") {
      messages = [
        {
          role: "user",
          content: `Extract a structured list of food ingredients from this text.
Return ONLY a valid JSON array, no markdown fences, no explanation.
Each element must have: name (string), subtitle (string — a short descriptor like "Fresh", "Whole", "Lean Breast"), wide (boolean, always false for text input).

Text: "${text}"

Example output:
[{"name":"Eggs","subtitle":"Large","wide":false},{"name":"Kale","subtitle":"Fresh Leaves","wide":false}]`,
        },
      ];
    } else {
      messages = [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType ?? "image/jpeg",
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
      ];
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
        max_tokens: mode === "text" ? 512 : 768,
        messages,
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
    const ingredients = JSON.parse(cleaned);

    return new Response(JSON.stringify({ ingredients }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[extract-ingredients] Unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
