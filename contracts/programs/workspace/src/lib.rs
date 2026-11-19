use anchor_lang::prelude::*;
use anchor_lang::solana_program::bpf_loader_upgradeable;

declare_id!("94kcYQ2jdaGWGTwd6tYwnTQspA1Nn7K7NbPFb36hBcbo");

pub const MAX_AGENTS: u8 = 7;
pub const MAX_TOTAL_WALLETS: u8 = 20;
pub const MAX_SHARED_WALLETS: u8 = 3;
pub const MAX_WALLET_INDEX: u8 = 10;
pub const DEFAULT_PER_AGENT: u8 = 5;
pub const SHARED_AGENT_ID: u8 = 255;
pub const DEFAULT_GLOBAL_SPEND_CAP_LAMPORTS: u64 = 2_000_000_000;
pub const AGENT_MASK_VALID: u8 = 0b0111_1111;

/// Effective mode resolution:
/// HumanValidation if config.global_override is set, or (individual wallet) the agent's bit
/// is set in agent_override_mask, or (shared wallet) any assigned agent's bit is set.
/// Otherwise the wallet's stored mode. Stored modes are never overwritten by overrides,
/// so releasing control restores each wallet's own setting.
pub fn effective_mode(config: &Config, wallet: &AgentWallet) -> WalletMode {
    if config.global_override {
        return WalletMode::HumanValidation;
    }
    let overridden = if wallet.is_shared {
        config.agent_override_mask & wallet.assigned_agents_mask != 0
    } else {
        wallet.agent_id < MAX_AGENTS && config.agent_override_mask & (1u8 << wallet.agent_id) != 0
    };
    if overridden {
        WalletMode::HumanValidation
    } else {
        wallet.mode
    }
}

#[program]
pub mod workspace {
    use super::*;

    // guardian: Pubkey, Guardian address allowed to pause and take back control, 8sWbm...EXFQ
    pub fn initialize_config(ctx: Context<InitializeConfig>, guardian: Pubkey) -> Result<()> {
        let authority_key = ctx.accounts.authority.key();
        let config = &mut ctx.accounts.config;
        config.authority = authority_key;
        config.seed_authority = authority_key;
        config.pending_authority = None;
        config.guardian = guardian;
        config.paused = false;
        config.bump = ctx.bumps.config;
        config.version = 1;
        config.max_wallets_per_agent = DEFAULT_PER_AGENT;
        config.total_wallets = 0;
        config.shared_wallets = 0;
        config.wallets_per_agent = [0u8; 7];
        config.global_override = false;
        config.agent_override_mask = 0;
        config.global_spend_cap_lamports = DEFAULT_GLOBAL_SPEND_CAP_LAMPORTS;
        config.global_spent_lamports = 0;
        config.reserved = [0u8; 64];
        emit!(ConfigInitialized { authority: authority_key, guardian });
        Ok(())
    }

