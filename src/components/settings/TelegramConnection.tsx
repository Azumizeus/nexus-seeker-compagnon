import { useState } from "react";
import { Send } from "lucide-react";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { GuardNotice } from "@/components/shared/Notices";
import { useTelegramLink } from "@/hooks/useTelegramLink";
import { TELEGRAM_BOT_USERNAME } from "@/lib/telegramLink";
import { formatRelative } from "@/lib/utils";

const timeOf = (ts: number) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** "Connexions" > Telegram. Skeleton: mock server, no bot, no network. */
export default function TelegramConnection() {
  const tg = useTelegramLink();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { link } = tg;

  return (
    <div className="stack !gap-3 rounded-2xl border-[1.5px] border-border p-4" data-testid="telegram-connection">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-sunken">
          <Send className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Telegram</p>
          <p className="text-xs text-muted-foreground">Alertes et demandes de validation, réponse Oui / Non.</p>
        </div>
        {link.status === "connected" ? (
          <Badge tone="success" dot>Connecté</Badge>
        ) : link.status === "pending" ? (
          <Badge tone="warning" dot>En attente</Badge>
        ) : (
          <Badge tone="neutral" dot>Déconnecté</Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">Aperçu : aucun bot n'est branché, les données sont factices.</p>

      {!tg.walletConnected ? (
        <GuardNotice>Connecte ton wallet : le compte Telegram est lié à ton wallet.</GuardNotice>
      ) : link.status === "disconnected" ? (
        <Button variant="primary" onClick={tg.connect} loading={tg.pending === "request"} className="self-start">
          Connecter Telegram
        </Button>
      ) : link.status === "pending" ? (
        <div className="stack !gap-3">
          <p className="text-sm">
            Ouvre <span className="font-semibold">@{TELEGRAM_BOT_USERNAME}</span> dans Telegram et envoie ce code. Il expire à {timeOf(link.expiresAt)}.
          </p>
          <p className="self-start rounded-xl bg-surface-sunken px-4 py-2 font-mono text-xl font-bold tracking-[0.2em]" aria-label="Code de liaison">
            {link.code}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={tg.simulateConfirm} loading={tg.pending === "confirm"} disabled={tg.pending !== null && tg.pending !== "confirm"}>
              Simuler la réponse du bot
            </Button>
            <Button variant="outline" onClick={tg.cancel} loading={tg.pending === "cancel"} disabled={tg.pending !== null && tg.pending !== "cancel"}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            Lié à <span className="font-mono font-semibold">{link.handleHint}</span> {formatRelative(link.linkedAt)}
            {link.demo && (
              <Badge tone="accent" className="ml-2">Donnée factice</Badge>
            )}
          </p>
          <Button variant="danger-soft" onClick={() => setConfirmOpen(true)}>
            Déconnecter
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Déconnecter Telegram ?"
        description="Tu ne recevras plus d'alertes ni de demandes de validation sur Telegram. Tu pourras relier un compte plus tard."
        confirmLabel="Déconnecter"
        tone="danger"
        loading={tg.pending === "disconnect"}
        onConfirm={tg.disconnect}
      />
    </div>
  );
}
