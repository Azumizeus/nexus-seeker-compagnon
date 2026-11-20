import { afterEach, describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./serviceWorker";

const stubServiceWorker = (value: unknown) =>
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value });

afterEach(() => {
  Reflect.deleteProperty(navigator, "serviceWorker");
  vi.restoreAllMocks();
});

describe("registerServiceWorker", () => {
  it("registers /sw.js at the root scope", () => {
    const register = vi.fn().mockResolvedValue({});
    stubServiceWorker({ register });
    registerServiceWorker();
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });

  it("does nothing when the browser has no service workers", () => {
    stubServiceWorker(undefined);
    expect(() => registerServiceWorker()).not.toThrow();
  });

  it("swallows a rejected registration instead of breaking the app", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    stubServiceWorker({ register: vi.fn().mockRejectedValue(new Error("blocked")) });
    registerServiceWorker();
    await Promise.resolve();
    expect(logged).toHaveBeenCalled();
  });
});
