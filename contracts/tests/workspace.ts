import { LiteSVM, FailedTransactionMetadata } from "litesvm";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import {
  AccountRole,
  address,
  generateKeyPairSigner,
  getAddressCodec,
  getProgramDerivedAddress,
  lamports,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import type { Address } from "@solana/kit";
import fs from "fs";
import path from "path";

const idl = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "target/idl/workspace.json"), "utf8")
);
const coder = new anchor.BorshCoder(idl);
const programAddress = address(idl.address);
const programSoPath = path.resolve(process.cwd(), "target/deploy/workspace.so");
const BPF_UPGRADEABLE = address("BPFLoaderUpgradeab1e11111111111111111111111");
const SYSTEM_PROGRAM = address("11111111111111111111111111111111");
const SOL = 1_000_000_000;
const addressCodec = getAddressCodec();

type Signer = Awaited<ReturnType<typeof generateKeyPairSigner>>;
type Instruction = Parameters<typeof appendTransactionMessageInstruction>[0];
type AccountEntry = { address: Address; role: AccountRole; signer?: Signer };
type RawAccount = { data?: Uint8Array; exists?: boolean };
type DecodedEvent = { name: string; data: Record<string, Record<string, object>> };

/** Champs du compte Config lus par les tests (décodés depuis l'IDL). */
interface DecodedConfig {
  authority: unknown;
  guardian: unknown;
  pending_authority: unknown;
  paused: boolean;
  max_wallets_per_agent: number;
  total_wallets: number;
  shared_wallets: number;
  wallets_per_agent: number[];
  global_spend_cap_lamports: { toString(): string };
  global_spent_lamports: { toString(): string };
  global_override: boolean;
  agent_override_mask: number;
}

/** Champs du compte AgentWallet lus par les tests. */
interface DecodedAgentWallet {
  agent_id: number;
  is_shared: boolean;
  assigned_agents_mask: number;
  wallet_pubkey: unknown;
  mode: Record<string, unknown>;
  spent_lamports: { toString(): string };
}

