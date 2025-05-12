use anchor_lang::prelude::*;

use crate::OfferState::PUBLISHED;
use crate::{BuyingIntent, Config, Offer};

#[derive(Accounts)]
pub struct CreateOffer<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        seeds = [b"buy_intent", buying_intent.buyer.key().as_ref()],
        bump = buying_intent.bump,
    )]
    pub buying_intent: Account<'info, BuyingIntent>,

    #[account(
        init,
        payer = seller,
        space = 8 + Offer::INIT_SPACE,
        seeds = [b"offer", buying_intent.key().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub offer: Account<'info, Offer>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateOffer<'info> {
    pub fn initialize(
        &mut self,
        url: String,
        public_price: u64,
        offer_price: u64,
        shipping_price: u64,
        mint: Pubkey,
        bumps: &CreateOfferBumps,
    ) -> Result<()> {
        self.offer.set_inner(Offer {
            id: self.config.offer_increment,
            seller: self.seller.key(),
            url,
            public_price,
            offer_price,
            shipping_price,
            state: PUBLISHED,
            mint,
            bump: bumps.offer,
        });

        self.config.offer_increment += 1;

        Ok(())
    }
}
