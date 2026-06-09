export function getSafeInternalRedirectPath(
  nextPath: string | null | undefined,
  fallbackPath = "/guides"
): string {
  if (typeof nextPath !== "string") return fallbackPath;

  const trimmed = nextPath.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallbackPath;
  }

  try {
    const resolved = new URL(trimmed, "http://localhost");
    return `${resolved.pathname}${resolved.search}${resolved.hash}` || fallbackPath;
  } catch {
    return fallbackPath;
  }
}
