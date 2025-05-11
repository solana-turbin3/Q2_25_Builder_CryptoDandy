#![allow(unexpected_cfgs)]
pub mod constants;
pub mod enums;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use enums::*;
pub use instructions::*;
pub use state::*;

declare_id!("ET53DG44KdWyNb96hShnJwxurr6x2cij9GRhacVhGQYt");

#[program]
pub mod bestoffer {
    use super::*;

    // Create the global configuration as PDA
    pub fn create_config(ctx: Context<InitializeConfig>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)?;
        Ok(())
    }

    // Create the global treasury account as PDA
    pub fn create_treasury(ctx: Context<InitializeTreasury>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)?;
        Ok(())
    }

    // Buyers creates buying intent as PDA
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
            &ctx.bumps,
        )?;
        Ok(())
    }

    // Seller creates an offer as PDA
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
            &ctx.bumps,
        )?;

        Ok(())
    }

    // Buyers accept the offer
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
        // Update states on Buying intent and offer
        ctx.accounts.accept_offer(offer, &ctx.bumps)?;

        // Create the delivery address PDA with E2E encrypted data
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
            encrypted_delivery_state_code,
            &ctx.bumps,
        )?;

        // Transfer funds from buyer to vault
        ctx.accounts.transfer_funds(&ctx.bumps)?;

        Ok(())
    }

    // Seller create tracking details PDA
    pub fn create_tracking_details(
        ctx: Context<CreateTrackingDetails>,
        carrier_name: String,
        tracking_url: String,
        tracking_code: String,
    ) -> Result<()> {
        ctx.accounts
            .initialize(carrier_name, tracking_url, tracking_code, &ctx.bumps)?;
        Ok(())
    }

    // Buyers accept delivery
    pub fn accept_delivery(ctx: Context<AcceptDelivery>) -> Result<()> {
        ctx.accounts.accept_delivery(&ctx.bumps)?;
        ctx.accounts.transfer_funds(&ctx.bumps)?;
        Ok(())
    }
}
