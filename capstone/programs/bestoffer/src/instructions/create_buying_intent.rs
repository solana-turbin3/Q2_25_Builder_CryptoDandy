use anchor_lang::prelude::*;

use crate::BuyingIntentState::PUBLISHED;
use crate::{BuyingIntent, Config};

#[derive(Accounts)]
pub struct CreateBuyingIntent<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        init,
        payer = buyer,
        space = 8 + BuyingIntent::INIT_SPACE,
        seeds = [b"buy_intent", buyer.key().as_ref(), config.buying_intent_increment.to_le_bytes().as_ref()],
        bump,
    )]
    pub buying_intent: Account<'info, BuyingIntent>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateBuyingIntent<'info> {
    pub fn initialize(
        &mut self,
        gtin: u64,
        product_name: String,
        shipping_country_code: String,
        shipping_state_code: Option<String>,
        quantity: u16,
        bumps: &CreateBuyingIntentBumps,
    ) -> Result<()> {
        self.buying_intent.set_inner(BuyingIntent {
            id: self.config.buying_intent_increment,
            buyer: self.buyer.key(),
            gtin,
            product_name,
            shipping_country_code,
            shipping_state_code,
            state: PUBLISHED,
            accepted_offer: None,
            quantity,
            bump: bumps.buying_intent,
        });

        self.config.buying_intent_increment += 1;

        Ok(())
    }
}
