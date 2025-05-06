use anchor_lang::prelude::*;

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum OfferState {
    PUBLISHED, // Initial state
    ACCEPTED,
    CANCELLED, // The seller can cancel an offer
}