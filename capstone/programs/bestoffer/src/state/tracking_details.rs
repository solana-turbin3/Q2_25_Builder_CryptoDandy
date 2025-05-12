use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TrackingDetails {
    #[max_len(100)]
    pub carrier_name: String,

    #[max_len(255)]
    pub tracking_url: String,

    #[max_len(255)]
    pub tracking_code: String,

    // Store the bump
    pub bump: u8,
}
