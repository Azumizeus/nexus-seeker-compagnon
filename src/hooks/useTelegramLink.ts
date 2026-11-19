import { useCallback, useState, useSyncExternalStore } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useToast } from "./useToast";
import { DISCONNECTED, telegramLinkServer, type TelegramLink } from "@/lib/telegramLink";

type PendingAction = "request" | "confirm" | "cancel" | "disconnect";

/**
 * Telegram link of the connected wallet. Skeleton: backed by the in-memory mock server.
 * The client never holds the bot token or the chat id, only the status and a masked handle.
 */
export function useTelegramLink() {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingAction | null>(null);

  const owner = publicKey?.toBase58() ?? null;
  const links = useSyncExternalStore(telegramLinkServer.subscribe, telegramLinkServer.getSnapshot);
  const link: TelegramLink = owner ? (links.get(owner) ?? DISCONNECTED) : DISCONNECTED;

  const run = useCallback(
    async (action: PendingAction, success: string | null, fn: (owner: string) => Promise<unknown>) => {
      if (!owner) {
        toast({ tone: "alert", title: "Wallet non connecté", description: "Connecte ton wallet pour lier Telegram." });
        return false;
      }
      setPending(action);
      try {
        await fn(owner);
        if (success) toast({ tone: "success", title: success });
        return true;
      } catch (e) {
        toast({ tone: "alert", title: "Action refusée", description: e instanceof Error ? e.message : String(e) });
        return false;
      } finally {
        setPending(null);
      }
    },
    [owner, toast],
  );

  return {
    link,
    walletConnected: owner !== null,
    pending,
    connect: () => run("request", null, (o) => telegramLinkServer.requestLink(o)),
    simulateConfirm: () => run("confirm", "Telegram connecté", (o) => telegramLinkServer.simulateBotConfirm(o)),
    cancel: () => run("cancel", null, (o) => telegramLinkServer.cancelLink(o)),
    disconnect: () => run("disconnect", "Telegram déconnecté", (o) => telegramLinkServer.disconnect(o)),
  };
}

export type TelegramLinkApi = ReturnType<typeof useTelegramLink>;
