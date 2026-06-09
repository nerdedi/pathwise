import { createClient } from "@/lib/supabase/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseAuthConfigured: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { isSupabaseAuthConfigured } from "@/lib/supabase/config";
import { GET } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("auth callback route", () => {
  it("falls back to the default guide route for protocol-relative next values", async () => {
    vi.mocked(isSupabaseAuthConfigured).mockReturnValue(true);
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as never);

    const response = await GET(
      new Request("http://localhost/auth/callback?code=abc&next=//evil.example") as never
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/guides");
  });

  it("keeps safe internal redirect paths intact", async () => {
    vi.mocked(isSupabaseAuthConfigured).mockReturnValue(true);
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as never);

    const response = await GET(
      new Request(
        "http://localhost/auth/callback?code=abc&next=%2Fplan%2F123%3Fstep%3D2%23summary"
      ) as never
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/plan/123?step=2#summary"
    );
  });
});
