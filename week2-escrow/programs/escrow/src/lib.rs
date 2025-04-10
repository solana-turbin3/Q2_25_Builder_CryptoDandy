#![allow(unexpected_cfgs)]
mod instructions;
use instructions::*;

mod state;


use anchor_lang::prelude::*;

declare_id!("7TQdfV1WdR1hnx8e6nMCt4oBY2C3r8ia7CS7c1MknfWA");

#[program]
pub mod escrow {
    use super::*;

    pub fn make(ctx: Context<Make>, seed: u64, receive: u64, deposit: u64) -> Result<()> {
        ctx.accounts.init_escrow(seed, receive, ctx.bumps, )?;
        ctx.accounts.deposit(deposit)?;
        Ok(())
    }

    pub fn take(ctx: Context<Take>, deposit: u64) -> Result<()> {
        ctx.accounts.deposit(deposit)?;
        ctx.accounts.withdraw_and_close()?;
        Ok(())
    }
}
