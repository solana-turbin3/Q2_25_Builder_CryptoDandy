#![allow(unexpected_cfgs)]
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::*;
pub use state::*;

declare_id!("59v6RA6T6fAbwuV15i9MYL5iSzonaSQ4NqFFEBhn1qXD");

#[program]
pub mod amm {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        seed: u64,
        fee: u16,
        authority: Option<Pubkey>
    ) -> Result<()> {
        ctx.accounts.init(seed, fee, authority, ctx.bumps)?;
        Ok(())
    }


    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
        max_x: u64,
        max_y: u64,

    ) -> Result<()> {
        ctx.accounts.deposit(amount, max_x, max_y)?;
        Ok(())
    }
}