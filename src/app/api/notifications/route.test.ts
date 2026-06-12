import { createClient } from "@/lib/supabase/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { GET, PATCH } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("notifications route", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as never);

    const response = await GET(new Request("http://localhost/api/notifications") as never);
    expect(response.status).toBe(401);
  });

  it("returns notifications for authenticated user", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "123",
            notification_type: "live_status_changed",
            title: "Venue status changed",
            body: "Venue is now open",
            metadata: {
              preferredGuideId: "11111111-1111-4111-8111-111111111111",
            },
            read_at: null,
            created_at: "2026-06-12T00:00:00.000Z",
          },
        ],
        error: null,
      }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => query),
    } as never);

    const response = await GET(new Request("http://localhost/api/notifications?limit=5") as never);

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      notifications: Array<{ type: string; deepLink: string }>;
    };
    expect(payload.notifications[0]?.type).toBe("live_status_changed");
    expect(payload.notifications[0]?.deepLink).toBe(
      "/plan/11111111-1111-4111-8111-111111111111"
    );
  });

  it("marks a single notification as read", async () => {
    const query = {
      update: vi.fn(() => query),
      eq: vi.fn(() => query),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => query),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "11111111-1111-4111-8111-111111111111" }),
      }) as never
    );

    expect(response.status).toBe(200);
  });

  it("marks all notifications as read", async () => {
    const query = {
      update: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn().mockResolvedValue({ error: null }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => query),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(query.is).toHaveBeenCalled();
  });
});
