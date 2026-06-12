"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    LOCAL_TEST_EMAIL,
    LOCAL_TEST_PASSWORD,
    clearLocalTestLogin,
    isLikelyAuthInfrastructureIssue,
    persistLocalTestLogin,
} from "@/lib/local-auth";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseAuthConfigured } from "@/lib/supabase/config";
import { Bell, Calendar, CheckCheck, Copy, Globe, LogOut, MapPin, Save, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type GuideSummary = {
  id: string;
  venue_name: string;
  venue_suburb: string | null;
  visit_date: string | null;
  risk_score: number | null;
  created_at: string;
  is_public?: boolean;
};

type UserNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  deepLink: string;
  readAt: string | null;
  createdAt: string;
};

export default function GuidesPage() {
  const supabase = useMemo(() => createClient(), []);
  const authConfigured = useMemo(() => isSupabaseAuthConfigured(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authMessage, setAuthMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [guides, setGuides] = useState<GuideSummary[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null);
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);

  const applyLocalTestLogin = (nextEmail = LOCAL_TEST_EMAIL, passwordValue = LOCAL_TEST_PASSWORD) => {
    if (passwordValue.length < 8) {
      throw new Error("Use at least 8 characters for your password.");
    }

    const normalizedEmail = nextEmail.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Enter a valid email address.");
    }

    persistLocalTestLogin(normalizedEmail);
    setUserEmail(normalizedEmail);
    setAuthMessage("Local test login enabled. Cloud-synced guides need Supabase configuration.");
  };
  const toggleShare = async (id: string, nextValue: boolean) => {
    setSharingId(id);
    try {
      const res = await fetch(`/api/guides/${id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: nextValue }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update visibility");
      }

      setGuides((prev) =>
        prev.map((guide) =>
          guide.id === id ? { ...guide, is_public: nextValue } : guide
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update visibility");
    } finally {
      setSharingId(null);
    }
  };

  const copyShareLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/shared/${id}`);
    } catch {
      setError("Failed to copy share link");
    }
  };


  const loadGuides = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/guides", { cache: "no-store" });
      if (res.status === 401) {
        setGuides([]);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load guides");
      }
      const data = await res.json();
      setGuides((data.guides ?? []) as GuideSummary[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load guides");
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=8", { cache: "no-store" });
      if (res.status === 401) {
        setNotifications([]);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load notifications");
      }
      const data = await res.json();
      setNotifications((data.notifications ?? []) as UserNotification[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      if (!authConfigured) {
        if (!mounted) return;
        setUserEmail(localStorage.getItem("pathwise_local_user_email"));
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUserEmail(user?.email ?? null);

      if (user) {
        await loadGuides();
        await loadNotifications();
      } else {
        setLoading(false);
      }
    };

    init();

    if (authConfigured) {
      const authListener = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;
        setUserEmail(session?.user?.email ?? null);
        if (session?.user) {
          await loadGuides();
          await loadNotifications();
        } else {
          setGuides([]);
          setNotifications([]);
          setLoading(false);
        }
      });

      subscription = authListener.data.subscription;
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase, authConfigured]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setAuthMessage("");
    setError("");

    try {
      if (!authConfigured) {
        applyLocalTestLogin(email, password);
        return;
      }

      if (authMode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        setAuthMessage("Signed in successfully.");
      } else {
        if (password.length < 8) {
          throw new Error("Use at least 8 characters for your password.");
        }

        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/auth/callback?next=/guides`
                : undefined,
          },
        });

        if (authError) throw authError;
        setAuthMessage("Account created. You can sign in now, or check your email if confirmation is required.");
      }
    } catch (authError) {
      if (process.env.NODE_ENV !== "production" && isLikelyAuthInfrastructureIssue(authError)) {
        try {
          applyLocalTestLogin(email || LOCAL_TEST_EMAIL, password || LOCAL_TEST_PASSWORD);
          setError("");
          setAuthMessage(
            "Supabase auth wasn’t reachable, so Pathwise switched to local test login for this device."
          );
          setIsSending(false);
          return;
        } catch (localLoginError) {
          setError(localLoginError instanceof Error ? localLoginError.message : "Authentication failed");
          setIsSending(false);
          return;
        }
      }

      setError(authError instanceof Error ? authError.message : "Authentication failed");
    }

    setIsSending(false);
  };

  const sendMagicLink = async () => {
    setIsSending(true);
    setAuthMessage("");
    setError("");

    if (!authConfigured) {
      setError("Magic links require Supabase auth configuration. Use local test login or configure Supabase.");
      setIsSending(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?next=/guides`
            : undefined,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setAuthMessage("Magic link sent. Check your inbox to sign in.");
    }

    setIsSending(false);
  };

  const signOut = async () => {
    if (authConfigured) {
      await supabase.auth.signOut();
    } else {
      clearLocalTestLogin();
    }
    setUserEmail(null);
    setGuides([]);
  };

  const deleteGuide = async (id: string) => {
    const ok = window.confirm("Delete this saved guide?");
    if (!ok) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/guides/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete guide");
      }
      setGuides((prev) => prev.filter((guide) => guide.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete guide");
    } finally {
      setDeletingId(null);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    setMarkingNotificationId(notificationId);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to mark notification read");
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? { ...item, readAt: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark notification read");
    } finally {
      setMarkingNotificationId(null);
    }
  };

  const markAllNotificationsRead = async () => {
    setMarkingAllNotifications(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to mark all notifications read");
      }

      const nowIso = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? nowIso })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark all notifications read");
    } finally {
      setMarkingAllNotifications(false);
    }
  };

  const filteredGuides = guides.filter((guide) => {
    const haystack = `${guide.venue_name} ${guide.venue_suburb ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase().trim());
  });
  const unreadNotificationCount = notifications.filter((item) => !item.readAt).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-50 to-white">
      <nav className="bg-white border-b border-sage-100 px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sage-800 font-semibold">
          <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
          Pathwise
        </Link>
        <div className="flex items-center gap-2">
          {userEmail && (
            <a
              href="#notifications"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-sage-600 hover:bg-sage-50 hover:text-sage-800"
            >
              <Bell className="h-3.5 w-3.5" />
              Updates
              {unreadNotificationCount > 0 && (
                <span className="rounded-full bg-calm-100 px-1.5 py-0.5 text-[11px] font-semibold text-calm-700">
                  {unreadNotificationCount}
                </span>
              )}
            </a>
          )}
          <Link href="/plan" className="text-sm text-sage-600 hover:text-sage-800">
            New guide
          </Link>
          {userEmail && (
            <Button variant="outline" size="sm" onClick={signOut} className="gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </Button>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-10 pb-16">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-sage-900">My saved guides</h1>
          <p className="text-sm text-sage-600 mt-1">
            Sign in to save guides across devices and revisit them later.
          </p>
        </div>

        {!userEmail && (
          <form
            onSubmit={handleEmailAuth}
            className="bg-white border border-sage-100 rounded-2xl shadow-sm p-5 space-y-4"
          >
            {!authConfigured && (
              <p className="text-sm text-warm-700 bg-warm-50 border border-warm-200 rounded-xl px-4 py-3">
                Supabase auth isn&rsquo;t configured in this environment, so email/password currently runs in local test mode.
              </p>
            )}
            <div className="flex rounded-xl bg-sage-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setError("");
                  setAuthMessage("");
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  authMode === "login"
                    ? "bg-white text-sage-800 shadow-sm"
                    : "text-sage-500 hover:text-sage-700"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setError("");
                  setAuthMessage("");
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  authMode === "signup"
                    ? "bg-white text-sage-800 shadow-sm"
                    : "text-sage-500 hover:text-sage-700"
                }`}
              >
                Create account
              </button>
            </div>
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              label="Password"
              placeholder={authMode === "login" ? "Enter your password" : "At least 8 characters"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={isSending} className="w-full">
              {isSending
                ? authMode === "login"
                  ? "Logging in…"
                  : "Creating account…"
                : !authConfigured
                  ? "Continue with local test login"
                  : authMode === "login"
                  ? "Log in with password"
                  : "Create account"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSending || !email}
              className="w-full"
              onClick={sendMagicLink}
            >
              Email me a magic link instead
            </Button>
            {(process.env.NODE_ENV !== "production" || !authConfigured) && (
              <button
                type="button"
                onClick={() => {
                  setEmail(LOCAL_TEST_EMAIL);
                  setPassword(LOCAL_TEST_PASSWORD);
                }}
                className="w-full text-xs text-sage-600 underline underline-offset-4"
              >
                Use test credentials (test@pathwise.local / pathwise123)
              </button>
            )}
            {authMessage && (
              <p className="text-sm text-sage-700 bg-sage-50 border border-sage-200 rounded-xl px-3 py-2">
                {authMessage}
              </p>
            )}
          </form>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {userEmail && (
          <>
            <p className="text-xs text-sage-500 mb-3">Signed in as {userEmail}</p>

            <div id="notifications" className="mb-4 rounded-2xl border border-sage-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-sage-900">
                    <Bell className="h-4 w-4 text-sage-600" />
                    Live notifications
                  </h2>
                  <p className="text-sm text-sage-600 mt-1">
                    Updates about saved venues, status changes, and special closures.
                  </p>
                  <p className="mt-1 text-xs text-sage-500" aria-live="polite">
                    {unreadNotificationCount > 0
                      ? `${unreadNotificationCount} unread notification${unreadNotificationCount === 1 ? "" : "s"}`
                      : "All notifications are read"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={markAllNotificationsRead}
                  disabled={markingAllNotifications || notifications.every((item) => item.readAt)}
                  className="gap-1.5"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {markingAllNotifications ? "Marking…" : "Mark all read"}
                </Button>
              </div>

              {notificationsLoading ? (
                <p className="text-sm text-sage-500">Loading notifications…</p>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-sage-500">No notifications yet. Save a venue to start getting live updates.</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-xl border p-3 ${notification.readAt ? "border-sage-100 bg-sage-50/40" : "border-calm-200 bg-calm-50/60"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-sage-900">{notification.title}</p>
                            {!notification.readAt && (
                              <span className="rounded-full bg-calm-100 px-2 py-0.5 text-[11px] font-medium text-calm-700">
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-sage-700">{notification.body}</p>
                          <p className="mt-2 text-xs text-sage-500">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Link href={notification.deepLink} className="inline-flex">
                            <Button type="button" variant="outline" size="sm">
                              Open
                            </Button>
                          </Link>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={Boolean(notification.readAt) || markingNotificationId === notification.id}
                            onClick={() => {
                              void markNotificationRead(notification.id);
                            }}
                          >
                            {markingNotificationId === notification.id ? "Saving…" : notification.readAt ? "Read" : "Mark read"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative mb-4">
              <Search className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by venue name or suburb"
                className="w-full h-10 rounded-xl border border-sage-200 pl-9 pr-3 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
              />
            </div>

            {loading ? (
              <div className="text-sm text-sage-500">Loading guides…</div>
            ) : guides.length === 0 ? (
              <div className="bg-white border border-sage-100 rounded-2xl p-6 text-center">
                <Save className="w-5 h-5 text-sage-400 mx-auto mb-2" />
                <p className="text-sage-700">No saved guides yet.</p>
                <p className="text-sm text-sage-500 mt-1">Create a new guide and we&rsquo;ll save it here automatically.</p>
                <Link href="/plan" className="inline-block mt-4 text-sm text-sage-700 underline">
                  Create your first guide
                </Link>
              </div>
            ) : filteredGuides.length === 0 ? (
              <div className="bg-white border border-sage-100 rounded-2xl p-6 text-center">
                <p className="text-sage-700">No guides match your search.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGuides.map((guide) => (
                  <div
                    key={guide.id}
                    className="bg-white border border-sage-100 rounded-2xl p-4 hover:border-sage-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/plan/${guide.id}`} className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="font-semibold text-sage-900">{guide.venue_name}</h2>
                            <p className="text-sm text-sage-600 mt-0.5">{guide.venue_suburb ?? "Suburb not specified"}</p>
                          </div>
                          {guide.risk_score != null && (
                            <span className="text-xs bg-warm-50 text-warm-700 border border-warm-200 rounded-full px-2.5 py-1">
                              Risk {guide.risk_score}/10
                            </span>
                          )}
                        </div>

                        <div className="mt-3 text-xs text-sage-500 flex items-center gap-4">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {guide.visit_date
                              ? new Date(guide.visit_date).toLocaleDateString()
                              : "No visit date"}
                          </span>
                          <span>
                            Saved {new Date(guide.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </Link>

                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => toggleShare(guide.id, !guide.is_public)}
                          disabled={sharingId === guide.id}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          {guide.is_public ? "Unshare" : "Share"}
                        </Button>
                        {guide.is_public && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => copyShareLink(guide.id)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copy link
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => deleteGuide(guide.id)}
                          disabled={deletingId === guide.id}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
