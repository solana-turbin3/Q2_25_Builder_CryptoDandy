use anchor_lang::prelude::*;

use crate::{Config};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitializeConfig<'info> {
    pub fn initialize_config(
        &mut self,
        bumps: InitializeConfigBumps,
    )
        -> Result<()> {
        self.config.set_inner(Config {
            admin: self.admin.key.clone(),
            fee: 100,
            buying_intent_increment: 0,
            offer_increment: 0,
            bump: bumps.config,
        });

        Ok(())
    }
}