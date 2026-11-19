import type { Agent, ChatMessage } from "./models";

/**
 * Interface the decision engine ("cerveau") will implement later.
 * For now `simulatedResponder` returns local, clearly-labelled simulated replies.
 * Swap it in useAgentChat once the real engine is reachable.
 */
export interface AgentReply {
  text: string;
  needsValidation?: boolean;
}

export interface GroupTurn extends AgentReply {
  agent: Agent;
}

export interface AgentResponder {
  reply(agent: Agent, userText: string, history: ChatMessage[]): Promise<AgentReply>;
  groupRound(agents: Agent[], prompt: string, history: ChatMessage[]): Promise<GroupTurn[]>;
}

const FINANCIAL = /\b(envoi|envoie|envoyer|transf[eé]r|pa(y|i)e|payer|swap|ach[eè]te|vend|sol\b|lamports?|token|mint|stake|d[eé]pense)/i;

export function looksFinancial(text: string) {
  return FINANCIAL.test(text);
}

function pick<T>(list: T[], seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

function quote(text: string) {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 90 ? `${t.slice(0, 87)}…` : t;
}

function voice(agent: Agent) {
  const p = agent.personality.trim();
  return p ? ` (${p.split(/[.,;]/)[0].toLowerCase()})` : "";
}

export const simulatedResponder: AgentResponder = {
  async reply(agent, userText) {
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 700));
    if (looksFinancial(userText)) {
      return {
        needsValidation: true,
        text: `Je peux préparer ça, mais c'est une action financière : rien ne part sans ta validation. Crée la demande dans « Demander une action » et signe-la dans ton wallet.`,
      };
    }
    const role = agent.role.trim() || "assistant";
    const openers = [
      `En tant que ${role}${voice(agent)}, voilà mon avis sur « ${quote(userText)} » :`,
      `Bien reçu. Côté ${role}, je retiens « ${quote(userText)} ».`,
      `Ok ! Je regarde « ${quote(userText)} » avec ma casquette de ${role}.`,
    ];
    const closers = [
      "Je note ça dans mon espace de travail et je te propose une suite dès que le cerveau est branché.",
      "Prochaine étape : je prépare un brouillon dans ma sandbox, tu valides avant toute action.",
      "Dis-moi si tu veux que je le partage avec les autres agents dans le chat de groupe.",
    ];
    return { text: `${pick(openers, userText + agent.id)} ${pick(closers, agent.name + userText)}` };
  },

  async groupRound(agents, prompt) {
    const crew = agents.slice(0, 3);
    if (!crew.length) return [];
    const financial = looksFinancial(prompt);
    const [proposer, challenger = proposer, executor = challenger] = crew;
    const turns: GroupTurn[] = [
      { agent: proposer, text: `Je propose qu'on traite : « ${quote(prompt)} ». Je commence par rassembler ce qu'il faut.` },
    ];
    if (challenger !== proposer) {
      turns.push({
        agent: challenger,
        text: financial
          ? "Je challenge : c'est financier. On vérifie le mode du wallet et le plafond avant d'aller plus loin."
          : "Je challenge un point : on a bien tout le contexte ? Je préfère qu'on vérifie avant d'exécuter.",
      });
    }
    turns.push({
      agent: executor,
      needsValidation: financial,
      text: financial
        ? "Je prépare l'exécution et je la mets en attente de validation humaine. Rien n'est signé sans toi."
        : "D'accord, je m'en charge et je poste le résultat ici.",
    });
    return turns;
  },
};
