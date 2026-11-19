import { utils } from "@coral-xyz/anchor";

/** Base58-encodes bytes (signatures, keys) for display and storage. */
export default function bs58Encode(bytes: Uint8Array) {
  return utils.bytes.bs58.encode(bytes);
}
