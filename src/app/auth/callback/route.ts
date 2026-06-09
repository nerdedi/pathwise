import { isSupabaseAuthConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/guides";
  const code = request.nextUrl.searchParams.get("code");

  if (isSupabaseAuthConfigured() && code) {
    try {
      const supabase = await createClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error("[/auth/callback]", error);
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/guides";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectUrl = new URL(next.startsWith("/") ? next : "/guides", requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