    pub fn propose_authority(ctx: Context<AdminConfig>, new_authority: Pubkey) -> Result<()> {
        ctx.accounts.config.pending_authority = Some(new_authority);
        emit!(AuthorityProposed { current: ctx.accounts.authority.key(), proposed: new_authority });
        Ok(())
    }

    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        let signer_key = ctx.accounts.new_authority.key();
        let config = &mut ctx.accounts.config;
        let pending = config.pending_authority.ok_or(ErrorCode::NoPendingAuthority)?;
        require_keys_eq!(pending, signer_key, ErrorCode::Unauthorized);
        let previous = config.authority;
        config.authority = signer_key;
        config.pending_authority = None;
        emit!(AuthorityAccepted { previous, new_authority: signer_key });
        Ok(())
    }

    pub fn set_guardian(ctx: Context<AdminConfig>, new_guardian: Pubkey) -> Result<()> {
        ctx.accounts.config.guardian = new_guardian;
        emit!(GuardianUpdated { guardian: new_guardian });
        Ok(())
    }

    pub fn pause(ctx: Context<AuthorityOrGuardian>) -> Result<()> {
        ctx.accounts.config.paused = true;
        emit!(Paused { by: ctx.accounts.signer.key() });
        Ok(())
    }

    pub fn unpause(ctx: Context<AdminConfig>) -> Result<()> {
        ctx.accounts.config.paused = false;
        emit!(Unpaused { by: ctx.accounts.authority.key() });
        Ok(())
    }

    pub fn set_max_wallets_per_agent(ctx: Context<AdminConfig>, n: u8) -> Result<()> {
        require!(matches!(n, 1 | 2 | 5 | 10), ErrorCode::InvalidPerAgentLimit);
        ctx.accounts.config.max_wallets_per_agent = n;
        emit!(PerAgentLimitUpdated { max_wallets_per_agent: n });
        Ok(())
    }

    pub fn set_global_spend_cap(ctx: Context<AdminConfig>, new_cap_lamports: u64) -> Result<()> {
        ctx.accounts.config.global_spend_cap_lamports = new_cap_lamports;
        emit!(GlobalSpendCapUpdated { global_spend_cap_lamports: new_cap_lamports });
        Ok(())
    }

    pub fn register_agent_wallet(
        ctx: Context<RegisterAgentWallet>,
        agent_id: u8,
        wallet_index: u8,
        wallet_pubkey: Pubkey,
        spend_cap_lamports: u64,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(!config.paused, ErrorCode::Paused);
        require!(agent_id < MAX_AGENTS, ErrorCode::InvalidAgentId);
        require!(wallet_index < MAX_WALLET_INDEX, ErrorCode::InvalidWalletIndex);
        require!(config.total_wallets < MAX_TOTAL_WALLETS, ErrorCode::TotalWalletLimit);
        require!(
            config.wallets_per_agent[agent_id as usize] < config.max_wallets_per_agent,
            ErrorCode::AgentWalletLimit
        );
        require!(
            spend_cap_lamports <= config.global_spend_cap_lamports,
            ErrorCode::SpendCapExceedsGlobal
        );

        let wallet_key = ctx.accounts.agent_wallet.key();
        let wallet = &mut ctx.accounts.agent_wallet;
        wallet.agent_id = agent_id;
        wallet.wallet_index = wallet_index;
        wallet.wallet_pubkey = wallet_pubkey;
        wallet.is_shared = false;
        wallet.assigned_agents_mask = 0;
        wallet.mode = WalletMode::HumanValidation;
        wallet.spend_cap_lamports = spend_cap_lamports;
        wallet.spent_lamports = 0;
        wallet.bump = ctx.bumps.agent_wallet;
        wallet.reserved = [0u8; 32];

        let lookup = &mut ctx.accounts.wallet_lookup;
        lookup.wallet_pubkey = wallet_pubkey;
        lookup.agent_wallet = wallet_key;
        lookup.bump = ctx.bumps.wallet_lookup;

        let config = &mut ctx.accounts.config;
        config.total_wallets = config.total_wallets.checked_add(1).ok_or(ErrorCode::Overflow)?;
        let slot = &mut config.wallets_per_agent[agent_id as usize];
        *slot = slot.checked_add(1).ok_or(ErrorCode::Overflow)?;

        emit!(AgentWalletRegistered { agent_id, wallet_index, wallet_pubkey, is_shared: false });
        Ok(())
    }

    pub fn register_shared_wallet(
        ctx: Context<RegisterSharedWallet>,
        wallet_index: u8,
        wallet_pubkey: Pubkey,
        assigned_agents_mask: u8,
        spend_cap_lamports: u64,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(!config.paused, ErrorCode::Paused);
        require!(wallet_index < MAX_SHARED_WALLETS, ErrorCode::InvalidWalletIndex);
        require!(config.shared_wallets < MAX_SHARED_WALLETS, ErrorCode::SharedWalletLimit);
        require!(config.total_wallets < MAX_TOTAL_WALLETS, ErrorCode::TotalWalletLimit);
        require!(assigned_agents_mask & !AGENT_MASK_VALID == 0, ErrorCode::InvalidAgentMask);
        require!(
            spend_cap_lamports <= config.global_spend_cap_lamports,
            ErrorCode::SpendCapExceedsGlobal
        );

        let wallet_key = ctx.accounts.agent_wallet.key();
        let wallet = &mut ctx.accounts.agent_wallet;
        wallet.agent_id = SHARED_AGENT_ID;
        wallet.wallet_index = wallet_index;
        wallet.wallet_pubkey = wallet_pubkey;
        wallet.is_shared = true;
        wallet.assigned_agents_mask = assigned_agents_mask;
        wallet.mode = WalletMode::HumanValidation;
        wallet.spend_cap_lamports = spend_cap_lamports;
        wallet.spent_lamports = 0;
        wallet.bump = ctx.bumps.agent_wallet;
        wallet.reserved = [0u8; 32];

        let lookup = &mut ctx.accounts.wallet_lookup;
        lookup.wallet_pubkey = wallet_pubkey;
        lookup.agent_wallet = wallet_key;
        lookup.bump = ctx.bumps.wallet_lookup;

        let config = &mut ctx.accounts.config;
        config.total_wallets = config.total_wallets.checked_add(1).ok_or(ErrorCode::Overflow)?;
        config.shared_wallets = config.shared_wallets.checked_add(1).ok_or(ErrorCode::Overflow)?;

        emit!(AgentWalletRegistered {
            agent_id: SHARED_AGENT_ID,
            wallet_index,
            wallet_pubkey,
            is_shared: true
        });
        Ok(())
    }

    pub fn assign_shared_wallet(ctx: Context<WalletAdmin>, agents_mask: u8) -> Result<()> {
        require!(ctx.accounts.agent_wallet.is_shared, ErrorCode::NotSharedWallet);
        require!(agents_mask & !AGENT_MASK_VALID == 0, ErrorCode::InvalidAgentMask);
        let wallet_key = ctx.accounts.agent_wallet.key();
        ctx.accounts.agent_wallet.assigned_agents_mask = agents_mask;
        emit!(SharedWalletAssigned { wallet: wallet_key, agents_mask });
        Ok(())
    }

    pub fn revoke_agent_wallet(ctx: Context<RevokeAgentWallet>) -> Result<()> {
        let wallet_key = ctx.accounts.agent_wallet.key();
        let agent_id = ctx.accounts.agent_wallet.agent_id;
        let wallet_index = ctx.accounts.agent_wallet.wallet_index;
        let wallet_pubkey = ctx.accounts.agent_wallet.wallet_pubkey;
        let is_shared = ctx.accounts.agent_wallet.is_shared;

        let config = &mut ctx.accounts.config;
        config.total_wallets = config.total_wallets.saturating_sub(1);
        if is_shared {
            config.shared_wallets = config.shared_wallets.saturating_sub(1);
        } else if agent_id < MAX_AGENTS {
            let slot = &mut config.wallets_per_agent[agent_id as usize];
            *slot = slot.saturating_sub(1);
        }

        emit!(AgentWalletRevoked { wallet: wallet_key, agent_id, wallet_index, wallet_pubkey, is_shared });
        Ok(())
    }

    pub fn set_wallet_mode(ctx: Context<WalletAdmin>, mode: WalletMode) -> Result<()> {
        let wallet_key = ctx.accounts.agent_wallet.key();
        ctx.accounts.agent_wallet.mode = mode;
        emit!(WalletModeUpdated { wallet: wallet_key, mode });
        Ok(())
    }

    pub fn set_wallet_spend_cap(ctx: Context<WalletAdmin>, new_cap_lamports: u64) -> Result<()> {
        require!(
            new_cap_lamports <= ctx.accounts.config.global_spend_cap_lamports,
            ErrorCode::SpendCapExceedsGlobal
        );
        let wallet_key = ctx.accounts.agent_wallet.key();
        ctx.accounts.agent_wallet.spend_cap_lamports = new_cap_lamports;
        emit!(WalletSpendCapUpdated { wallet: wallet_key, spend_cap_lamports: new_cap_lamports });
        Ok(())
    }

    pub fn record_spend(ctx: Context<WalletAdmin>, amount_lamports: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        let wallet = &ctx.accounts.agent_wallet;
        require!(!config.paused, ErrorCode::Paused);
        let mode = effective_mode(config, wallet);
        let new_wallet_spent = wallet
            .spent_lamports
            .checked_add(amount_lamports)
            .ok_or(ErrorCode::Overflow)?;
        require!(new_wallet_spent <= wallet.spend_cap_lamports, ErrorCode::WalletSpendCapExceeded);
        let new_global_spent = config
            .global_spent_lamports
            .checked_add(amount_lamports)
            .ok_or(ErrorCode::Overflow)?;
        require!(
            new_global_spent <= config.global_spend_cap_lamports,
            ErrorCode::GlobalSpendCapExceeded
        );
        let wallet_key = wallet.key();
        let agent_id = wallet.agent_id;

        ctx.accounts.agent_wallet.spent_lamports = new_wallet_spent;
        ctx.accounts.config.global_spent_lamports = new_global_spent;

        emit!(SpendRecorded {
            agent_id,
            wallet: wallet_key,
            amount_lamports,
            wallet_spent_lamports: new_wallet_spent,
            global_spent_lamports: new_global_spent,
            effective_mode: mode,
        });
        Ok(())
    }

    pub fn reset_wallet_spent(ctx: Context<WalletAdmin>) -> Result<()> {
        let previous = ctx.accounts.agent_wallet.spent_lamports;
        let wallet_key = ctx.accounts.agent_wallet.key();
        ctx.accounts.agent_wallet.spent_lamports = 0;
        let config = &mut ctx.accounts.config;
        config.global_spent_lamports = config.global_spent_lamports.saturating_sub(previous);
        emit!(WalletSpentReset {
            wallet: wallet_key,
            previous_spent_lamports: previous,
            global_spent_lamports: config.global_spent_lamports,
        });
        Ok(())
    }

    pub fn reset_global_spent(ctx: Context<AdminConfig>) -> Result<()> {
        ctx.accounts.config.global_spent_lamports = 0;
        emit!(GlobalSpentReset { by: ctx.accounts.authority.key() });
        Ok(())
    }

    pub fn take_back_control(ctx: Context<AuthorityOrGuardian>) -> Result<()> {
        ctx.accounts.config.global_override = true;
        emit!(ControlTakenBack { by: ctx.accounts.signer.key(), agent_id: None });
        Ok(())
    }

    pub fn take_back_control_for_agent(ctx: Context<AuthorityOrGuardian>, agent_id: u8) -> Result<()> {
        require!(agent_id < MAX_AGENTS, ErrorCode::InvalidAgentId);
        let config = &mut ctx.accounts.config;
        config.agent_override_mask |= 1u8 << agent_id;
        emit!(ControlTakenBack { by: ctx.accounts.signer.key(), agent_id: Some(agent_id) });
        Ok(())
    }

    pub fn release_control(ctx: Context<AdminConfig>) -> Result<()> {
        ctx.accounts.config.global_override = false;
        emit!(ControlReleased { agent_id: None });
        Ok(())
    }

    pub fn release_control_for_agent(ctx: Context<AdminConfig>, agent_id: u8) -> Result<()> {
        require!(agent_id < MAX_AGENTS, ErrorCode::InvalidAgentId);
        let config = &mut ctx.accounts.config;
        config.agent_override_mask &= !(1u8 << agent_id);
        emit!(ControlReleased { agent_id: Some(agent_id) });
        Ok(())
    }

    pub fn get_effective_mode(ctx: Context<WalletView>) -> Result<()> {
        let mode = effective_mode(&ctx.accounts.config, &ctx.accounts.agent_wallet);
        emit!(EffectiveMode {
            wallet: ctx.accounts.agent_wallet.key(),
            agent_id: ctx.accounts.agent_wallet.agent_id,
            stored_mode: ctx.accounts.agent_wallet.mode,
            effective_mode: mode,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        seeds = [b"config", authority.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + Config::LEN
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        constraint = program.programdata_address()? == Some(program_data.key()) @ ErrorCode::Unauthorized
    )]
    pub program: Program<'info, crate::program::Workspace>,

    #[account(
        seeds = [program.key().as_ref()],
        bump,
        seeds::program = bpf_loader_upgradeable::ID,
        constraint = program_data.upgrade_authority_address == Some(authority.key()) @ ErrorCode::Unauthorized
    )]
    pub program_data: Account<'info, ProgramData>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminConfig<'info> {
    #[account(
        mut,
        seeds = [b"config", config.seed_authority.as_ref()],
        bump = config.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    #[account(
        mut,
        seeds = [b"config", config.seed_authority.as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    pub new_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AuthorityOrGuardian<'info> {
    #[account(
        mut,
        seeds = [b"config", config.seed_authority.as_ref()],
        bump = config.bump,
        constraint = signer.key() == config.authority || signer.key() == config.guardian @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    pub signer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(agent_id: u8, wallet_index: u8, wallet_pubkey: Pubkey)]
pub struct RegisterAgentWallet<'info> {
    #[account(
        mut,
        seeds = [b"config", config.seed_authority.as_ref()],
        bump = config.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        seeds = [b"agent_wallet".as_ref(), agent_id.to_le_bytes().as_ref(), wallet_index.to_le_bytes().as_ref()],
        bump,
        payer = authority,
        space = 8 + AgentWallet::LEN
    )]
    pub agent_wallet: Account<'info, AgentWallet>,

    #[account(
        init,
        seeds = [b"wallet_lookup", wallet_pubkey.as_ref()],
        bump,
        payer = authority,
        space = 8 + WalletLookup::LEN
    )]
    pub wallet_lookup: Account<'info, WalletLookup>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(wallet_index: u8, wallet_pubkey: Pubkey)]
