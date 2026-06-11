import { createClient } from "@/lib/supabase/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { GET, PATCH, POST } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("community route", () => {
  it("returns 400 for invalid GET query", async () => {
    const response = await GET(new Request("http://localhost/api/community") as never);
    expect(response.status).toBe(400);
  });

  it("loads community entries for a venue", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      lt: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "1",
            overall_rating: 7,
            notes: "Crowded at lunch",
            tips: "Arrive early",
            visit_date: "2026-06-11",
            helpful_count: 4,
            created_at: "2026-06-11T10:00:00Z",
          },
        ],
        error: null,
      }),
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => query),
    } as never);

    const response = await GET(
      new Request("http://localhost/api/community?venueUrl=https%3A%2F%2Fexample.com") as never
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { entries: Array<{ id: string }> };
    expect(payload.entries[0]?.id).toBe("1");
    expect(query.order).toHaveBeenCalledTimes(2);
  });

  it("returns 500 when GET query fails", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      lt: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error("db failed") }),
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => query),
    } as never);

    const response = await GET(
      new Request("http://localhost/api/community?venueUrl=https%3A%2F%2Fexample.com") as never
    );

    expect(response.status).toBe(500);
  });

  it("rejects POST when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as never);

    const response = await POST(
      new Request("http://localhost/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueUrl: "https://example.com",
          venueName: "Example Venue",
          overallRating: 7,
        }),
      }) as never
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid POST payload", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(),
    } as never);

    const response = await POST(
      new Request("http://localhost/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueUrl: "bad-url" }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it("creates a community note when POST payload is valid", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => ({ insert })),
    } as never);

    const response = await POST(
      new Request("http://localhost/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueUrl: "https://example.com",
          venueName: "Example Venue",
          venueSuburb: "Sydney",
          overallRating: 8,
          notes: "Great quiet room",
          tips: "Bring headphones",
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalled();
  });

  it("returns 404 when helpful vote target does not exist", async () => {
    const loadQuery = {
      select: vi.fn(() => loadQuery),
      eq: vi.fn(() => loadQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) },
      from: vi.fn(() => loadQuery),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: "11111111-1111-4111-8111-111111111111" }),
      }) as never
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid PATCH payload", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) },
      from: vi.fn(),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: "bad-id" }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it("rejects helpful vote when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: "11111111-1111-4111-8111-111111111111" }),
      }) as never
    );

    expect(response.status).toBe(401);
  });

  it("records helpful vote for another user's note", async () => {
    const loadQuery = {
      select: vi.fn(() => loadQuery),
      eq: vi.fn(() => loadQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "row-1", user_id: "owner-1", helpful_count: 2 },
        error: null,
      }),
    };

    const updateQuery = {
      update: vi.fn(() => updateQuery),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const voteInsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) },
      from: vi.fn(() => ({
        ...loadQuery,
        ...updateQuery,
        insert: voteInsert,
      })),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: "11111111-1111-4111-8111-111111111111" }),
      }) as never
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { helpfulCount: number };
    expect(payload.helpfulCount).toBe(3);
    expect(voteInsert).toHaveBeenCalledWith({
      entry_id: "11111111-1111-4111-8111-111111111111",
      user_id: "user-2",
    });
  });

  it("returns 409 when user has already voted for the same note", async () => {
    const loadQuery = {
      select: vi.fn(() => loadQuery),
      eq: vi.fn(() => loadQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "row-1", user_id: "owner-1", helpful_count: 2 },
        error: null,
      }),
    };

    const update = vi.fn(() => ({ eq: vi.fn() }));

    const voteInsert = vi.fn().mockResolvedValue({
      error: { code: "23505", message: "duplicate key value" },
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) },
      from: vi.fn(() => ({
        ...loadQuery,
        insert: voteInsert,
        update,
      })),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: "11111111-1111-4111-8111-111111111111" }),
      }) as never
    );

    expect(response.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it("records a moderation report for another user's note", async () => {
    const loadQuery = {
      select: vi.fn(() => loadQuery),
      eq: vi.fn(() => loadQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "row-1", user_id: "owner-1", helpful_count: 2, report_count: 1 },
        error: null,
      }),
    };

    const updateQuery = {
      update: vi.fn(() => updateQuery),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const reportInsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) },
      from: vi.fn(() => ({
        ...loadQuery,
        ...updateQuery,
        insert: reportInsert,
      })),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: "11111111-1111-4111-8111-111111111111",
          action: "report",
          reason: "Unsafe advice",
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { reportCount: number };
    expect(payload.reportCount).toBe(2);
    expect(reportInsert).toHaveBeenCalledWith({
      entry_id: "11111111-1111-4111-8111-111111111111",
      user_id: "user-2",
      reason: "Unsafe advice",
    });
  });

  it("returns 409 when user already reported the note", async () => {
    const loadQuery = {
      select: vi.fn(() => loadQuery),
      eq: vi.fn(() => loadQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "row-1", user_id: "owner-1", helpful_count: 2, report_count: 1 },
        error: null,
      }),
    };

    const reportInsert = vi.fn().mockResolvedValue({
      error: { code: "23505", message: "duplicate key value" },
    });

    const update = vi.fn(() => ({ eq: vi.fn() }));

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) },
      from: vi.fn(() => ({
        ...loadQuery,
        insert: reportInsert,
        update,
      })),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: "11111111-1111-4111-8111-111111111111",
          action: "report",
        }),
      }) as never
    );

    expect(response.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it("blocks users from reporting their own note", async () => {
    const loadQuery = {
      select: vi.fn(() => loadQuery),
      eq: vi.fn(() => loadQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "row-1", user_id: "user-2", helpful_count: 2, report_count: 0 },
        error: null,
      }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) },
      from: vi.fn(() => loadQuery),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: "11111111-1111-4111-8111-111111111111",
          action: "report",
        }),
      }) as never
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 when report insert fails with non-duplicate error", async () => {
    const loadQuery = {
      select: vi.fn(() => loadQuery),
      eq: vi.fn(() => loadQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "row-1", user_id: "owner-1", helpful_count: 2, report_count: 0 },
        error: null,
      }),
    };

    const reportInsert = vi.fn().mockResolvedValue({
      error: { code: "23514", message: "check constraint failed" },
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) },
      from: vi.fn(() => ({ ...loadQuery, insert: reportInsert })),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: "11111111-1111-4111-8111-111111111111",
          action: "report",
        }),
      }) as never
    );

    expect(response.status).toBe(500);
  });

  it("returns 500 when vote insert fails with non-duplicate error", async () => {
    const loadQuery = {
      select: vi.fn(() => loadQuery),
      eq: vi.fn(() => loadQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "row-1", user_id: "owner-1", helpful_count: 2 },
        error: null,
      }),
    };

    const voteInsert = vi.fn().mockResolvedValue({
      error: { code: "23514", message: "check constraint failed" },
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) },
      from: vi.fn(() => ({ ...loadQuery, insert: voteInsert })),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: "11111111-1111-4111-8111-111111111111" }),
      }) as never
    );

    expect(response.status).toBe(500);
  });

  it("returns 500 when report DB update fails", async () => {
    const loadQuery = {
      select: vi.fn(() => loadQuery),
      eq: vi.fn(() => loadQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "row-1", user_id: "owner-1", helpful_count: 2, report_count: 0 },
        error: null,
      }),
    };

    const reportInsert = vi.fn().mockResolvedValue({ error: null });

    const updateQuery = {
      update: vi.fn(() => updateQuery),
      eq: vi.fn().mockResolvedValue({ error: new Error("update failed") }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) },
      from: vi.fn(() => ({
        ...loadQuery,
        ...updateQuery,
        insert: reportInsert,
      })),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: "11111111-1111-4111-8111-111111111111",
          action: "report",
        }),
      }) as never
    );

    expect(response.status).toBe(500);
  });

  it("returns 500 when helpful vote DB update fails", async () => {
    const loadQuery = {
      select: vi.fn(() => loadQuery),
      eq: vi.fn(() => loadQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "row-1", user_id: "owner-1", helpful_count: 2 },
        error: null,
      }),
    };

    const voteInsert = vi.fn().mockResolvedValue({ error: null });

    const updateQuery = {
      update: vi.fn(() => updateQuery),
      eq: vi.fn().mockResolvedValue({ error: new Error("update failed") }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) },
      from: vi.fn(() => ({
        ...loadQuery,
        ...updateQuery,
        insert: voteInsert,
      })),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: "11111111-1111-4111-8111-111111111111" }),
      }) as never
    );

    expect(response.status).toBe(500);
  });

  it("returns 500 when POST DB insert fails", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: new Error("db error") }) })),
    } as never);

    const response = await POST(
      new Request("http://localhost/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueUrl: "https://example.com",
          venueName: "Example Venue",
          overallRating: 8,
        }),
      }) as never
    );

    expect(response.status).toBe(500);
  });

  it("blocks users from voting on their own note", async () => {
    const loadQuery = {
      select: vi.fn(() => loadQuery),
      eq: vi.fn(() => loadQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "row-1", user_id: "user-2", helpful_count: 2 },
        error: null,
      }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) },
      from: vi.fn(() => loadQuery),
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: "11111111-1111-4111-8111-111111111111" }),
      }) as never
    );

    expect(response.status).toBe(400);
  });
});
