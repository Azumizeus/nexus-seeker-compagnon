-- Telegram account link, keyed by wallet.
--
-- The browser never stores the chat id nor the bot token: it only ever reads the
-- status and a masked handle. The one-time code is stored hashed, so a database
-- leak does not expose a usable code either.

create table if not exists public.telegram_links (
  wallet text primary key,
  status text not null default 'disconnected'
    check (status in ('disconnected', 'pending', 'connected')),
  code_hash text,
  code_expires_at timestamptz,
  request_id uuid,
  chat_id bigint,
  handle_hint text,
  linked_at timestamptz,
  updated_at timestamptz not null default now()
);

-- One row per signed request, so a captured signature cannot be replayed.
create table if not exists public.telegram_link_nonces (
  nonce text primary key,
  wallet text not null,
  used_at timestamptz not null default now()
);

alter table public.telegram_links enable row level security;
alter table public.telegram_link_nonces enable row level security;

-- No policies on purpose: everything goes through the edge functions, which use
-- the service role. An anon/authenticated client cannot read or write these.

create index if not exists telegram_links_status_idx on public.telegram_links (status);
