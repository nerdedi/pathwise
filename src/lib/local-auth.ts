export const LOCAL_TEST_EMAIL = "test@pathwise.local";
export const LOCAL_TEST_PASSWORD = "pathwise123";

export function persistLocalTestLogin(email: string) {
  if (typeof window === "undefined") return;

  localStorage.setItem("pathwise_local_user_email", email.trim().toLowerCase());
}

export function clearLocalTestLogin() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("pathwise_local_user_email");
}

export function isLikelyAuthInfrastructureIssue(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  return [
    "failed to fetch",
    "fetch failed",
    "network error",
    "auth backend",
    "not configured",
    "invalid api key",
    "could not connect",
    "jwt",
  ].some((fragment) => lower.includes(fragment));
}
