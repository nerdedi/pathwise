export function isSupabaseAuthConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return false;

  const looksLikePlaceholderUrl =
    url.includes("your-project.supabase.co") ||
    url.includes("example.supabase.co") ||
    url.endsWith(".supabase.co") === false;

  const looksLikePlaceholderKey =
    anonKey === "eyJ..." || anonKey.includes("...") || anonKey.length < 40;

  return !looksLikePlaceholderUrl && !looksLikePlaceholderKey;
}
