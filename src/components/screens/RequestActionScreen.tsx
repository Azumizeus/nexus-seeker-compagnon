import { useState } from "react";
import { BookOpen, Eye, RotateCcw, ShieldAlert, Coins, type LucideIcon } from "lucide-react";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import { GuardNotice, SectionTitle, EmptyState } from "@/components/shared/Notices";
import AgentAvatar from "@/components/shared/AgentAvatar";
import { useNexus } from "@/hooks/useNexus";
import { useAgents } from "@/hooks/useAgents";
import { useActionRequests } from "@/hooks/useActionRequests";
import { useToast } from "@/hooks/useToast";
import { canRequestFinancialAction, canSignOnChain } from "@/lib/guards";
import { ACTION_CATEGORY_LABELS, type ActionCategory, type ActionRequest } from "@/lib/models";
import { cn, formatRelative } from "@/lib/utils";

const CATEGORIES: Array<{ id: ActionCategory; icon: LucideIcon; hint: string }> = [
  { id: "read", icon: BookOpen, hint: "Consulter, analyser" },
  { id: "reversible", icon: RotateCcw, hint: "Annulable ensuite" },
  { id: "visible", icon: Eye, hint: "Message, post, partage" },
  { id: "financial", icon: Coins, hint: "Mouvement de fonds" },
];

const STATUS_BADGE: Record<ActionRequest["status"], { tone: "warning" | "success" | "neutral"; label: string }> = {
  pending: { tone: "warning", label: "En attente" },
  approved: { tone: "success", label: "Approuvée" },
  cancelled: { tone: "neutral", label: "Annulée" },
};

