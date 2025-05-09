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
        nonce: [u8; 24],
        buyer_ephemeral_pubkey: [u8; 32],
        encrypted_delivery_lastname: Vec<u8>,
        encrypted_delivery_firstname: Vec<u8>,
        encrypted_delivery_address_line_1: Vec<u8>,
        encrypted_delivery_address_line_2: Option<Vec<u8>>,
        encrypted_delivery_city: Vec<u8>,
        encrypted_delivery_postal_code: Vec<u8>,
        encrypted_delivery_country_code: Vec<u8>,
        encrypted_delivery_state_code: Option<Vec<u8>>,
    ) -> Result<()> {
        ctx.accounts.accept_offer(offer, ctx.bumps)?;
        ctx.accounts.set_encrypted_delivery_address(
            nonce,
            buyer_ephemeral_pubkey,
            encrypted_delivery_lastname,
            encrypted_delivery_firstname,
            encrypted_delivery_address_line_1,
            encrypted_delivery_address_line_2,
            encrypted_delivery_city,
            encrypted_delivery_postal_code,
            encrypted_delivery_country_code,
            encrypted_delivery_state_code
        )?;

        ctx.accounts.transfer_funds()?;

        Ok(())
    }

    pub fn createTrackingDetails(
        ctx: Context<createTrackingDetails>,
        offer: Pubkey,
    ) -> Result<()> {
        ctx.accounts.create_tracking_details(offer)?;
    }
}
