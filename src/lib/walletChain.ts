import type { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  balanceDelta,
  orderedAccountKeys,
  resolveAccountIndex,
  type WalletTxPoint,
} from "./walletSeries";

export interface WalletTx extends WalletTxPoint {
  failed: boolean;
}

/**
 * Last transactions touching `address`, newest first, each with the balance
 * change it applied to that wallet. Shared by the wallet sheet and the
 * performance panel so both read the chain the same way.
 */
export async function fetchWalletTxs(
  connection: Connection,
  address: PublicKey,
  limit: number,
): Promise<WalletTx[]> {
  const signatures = await connection.getSignaturesForAddress(address, { limit });
  if (signatures.length === 0) return [];

  const parsed = await connection.getParsedTransactions(
    signatures.map((s) => s.signature),
    { commitment: "confirmed", maxSupportedTransactionVersion: 0 },
  );
  const owner = address.toBase58();

  return signatures.map((info, index) => {
    const tx = parsed[index];
    const meta = tx?.meta;
    const message = tx?.transaction.message;
    const loaded = meta?.loadedAddresses;
    // Versioned transactions append the loaded addresses after the static keys.
    const keys = message
      ? orderedAccountKeys(
          message.accountKeys.map((key) => key.pubkey.toBase58()),
          loaded
            ? {
                writable: loaded.writable.map((key) => key.toBase58()),
                readonly: loaded.readonly.map((key) => key.toBase58()),
              }
            : null,
        )
      : [];
    const position = resolveAccountIndex(keys, owner);
    const delta = position < 0 ? 0 : balanceDelta(meta?.preBalances[position], meta?.postBalances[position]);

    return {
      signature: info.signature,
      blockTime: info.blockTime ?? null,
      deltaLamports: delta,
      failed: Boolean(info.err),
    } satisfies WalletTx;
  });
}

type ParsedTokenAccount = {
  parsed?: { info?: { tokenAmount?: { amount?: string } } };
};

/**
 * SPL token accounts actually holding something. The panel has no price source,
 * so it never converts them — it only reports that they exist and are excluded
 * from the SOL total.
 */
export async function countFundedTokenAccounts(
  connection: Connection,
  owner: PublicKey,
): Promise<number> {
  const result = await connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID });
  return result.value.filter(({ account }) => {
    const amount = (account.data as ParsedTokenAccount).parsed?.info?.tokenAmount?.amount;
    return Number(amount ?? "0") > 0;
  }).length;
}