export default function RequestActionScreen() {
  const { connected, network, config, openWalletPicker } = useNexus();
  const { agents } = useAgents();
  const { requests, submit, approve, cancel } = useActionRequests();
  const { toast } = useToast();

  const [text, setText] = useState("");
  const [category, setCategory] = useState<ActionCategory>("read");
  const [agentId, setAgentId] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"send" | "approve" | null>(null);

  const isFinancial = category === "financial";
  const guard = isFinancial
    ? canRequestFinancialAction({ connected, network, paused: config?.paused ?? false })
    : canSignOnChain({ connected, network });
  const current = requests.find((r) => r.id === currentId && r.status === "pending");
  const canSend = text.trim().length > 2 && (!isFinancial || guard.allowed);

  const reset = () => {
    setText("");
    setCategory("read");
    setAgentId("");
    setCurrentId(null);
  };

  const handleSend = async () => {
    setBusy("send");
    try {
      const request = await submit({ text: text.trim(), category, agentId: agentId || undefined });
      setCurrentId(request.id);
      toast({ tone: "success", title: "Demande envoyée pour approbation" });
      return request;
    } finally {
      setBusy(null);
    }
  };

  const handleApprove = async () => {
    if (!connected) return openWalletPicker();
    let id = current?.id;
    if (!id) {
      const request = await handleSend();
      id = request.id;
    }
    setBusy("approve");
    const result = await approve(id);
    setBusy(null);
    if (result.ok) {
      toast({ tone: "success", title: "Approuvée dans ton wallet", description: "Signature de message : aucun fonds déplacé à cette étape." });
      reset();
    } else {
      toast({ tone: "danger", title: "Approbation impossible", description: result.error });
    }
  };

  const handleCancel = async () => {
    if (current) await cancel(current.id);
    reset();
  };

  return (
    <div className="stack !gap-5 animate-rise">
      <div>
        <p className="eyebrow">Nouvelle demande</p>
        <h1 className="text-3xl font-bold">Demander une action</h1>
      </div>

      <section className="card stack">
        <div className="field">
          <label htmlFor="action-text" className="label">
            Que doit faire l'agent ?
          </label>
          <textarea
            id="action-text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex. Résume mes 10 dernières transactions devnet"
            className="min-h-[120px] w-full resize-y rounded-2xl border-[1.5px] border-border-strong bg-surface p-4 text-base outline-none focus:border-foreground"
          />
        </div>

        <fieldset className="stack !gap-2">
          <legend className="label mb-2">Catégorie</legend>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(({ id, icon: Icon, hint }) => {
              const selected = category === id;
              return (
                <label
                  key={id}
                  className={cn(
                    "flex min-h-[72px] cursor-pointer flex-col justify-center gap-1 rounded-2xl border-2 p-3 transition-colors",
                    selected
                      ? id === "financial"
                        ? "border-danger bg-danger-soft"
                        : "border-foreground bg-primary-soft"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <input type="radio" name="category" value={id} checked={selected} onChange={() => setCategory(id)} className="sr-only" />
                  <span className="flex items-center gap-2 font-semibold leading-tight">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {ACTION_CATEGORY_LABELS[id]}
                  </span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {agents.length > 0 && (
          <div className="field">
            <label htmlFor="action-agent" className="label">
              Agent concerné (optionnel)
            </label>
            <select
              id="action-agent"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="min-h-tap rounded-2xl border-[1.5px] border-border-strong bg-surface px-3"
            >
              <option value="">Aucun agent en particulier</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isFinancial && (
          <div role="alert" data-testid="financial-banner" className="flex items-start gap-3 rounded-2xl border-2 border-danger bg-danger p-4 text-danger-foreground">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
            <div>
              <p className="font-display text-lg font-bold">Confirmation humaine obligatoire</p>
              <p className="text-sm">
                Action financière on-chain : rien ne part sans ta signature explicite dans ton wallet, quel que soit le mode des agents.
              </p>
            </div>
          </div>
        )}

        {!guard.allowed && guard.reason && (
          <GuardNotice tone={isFinancial ? "danger" : "warning"}>
            {isFinancial ? `Action financière bloquée : ${guard.reason}` : guard.reason}
          </GuardNotice>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="secondary" size="lg" onClick={() => void handleSend()} disabled={!canSend || !!current} loading={busy === "send"} data-testid="send-request">
            Envoyer pour approbation
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => void handleApprove()}
            disabled={(!current && !canSend) || (connected && !guard.allowed)}
            loading={busy === "approve"}
            data-testid="approve-request"
          >
            Approuver dans mon wallet
          </Button>
          <Button variant="outline" size="lg" onClick={() => void handleCancel()} disabled={!text && !current}>
            Annuler
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          L'approbation est une signature de message dans ton wallet. L'exécution sera faite par le cœur de décision, après lecture de cette approbation.
        </p>
      </section>

      <section className="stack">
        <SectionTitle eyebrow="Historique" title="Demandes" />
        {requests.length === 0 ? (
          <EmptyState title="Aucune demande">Les demandes envoyées apparaîtront ici avec leur statut.</EmptyState>
        ) : (
          <ul className="stack !gap-2">
            {requests.slice(0, 20).map((r) => {
              const agent = agents.find((a) => a.id === r.agentId);
              const status = STATUS_BADGE[r.status];
              return (
                <li key={r.id} className="card !p-4 stack !gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.category === "financial" ? "danger" : "violet"}>{ACTION_CATEGORY_LABELS[r.category]}</Badge>
                    <Badge tone={status.tone} dot>
                      {status.label}
                    </Badge>
                    <span className="ml-auto text-xs text-muted-foreground">{formatRelative(r.createdAt)}</span>
                  </div>
                  <p className="break-words font-medium">{r.text}</p>
                  {agent && (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <AgentAvatar name={agent.name} slot={agent.slot} size="sm" /> {agent.name}
                    </span>
                  )}
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        onClick={async () => {
                          const res = await approve(r.id);
                          toast(res.ok ? { tone: "success", title: "Demande approuvée" } : { tone: "danger", title: "Approbation impossible", description: res.error });
                        }}
                      >
                        Approuver
                      </Button>
                      <Button variant="outline" onClick={() => void cancel(r.id)}>
                        Annuler
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
