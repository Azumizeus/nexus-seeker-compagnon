// Telegram webhook — validates `/start <code>` and stores the chat id.
//
// Telegram calls this URL for every bot update. The chat id stays in the
// database: the client only ever sees the masked handle returned by
// telegram-link.
//
// Secrets (supabase secrets set …):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   TELEGRAM_WEBHOOK_SECRET  (same value passed to setWebhook's secret_token)

const CODE_TTL_MS = 10 * 60 * 1000;

type Update = {
  message?: {
    text?: string;
    chat?: { id?: number };
    from?: { username?: string; first_name?: string };
  };
};

const serviceHeaders = () => {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
};

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function maskHandle(handle: string): string {
  const h = handle.replace(/^@/, "");
  if (h.length <= 4) return `@${h[0] ?? ""}•••`;
  return `@${h.slice(0, 2)}•••${h.slice(-2)}`;
}

async function findPendingByCode(codeHash: string) {
  const base = Deno.env.get("SUPABASE_URL");
  const url =
    `${base}/rest/v1/telegram_links?code_hash=eq.${codeHash}` +
    `&status=eq.pending&select=wallet,code_expires_at`;
  const res = await fetch(url, { headers: serviceHeaders() });
  if (!res.ok) throw new Error(`lookup failed: ${res.status}`);
  const rows = (await res.json()) as { wallet: string; code_expires_at: string | null }[];
  return rows.find((row) => row.code_expires_at && Date.parse(row.code_expires_at) > Date.now()) ?? null;
}

async function markConnected(wallet: string, chatId: number, handleHint: string) {
  const url = `${Deno.env.get("SUPABASE_URL")}/rest/v1/telegram_links?wallet=eq.${encodeURIComponent(wallet)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: serviceHeaders(),
    body: JSON.stringify({
      status: "connected",
      chat_id: chatId,
      handle_hint: handleHint,
      linked_at: new Date().toISOString(),
      code_hash: null,
      code_expires_at: null,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`update failed: ${res.status}`);
}

Deno.serve(async (req) => {
  // Telegram must always get a 2xx, otherwise it retries the same update.
  const ok = () => new Response("ok", { status: 200 });

  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  let update: Update;
  try {
    update = await req.json();
  } catch {
    return ok();
  }

  const text = update.message?.text?.trim() ?? "";
  const match = /^\/start(?:@\w+)?\s+([A-Za-z0-9]{8})$/.exec(text);
  const chatId = update.message?.chat?.id;
  if (!match || typeof chatId !== "number") return ok();

  const code = match[1].toUpperCase();
  try {
    const pending = await findPendingByCode(await sha256Hex(code));
    if (!pending) return ok();

    const handle = update.message?.from?.username
      ? `@${update.message.from.username}`
      : update.message?.from?.first_name ?? "@•••";
    await markConnected(pending.wallet, chatId, maskHandle(handle));
  } catch (error) {
    console.error("[telegram-webhook]", error);
  }

  return ok();
});

export { CODE_TTL_MS, maskHandle, sha256Hex };
