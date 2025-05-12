use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    // Admin pubkey
    pub admin: Pubkey,

    // Fee in basis points
    pub fee: u16,

    // Buying intent increment
    pub buying_intent_increment: u64,

    // Offer increment
    pub offer_increment: u64,

    // Bump
    pub bump: u8,
}
