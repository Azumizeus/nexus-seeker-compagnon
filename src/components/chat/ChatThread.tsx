import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { SendHorizontal, ShieldAlert } from "lucide-react";
import Button from "@/components/shared/Button";
import AgentAvatar, { AGENT_BORDER } from "@/components/shared/AgentAvatar";
import { useNexus } from "@/hooks/useNexus";
import type { Agent, ChatMessage } from "@/lib/models";
import { cn } from "@/lib/utils";

interface ChatThreadProps {
  messages: ChatMessage[];
  agents: Agent[];
  thinkingAgents: Agent[];
  onSend: (text: string) => Promise<void> | void;
  placeholder: string;
  disabled?: boolean;
  emptyHint: string;
}

function timeOf(at: number) {
  return new Date(at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Shared message list + composer for 1:1 and group chats. */
export default function ChatThread({ messages, agents, thinkingAgents, onSend, placeholder, disabled, emptyHint }: ChatThreadProps) {
  const { connected } = useNexus();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinkingAgents.length]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await onSend(text);
  };

  return (
    <div className="flex min-h-[60dvh] flex-col overflow-hidden rounded-3xl border-[1.5px] border-border bg-surface shadow-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4" role="log" aria-live="polite" aria-label="Conversation">
        {messages.length === 0 && <p className="mx-auto max-w-xs py-10 text-center text-sm text-muted-foreground">{emptyHint}</p>}
        {messages.map((m) => {
          if (m.author === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-3xl rounded-br-lg border-2 border-foreground bg-primary px-4 py-2.5 text-primary-foreground">
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className="mt-1 text-right text-[0.7rem] opacity-70">Toi · {timeOf(m.at)}</p>
                </div>
              </div>
            );
          }
          if (m.author === "system") {
            return (
              <p key={m.id} className="text-center text-xs font-medium text-muted-foreground">
                {m.text}
              </p>
            );
          }
          const agent = agents.find((a) => a.id === m.author);
          const name = agent?.name ?? "Agent supprimé";
          const slot = agent?.slot ?? 0;
          return (
            <div key={m.id} className="flex items-end gap-2">
              <AgentAvatar name={name} slot={slot} size="sm" />
              <div className={cn("max-w-[85%] rounded-3xl rounded-bl-lg border-2 bg-surface-sunken px-4 py-2.5", AGENT_BORDER[slot % 7])}>
                <p className="mb-0.5 text-xs font-bold">{name}</p>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                {m.needsValidation && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-ink">
                    <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
                    Validation humaine requise
                    <Link to="/demander" className="ml-auto inline-flex min-h-[32px] items-center underline">
                      {connected ? "Valider" : "Connecter pour valider"}
                    </Link>
                  </div>
                )}
                <p className="mt-1 text-[0.7rem] text-muted-foreground">{timeOf(m.at)}</p>
              </div>
            </div>
          );
        })}
        {thinkingAgents.map((a) => (
          <div key={a.id} className="flex items-center gap-2" aria-label={`${a.name} réfléchit`}>
            <AgentAvatar name={a.name} slot={a.slot} size="sm" status="thinking" />
            <span className="flex gap-1 rounded-full bg-surface-sunken px-3 py-2.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex items-end gap-2 border-t-[1.5px] border-border bg-background p-2 sm:p-3">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          rows={1}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(e);
            }
          }}
          placeholder={placeholder}
          className="max-h-32 min-h-[52px] flex-1 resize-none rounded-2xl border-[1.5px] border-border-strong bg-surface px-4 py-3 text-base outline-none focus:border-foreground disabled:opacity-60"
        />
        <Button type="submit" variant="primary" size="icon" className="!h-[52px] !w-[52px]" disabled={disabled || !draft.trim()} aria-label="Envoyer">
          <SendHorizontal className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
