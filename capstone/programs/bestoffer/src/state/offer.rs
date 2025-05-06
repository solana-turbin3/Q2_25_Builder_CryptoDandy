use anchor_lang::prelude::*;

pub use crate::offer_state::*;

#[account]
#[derive(InitSpace)]
pub struct Offer {
    // ID
    pub id: u64,

    // Pubkey of the seller
    pub seller: Pubkey,

    #[max_len(255)]
    pub url: String,

    // Public price of the product (on url)
    pub public_price: u64,

    // Offered price
    pub offer_price: u64,

    // Shipping price
    pub shipping_price: u64,

    // SPL token the seller wants to receive
    pub mint: Pubkey,

    pub state: OfferState,

    // Store the bump
    pub bump: u8,
}