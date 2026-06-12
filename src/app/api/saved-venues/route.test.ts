import { createClient } from "@/lib/supabase/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { DELETE, GET, PATCH, POST } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("saved venues route", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as never);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns saved venues for authenticated user", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "1",
            venue_url: "https://example.com",
            venue_name: "Example",
            notifications_enabled: true,
            created_at: "2026-06-12T00:00:00.000Z",
            updated_at: "2026-06-12T00:00:00.000Z",
          },
        ],
        error: null,
      }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => query),
    } as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { savedVenues: Array<{ venueUrl: string }> };
    expect(payload.savedVenues[0]?.venueUrl).toBe("https://example.com");
  });

  it("saves a venue subscription", async () => {
    const query = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => query),
    } as never);

    const response = await POST(
      new Request("http://localhost/api/saved-venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueUrl: "https://example.com",
          venueName: "Example",
          notificationsEnabled: true,
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(query.upsert).toHaveBeenCalled();
  });

  it("updates notification preference", async () => {
    const query = {
      update: vi.fn(() => query),
      eq: vi.fn(() => query),
    };
    query.eq = vi.fn(() => query);

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => query),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/saved-venues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueUrl: "https://example.com",
          notificationsEnabled: false,
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(query.update).toHaveBeenCalled();
  });

  it("removes a saved venue", async () => {
    const query = {
      delete: vi.fn(() => query),
      eq: vi.fn(() => query),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => query),
    } as never);

    const response = await DELETE(
      new Request("http://localhost/api/saved-venues", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueUrl: "https://example.com" }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(query.delete).toHaveBeenCalled();
  });
});
