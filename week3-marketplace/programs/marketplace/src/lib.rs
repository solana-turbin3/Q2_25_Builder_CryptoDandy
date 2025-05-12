#![allow(unexpected_cfgs)]

pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

declare_id!("AE2TDK3AQjNJBCGQUUCzZuvWiCTfcRzp99zeo87b9YHf");

pub use instructions::*;
pub use state::*;

#[program]
pub mod marketplace {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, name: String, fee: u16) -> Result<()> {
        ctx.accounts.init(name, fee, ctx.bumps)?;
        Ok(())
    }

    pub fn list(ctx: Context<List>, price: u64) -> Result<()> {
        ctx.accounts.create_listing(price, ctx.bumps)?;
        ctx.accounts.deposit_nft()?;
        Ok(())
    }

    //
    // pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
    //     ctx.accounts.purchase();
    //     Ok(())
    // }
}