pub struct RegisterSharedWallet<'info> {
    #[account(
        mut,
        seeds = [b"config", config.seed_authority.as_ref()],
        bump = config.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        seeds = [b"shared_wallet".as_ref(), wallet_index.to_le_bytes().as_ref()],
        bump,
        payer = authority,
        space = 8 + AgentWallet::LEN
    )]
    pub agent_wallet: Account<'info, AgentWallet>,

    #[account(
        init,
        seeds = [b"wallet_lookup", wallet_pubkey.as_ref()],
        bump,
        payer = authority,
        space = 8 + WalletLookup::LEN
    )]
    pub wallet_lookup: Account<'info, WalletLookup>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WalletAdmin<'info> {
    #[account(
        mut,
        seeds = [b"config", config.seed_authority.as_ref()],
        bump = config.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub agent_wallet: Account<'info, AgentWallet>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeAgentWallet<'info> {
    #[account(
        mut,
        seeds = [b"config", config.seed_authority.as_ref()],
        bump = config.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(mut, close = authority)]
    pub agent_wallet: Account<'info, AgentWallet>,

    #[account(
        mut,
        close = authority,
        seeds = [b"wallet_lookup", agent_wallet.wallet_pubkey.as_ref()],
        bump = wallet_lookup.bump,
        constraint = wallet_lookup.agent_wallet == agent_wallet.key() @ ErrorCode::Unauthorized
    )]
    pub wallet_lookup: Account<'info, WalletLookup>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WalletView<'info> {
    #[account(
        seeds = [b"config", config.seed_authority.as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    pub agent_wallet: Account<'info, AgentWallet>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum WalletMode {
    HumanValidation,
    AgentAsks,
    AgentAuthorized,
}

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub pending_authority: Option<Pubkey>,
    pub guardian: Pubkey,
    pub seed_authority: Pubkey,
    pub paused: bool,
    pub bump: u8,
    pub version: u8,
    pub max_wallets_per_agent: u8,
    pub total_wallets: u8,
    pub shared_wallets: u8,
    pub wallets_per_agent: [u8; 7],
    pub global_override: bool,
    pub agent_override_mask: u8,
    pub global_spend_cap_lamports: u64,
    pub global_spent_lamports: u64,
    pub reserved: [u8; 64],
}

