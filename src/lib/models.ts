/** Shapes stored locally on the device (IndexedDB). */

export interface Agent {
  id: string;
  /** On-chain agent_id slot (0..6) used by nexus_access. Unique per agent. */
  slot: number;
  name: string;
  role: string;
  personality: string;
  createdAt: number;
}

export type MessageAuthor = "user" | "system" | string; // agent id otherwise

export interface ChatMessage {
  id: string;
  conversationId: string;
  author: MessageAuthor;
  text: string;
  at: number;
  /** Marks a message that proposes an on-chain or financial action. */
  needsValidation?: boolean;
}

export type ActivitySource = "wallet" | "agent-wallet" | "agent" | "program" | "system";
export type ActivitySeverity = "info" | "success" | "alert" | "danger";

export interface ActivityEntry {
  id: string;
  at: number;
  source: ActivitySource;
  severity: ActivitySeverity;
  title: string;
  detail?: string;
  /** Local agent id that initiated the action, when known. */
  agentId?: string;
  /** On-chain agent slot (0..6), when the action comes from the program. */
  agentSlot?: number;
  signature?: string;
}

export type ActionCategory = "read" | "reversible" | "visible" | "financial";

export const ACTION_CATEGORY_LABELS: Record<ActionCategory, string> = {
  read: "Lecture",
  reversible: "Action réversible",
  visible: "Visible par des tiers",
  financial: "Action financière on-chain",
};

export type ActionRequestStatus = "pending" | "approved" | "cancelled";

export interface ActionRequest {
  id: string;
  createdAt: number;
  text: string;
  category: ActionCategory;
  agentId?: string;
  status: ActionRequestStatus;
  approvedBy?: string;
  approvalSignature?: string;
}

export const dmConversationId = (agentId: string) => `dm:${agentId}`;
export const GROUP_CONVERSATION_ID = "group:main";