describe("nexus_access", () => {
  let svm: LiteSVM;
  let authority: Signer;
  let guardian: Signer;
  let stranger: Signer;
  let configPDA: Address;
  let programDataPDA: Address;

  function setRawAccount(addr: Address, data: Uint8Array, owner: Address, executable: boolean) {
    const acct = {
      address: addr,
      data,
      executable,
      lamports: lamports(10n * 1_000_000_000n),
      programAddress: owner,
      owner,
      space: BigInt(data.length),
      rentEpoch: 0n,
    };
    const fn = (svm as unknown as { setAccount: (...args: unknown[]) => void }).setAccount;
    if (fn.length >= 2) fn.call(svm, addr, acct);
    else fn.call(svm, acct);
  }

  async function sendIx(ix: Instruction, feePayerSigner: Signer) {
    const msg = appendTransactionMessageInstruction(
      ix,
      setTransactionMessageFeePayerSigner(feePayerSigner, createTransactionMessage({ version: 0 }))
    );
    const msgWithLifetime = svm.setTransactionMessageLifetimeUsingLatestBlockhash(msg);
    const tx = await signTransactionMessageWithSigners(msgWithLifetime, { abortSignal: undefined });
    const res = svm.sendTransaction(tx);
    if (res instanceof FailedTransactionMetadata) {
      throw new Error(res.meta().prettyLogs());
    }
    (svm as unknown as { expireBlockhash?: () => void }).expireBlockhash?.();
    return res;
  }

  async function expectFailure(ix: Instruction, feePayerSigner: Signer, includes: string) {
    const msg = appendTransactionMessageInstruction(
      ix,
      setTransactionMessageFeePayerSigner(feePayerSigner, createTransactionMessage({ version: 0 }))
    );
    const msgWithLifetime = svm.setTransactionMessageLifetimeUsingLatestBlockhash(msg);
    const tx = await signTransactionMessageWithSigners(msgWithLifetime, { abortSignal: undefined });
    const res = svm.simulateTransaction(tx);
    expect(res).to.be.instanceOf(FailedTransactionMetadata);
    const logText = (res as FailedTransactionMetadata).meta().logs().join("\n");
    expect(logText).to.include(includes);
  }

  function fetchAccount<T>(name: string, addr: Address): T {
    const acc = svm.getAccount(addr) as unknown as RawAccount | null;
    if (!acc || acc.exists === false) {
      throw new Error(`Missing account ${name} at ${addr}`);
    }
    return coder.accounts.decode(name, Buffer.from(acc.data ?? new Uint8Array())) as T;
  }

  function accountExists(addr: Address): boolean {
    const acc = svm.getAccount(addr) as unknown as RawAccount | null;
    if (!acc) return false;
    if (acc.exists === false) return false;
    return Boolean(acc.data && acc.data.length > 0);
  }

  function toAddressString(value: unknown): string {
    if (typeof value === "string") return value;
    if (value instanceof Uint8Array) return addressCodec.decode(value);
    if (value && typeof value === "object" && "toBase58" in value) {
      const candidate = value as { toBase58?: unknown };
      if (typeof candidate.toBase58 === "function") {
        return (candidate.toBase58 as () => string).call(value);
      }
    }
    throw new Error("Unable to decode address");
  }

  function decodeEvents(res: { logs(): string[] }): DecodedEvent[] {
    const out: DecodedEvent[] = [];
    for (const line of res.logs() as string[]) {
      if (line.startsWith("Program data: ")) {
        const ev = coder.events.decode(line.slice("Program data: ".length)) as DecodedEvent | null;
        if (ev) out.push(ev);
      }
    }
    return out;
  }

  const ro = (a: Address) => ({ address: a, role: AccountRole.READONLY });
  const w = (a: Address) => ({ address: a, role: AccountRole.WRITABLE });
  const s = (signer: Signer) => ({ address: signer.address, role: AccountRole.READONLY_SIGNER, signer });
  const ws = (signer: Signer) => ({ address: signer.address, role: AccountRole.WRITABLE_SIGNER, signer });

  function ix(name: string, args: Record<string, unknown>, accounts: AccountEntry[]): Instruction {
    return {
      programAddress,
      accounts,
      data: coder.instruction.encode(name, args),
    } as Instruction;
  }

  async function agentWalletPDA(agentId: number, idx: number) {
    const [pda] = await getProgramDerivedAddress({
      programAddress,
      seeds: [new TextEncoder().encode("agent_wallet"), Uint8Array.from([agentId]), Uint8Array.from([idx])],
    });
    return pda;
  }
  async function sharedWalletPDA(idx: number) {
    const [pda] = await getProgramDerivedAddress({
      programAddress,
      seeds: [new TextEncoder().encode("shared_wallet"), Uint8Array.from([idx])],
    });
    return pda;
  }
  async function lookupPDA(walletPubkey: Address) {
    const [pda] = await getProgramDerivedAddress({
      programAddress,
      seeds: [new TextEncoder().encode("wallet_lookup"), addressCodec.encode(walletPubkey)],
    });
    return pda;
  }

  const adminIx = (name: string, args: Record<string, unknown>, signer: Signer = authority) =>
    ix(name, args, [w(configPDA), s(signer)]);
  const guardIx = (name: string, args: Record<string, unknown>, signer: Signer) =>
    ix(name, args, [w(configPDA), s(signer)]);
  const walletIx = (name: string, args: Record<string, unknown>, wallet: Address, signer: Signer = authority) =>
    ix(name, args, [w(configPDA), w(wallet), s(signer)]);

  async function registerIndividual(agentId: number, idx: number, walletPk: Address, cap: number, signer: Signer = authority) {
    const aw = await agentWalletPDA(agentId, idx);
    const lk = await lookupPDA(walletPk);
    return {
      aw,
      lk,
      ix: ix(
        "register_agent_wallet",
        {
          agent_id: agentId,
          wallet_index: idx,
          wallet_pubkey: new PublicKey(walletPk),
          spend_cap_lamports: new BN(cap),
        },
        [w(configPDA), w(aw), w(lk), ws(signer), ro(SYSTEM_PROGRAM)]
      ),
    };
  }

  async function registerShared(idx: number, walletPk: Address, mask: number, cap: number) {
    const aw = await sharedWalletPDA(idx);
    const lk = await lookupPDA(walletPk);
    return {
      aw,
      lk,
      ix: ix(
        "register_shared_wallet",
        {
          wallet_index: idx,
          wallet_pubkey: new PublicKey(walletPk),
          assigned_agents_mask: mask,
          spend_cap_lamports: new BN(cap),
        },
        [w(configPDA), w(aw), w(lk), ws(authority), ro(SYSTEM_PROGRAM)]
      ),
    };
  }

  const initIx = (signer: Signer, guardianAddr: Address) =>
    ix("initialize_config", { guardian: new PublicKey(guardianAddr) }, [
      w(configPDA),
      ws(signer),
      ro(programAddress),
      ro(programDataPDA),
      ro(SYSTEM_PROGRAM),
    ]);

  let wallet0: Address; // agent 0, idx 0
  let shared0: Address;

  before(async () => {
    svm = new LiteSVM()
      .withSysvars()
      .withBuiltins()
      .withTransactionHistory(0n)
      .withLogBytesLimit(256n * 1024n);

    authority = await generateKeyPairSigner();
    guardian = await generateKeyPairSigner();
    stranger = await generateKeyPairSigner();
    svm.airdrop(authority.address, lamports(100n * 1_000_000_000n));
    svm.airdrop(guardian.address, lamports(10n * 1_000_000_000n));
    svm.airdrop(stranger.address, lamports(10n * 1_000_000_000n));

    [programDataPDA] = await getProgramDerivedAddress({
      programAddress: BPF_UPGRADEABLE,
      seeds: [addressCodec.encode(programAddress)],
    });

    const elf = fs.readFileSync(programSoPath);
    const pd = Buffer.alloc(45 + elf.length);
    pd.writeUInt32LE(3, 0);
    pd.writeBigUInt64LE(0n, 4);
    pd[12] = 1;
    Buffer.from(addressCodec.encode(authority.address)).copy(pd, 13);
    elf.copy(pd, 45);
    setRawAccount(programDataPDA, new Uint8Array(pd), BPF_UPGRADEABLE, false);

    const prog = Buffer.alloc(36);
    prog.writeUInt32LE(2, 0);
    Buffer.from(addressCodec.encode(programDataPDA)).copy(prog, 4);
    setRawAccount(programAddress, new Uint8Array(prog), BPF_UPGRADEABLE, true);

    [configPDA] = await getProgramDerivedAddress({
      programAddress,
      seeds: [new TextEncoder().encode("config"), addressCodec.encode(authority.address)],
    });
  });

  it("rejects initialize_config from a non-upgrade-authority", async () => {
    const [strangerConfig] = await getProgramDerivedAddress({
      programAddress,
      seeds: [new TextEncoder().encode("config"), addressCodec.encode(stranger.address)],
    });
    const bad = ix("initialize_config", { guardian: new PublicKey(guardian.address) }, [
      w(strangerConfig),
      ws(stranger),
      ro(programAddress),
      ro(programDataPDA),
      ro(SYSTEM_PROGRAM),
    ]);
    await expectFailure(bad, stranger, "Unauthorized");
  });

  it("initializes config with defaults", async () => {
    await sendIx(initIx(authority, guardian.address), authority);
    const c = fetchAccount<DecodedConfig>("Config", configPDA);
    expect(toAddressString(c.authority)).to.equal(authority.address);
    expect(toAddressString(c.guardian)).to.equal(guardian.address);
    expect(c.pending_authority).to.equal(null);
    expect(c.paused).to.equal(false);
    expect(c.max_wallets_per_agent).to.equal(5);
    expect(c.total_wallets).to.equal(0);
    expect(c.global_spend_cap_lamports.toString()).to.equal("2000000000");
    expect(c.global_override).to.equal(false);
  });

  it("cannot initialize twice", async () => {
    await expectFailure(initIx(authority, guardian.address), authority, "already in use");
  });

  it("accept_authority fails without pending authority", async () => {
    await expectFailure(ix("accept_authority", {}, [w(configPDA), s(stranger)]), stranger, "NoPendingAuthority");
  });

  it("set_guardian is authority only", async () => {
    await expectFailure(adminIx("set_guardian", { new_guardian: new PublicKey(stranger.address) }, stranger), stranger, "Unauthorized");
    await sendIx(adminIx("set_guardian", { new_guardian: new PublicKey(guardian.address) }), authority);
  });

  it("validates per-agent limit values", async () => {
    await expectFailure(adminIx("set_max_wallets_per_agent", { n: 3 }), authority, "InvalidPerAgentLimit");
    await sendIx(adminIx("set_max_wallets_per_agent", { n: 10 }), authority);
    const c = fetchAccount<DecodedConfig>("Config", configPDA);
    expect(c.max_wallets_per_agent).to.equal(10);
    await sendIx(adminIx("set_max_wallets_per_agent", { n: 5 }), authority);
  });

  it("registers an individual agent wallet", async () => {
    const pk = (await generateKeyPairSigner()).address;
    const r = await registerIndividual(0, 0, pk, 1 * SOL);
    const res = await sendIx(r.ix, authority);
    wallet0 = r.aw;
    const aw = fetchAccount<DecodedAgentWallet>("AgentWallet", r.aw);
    expect(aw.agent_id).to.equal(0);
    expect(aw.is_shared).to.equal(false);
    expect(Object.keys(aw.mode)[0].toLowerCase()).to.equal("humanvalidation");
    expect(toAddressString(aw.wallet_pubkey)).to.equal(pk);
    const lk = fetchAccount<{ agent_wallet: unknown }>("WalletLookup", r.lk);
    expect(toAddressString(lk.agent_wallet)).to.equal(r.aw);
    const c = fetchAccount<DecodedConfig>("Config", configPDA);
    expect(c.total_wallets).to.equal(1);
    expect(c.wallets_per_agent[0]).to.equal(1);
    const evs = decodeEvents(res);
    expect(evs.some((e) => e.name === "AgentWalletRegistered")).to.equal(true);
  });

  it("rejects duplicate wallet pubkey via lookup", async () => {
    const aw = fetchAccount<DecodedAgentWallet>("AgentWallet", wallet0);
    const pk = toAddressString(aw.wallet_pubkey) as Address;
    const r = await registerIndividual(0, 1, pk, 1 * SOL);
    await expectFailure(r.ix, authority, "already in use");
  });

  it("rejects invalid agent id, wallet index, and cap above global", async () => {
    const r1 = await registerIndividual(7, 0, (await generateKeyPairSigner()).address, SOL);
    await expectFailure(r1.ix, authority, "InvalidAgentId");
    const r2 = await registerIndividual(1, 10, (await generateKeyPairSigner()).address, SOL);
    await expectFailure(r2.ix, authority, "InvalidWalletIndex");
    const r3 = await registerIndividual(1, 0, (await generateKeyPairSigner()).address, 3 * SOL);
    await expectFailure(r3.ix, authority, "SpendCapExceedsGlobal");
  });

  it("rejects registration by non-authority", async () => {
    const r = await registerIndividual(2, 0, (await generateKeyPairSigner()).address, SOL, stranger);
    await expectFailure(r.ix, stranger, "Unauthorized");
  });

  it("enforces per-agent wallet limit", async () => {
    await sendIx(adminIx("set_max_wallets_per_agent", { n: 1 }), authority);
    await sendIx((await registerIndividual(3, 0, (await generateKeyPairSigner()).address, SOL)).ix, authority);
    const r = await registerIndividual(3, 1, (await generateKeyPairSigner()).address, SOL);
    await expectFailure(r.ix, authority, "AgentWalletLimit");
    await sendIx(adminIx("set_max_wallets_per_agent", { n: 5 }), authority);
  });

  it("registers a shared wallet and validates mask/index", async () => {
    const bad1 = await registerShared(0, (await generateKeyPairSigner()).address, 0x80, SOL);
    await expectFailure(bad1.ix, authority, "InvalidAgentMask");
    const bad2 = await registerShared(3, (await generateKeyPairSigner()).address, 1, SOL);
    await expectFailure(bad2.ix, authority, "InvalidWalletIndex");
    const r = await registerShared(0, (await generateKeyPairSigner()).address, 0b011, SOL);
    await sendIx(r.ix, authority);
    shared0 = r.aw;
    const aw = fetchAccount<DecodedAgentWallet>("AgentWallet", r.aw);
    expect(aw.agent_id).to.equal(255);
    expect(aw.is_shared).to.equal(true);
    expect(aw.assigned_agents_mask).to.equal(3);
    const c = fetchAccount<DecodedConfig>("Config", configPDA);
    expect(c.shared_wallets).to.equal(1);
  });

  it("assign_shared_wallet validates target and mask", async () => {
    await expectFailure(walletIx("assign_shared_wallet", { agents_mask: 1 }, wallet0), authority, "NotSharedWallet");
    await expectFailure(walletIx("assign_shared_wallet", { agents_mask: 0xff }, shared0), authority, "InvalidAgentMask");
    await sendIx(walletIx("assign_shared_wallet", { agents_mask: 0b100 }, shared0), authority);
    const aw = fetchAccount<DecodedAgentWallet>("AgentWallet", shared0);
    expect(aw.assigned_agents_mask).to.equal(4);
  });

  it("sets wallet mode and spend cap", async () => {
    await sendIx(walletIx("set_wallet_mode", { mode: { AgentAuthorized: {} } }, wallet0), authority);
    await expectFailure(walletIx("set_wallet_spend_cap", { new_cap_lamports: new BN(3 * SOL) }, wallet0), authority, "SpendCapExceedsGlobal");
    await sendIx(walletIx("set_wallet_spend_cap", { new_cap_lamports: new BN(SOL) }, wallet0), authority);
    const aw = fetchAccount<DecodedAgentWallet>("AgentWallet", wallet0);
    expect(Object.keys(aw.mode)[0].toLowerCase()).to.equal("agentauthorized");
  });

  it("override makes effective mode HumanValidation and release restores it", async () => {
    const view = ix("get_effective_mode", {}, [ro(configPDA), ro(wallet0)]);
    let evs = decodeEvents(await sendIx(view, authority));
    expect(Object.keys(evs[0].data.effective_mode)[0].toLowerCase()).to.equal("agentauthorized");

    await sendIx(guardIx("take_back_control_for_agent", { agent_id: 0 }, guardian), guardian);
    evs = decodeEvents(await sendIx(ix("get_effective_mode", {}, [ro(configPDA), ro(wallet0)]), stranger));
    expect(Object.keys(evs[0].data.effective_mode)[0].toLowerCase()).to.equal("humanvalidation");
    const aw = fetchAccount<DecodedAgentWallet>("AgentWallet", wallet0);
    expect(Object.keys(aw.mode)[0].toLowerCase()).to.equal("agentauthorized");

    await expectFailure(adminIx("release_control_for_agent", { agent_id: 0 }, guardian), guardian, "Unauthorized");
    await sendIx(adminIx("release_control_for_agent", { agent_id: 0 }), authority);
    const c = fetchAccount<DecodedConfig>("Config", configPDA);
    expect(c.agent_override_mask).to.equal(0);
  });

  it("global take_back_control and release", async () => {
    await expectFailure(guardIx("take_back_control", {}, stranger), stranger, "Unauthorized");
    await sendIx(guardIx("take_back_control", {}, guardian), guardian);
    expect(fetchAccount<DecodedConfig>("Config", configPDA).global_override).to.equal(true);
    await sendIx(adminIx("release_control", {}), authority);
    expect(fetchAccount<DecodedConfig>("Config", configPDA).global_override).to.equal(false);
    await expectFailure(guardIx("take_back_control_for_agent", { agent_id: 7 }, guardian), guardian, "InvalidAgentId");
  });

  it("records spend and enforces wallet cap", async () => {
    const res = await sendIx(walletIx("record_spend", { amount_lamports: new BN(SOL / 2) }, wallet0), authority);
    const aw = fetchAccount<DecodedAgentWallet>("AgentWallet", wallet0);
    expect(aw.spent_lamports.toString()).to.equal(String(SOL / 2));
    const c = fetchAccount<DecodedConfig>("Config", configPDA);
    expect(c.global_spent_lamports.toString()).to.equal(String(SOL / 2));
    expect(decodeEvents(res).some((e) => e.name === "SpendRecorded")).to.equal(true);
    await expectFailure(walletIx("record_spend", { amount_lamports: new BN(SOL) }, wallet0), authority, "WalletSpendCapExceeded");
    await expectFailure(walletIx("record_spend", { amount_lamports: new BN(1) }, wallet0, stranger), stranger, "Unauthorized");
  });

  it("enforces global spend cap", async () => {
    await sendIx(adminIx("set_global_spend_cap", { new_cap_lamports: new BN(0.6 * SOL) }), authority);
    await expectFailure(walletIx("record_spend", { amount_lamports: new BN(0.2 * SOL) }, shared0), authority, "GlobalSpendCapExceeded");
    await sendIx(adminIx("set_global_spend_cap", { new_cap_lamports: new BN(2 * SOL) }), authority);
  });

  it("resets wallet and global spent", async () => {
    await sendIx(walletIx("record_spend", { amount_lamports: new BN(0.1 * SOL) }, shared0), authority);
    await sendIx(walletIx("reset_wallet_spent", {}, wallet0), authority);
    expect(fetchAccount<DecodedAgentWallet>("AgentWallet", wallet0).spent_lamports.toString()).to.equal("0");
    expect(fetchAccount<DecodedConfig>("Config", configPDA).global_spent_lamports.toString()).to.equal(String(0.1 * SOL));
    await sendIx(adminIx("reset_global_spent", {}), authority);
    expect(fetchAccount<DecodedConfig>("Config", configPDA).global_spent_lamports.toString()).to.equal("0");
    expect(fetchAccount<DecodedAgentWallet>("AgentWallet", shared0).spent_lamports.toString()).to.equal(String(0.1 * SOL));
  });

  it("pause blocks registration and spend; revoke still works", async () => {
    await expectFailure(guardIx("pause", {}, stranger), stranger, "Unauthorized");
    await sendIx(guardIx("pause", {}, guardian), guardian);
    const r = await registerIndividual(4, 0, (await generateKeyPairSigner()).address, SOL);
    await expectFailure(r.ix, authority, "Paused");
    await expectFailure(walletIx("record_spend", { amount_lamports: new BN(1) }, wallet0), authority, "Paused");

    const before = fetchAccount<DecodedConfig>("Config", configPDA);
    const aw = fetchAccount<DecodedAgentWallet>("AgentWallet", shared0);
    const lk = await lookupPDA(toAddressString(aw.wallet_pubkey) as Address);
    await sendIx(ix("revoke_agent_wallet", {}, [w(configPDA), w(shared0), w(lk), ws(authority)]), authority);
    expect(accountExists(shared0)).to.equal(false);
    expect(accountExists(lk)).to.equal(false);
    const after = fetchAccount<DecodedConfig>("Config", configPDA);
    expect(after.total_wallets).to.equal(before.total_wallets - 1);
    expect(after.shared_wallets).to.equal(before.shared_wallets - 1);

    await expectFailure(adminIx("unpause", {}, guardian), guardian, "Unauthorized");
    await sendIx(adminIx("unpause", {}), authority);
    expect(fetchAccount<DecodedConfig>("Config", configPDA).paused).to.equal(false);
  });

  it("revokes an individual wallet and decrements per-agent count", async () => {
    const aw = fetchAccount<DecodedAgentWallet>("AgentWallet", wallet0);
    const lk = await lookupPDA(toAddressString(aw.wallet_pubkey) as Address);
    await sendIx(ix("revoke_agent_wallet", {}, [w(configPDA), w(wallet0), w(lk), ws(authority)]), authority);
    const c = fetchAccount<DecodedConfig>("Config", configPDA);
    expect(c.wallets_per_agent[0]).to.equal(0);
    expect(accountExists(wallet0)).to.equal(false);
  });

  it("two-step authority transfer", async () => {
    const newAuth = await generateKeyPairSigner();
    svm.airdrop(newAuth.address, lamports(1_000_000_000n));
    await sendIx(adminIx("propose_authority", { new_authority: new PublicKey(newAuth.address) }), authority);
    await expectFailure(ix("accept_authority", {}, [w(configPDA), s(stranger)]), stranger, "Unauthorized");
    await sendIx(ix("accept_authority", {}, [w(configPDA), s(newAuth)]), newAuth);
    const c = fetchAccount<DecodedConfig>("Config", configPDA);
    expect(toAddressString(c.authority)).to.equal(newAuth.address);
    expect(c.pending_authority).to.equal(null);
    await expectFailure(adminIx("reset_global_spent", {}, authority), authority, "Unauthorized");
    await sendIx(adminIx("reset_global_spent", {}, newAuth), newAuth);
  });
});
