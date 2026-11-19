# Liaison Telegram — côté serveur

Deux edge functions, une table, un secret de bot. Le navigateur ne reçoit jamais
le token du bot ni le `chat_id` : il ne lit que le statut et un handle masqué.

## Ce qui est en place

| Élément | Rôle |
|---|---|
| `supabase/functions/telegram-link` | `request` / `status` / `disconnect`, authentifiés par une signature de wallet |
| `supabase/functions/telegram-webhook` | reçoit `/start <code>` de Telegram, enregistre le `chat_id` |
| `supabase/migrations/20261119120000_telegram_links.sql` | tables `telegram_links` et `telegram_link_nonces`, RLS sans policy (service role uniquement) |

Le code de liaison est **stocké haché** (SHA-256) avec une expiration de 10 min.
Un `chat_id` n'est jamais renvoyé au client. Chaque requête signée porte un
`nonce` à usage unique, donc une signature capturée ne peut pas être rejouée.

## Message signé par le wallet

```
nexus-telegram-link:<action>:<wallet>:<issuedAt>:<nonce>
```

`issuedAt` doit être à ±5 min de l'heure serveur, `nonce` fait au moins 16
caractères et n'est accepté qu'une fois.

## Déploiement

```bash
supabase link --project-ref <ref>
supabase db push

# secrets partagés par les deux fonctions
supabase secrets set TELEGRAM_BOT_USERNAME=NexusSeekerBot
supabase secrets set TELEGRAM_WEBHOOK_SECRET=<chaîne aléatoire longue>

supabase functions deploy telegram-link
supabase functions deploy telegram-webhook --no-verify-jwt
```

Puis déclarer le webhook auprès de Telegram (une seule fois) :

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<ref>.supabase.co/functions/v1/telegram-webhook",
       "secret_token":"<même TELEGRAM_WEBHOOK_SECRET>"}'
```

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectés par Supabase, pas
besoin de les définir à la main. Le token du bot ne sert qu'à `setWebhook` : il
n'est utilisé par aucune fonction, car le bot répond via webhook.

## Ce qui reste à brancher

1. **Client** : `src/lib/telegramLink.ts` utilise encore le faux serveur en
   mémoire. Il faut un adaptateur qui signe le message avec
   `useWallet().signMessage`, appelle `telegram-link`, et remplace le snapshot
   par un état chargé au montage (plus de `subscribe`).
2. **Déploiement réel** : rien de tout ceci n'a été exécuté — pas de projet
   Supabase lié dans ce dépôt, donc ni la migration, ni les fonctions, ni le
   webhook n'ont été testés bout en bout.
3. **Bot** : créer le bot et réserver `@NexusSeekerBot` (ou changer
   `TELEGRAM_BOT_USERNAME`) ; le handle affiché aujourd'hui dans l'UI n'est
   qu'un texte.
