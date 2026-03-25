/**
 * Supabase's API gateway already verifies the JWT signature before the edge
 * function runs (visible as `auth_user` in function logs). We just decode the
 * payload to extract the user ID — no extra network round-trip needed.
 */
export function requireUser(req: Request): { id: string; email?: string } {
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) throw new Response("Unauthorized", { status: 401 });

  try {
    const [, payloadB64] = jwt.split(".");
    // Base64url → Base64 → JSON
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);

    const userId: string | undefined = payload.sub;
    if (!userId) throw new Error("missing sub");

    return { id: userId, email: payload.email };
  } catch {
    throw new Response("Unauthorized", { status: 401 });
  }
}
