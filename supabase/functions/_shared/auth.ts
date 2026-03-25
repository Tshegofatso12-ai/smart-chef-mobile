import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function requireUser(req: Request) {
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) throw new Response("Unauthorized", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(jwt);

  if (error || !user) throw new Response("Unauthorized", { status: 401 });
  return user;
}