impl Config {
    pub const LEN: usize = 32 + 33 + 32 + 32 + 1 + 1 + 1 + 1 + 1 + 1 + 7 + 1 + 1 + 8 + 8 + 64;
}

#[account]
pub struct AgentWallet {
    pub agent_id: u8,
    pub wallet_index: u8,
    pub wallet_pubkey: Pubkey,
    pub is_shared: bool,
    pub assigned_agents_mask: u8,
    pub mode: WalletMode,
    pub spend_cap_lamports: u64,
    pub spent_lamports: u64,
    pub bump: u8,
    pub reserved: [u8; 32],
}

impl AgentWallet {
    pub const LEN: usize = 1 + 1 + 32 + 1 + 1 + 1 + 8 + 8 + 1 + 32;
}

#[account]
pub struct WalletLookup {
    pub wallet_pubkey: Pubkey,
    pub agent_wallet: Pubkey,
    pub bump: u8,
}

impl WalletLookup {
    pub const LEN: usize = 32 + 32 + 1;
}

#[event]
pub struct ConfigInitialized {
    pub authority: Pubkey,
    pub guardian: Pubkey,
}

#[event]
pub struct AuthorityProposed {
    pub current: Pubkey,
    pub proposed: Pubkey,
}

#[event]
pub struct AuthorityAccepted {
    pub previous: Pubkey,
    pub new_authority: Pubkey,
}

