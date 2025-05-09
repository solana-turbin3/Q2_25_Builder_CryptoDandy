use anchor_lang::prelude::*;

pub use crate::buying_intent_state::*;

#[account]
#[derive(InitSpace)]
pub struct BuyingIntent {
    // ID
    pub id: u64,

    // Pubkey of the buyer
    pub buyer: Pubkey,

    // Product GTIN (Global Trade Item Number)
    pub gtin: u64,

    // Product Name (Max 100 chars)
    #[max_len(100)]
    pub product_name: String,

    // Shipping Country Code (Max 2 chars)
    #[max_len(2)]
    pub shipping_country_code: String,

    // Shipping State Code (Max 3 chars)
    #[max_len(3)]
    pub shipping_state_code: Option<String>, // Needs for country like US / CA

    pub accepted_offer: Option<Pubkey>,
    
    // Buying Intent State
    pub state: BuyingIntentState,

    // Quantity
    pub quantity: u16,

    // Bump
    pub bump: u8,
}