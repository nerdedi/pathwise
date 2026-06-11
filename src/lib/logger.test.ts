import { afterEach, describe, expect, it, vi } from "vitest";
import { logError, logWarn } from "./logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs errors without context suffix when context is empty", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new Error("boom");

    logError("/api/test", error);

    expect(spy).toHaveBeenCalledWith("[/api/test]", error);
  });

  it("logs errors with serialized context when present", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new Error("boom");

    logError("/api/test", error, { id: "abc", retry: 2 });

    expect(spy).toHaveBeenCalledWith("[/api/test] {\"id\":\"abc\",\"retry\":2}", error);
  });

  it("logs warnings with message and optional context", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    logWarn("runtime", "Heads up", { key: "value" });

    expect(spy).toHaveBeenCalledWith("[runtime] Heads up {\"key\":\"value\"}");
  });
});