#[event]
pub struct GuardianUpdated {
    pub guardian: Pubkey,
}

#[event]
pub struct Paused {
    pub by: Pubkey,
}

#[event]
pub struct Unpaused {
    pub by: Pubkey,
}

#[event]
pub struct PerAgentLimitUpdated {
    pub max_wallets_per_agent: u8,
}

#[event]
pub struct GlobalSpendCapUpdated {
    pub global_spend_cap_lamports: u64,
}

#[event]
pub struct AgentWalletRegistered {
    pub agent_id: u8,
    pub wallet_index: u8,
    pub wallet_pubkey: Pubkey,
    pub is_shared: bool,
}

#[event]
pub struct SharedWalletAssigned {
    pub wallet: Pubkey,
    pub agents_mask: u8,
}

#[event]
pub struct AgentWalletRevoked {
    pub wallet: Pubkey,
    pub agent_id: u8,
    pub wallet_index: u8,
    pub wallet_pubkey: Pubkey,
    pub is_shared: bool,
}

#[event]
pub struct WalletModeUpdated {
    pub wallet: Pubkey,
    pub mode: WalletMode,
}

#[event]
pub struct WalletSpendCapUpdated {
    pub wallet: Pubkey,
    pub spend_cap_lamports: u64,
}

#[event]
pub struct SpendRecorded {
    pub agent_id: u8,
    pub wallet: Pubkey,
    pub amount_lamports: u64,
    pub wallet_spent_lamports: u64,
    pub global_spent_lamports: u64,
    pub effective_mode: WalletMode,
}

