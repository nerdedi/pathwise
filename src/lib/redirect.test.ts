import { describe, expect, it, vi } from "vitest";
import { getSafeInternalRedirectPath } from "./redirect";

describe("getSafeInternalRedirectPath", () => {
  it("allows a normal internal route with query and hash", () => {
    expect(getSafeInternalRedirectPath("/plan/123?step=2#summary")).toBe(
      "/plan/123?step=2#summary"
    );
  });

  it("falls back for external or protocol-relative URLs", () => {
    expect(getSafeInternalRedirectPath("https://evil.example.com")).toBe("/guides");
    expect(getSafeInternalRedirectPath("//evil.example.com")).toBe("/guides");
  });

  it("falls back for blank or malformed input", () => {
    expect(getSafeInternalRedirectPath("  ")).toBe("/guides");
    expect(getSafeInternalRedirectPath(undefined)).toBe("/guides");
  });

  it("falls back when URL parsing throws", () => {
    const originalURL = globalThis.URL;
    vi.stubGlobal(
      "URL",
      class BrokenURL {
        constructor() {
          throw new Error("url parser unavailable");
        }
      }
    );

    expect(getSafeInternalRedirectPath("/plan/abc")).toBe("/guides");

    vi.stubGlobal("URL", originalURL);
  });
});
