const PEXELS_API_KEY = process.env.EXPO_PUBLIC_PEXELS_API_KEY ?? "";

export async function fetchFoodImage(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(title)}+food&per_page=1&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    const data = await res.json();
    return (data.photos?.[0]?.src?.landscape as string) ?? null;
  } catch {
    return null;
  }
}
