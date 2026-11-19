// Telegram account link — server side.
//
// Contract (POST, JSON):
//   { wallet, action: "request" | "status" | "disconnect",
//     issuedAt: number, nonce: string, signature: string }
//   message signed by the wallet:
//     nexus-telegram-link:<action>:<wallet>:<issuedAt>:<nonce>
//
// The browser only receives the status and a masked handle. The code is stored
// hashed and validated by telegram-webhook when the user sends `/start <code>`
// to the bot, so neither the bot token nor the chat id ever reaches the client.
//
// Secrets (supabase secrets set …):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (provided by Supabase)
//   TELEGRAM_BOT_USERNAME                    e.g. NexusSeekerBot (display only)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CODE_TTL_MS = 10 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type Action = "request" | "status" | "disconnect";

type LinkRow = {
  wallet: string;
  status: "disconnected" | "pending" | "connected";
  code_expires_at: string | null;
  chat_id: number | null;
  handle_hint: string | null;
  linked_at: string | null;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/* ----------------------------- base58 ----------------------------- */

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Decode(value: string): Uint8Array {
  let n = 0n;
  for (const char of value) {
    const index = B58.indexOf(char);
    if (index === -1) throw new Error("invalid base58");
    n = n * 58n + BigInt(index);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  for (const char of value) {
    if (char !== "1") break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

/* ---------------------------- helpers ----------------------------- */

const randomCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
};

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** "@mikael_dev" -> "@mi•••ev" (same rule as the client). */
function maskHandle(handle: string): string {
  const h = handle.replace(/^@/, "");
  if (h.length <= 4) return `@${h[0] ?? ""}•••`;
  return `@${h.slice(0, 2)}•••${h.slice(-2)}`;
}

function publicLink(row: LinkRow | null) {
  if (!row || row.status !== "connected") {
    return row?.status === "pending"
      ? { status: "pending" as const, expiresAt: row.code_expires_at ? Date.parse(row.code_expires_at) : null }
      : { status: "disconnected" as const };
  }
  return {
    status: "connected" as const,
    handleHint: row.handle_hint ?? "@•••",
    linkedAt: row.linked_at ? Date.parse(row.linked_at) : Date.now(),
  };
}

/* ---------------------------- storage ----------------------------- */

const serviceHeaders = () => {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
};

async function getLink(wallet: string): Promise<LinkRow | null> {
  const url = `${Deno.env.get("SUPABASE_URL")}/rest/v1/telegram_links?wallet=eq.${encodeURIComponent(wallet)}&select=*`;
  const res = await fetch(url, { headers: serviceHeaders() });
  if (!res.ok) throw new Error(`read failed: ${res.status}`);
  const rows = (await res.json()) as LinkRow[];
  return rows[0] ?? null;
}

async function upsertLink(wallet: string, patch: Partial<LinkRow>): Promise<void> {
  const url = `${Deno.env.get("SUPABASE_URL")}/rest/v1/telegram_links?on_conflict=wallet`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...serviceHeaders(), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([{ wallet, updated_at: new Date().toISOString(), ...patch }]),
  });
  if (!res.ok) throw new Error(`write failed: ${res.status}`);
}

/** Returns false when the nonce was already used (replay). */
async function consumeNonce(wallet: string, nonce: string): Promise<boolean> {
  const url = `${Deno.env.get("SUPABASE_URL")}/rest/v1/telegram_link_nonces`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...serviceHeaders(), Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify([{ nonce, wallet }]),
  });
  if (!res.ok) throw new Error(`nonce write failed: ${res.status}`);
  const rows = (await res.json()) as unknown[];
  return rows.length > 0;
}

/* ------------------------------ auth ------------------------------ */

async function verifyWalletSignature(args: {
  wallet: string;
  action: Action;
  issuedAt: number;
  nonce: string;
  signature: string;
}): Promise<boolean> {
  if (!Number.isFinite(args.issuedAt) || Math.abs(Date.now() - args.issuedAt) > CLOCK_SKEW_MS) return false;
  if (!args.nonce || args.nonce.length < 16 || args.nonce.length > 128) return false;

  const message = `nexus-telegram-link:${args.action}:${args.wallet}:${args.issuedAt}:${args.nonce}`;
  let publicKey: Uint8Array;
  let signature: Uint8Array;
  try {
    publicKey = base58Decode(args.wallet);
    signature = base58Decode(args.signature);
  } catch {
    return false;
  }
  if (publicKey.length !== 32 || signature.length !== 64) return false;

  const key = await crypto.subtle.importKey("raw", publicKey, { name: "Ed25519" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("Ed25519", key, signature, new TextEncoder().encode(message));
  return valid && (await consumeNonce(args.wallet, args.nonce));
}

/* ------------------------------ handler --------------------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const wallet = typeof body.wallet === "string" ? body.wallet : "";
  const action = body.action as Action;
  if (!wallet || !["request", "status", "disconnect"].includes(action)) {
    return json(400, { error: "invalid_request" });
  }

  const authorized = await verifyWalletSignature({
    wallet,
    action,
    issuedAt: Number(body.issuedAt),
    nonce: String(body.nonce ?? ""),
    signature: String(body.signature ?? ""),
  });
  if (!authorized) return json(401, { error: "invalid_signature" });

  try {
    const current = await getLink(wallet);

    if (action === "status") return json(200, publicLink(current));

    if (action === "disconnect") {
      await upsertLink(wallet, {
        status: "disconnected",
        code_hash: null,
        code_expires_at: null,
        chat_id: null,
        handle_hint: null,
        linked_at: null,
      });
      return json(200, { status: "disconnected" });
    }

    // action === "request"
    if (current?.status === "connected") return json(409, { error: "already_linked" });

    const code = randomCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    await upsertLink(wallet, {
      status: "pending",
      code_hash: await sha256Hex(code),
      code_expires_at: expiresAt.toISOString(),
      request_id: crypto.randomUUID(),
      linked_at: null,
      handle_hint: null,
      chat_id: null,
    });

    return json(200, {
      status: "pending",
      code,
      expiresAt: expiresAt.getTime(),
      botUsername: Deno.env.get("TELEGRAM_BOT_USERNAME") ?? null,
    });
  } catch (error) {
    console.error("[telegram-link]", error);
    return json(500, { error: "server_error" });
  }
});

// Exported for a future Deno test harness.
export { base58Decode, maskHandle, sha256Hex };
