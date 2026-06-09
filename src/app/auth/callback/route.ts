import { getSafeInternalRedirectPath } from "@/lib/redirect";
import { isSupabaseAuthConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next");
  const code = requestUrl.searchParams.get("code");

  if (isSupabaseAuthConfigured() && code) {
    try {
      const supabase = await createClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error("[/auth/callback]", error);
    }
  }

  const redirectPath = getSafeInternalRedirectPath(next);
  const redirectUrl = new URL(redirectPath, requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
