#![allow(unexpected_cfgs)]
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod enums;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;
pub use enums::*;

declare_id!("ET53DG44KdWyNb96hShnJwxurr6x2cij9GRhacVhGQYt");

#[program]
pub mod bestoffer {
    use super::*;

    pub fn create_config(
        ctx: Context<InitializeConfig>,
    ) -> Result<()> {
        ctx.accounts.initialize_config(ctx.bumps)?;

        Ok(())
    }

    pub fn create_buying_intent(
        ctx: Context<CreateBuyingIntent>,
        gtin: u64,
        product_name: String,
        shipping_country_code: String,
        shipping_state_code: Option<String>,
        quantity: u16,
    ) -> Result<()> {
        ctx.accounts.initialize(
            gtin,
            product_name,
            shipping_country_code,
            shipping_state_code,
            quantity,
            ctx.bumps,
        )?;

        Ok(())
    }

    pub fn create_offer(
        ctx: Context<CreateOffer>,
        url: String,
        public_price: u64,
        offer_price: u64,
        shipping_price: u64,
        mint: Pubkey,
    ) -> Result<()> {
        ctx.accounts.initialize(
            url,
            public_price,
            offer_price,
            shipping_price,
            mint,
            ctx.bumps,
        )?;

        Ok(())
    }

    pub fn accept_offer(
        ctx: Context<AcceptOffer>,
        offer: Pubkey,
    ) -> Result<()> {
        // ctx.accounts.initialize(
        //     ctx.bumps
        // )?;

        Ok(())
    }
}
