"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Copy, Globe, LogOut, MapPin, Save, Search, Trash2 } from "lucide-react";
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

export default function GuidesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [guides, setGuides] = useState<GuideSummary[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
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

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUserEmail(user?.email ?? null);

      if (user) {
        await loadGuides();
      } else {
        setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setUserEmail(session?.user?.email ?? null);
      if (session?.user) {
        await loadGuides();
      } else {
        setGuides([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setAuthMessage("");
    setError("");

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
    await supabase.auth.signOut();
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

  const filteredGuides = guides.filter((guide) => {
    const haystack = `${guide.venue_name} ${guide.venue_suburb ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase().trim());
  });

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
            onSubmit={sendMagicLink}
            className="bg-white border border-sage-100 rounded-2xl shadow-sm p-5 space-y-4"
          >
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={isSending} className="w-full">
              {isSending ? "Sending magic link…" : "Sign in with magic link"}
            </Button>
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
