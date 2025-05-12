use crate::Treasury;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Treasury::INIT_SPACE,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, Treasury>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitializeTreasury<'info> {
    pub fn initialize(&mut self, bumps: &InitializeTreasuryBumps) -> Result<()> {
        self.treasury.set_inner(Treasury {
            admin: self.admin.key(),
            bump: bumps.treasury,
        });
        Ok(())
    }
}
