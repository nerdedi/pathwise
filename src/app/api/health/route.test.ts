import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("health route", () => {
  it("returns a health payload", async () => {
    const response = await GET();

    expect([200, 503]).toContain(response.status);
    const payload = (await response.json()) as {
      ok: boolean;
      issues: Array<{ key: string; severity: string; message: string }>;
    };

    expect(payload.ok).toBeTypeOf("boolean");
    expect(Array.isArray(payload.issues)).toBe(true);
  });
});
