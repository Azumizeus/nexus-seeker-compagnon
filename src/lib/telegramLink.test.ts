import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DISCONNECTED,
  TELEGRAM_LINK_CODE_TTL_MS,
  TELEGRAM_MOCK_BOT_ENABLED,
  maskHandle,
  telegramLinkServer,
} from "./telegramLink";

/** Unique owner per test: the mock server keeps its state for the module lifetime. */
let seq = 0;
const ownerId = () => `owner-${process.pid}-${seq++}`;

afterEach(() => {
  vi.useRealTimers();
});

describe("maskHandle", () => {
  it("keeps the first and last two characters of a long handle", () => {
    expect(maskHandle("@demo_seeker")).toBe("@de•••er");
    expect(maskHandle("mikael_dev")).toBe("@mi•••ev");
  });

  it("never reveals a handle of four characters or less", () => {
    expect(maskHandle("@abc")).toBe("@a•••");
    expect(maskHandle("@")).toBe("@•••");
  });
});

describe("telegramLinkServer", () => {
  it("starts disconnected for an unknown owner", () => {
    expect(telegramLinkServer.getSnapshot().get(ownerId()) ?? DISCONNECTED).toEqual(DISCONNECTED);
  });

  it("issues a pending link with an 8-character code that expires in 10 minutes", async () => {
    const owner = ownerId();
    const before = Date.now();
    const link = await telegramLinkServer.requestLink(owner);

    expect(link.status).toBe("pending");
    if (link.status !== "pending") throw new Error("unreachable");
    expect(link.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(link.expiresAt).toBeGreaterThanOrEqual(before + TELEGRAM_LINK_CODE_TTL_MS);
    expect(telegramLinkServer.getSnapshot().get(owner)).toEqual(link);
  });

  it("connects with a masked demo handle once the bot confirms", async () => {
    const owner = ownerId();
    await telegramLinkServer.requestLink(owner);
    await telegramLinkServer.simulateBotConfirm(owner);

    const link = telegramLinkServer.getSnapshot().get(owner);
    expect(link).toMatchObject({ status: "connected", handleHint: "@de•••er", demo: true });
  });

  it("refuses to confirm when no link is pending", async () => {
    await expect(telegramLinkServer.simulateBotConfirm(ownerId())).rejects.toThrow("Aucune liaison en attente.");
  });

  it("refuses a second link while one is already connected", async () => {
    const owner = ownerId();
    await telegramLinkServer.requestLink(owner);
    await telegramLinkServer.simulateBotConfirm(owner);

    await expect(telegramLinkServer.requestLink(owner)).rejects.toThrow("déjà lié");
  });

  it("cancels a pending link", async () => {
    const owner = ownerId();
    await telegramLinkServer.requestLink(owner);
    await telegramLinkServer.cancelLink(owner);

    expect(telegramLinkServer.getSnapshot().get(owner)).toEqual(DISCONNECTED);
  });

  it("disconnects a connected link", async () => {
    const owner = ownerId();
    await telegramLinkServer.requestLink(owner);
    await telegramLinkServer.simulateBotConfirm(owner);
    await telegramLinkServer.disconnect(owner);

    expect(telegramLinkServer.getSnapshot().get(owner)).toEqual(DISCONNECTED);
  });

  it("drops an expired code instead of linking", async () => {
    const owner = ownerId();
    await telegramLinkServer.requestLink(owner);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + TELEGRAM_LINK_CODE_TTL_MS + 1);

    await expect(telegramLinkServer.simulateBotConfirm(owner)).rejects.toThrow("Code expiré");
    expect(telegramLinkServer.getSnapshot().get(owner)).toEqual(DISCONNECTED);
  });

  it("only enables the mock bot in development", () => {
    expect(TELEGRAM_MOCK_BOT_ENABLED).toBe(true);
  });
});
