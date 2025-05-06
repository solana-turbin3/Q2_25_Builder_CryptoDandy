use anchor_lang::prelude::*;

use crate::{Offer, Config, BuyingIntent, BuyingIntentState, OfferState};

#[derive(Accounts)]
pub struct AcceptOffer<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"buy_intent", buying_intent.buyer.key().as_ref()],
        bump = buying_intent.bump,
    )]
    pub buying_intent: Account<'info, BuyingIntent>,

    #[account(
        seeds = [b"offer", buying_intent.key().as_ref(), offer.seller.key().as_ref()],
        bump = offer.bump,
    )]
    pub offer: Account<'info, Offer>,

    pub system_program: Program<'info, System>,
}

impl<'info> AcceptOffer<'info> {
    pub fn accept_offer(&mut self, bumps: AcceptOfferBumps) -> Result<()>
    {
        // Change the state of the buying intent to confirm
        self.buying_intent.state = BuyingIntentState::CONFIRMED;

        // Update the offer state to reflect the accepted offer
        self.offer.state = OfferState::ACCEPTED;

        Ok(())
    }

    pub fn set_encrypted_delivery_address(
        &mut self,
        bumps: AcceptOfferBumps,
    )
        -> Result<()> {
        // Set the encrypted delivery address on the buying intent  

        Ok(())
    }

    pub fn transfer_funds(&mut self, bumps: AcceptOffer) -> Result<()>
    {
        Ok(())
    }
}