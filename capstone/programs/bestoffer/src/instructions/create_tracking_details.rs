use anchor_lang::prelude::*;

use crate::{BuyingIntent, BuyingIntentState, Config, Offer, TrackingDetails};

#[derive(Accounts)]
pub struct CreateTrackingDetails<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"buy_intent", buying_intent.buyer.key().as_ref()],
        bump = buying_intent.bump,
    )]
    pub buying_intent: Account<'info, BuyingIntent>,

    #[account(
        init,
        payer = seller,
        space = 8 + TrackingDetails::INIT_SPACE,
        seeds = [b"tracking_details", buying_intent.key().as_ref()],
        bump
    )]
    pub tracking_details: Account<'info, TrackingDetails>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateTrackingDetails<'info> {
    pub fn initialize(
        &mut self,
        carrier_name: String,
        tracking_url: String,
        tracking_code: String,
        bumps: &CreateTrackingDetailsBumps,
    ) -> Result<()> {
        // Update Buying Intent state
        // TODO, Previous state should be CONFIRMED, if no, throws custom error
        self.buying_intent.state = BuyingIntentState::SHIPPED;

        // Save shipping details
        self.tracking_details.set_inner(TrackingDetails {
            carrier_name,
            tracking_url,
            tracking_code,
            bump: bumps.tracking_details,
        });

        Ok(())
    }
}