#[event]
pub struct WalletSpentReset {
    pub wallet: Pubkey,
    pub previous_spent_lamports: u64,
    pub global_spent_lamports: u64,
}

#[event]
pub struct GlobalSpentReset {
    pub by: Pubkey,
}

#[event]
pub struct ControlTakenBack {
    pub by: Pubkey,
    pub agent_id: Option<u8>,
}

#[event]
pub struct ControlReleased {
    pub agent_id: Option<u8>,
}

#[event]
pub struct EffectiveMode {
    pub wallet: Pubkey,
    pub agent_id: u8,
    pub stored_mode: WalletMode,
    pub effective_mode: WalletMode,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Program is paused")]
    Paused,
    #[msg("Invalid agent id")]
    InvalidAgentId,
    #[msg("Invalid wallet index")]
    InvalidWalletIndex,
    #[msg("Invalid agent mask")]
    InvalidAgentMask,
    #[msg("Total wallet limit reached")]
    TotalWalletLimit,
    #[msg("Per-agent wallet limit reached")]
    AgentWalletLimit,
    #[msg("Shared wallet limit reached")]
    SharedWalletLimit,
    #[msg("Invalid per-agent limit; allowed values are 1, 2, 5, 10")]
    InvalidPerAgentLimit,
    #[msg("Wallet is not a shared wallet")]
    NotSharedWallet,
    #[msg("No pending authority")]
    NoPendingAuthority,
    #[msg("Spend cap exceeds global spend cap")]
    SpendCapExceedsGlobal,
    #[msg("Wallet spend cap exceeded")]
    WalletSpendCapExceeded,
    #[msg("Global spend cap exceeded")]
    GlobalSpendCapExceeded,
    #[msg("Arithmetic overflow")]
    Overflow,
}
