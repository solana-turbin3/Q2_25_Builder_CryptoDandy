use anchor_lang::prelude::*;

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum BuyingIntentState {
    PUBLISHED, // Initial state
    CANCELLED, // The buyer
    CONFIRMED, // When the buyers choose an offer
    SHIPPED,   // When the seller sent shipping information
    FULFILLED, // Transaction completed
    DISPUTED,  // Buyer open a disputed
}
