import { describe, expect, it } from "vitest";
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
});
