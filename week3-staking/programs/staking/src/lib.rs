use anchor_lang::prelude::*;

mod instructions;
mod state;

declare_id!("BQA3gLZhz3Yb95cFCwoHNkYUUuf13Jf29sfc7TYDmwYd");

#[program]
pub mod staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}